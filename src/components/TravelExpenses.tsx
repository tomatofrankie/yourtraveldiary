import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, DollarSign, X, User } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Trip, Expense } from '../types';
import { expenseStorage, generateId } from '../utils/storage';
import { getCategoryColor } from '../utils/colors';
import { getExchangeRates, convertCurrency } from '../utils/currency';

interface TravelExpensesProps {
  currentTrip: Trip | null;
}

const CATEGORIES = ['food', 'shopping', 'hotel', 'transportation', 'attraction', 'other'] as const;
const CURRENCIES = ['HKD', 'USD', 'EUR', 'GBP', 'JPY', 'CNY', 'AUD', 'CAD', 'CHF', 'SGD', 'TWD', 'KRW', 'THB'];

export function TravelExpenses({ currentTrip }: TravelExpensesProps) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({});
  const [totalHKD, setTotalHKD] = useState<number>(0);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Expense>>({
    date: '',
    item: '',
    currency: 'HKD',
    price: 0,
    category: 'food',
    whoPaid: '',
  });

  useEffect(() => {
    if (currentTrip) {
      loadExpenses();
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

    const expense: Expense = {
      id: editingId || generateId(),
      tripId: currentTrip.id,
      date: formData.date!,
      item: formData.item!,
      currency: formData.currency!,
      price: Number(formData.price),
      category: formData.category as Expense['category'],
      whoPaid: formData.whoPaid || "",
    };

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

  const resetForm = () => {
    setFormData({
      date: '',
      item: '',
      currency: 'HKD',
      price: 0,
      category: 'food',
      whoPaid: '',
    });
    setEditingId(null);
    setShowForm(false);
  };

  const getTotalByCurrency = () => {
    const totals: Record<string, number> = {};
    expenses.forEach(expense => {
      if (!totals[expense.currency]) {
        totals[expense.currency] = 0;
      }
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

  if (!currentTrip) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <DollarSign className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">No Trip Selected</h2>
          <p className="text-gray-500">Create a new trip to track expenses</p>
        </div>
      </div>
    );
  }

  const totalsByCurrency = getTotalByCurrency();
  const totalsByPayer = getTotalByPayer();
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
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Travel Expenses</h2>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-400 text-white rounded-lg hover:bg-purple-500 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span className="hidden sm:inline">Add Expense</span>
          <span className="sm:hidden">Add</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h3 className="text-sm font-medium text-gray-600 mb-2 flex items-center gap-1">
            <DollarSign className="w-4 h-4" />
            Total Expenses
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
            Total in HKD
          </h3>
          <div className="text-xl sm:text-2xl font-bold text-gray-900">
            HKD {totalHKD.toFixed(2)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Auto-converted from {Object.keys(totalsByCurrency).length} currencies
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Total Items</h3>
          <div className="text-xl sm:text-2xl font-bold text-gray-900">{expenses.length}</div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Categories</h3>
          <div className="text-sm space-y-1">
            {Object.entries(
              expenses.reduce((acc, exp) => {
                acc[exp.category] = (acc[exp.category] || 0) + 1;
                return acc;
              }, {} as Record<string, number>)
            ).map(([category, count]) => (
              <div key={category} className="flex justify-between">
                <span className="text-gray-600 capitalize">{category}:</span>
                <span className="font-medium">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Who Paid Summary */}
      {Object.keys(totalsByPayer).length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h3 className="text-sm font-medium text-gray-600 mb-3 flex items-center gap-2">
            <User className="w-4 h-4" />
            Paid By Person
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(totalsByPayer).map(([payer, currencies]) => (
              <div key={payer} className="bg-purple-50 rounded-lg p-3">
                <div className="font-medium text-purple-900 mb-1">{payer}</div>
                <div className="space-y-1">
                  {Object.entries(currencies).map(([currency, total]) => (
                    <div key={currency} className="text-sm text-purple-700">
                      {currency} {total.toFixed(2)}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold">
                {editingId ? 'Edit Expense' : 'Add Expense'}
              </h3>
              <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent ${formData.date ? 'text-gray-900' : 'text-gray-300'}`}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Item</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Who Paid (optional)</label>
                <input
                  type="text"
                  value={formData.whoPaid || ''}
                  onChange={(e) => setFormData({ ...formData, whoPaid: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                  placeholder="Name of person who paid"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-purple-400 text-white rounded-lg hover:bg-purple-500 transition-colors"
                >
                  {editingId ? 'Update' : 'Add'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Expenses List */}
      <div className="space-y-4">
        {Object.entries(groupedByDate).length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <p className="text-gray-500">No expenses recorded yet</p>
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
                      <div key={item.id} className="p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-medium text-gray-900 truncate">{item.item}</h4>
                              <span className={`px-2 py-0.5 text-xs rounded-full border flex-shrink-0 ${getCategoryColor(item.category)}`}>
                                {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 mt-1">
                              <p className="text-lg font-semibold text-gray-900">
                                {item.currency} {item.price.toFixed(2)}
                              </p>
                              {item.whoPaid && (
                                <span className="text-xs text-gray-500 flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  {item.whoPaid}
                                </span>
                              )}
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
