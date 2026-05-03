import { useState, useEffect } from 'react';
import { X, Copy, Check, Users, LogIn, Trash2, RefreshCw } from 'lucide-react';
import { Trip } from '../types';
import { auth, db } from '../utils/firebase';
import {
  doc, setDoc, getDoc, deleteDoc, collection, query, where, getDocs,
} from 'firebase/firestore';
import { tripStorage } from '../utils/storage';
import { useTranslation } from '../utils/i18n';

interface Props {
  trip: Trip;
  onClose: () => void;
  onTripUpdated: (trip: Trip) => void;
}

interface InviteDoc {
  tripId: string;
  ownerId: string;
  tripName: string;
  createdAt: number;
}

interface SharedMember {
  uid: string;
  email: string;
}

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export function TripSharingModal({ trip, onClose, onTripUpdated }: Props) {
  const { t } = useTranslation();
  const uid = auth.currentUser?.uid ?? '';
  const isOwner = !!trip.id && trip.userId === uid;
  const joinOnly = !trip.id;

  const [tab, setTab] = useState<'share' | 'join'>(isOwner ? 'share' : 'join');
  const [code, setCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [codeLoading, setCodeLoading] = useState(false);
  const [members, setMembers] = useState<SharedMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);

  const [joinCode, setJoinCode] = useState('');
  const [joinStatus, setJoinStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [joinMsg, setJoinMsg] = useState('');

  // Load existing invite code for this trip (owner only)
  useEffect(() => {
    if (!isOwner || joinOnly) return;
    const load = async () => {
      setCodeLoading(true);
      try {
        const snap = await getDocs(
          query(collection(db, 'tripInvites'), where('tripId', '==', trip.id))
        );
        if (!snap.empty) setCode(snap.docs[0].id);
      } finally {
        setCodeLoading(false);
      }
    };
    load();
  }, [trip.id, isOwner, joinOnly]);

  // Load shared members (owner only)
  useEffect(() => {
    if (!isOwner || joinOnly || !trip.sharedWith?.length) return;
    const load = async () => {
      setMembersLoading(true);
      try {
        const results: SharedMember[] = [];
        for (const memberUid of trip.sharedWith ?? []) {
          const profileSnap = await getDoc(doc(db, 'userProfiles', memberUid));
          const email = profileSnap.data()?.email ?? memberUid;
          results.push({ uid: memberUid, email });
        }
        setMembers(results);
      } finally {
        setMembersLoading(false);
      }
    };
    load();
  }, [trip.sharedWith, isOwner, joinOnly]);

  const createCode = async () => {
    setCodeLoading(true);
    try {
      if (code) await deleteDoc(doc(db, 'tripInvites', code));
      const newCode = generateCode();
      const invite: InviteDoc = {
        tripId: trip.id,
        ownerId: uid,
        tripName: trip.name,
        createdAt: Date.now(),
      };
      await setDoc(doc(db, 'tripInvites', newCode), invite);
      setCode(newCode);
    } finally {
      setCodeLoading(false);
    }
  };

  const revokeCode = async () => {
    if (!code) return;
    if (!confirm('Revoke this invite code? Existing members keep access.')) return;
    await deleteDoc(doc(db, 'tripInvites', code));
    setCode('');
  };

  const copyCode = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const removeMember = async (memberUid: string) => {
    if (!confirm('Remove this member from the trip?')) return;
    const updated: Trip = {
      ...trip,
      sharedWith: (trip.sharedWith ?? []).filter(u => u !== memberUid),
    };
    tripStorage.save(updated);
    onTripUpdated(updated);
    setMembers(prev => prev.filter(m => m.uid !== memberUid));
  };

  const joinTrip = async () => {
    const trimmed = joinCode.trim().toUpperCase();
    if (!trimmed) return;
    setJoinStatus('loading');
    setJoinMsg('');
    try {
      const inviteSnap = await getDoc(doc(db, 'tripInvites', trimmed));
      if (!inviteSnap.exists()) {
        setJoinStatus('error');
        setJoinMsg(t('Invalid code. Please check and try again.'));
        return;
      }
      const invite = inviteSnap.data() as InviteDoc;

      if (invite.ownerId === uid) {
        setJoinStatus('error');
        setJoinMsg(t('You already own this trip.'));
        return;
      }

      const tripSnap = await getDoc(doc(db, 'trips', invite.tripId));
      if (!tripSnap.exists()) {
        setJoinStatus('error');
        setJoinMsg(t('Trip no longer exists.'));
        return;
      }
      const tripData = { ...tripSnap.data() as Trip, id: tripSnap.id };

      if (tripData.sharedWith?.includes(uid)) {
        setJoinStatus('error');
        setJoinMsg(t('You already have access to this trip.'));
        return;
      }

      const updated: Trip = {
        ...tripData,
        sharedWith: [...(tripData.sharedWith ?? []), uid],
      };

      // Store email so owner can see who joined
      const userEmail = auth.currentUser?.email ?? '';
      if (userEmail) {
        await setDoc(doc(db, 'userProfiles', uid), { email: userEmail }, { merge: true });
      }

      tripStorage.save(updated);
      onTripUpdated(updated);
      setJoinStatus('success');
      setJoinMsg(`${t('You now have access to')} "${invite.tripName}"! ${t('Press Sync in the top bar to load it.')}`);
    } catch {
      setJoinStatus('error');
      setJoinMsg(t('Something went wrong. Please try again.'));
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-500" />
            <h2 className="font-semibold text-gray-900">
              {joinOnly ? t('Join a Trip') : t('Trip Access')}
            </h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs — only show if owner (has both tabs) */}
        {!joinOnly && (
          <div className="flex border-b border-gray-100">
            {isOwner && (
              <button
                onClick={() => setTab('share')}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${tab === 'share' ? 'text-purple-600 border-b-2 border-purple-500' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {t('Share Trip')}
              </button>
            )}
            <button
              onClick={() => setTab('join')}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${tab === 'join' ? 'text-purple-600 border-b-2 border-purple-500' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {t('Join a Trip')}
            </button>
          </div>
        )}

        <div className="p-5 space-y-5">

          {/* ── SHARE TAB ── */}
          {tab === 'share' && isOwner && (
            <>
              <div className="bg-purple-50 rounded-xl p-4 text-sm space-y-1.5">
                <p className="font-semibold text-purple-700">{t('How sharing works')}</p>
                <ol className="list-decimal list-inside space-y-1 text-gray-600">
                  <li>{t('Generate an invite code below.')}</li>
                  <li>{t('Share the 6-character code with your travel companion.')}</li>
                  <li>{t('They enter it under')} <strong>{t('Join a Trip')}</strong>.</li>
                  <li>{t('They get full edit & delete access to this trip.')}</li>
                  <li>{t('You can remove their access at any time.')}</li>
                </ol>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">{t('Invite Code')}</p>
                {code ? (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-100 rounded-xl px-4 py-3 font-mono text-2xl font-bold tracking-widest text-center text-purple-700 select-all">
                      {code}
                    </div>
                    <button
                      onClick={copyCode}
                      className="p-3 bg-purple-100 hover:bg-purple-200 text-purple-600 rounded-xl transition-colors"
                      title={t('Copy code')}
                    >
                      {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                    </button>
                    <button
                      onClick={createCode}
                      disabled={codeLoading}
                      className="p-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl transition-colors disabled:opacity-50"
                      title={t('Regenerate code')}
                    >
                      <RefreshCw className={`w-5 h-5 ${codeLoading ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={createCode}
                    disabled={codeLoading}
                    className="w-full py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
                  >
                    {codeLoading ? t('Generating…') : t('Generate Invite Code')}
                  </button>
                )}
                {code && (
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-gray-400">{t('Code is valid until you revoke it.')}</p>
                    <button onClick={revokeCode} className="text-xs text-red-400 hover:text-red-600 transition-colors">
                      {t('Revoke')}
                    </button>
                  </div>
                )}
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">
                  {t('Members with access')}{members.length > 0 && <span className="text-gray-400 ml-1">({members.length})</span>}
                </p>
                {membersLoading ? (
                  <p className="text-sm text-gray-400 animate-pulse">{t('Loading…')}</p>
                ) : members.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">{t('No one has joined yet.')}</p>
                ) : (
                  <ul className="space-y-2">
                    {members.map(m => (
                      <li key={m.uid} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-purple-200 flex items-center justify-center text-xs font-bold text-purple-700">
                            {m.email[0].toUpperCase()}
                          </div>
                          <span className="text-sm text-gray-700">{m.email}</span>
                        </div>
                        <button
                          onClick={() => removeMember(m.uid)}
                          className="text-gray-400 hover:text-red-500 transition-colors p-1"
                          title={t('Remove access')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}

          {/* ── JOIN TAB ── */}
          {(tab === 'join' || joinOnly) && (
            <>
              <div className="bg-blue-50 rounded-xl p-4 text-sm space-y-1.5">
                <p className="font-semibold text-blue-700">{t('How to join a trip')}</p>
                <ol className="list-decimal list-inside space-y-1 text-gray-600">
                  <li>{t('Ask the trip owner to open their trip and click the 👥 icon.')}</li>
                  <li>{t('They generate and share a 6-character invite code with you.')}</li>
                  <li>{t('Enter the code below and click Join.')}</li>
                  <li>{t('Press Sync in the top bar — the trip will appear in your list.')}</li>
                </ol>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('Enter Invite Code')}</label>
                <input
                  type="text"
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value.toUpperCase())}
                  onKeyDown={e => e.key === 'Enter' && joinTrip()}
                  maxLength={6}
                  placeholder="AB3X7K"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl font-mono text-2xl font-bold tracking-widest text-center uppercase focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                />
              </div>

              {joinMsg && (
                <p className={`text-sm text-center font-medium ${joinStatus === 'success' ? 'text-green-600' : 'text-red-500'}`}>
                  {joinMsg}
                </p>
              )}

              <button
                onClick={joinTrip}
                disabled={joinCode.length < 6 || joinStatus === 'loading'}
                className="w-full py-3 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                {joinStatus === 'loading' ? t('Joining…') : t('Join Trip')}
              </button>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
