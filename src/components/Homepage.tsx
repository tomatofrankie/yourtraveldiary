import { useEffect, useState } from 'react';
import { Calendar, MapPin, CloudSun, ChevronDown, ChevronRight, Edit2, X, Plus, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Trip, ScheduleItem, WeatherData, DestinationSegment } from '../types';
import { scheduleStorage, tripStorage, generateId } from '../utils/storage';
import { getWeatherForDate } from '../utils/weather';
import { getCategoryColor } from '../utils/colors';

interface HomepageProps {
  currentTrip: Trip | null;
  onUpdateTrip?: (updatedTrip?: Trip) => void;
}

const THEME_COLORS = [
  { name: 'Purple', value: 'from-purple-400 to-purple-600', text: 'text-purple-100', border: 'border-purple-100', bg: 'bg-purple-50' },
  { name: 'Blue', value: 'from-blue-400 to-blue-600', text: 'text-blue-100', border: 'border-blue-100', bg: 'bg-blue-50' },
  { name: 'Green', value: 'from-emerald-400 to-emerald-600', text: 'text-emerald-100', border: 'border-emerald-100', bg: 'bg-emerald-50' },
  { name: 'Pink', value: 'from-pink-400 to-pink-600', text: 'text-pink-100', border: 'border-pink-100', bg: 'bg-pink-50' },
  { name: 'Orange', value: 'from-orange-400 to-orange-600', text: 'text-orange-100', border: 'border-orange-100', bg: 'bg-orange-50' },
];

export function Homepage({ currentTrip, onUpdateTrip }: HomepageProps) {
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Trip>>({});
  const [weatherData, setWeatherData] = useState<WeatherData[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (currentTrip) {
      const items = scheduleStorage.getAll(currentTrip.id);
      setSchedules(items);
      loadWeather(currentTrip);
      
      // Auto-expand today's date if there are schedules for today
      const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD in local time
      const todaySchedules = items.filter(s => s.date === today);
      if (todaySchedules.length > 0) {
        setExpandedDates(prev => ({ ...prev, [today]: true }));
      }
    }
  }, [currentTrip]);

  const loadWeather = async (trip: Trip) => {
    setLoading(true);
    try {
      const dates = getDatesInRange(trip.startDate, trip.endDate);
      const weatherPromises = dates.map(date => {
        // Find which destination segment this date belongs to
        const segment = trip.destinations?.find(seg => 
          date >= seg.startDate && date <= seg.endDate
        );
        const destination = segment?.name || trip.destination;
        return getWeatherForDate(destination, date);
      });
      const weather = await Promise.all(weatherPromises);
      setWeatherData(weather);
    } catch (error) {
      console.error('Failed to load weather:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDatesInRange = (start: string, end: string): string[] => {
    const dates: string[] = [];
    const startDate = parseISO(start);
    const endDate = parseISO(end);
    const current = new Date(startDate);
    
    while (current <= endDate) {
      dates.push(format(current, 'yyyy-MM-dd'));
      current.setDate(current.getDate() + 1);
    }
    
    return dates;
  };

  const getSchedulesByDate = (date: string) => {
    return schedules
      .filter(s => s.date === date)
      .sort((a, b) => a.timeFrom.localeCompare(b.timeFrom));
  };

  const startEditing = () => {
    if (currentTrip) {
      setEditForm(currentTrip);
      setIsEditing(true);
    }
  };

  const handleSaveTrip = () => {
    if (currentTrip && editForm.name && editForm.startDate && editForm.endDate) {
      // Sort destinations by startDate ascending
      const rawDestinations = editForm.destinations && editForm.destinations.length > 0
        ? editForm.destinations
        : [{ id: generateId(), name: editForm.destination || 'Unknown', startDate: editForm.startDate, endDate: editForm.endDate }];

      const destinations = [...rawDestinations].sort((a, b) =>
        a.startDate.localeCompare(b.startDate)
      );

      const updatedTrip: Trip = {
        ...currentTrip,
        ...editForm,
        destinations,
        destination: destinations[0].name,
      };

      tripStorage.save(updatedTrip);
      setIsEditing(false);
      // Immediately update local state so UI reflects changes without waiting for parent reload
      if (onUpdateTrip) onUpdateTrip(updatedTrip);
    }
  };

  // Destination segment management
  const addDestinationSegment = () => {
    if (!currentTrip) return;
    const segments = editForm.destinations || [];
    const newSegment: DestinationSegment = {
      id: generateId(),
      name: '',
      startDate: editForm.startDate || currentTrip.startDate,
      endDate: editForm.endDate || currentTrip.endDate,
    };
    setEditForm({ ...editForm, destinations: [...segments, newSegment] });
  };

  const updateDestinationSegment = (index: number, field: keyof DestinationSegment, value: string) => {
    const segments = [...(editForm.destinations || [])];
    segments[index] = { ...segments[index], [field]: value };
    setEditForm({ ...editForm, destinations: segments });
  };

  const removeDestinationSegment = (index: number) => {
    const segments = [...(editForm.destinations || [])];
    segments.splice(index, 1);
    setEditForm({ ...editForm, destinations: segments });
  };

  if (!currentTrip) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <MapPin className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">No Trip Selected</h2>
          <p className="text-gray-500">Create a new trip to get started</p>
        </div>
      </div>
    );
  }

  const dates = getDatesInRange(currentTrip.startDate, currentTrip.endDate);

  const isHexColor = currentTrip.themeColor?.startsWith('#');
  const themeConfig = !isHexColor 
    ? (THEME_COLORS.find(t => t.value === currentTrip.themeColor) || THEME_COLORS[0])
    : { value: '', text: 'text-white/90', border: '', bg: '' };

  const bannerStyle = isHexColor 
    ? { background: `linear-gradient(to right, ${currentTrip.themeColor}, ${currentTrip.themeColor}DD)` } 
    : {};

  return (
    <div className="space-y-6 max-w-full overflow-x-hidden">
      {/* Trip Header */}
      <div 
        className={`rounded-lg p-4 sm:p-6 text-white relative ${!isHexColor ? `bg-gradient-to-r ${themeConfig.value}` : ''}`}
        style={bannerStyle}
      >
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2 pr-8">{currentTrip.name}</h1>
            <div className={`flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 ${themeConfig.text}`}>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">
                  {currentTrip.destinations && currentTrip.destinations.length > 0 
                    ? currentTrip.destinations.map(d => d.name).join(', ')
                    : currentTrip.destination
                  }
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 flex-shrink-0" />
                <span>
                  {format(parseISO(currentTrip.startDate), 'MMM dd')} - {format(parseISO(currentTrip.endDate), 'MMM dd, yyyy')}
                </span>
              </div>
            </div>
          </div>
          <button 
            onClick={startEditing}
            className={`p-2 rounded-full hover:bg-white/20 transition-colors ${themeConfig.text} hover:text-white`}
          >
            <Edit2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Daily Itinerary & Weather */}
      <div className="space-y-4">
        {dates.map((date, index) => {
          const daySchedules = getSchedulesByDate(date);
          const weather = weatherData.find(w => w.date === date);
          const isExpanded = expandedDates[date] || false;
          // Find which destination segment this date belongs to
          const segment = currentTrip.destinations?.find(seg => 
            date >= seg.startDate && date <= seg.endDate
          );
          const destinationName = segment?.name || currentTrip.destination;
          
          return (
            <div key={date} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              {/* Day Header */}
              <button 
                onClick={() => setExpandedDates(prev => ({ ...prev, [date]: !prev[date] }))}
                className="w-full text-left bg-purple-50 hover:bg-purple-100 px-3 sm:px-4 py-3 border-b border-purple-100 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="text-purple-400">
                      {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-gray-900 text-sm sm:text-base">
                        Day {index + 1} - {format(parseISO(date), 'EEE, MMM dd')}
                      </h3>
                      <span className="inline-block px-2 py-1 text-xs font-medium bg-purple-100 text-purple-700 rounded-full border border-purple-200">
                        {destinationName}
                      </span>
                    </div>
                  </div>
                  {weather && (
                    <div className="flex items-center gap-2 sm:gap-3 text-sm ml-7 sm:ml-0">
                      <div className="flex items-center gap-1 sm:gap-2 bg-white px-2 sm:px-3 py-1 rounded-full shadow-sm">
                        <span className="text-xl sm:text-2xl">{weather.icon}</span>
                        <span className="font-medium text-xs sm:text-sm">High: {weather.tempMax}° / Low: {weather.tempMin}°</span>
                        <span className="text-gray-600 hidden sm:inline text-xs sm:text-sm">{weather.condition}</span>
                      </div>
                    </div>
                  )}
                </div>
                {weather && (
                  <div className="mt-2 ml-7 flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                    <CloudSun className="w-4 h-4 flex-shrink-0" />
                    <span className="break-words">{weather.suggestion}</span>
                  </div>
                )}
              </button>

              {/* Schedule Items */}
              {isExpanded && (
                <div className="p-3 sm:p-4">
                  {loading && !weather && (
                    <div className="text-center py-2 text-gray-500">
                      Loading weather...
                    </div>
                  )}
                  {daySchedules.length === 0 ? (
                    <p className="text-gray-400 text-sm italic">No activities planned for this day</p>
                  ) : (
                    <div className="space-y-3">
                      {daySchedules.map(schedule => (
                        <div key={schedule.id} className="flex gap-2 sm:gap-3 pb-3 border-b last:border-b-0 border-gray-100">
                          <div className="flex-shrink-0 w-16 sm:w-20 text-xs sm:text-sm font-medium text-gray-600">
                            {schedule.timeFrom}
                            {schedule.timeTo && <span className="block text-gray-400 text-xs">→ {schedule.timeTo}</span>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <h4 className="font-medium text-gray-900 truncate">{schedule.location}</h4>
                                <span className={`inline-block mt-1 px-2 py-0.5 text-xs rounded-full border ${getCategoryColor(schedule.category)}`}>
                                  {schedule.category.charAt(0).toUpperCase() + schedule.category.slice(1)}
                                </span>
                              </div>
                            </div>
                            {schedule.notes && (
                              <p className="text-xs sm:text-sm text-gray-600 mt-1 break-words">{schedule.notes}</p>
                            )}
                            {schedule.googleMapsLink && (
                              <a
                                href={schedule.googleMapsLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-purple-600 hover:underline mt-1 inline-block"
                              >
                                View on Maps →
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {dates.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <p>No dates configured for this trip</p>
        </div>
      )}

      {/* Edit Trip Modal */}
      {isEditing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold">Edit Trip</h3>
              <button onClick={() => setIsEditing(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Trip Name</label>
                <input
                  type="text"
                  required
                  value={editForm.name || ''}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Destinations</label>
                <div className="space-y-4 mb-4">
                  {(editForm.destinations || []).map((segment, index) => (
                    <div key={segment.id} className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="text-sm font-medium text-gray-700">Segment {index + 1}</h4>
                        {(editForm.destinations || []).length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeDestinationSegment(index)}
                            className="text-red-500 hover:text-red-700 p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <div className="space-y-2">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Destination Name</label>
                          <input
                            type="text"
                            required
                            value={segment.name}
                            onChange={(e) => updateDestinationSegment(index, 'name', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent text-sm"
                            placeholder="e.g., Tokyo, Japan"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Start Date</label>
                            <input
                              type="date"
                              required
                              value={segment.startDate}
                              onChange={(e) => updateDestinationSegment(index, 'startDate', e.target.value)}
                              className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent text-sm ${segment.startDate ? 'text-gray-900' : 'text-gray-400'}`}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">End Date</label>
                            <input
                              type="date"
                              required
                              value={segment.endDate}
                              onChange={(e) => updateDestinationSegment(index, 'endDate', e.target.value)}
                              className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent text-sm ${segment.endDate ? 'text-gray-900' : 'text-gray-400'}`}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addDestinationSegment}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600 hover:text-gray-900"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="text-sm font-medium">Add Destination Segment</span>
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Add multiple destinations for different parts of your trip. Weather will be fetched for each segment.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={editForm.startDate || ''}
                    onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={editForm.endDate || ''}
                    onChange={(e) => setEditForm({ ...editForm, endDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Banner Color</label>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <input
                      type="color"
                      value={editForm.themeColor?.startsWith('#') ? editForm.themeColor : '#a855f7'}
                      onChange={(e) => setEditForm({ ...editForm, themeColor: e.target.value })}
                      className="w-12 h-12 rounded-lg cursor-pointer border-2 border-gray-200 p-1"
                    />
                  </div>
                  <div className="text-sm text-gray-500">
                    Click to choose a custom color for your trip banner
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleSaveTrip}
                  className={`flex-1 px-4 py-2 text-white rounded-lg hover:opacity-90 transition-opacity ${
                    !editForm.themeColor?.startsWith('#') ? `bg-gradient-to-r ${editForm.themeColor || 'from-purple-400 to-purple-600'}` : ''
                  }`}
                  style={editForm.themeColor?.startsWith('#') ? { background: editForm.themeColor } : {}}
                >
                  Save Changes
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
