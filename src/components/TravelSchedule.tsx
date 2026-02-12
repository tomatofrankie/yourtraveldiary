import { useState, useEffect, useRef } from 'react';
import { Plus, Edit2, Trash2, MapPin, X, ChevronDown, ChevronRight } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Trip, ScheduleItem } from '../types';
import { scheduleStorage, generateId } from '../utils/storage';
import { getCategoryColor } from '../utils/colors';

interface TravelScheduleProps {
  currentTrip: Trip | null;
}

const CATEGORIES = ['food', 'shopping', 'hotel', 'transportation', 'attraction', 'other'] as const;

export function TravelSchedule({ currentTrip }: TravelScheduleProps) {
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({});
  const [formData, setFormData] = useState<Partial<ScheduleItem>>({
    date: '',
    timeFrom: '',
    timeTo: '',
    location: '',
    category: 'attraction',
    googleMapsLink: '',
    notes: '',
  });

  const hasAutoExpandedRef = useRef<string>('');

  const loadSchedules = () => {
    if (currentTrip) {
      const items = scheduleStorage.getAll(currentTrip.id);
      const sorted = items.sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date);
        return dateCompare !== 0 ? dateCompare : a.timeFrom.localeCompare(b.timeFrom);
      });
      setSchedules(sorted);

              // Auto-expand today's date if there are schedules for today
      // Only do this once per trip load
      const tripKey = currentTrip.id;
      if (hasAutoExpandedRef.current !== tripKey) {
        hasAutoExpandedRef.current = tripKey;
        const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD in local time
        const todaySchedules = items.filter(s => s.date === today);
        if (todaySchedules.length > 0) {
          setExpandedDates(prev => ({ ...prev, [today]: true }));
        }
      }
    }
  };

  useEffect(() => {
    if (currentTrip) {
      loadSchedules();
    }
  }, [currentTrip]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTrip) return;

    const item: ScheduleItem = {
      id: editingId || generateId(),
      tripId: currentTrip.id,
      date: formData.date!,
      timeFrom: formData.timeFrom!,
      timeTo: formData.timeTo || "",
      location: formData.location!,
      category: formData.category as ScheduleItem['category'],
      googleMapsLink: formData.googleMapsLink,
      notes: formData.notes,
    };

    scheduleStorage.save(item);
    loadSchedules();
    resetForm();
  };

  const handleEdit = (item: ScheduleItem) => {
    setFormData(item);
    setEditingId(item.id);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this schedule item?')) {
      scheduleStorage.delete(id);
      loadSchedules();
    }
  };

  const resetForm = () => {
    setFormData({
      date: '',
      timeFrom: '',
      timeTo: '',
      location: '',
      category: 'attraction',
      googleMapsLink: '',
      notes: '',
    });
    setEditingId(null);
    setShowForm(false);
  };

  if (!currentTrip) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <MapPin className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">No Trip Selected</h2>
          <p className="text-gray-500">Create a new trip to add schedules</p>
        </div>
      </div>
    );
  }

  const groupedSchedules = schedules.reduce((acc, schedule) => {
    if (!acc[schedule.date]) {
      acc[schedule.date] = [];
    }
    acc[schedule.date].push(schedule);
    return acc;
  }, {} as Record<string, ScheduleItem[]>);

  return (
    <div className="space-y-6 max-w-full overflow-x-hidden">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Travel Schedule</h2>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-400 text-white rounded-lg hover:bg-purple-500 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span className="hidden sm:inline">Add Schedule</span>
          <span className="sm:hidden">Add</span>
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold">
                {editingId ? 'Edit Schedule' : 'Add Schedule'}
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">From Time *</label>
                  <input
                    type="time"
                    required
                    value={formData.timeFrom}
                    onChange={(e) => setFormData({ ...formData, timeFrom: e.target.value })}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent ${formData.timeFrom ? 'text-gray-900' : 'text-gray-300'}`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">To Time</label>
                  <input
                    type="time"
                    value={formData.timeTo || ''}
                    onChange={(e) => setFormData({ ...formData, timeTo: e.target.value })}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent ${formData.timeTo ? 'text-gray-900' : 'text-gray-300'}`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Details</label>
                <input
                  type="text"
                  required
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                  placeholder="Details"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as ScheduleItem['category'] })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Google Maps Link</label>
                <input
                  type="url"
                  value={formData.googleMapsLink}
                  onChange={(e) => setFormData({ ...formData, googleMapsLink: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                  placeholder="https://maps.google.com/..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                  placeholder="Additional notes..."
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

      {/* Schedule List */}
      <div className="space-y-6">
        {Object.entries(groupedSchedules).length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <p className="text-gray-500">No schedules added yet</p>
          </div>
        ) : (
          Object.entries(groupedSchedules)
            .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
            .map(([date, items]) => {
              const isExpanded = expandedDates[date] || false;
              return (
                <div key={date} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  <button 
                    onClick={() => setExpandedDates(prev => ({ ...prev, [date]: !prev[date] }))}
                    className="w-full text-left bg-purple-50 hover:bg-purple-100 px-4 py-3 border-b border-purple-100 transition-colors flex items-center justify-between"
                  >
                    <h3 className="font-semibold text-gray-900">
                      {format(parseISO(date), 'EEEE, MMMM dd, yyyy')}
                    </h3>
                    <div className="text-purple-400">
                      {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="divide-y divide-gray-100">
                      {items.map(item => (
                        <div key={item.id} className="p-4 hover:bg-gray-50 transition-colors">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex gap-2 sm:gap-4 flex-1 min-w-0">
                              <div className="flex-shrink-0 w-20 sm:w-24 text-xs sm:text-sm font-medium text-gray-600">
                                {item.timeFrom}
                                {item.timeTo && <span className="block text-gray-400">→ {item.timeTo}</span>}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-gray-900 truncate">{item.location}</h4>
                                <span className={`inline-block mt-1 px-2 py-1 text-xs rounded-full border ${getCategoryColor(item.category)}`}>
                                  {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
                                </span>
                                {item.notes && (
                                  <p className="text-sm text-gray-600 mt-2 break-words">{item.notes}</p>
                                )}
                                {item.googleMapsLink && (
                                  <a
                                    href={item.googleMapsLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-purple-600 hover:underline mt-1 inline-block"
                                  >
                                    View on Google Maps →
                                  </a>
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
                  )}
                </div>
              );
            })
        )}
      </div>
    </div>
  );
}
