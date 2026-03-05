import { useState, useEffect, useRef } from 'react';
import { Plane, Calendar, DollarSign, ShoppingBag, Info, Plus, ChevronDown, X, Download, Upload, Share2, RefreshCw, LogOut } from 'lucide-react';
import { Trip, DestinationSegment } from './types';
import { tripStorage, scheduleStorage, expenseStorage, shoppingStorage, travelInfoStorage, generateId, syncFromFirestore } from './utils/storage';
import { Homepage } from './components/Homepage';
import { TravelSchedule } from './components/TravelSchedule';
import { TravelExpenses } from './components/TravelExpenses';
import { ShoppingList } from './components/ShoppingList';
import { TravelInfo } from './components/TravelInfo';
import { LoginPage, isAuthenticated, logout } from './components/LoginPage';
import InstallPrompt from './components/InstallPrompt';

type Tab = 'home' | 'schedule' | 'expenses' | 'shopping' | 'info';

export function App() {
  const [loggedIn, setLoggedIn] = useState<boolean>(isAuthenticated());
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [trips, setTrips] = useState<Trip[]>([]);
  const [currentTripId, setCurrentTripId] = useState<string | null>(null);
  const [showTripForm, setShowTripForm] = useState(false);
  const [showTripSelector, setShowTripSelector] = useState(false);
  const [showImportExport, setShowImportExport] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [formData, setFormData] = useState<Partial<Trip>>({
    name: '',
    startDate: '',
    endDate: '',
    destination: '',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const tripSelectorRef = useRef<HTMLDivElement>(null);
  const shareSelectorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (tripSelectorRef.current && !tripSelectorRef.current.contains(target)) {
        setShowTripSelector(false);
      }
      if (shareSelectorRef.current && !shareSelectorRef.current.contains(target)) {
        setShowImportExport(false);
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
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // App came back to focus, auto-sync from Firestore
        void (async () => {
          setSyncing(true);
          await syncFromFirestore();
          loadTrips();
          setSyncing(false);
        })();
      }
    };

    const handleFocus = () => {
      // Also sync when window regains focus
      void (async () => {
        setSyncing(true);
        await syncFromFirestore();
        loadTrips();
        setSyncing(false);
      })();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  useEffect(() => {
    // On startup: load from Firestore, then from localStorage
    const init = async () => {
      setSyncing(true);
      await syncFromFirestore();
      loadTrips();
      const savedTripId = tripStorage.getCurrent();
      if (savedTripId) {
        setCurrentTripId(savedTripId);
      }
      setSyncing(false);
    };
    void init();
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
      name: formData.name!,
      startDate: formData.startDate!,
      endDate: formData.endDate!,
      destination: destinations[0].name,
      destinations: destinations,
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
    });
    setNewTripDestinations([]);
    setShowTripForm(false);
  };

  const selectTrip = (tripId: string) => {
    setCurrentTripId(tripId);
    tripStorage.setCurrent(tripId);
    setShowTripSelector(false);
  };

  const deleteTrip = (tripId: string) => {
    if (confirm('Delete this trip? All associated data will be removed.')) {
      tripStorage.delete(tripId);
      if (currentTripId === tripId) {
        setCurrentTripId(null);
      }
      loadTrips();
    }
  };

  const currentTrip = trips.find(t => t.id === currentTripId) || null;

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
        const data = JSON.parse(content);
        
        // Handle both old format (flat structure) and new format (nested with trip/schedules/etc)
        const tripData = data.trip || data;
        const schedulesData = data.schedules || data.schedulesItems || [];
        const expensesData = data.expenses || data.expensesItems || [];
        const shoppingData = data.shoppingItems || data.shopping || [];
        const travelInfoData = data.travelInfo || data.travelInformation || [];
        
        // Generate new ID for imported trip to avoid conflicts
        const newTripId = generateId();
        const importedTrip: Trip = {
          ...tripData,
          id: newTripId,
          name: `${tripData.name} (Imported)`,
        };

        // Save the trip to both localStorage and Firestore
        tripStorage.save(importedTrip);

        // Save each item to trigger Firestore sync
        const saveItemsToFirestore = () => {
          // Save schedules to Firestore
          schedulesData.forEach((item: any) => {
            scheduleStorage.save({ ...item, id: generateId(), tripId: newTripId });
          });
          // Save expenses to Firestore
          expensesData.forEach((item: any) => {
            expenseStorage.save({ ...item, id: generateId(), tripId: newTripId });
          });
          // Save shopping items to Firestore
          shoppingData.forEach((item: any) => {
            shoppingStorage.save({ ...item, id: generateId(), tripId: newTripId });
          });
          // Save travel info to Firestore
          travelInfoData.forEach((item: any) => {
            travelInfoStorage.save({ ...item, id: generateId(), tripId: newTripId });
          });
        };
        saveItemsToFirestore();

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
    
    // Reset file input
    if (event.target) {
      event.target.value = '';
    }
  };

  // Share trip via link (generates shareable JSON)
  const handleShareTrip = async () => {
    if (!currentTrip) {
      alert('Please select a trip to share');
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

    const dataStr = JSON.stringify(exportData);
    
    try {
      await navigator.clipboard.writeText(dataStr);
      alert('Trip data copied to clipboard! Share this with others to import.');
      setShowImportExport(false);
    } catch (error) {
      console.error('Failed to copy:', error);
      alert('Failed to copy to clipboard. Please use the Export button instead.');
    }
  };

  // Paste from clipboard import
  const handlePasteImport = async () => {
    try {
      const clipText = await navigator.clipboard.readText();
      if (!clipText || !clipText.trim()) {
        alert('Clipboard is empty. Please copy trip data first.');
        return;
      }

      let importData: any;
      try {
        importData = JSON.parse(clipText);
      } catch {
        alert('Clipboard does not contain valid trip data. Please copy trip data from the "Copy to Clipboard" export first.');
        return;
      }

      // Handle different export formats
      let tripData: any = null;
      let schedulesData: any[] = [];
      let expensesData: any[] = [];
      let shoppingData: any[] = [];
      let travelInfoData: any[] = [];

      if (importData.trip) {
        tripData = importData.trip;
        schedulesData = importData.schedules || [];
        expensesData = importData.expenses || [];
        shoppingData = importData.shoppingItems || importData.shopping || [];
        travelInfoData = importData.travelInfo || [];
      } else if (importData.id && importData.name) {
        tripData = importData;
      } else {
        alert('Unrecognized data format. Please use data from "Copy to Clipboard" export.');
        return;
      }

      const newTripId = generateId();
      const importedTrip: Trip = {
        id: newTripId,
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

      tripStorage.save(importedTrip);

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

      tripStorage.setCurrent(newTripId);
      setCurrentTripId(newTripId);
      loadTrips();
      setShowImportExport(false);

      alert('Trip imported from clipboard successfully! All schedules, expenses, shopping items, and travel info have been restored.');
    } catch (error) {
      console.error('Paste import error:', error);
      alert('Failed to read clipboard. Please make sure you have granted clipboard permission, or use the "Import Trip" file upload instead.');
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    await syncFromFirestore();
    loadTrips();
    setSyncing(false);
  };

  const tabs = [
    { id: 'home' as Tab, label: 'Home', icon: Plane },
    { id: 'schedule' as Tab, label: 'Schedule', icon: Calendar },
    { id: 'expenses' as Tab, label: 'Expenses', icon: DollarSign },
    { id: 'shopping' as Tab, label: 'Shopping', icon: ShoppingBag },
    { id: 'info' as Tab, label: 'Info', icon: Info },
  ];

  const handleLogout = () => {
    if (confirm('Are you sure you want to logout?')) {
      logout();
      setLoggedIn(false);
    }
  };

  // Show login page if not authenticated
  if (!loggedIn) {
    return <LoginPage onLogin={() => setLoggedIn(true)} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16 gap-2">
            {/* Logo */}
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-purple-300 to-purple-500 rounded-lg flex items-center justify-center">
                <Plane className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 hidden sm:block">Our Travel Diary</h1>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 sm:gap-2">
              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="flex items-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 bg-gray-100 rounded-lg hover:bg-red-100 transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4 text-gray-600" />
                <span className="text-xs font-medium text-gray-600 hidden sm:inline">Logout</span>
              </button>

              {/* Sync Button */}
              <button
                onClick={handleSync}
                disabled={syncing}
                className="flex items-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                title="Sync from Cloud"
              >
                <RefreshCw className={`w-4 h-4 text-gray-600 ${syncing ? 'animate-spin' : ''}`} />
                <span className="text-xs font-medium text-gray-600 hidden sm:inline">
                  {syncing ? 'Syncing...' : 'Sync'}
                </span>
              </button>

              {/* Import/Export Button */}
              <div className="relative" ref={shareSelectorRef}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowImportExport(!showImportExport);
                    setShowTripSelector(false);
                  }}
                  className="flex items-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  title="Import/Export Trip"
                >
                  <Share2 className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                  <span className="hidden sm:inline text-sm font-medium text-gray-700">Share</span>
                </button>

                {showImportExport && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                    <div className="px-3 py-2 border-b border-gray-200">
                      <p className="text-xs font-medium text-gray-500 uppercase">Import / Export</p>
                    </div>
                    <div className="p-2 space-y-2">
                      <button
                        onClick={handleExportTrip}
                        disabled={!currentTrip}
                        className="w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Download className="w-5 h-5 text-green-600" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">Export Trip</div>
                          <div className="text-xs text-gray-500">Download as JSON file</div>
                        </div>
                      </button>

                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg hover:bg-gray-50"
                      >
                        <Upload className="w-5 h-5 text-blue-600" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">Import Trip</div>
                          <div className="text-xs text-gray-500">Upload JSON file</div>
                        </div>
                      </button>

                      <button
                        onClick={handleShareTrip}
                        disabled={!currentTrip}
                        className="w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Share2 className="w-5 h-5 text-purple-600" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">Copy to Clipboard</div>
                          <div className="text-xs text-gray-500">Share trip data</div>
                        </div>
                      </button>

                      <button
                        onClick={handlePasteImport}
                        className="w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg hover:bg-gray-50"
                      >
                        <Download className="w-5 h-5 text-orange-600" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">Paste from Clipboard</div>
                          <div className="text-xs text-gray-500">Import shared trip data</div>
                        </div>
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
              />

              {/* Trip Selector */}
              <div className="relative" ref={tripSelectorRef}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowTripSelector(!showTripSelector);
                    setShowImportExport(false);
                  }}
                  className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 bg-purple-100 rounded-lg hover:bg-purple-200 transition-colors max-w-[140px] sm:max-w-[220px]"
                >
                  <span className="text-xs sm:text-sm font-medium text-purple-700 truncate flex-1">
                    {currentTrip ? currentTrip.name : 'Select Trip'}
                  </span>
                  <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4 text-purple-500 flex-shrink-0" />
                </button>

                {showTripSelector && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                    <div className="px-3 py-2 border-b border-gray-200">
                      <p className="text-xs font-medium text-gray-500 uppercase">Your Trips</p>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {trips.map(trip => (
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
                          <button
                            onClick={() => deleteTrip(trip.id)}
                            className="p-1 text-gray-400 hover:text-red-600 flex-shrink-0"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                    {trips.length === 0 && (
                      <div className="px-3 py-4 text-center text-sm text-gray-500">
                        No trips yet
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* New Trip Button */}
              <button
                onClick={() => setShowTripForm(true)}
                className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 bg-purple-400 text-white rounded-lg hover:bg-purple-500 transition-colors"
              >
                <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">New Trip</span>
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
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-3 sm:py-4 border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-purple-400 text-purple-600 bg-purple-50'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-5 h-5 sm:w-5 sm:h-5" />
                  <span className="hidden sm:inline text-xs sm:text-sm font-medium">{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Trip Form Modal */}
      {showTripForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold">Create New Trip</h3>
              <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateTrip} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Trip Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                  placeholder="e.g., Summer Vacation 2024"
                />
              </div>

              <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-700">Destinations</label>
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
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">End Date</label>
                          <input
                            type="date"
                            required
                            value={segment.endDate}
                            onChange={(e) => updateDestinationSegment(index, 'endDate', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {newTripDestinations.length === 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Primary Destination</label>
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
                  <span className="text-sm font-medium">Add Multiple Destinations</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent ${formData.startDate ? 'text-gray-900' : 'text-gray-300'}`}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent ${formData.endDate ? 'text-gray-900' : 'text-gray-300'}`}
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-purple-400 text-white rounded-lg hover:bg-purple-500 transition-colors"
                >
                  Create Trip
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

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-8 overflow-x-hidden">
        {activeTab === 'home' && (
          <div className="bg-gray-50 pb-4">
            <Homepage
              currentTrip={currentTrip}
              onUpdateTrip={(updatedTrip?: Trip) => {
                if (updatedTrip) {
                  // Instantly update the trips list so UI reflects changes immediately
                  setTrips(prev =>
                    prev.map(t => (t.id === updatedTrip.id ? updatedTrip : t))
                  );
                } else {
                  loadTrips();
                }
              }}
            />
          </div>
        )}
        {activeTab === 'schedule' && <TravelSchedule currentTrip={currentTrip} />}
        {activeTab === 'expenses' && <TravelExpenses currentTrip={currentTrip} />}
        {activeTab === 'shopping' && <ShoppingList currentTrip={currentTrip} />}
        {activeTab === 'info' && <TravelInfo currentTrip={currentTrip} />}
      </main>
      <InstallPrompt />
    </div>
  );
}
