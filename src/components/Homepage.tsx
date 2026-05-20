import { useEffect, useState, useRef } from 'react';
import { Calendar, MapPin, CloudSun, ChevronDown, ChevronRight, Edit2, X, Plus, Trash2, Grid3x3, List, Users, Star } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Trip, ScheduleItem, WeatherData, DestinationSegment } from '../types';
import { scheduleStorage, tripStorage, generateId } from '../utils/storage';
import { auth } from '../utils/firebase';
import { getWeatherForDate } from '../utils/weather';
import { getCategoryColor } from '../utils/colors';
import { useCalendarNavigation } from '../utils/calendarNavigation';
import { CalendarPicker } from './CalendarPicker';
import { useTranslation } from '../utils/i18n';

interface HomepageProps {
  currentTrip: Trip | null;
  onUpdateTrip?: (updatedTrip?: Trip) => void;
  onShareTrip?: (trip: Trip) => void;
}

const THEME_COLORS = [
  { name: 'Purple', value: 'from-purple-400 to-purple-600', text: 'text-purple-100', border: 'border-purple-100', bg: 'bg-purple-50' },
  { name: 'Blue', value: 'from-blue-400 to-blue-600', text: 'text-blue-100', border: 'border-blue-100', bg: 'bg-blue-50' },
  { name: 'Green', value: 'from-emerald-400 to-emerald-600', text: 'text-emerald-100', border: 'border-emerald-100', bg: 'bg-emerald-50' },
  { name: 'Pink', value: 'from-pink-400 to-pink-600', text: 'text-pink-100', border: 'border-pink-100', bg: 'bg-pink-50' },
  { name: 'Orange', value: 'from-orange-400 to-orange-600', text: 'text-orange-100', border: 'border-orange-100', bg: 'bg-orange-50' },
];

export function Homepage({ currentTrip, onUpdateTrip, onShareTrip }: HomepageProps) {
  const { t } = useTranslation();
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Trip>>({});
  const [weatherData, setWeatherData] = useState<WeatherData[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({});
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [datePickerContext, setDatePickerContext] = useState<{ type: 'segment' | 'trip'; index: number; field: 'start' | 'end' } | null>(null);
  const [selectedStartDate, setSelectedStartDate] = useState<string | null>(null);
  const [calendarMonth, setCalendarMonth] = useState<{ year: number; month: number }>({ year: new Date().getFullYear(), month: new Date().getMonth() });
  const { goToPreviousMonth, goToNextMonth, showLeftArrow, showRightArrow, dragOffset, dragDirection, isSnappingBack, calendarNavigationProps } = useCalendarNavigation(setCalendarMonth);
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const [addScheduleModal, setAddScheduleModal] = useState<{ open: boolean; date: string; category: 'hotel' | 'transportation' | 'food' | 'shopping' | 'attraction' | 'other' | null }>({ open: false, date: '', category: null });
  const [scheduleFormData, setScheduleFormData] = useState<Partial<ScheduleItem>>({
    date: '',
    timeFrom: '',
    timeTo: '',
    location: '',
    category: 'hotel',
    googleMapsLink: '',
  });
  const [addMenuOpen, setAddMenuOpen] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const addMenuButtonRef = useRef<{ [key: string]: HTMLButtonElement | null }>({});
  const [hoveredScheduleId, setHoveredScheduleId] = useState<string | null>(null);
  const [menuCloseTimeout, setMenuCloseTimeout] = useState<NodeJS.Timeout | null>(null);
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);
  const [editScheduleData, setEditScheduleData] = useState<Partial<ScheduleItem>>({});
  const [scheduleeDatePickerOpen, setScheduleDatePickerOpen] = useState(false);
  const [scheduleCalendarMonth, setScheduleCalendarMonth] = useState<{ year: number; month: number }>({ year: new Date().getFullYear(), month: new Date().getMonth() });
  const {
    goToPreviousMonth: goToPreviousScheduleMonth,
    goToNextMonth: goToNextScheduleMonth,
    showLeftArrow: scheduleShowLeftArrow,
    showRightArrow: scheduleShowRightArrow,
    dragOffset: scheduleDragOffset,
    dragDirection: scheduleDragDirection,
    isSnappingBack: scheduleIsSnappingBack,
    calendarNavigationProps: scheduleCalendarNavigationProps,
  } = useCalendarNavigation(setScheduleCalendarMonth);
  const [draggedScheduleId, setDraggedScheduleId] = useState<string | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);
  const [touchDraggedScheduleId, setTouchDraggedScheduleId] = useState<string | null>(null);
  const [calendarCategoryFilter, setCalendarCategoryFilter] = useState<string[]>(() => {
    const saved = localStorage.getItem('calendarCategoryFilter');
    return saved ? JSON.parse(saved) : ['transportation', 'hotel'];
  });

  // Save filter to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('calendarCategoryFilter', JSON.stringify(calendarCategoryFilter));
  }, [calendarCategoryFilter]);

  const CATEGORIES = [
    { id: 'transportation', label: t('Transportation'), color: 'bg-orange-100 border-orange-300 text-orange-900' },
    { id: 'hotel', label: t('Hotel'), color: 'bg-blue-100 border-blue-300 text-blue-900' },
    { id: 'food', label: t('Food'), color: 'bg-green-100 border-green-300 text-green-900' },
    { id: 'shopping', label: t('Shopping'), color: 'bg-pink-100 border-pink-300 text-pink-900' },
    { id: 'attraction', label: t('Attraction'), color: 'bg-purple-100 border-purple-300 text-purple-900' },
    { id: 'other', label: t('Other'), color: 'bg-gray-100 border-gray-300 text-gray-900' },
  ];

  const toggleCategoryFilter = (categoryId: string) => {
    setCalendarCategoryFilter(prev => 
      prev.includes(categoryId) 
        ? prev.filter(c => c !== categoryId)
        : [...prev, categoryId]
    );
  };
  const [touchDragPosition, setTouchDragPosition] = useState<{ x: number; y: number } | null>(null);
  const [touchDraggedSchedule, setTouchDraggedSchedule] = useState<ScheduleItem | null>(null);

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

  const getSchedulesByCategoryFilter = (date: string) => {
    return getSchedulesByDate(date).filter(
      s => calendarCategoryFilter.includes(s.category)
    );
  };

  const getTimeWithAMPM = (time: string): string => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const displayHour = hour % 12 || 12;
    const ampm = hour >= 12 ? 'PM' : 'AM';
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getDestinationForDate = (date: string): string => {
    if (!currentTrip) return '';
    const segment = currentTrip.destinations?.find(seg => 
      date >= seg.startDate && date <= seg.endDate
    );
    return segment?.name || currentTrip.destination;
  };

  const getWeeksInRange = (start: string, end: string): (string | null)[][] => {
    const dates = getDatesInRange(start, end);
    const weeks: (string | null)[][] = [];
    
    if (dates.length === 0) return weeks;
    
    // Get the day of week for the first date (0 = Sunday, 6 = Saturday)
    const firstDate = new Date(dates[0] + 'T00:00:00');
    const firstDayOfWeek = firstDate.getDay();
    
    // Create first week with null values before the first date
    let currentWeek: (string | null)[] = Array(firstDayOfWeek).fill(null);
    
    dates.forEach(date => {
      // If we've filled 7 days, start a new week
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
      currentWeek.push(date);
    });
    
    // Fill the last week with nulls to complete 7 days
    while (currentWeek.length < 7) {
      currentWeek.push(null);
    }
    if (currentWeek.length > 0) {
      weeks.push(currentWeek);
    }
    
    return weeks;
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

  const openDatePicker = (type: 'segment' | 'trip', index: number, field: 'start' | 'end') => {
    setSelectedStartDate(null);
    setDatePickerContext({ type, index, field: field === 'start' ? 'start' : 'end' });
    
    // Determine which date to use for calendar month navigation
    let dateToNavigateTo: string | undefined;
    if (type === 'segment' && editForm.destinations && editForm.destinations[index]) {
      dateToNavigateTo = field === 'start' ? editForm.destinations[index].startDate : editForm.destinations[index].endDate;
    } else if (type === 'trip') {
      dateToNavigateTo = field === 'start' ? editForm.startDate : editForm.endDate;
    }
    
    // Navigate to the month of the date if it exists
    if (dateToNavigateTo) {
      const date = parseISO(dateToNavigateTo);
      setCalendarMonth({ year: date.getFullYear(), month: date.getMonth() });
    }
    
    setDatePickerOpen(true);
  };

  const handleDateSelect = (selectedDate: string) => {
    if (!datePickerContext) return;

    // If user clicked on the end date field, just save the end date and close
    if (datePickerContext.field === 'end') {
      if (datePickerContext.type === 'segment') {
        updateDestinationSegment(datePickerContext.index, 'endDate', selectedDate);
      } else {
        setEditForm({ ...editForm, endDate: selectedDate });
      }
      // Close the date picker immediately
      setDatePickerOpen(false);
      setDatePickerContext(null);
      setSelectedStartDate(null);
      setCalendarMonth({ year: new Date().getFullYear(), month: new Date().getMonth() });
      return;
    }

    // If this is the first date selection (start date), store it and wait for end date
    if (datePickerContext.field === 'start' && selectedStartDate === null) {
      setSelectedStartDate(selectedDate);
      // Update the field with the start date
      if (datePickerContext.type === 'segment') {
        updateDestinationSegment(datePickerContext.index, 'startDate', selectedDate);
      } else {
        setEditForm({ ...editForm, startDate: selectedDate });
      }
      return;
    }

    // If this is the end date selection (or second click on a date for range)
    const finalStartDate = selectedStartDate || (
      datePickerContext.type === 'segment' 
        ? editForm.destinations?.[datePickerContext.index]?.startDate
        : editForm.startDate
    );

    if (datePickerContext.type === 'segment') {
      const segments = [...(editForm.destinations || [])];
      // Determine which date is start and which is end
      const start = finalStartDate && finalStartDate < selectedDate ? finalStartDate : selectedDate;
      const end = finalStartDate && finalStartDate < selectedDate ? selectedDate : finalStartDate;
      
      segments[datePickerContext.index] = { 
        ...segments[datePickerContext.index], 
        startDate: start || finalStartDate || '',
        endDate: end || selectedDate || ''
      };
      setEditForm({ ...editForm, destinations: segments });
    } else {
      const start = finalStartDate && finalStartDate < selectedDate ? finalStartDate : selectedDate;
      const end = finalStartDate && finalStartDate < selectedDate ? selectedDate : finalStartDate;
      setEditForm({ ...editForm, startDate: start, endDate: end });
    }

    // Close the date picker after selecting end date
    setDatePickerOpen(false);
    setDatePickerContext(null);
    setSelectedStartDate(null);
  };

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const isDateInRange = (year: number, month: number, day: number, startDate: string, endDate: string): boolean => {
    if (!startDate || !endDate) return true;
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return dateStr >= startDate && dateStr <= endDate;
  };

  const getCalendarDays = () => {
    const firstDay = new Date(calendarMonth.year, calendarMonth.month, 1).getDay();
    const daysInMonth = getDaysInMonth(calendarMonth.year, calendarMonth.month);
    
    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  };

  const getScheduleCalendarDays = () => {
    const firstDay = new Date(scheduleCalendarMonth.year, scheduleCalendarMonth.month, 1).getDay();
    const daysInMonth = getDaysInMonth(scheduleCalendarMonth.year, scheduleCalendarMonth.month);
    
    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  };

  const openAddScheduleModal = (date: string, category: 'hotel' | 'transportation' | 'food' | 'shopping' | 'attraction' | 'other') => {
    setAddScheduleModal({ open: true, date, category });
    setScheduleFormData({
      date,
      timeFrom: '',
      timeTo: '',
      location: '',
      category,
    });
  };

  const handleAddSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTrip || !scheduleFormData.date || !scheduleFormData.timeFrom || !scheduleFormData.location) return;

    const newSchedule: ScheduleItem = {
      id: generateId(),
      tripId: currentTrip.id,
      date: scheduleFormData.date,
      timeFrom: scheduleFormData.timeFrom,
      timeTo: scheduleFormData.timeTo || '',
      location: scheduleFormData.location,
      category: scheduleFormData.category as ScheduleItem['category'],
      googleMapsLink: scheduleFormData.googleMapsLink || '',
    };

    scheduleStorage.save(newSchedule);
    
    // Reload schedules
    const items = scheduleStorage.getAll(currentTrip.id);
    setSchedules(items);
    
    // Close modal and reset form
    setAddScheduleModal({ open: false, date: '', category: null });
    setAddMenuOpen(null);
    setScheduleFormData({
      date: '',
      timeFrom: '',
      timeTo: '',
      location: '',
      category: 'hotel',
      googleMapsLink: '',
    });
  };

  const handleDeleteSchedule = (scheduleId: string) => {
    if (confirm('Delete this schedule?')) {
      scheduleStorage.delete(scheduleId);
      const items = scheduleStorage.getAll(currentTrip?.id || '');
      setSchedules(items);
      setHoveredScheduleId(null);
    }
  };

  const openEditScheduleModal = (schedule: ScheduleItem) => {
    setEditingScheduleId(schedule.id);
    setEditScheduleData(schedule);
  };

  const handleSaveEditSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingScheduleId || !editScheduleData.timeFrom || !editScheduleData.location) return;

    const updatedSchedule: ScheduleItem = {
      ...editScheduleData,
      timeFrom: editScheduleData.timeFrom,
      timeTo: editScheduleData.timeTo || '',
      location: editScheduleData.location,
      category: editScheduleData.category as ScheduleItem['category'],
      googleMapsLink: editScheduleData.googleMapsLink || '',
    } as ScheduleItem;

    scheduleStorage.save(updatedSchedule);
    const items = scheduleStorage.getAll(currentTrip?.id || '');
    setSchedules(items);
    setEditingScheduleId(null);
    setEditScheduleData({});
  };

  const openScheduleDatePicker = () => {
    if (editScheduleData.date) {
      const date = parseISO(editScheduleData.date);
      setScheduleCalendarMonth({ year: date.getFullYear(), month: date.getMonth() });
    }
    setScheduleDatePickerOpen(true);
  };

  const handleScheduleDateSelect = (selectedDate: string) => {
    setEditScheduleData({ ...editScheduleData, date: selectedDate });
    setScheduleDatePickerOpen(false);
    setScheduleCalendarMonth({ year: new Date().getFullYear(), month: new Date().getMonth() });
  };

  const handleScheduleDrop = (targetDate: string) => {
    if (!draggedScheduleId || !currentTrip) return;

    const draggedSchedule = schedules.find(s => s.id === draggedScheduleId);
    if (!draggedSchedule) return;

    const updatedSchedule: ScheduleItem = {
      ...draggedSchedule,
      date: targetDate,
    };

    scheduleStorage.save(updatedSchedule);
    const items = scheduleStorage.getAll(currentTrip.id);
    setSchedules(items);
    setDraggedScheduleId(null);
    setDragOverDate(null);
  };

  const handleTouchStart = (schedule: ScheduleItem, e: React.TouchEvent) => {
    e.stopPropagation();
    const touch = e.touches[0];
    setTouchDraggedScheduleId(schedule.id);
    setTouchDraggedSchedule(schedule);
    setTouchDragPosition({ x: touch.clientX, y: touch.clientY });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchDraggedScheduleId) {
      const touch = e.touches[0];
      setTouchDragPosition({ x: touch.clientX, y: touch.clientY });
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.stopPropagation();
    if (!touchDraggedScheduleId || !currentTrip) {
      setTouchDraggedScheduleId(null);
      setTouchDragPosition(null);
      setTouchDraggedSchedule(null);
      return;
    }

    const touch = e.changedTouches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    
    // Find the date cell that contains the target element
    let dateCellElement = element;
    while (dateCellElement && !dateCellElement.getAttribute('data-date')) {
      dateCellElement = dateCellElement.parentElement;
    }

    if (!dateCellElement) {
      setTouchDraggedScheduleId(null);
      setTouchDragPosition(null);
      setTouchDraggedSchedule(null);
      return;
    }

    const targetDate = dateCellElement.getAttribute('data-date');
    if (!targetDate) {
      setTouchDraggedScheduleId(null);
      setTouchDragPosition(null);
      setTouchDraggedSchedule(null);
      return;
    }

    const draggedSchedule = schedules.find(s => s.id === touchDraggedScheduleId);
    if (!draggedSchedule) {
      setTouchDraggedScheduleId(null);
      setTouchDragPosition(null);
      setTouchDraggedSchedule(null);
      return;
    }

    const updatedSchedule: ScheduleItem = {
      ...draggedSchedule,
      date: targetDate,
    };

    scheduleStorage.save(updatedSchedule);
    const items = scheduleStorage.getAll(currentTrip.id);
    setSchedules(items);
    setTouchDraggedScheduleId(null);
    setTouchDragPosition(null);
    setTouchDraggedSchedule(null);
  };

  const openMenu = (date: string) => {
    if (menuCloseTimeout) {
      clearTimeout(menuCloseTimeout);
      setMenuCloseTimeout(null);
    }
    setAddMenuOpen(date);
  };

  const closeMenuWithDelay = () => {
    const timeout = setTimeout(() => {
      setAddMenuOpen(null);
    }, 300);
    setMenuCloseTimeout(timeout);
  };

  if (!currentTrip) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <MapPin className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">{t('No Trip Selected')}</h2>
          <p className="text-gray-500">{t('Create a new trip to get started')}</p>
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
        <div className="relative">
          <div className="flex justify-between items-start">
            <div className="flex-1 pr-24">
              <h1 className="text-2xl sm:text-3xl font-bold mb-2">{currentTrip.name}</h1>
              <div className={`flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 ${themeConfig.text}`}>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 flex-shrink-0" />
                  <span>
                    {currentTrip.destinations && currentTrip.destinations.length > 0 
                      ? currentTrip.destinations.map(d => d.name).join(' → ')
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
            
            {/* Action buttons */}
            <div className="absolute top-0 right-0 flex items-center gap-1">
              <button
                onClick={() => {
                  const userId = auth.currentUser?.uid;
                  if (!userId) return;
                  const favorites = currentTrip.favorite || {};
                  const newFavorites = { ...favorites, [userId]: !favorites[userId] };
                  const updatedTrip: Trip = { ...currentTrip, favorite: newFavorites };
                  tripStorage.save(updatedTrip);
                  if (onUpdateTrip) onUpdateTrip(updatedTrip);
                }}
                className={`p-2 rounded-full hover:bg-white/30 active:bg-white/40 transition-all shadow-lg ${themeConfig.text} hover:text-white flex items-center justify-center bg-white/10`}
                aria-label={currentTrip.favorite?.[auth.currentUser?.uid || ''] ? 'Remove from favorites' : 'Add to favorites'}
                title={currentTrip.favorite?.[auth.currentUser?.uid || ''] ? 'Remove from favorites' : 'Add to favorites'}
              >
                <Star className={`w-6 h-6 ${currentTrip.favorite?.[auth.currentUser?.uid || ''] ? 'fill-yellow-400 text-yellow-400' : ''}`} />
              </button>
              {onShareTrip && (
                <button
                  onClick={() => onShareTrip(currentTrip)}
                  className={`p-2 rounded-full hover:bg-white/30 active:bg-white/40 transition-all shadow-lg ${themeConfig.text} hover:text-white flex items-center justify-center bg-white/10`}
                  aria-label="Share trip"
                  title="Share trip"
                >
                  <Users className="w-6 h-6" />
                </button>
              )}
              <button
                onClick={startEditing}
                className={`p-2 rounded-full hover:bg-white/30 active:bg-white/40 transition-all shadow-lg ${themeConfig.text} hover:text-white flex items-center justify-center bg-white/10`}
                aria-label="Edit trip"
              >
                <Edit2 className="w-6 h-6" />
              </button>
            </div>
          </div>
          
          {/* View Mode Toggle */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'list' 
                  ? 'bg-white/30 text-white' 
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              <List className="w-4 h-4" />
              <span className="hidden sm:inline">{t('List')}</span>
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'calendar' 
                  ? 'bg-white/30 text-white' 
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              <Grid3x3 className="w-4 h-4" />
              <span className="hidden sm:inline">{t('Calendar')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Daily Itinerary & Weather */}
      {viewMode === 'list' && (
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
                      {t('Loading weather...')}
                    </div>
                  )}
                  {daySchedules.length === 0 ? (
                    <p className="text-gray-400 text-sm italic">{t('No activities planned for this day')}</p>
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
      )}

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <div className="space-y-4 overflow-visible">
          {/* Category Filter */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
            <div className="text-xs font-medium text-gray-600 mb-2">{t('Show categories')}:</div>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => toggleCategoryFilter(cat.id)}
                  className={`px-2 py-1 rounded-md text-xs font-medium border transition-colors ${
                    calendarCategoryFilter.includes(cat.id)
                      ? cat.color + ' border-2'
                      : 'bg-gray-50 border border-gray-200 text-gray-400'
                  }`}
                >
                  {calendarCategoryFilter.includes(cat.id) ? '✓ ' : ''}{cat.label}
                </button>
              ))}
            </div>
          </div>
          {getWeeksInRange(currentTrip.startDate, currentTrip.endDate).map((week, weekIndex) => (
            <div key={weekIndex} className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-7 gap-0">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((dayName) => (
                  <div key={dayName} className="border-b border-gray-200 hidden md:block">
                    <div className="bg-purple-50 border-b border-purple-100 p-1 text-center text-xs font-semibold text-gray-700">
                      {dayName}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-7 gap-0">
                {week.map((date, dayIndex) => {
                  const isToday = date && date === new Date().toLocaleDateString('en-CA');
                  
                  if (!date) {
                    return (
                      <div
                        key={`empty-${dayIndex}`}
                        className="hidden md:block border-r border-gray-200 last:border-r-0 border-b md:border-b-0 bg-gray-50 min-h-32 md:min-h-40 p-2 md:p-1"
                      />
                    );
                  }
                  
                  const items = getSchedulesByCategoryFilter(date);
                  const destination = getDestinationForDate(date);
                  
                  return (
                    <div
                      key={date}
                      data-date={date}
                      onMouseEnter={() => setHoveredDate(date)}
                      onMouseLeave={() => setHoveredDate(null)}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOverDate(date);
                      }}
                      onDragLeave={() => setDragOverDate(null)}
                      onDrop={() => {
                        handleScheduleDrop(date);
                        setDragOverDate(null);
                      }}
                      onTouchEnd={handleTouchEnd}
                      className={`border-r border-gray-200 last:border-r-0 border-b md:border-b-0 min-h-32 md:min-h-40 p-2 md:p-1 text-xs relative group overflow-visible ${
                        isToday ? 'bg-purple-50' : dayIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                      } ${(dragOverDate === date && draggedScheduleId) || (touchDraggedScheduleId && true) ? 'bg-purple-100 ring-2 ring-purple-400' : ''}`}
                    >
                      <div className={`font-semibold mb-1 text-sm md:text-xs ${isToday ? 'text-purple-700' : 'text-gray-900'}`}>
                        <div className="md:hidden">
                          {format(parseISO(date), 'EEE dd')}
                        </div>
                        <div className="hidden md:block">
                          {format(parseISO(date), 'dd')}
                        </div>
                      </div>
                      
                      <div className="text-xs text-purple-600 font-medium mb-1">
                        {destination}
                      </div>
                      
                      {/* Hover button */}
                      {hoveredDate === date && currentTrip && (
                        <div className="absolute top-2 right-2">
                          <div 
                            className="relative"
                            onMouseEnter={() => {
                              if (menuCloseTimeout) {
                                clearTimeout(menuCloseTimeout);
                                setMenuCloseTimeout(null);
                              }
                            }}
                            onMouseLeave={closeMenuWithDelay}
                          >
                            <button
                              ref={(el) => { addMenuButtonRef.current[date] = el; }}
                              onClick={() => {
                                if (addMenuOpen === date) {
                                  setAddMenuOpen(null);
                                } else {
                                  setAddMenuOpen(date);
                                  // Get button position
                                  const btn = addMenuButtonRef.current[date];
                                  if (btn) {
                                    const rect = btn.getBoundingClientRect();
                                    setMenuPosition({ top: rect.bottom + 8, left: rect.left + rect.width / 2 });
                                  }
                                }
                              }}
                              className="bg-purple-400 text-white rounded-full p-1 hover:bg-purple-500 transition-colors shadow-md w-6 h-6 flex items-center justify-center text-sm font-bold"
                              title="Add schedule"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      )}
                      
                      <div className="space-y-1">
                        {items.map(item => (
                          <div 
                            key={item.id}
                            draggable
                            onDragStart={() => setDraggedScheduleId(item.id)}
                            onDragEnd={() => setDraggedScheduleId(null)}
                            onTouchStart={(e) => handleTouchStart(item, e)}
                            onTouchMove={handleTouchMove}
                            onMouseEnter={() => setHoveredScheduleId(item.id)}
                            onMouseLeave={() => setHoveredScheduleId(null)}
                            className={`rounded px-1.5 py-1 border relative group cursor-move select-none ${
                              item.category === 'hotel' 
                                ? 'bg-blue-100 border-blue-300' 
                                : item.category === 'transportation'
                                  ? 'bg-orange-100 border-orange-300'
                                  : item.category === 'food'
                                    ? 'bg-green-100 border-green-300'
                                    : item.category === 'shopping'
                                      ? 'bg-pink-100 border-pink-300'
                                      : item.category === 'attraction'
                                        ? 'bg-purple-100 border-purple-300'
                                        : 'bg-gray-100 border-gray-300'
                            } ${draggedScheduleId === item.id || touchDraggedScheduleId === item.id ? 'opacity-50' : ''}`}
                            style={{ touchAction: 'none' }}
                          >
                            <div className={`font-medium text-xs md:truncate pr-4 ${
                              item.category === 'hotel' 
                                ? 'text-blue-900' 
                                : item.category === 'transportation'
                                  ? 'text-orange-900'
                                  : item.category === 'food'
                                    ? 'text-green-900'
                                    : item.category === 'shopping'
                                      ? 'text-pink-900'
                                      : item.category === 'attraction'
                                        ? 'text-purple-900'
                                        : 'text-gray-900'
                            }`}>
                              {item.location}
                            </div>
                            <div className={`text-xs ${
                              item.category === 'hotel' 
                                ? 'text-blue-700' 
                                : item.category === 'transportation'
                                  ? 'text-orange-700'
                                  : item.category === 'food'
                                    ? 'text-green-700'
                                    : item.category === 'shopping'
                                      ? 'text-pink-700'
                                      : item.category === 'attraction'
                                        ? 'text-purple-700'
                                        : 'text-gray-700'
                            }`}>
                              {getTimeWithAMPM(item.timeFrom)}
                            </div>
                            
                            {/* Edit and Delete buttons on hover */}
                            {hoveredScheduleId === item.id && (
                              <div className="absolute top-0 right-0 flex gap-1">
                                <button
                                  onClick={() => openEditScheduleModal(item)}
                                  className="text-blue-500 hover:text-blue-700 transition-colors p-0.5"
                                  title="Edit schedule"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => handleDeleteSchedule(item.id)}
                                  className="text-red-500 hover:text-red-700 transition-colors p-0.5"
                                  title="Delete schedule"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {dates.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <p>{t('No dates configured for this trip')}</p>
        </div>
      )}

      {/* Edit Trip Modal */}
      {isEditing && (
        <div className="fixed inset-0 bg-gray-400/30 flex items-center justify-center z-50 p-4" onClick={() => setIsEditing(false)}>
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold">{t('Edit Trip')}</h3>
              <button onClick={() => setIsEditing(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('Trip Name')}</label>
                <input
                  type="text"
                  required
                  value={editForm.name || ''}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('Destinations')}</label>
                <div className="space-y-4 mb-4">
                  {(editForm.destinations || []).map((segment, index) => (
                    <div key={segment.id} className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="text-sm font-medium text-gray-700">{t('Segment')} {index + 1}</h4>
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
                          <label className="block text-xs font-medium text-gray-600 mb-1">{t('Destination Name')}</label>
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
                            <label className="block text-xs font-medium text-gray-600 mb-1">{t('Start Date')}</label>
                            <button
                              type="button"
                              onClick={() => openDatePicker('segment', index, 'start')}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent text-sm text-left bg-white hover:bg-gray-50 transition-colors text-gray-900"
                            >
                              {segment.startDate ? format(parseISO(segment.startDate), 'MMM dd, yyyy') : 'Select date'}
                            </button>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">{t('End Date')}</label>
                            <button
                              type="button"
                              onClick={() => openDatePicker('segment', index, 'end')}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent text-sm text-left bg-white hover:bg-gray-50 transition-colors text-gray-900"
                            >
                              {segment.endDate ? format(parseISO(segment.endDate), 'MMM dd, yyyy') : 'Select date'}
                            </button>
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
                    <span className="text-sm font-medium">{t('Add Destination Segment')}</span>
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {t('Add multiple destinations for different parts of your trip. Weather will be fetched for each segment.')}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('Start Date')}</label>
                  <button
                    type="button"
                    onClick={() => openDatePicker('trip', 0, 'start')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent text-left bg-white hover:bg-gray-50 transition-colors text-gray-900"
                  >
                    {editForm.startDate ? format(parseISO(editForm.startDate), 'MMM dd, yyyy') : 'Select date'}
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('End Date')}</label>
                  <button
                    type="button"
                    onClick={() => openDatePicker('trip', 0, 'end')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent text-left bg-white hover:bg-gray-50 transition-colors text-gray-900"
                  >
                    {editForm.endDate ? format(parseISO(editForm.endDate), 'MMM dd, yyyy') : 'Select date'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('Banner Color')}</label>
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
                    {t('Click to choose a custom color for your trip banner')}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('Cover Photo URL')}</label>
                <div className="space-y-2">
                  {editForm.coverPhoto && (
                    <div className="relative w-full h-32 rounded-lg overflow-hidden border border-gray-200">
                      <img src={editForm.coverPhoto} alt="Cover" className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
                    </div>
                  )}
                  <input
                    type="url"
                    value={editForm.coverPhoto || ''}
                    onChange={(e) => setEditForm({ ...editForm, coverPhoto: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent text-sm"
                    placeholder="https://example.com/photo.jpg"
                  />
                  <p className="text-xs text-gray-400">{t('This photo will appear on the trip card in the landing page.')}</p>
                </div>
              </div>

              {/* Date Range Picker Modal */}
              {datePickerOpen && datePickerContext && (
                <div className="fixed inset-0 bg-gray-400/30 flex items-center justify-center z-50 p-4" onClick={() => { setDatePickerOpen(false); setDatePickerContext(null); setSelectedStartDate(null); setCalendarMonth({ year: new Date().getFullYear(), month: new Date().getMonth() }); }}>
                  <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
                    <CalendarPicker
                      calendarMonth={calendarMonth}
                      selectedDate={selectedStartDate || undefined}
                      minDate={datePickerContext.type === 'segment' ? (editForm.startDate || undefined) : undefined}
                      maxDate={datePickerContext.type === 'segment' ? (editForm.endDate || undefined) : undefined}
                      dragOffset={dragOffset}
                      dragDirection={dragDirection}
                      isSnappingBack={isSnappingBack}
                      showLeftArrow={showLeftArrow}
                      showRightArrow={showRightArrow}
                      onPreviousMonth={goToPreviousMonth}
                      onNextMonth={goToNextMonth}
                      onSelectDate={handleDateSelect}
                      calendarNavigationProps={calendarNavigationProps}
                      header={
                        <div className="mb-4">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {datePickerContext.field === 'end'
                              ? t('Select End Date')
                              : (selectedStartDate === null ? t('Select Start Date') : t('Select End Date'))
                            }
                          </h3>
                          {selectedStartDate && (
                            <p className="text-sm text-gray-600 mt-2">
                              Start: {format(parseISO(selectedStartDate), 'MMM dd, yyyy')}
                            </p>
                          )}
                        </div>
                      }
                      footer={
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => { setDatePickerOpen(false); setDatePickerContext(null); setSelectedStartDate(null); setCalendarMonth({ year: new Date().getFullYear(), month: new Date().getMonth() }); }}
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

              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleSaveTrip}
                  className={`flex-1 px-4 py-2 text-white rounded-lg hover:opacity-90 transition-opacity ${
                    !editForm.themeColor?.startsWith('#') ? `bg-gradient-to-r ${editForm.themeColor || 'from-purple-400 to-purple-600'}` : ''
                  }`}
                  style={editForm.themeColor?.startsWith('#') ? { background: editForm.themeColor } : {}}
                >
                  {t('Save Changes')}
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  {t('Cancel')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Schedule Modal */}
      {addScheduleModal.open && (
        <div className="fixed inset-0 bg-gray-400/30 flex items-center justify-center z-50 p-4" onClick={() => setAddScheduleModal({ open: false, date: '', category: null })}>
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold">
                {t('Add')} {addScheduleModal.category ? CATEGORIES.find(c => c.id === addScheduleModal.category)?.label || addScheduleModal.category : ''}
              </h3>
              <button 
                onClick={() => setAddScheduleModal({ open: false, date: '', category: null })} 
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddSchedule} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('Date')}</label>
                <div className="px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600">
                  {format(parseISO(scheduleFormData.date || ''), 'EEEE, MMMM dd, yyyy')}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('Location')}</label>
                <input
                  type="text"
                  required
                  value={scheduleFormData.location || ''}
                  onChange={(e) => setScheduleFormData({ ...scheduleFormData, location: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                  placeholder="e.g., Hilton Hotel, Tokyo Station"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('Start Time')}</label>
                  <input
                    type="time"
                    required
                    value={scheduleFormData.timeFrom || ''}
                    onChange={(e) => setScheduleFormData({ ...scheduleFormData, timeFrom: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent text-gray-800 placeholder:text-gray-300"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('End Time (optional)')}</label>
                  <input
                    type="time"
                    value={scheduleFormData.timeTo || ''}
                    onChange={(e) => setScheduleFormData({ ...scheduleFormData, timeTo: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent text-gray-600 placeholder:text-gray-300"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('Google Maps Link (optional)')}</label>
                <input
                  type="url"
                  value={scheduleFormData.googleMapsLink || ''}
                  onChange={(e) => setScheduleFormData({ ...scheduleFormData, googleMapsLink: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                  placeholder="https://maps.google.com/..."
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-purple-400 text-white rounded-lg hover:bg-purple-500 transition-colors"
                >
                  {t('Add')}
                </button>
                <button
                  type="button"
                  onClick={() => setAddScheduleModal({ open: false, date: '', category: null })}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  {t('Cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Schedule Modal */}
      {editingScheduleId && (
        <div className="fixed inset-0 bg-gray-400/30 flex items-center justify-center z-50 p-4" onClick={() => setEditingScheduleId(null)}>
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold">
                {t('Edit Trip')} — {editScheduleData.category === 'hotel' ? t('Hotel') : t('Transportation')}
              </h3>
              <button 
                onClick={() => setEditingScheduleId(null)} 
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveEditSchedule} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <button
                  type="button"
                  onClick={openScheduleDatePicker}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent text-left bg-white hover:bg-gray-50 transition-colors text-gray-900"
                >
                  {editScheduleData.date ? format(parseISO(editScheduleData.date), 'EEEE, MMMM dd, yyyy') : 'Select date'}
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input
                  type="text"
                  required
                  value={editScheduleData.location || ''}
                  onChange={(e) => setEditScheduleData({ ...editScheduleData, location: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                  placeholder="e.g., Hilton Hotel, Tokyo Station"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                  <input
                    type="time"
                    required
                    value={editScheduleData.timeFrom || ''}
                    onChange={(e) => setEditScheduleData({ ...editScheduleData, timeFrom: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent text-gray-600 placeholder:text-gray-300"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Time (optional)</label>
                  <input
                    type="time"
                    value={editScheduleData.timeTo || ''}
                    onChange={(e) => setEditScheduleData({ ...editScheduleData, timeTo: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent text-gray-600 placeholder:text-gray-300"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Google Maps Link (optional)</label>
                <input
                  type="url"
                  value={editScheduleData.googleMapsLink || ''}
                  onChange={(e) => setEditScheduleData({ ...editScheduleData, googleMapsLink: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                  placeholder="https://maps.google.com/..."
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-purple-400 text-white rounded-lg hover:bg-purple-500 transition-colors"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setEditingScheduleId(null)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Schedule Date Picker Modal */}
      {scheduleeDatePickerOpen && (
        <div className="fixed inset-0 bg-gray-400/30 flex items-center justify-center z-50 p-4" onClick={() => { setScheduleDatePickerOpen(false); setScheduleCalendarMonth({ year: new Date().getFullYear(), month: new Date().getMonth() }); }}>
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <CalendarPicker
              calendarMonth={scheduleCalendarMonth}
              selectedDate={editScheduleData.date || undefined}
              minDate={currentTrip?.startDate}
              maxDate={currentTrip?.endDate}
              dragOffset={scheduleDragOffset}
              dragDirection={scheduleDragDirection}
              isSnappingBack={scheduleIsSnappingBack}
              showLeftArrow={scheduleShowLeftArrow}
              showRightArrow={scheduleShowRightArrow}
              onPreviousMonth={goToPreviousScheduleMonth}
              onNextMonth={goToNextScheduleMonth}
              onSelectDate={handleScheduleDateSelect}
              calendarNavigationProps={scheduleCalendarNavigationProps}
              header={<div className="mb-4"><h3 className="text-lg font-semibold text-gray-900">{t('Select Date')}</h3></div>}
              footer={
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setScheduleDatePickerOpen(false); setScheduleCalendarMonth({ year: new Date().getFullYear(), month: new Date().getMonth() }); }}
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

      {/* Touch Drag Ghost Element */}
      {touchDraggedSchedule && touchDragPosition && (
        <div
          className={`fixed pointer-events-none z-50 rounded px-1.5 py-1 border shadow-lg ${
            touchDraggedSchedule.category === 'hotel' 
              ? 'bg-blue-100 border-blue-300' 
              : 'bg-orange-100 border-orange-300'
          }`}
          style={{
            left: `${touchDragPosition.x}px`,
            top: `${touchDragPosition.y}px`,
            transform: 'translate(-50%, -50%)',
            maxWidth: '200px',
          }}
        >
          <div className={`font-medium text-xs whitespace-nowrap overflow-hidden text-ellipsis ${
            touchDraggedSchedule.category === 'hotel' 
              ? 'text-blue-900' 
              : 'text-orange-900'
          }`}>
            {touchDraggedSchedule.location}
          </div>
          <div className={`text-xs ${
            touchDraggedSchedule.category === 'hotel' 
              ? 'text-blue-700' 
              : 'text-orange-700'
          }`}>
            {getTimeWithAMPM(touchDraggedSchedule.timeFrom)}
          </div>
        </div>
      )}

      {/* Global Dropdown - rendered at root level */}
      {addMenuOpen && menuPosition && (
        <div 
          className="fixed bg-white border border-gray-300 rounded-lg shadow-lg z-[9999] min-w-32 w-fit max-w-40"
          style={{ 
            top: menuPosition.top, 
            left: menuPosition.left, 
            transform: 'translateX(-50%)' 
          }}
          onMouseEnter={() => {
            if (menuCloseTimeout) {
              clearTimeout(menuCloseTimeout);
              setMenuCloseTimeout(null);
            }
          }}
          onMouseLeave={() => {
            closeMenuWithDelay();
          }}
        >
          {CATEGORIES.map((cat, idx) => {
            const hoverBg: Record<string, string> = {
              transportation: 'hover:bg-orange-50',
              hotel: 'hover:bg-blue-50',
              food: 'hover:bg-green-50',
              shopping: 'hover:bg-pink-50',
              attraction: 'hover:bg-purple-50',
              other: 'hover:bg-gray-50',
            };
            return (
              <button
                key={cat.id}
                onClick={() => {
                  openAddScheduleModal(addMenuOpen, cat.id as 'hotel' | 'transportation' | 'food' | 'shopping' | 'attraction' | 'other');
                  setAddMenuOpen(null);
                }}
                className={`block w-full text-left px-4 py-2 text-sm text-gray-700 transition-colors ${
                  idx === 0 ? 'rounded-t-lg' : idx === CATEGORIES.length - 1 ? 'rounded-b-lg' : ''
                } ${hoverBg[cat.id] || 'hover:bg-gray-50'}`}
                style={{
                  borderBottom: idx < CATEGORIES.length - 1 ? '1px solid #e5e7eb' : 'none'
                }}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
