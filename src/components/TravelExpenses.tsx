import { useState, useEffect, useRef } from 'react';
import { Plus, Edit2, Trash2, DollarSign, X, User, CheckCircle2, Circle, Users } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Trip, Expense } from '../types';
import { expenseStorage, generateId } from '../utils/storage';
import { getCategoryColor } from '../utils/colors';
import { getExchangeRates, convertCurrency } from '../utils/currency';
import { useCalendarNavigation } from '../utils/calendarNavigation';
import { CalendarPicker } from './CalendarPicker';
import { useTranslation } from '../utils/i18n';
import { db, auth } from '../utils/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

interface TravelExpensesProps {
  currentTrip: Trip | null;
}

const CATEGORIES = ['food', 'shopping', 'hotel', 'transportation', 'attraction', 'other'] as const;
const CURRENCIES = ['HKD', 'USD', 'EUR', 'GBP', 'JPY', 'CNY', 'AUD', 'CAD', 'CHF', 'SGD', 'TWD', 'KRW', 'THB'];

function WhoPaidDropdown({ value, names, onChange, onNew, onDelete }: {
  value: string;
  names: string[];
  onChange: (v: string) => void;
  onNew: () => void;
  onDelete: (name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-left bg-white hover:bg-gray-50 focus:ring-2 focus:ring-purple-400 focus:border-transparent flex items-center justify-between"
      >
        <span className={value ? 'text-gray-900' : 'text-gray-400'}>{value || '— None —'}</span>
        <span className="text-gray-400 text-xs">▾</span>
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
          <div
            className="px-3 py-2 text-gray-400 hover:bg-gray-50 cursor-pointer text-sm"
            onMouseDown={() => { onChange(''); setOpen(false); }}
          >
            — None —
          </div>
          {names.map(name => (
            <div
              key={name}
              className="group flex items-center justify-between px-3 py-2 hover:bg-purple-50 cursor-pointer"
            >
              <span
                className={`flex-1 text-sm ${value === name ? 'font-semibold text-purple-700' : 'text-gray-900'}`}
                onMouseDown={() => { onChange(name); setOpen(false); }}
              >
                {name}
              </span>
              <button
                type="button"
                onMouseDown={(e) => { e.stopPropagation(); onDelete(name); }}
                className="opacity-0 group-hover:opacity-100 ml-2 text-gray-400 hover:text-red-500 transition-opacity text-xs leading-none p-0.5 rounded"
              >
                ✕
              </button>
            </div>
          ))}
          <div
            className="px-3 py-2 text-purple-500 hover:bg-purple-50 cursor-pointer text-sm font-medium border-t border-gray-100"
            onMouseDown={() => { setOpen(false); onNew(); }}
          >
            + New traveller...
          </div>
        </div>
      )}
    </div>
  );
}

export function TravelExpenses({ currentTrip }: TravelExpensesProps) {
  const { t } = useTranslation();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({});
  const [totalHKD, setTotalHKD] = useState<number>(0);

  const [travellerNames, setTravellerNames] = useState<string[]>([]);
  const [addTravellerOpen, setAddTravellerOpen] = useState(false);
  const [newTravellerName, setNewTravellerName] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Expense>>({
    date: '',
    item: '',
    currency: 'HKD',
    price: 0,
    category: 'food',
    whoPaid: '',
    settled: false,
    splitWith: 'all',
  });
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState<{ year: number; month: number }>({ year: new Date().getFullYear(), month: new Date().getMonth() });
  const { goToPreviousMonth, goToNextMonth, showLeftArrow, showRightArrow, dragOffset, dragDirection, isSnappingBack, calendarNavigationProps } = useCalendarNavigation(setCalendarMonth);

  useEffect(() => {
    if (currentTrip) {
      loadExpenses();
      const loadTravellers = async () => {
        try {
          const snap = await getDoc(doc(db, 'travellers', currentTrip.id));
          const names = snap.data()?.names ?? [];
          setTravellerNames(names);
          localStorage.setItem(`travellers_${currentTrip.id}`, JSON.stringify(names));
        } catch {}
      };
      loadTravellers();
    }
  }, [currentTrip]);

  useEffect(() => {
    const fetchRates = async () => {
      const rates = await getExchangeRates();
      setExchangeRates(rates);
    };
    fetchRates();
  }, []);

  useEffect(() => {
    if (Object.keys(exchangeRates).length === 0) return;

    const total = expenses.reduce((acc, expense) => {
      const amountInHKD = convertCurrency(expense.price, expense.currency, exchangeRates);
      return acc + amountInHKD;
    }, 0);
    setTotalHKD(total);
  }, [expenses, exchangeRates]);

  const loadExpenses = () => {
    if (currentTrip) {
      const items = expenseStorage.getAll(currentTrip.id);
      setExpenses(items.sort((a, b) => b.date.localeCompare(a.date)));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTrip) return;

    if (!formData.whoPaid) { alert('Please select who paid.'); return; }
    const expense: Expense = {
      id: editingId || generateId(),
      tripId: currentTrip.id,
      date: formData.date!,
      item: formData.item!,
      currency: formData.currency!,
      price: Number(formData.price),
      category: formData.category as Expense['category'],
      whoPaid: formData.whoPaid || "",
      settled: formData.settled || false,
      splitWith: formData.splitWith ?? 'all',
    };
    if (Array.isArray(expense.splitWith) && (expense.splitWith as string[]).length === 0) {
      expense.splitWith = 'solo';
    }

    expenseStorage.save(expense);
    loadExpenses();
    resetForm();
  };

  const handleEdit = (expense: Expense) => {
    setFormData(expense);
    setEditingId(expense.id);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this expense?')) {
      expenseStorage.delete(id);
      loadExpenses();
    }
  };

  const toggleSettled = (expense: Expense) => {
    const updatedExpense: Expense = {
      ...expense,
      settled: !expense.settled,
    };
    expenseStorage.save(updatedExpense);
    loadExpenses();
  };

  const resetForm = () => {
    setFormData({
      date: '',
      item: '',
      currency: 'HKD',
      price: 0,
      category: 'food',
      whoPaid: '',
      settled: false,
      splitWith: 'all',
    });
    setEditingId(null);
    setShowForm(false);
  };

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getCalendarDays = () => {
    const firstDay = new Date(calendarMonth.year, calendarMonth.month, 1).getDay();
    const daysInMonth = getDaysInMonth(calendarMonth.year, calendarMonth.month);
    
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  };

  const openDatePicker = () => {
    if (formData.date) {
      const date = parseISO(formData.date);
      setCalendarMonth({ year: date.getFullYear(), month: date.getMonth() });
    } else if (currentTrip?.startDate) {
      const date = parseISO(currentTrip.startDate);
      setCalendarMonth({ year: date.getFullYear(), month: date.getMonth() });
    }
    setDatePickerOpen(true);
  };

  const handleDateSelect = (selectedDate: string) => {
    setFormData({ ...formData, date: selectedDate });
    setDatePickerOpen(false);
    setCalendarMonth({ year: new Date().getFullYear(), month: new Date().getMonth() });
  };

  const saveTravellers = (names: string[]) => {
    if (!currentTrip) return;
    const uid = auth.currentUser?.uid;
    if (uid) void setDoc(doc(db, 'travellers', currentTrip.id), { names, tripId: currentTrip.id, userId: uid }, { merge: true });
  };

  const addTravellerName = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed || travellerNames.includes(trimmed)) return;
    const updated = [...travellerNames, trimmed];
    setTravellerNames(updated);
    saveTravellers(updated);
  };

  const deleteTravellerName = (name: string) => {
    const updated = travellerNames.filter(n => n !== name);
    setTravellerNames(updated);
    saveTravellers(updated);
    if (formData.whoPaid === name) setFormData(prev => ({ ...prev, whoPaid: '' }));
  };

  const getTotalByCurrency = () => {
    const totals: Record<string, number> = {};
    expenses.forEach(expense => {
      if (!totals[expense.currency]) totals[expense.currency] = 0;
      totals[expense.currency] += expense.price;
    });
    return totals;
  };

  const getUnsettledTotalByCurrency = () => {
    const totals: Record<string, number> = {};
    expenses.filter(e => !e.settled && (e.splitWith === 'all' || e.splitWith === undefined)).forEach(expense => {
      if (!totals[expense.currency]) totals[expense.currency] = 0;
      totals[expense.currency] += expense.price;
    });
    return totals;
  };

  const getTotalByPayer = () => {
    const totals: Record<string, Record<string, number>> = {};
    expenses.forEach(expense => {
      const payer = expense.whoPaid || 'Unassigned';
      if (!totals[payer]) {
        totals[payer] = {};
      }
      if (!totals[payer][expense.currency]) {
        totals[payer][expense.currency] = 0;
      }
      totals[payer][expense.currency] += expense.price;
    });
    return totals;
  };

  const getExpenseByPerson = () => {
    const totals: Record<string, number> = {};
    expenses.forEach(expense => {
      const hkdAmount = convertCurrency(expense.price, expense.currency, exchangeRates);
      const sw = expense.splitWith ?? 'all';
      if (sw === 'solo') {
        if (expense.whoPaid) {
          totals[expense.whoPaid] = (totals[expense.whoPaid] || 0) + hkdAmount;
        }
      } else if (sw === 'all') {
        const share = hkdAmount / travellerNames.length;
        travellerNames.forEach(name => {
          totals[name] = (totals[name] || 0) + share;
        });
      } else {
        const names = sw as string[];
        if (names.length > 0) {
          const share = hkdAmount / names.length;
          names.forEach(name => {
            totals[name] = (totals[name] || 0) + share;
          });
        }
      }
    });
    return totals;
  };

  const getSettlements = () => {
    // paid[name] = total HKD paid by this person
    const paid: Record<string, number> = {};
    // owed[name] = total HKD this person owes (their share)
    const owed: Record<string, number> = {};

    travellerNames.forEach(n => { paid[n] = 0; owed[n] = 0; });

    expenses.filter(e => !e.settled).forEach(expense => {
      const hkd = convertCurrency(expense.price, expense.currency, exchangeRates);
      const sw = expense.splitWith ?? 'all';
      const payer = expense.whoPaid;

      if (payer) paid[payer] = (paid[payer] || 0) + hkd;

      if (sw === 'solo') {
        if (payer) owed[payer] = (owed[payer] || 0) + hkd;
      } else if (sw === 'all') {
        const share = hkd / travellerNames.length;
        travellerNames.forEach(n => { owed[n] = (owed[n] || 0) + share; });
      } else {
        const names = sw as string[];
        if (names.length > 0) {
          const share = hkd / names.length;
          names.forEach(n => { owed[n] = (owed[n] || 0) + share; });
        }
      }
    });

    // net[name] = paid - owed; positive = others owe them, negative = they owe others
    const net: Record<string, number> = {};
    travellerNames.forEach(n => { net[n] = (paid[n] || 0) - (owed[n] || 0); });

    // Greedy settlement: creditors (net > 0) receive from debtors (net < 0)
    const creditors = travellerNames.filter(n => net[n] > 0.01).map(n => ({ name: n, amount: net[n] }));
    const debtors = travellerNames.filter(n => net[n] < -0.01).map(n => ({ name: n, amount: -net[n] }));
    const settlements: { from: string; to: string; amount: number }[] = [];

    let i = 0, j = 0;
    while (i < debtors.length && j < creditors.length) {
      const amount = Math.min(debtors[i].amount, creditors[j].amount);
      settlements.push({ from: debtors[i].name, to: creditors[j].name, amount });
      debtors[i].amount -= amount;
      creditors[j].amount -= amount;
      if (debtors[i].amount < 0.01) i++;
      if (creditors[j].amount < 0.01) j++;
    }
    return settlements;
  };

  if (!currentTrip) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <DollarSign className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">{t('No Trip Selected')}</h2>
          <p className="text-gray-500">{t('Create a new trip to track expenses')}</p>
        </div>
      </div>
    );
  }

  const totalsByCurrency = getTotalByCurrency();
  const totalsByPayer = getTotalByPayer();
  const expenseByPerson = Object.keys(exchangeRates).length > 0 ? getExpenseByPerson() : {};
  const settlements = Object.keys(exchangeRates).length > 0 && travellerNames.length > 1 ? getSettlements() : [];
  const unsettledByCurrency = getUnsettledTotalByCurrency();
  const groupedByDate = expenses.reduce((acc, expense) => {
    if (!acc[expense.date]) {
      acc[expense.date] = [];
    }
    acc[expense.date].push(expense);
    return acc;
  }, {} as Record<string, Expense[]>);

  return (
    <div className="space-y-6 max-w-full overflow-x-hidden">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{t('Travel Expenses')}</h2>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-400 text-white rounded-lg hover:bg-purple-500 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span className="hidden sm:inline">{t('Add Expense')}</span>
          <span className="sm:hidden">{t('Add')}</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h3 className="text-sm font-medium text-gray-600 mb-2 flex items-center gap-1">
            <DollarSign className="w-4 h-4" />
            {t('Total Expenses')}
          </h3>
          <div className="space-y-1">
            {Object.entries(totalsByCurrency).map(([currency, total]) => {
              const rate = exchangeRates[currency];
              const hkdVal = convertCurrency(total, currency, exchangeRates);
              return (
                <div key={currency} className="flex flex-col border-b border-gray-100 last:border-0 py-1">
                  <div className="flex items-center justify-between">
                    <div className="text-lg font-bold text-gray-900">
                      {currency} {total.toFixed(2)}
                    </div>
                    <div className="text-sm font-medium text-gray-600">
                      ≈ HKD {hkdVal.toFixed(2)}
                    </div>
                  </div>
                  {currency !== 'HKD' && rate && (
                    <div className="text-xs text-gray-400 text-right">
                      Rate: 1 HKD = {rate.toFixed(4)} {currency}
                    </div>
                  )}
                </div>
              );
            })}
            {Object.keys(totalsByCurrency).length === 0 && (
              <div className="text-xl sm:text-2xl font-bold text-gray-400">$0.00</div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h3 className="text-sm font-medium text-gray-600 mb-2 flex items-center gap-1">
            <DollarSign className="w-4 h-4" />
            {t('Total in HKD')}
          </h3>
          <div className="text-xl sm:text-2xl font-bold text-gray-900">
            HKD {totalHKD.toFixed(2)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {t('Auto-converted from')} {Object.keys(totalsByCurrency).length} {t('currencies')}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h3 className="text-sm font-medium text-gray-600 mb-2">{t('Total Items')}</h3>
          <div className="text-xl sm:text-2xl font-bold text-gray-900">{expenses.length}</div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h3 className="text-sm font-medium text-gray-600 mb-2">{t('Categories')}</h3>
          <div className="text-sm space-y-1">
            {Object.entries(
              expenses.reduce((acc, exp) => {
                const hkd = convertCurrency(exp.price, exp.currency, exchangeRates);
                acc[exp.category] = (acc[exp.category] || 0) + hkd;
                return acc;
              }, {} as Record<string, number>)
            ).map(([category, total]) => (
              <div key={category} className="flex justify-between">
                <span className="text-gray-600 capitalize">{category}:</span>
                <span className="font-medium">HKD {total.toFixed(0)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Who Paid + Expense By Person */}
      {(Object.keys(totalsByPayer).length > 0 || Object.keys(expenseByPerson).length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Object.keys(totalsByPayer).length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <h3 className="text-sm font-medium text-gray-600 mb-3 flex items-center gap-2">
                <User className="w-4 h-4" />
                {t('Paid By Person')}
              </h3>
              <div className="space-y-2">
                {Object.entries(totalsByPayer).map(([payer, currencies]) => (
                  <div key={payer} className="bg-purple-50 rounded-lg p-3">
                    <div className="font-medium text-purple-900 mb-1">{payer}</div>
                    <div className="space-y-1">
                      {Object.entries(currencies).map(([currency, total]) => (
                        <div key={currency} className="text-sm text-purple-700">
                          {currency} {(total as number).toFixed(2)}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {Object.keys(expenseByPerson).length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <h3 className="text-sm font-medium text-gray-600 mb-3 flex items-center gap-2">
                <Users className="w-4 h-4" />
                {t('Expense By Person')}
              </h3>
              <div className="space-y-2">
                {Object.entries(expenseByPerson).map(([name, total]) => (
                  <div key={name} className="bg-purple-50 rounded-lg p-3">
                    <div className="font-medium text-purple-900 mb-1">{name}</div>
                    <div className="text-sm text-purple-700">HKD {total.toFixed(2)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Split Expenses + Who Owes Who */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
            <h3 className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Users className="w-4 h-4" />
              {t('Split Expenses')}
            </h3>
            <span className="text-xs text-gray-400">{travellerNames.length} {t('travellers')}</span>
          </div>
          {Object.keys(unsettledByCurrency).length === 0 ? (
            <p className="text-sm text-gray-400">{t('No unsettled shared expenses to split')}</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(unsettledByCurrency).map(([currency, total]) => (
                <div key={currency} className="flex items-center justify-between bg-purple-50 rounded-lg px-3 py-2">
                  <div className="text-sm text-gray-600">
                    <span className="font-medium text-gray-900">{currency} {total.toFixed(2)}</span>
                    <span className="text-gray-400 mx-2">÷</span>
                    <span>{travellerNames.length} {t('travellers')}</span>
                  </div>
                  <div className="text-base font-bold text-purple-700">
                    {currency} {(total / travellerNames.length).toFixed(2)} / person
                  </div>
                </div>
              ))}
              <p className="text-xs text-gray-400 mt-1">{t('Based on unsettled shared expenses only')}</p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h3 className="text-sm font-medium text-gray-600 mb-3 flex items-center gap-2">
            <Users className="w-4 h-4" />
            {t('Who Owes Who')}
          </h3>
          {settlements.length === 0 ? (
            <p className="text-sm text-gray-400">{t('No debts to settle')}</p>
          ) : (
            <>
              <div className="space-y-2">
                {settlements.map((s, i) => (
                  <div key={i} className="flex items-center justify-between bg-orange-50 border border-orange-100 rounded-lg px-3 py-2">
                    <div className="text-sm text-gray-700">
                      <span className="font-semibold text-orange-700">{s.from}</span>
                      <span className="text-gray-400 mx-2">→</span>
                      <span className="font-semibold text-purple-700">{s.to}</span>
                    </div>
                    <div className="text-sm font-bold text-orange-700">HKD {s.amount.toFixed(2)}</div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-2">{t('Minimum transactions to settle all debts')}</p>
            </>
          )}
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-gray-400/30 flex items-center justify-center z-40 p-4" onClick={resetForm}>
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold">
                {editingId ? t('Edit Expense') : t('Add Expense')}
              </h3>
              <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('Date')}</label>
                <button
                  type="button"
                  onClick={openDatePicker}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-left transition-colors hover:bg-gray-50 focus:ring-2 focus:ring-purple-400 focus:border-transparent ${formData.date ? 'text-gray-900 font-medium' : 'text-gray-400'}`}
                >
                  {formData.date ? format(parseISO(formData.date), 'MMM dd, yyyy') : 'Select date...'}
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('Item')}</label>
                <input
                  type="text"
                  required
                  value={formData.item}
                  onChange={(e) => setFormData({ ...formData, item: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                  placeholder="Expense description"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('Currency')}</label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                  >
                    {CURRENCIES.map(curr => (
                      <option key={curr} value={curr}>{curr}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('Price')}</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('Category')}</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as Expense['category'] })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('Who Paid')}</label>
                <WhoPaidDropdown
                  value={formData.whoPaid || ''}
                  names={travellerNames}
                  onChange={(v) => setFormData({ ...formData, whoPaid: v })}
                  onNew={() => setAddTravellerOpen(true)}
                  onDelete={deleteTravellerName}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('Split With')}</label>
                <div className="space-y-2">
                  <select
                    value={Array.isArray(formData.splitWith) ? 'specific' : (formData.splitWith || 'all')}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === 'all' || v === 'solo') setFormData({ ...formData, splitWith: v });
                      else setFormData({ ...formData, splitWith: [] });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                  >
                    <option value="all">{t('All travellers')}</option>
                    <option value="solo">{t('Solo (no split)')}</option>
                    {travellerNames.length > 0 && <option value="specific">{t('Specific travellers...')}</option>}
                  </select>
                  {Array.isArray(formData.splitWith) && travellerNames.length > 0 && (
                    <div className="flex flex-wrap gap-2 p-2 border border-gray-200 rounded-lg bg-gray-50">
                      {travellerNames.map(name => {
                        const selected = (formData.splitWith as string[]).includes(name);
                        return (
                          <button
                            key={name}
                            type="button"
                            onClick={() => {
                              const current = formData.splitWith as string[];
                              const updated = selected ? current.filter(n => n !== name) : [...current, name];
                              setFormData({ ...formData, splitWith: updated.length === travellerNames.length ? 'all' : updated });
                            }}
                            className={`px-2 py-1 rounded-full text-xs font-medium border transition-colors ${
                              selected ? 'bg-purple-500 text-white border-purple-500' : 'bg-white text-gray-600 border-gray-300 hover:border-purple-400'
                            }`}
                          >
                            {name}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="settled"
                  checked={formData.settled || false}
                  onChange={(e) => setFormData({ ...formData, settled: e.target.checked })}
                  className="w-4 h-4 text-purple-400 rounded focus:ring-purple-400"
                />
                <label htmlFor="settled" className="text-sm font-medium text-gray-700">
                  {t('Mark as settled')}
                </label>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-purple-400 text-white rounded-lg hover:bg-purple-500 transition-colors"
                >
                  {editingId ? t('Update') : t('Add')}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  {t('Cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Traveller Modal */}
      {addTravellerOpen && (
        <div className="fixed inset-0 bg-gray-400/30 flex items-center justify-center z-50 p-4" onClick={() => setAddTravellerOpen(false)}>
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-xs w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('Add Traveller')}</h3>
            <input
              type="text"
              autoFocus
              value={newTravellerName}
              onChange={(e) => setNewTravellerName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newTravellerName.trim()) {
                  addTravellerName(newTravellerName);
                  setFormData({ ...formData, whoPaid: newTravellerName.trim() });
                  setNewTravellerName('');
                  setAddTravellerOpen(false);
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent mb-4"
              placeholder={t('Traveller name')}
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  if (newTravellerName.trim()) {
                    addTravellerName(newTravellerName);
                    setFormData({ ...formData, whoPaid: newTravellerName.trim() });
                    setNewTravellerName('');
                  }
                  setAddTravellerOpen(false);
                }}
                className="flex-1 px-4 py-2 bg-purple-400 text-white rounded-lg hover:bg-purple-500 transition-colors"
              >
                {t('Add')}
              </button>
              <button
                type="button"
                onClick={() => { setNewTravellerName(''); setAddTravellerOpen(false); }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                {t('Cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Date Picker Modal */}
      {datePickerOpen && (
        <div className="fixed inset-0 bg-gray-400/30 flex items-center justify-center z-50 p-4" onClick={() => setDatePickerOpen(false)}>
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <CalendarPicker
              calendarMonth={calendarMonth}
              selectedDate={formData.date || undefined}
              dragOffset={dragOffset}
              dragDirection={dragDirection}
              isSnappingBack={isSnappingBack}
              showLeftArrow={showLeftArrow}
              showRightArrow={showRightArrow}
              onPreviousMonth={goToPreviousMonth}
              onNextMonth={goToNextMonth}
              onSelectDate={handleDateSelect}
              calendarNavigationProps={calendarNavigationProps}
              header={<div className="mb-4"><h3 className="text-lg font-semibold text-gray-900">{t('Select Date')}</h3></div>}
              footer={
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setDatePickerOpen(false)}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    {t('Close')}
                  </button>
                </div>
              }
            />
          </div>
        </div>
      )}

      {/* Expenses List */}
      <div className="space-y-4">
        {Object.entries(groupedByDate).length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <p className="text-gray-500">{t('No expenses recorded yet')}</p>
          </div>
        ) : (
          Object.entries(groupedByDate)
            .sort(([dateA], [dateB]) => dateB.localeCompare(dateA))
            .map(([date, items]) => {
              const dayTotal = items.reduce((acc, item) => {
                const key = item.currency;
                if (!acc[key]) acc[key] = 0;
                acc[key] += item.price;
                return acc;
              }, {} as Record<string, number>);

              return (
                <div key={date} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  <div className="bg-purple-100 px-4 py-3 border-b border-purple-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                    <h3 className="font-semibold text-gray-900">
                      {format(parseISO(date), 'EEE, MMM dd, yyyy')}
                    </h3>
                    <div className="text-sm font-medium text-gray-600 flex flex-wrap gap-2">
                      {Object.entries(dayTotal).map(([currency, total]) => (
                        <span key={currency}>
                          {currency} {total.toFixed(2)}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {items.map(item => (
                      <div key={item.id} className={`p-4 hover:bg-gray-50 transition-colors ${item.settled ? 'bg-green-50' : ''}`}>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-start gap-2 flex-1 min-w-0">
                            <button
                              onClick={() => toggleSettled(item)}
                              className="p-0.5 text-gray-400 hover:text-green-600 transition-colors flex-shrink-0 mt-0.5"
                              title={item.settled ? 'Mark as unsettled' : 'Mark as settled'}
                            >
                              {item.settled ? (
                                <CheckCircle2 className="w-5 h-5 text-green-600" />
                              ) : (
                                <Circle className="w-5 h-5" />
                              )}
                            </button>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className={`font-medium truncate ${item.settled ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                                  {item.item}
                                </h4>
                                <span className={`px-2 py-0.5 text-xs rounded-full border flex-shrink-0 ${getCategoryColor(item.category)}`}>
                                  {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 mt-1">
                                <p className={`text-lg font-semibold ${item.settled ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                                  {item.currency} {item.price.toFixed(2)}
                                </p>
                                {item.whoPaid && (
                                  <span className="text-xs text-gray-500 flex items-center gap-1">
                                    <User className="w-3 h-3" />
                                    {item.whoPaid}
                                  </span>
                                )}
                              </div>
                              {(() => {
                                const sw = item.splitWith ?? 'all';
                                if (sw === 'solo') return (
                                  <p className="text-xs text-gray-400 mt-0.5">Solo expense (no split)</p>
                                );
                                if (sw === 'all') {
                                  if (travellerNames.length < 2) return null;
                                  return (
                                    <p className="text-xs text-gray-400 mt-0.5">
                                      ÷ {travellerNames.length} = {item.currency} {(item.price / travellerNames.length).toFixed(2)} / person
                                    </p>
                                  );
                                }
                                // specific travellers
                                const names = sw as string[];
                                const count = names.length;
                                if (count < 1) return null;
                                if (count === 1) return (
                                  <p className="text-xs text-gray-400 mt-0.5">Pay for {names[0]}</p>
                                );
                                return (
                                  <p className="text-xs text-gray-400 mt-0.5">
                                    Split with {names.join(', ')} ({count} people) = {item.currency} {(item.price / count).toFixed(2)} / person
                                  </p>
                                );
                              })()}
                            </div>
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            <button
                              onClick={() => handleEdit(item)}
                              className="p-1 text-gray-400 hover:text-purple-600 transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
        )}
      </div>
    </div>
  );
}
