import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, ShoppingBag, X, Check, Link as LinkIcon } from 'lucide-react';
import { Trip, ShoppingItem } from '../types';
import { shoppingStorage, generateId } from '../utils/storage';
import { getCategoryColor } from '../utils/colors';

interface ShoppingListProps {
  currentTrip: Trip | null;
}

export function ShoppingList({ currentTrip }: ShoppingListProps) {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<ShoppingItem>>({
    name: '',
    category: '',
    link: '',
    purchased: false,
  });

  useEffect(() => {
    if (currentTrip) {
      loadItems();
    }
  }, [currentTrip]);

  const loadItems = () => {
    if (currentTrip) {
      const data = shoppingStorage.getAll(currentTrip.id);
      setItems(data);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTrip) return;

    const item: ShoppingItem = {
      id: editingId || generateId(),
      tripId: currentTrip.id,
      name: formData.name!,
      category: formData.category!,
      link: formData.link || "",
      purchased: formData.purchased || false,
    };

    shoppingStorage.save(item);
    loadItems();
    resetForm();
  };

  const handleEdit = (item: ShoppingItem) => {
    setFormData(item);
    setEditingId(item.id);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this item?')) {
      shoppingStorage.delete(id);
      loadItems();
    }
  };

  const togglePurchased = (item: ShoppingItem) => {
    const updated = { ...item, purchased: !item.purchased };
    shoppingStorage.save(updated);
    loadItems();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      category: '',
      link: '',
      purchased: false,
    });
    setEditingId(null);
    setShowForm(false);
  };

  if (!currentTrip) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <ShoppingBag className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">No Trip Selected</h2>
          <p className="text-gray-500">Create a new trip to add shopping items</p>
        </div>
      </div>
    );
  }

  const groupedByCategory = items.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, ShoppingItem[]>);

  const purchasedCount = items.filter(i => i.purchased).length;

  return (
    <div className="space-y-6 max-w-full overflow-x-hidden">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Shopping List</h2>
          <p className="text-sm text-gray-600 mt-1">
            {purchasedCount} of {items.length} items purchased
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-400 text-white rounded-lg hover:bg-purple-500 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span className="hidden sm:inline">Add Item</span>
          <span className="sm:hidden">Add</span>
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold">
                {editingId ? 'Edit Item' : 'Add Item'}
              </h3>
              <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                  placeholder="Item name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <input
                  type="text"
                  required
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                  placeholder="e.g., Souvenirs, Clothing, Electronics"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Link (optional)</label>
                <input
                  type="url"
                  value={formData.link || ''}
                  onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                  placeholder="https://example.com/product"
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

      {/* Shopping Items by Category */}
      <div className="space-y-6">
        {Object.entries(groupedByCategory).length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <p className="text-gray-500">No shopping items added yet</p>
          </div>
        ) : (
          Object.entries(groupedByCategory)
            .sort(([catA], [catB]) => catA.localeCompare(catB))
            .map(([category, categoryItems]) => (
              <div key={category} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className={`px-4 py-3 border-b ${getCategoryColor(category)} bg-opacity-50`}>
                  <h3 className="font-semibold capitalize">{category}</h3>
                </div>
                <div className="divide-y divide-gray-100">
                  {categoryItems.map(item => (
                    <div
                      key={item.id}
                      className={`p-4 flex items-center justify-between gap-3 transition-all ${
                        item.purchased ? 'bg-green-50' : 'bg-white'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <h4 className={`font-medium truncate ${item.purchased ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                          {item.name}
                        </h4>
                        {item.link && (
                          <a
                            href={item.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-purple-600 hover:underline mt-1"
                          >
                            <LinkIcon className="w-3 h-3" />
                            View Link
                          </a>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => togglePurchased(item)}
                          className={`flex items-center gap-1 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm transition-colors ${
                            item.purchased
                              ? 'bg-green-600 text-white'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          <Check className="w-3 h-3 sm:w-4 sm:h-4" />
                          <span className="hidden sm:inline">{item.purchased ? 'Purchased' : 'Mark'}</span>
                        </button>
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
                  ))}
                </div>
              </div>
            ))
        )}
      </div>
    </div>
  );
}
