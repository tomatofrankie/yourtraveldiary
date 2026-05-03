import { useState, useEffect, useRef } from 'react';
import { X, Send, Bot, ChevronDown, Key, Plus, Check } from 'lucide-react';
import { Trip, ScheduleItem, Expense, ShoppingItem, TravelInfo } from '../types';
import { auth, db } from '../utils/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { scheduleStorage, generateId, expenseStorage, shoppingStorage, travelInfoStorage } from '../utils/storage';

interface Message {
  role: 'user' | 'assistant';
  text: string;
  choices?: { label: string; tag: 'ADD' | 'ASK' | 'BOOK' }[];
}

interface ScheduleProposal {
  location: string;
  date: string;
  timeFrom: string;
  timeTo: string;
  category: ScheduleItem['category'];
  notes: string;
}

interface AiAgentProps {
  currentTrip: Trip | null;
  onScheduleAdded?: () => void;
}

const GROQ_KEY_STORAGE = 'groq_api_key';
const GROQ_MODEL = 'llama-3.3-70b-versatile';
const CATEGORIES = ['food', 'shopping', 'hotel', 'transportation', 'attraction', 'other'] as const;

async function saveKeyToFirestore(uid: string, key: string) {
  try {
    await setDoc(doc(db, 'userProfiles', uid), { groqKey: key }, { merge: true });
  } catch (e) {
    console.error('[AiAgent] Firestore save failed:', e);
  }
}

async function loadKeyFromFirestore(uid: string): Promise<string | null> {
  try {
    const snap = await getDoc(doc(db, 'userProfiles', uid));
    return snap.data()?.groqKey ?? null;
  } catch (e) {
    console.error('[AiAgent] Firestore load failed:', e);
    return null;
  }
}

function buildSystemContext(trip: Trip): string {
  const schedules: ScheduleItem[] = JSON.parse(localStorage.getItem('tripplanner_schedules') || '[]')
    .filter((s: ScheduleItem) => s.tripId === trip.id);
  const expenses: Expense[] = JSON.parse(localStorage.getItem('tripplanner_expenses') || '[]')
    .filter((e: Expense) => e.tripId === trip.id);
  const shoppingData: ShoppingItem[] = JSON.parse(localStorage.getItem('tripplanner_shopping') || '[]')
    .filter((s: ShoppingItem) => s.tripId === trip.id);
  const infos: TravelInfo[] = JSON.parse(localStorage.getItem('tripplanner_travel_info') || '[]')
    .filter((i: TravelInfo) => i.tripId === trip.id);

  const destinations = trip.destinations?.length
    ? trip.destinations.map(d => `${d.name} (${d.startDate} to ${d.endDate})`).join(', ')
    : trip.destination;

  const scheduleText = schedules.length
    ? schedules.map(s => `  - ${s.date} ${s.timeFrom}${s.timeTo ? '–' + s.timeTo : ''}: ${s.location} [${s.category}]`).join('\n')
    : '  (none)';

  const expenseText = Object.entries(
    expenses.reduce((acc, e) => { acc[e.currency] = (acc[e.currency] || 0) + e.price; return acc; }, {} as Record<string, number>)
  ).map(([c, t]) => `${c} ${(t as number).toFixed(2)}`).join(', ') || '(none)';

  const shoppingText = shoppingData.length
    ? shoppingData.map(s => `  - ${s.name}${s.link ? ' (' + s.link + ')' : ''}`).join('\n')
    : '(none)';

  const infoText = infos.length
    ? infos.map(i => `  - [${i.type}] ${i.name}${i.date ? ' on ' + i.date : ''}`).join('\n')
    : '  (none)';

  return `You are a helpful AI travel assistant for the trip planning app "Our Travel Diary".
Trip: ${trip.name} | Destinations: ${destinations} | Dates: ${trip.startDate} to ${trip.endDate}
Schedule:\n${scheduleText}
Expenses: ${expenseText}
Travel info:\n${infoText}

Shopping items:\n${shoppingText}

When giving suggestions, end your response with a CHOICES section. Each choice must be prefixed with one of:
- [ADD] — adds an activity, expense, shopping item, or travel info to the trip
- [BOOK] — opens a booking/reservation website for the user
- [ASK] — a follow-up question or analytical request

Format EXACTLY:
CHOICES:
1. [ADD] Visit the Eiffel Tower
2. [BOOK] Book a guided tour of the Louvre
3. [ASK] What is my total budget?

When the user selects an [ADD] choice, respond with ONLY a single JSON object, no other text:
Activity: {"type":"activity","location":"Name","date":"YYYY-MM-DD","timeFrom":"HH:MM","timeTo":"HH:MM","category":"food|shopping|hotel|transportation|attraction|other","notes":""}
Expense: {"type":"expense","item":"description","price":10.50,"currency":"USD","date":"YYYY-MM-DD","category":"other"}
Shopping: {"type":"shopping","name":"item name","category":"category","link":""}
Travel info: {"type":"travel-info","infoType":"hotel|flight|car-rental|restaurant","name":"name","date":"YYYY-MM-DD","notes":""}

When the user selects a [BOOK] choice, respond with ONLY a JSON object with a booking URL:
{"type":"booking","url":"https://...","name":"Place name"}

When the user selects an [ASK] choice, respond with a normal helpful text answer, NO JSON.
IMPORTANT: Whenever you mention an official website, booking site, or any URL, ALWAYS include the full URL inline in your response (e.g. "Visit the official site: https://www.louvre.fr"). Never say "check the official site" without providing the actual URL.
ONLY ONE JSON object per response. Use dates within the trip range (${trip.startDate} to ${trip.endDate}). Answer in the same language the user writes in.`;
}

async function callGroq(apiKey: string, history: Message[], userText: string, trip: Trip): Promise<string> {
  const systemContext = buildSystemContext(trip);
  const messages = [
    { role: 'system', content: systemContext },
    ...history.map(m => ({ role: m.role, content: m.text })),
    { role: 'user', content: userText },
  ];

  const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const res = isDev
    ? await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({ model: GROQ_MODEL, messages }),
      })
    : await fetch('/.netlify/functions/groq-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, messages, model: GROQ_MODEL }),
      });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? 'No response received.';
}

// Parse "CHOICES:\n1. [ADD] foo\n2. [ASK] bar" out of AI response
function parseChoices(text: string): { text: string; choices: { label: string; tag: 'ADD' | 'ASK' | 'BOOK' }[] } {
  const choicesMatch = text.match(/CHOICES:\s*\n((?:\d+\..+\n?)+)/i);
  if (!choicesMatch) return { text, choices: [] };
  const choices = choicesMatch[1]
    .split('\n')
    .map(l => l.replace(/^\d+\.\s*/, '').trim())
    .filter(Boolean)
    .map(l => {
      const tagMatch = l.match(/^\[(ADD|ASK|BOOK)\]\s*/i);
      const tag = (tagMatch?.[1]?.toUpperCase() ?? 'ASK') as 'ADD' | 'ASK' | 'BOOK';
      const label = l.replace(/^\[(ADD|ASK|BOOK)\]\s*/i, '').trim();
      return { label, tag };
    });
  const cleanText = text.replace(/CHOICES:\s*\n((?:\d+\..+\n?)+)/i, '').trim();
  return { text: cleanText, choices };
}

function renderSegment(segment: string, key: number) {
  if (segment.startsWith('**') && segment.endsWith('**'))
    return <strong key={key}>{segment.slice(2, -2)}</strong>;
  if (/^https?:\/\//.test(segment))
    return <a key={key} href={segment} target="_blank" rel="noopener noreferrer" className="text-purple-600 underline break-all">{segment}</a>;
  return segment;
}

function renderText(text: string) {
  return text.split('\n').map((line, i) => {
    const segments = line.split(/(\*\*[^*]+\*\*|https?:\/\/[^\s]+)/g);
    const isBullet = line.trimStart().startsWith('- ') || line.trimStart().startsWith('• ');
    const content = (isBullet ? segments.slice(1) : segments).map((s, j) => renderSegment(s, j));
    return (
      <p key={i} className={`${isBullet ? 'pl-3' : ''} ${i > 0 ? 'mt-1' : ''}`}>
        {isBullet ? '• ' : ''}{content}
      </p>
    );
  });
}

export function AiAgent({ currentTrip, onScheduleAdded }: AiAgentProps) {
  const [open, setOpen] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [keyInput, setKeyInput] = useState('');
  const [showKeySetup, setShowKeySetup] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [keyLoading, setKeyLoading] = useState(true);
  const [error, setError] = useState('');
  const [proposal, setProposal] = useState<ScheduleProposal | null>(null);
  const [savedMsg, setSavedMsg] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [open]);

  useEffect(() => {
    const load = async () => {
      const loadForUser = async (user: import('firebase/auth').User) => {
        const key = await loadKeyFromFirestore(user.uid);
        if (key) setApiKey(key);
        // clear any stale key left by a previous account
        else localStorage.removeItem(GROQ_KEY_STORAGE);
        setKeyLoading(false);
      };

      if (auth.currentUser) {
        await loadForUser(auth.currentUser);
        return;
      }

      const unsub = auth.onAuthStateChanged(async user => {
        unsub();
        if (user) {
          await loadForUser(user);
        } else {
          // not logged in — fall back to local storage
          const local = localStorage.getItem(GROQ_KEY_STORAGE);
          if (local) setApiKey(local);
          setKeyLoading(false);
        }
      });
      setTimeout(() => { setKeyLoading(false); unsub(); }, 5000);
    };
    load();
  }, []);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [open, messages, proposal]);

  const saveKey = async () => {
    const trimmed = keyInput.trim();
    if (!trimmed) return;
    setApiKey(trimmed);
    setKeyInput('');
    setShowKeySetup(false);
    setKeyLoading(false);
    const user = auth.currentUser;
    if (user) {
      await saveKeyToFirestore(user.uid, trimmed);
      localStorage.removeItem(GROQ_KEY_STORAGE); // keep key in Firestore only
    } else {
      localStorage.setItem(GROQ_KEY_STORAGE, trimmed); // no account — store locally
    }
  };

  const send = async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || loading || !currentTrip) return;
    if (!apiKey) { setShowKeySetup(true); return; }

    const userMsg: Message = { role: 'user', text: text.replace(/^\[(ADD|BOOK)\]\s*/i, '') };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setError('');
    setProposal(null);

    try {
      const reply = await callGroq(apiKey, messages, text, currentTrip);

      // Extract the first valid JSON object from the reply
      try {
        const jsonMatch = reply.match(/\{[^{}]*\}/);
        if (jsonMatch) {
          const obj = JSON.parse(jsonMatch[0]);

          if (obj.type === 'booking' && obj.url) {
            window.open(obj.url, '_blank', 'noopener,noreferrer');
            setMessages(prev => [...prev, { role: 'assistant', text: `Opening booking page for ${obj.name || obj.url}…` }]);
            return;
          }

          if (obj.type === 'activity' && obj.location && obj.date && obj.timeFrom) {
            setMessages(prev => [...prev, { role: 'assistant', text: 'Here\'s what I\'ll add to your schedule:' }]);
            setProposal({
              location: obj.location,
              date: obj.date,
              timeFrom: obj.timeFrom,
              timeTo: obj.timeTo || '',
              category: CATEGORIES.includes(obj.category) ? obj.category : 'attraction',
              notes: obj.notes || '',
            });
            return;
          }

          if (obj.type === 'expense' && obj.item && obj.price && obj.currency && currentTrip) {
            const expense: Expense = {
              id: generateId(), tripId: currentTrip.id,
              date: obj.date || new Date().toISOString().slice(0, 10),
              item: obj.item, currency: obj.currency,
              price: Number(obj.price) || 0,
              category: obj.category || 'other',
              whoPaid: '', settled: false,
            };
            expenseStorage.save(expense);
            setMessages(prev => [...prev, { role: 'assistant', text: `✓ Added expense: ${expense.item} ${expense.currency} ${expense.price.toFixed(2)}` }]);
            if (onScheduleAdded) onScheduleAdded();
            return;
          }

          if (obj.type === 'shopping' && obj.name && currentTrip) {
            const item: ShoppingItem = {
              id: generateId(), tripId: currentTrip.id,
              name: obj.name, category: obj.category || '',
              link: obj.link || '', purchased: false,
            };
            shoppingStorage.save(item);
            setMessages(prev => [...prev, { role: 'assistant', text: `✓ Added to shopping list: ${item.name}` }]);
            if (onScheduleAdded) onScheduleAdded();
            return;
          }

          if (obj.type === 'travel-info' && obj.infoType && obj.name && currentTrip) {
            const info: TravelInfo = {
              id: generateId(), tripId: currentTrip.id,
              type: obj.infoType, name: obj.name,
              date: obj.date || '', notes: obj.notes || '',
            };
            travelInfoStorage.save(info);
            setMessages(prev => [...prev, { role: 'assistant', text: `✓ Added travel info: [${info.type}] ${info.name}` }]);
            if (onScheduleAdded) onScheduleAdded();
            return;
          }
        }
      } catch (e) {
        // fall back to regular handling below
      }

      const { text: cleanText, choices } = parseChoices(reply);
      setMessages(prev => [...prev, { role: 'assistant', text: cleanText, choices }]);
    } catch (e: any) {
      const msg = e.message || '';
      if (msg.includes('Rate limit') || msg.includes('rate_limit') || msg.includes('TPM') || msg.includes('429')) {
        const seconds = msg.match(/try again in ([\d.]+)s/i)?.[1];
        setError(`Too many requests. Please wait${seconds ? ` ${Math.ceil(Number(seconds))} seconds` : ' a moment'} and try again.`);
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const selectChoice = (label: string, tag: 'ADD' | 'ASK' | 'BOOK') => {
    if (tag === 'ADD') send(`[ADD] ${label}`);
    else if (tag === 'BOOK') send(`[BOOK] ${label}`);
    else send(label);
  };

  const confirmProposal = () => {
    if (!proposal || !currentTrip) return;
    const item: ScheduleItem = {
      id: generateId(),
      tripId: currentTrip.id,
      date: proposal.date,
      timeFrom: proposal.timeFrom,
      timeTo: proposal.timeTo,
      location: proposal.location,
      category: proposal.category,
      notes: proposal.notes,
    };
    scheduleStorage.save(item);
    setProposal(null);
    setSavedMsg(`✓ "${proposal.location}" added to schedule!`);
    setTimeout(() => setSavedMsg(''), 3000);
    if (onScheduleAdded) onScheduleAdded();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-20 right-6 z-40 w-14 h-14 bg-purple-500 hover:bg-purple-600 text-white rounded-full shadow-lg flex items-center justify-center transition-colors"
        title="AI Travel Assistant"
      >
        {open ? <ChevronDown className="w-6 h-6" /> : <Bot className="w-6 h-6" />}
      </button>

      {open && (
        <div ref={panelRef} className="fixed bottom-36 right-6 z-40 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden" style={{ maxHeight: '70vh' }}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-purple-500 text-white">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5" />
              <span className="font-semibold text-sm">AI Travel Assistant</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowKeySetup(s => !s)} title="API Key" className="hover:bg-purple-400 rounded p-1 transition-colors">
                <Key className="w-4 h-4" />
              </button>
              <button onClick={() => setOpen(false)} className="hover:bg-purple-400 rounded p-1 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* API key setup */}
          {showKeySetup && (
            <div className="px-4 py-3 bg-purple-50 border-b border-purple-100">
              <p className="text-xs text-gray-600 mb-2">
                Enter your <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" className="text-purple-600 underline">Groq API key</a> (synced to your account):
              </p>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={keyInput}
                  onChange={e => setKeyInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && saveKey()}
                  placeholder="gsk_..."
                  className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                />
                <button onClick={saveKey} className="px-3 py-1 bg-purple-500 text-white text-xs rounded hover:bg-purple-600 transition-colors">Save</button>
              </div>
              {apiKey && <p className="text-xs text-green-600 mt-1">✓ Key saved</p>}
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 text-sm">
            {messages.length === 0 && (
              <div className="text-center text-gray-400 py-6">
                <Bot className="w-10 h-10 mx-auto mb-2 text-purple-200" />
                <p className="text-xs">
                  {currentTrip ? `Ask me for activity suggestions for your trip!` : 'Select a trip to get started.'}
                </p>
                {keyLoading ? (
                  <p className="text-xs text-gray-400 animate-pulse mt-3">Loading API key...</p>
                ) : !apiKey ? (
                  <button onClick={() => setShowKeySetup(true)} className="mt-3 text-xs text-purple-500 underline">
                    Set up Groq API key
                  </button>
                ) : null}
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-purple-500 text-white rounded-br-sm'
                    : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                }`}>
                  {m.role === 'assistant' ? renderText(m.text) : m.text}
                </div>
                {/* Choice buttons */}
                {m.choices && m.choices.length > 0 && (
                  <div className="mt-2 flex flex-col gap-1.5 w-full max-w-[85%]">
                    {m.choices.map((choice, ci) => (
                      <button
                        key={ci}
                        onClick={() => selectChoice(choice.label, choice.tag)}
                        disabled={loading}
                        className="flex items-center gap-2 px-3 py-2 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl text-xs text-purple-700 font-medium text-left transition-colors disabled:opacity-50"
                      >
                        {choice.tag === 'ADD' && <Plus className="w-3.5 h-3.5 flex-shrink-0" />}
                        {choice.tag === 'BOOK' && <span className="text-[10px] font-bold bg-purple-200 text-purple-700 px-1.5 py-0.5 rounded flex-shrink-0">BOOK</span>}
                        {choice.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Schedule proposal card */}
            {proposal && (
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 space-y-2">
                <p className="text-xs font-semibold text-purple-700">Add to Schedule</p>
                <div className="space-y-1.5">
                  <input
                    type="text"
                    value={proposal.location}
                    onChange={e => setProposal({ ...proposal, location: e.target.value })}
                    className="w-full px-2 py-1 text-xs border border-purple-200 rounded-lg focus:ring-1 focus:ring-purple-400"
                    placeholder="Location"
                  />
                  <div className="grid grid-cols-2 gap-1.5">
                    <input
                      type="date"
                      value={proposal.date}
                      onChange={e => setProposal({ ...proposal, date: e.target.value })}
                      className="px-2 py-1 text-xs border border-purple-200 rounded-lg focus:ring-1 focus:ring-purple-400"
                    />
                    <select
                      value={proposal.category}
                      onChange={e => setProposal({ ...proposal, category: e.target.value as ScheduleItem['category'] })}
                      className="px-2 py-1 text-xs border border-purple-200 rounded-lg focus:ring-1 focus:ring-purple-400"
                    >
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <input
                      type="time"
                      value={proposal.timeFrom}
                      onChange={e => setProposal({ ...proposal, timeFrom: e.target.value })}
                      className="px-2 py-1 text-xs border border-purple-200 rounded-lg focus:ring-1 focus:ring-purple-400"
                    />
                    <input
                      type="time"
                      value={proposal.timeTo}
                      onChange={e => setProposal({ ...proposal, timeTo: e.target.value })}
                      className="px-2 py-1 text-xs border border-purple-200 rounded-lg focus:ring-1 focus:ring-purple-400"
                    />
                  </div>
                  <input
                    type="text"
                    value={proposal.notes}
                    onChange={e => setProposal({ ...proposal, notes: e.target.value })}
                    className="w-full px-2 py-1 text-xs border border-purple-200 rounded-lg focus:ring-1 focus:ring-purple-400"
                    placeholder="Notes (optional)"
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={confirmProposal}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-purple-500 text-white text-xs rounded-lg hover:bg-purple-600 transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" /> Add to Schedule
                  </button>
                  <button
                    onClick={() => setProposal(null)}
                    className="px-3 py-1.5 bg-gray-200 text-gray-600 text-xs rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {savedMsg && (
              <p className="text-xs text-green-600 text-center font-medium">{savedMsg}</p>
            )}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-3 py-2 text-xs text-gray-500">
                  <span className="animate-pulse">Thinking…</span>
                </div>
              </div>
            )}
            {error && <p className="text-xs text-red-500 text-center">{error}</p>}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-3 border-t border-gray-100 flex gap-2 items-end">
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={currentTrip ? 'Ask for suggestions...' : 'Select a trip first'}
              disabled={!currentTrip || loading}
              className="flex-1 resize-none px-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-400 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400"
              style={{ maxHeight: '80px' }}
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || loading || !currentTrip}
              className="p-2 bg-purple-500 text-white rounded-xl hover:bg-purple-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
