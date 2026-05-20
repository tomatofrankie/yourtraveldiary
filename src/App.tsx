import { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { Plane, Calendar, DollarSign, ShoppingBag, Info, Plus, ChevronDown, X, Download, Upload, Share2, RefreshCw, LogOut, FileSpreadsheet, Users, Menu, Settings, Globe, Lock, Eye, EyeOff } from 'lucide-react';
import { CalendarPicker } from './components/CalendarPicker';
import { Trip, DestinationSegment, ScheduleItem, Expense, TravelInfo as TravelInfoType } from './types';
import { tripStorage, scheduleStorage, expenseStorage, shoppingStorage, travelInfoStorage, generateId, syncFromFirestore, clearUserSessionData } from './utils/storage';
import { auth, db } from './utils/firebase';
import { Homepage } from './components/Homepage';
import { LandingPage } from './components/LandingPage';
import { TravelSchedule } from './components/TravelSchedule';
import { TravelExpenses } from './components/TravelExpenses';
import { ShoppingList } from './components/ShoppingList';
import { TravelInfo } from './components/TravelInfo';
import { LoginPage, isAuthenticated, logout } from './components/LoginPage';
import { TripSharingModal } from './components/TripSharingModal';
import InstallPrompt from './components/InstallPrompt';
import { AiAgent } from './components/AiAgent';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { useCalendarNavigation } from './utils/calendarNavigation';
import { useTranslation } from './utils/i18n';

type Tab = 'home' | 'schedule' | 'expenses' | 'shopping' | 'info';

const PRIVACY_TEXT_ZH_TW = `隱私政策

我們非常重視您的隱私。本應用程式將您的旅遊資料安全地儲存在 Firebase Firestore 中，僅供您的已驗證帳號存取。

• 我們不會將您的個人資料出售或分享給第三方。
• 行程資料（包括行程表、費用及旅遊資訊）儲存於您的使用者帳號下。
• 您可隨時透過刪除應用程式中的行程來移除您的資料。
• 我們使用 Firebase 驗證來管理安全登入。

最後更新：2026`;

const TERMS_TEXT_ZH_TW = `使用條款

使用「你的旅遊日記」即表示您同意以下條款：

• 本應用程式僅供個人旅遊規劃使用。
• 您須對所輸入資料的準確性負責。
• 我們對因網路問題導致的資料遺失概不負責。
• 請勿使用本應用程式儲存敏感的財務或法律文件。
• 我們保留隨時更新這些條款的權利。

最後更新：2026`;

const PRIVACY_TEXT = `Privacy Policy

We take your privacy seriously. This app stores your travel data securely in Firebase Firestore, accessible only to your authenticated account.

• We do not sell or share your personal data with third parties.
• Trip data including schedules, expenses, and travel info is stored under your user account.
• You may delete your data at any time by removing trips from the app.
• We use Firebase Authentication to manage secure login.

Last updated: 2026`;

const TERMS_TEXT = `Terms of Use

By using Your Travel Diary, you agree to the following terms:

• This app is provided for personal travel planning purposes.
• You are responsible for the accuracy of the data you enter.
• We are not liable for any loss of data due to connectivity issues.
• Do not use this app to store sensitive financial or legal documents.
• We reserve the right to update these terms at any time.

Last updated: 2026`;

function AppFooter() {
  const [modal, setModal] = useState<'privacy' | 'terms' | null>(null);
  const { t } = useTranslation();
  return (
    <>
      <footer className="border-t border-gray-200 px-4 py-3 bg-white">
        <div className="flex items-center justify-between gap-2 text-[10px] text-gray-400">
          <div className="flex items-center gap-1.5 font-semibold text-gray-700 flex-shrink-0">
            <div className="w-5 h-5 bg-gradient-to-br from-purple-300 to-purple-500 rounded-md flex items-center justify-center">
              <Plane className="w-3 h-3 text-white" />
            </div>
            <span className="hidden sm:inline">{t('Your Travel Diary')}</span>
          </div>
          <span className="truncate">© {new Date().getFullYear()} Your Travel Diary. All your adventures in one place.</span>
          <div className="flex gap-3 flex-shrink-0">
            <button onClick={() => setModal('privacy')} className="hover:text-gray-600">{t('Privacy')}</button>
            <button onClick={() => setModal('terms')} className="hover:text-gray-600">{t('Terms')}</button>
            <a href='https://www.threads.com/totototomato17' target="_blank" className="hover:text-gray-600 cursor-pointer">{t('Support')}</a>
          </div>
        </div>
      </footer>
      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">{modal === 'privacy' ? t('Privacy Policy') : t('Terms of Use')}</h3>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <pre className="p-4 text-xs text-gray-600 whitespace-pre-wrap font-sans leading-relaxed">
              {modal === 'privacy'
                ? (localStorage.getItem('appLanguage') === 'zh-TW' ? PRIVACY_TEXT_ZH_TW : PRIVACY_TEXT)
                : (localStorage.getItem('appLanguage') === 'zh-TW' ? TERMS_TEXT_ZH_TW : TERMS_TEXT)}
            </pre>
          </div>
        </div>
      )}
    </>
  );
}

export function App() {
  const { t } = useTranslation();
  const [loggedIn, setLoggedIn] = useState<boolean>(isAuthenticated());
  const [authReady, setAuthReady] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [trips, setTrips] = useState<Trip[]>([]);
  const [currentTripId, setCurrentTripId] = useState<string | null>(null);
  const [showTripForm, setShowTripForm] = useState(false);
  const [showTripSelector, setShowTripSelector] = useState(false);
  const [showTripHome, setShowTripHome] = useState(false);
  const [showPastTrips, setShowPastTrips] = useState(false);
  const [sharingTrip, setSharingTrip] = useState<Trip | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showImportExport, setShowImportExport] = useState(false);
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(() => {
    const userPicked = localStorage.getItem('userPickedLanguage');
    const deviceLang = navigator.language || 'en';
    let detected = 'en';
    if (deviceLang.startsWith('zh-TW') || deviceLang.startsWith('zh-Hant')) detected = 'zh-TW';
    else if (deviceLang.startsWith('zh')) detected = 'zh-CN';
    else if (deviceLang.startsWith('ja')) detected = 'ja';
    else if (deviceLang.startsWith('ko')) detected = 'ko';
    // Use user's manual pick if set, otherwise always use device language
    const lang = userPicked || detected;
    localStorage.setItem('appLanguage', lang);
    document.documentElement.lang = lang;
    return lang;
  });
  const [syncing, setSyncing] = useState(false);
  const [importingExcel, setImportingExcel] = useState(false);
  const isSyncingRef = useRef(false);
  const lastSyncTimeRef = useRef<number>(0);
  const MIN_SYNC_INTERVAL_MS = 5 * 60 * 1000;

  const triggerLanguageChangeWithRetry = (code: string, attempts = 20) => {
    const select = document.querySelector('.goog-te-combo') as HTMLSelectElement;
    if (select) {
      select.value = code;
      select.dispatchEvent(new Event('change'));
    } else if (attempts > 0) {
      setTimeout(() => triggerLanguageChangeWithRetry(code, attempts - 1), 300);
    }
  };

  // Google Translate is only loaded on demand when user picks a non-zh-TW language
  const loadGoogleTranslate = (code: string) => {
    if (!document.getElementById('google-translate-script')) {
      const script = document.createElement('script');
      script.id = 'google-translate-script';
      script.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
      document.body.appendChild(script);
      (window as any).googleTranslateElementInit = () => {
        new (window as any).google.translate.TranslateElement(
          { pageLanguage: 'en', includedLanguages: 'en,zh-CN,ja,ko', autoDisplay: false },
          'google_translate_element'
        );
        triggerLanguageChangeWithRetry(code);
      };
    } else {
      triggerLanguageChangeWithRetry(code);
    }
  };

  const [formData, setFormData] = useState<Partial<Trip>>({
    name: '',
    startDate: '',
    endDate: '',
    destination: '',
    coverPhoto: '',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);
  const tripSelectorRef = useRef<HTMLDivElement>(null);
  const shareSelectorRef = useRef<HTMLDivElement>(null);
  const settingsDropdownRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const [newTripDatePickerOpen, setNewTripDatePickerOpen] = useState(false);
  const [newTripCalendarMonth, setNewTripCalendarMonth] = useState<{ year: number; month: number }>({ year: new Date().getFullYear(), month: new Date().getMonth() });
  const [newTripSelectedStartDate, setNewTripSelectedStartDate] = useState<string | null>(null);
  const [newTripDatePickerContext, setNewTripDatePickerContext] = useState<{ type: 'trip' | 'segment'; index: number; field: 'start' | 'end' } | null>(null);
  const {
    goToPreviousMonth: goToPreviousNewTripMonth,
    goToNextMonth: goToNextNewTripMonth,
    showLeftArrow: newTripShowLeftArrow,
    showRightArrow: newTripShowRightArrow,
    dragOffset: newTripDragOffset,
    dragDirection: newTripDragDirection,
    isSnappingBack: newTripIsSnappingBack,
    calendarNavigationProps: newTripCalendarNavigationProps,
  } = useCalendarNavigation(setNewTripCalendarMonth);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (tripSelectorRef.current && !tripSelectorRef.current.contains(target)) {
        setShowTripSelector(false);
      }
      if (shareSelectorRef.current && !shareSelectorRef.current.contains(target)) {
        setShowImportExport(false);
      }
      if (settingsDropdownRef.current && !settingsDropdownRef.current.contains(target)) {
        setShowSettingsDropdown(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(target)) {
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  // Auto-sync when app comes back to focus
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        clearUserSessionData();
        setTrips([]);
        setCurrentTripId(null);
        setLoggedIn(false);
        setAuthReady(true);
        return;
      }

      setLoggedIn(true);

      // Show UI immediately from localStorage, then sync in background
      loadTrips();
      const savedTripId = tripStorage.getCurrent();
      if (savedTripId) setCurrentTripId(savedTripId);
      setAuthReady(true);

      // Background sync
      if (isSyncingRef.current) return;
      isSyncingRef.current = true;
      setSyncing(true);
      try {
        await syncFromFirestore();
        loadTrips();
        lastSyncTimeRef.current = Date.now();
      } finally {
        setSyncing(false);
        isSyncingRef.current = false;
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && !isSyncingRef.current && auth.currentUser) {
        isSyncingRef.current = true;
        setSyncing(true);
        try {
          await syncFromFirestore();
          loadTrips();
        } finally {
          setSyncing(false);
          isSyncingRef.current = false;
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const loadTrips = () => {
    const allTrips = tripStorage.getAll();
    setTrips(allTrips);
  };

  const [newTripDestinations, setNewTripDestinations] = useState<DestinationSegment[]>([]);

  const addDestinationSegment = () => {
    const newSegment: DestinationSegment = {
      id: generateId(),
      name: '',
      startDate: formData.startDate || '',
      endDate: formData.endDate || '',
    };
    setNewTripDestinations([...newTripDestinations, newSegment]);
  };

  const updateDestinationSegment = (index: number, field: keyof DestinationSegment, value: string) => {
    const segments = [...newTripDestinations];
    segments[index] = { ...segments[index], [field]: value };
    setNewTripDestinations(segments);
  };

  const removeDestinationSegment = (index: number) => {
    const segments = [...newTripDestinations];
    segments.splice(index, 1);
    setNewTripDestinations(segments);
  };

  const handleCreateTrip = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Ensure we have at least one destination
    const destinations = newTripDestinations.length > 0 
      ? newTripDestinations 
      : [{ 
          id: generateId(), 
          name: formData.destination!, 
          startDate: formData.startDate!, 
          endDate: formData.endDate! 
        }];

    const newTrip: Trip = {
      id: generateId(),
      userId: auth.currentUser?.uid || '',
      name: formData.name!,
      startDate: formData.startDate!,
      endDate: formData.endDate!,
      destination: destinations[0].name,
      destinations: destinations,
      coverPhoto: formData.coverPhoto,
    };

    tripStorage.save(newTrip);
    tripStorage.setCurrent(newTrip.id);
    setCurrentTripId(newTrip.id);
    loadTrips();
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      startDate: '',
      endDate: '',
      destination: '',
      coverPhoto: '',
    });
    setNewTripDestinations([]);
    setShowTripForm(false);
    setNewTripDatePickerOpen(false);
    setNewTripDatePickerContext(null);
    setNewTripSelectedStartDate(null);
  };

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getNewTripCalendarDays = () => {
    const firstDay = new Date(newTripCalendarMonth.year, newTripCalendarMonth.month, 1).getDay();
    const daysInMonth = getDaysInMonth(newTripCalendarMonth.year, newTripCalendarMonth.month);
    
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  };

  const openNewTripDatePicker = (type: 'trip' | 'segment', index: number, field: 'start' | 'end') => {
    setNewTripSelectedStartDate(null);
    setNewTripDatePickerContext({ type, index, field });
    
    // Determine which date to use for calendar month navigation
    let dateToNavigateTo: string | undefined;
    if (type === 'segment' && newTripDestinations && newTripDestinations[index]) {
      dateToNavigateTo = field === 'start' ? newTripDestinations[index].startDate : newTripDestinations[index].endDate;
    } else if (type === 'trip') {
      dateToNavigateTo = field === 'start' ? formData.startDate : formData.endDate;
    }
    
    if (dateToNavigateTo) {
      const date = new Date(dateToNavigateTo);
      setNewTripCalendarMonth({ year: date.getFullYear(), month: date.getMonth() });
    } else {
      setNewTripCalendarMonth({ year: new Date().getFullYear(), month: new Date().getMonth() });
    }
    setNewTripDatePickerOpen(true);
  };

  const handleNewTripDateSelect = (selectedDate: string) => {
    if (!newTripDatePickerContext) return;

    // If user clicked on the end date field, validate and save
    if (newTripDatePickerContext.field === 'end') {
      // Get the start date
      const startDate = newTripSelectedStartDate || (
        newTripDatePickerContext.type === 'segment'
          ? newTripDestinations?.[newTripDatePickerContext.index]?.startDate
          : formData.startDate
      );

      // Validate that end date is after start date
      if (startDate && selectedDate < startDate) {
        alert('End date must be after or equal to start date');
        return;
      }

      if (newTripDatePickerContext.type === 'segment') {
        updateDestinationSegment(newTripDatePickerContext.index, 'endDate', selectedDate);
      } else {
        setFormData({ ...formData, endDate: selectedDate });
      }
      // Close the date picker immediately
      setNewTripDatePickerOpen(false);
      setNewTripDatePickerContext(null);
      setNewTripSelectedStartDate(null);
      setNewTripCalendarMonth({ year: new Date().getFullYear(), month: new Date().getMonth() });
      return;
    }

    // If this is the first date selection (start date), store it and wait for end date
    if (newTripDatePickerContext.field === 'start' && newTripSelectedStartDate === null) {
      setNewTripSelectedStartDate(selectedDate);
      // Update the field with the start date
      if (newTripDatePickerContext.type === 'segment') {
        updateDestinationSegment(newTripDatePickerContext.index, 'startDate', selectedDate);
      } else {
        setFormData({ ...formData, startDate: selectedDate });
      }
      // Switch to waiting for end date (show calendar for end date selection)
      setNewTripDatePickerContext(prev => prev ? { ...prev, field: 'end' } : null);
      return;
    }

    // If this is the end date selection (or second click on a date for range)
    const finalStartDate = newTripSelectedStartDate || (
      newTripDatePickerContext.type === 'segment' 
        ? newTripDestinations?.[newTripDatePickerContext.index]?.startDate
        : formData.startDate
    ) || selectedDate;

    const finalEndDate = selectedDate;

    // Ensure end date is not before start date
    if (finalEndDate < finalStartDate) {
      alert('End date must be after start date');
      return;
    }

    // Update the end date
    if (newTripDatePickerContext.type === 'segment') {
      updateDestinationSegment(newTripDatePickerContext.index, 'endDate', finalEndDate);
    } else {
      setFormData({ ...formData, endDate: finalEndDate });
    }

    // Close the date picker
    setNewTripDatePickerOpen(false);
    setNewTripDatePickerContext(null);
    setNewTripSelectedStartDate(null);
    setNewTripCalendarMonth({ year: new Date().getFullYear(), month: new Date().getMonth() });
  };

  const selectTrip = (tripId: string) => {
    setCurrentTripId(tripId);
    tripStorage.setCurrent(tripId);
    setShowTripSelector(false);
    setShowPastTrips(false);
  };

  const deleteTrip = (tripId: string) => {
    const trip = trips.find(t => t.id === tripId);
    const currentUserId = auth.currentUser?.uid;
    
    // Only trip owner can delete
    if (trip?.userId !== currentUserId) {
      alert('Only the trip owner can delete the trip.');
      return;
    }
    
    if (confirm('Delete this trip? All associated data will be removed.')) {
      tripStorage.delete(tripId);
      if (currentTripId === tripId) {
        setCurrentTripId(null);
      }
      loadTrips();
    }
  };

  const quitTrip = (tripId: string) => {
    const trip = trips.find(t => t.id === tripId);
    const currentUserId = auth.currentUser?.uid;
    
    if (!trip || !currentUserId) return;
    
    if (confirm('Quit this trip? You will no longer have access to it.')) {
      // Remove current user from sharedWith array
      const updatedSharedWith = (trip.sharedWith || []).filter(uid => uid !== currentUserId);
      const updatedTrip: Trip = {
        ...trip,
        sharedWith: updatedSharedWith,
      };
      tripStorage.save(updatedTrip);
      
      // If the current trip is the one we're quitting, clear selection
      if (currentTripId === tripId) {
        setCurrentTripId(null);
      }
      loadTrips();
    }
  };

  const currentTrip = trips.find(t => t.id === currentTripId) || null;

  // Show trips in chronological order (earliest start date first)
  const sortedTrips = [...trips].sort((a, b) => {
    const aDate = a.startDate || '9999-12-31';
    const bDate = b.startDate || '9999-12-31';
    return aDate.localeCompare(bDate);
  });

  // Export current trip data
  const handleExportTrip = () => {
    if (!currentTrip) {
      alert('Please select a trip to export');
      return;
    }

    const exportData = {
      trip: currentTrip,
      schedules: localStorage.getItem('tripplanner_schedules') 
        ? JSON.parse(localStorage.getItem('tripplanner_schedules') || '[]').filter((s: any) => s.tripId === currentTripId)
        : [],
      expenses: localStorage.getItem('tripplanner_expenses')
        ? JSON.parse(localStorage.getItem('tripplanner_expenses') || '[]').filter((e: any) => e.tripId === currentTripId)
        : [],
      shoppingItems: localStorage.getItem('tripplanner_shopping')
        ? JSON.parse(localStorage.getItem('tripplanner_shopping') || '[]').filter((s: any) => s.tripId === currentTripId)
        : [],
      travelInfo: localStorage.getItem('tripplanner_travel_info')
        ? JSON.parse(localStorage.getItem('tripplanner_travel_info') || '[]').filter((i: any) => i.tripId === currentTripId)
        : [],
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${currentTrip.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    setShowImportExport(false);
  };

  // Import trip data
  const handleImportTrip = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        let importData: any;

        // Try to parse as JSON
        try {
          importData = JSON.parse(content);
        } catch {
          alert('Invalid file format. Please use a JSON file exported from this app.');
          return;
        }

        // Handle different export formats
        let tripData: any = null;
        let schedulesData: any[] = [];
        let expensesData: any[] = [];
        let shoppingData: any[] = [];
        let travelInfoData: any[] = [];

        if (importData.trip) {
          // New full export format: { trip, schedules, expenses, shoppingItems, travelInfo }
          tripData = importData.trip;
          schedulesData = importData.schedules || [];
          expensesData = importData.expenses || [];
          shoppingData = importData.shoppingItems || importData.shopping || [];
          travelInfoData = importData.travelInfo || [];
        } else if (importData.id && importData.name) {
          // Old format: just the trip object itself
          tripData = importData;
        } else {
          alert('Unrecognized file format. Please use a file exported from this app.');
          return;
        }

        // Generate new ID for imported trip to avoid conflicts
        const newTripId = generateId();
        const importedTrip: Trip = {
          id: newTripId,
          userId: auth.currentUser?.uid || '',
          name: `${tripData.name} (Imported)`,
          startDate: tripData.startDate || '',
          endDate: tripData.endDate || '',
          destination: tripData.destination || '',
          destinations: tripData.destinations || [
            {
              id: generateId(),
              name: tripData.destination || '',
              startDate: tripData.startDate || '',
              endDate: tripData.endDate || '',
            }
          ],
          themeColor: tripData.themeColor,
        };

        // Save the trip (localStorage + Firestore)
        tripStorage.save(importedTrip);

        // Save schedules (localStorage + Firestore via scheduleStorage.save)
        if (Array.isArray(schedulesData)) {
          schedulesData.forEach((item: any) => {
            scheduleStorage.save({
              ...item,
              id: generateId(),
              tripId: newTripId,
              timeFrom: item.timeFrom || item.time || '',
              timeTo: item.timeTo || '',
              location: item.location || '',
              category: item.category || 'other',
              googleMapsLink: item.googleMapsLink || '',
              notes: item.notes || '',
            });
          });
        }

        // Save expenses (localStorage + Firestore via expenseStorage.save)
        if (Array.isArray(expensesData)) {
          expensesData.forEach((item: any) => {
            expenseStorage.save({
              ...item,
              id: generateId(),
              tripId: newTripId,
              item: item.item || '',
              currency: item.currency || 'HKD',
              price: Number(item.price) || 0,
              category: item.category || 'other',
              whoPaid: item.whoPaid || '',
            });
          });
        }

        // Save shopping items (localStorage + Firestore via shoppingStorage.save)
        if (Array.isArray(shoppingData)) {
          shoppingData.forEach((item: any) => {
            shoppingStorage.save({
              ...item,
              id: generateId(),
              tripId: newTripId,
              name: item.name || '',
              category: item.category || '',
              link: item.link || item.imageUrl || '',
              purchased: item.purchased || false,
            });
          });
        }

        // Save travel info (localStorage + Firestore via travelInfoStorage.save)
        if (Array.isArray(travelInfoData)) {
          travelInfoData.forEach((item: any) => {
            travelInfoStorage.save({
              ...item,
              id: generateId(),
              tripId: newTripId,
              type: item.type || 'hotel',
              name: item.name || '',
              confirmationNumber: item.confirmationNumber || '',
              date: item.date || '',
              time: item.time || '',
              address: item.address || '',
              phone: item.phone || '',
              notes: item.notes || '',
            });
          });
        }

        // Set as current trip and reload
        tripStorage.setCurrent(newTripId);
        setCurrentTripId(newTripId);
        loadTrips();
        setShowImportExport(false);
        
        alert('Trip imported successfully!');
      } catch (error) {
        alert('Failed to import trip. Please check the file format.');
        console.error('Import error:', error);
      }
    };
    reader.readAsText(file);

    if (event.target) {
      event.target.value = '';
    }
  };

  // Export to CSV (Excel-friendly)
  const handleExportCSV = () => {
    if (!currentTrip) {
      alert('Please select a trip to export');
      return;
    }

    // Helper to escape CSV fields
    const escapeCSV = (value: any): string => {
      if (value === null || value === undefined) return '';
      const str = String(value);
      if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    // Helper to format date nicely
    const formatDate = (dateStr: string): string => {
      if (!dateStr) return '';
      try {
        return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
      } catch { return dateStr; }
    };

    // Get schedule data only
    const schedules = localStorage.getItem('tripplanner_schedules')
      ? JSON.parse(localStorage.getItem('tripplanner_schedules') || '[]').filter((s: any) => s.tripId === currentTripId)
      : [];

    let csv = '\uFEFF';
    csv += 'TRIP INFORMATION\n';
    csv += 'Name,Destinations,Start Date,End Date\n';
    const destinations = currentTrip.destinations && currentTrip.destinations.length > 0
      ? currentTrip.destinations.map(d => d.name).join(' \u2192 ')
      : currentTrip.destination;
    csv += `${escapeCSV(currentTrip.name)},${escapeCSV(destinations)},${escapeCSV(formatDate(currentTrip.startDate))},${escapeCSV(formatDate(currentTrip.endDate))}\n\n`;
    csv += 'SCHEDULE\n';
    csv += 'Date,From Time,To Time,Location,Google Maps Link,Notes\n';
    if (schedules.length > 0) {
      [...schedules].sort((a: any, b: any) => {
        const d = (a.date || '').localeCompare(b.date || '');
        return d !== 0 ? d : (a.timeFrom || '').localeCompare(b.timeFrom || '');
      }).forEach((item: any) => {
        csv += `${escapeCSV(formatDate(item.date))},${escapeCSV(item.timeFrom)},${escapeCSV(item.timeTo || '')},${escapeCSV(item.location)},${escapeCSV(item.googleMapsLink || '')},${escapeCSV(item.notes || '')}\n`;
      });
    } else {
      csv += 'No schedule items\n';
    }

    // Create and download the CSV file
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${currentTrip.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    setShowImportExport(false);
  };

  const handleImportExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !currentTrip) return;
    if (event.target) event.target.value = '';

    // Check file size (limit to 10MB for mobile compatibility)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      alert(`File is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Please keep it under 10MB.`);
      return;
    }

    // Load API key from localStorage or Firestore
    let apiKey = localStorage.getItem('groq_api_key');
    if (!apiKey && auth.currentUser) {
      try {
        const snap = await import('firebase/firestore').then(({ doc, getDoc }) =>
          getDoc(doc(db, 'userProfiles', auth.currentUser!.uid))
        );
        apiKey = snap.data()?.groqKey ?? null;
      } catch {}
    }
    if (!apiKey) {
      alert('Please set up your Groq API key in the AI Assistant first.');
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => {
      setImportingExcel(false);
      alert('Failed to read file. Please try again or use a different file.');
    };
    reader.onabort = () => {
      setImportingExcel(false);
      alert('File reading was aborted.');
    };
    reader.onload = async (e) => {
      setImportingExcel(true);
      try {
        const xlsx = await import('xlsx');
        const wb = xlsx.read(e.target?.result, { type: 'array', cellDates: true });

        // Extract all sheets as plain text for AI
        // Convert Excel numeric times (decimals) to HH:MM strings
        const excelTimeToStr = (v: any): string => {
          if (v === undefined || v === null || v === '') return '';
          if (typeof v === 'number' && v >= 0 && v < 1) {
            const totalMins = Math.round(v * 24 * 60);
            const h = Math.floor(totalMins / 60);
            const m = totalMins % 60;
            return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
          }
          // Already a string like "5:15" or "08:30 - 14:15"
          return String(v).trim();
        };

        const sheetsText = wb.SheetNames.map(name => {
          const rows: any[][] = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, raw: true });
          const text = rows.map(r => r.map((cell: any) => {
            // Convert numeric time decimals to readable HH:MM
            if (typeof cell === 'number' && cell >= 0 && cell < 1) return excelTimeToStr(cell);
            return cell;
          }).join(' | ')).join('\n');
          return `Sheet "${name}":\n${text}`;
        }).join('\n\n');

        const prompt = `You are a travel data parser. The user has uploaded an Excel file for their trip "${currentTrip.name}" (${currentTrip.startDate} to ${currentTrip.endDate}).

Here is the raw Excel content:
${sheetsText}

The Excel likely has columns in this order: Date | Time | Activity/Description | Detail/Name | Google Maps Link | Confirmation Number (columns may vary).

Rules:
- Skip header rows (rows with column label text, not data)
- The "location" field = the most specific place/activity name available. If there are two text columns, combine them as "Detail - Activity" or use whichever is more specific
- Dates: YYYY-MM-DD. If a date cell is empty, inherit the date from the row above
- Times: HH:MM 24-hour format. A single time like "5:15" means timeFrom="05:15", timeTo="". A range like "08:30 - 14:15" means timeFrom="08:30", timeTo="14:15". NEVER leave timeFrom empty if any time exists in that row
- If a row has a confirmation number, it is likely a hotel/flight/info item, not a schedule item
- Classify category: transportation (flights, trains, buses, taxis), hotel (check-in/check-out), food (meals, restaurants), shopping, attraction (sightseeing), other
- Use "" for missing fields, never null

Return ONLY this JSON, no markdown, no explanation:
{
  "schedules": [{"date":"YYYY-MM-DD","timeFrom":"HH:MM","timeTo":"","location":"string","category":"food|shopping|hotel|transportation|attraction|other","notes":"string","googleMapsLink":"string"}],
  "expenses": [{"date":"YYYY-MM-DD","item":"string","price":0.0,"currency":"HKD","category":"food|shopping|hotel|transportation|attraction|other","whoPaid":"string"}],
  "shopping": [{"name":"string","category":"string","link":"string"}],
  "info": [{"type":"hotel|flight|car-rental|restaurant","name":"string","confirmationNumber":"string","date":"YYYY-MM-DD","time":"HH:MM","address":"string","phone":"string","notes":"string"}]
}`;

        const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        
        // Create abort controller for timeout (30 seconds for mobile)
        const abortController = new AbortController();
        const timeoutId = setTimeout(() => abortController.abort(), 30000);
        
        const res = isDev
          ? await fetch('https://api.groq.com/openai/v1/chat/completions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
              body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'user', content: prompt }] }),
              signal: abortController.signal,
            })
          : await fetch('/.netlify/functions/groq-proxy', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ apiKey, messages: [{ role: 'user', content: prompt }], model: 'llama-3.3-70b-versatile' }),
              signal: abortController.signal,
            });

        clearTimeout(timeoutId);

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData?.error?.message || `API error ${res.status}`);
        }
        const data = await res.json();
        const reply = data.choices?.[0]?.message?.content ?? '';

        const jsonMatch = reply.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('No JSON in response');
        const parsed = JSON.parse(jsonMatch[0]);

        let count = 0;
        (parsed.schedules || []).forEach((s: any) => {
          if (!s.location && !s.date) return;
          // Normalize time: strip seconds if present (e.g. "17:30:00" -> "17:30")
          const normalizeTime = (t: string) => t ? t.replace(/^(\d{1,2}:\d{2})(:\d{2})?$/, '$1').padStart(5, '0') : '';
          const timeFrom = normalizeTime(s.timeFrom || s.time || '');
          const timeTo = normalizeTime(s.timeTo && s.timeTo !== (s.timeFrom || s.time) ? s.timeTo : '');
          const location = [s.location, s.detail].filter(Boolean).join(' - ') || s.name || '';
          scheduleStorage.save({ id: generateId(), tripId: currentTrip.id, date: s.date || '', timeFrom, timeTo, location, category: s.category || 'other', notes: s.notes || '', googleMapsLink: s.googleMapsLink || '' });
          count++;
        });
        (parsed.expenses || []).forEach((e: any) => {
          if (!e.item) return;
          expenseStorage.save({ id: generateId(), tripId: currentTrip.id, date: e.date || new Date().toISOString().slice(0,10), item: e.item, price: Number(e.price) || 0, currency: e.currency || 'HKD', category: e.category || 'other', whoPaid: e.whoPaid || '', settled: false });
          count++;
        });
        (parsed.shopping || []).forEach((s: any) => {
          if (!s.name) return;
          shoppingStorage.save({ id: generateId(), tripId: currentTrip.id, name: s.name, category: s.category || '', link: s.link || '', purchased: false });
          count++;
        });
        (parsed.info || []).forEach((i: any) => {
          if (!i.name) return;
          travelInfoStorage.save({ id: generateId(), tripId: currentTrip.id, type: i.type || 'hotel', name: i.name, confirmationNumber: i.confirmationNumber || '', date: i.date || '', time: i.time || '', address: i.address || '', phone: i.phone || '', notes: i.notes || '' });
          count++;
        });

        loadTrips();
        setImportingExcel(false);
        alert(`✓ Imported ${count} items from your Excel file!`);
      } catch (err: any) {
        setImportingExcel(false);
        console.error('[Excel Import Error]', err);
        
        let errorMsg = 'Import failed';
        if (err.name === 'AbortError') {
          errorMsg = 'Request timed out. Please check your internet connection and try again.';
        } else if (err.message?.includes('JSON')) {
          errorMsg = 'Could not parse AI response. The file format may not be recognized.';
        } else if (err.message?.includes('API error')) {
          errorMsg = 'API error. Please ensure your Groq API key is valid and check your network.';
        } else if (err.message) {
          errorMsg = `Import failed: ${err.message}`;
        }
        
        alert(errorMsg);
      }
    };
    reader.readAsArrayBuffer(file);
    setShowImportExport(false);
  };

  const handleSync = async () => {
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;
    setSyncing(true);
    try {
      await syncFromFirestore();
      loadTrips();
    } finally {
      setSyncing(false);
      isSyncingRef.current = false;
    }
  };

  const tabs = [
    { id: 'home' as Tab, label: 'Home', icon: Plane },
    { id: 'schedule' as Tab, label: 'Schedule', icon: Calendar },
    { id: 'expenses' as Tab, label: 'Expenses', icon: DollarSign },
    { id: 'shopping' as Tab, label: 'Shopping', icon: ShoppingBag },
    { id: 'info' as Tab, label: 'Info', icon: Info },
  ];

  const LANGUAGES = [
    { code: 'en', label: 'English' },
    { code: 'zh-TW', label: '繁體中文' },
  ];

  const handleSelectLanguage = (code: string) => {
    setShowLangPicker(false);
    setShowSettingsDropdown(false);
    setMobileMenuOpen(false);
    localStorage.setItem('userPickedLanguage', code);
    setSelectedLanguage(code);
    localStorage.setItem('appLanguage', code);
    window.dispatchEvent(new Event('languagechange'));
    if (code !== 'zh-TW' && code !== 'en') {
      loadGoogleTranslate(code);
    }
  };

  const handleLogout = async () => {
    if (confirm('Are you sure you want to logout?')) {
      clearUserSessionData();
      await logout();
      setLoggedIn(false);
    }
  };

  const handleChangePassword = async (oldPassword: string, newPassword: string) => {
    if (!auth.currentUser) {
      throw new Error('You must be logged in to change password');
    }
    const { updatePassword, reauthenticateWithCredential, EmailAuthProvider } = await import('firebase/auth');
    
    // Re-authenticate with old password to refresh session
    const credential = EmailAuthProvider.credential(auth.currentUser.email!, oldPassword);
    await reauthenticateWithCredential(auth.currentUser, credential);
    
    // Now update password (session is fresh after re-auth)
    await updatePassword(auth.currentUser, newPassword);
    alert('Password changed successfully!');
    setShowPasswordModal(false);
    setShowChangePassword(false);
  };

  if (!authReady) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-300 to-purple-500 rounded-2xl shadow-lg mb-4">
            <Plane className="w-8 h-8 text-white animate-pulse" />
          </div>
          <p className="text-sm text-gray-500">{t('Loading your diary...')}</p>
        </div>
      </div>
    );
  }

  // Show login page if not authenticated
  if (!loggedIn) {
    return <LoginPage onLogin={() => setLoggedIn(true)} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      {/* Hidden Google Translate Element */}
      <div id="google_translate_element" style={{ display: 'none' }}></div>
      
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16 gap-2">
            {/* Logo */}
            <div
              className="flex items-center gap-2 sm:gap-3 flex-shrink-0 cursor-pointer"
              onClick={() => { setActiveTab('home'); setShowTripHome(false); }}
            >
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-purple-300 to-purple-500 rounded-lg flex items-center justify-center">
                <Plane className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 hidden sm:block">{t('Your Travel Diary')}</h1>
            </div>

            {/* Actions - Desktop */}
            <div className="hidden sm:flex items-center gap-1 sm:gap-2">
              {/* Settings Dropdown (Logout + Sync + Share) */}
              <div className="relative" ref={settingsDropdownRef}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowSettingsDropdown(!showSettingsDropdown);
                    setShowTripSelector(false);
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  title={t('Settings')}
                >
                  <Settings className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-600 hidden sm:inline">{t('Settings')}</span>
                  <ChevronDown className="w-3 h-3 text-gray-500" />
                </button>

                {showSettingsDropdown && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                    {/* Language */}
                    <button
                      onClick={() => setShowLangPicker(!showLangPicker)}
                      className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-50"
                    >
                      <Globe className="w-4 h-4 text-gray-600" />
                      <span className="text-sm text-gray-700 flex-1">{t('Language')}</span>
                      <ChevronDown className="w-3 h-3 text-gray-400" />
                    </button>
                    {showLangPicker && (
                      <div className="mx-2 mb-1 bg-gray-50 rounded-lg border border-gray-100 overflow-hidden">
                        {LANGUAGES.map(lang => (
                          <button
                            key={lang.code}
                            onClick={() => handleSelectLanguage(lang.code)}
                            className={`w-full text-left px-4 py-1.5 text-sm hover:bg-purple-50 hover:text-purple-700 ${
                              selectedLanguage === lang.code ? 'text-purple-600 font-medium' : 'text-gray-700'
                            }`}
                          >
                            {lang.label}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Sync */}
                    <button
                      onClick={() => { handleSync(); setShowSettingsDropdown(false); }}
                      disabled={syncing}
                      className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-50 disabled:opacity-50"
                    >
                      <RefreshCw className={`w-4 h-4 text-gray-600 ${syncing ? 'animate-spin' : ''}`} />
                      <span className="text-sm text-gray-700">{syncing ? 'Syncing...' : 'Sync'}</span>
                    </button>

                    {/* Share submenu trigger */}
                    <div className="relative" ref={shareSelectorRef}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowImportExport(!showImportExport);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-50"
                      >
                        <Share2 className="w-4 h-4 text-gray-600" />
                        <span className="text-sm text-gray-700 flex-1">{t('Share')}</span>
                        <ChevronDown className="w-3 h-3 text-gray-400" />
                      </button>

                      {showImportExport && (
                        <div className="absolute right-full top-0 mr-1 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                          <div className="px-3 py-2 border-b border-gray-200">
                            <p className="text-xs font-medium text-gray-500 uppercase">{t('Import / Export')}</p>
                          </div>
                          <div className="p-2 space-y-1">
                            <button onClick={handleExportCSV} disabled={!currentTrip} className="w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                              <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                              <div><div className="text-sm font-medium text-gray-900">{t('Export to Excel')}</div><div className="text-xs text-gray-500">{t('Download as CSV file')}</div></div>
                            </button>
                            <button onClick={handleExportTrip} disabled={!currentTrip} className="w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                              <Download className="w-5 h-5 text-green-600" />
                              <div><div className="text-sm font-medium text-gray-900">{t('Export Trip')}</div><div className="text-xs text-gray-500">{t('Download as JSON file')}</div></div>
                            </button>
                            <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg hover:bg-gray-50">
                              <Upload className="w-5 h-5 text-blue-600" />
                              <div><div className="text-sm font-medium text-gray-900">{t('Import Trip')}</div><div className="text-xs text-gray-500">{t('Upload JSON file')}</div></div>
                            </button>
                            <button onClick={() => { setShowImportExport(false); excelInputRef.current?.click(); }} disabled={!currentTrip} className="w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                              <FileSpreadsheet className="w-5 h-5 text-purple-600" />
                              <div><div className="text-sm font-medium text-gray-900">Import from Excel</div><div className="text-xs text-gray-500">AI parses any format</div></div>
                            </button>                          </div>
                        </div>
                      )}
                    </div>

                    <div className="border-t border-gray-100 mt-1 pt-1">
                      <button
                        onClick={() => { setShowChangePassword(true); setShowSettingsDropdown(false); setShowPasswordModal(true); }}
                        className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-50"
                      >
                        <Lock className="w-4 h-4 text-gray-600" />
                        <span className="text-sm text-gray-700">{t('Change Password')}</span>
                      </button>

                      <button
                        onClick={() => { handleLogout(); setShowSettingsDropdown(false); }}
                        className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-red-50"
                      >
                        <LogOut className="w-4 h-4 text-red-500" />
                        <span className="text-sm text-red-600">{t('Logout')}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Hidden file input for import */}
              <input 
                ref={fileInputRef} 
                type="file" 
                accept=".json" 
                onChange={handleImportTrip} 
                className="hidden" 
                style={{ display: 'none' }}
              />
              <input 
                ref={excelInputRef} 
                type="file" 
                accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                onChange={handleImportExcel} 
                className="hidden" 
                style={{ display: 'none' }}
              />

              {/* Trip Selector */}
              <div className="relative" ref={tripSelectorRef}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowTripSelector(!showTripSelector);
                    setShowImportExport(false);
                    setShowSettingsDropdown(false);
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 bg-purple-100 rounded-lg hover:bg-purple-200 transition-colors max-w-[220px]"
                >
                  <span className="text-sm font-medium text-purple-700 truncate flex-1">
                    {currentTrip ? currentTrip.name : 'Select Trip'}
                  </span>
                  <ChevronDown className="w-4 h-4 text-purple-500 flex-shrink-0" />
                </button>

                {showTripSelector && (() => {
                  const today = new Date().toISOString().split('T')[0];
                  const upcomingTrips = sortedTrips.filter(t => t.startDate >= today);
                  const pastTripsList = sortedTrips.filter(t => t.startDate < today);
                  const tripsToShow = showPastTrips ? pastTripsList : upcomingTrips;
                  
                  return (
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                      <div className="px-3 py-2 border-b border-gray-200">
                        <p className="text-xs font-medium text-gray-500 uppercase">
                          {showPastTrips ? 'Past Trips' : 'Upcoming Trips'}
                        </p>
                      </div>
                       <div className="max-h-64 overflow-y-auto">
                         {tripsToShow.map(trip => (
                           <div
                             key={trip.id}
                             className="flex items-center justify-between px-3 py-2 hover:bg-gray-50"
                           >
                             <button
                               onClick={() => selectTrip(trip.id)}
                               className={`flex-1 text-left ${
                                 currentTripId === trip.id ? 'text-purple-600 font-medium' : 'text-gray-700'
                               }`}
                             >
                               <div className="text-sm font-medium break-words whitespace-normal">{trip.name}</div>
                               <div className="text-xs text-gray-500 break-words whitespace-normal leading-snug">
                                 {trip.destinations && trip.destinations.length > 0
                                   ? trip.destinations
                                       .slice()
                                       .sort((a, b) => a.startDate.localeCompare(b.startDate))
                                       .map(d => d.name)
                                       .join(' → ')
                                   : trip.destination}
                               </div>
                             </button>
                             {trip.userId === auth.currentUser?.uid ? (
                             <button
                               onClick={() => deleteTrip(trip.id)}
                               className="p-1 text-gray-400 hover:text-red-600 flex-shrink-0"
                             >
                               <X className="w-4 h-4" />
                             </button>
                             ) : (
                             <button
                               onClick={() => quitTrip(trip.id)}
                               className="p-1 text-gray-400 hover:text-orange-600 flex-shrink-0"
                               title="Quit trip"
                             >
                               <LogOut className="w-4 h-4" />
                             </button>
                             )}
                             <button
                               onClick={(e) => { e.stopPropagation(); setShowTripSelector(false); setSharingTrip(trip); }}
                               className="p-1 text-gray-400 hover:text-purple-600 flex-shrink-0"
                               title="Share trip"
                             >
                               <Users className="w-4 h-4" />
                             </button>
                           </div>
                         ))}
                       </div>
                       {tripsToShow.length === 0 && (
                         <div className="px-3 py-4 text-center text-sm text-gray-500">
                           {showPastTrips ? 'No past trips' : 'No upcoming trips'}
                         </div>
                       )}
                       <div className="px-3 py-2 border-t border-gray-200">
                         <button
                           onClick={() => setShowPastTrips(!showPastTrips)}
                           className="w-full text-left text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-200 font-medium border border-gray-300 rounded px-3 py-1.5"
                         >
                           {showPastTrips 
                             ? `← ${t('Upcoming Trips')} (${upcomingTrips.length})`
                             : `${t('Past Trips')} (${pastTripsList.length})`}
                         </button>
                       </div>
                    </div>
                  );
                })()}
              </div>

              {/* New Trip Button */}
              <button
                onClick={() => setShowTripForm(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-purple-400 text-white rounded-lg hover:bg-purple-500 transition-colors"
                aria-label={t('New Trip')}
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline text-sm font-medium">{t('New Trip')}</span>
              </button>

              {/* Join Trip Button */}
              <button
                onClick={() => setSharingTrip({ id: '', userId: '', name: '', startDate: '', endDate: '', destination: '', destinations: [] })}
                className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                title={t('Join Trip')}
                aria-label={t('Join Trip')}
              >
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline text-sm font-medium">{t('Join Trip')}</span>
              </button>
            </div>

            {/* Mobile Menu Button */}
            <div className="sm:hidden">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="flex items-center justify-center w-10 h-10 bg-gray-100 rounded-lg"
                aria-label={t('Open navigation menu')}
              >
                <Menu className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
          <nav className="flex items-center justify-between -mb-px w-full">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); if (tab.id === 'home') setShowTripHome(true); }}
                  className={`flex-1 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-3 sm:py-4 border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-purple-400 text-purple-600 bg-purple-50'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-[10px] sm:text-sm font-medium">{t(tab.label)}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Mobile Sidebar - fixed overlay, outside header so no ref conflicts */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 sm:hidden flex">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileMenuOpen(false)} />

          {/* Sidebar panel */}
          <div className="relative w-72 max-w-[85vw] bg-white h-full flex flex-col shadow-2xl ml-auto">

            {/* Sidebar header */}
            <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-purple-500 to-purple-600">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center">
                  <Plane className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold text-white text-sm">{t('Your Travel Diary')}</span>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="text-white/70 hover:text-white p-2" aria-label={t('Close menu')} title={t('Close menu')}>
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto">

              {/* Trips section */}
              <div className="px-4 pt-5 pb-3">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">{t('My Trips')}</p>
                {(() => {
                  const today = new Date().toISOString().split('T')[0];
                  const upcomingTrips = sortedTrips.filter(t => t.startDate >= today);
                  const pastTripsList = sortedTrips.filter(t => t.startDate < today);
                  const tripsToShow = showPastTrips ? pastTripsList : upcomingTrips;
                  return (
                    <>
                      <div className="space-y-1 max-h-56 overflow-y-auto -mx-1 px-1">
                        {tripsToShow.map(trip => (
                          <div key={trip.id} className={`group flex items-center gap-1 rounded-xl px-2 py-2 transition-colors ${
                            currentTripId === trip.id
                              ? 'bg-purple-100 border border-purple-200'
                              : 'hover:bg-gray-50 border border-transparent'
                          }`}>
                            <button
                              onClick={() => { selectTrip(trip.id); setMobileMenuOpen(false); }}
                              className="flex-1 text-left min-w-0"
                            >
                              <div className={`text-sm font-semibold truncate ${
                                currentTripId === trip.id ? 'text-purple-700' : 'text-gray-800'
                              }`}>{trip.name}</div>
                              <div className="text-xs text-gray-400 truncate mt-0.5">
                                {trip.destinations?.length
                                  ? trip.destinations.slice().sort((a, b) => a.startDate.localeCompare(b.startDate)).map(d => d.name).join(' → ')
                                  : trip.destination}
                              </div>
                            </button>
                            <button
                              onClick={() => { setSharingTrip(trip); setMobileMenuOpen(false); }}
                              className="p-1.5 rounded-lg text-gray-300 hover:text-purple-500 hover:bg-purple-50 flex-shrink-0"
                            >
                              <Users className="w-3.5 h-3.5" />
                            </button>
                            {trip.userId === auth.currentUser?.uid ? (
                            <button
                              onClick={() => deleteTrip(trip.id)}
                              className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 flex-shrink-0"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                            ) : (
                            <button
                              onClick={() => quitTrip(trip.id)}
                              className="p-1.5 rounded-lg text-gray-300 hover:text-orange-500 hover:bg-orange-50 flex-shrink-0"
                              title="Quit trip"
                            >
                              <LogOut className="w-3.5 h-3.5" />
                            </button>
                            )}
                          </div>
                        ))}
                        {tripsToShow.length === 0 && (
                          <p className="text-xs text-center text-gray-400 py-3">
                            {showPastTrips ? 'No past trips' : 'No upcoming trips'}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => setShowPastTrips(p => !p)}
                        className="mt-2 w-full text-xs text-purple-500 font-medium py-2 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
                      >
                        {showPastTrips ? `← ${t('Upcoming Trips')} (${upcomingTrips.length})` : `${t('Past Trips')} (${pastTripsList.length})`}
                      </button>
                    </>
                  );
                })()}
              </div>

              <div className="h-px bg-gray-100 mx-4" />

              {/* Actions */}
              <div className="px-4 pt-4 pb-3 space-y-1">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">{t('Actions')}</p>

                <button
                  onClick={() => { setShowTripForm(true); setMobileMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-700 hover:bg-purple-50 hover:text-purple-700 transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <Plus className="w-4 h-4 text-purple-600" />
                  </div>
                  {t('New Trip')}
                </button>

                <button
                  onClick={() => { setSharingTrip({ id: '', userId: '', name: '', startDate: '', endDate: '', destination: '', destinations: [] }); setMobileMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <Users className="w-4 h-4 text-blue-600" />
                  </div>
                  {t('Join a Trip')}
                </button>

                <button
                  onClick={handleSync}
                  disabled={syncing}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-700 hover:bg-green-50 hover:text-green-700 transition-colors disabled:opacity-50"
                >
                  <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                    <RefreshCw className={`w-4 h-4 text-green-600 ${syncing ? 'animate-spin' : ''}`} />
                  </div>
                  {syncing ? t('Syncing...') : t('Sync')}
                </button>
              </div>

              <div className="h-px bg-gray-100 mx-4" />

              {/* Import / Export */}
              <div className="px-4 pt-4 pb-3 space-y-1">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">{t('Import / Export')}</p>

                {[
                  { icon: <FileSpreadsheet className="w-4 h-4 text-emerald-600" />, bg: 'bg-emerald-100', label: t('Export to Excel'), sub: t('Download as CSV file'), action: () => { handleExportCSV(); setMobileMenuOpen(false); }, disabled: !currentTrip },
                  { icon: <Download className="w-4 h-4 text-green-600" />, bg: 'bg-green-100', label: t('Export Trip'), sub: t('Download as JSON file'), action: () => { handleExportTrip(); setMobileMenuOpen(false); }, disabled: !currentTrip },
                  { icon: <Upload className="w-4 h-4 text-blue-600" />, bg: 'bg-blue-100', label: t('Import Trip'), sub: t('Upload JSON file'), action: () => { fileInputRef.current?.click(); setMobileMenuOpen(false); }, disabled: false },
                  { icon: <FileSpreadsheet className="w-4 h-4 text-purple-600" />, bg: 'bg-purple-100', label: 'Import from Excel', sub: 'AI parses any format', action: () => { excelInputRef.current?.click(); setMobileMenuOpen(false); }, disabled: !currentTrip },
                ].map(({ icon, bg, label, sub, action, disabled }) => (
                  <button
                    key={label}
                    onClick={action}
                    disabled={disabled}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-40 text-left"
                  >
                    <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
                      {icon}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-gray-800 truncate">{label}</div>
                      <div className="text-xs text-gray-400">{sub}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Sidebar footer */}
            <div className="border-t border-gray-100 px-4 py-3 space-y-1">
              {/* Language picker */}
              <div>
                <button
                  onClick={() => setShowLangPicker(p => !p)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <Globe className="w-4 h-4 text-gray-600" />
                  </div>
                  <span className="flex-1 text-left">{t('Language')}</span>
                  <ChevronDown className="w-3 h-3 text-gray-400" />
                </button>
                {showLangPicker && (
                  <div className="mt-1 mx-1 bg-gray-50 rounded-lg border border-gray-100 overflow-hidden">
                    {LANGUAGES.map(lang => (
                      <button
                        key={lang.code}
                        onClick={() => handleSelectLanguage(lang.code)}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-purple-50 hover:text-purple-700 ${
                          selectedLanguage === lang.code ? 'text-purple-600 font-medium' : 'text-gray-700'
                        }`}
                      >
                        {lang.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={() => { setShowChangePassword(true); setShowPasswordModal(true); setMobileMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <Lock className="w-4 h-4 text-gray-600" />
                </div>
                {t('Change Password')}
              </button>
              <button
                onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                  <LogOut className="w-4 h-4 text-red-600" />
                </div>
                {t('Logout')}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Trip Form Modal */}
      {showTripForm && (
        <div className="fixed inset-0 bg-gray-400/30 flex items-center justify-center z-50 p-4" onClick={resetForm}>
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold">{t('Create New Trip')}</h3>
              <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateTrip} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('Trip Name')}</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                  placeholder="e.g., Summer Vacation 2026"
                />
              </div>

              <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-700">{t('Destinations')}</label>
                {newTripDestinations.map((segment, index) => (
                  <div key={segment.id} className="bg-gray-50 p-3 rounded-lg border border-gray-200 relative">
                    <button
                      type="button"
                      onClick={() => removeDestinationSegment(index)}
                      className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <div className="space-y-3">
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
                            onClick={() => openNewTripDatePicker('segment', index, 'start')}
                            className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-left text-sm transition-colors hover:bg-gray-50 focus:ring-2 focus:ring-purple-400 focus:border-transparent ${
                              segment.startDate ? 'text-gray-900 font-medium' : 'text-gray-400'
                            }`}
                          >
                            {segment.startDate
                              ? new Date(segment.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                              : t('Select date...')}
                          </button>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">{t('End Date')}</label>
                          <button
                            type="button"
                            onClick={() => openNewTripDatePicker('segment', index, 'end')}
                            className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-left text-sm transition-colors hover:bg-gray-50 focus:ring-2 focus:ring-purple-400 focus:border-transparent ${
                              segment.endDate ? 'text-gray-900 font-medium' : 'text-gray-400'
                            }`}
                          >
                            {segment.endDate
                              ? new Date(segment.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                              : t('Select date...')}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {newTripDestinations.length === 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('Primary Destination')}</label>
                    <input
                      type="text"
                      required
                      value={formData.destination}
                      onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                      placeholder="e.g., Paris, France"
                    />
                  </div>
                )}

                <button
                  type="button"
                  onClick={addDestinationSegment}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600 hover:text-gray-900"
                >
                  <Plus className="w-4 h-4" />
                  <span className="text-sm font-medium">{t('Add Multiple Destinations')}</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('Start Date')}</label>
                  <button
                    type="button"
                    onClick={() => openNewTripDatePicker('trip', 0, 'start')}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-left transition-colors hover:bg-gray-50 focus:ring-2 focus:ring-purple-400 focus:border-transparent ${formData.startDate ? 'text-gray-900 font-medium' : 'text-gray-400'}`}
                  >
                    {formData.startDate ? new Date(formData.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : t('Select date...')}
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('End Date')}</label>
                  <button
                    type="button"
                    onClick={() => openNewTripDatePicker('trip', 0, 'end')}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-left transition-colors hover:bg-gray-50 focus:ring-2 focus:ring-purple-400 focus:border-transparent ${formData.endDate ? 'text-gray-900 font-medium' : 'text-gray-400'}`}
                  >
                    {formData.endDate ? new Date(formData.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : t('Select date...')}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('Cover Photo URL (optional)')}</label>
                <div className="space-y-2">
                  {formData.coverPhoto && (
                    <div className="relative w-full h-32 rounded-lg overflow-hidden border border-gray-200">
                      <img src={formData.coverPhoto} alt="Cover" className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
                    </div>
                  )}
                  <input
                    type="url"
                    value={formData.coverPhoto || ''}
                    onChange={(e) => setFormData({ ...formData, coverPhoto: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent text-sm"
                    placeholder="https://example.com/photo.jpg"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-purple-400 text-white rounded-lg hover:bg-purple-500 transition-colors"
                >
                  {t('Create Trip')}
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

            {/* Date Picker Modal for New Trip */}
            {newTripDatePickerOpen && newTripDatePickerContext && (
              <div className="fixed inset-0 bg-gray-400/30 flex items-center justify-center z-50 p-4" onClick={() => { setNewTripDatePickerOpen(false); setNewTripDatePickerContext(null); setNewTripSelectedStartDate(null); }}>
                <div
                  className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full"
                  onClick={(e) => e.stopPropagation()}
                >
                  <CalendarPicker
                    calendarMonth={newTripCalendarMonth}
                    selectedDate={(() => {
                      if (!newTripDatePickerContext) return undefined;
                      if (newTripDatePickerContext.type === 'segment' && newTripDestinations?.[newTripDatePickerContext.index]) {
                        return newTripDatePickerContext.field === 'start'
                          ? newTripDestinations[newTripDatePickerContext.index].startDate
                          : newTripDestinations[newTripDatePickerContext.index].endDate;
                      }
                      return newTripDatePickerContext.field === 'start' ? formData.startDate : formData.endDate;
                    })()}
                    dragOffset={newTripDragOffset}
                    dragDirection={newTripDragDirection}
                    isSnappingBack={newTripIsSnappingBack}
                    showLeftArrow={newTripShowLeftArrow}
                    showRightArrow={newTripShowRightArrow}
                    onPreviousMonth={goToPreviousNewTripMonth}
                    onNextMonth={goToNextNewTripMonth}
                    onSelectDate={handleNewTripDateSelect}
                    calendarNavigationProps={newTripCalendarNavigationProps}
                    header={
                      <div className="mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">
                          Select {newTripDatePickerContext.field === 'start' ? (newTripSelectedStartDate ? 'End' : 'Start') : 'End'} Date
                        </h3>
                      </div>
                    }
                    footer={
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => { setNewTripDatePickerOpen(false); setNewTripDatePickerContext(null); setNewTripSelectedStartDate(null); }}
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
          </div>
        </div>
      )}
              {/* Main Content */}
      <main role="main" className={`overflow-x-hidden ${activeTab === 'home' && !showTripHome ? '' : 'max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-8'}`}>
        {activeTab === 'home' && !showTripHome && (
          <LandingPage
            trips={trips}
            currentTripId={currentTripId}
            onSelectTrip={(id) => { setCurrentTripId(id); tripStorage.setCurrent(id); }}
            onNewTrip={() => setShowTripForm(true)}
            onOpenTrip={(id) => { setCurrentTripId(id); tripStorage.setCurrent(id); setShowTripHome(true); }}
          />
        )}
        {activeTab === 'home' && showTripHome && (
          <div className="bg-gray-50 pb-4">
            <Homepage
              currentTrip={currentTrip}
              onUpdateTrip={(updatedTrip?: Trip) => {
                if (updatedTrip) {
                  setTrips(prev => prev.map(t => t.id === updatedTrip.id ? updatedTrip : t));
                } else {
                  loadTrips();
                }
              }}
              onShareTrip={(trip) => setSharingTrip(trip)}
            />
          </div>
        )}
        {activeTab === 'schedule' && <TravelSchedule currentTrip={currentTrip} />}
        {activeTab === 'expenses' && <TravelExpenses currentTrip={currentTrip} />}
        {activeTab === 'shopping' && <ShoppingList currentTrip={currentTrip} />}
        {activeTab === 'info' && <TravelInfo currentTrip={currentTrip} />}
      </main>

      {/* Global Footer */}
      <AppFooter />

      <InstallPrompt />
      <AiAgent currentTrip={currentTrip} onScheduleAdded={() => setActiveTab('schedule')} />

      {/* Excel Import Loading Overlay */}
      {importingExcel && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl px-8 py-6 flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-500 rounded-full animate-spin" />
            <div className="text-center">
              <p className="font-semibold text-gray-900">Importing with AI...</p>
              <p className="text-sm text-gray-500 mt-1">Analysing your Excel file</p>
            </div>
          </div>
        </div>
      )}
      {sharingTrip && (
        <TripSharingModal
          trip={sharingTrip}
          onClose={() => setSharingTrip(null)}
          onTripUpdated={(updated) => {
            setTrips(prev => prev.map(t => t.id === updated.id ? updated : t));
            if (sharingTrip.id === updated.id) setSharingTrip(updated);
          }}
        />
      )}

      {/* Change Password Modal */}
      {showPasswordModal && (
        <ChangePasswordModal
          onClose={() => { setShowPasswordModal(false); setShowChangePassword(false); }}
          onSubmit={handleChangePassword}
        />
      )}
    </div>
  );
}
