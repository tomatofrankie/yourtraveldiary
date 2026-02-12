import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Info, X } from 'lucide-react';
import { Trip, TravelInfo as TravelInfoType } from '../types';
import { travelInfoStorage, generateId } from '../utils/storage';
import { getCategoryColor } from '../utils/colors';

interface TravelInfoProps {
  currentTrip: Trip | null;
}

const INFO_TYPES = ['hotel', 'flight', 'car-rental', 'restaurant'] as const;

export function TravelInfo({ currentTrip }: TravelInfoProps) {
  const [infos, setInfos] = useState<TravelInfoType[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<TravelInfoType>>({
    type: 'hotel',
    name: '',
    confirmationNumber: '',
    date: '',
    time: '',
    address: '',
    phone: '',
    notes: '',
  });

  useEffect(() => {
    if (currentTrip) {
      loadInfos();
    }
  }, [currentTrip]);

  const loadInfos = () => {
    if (currentTrip) {
      const data = travelInfoStorage.getAll(currentTrip.id);
      setInfos(data);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTrip) return;

    const info: TravelInfoType = {
      id: editingId || generateId(),
      tripId: currentTrip.id,
      type: formData.type as TravelInfoType['type'],
      name: formData.name!,
      confirmationNumber: formData.confirmationNumber,
      date: formData.date,
      time: formData.time,
      address: formData.address,
      phone: formData.phone,
      notes: formData.notes,
    };

    travelInfoStorage.save(info);
    loadInfos();
    resetForm();
  };

  const handleEdit = (info: TravelInfoType) => {
    setFormData(info);
    setEditingId(info.id);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this information?')) {
      travelInfoStorage.delete(id);
      loadInfos();
    }
  };

  const resetForm = () => {
    setFormData({
      type: 'hotel',
      name: '',
      confirmationNumber: '',
      date: '',
      time: '',
      address: '',
      phone: '',
      notes: '',
    });
    setEditingId(null);
    setShowForm(false);
  };

  if (!currentTrip) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Info className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">No Trip Selected</h2>
          <p className="text-gray-500">Create a new trip to add travel information</p>
        </div>
      </div>
    );
  }

  const groupedByType = infos.reduce((acc, info) => {
    if (!acc[info.type]) {
      acc[info.type] = [];
    }
    acc[info.type].push(info);
    return acc;
  }, {} as Record<string, TravelInfoType[]>);

  return (
    <div className="space-y-6 max-w-full overflow-x-hidden">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Travel Information</h2>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-400 text-white rounded-lg hover:bg-purple-500 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span className="hidden sm:inline">Add Info</span>
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold">
                {editingId ? 'Edit Information' : 'Add Information'}
              </h3>
              <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as TravelInfoType['type'] })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                >
                  {INFO_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                  placeholder="Hotel/Flight/Restaurant name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirmation Number</label>
                <input
                  type="text"
                  value={formData.confirmationNumber}
                  onChange={(e) => setFormData({ ...formData, confirmationNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                  placeholder="Booking/confirmation number"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent ${formData.date ? 'text-gray-900' : 'text-gray-300'}`}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                  <input
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent ${formData.time ? 'text-gray-900' : 'text-gray-300'}`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                  placeholder="Full address"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                  placeholder="Contact number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                  placeholder="Additional information..."
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

      {/* Information List */}
      <div className="space-y-6">
        {Object.entries(groupedByType).length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <p className="text-gray-500">No travel information added yet</p>
          </div>
        ) : (
          INFO_TYPES.filter(type => groupedByType[type]).map(type => (
            <div key={type} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className={`px-4 py-3 border-b ${getCategoryColor(type)} bg-opacity-50`}>
                <h3 className="font-semibold capitalize">{type}</h3>
              </div>
              <div className="divide-y divide-gray-100">
                {groupedByType[type]?.map(info => (
                  <div key={info.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 text-lg truncate">{info.name}</h4>
                        <div className="mt-2 space-y-1 text-sm text-gray-600">
                          {info.confirmationNumber && (
                            <p className="break-words"><span className="font-medium">Confirmation:</span> {info.confirmationNumber}</p>
                          )}
                          {info.date && (
                            <p><span className="font-medium">Date:</span> {info.date} {info.time && `at ${info.time}`}</p>
                          )}
                          {info.address && (
                            <p className="break-words"><span className="font-medium">Address:</span> {info.address}</p>
                          )}
                          {info.phone && (
                            <p><span className="font-medium">Phone:</span> {info.phone}</p>
                          )}
                          {info.notes && (
                            <p className="mt-2 text-gray-700 break-words">{info.notes}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleEdit(info)}
                          className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(info.id)}
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
          ))
        )}
      </div>
    </div>
  );
}
