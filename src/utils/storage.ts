import { Trip, ScheduleItem, Expense, ShoppingItem, TravelInfo } from '../types';
import { auth, db } from './firebase';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  query,
  where,
} from 'firebase/firestore';

// LocalStorage keys
const KEYS = {
  TRIPS: 'tripplanner_trips',
  SCHEDULES: 'tripplanner_schedules',
  EXPENSES: 'tripplanner_expenses',
  SHOPPING: 'tripplanner_shopping',
  TRAVEL_INFO: 'tripplanner_travel_info',
  CURRENT_TRIP: 'tripplanner_current_trip',
};

// Generic storage helpers
function getFromStorage<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function saveToStorage<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data));
}

function clearAllTripDataFromStorage() {
  saveToStorage(KEYS.TRIPS, []);
  saveToStorage(KEYS.SCHEDULES, []);
  saveToStorage(KEYS.EXPENSES, []);
  saveToStorage(KEYS.SHOPPING, []);
  saveToStorage(KEYS.TRAVEL_INFO, []);
  localStorage.removeItem(KEYS.CURRENT_TRIP);
}

function cleanData<T>(data: T): T {
  return JSON.parse(JSON.stringify(data));
}

function getCurrentUserId(): string | null {
  return auth.currentUser?.uid ?? null;
}

function ensureTripOwnership(trip: Trip): Trip {
  const userId = getCurrentUserId();
  return {
    ...trip,
    userId: trip.userId || userId || 'unknown',
  };
}

function getTripIdsForCurrentUser(): string[] {
  const userId = getCurrentUserId();
  if (!userId) return [];
  return getFromStorage<Trip>(KEYS.TRIPS)
    .filter((trip) => trip.userId === userId)
    .map((trip) => trip.id);
}

function saveTripToFirestore(trip: Trip) {
  try {
    const safeTrip = ensureTripOwnership(trip);
    const ref = doc(collection(db, 'trips'), safeTrip.id);
    void setDoc(ref, cleanData(safeTrip), { merge: true });
  } catch (e) {
    console.error('Failed to save trip to Firestore', e);
  }
}

function deleteTripFromFirestore(id: string) {
  try {
    const ref = doc(collection(db, 'trips'), id);
    void deleteDoc(ref);
  } catch (e) {
    console.error('Failed to delete trip from Firestore', e);
  }
}

function saveScheduleToFirestore(item: ScheduleItem) {
  try {
    const ref = doc(collection(db, 'schedules'), item.id);
    void setDoc(ref, item, { merge: true });
  } catch (e) {
    console.error('Failed to save schedule to Firestore', e);
  }
}

function deleteScheduleFromFirestore(id: string) {
  try {
    const ref = doc(collection(db, 'schedules'), id);
    void deleteDoc(ref);
  } catch (e) {
    console.error('Failed to delete schedule from Firestore', e);
  }
}

function saveExpenseToFirestore(expense: Expense) {
  try {
    const ref = doc(collection(db, 'expenses'), expense.id);
    void setDoc(ref, expense, { merge: true });
  } catch (e) {
    console.error('Failed to save expense to Firestore', e);
  }
}

function deleteExpenseFromFirestore(id: string) {
  try {
    const ref = doc(collection(db, 'expenses'), id);
    void deleteDoc(ref);
  } catch (e) {
    console.error('Failed to delete expense from Firestore', e);
  }
}

function saveShoppingToFirestore(item: ShoppingItem) {
  try {
    const ref = doc(collection(db, 'shoppingItems'), item.id);
    void setDoc(ref, item, { merge: true });
  } catch (e) {
    console.error('Failed to save shopping item to Firestore', e);
  }
}

function deleteShoppingFromFirestore(id: string) {
  try {
    const ref = doc(collection(db, 'shoppingItems'), id);
    void deleteDoc(ref);
  } catch (e) {
    console.error('Failed to delete shopping item from Firestore', e);
  }
}

function saveTravelInfoToFirestore(info: TravelInfo) {
  try {
    const ref = doc(collection(db, 'travelInfo'), info.id);
    void setDoc(ref, info, { merge: true });
  } catch (e) {
    console.error('Failed to save travel info to Firestore', e);
  }
}

function deleteTravelInfoFromFirestore(id: string) {
  try {
    const ref = doc(collection(db, 'travelInfo'), id);
    void deleteDoc(ref);
  } catch (e) {
    console.error('Failed to delete travel info from Firestore', e);
  }
}

// --- Public storage APIs (localStorage + Firestore mirror on writes) ---

// Trip operations
export const tripStorage = {
  getAll: (): Trip[] => {
    const userId = getCurrentUserId();
    const trips = getFromStorage<Trip>(KEYS.TRIPS);
    return userId ? trips.filter((t) => t.userId === userId) : [];
  },

  save: (trip: Trip): void => {
    const safeTrip = ensureTripOwnership(trip);
    const trips = getFromStorage<Trip>(KEYS.TRIPS);
    const index = trips.findIndex((t) => t.id === safeTrip.id);
    if (index >= 0) {
      trips[index] = safeTrip;
    } else {
      trips.push(safeTrip);
    }
    saveToStorage(KEYS.TRIPS, trips);
    saveTripToFirestore(safeTrip);
  },

  delete: (id: string): void => {
    const trips = getFromStorage<Trip>(KEYS.TRIPS).filter((t) => t.id !== id);
    saveToStorage(KEYS.TRIPS, trips);
    deleteTripFromFirestore(id);
  },

  getCurrent: (): string | null => localStorage.getItem(KEYS.CURRENT_TRIP),

  setCurrent: (id: string): void => {
    localStorage.setItem(KEYS.CURRENT_TRIP, id);
  },
};

// Schedule operations
export const scheduleStorage = {
  getAll: (tripId: string): ScheduleItem[] => {
    const tripIds = new Set(getTripIdsForCurrentUser());
    return getFromStorage<ScheduleItem>(KEYS.SCHEDULES).filter(
      (s) => s.tripId === tripId && tripIds.has(s.tripId)
    );
  },

  save: (item: ScheduleItem): void => {
    const items = getFromStorage<ScheduleItem>(KEYS.SCHEDULES);
    const index = items.findIndex((i) => i.id === item.id);
    if (index >= 0) {
      items[index] = item;
    } else {
      items.push(item);
    }
    saveToStorage(KEYS.SCHEDULES, items);
    saveScheduleToFirestore(item);
  },

  delete: (id: string): void => {
    const items = getFromStorage<ScheduleItem>(KEYS.SCHEDULES).filter((i) => i.id !== id);
    saveToStorage(KEYS.SCHEDULES, items);
    deleteScheduleFromFirestore(id);
  },
};

// Expense operations
export const expenseStorage = {
  getAll: (tripId: string): Expense[] => {
    const tripIds = new Set(getTripIdsForCurrentUser());
    return getFromStorage<Expense>(KEYS.EXPENSES).filter(
      (e) => e.tripId === tripId && tripIds.has(e.tripId)
    );
  },

  save: (expense: Expense): void => {
    const expenses = getFromStorage<Expense>(KEYS.EXPENSES);
    const index = expenses.findIndex((e) => e.id === expense.id);
    if (index >= 0) {
      expenses[index] = expense;
    } else {
      expenses.push(expense);
    }
    saveToStorage(KEYS.EXPENSES, expenses);
    saveExpenseToFirestore(expense);
  },

  delete: (id: string): void => {
    const expenses = getFromStorage<Expense>(KEYS.EXPENSES).filter((e) => e.id !== id);
    saveToStorage(KEYS.EXPENSES, expenses);
    deleteExpenseFromFirestore(id);
  },
};

// Shopping operations
export const shoppingStorage = {
  getAll: (tripId: string): ShoppingItem[] => {
    const tripIds = new Set(getTripIdsForCurrentUser());
    return getFromStorage<ShoppingItem>(KEYS.SHOPPING).filter(
      (s) => s.tripId === tripId && tripIds.has(s.tripId)
    );
  },

  save: (item: ShoppingItem): void => {
    const items = getFromStorage<ShoppingItem>(KEYS.SHOPPING);
    const index = items.findIndex((i) => i.id === item.id);
    if (index >= 0) {
      items[index] = item;
    } else {
      items.push(item);
    }
    saveToStorage(KEYS.SHOPPING, items);
    saveShoppingToFirestore(item);
  },

  delete: (id: string): void => {
    const items = getFromStorage<ShoppingItem>(KEYS.SHOPPING).filter((i) => i.id !== id);
    saveToStorage(KEYS.SHOPPING, items);
    deleteShoppingFromFirestore(id);
  },
};

// Travel info operations
export const travelInfoStorage = {
  getAll: (tripId: string): TravelInfo[] => {
    const tripIds = new Set(getTripIdsForCurrentUser());
    return getFromStorage<TravelInfo>(KEYS.TRAVEL_INFO).filter(
      (t) => t.tripId === tripId && tripIds.has(t.tripId)
    );
  },

  save: (info: TravelInfo): void => {
    const items = getFromStorage<TravelInfo>(KEYS.TRAVEL_INFO);
    const index = items.findIndex((i) => i.id === info.id);
    if (index >= 0) {
      items[index] = info;
    } else {
      items.push(info);
    }
    saveToStorage(KEYS.TRAVEL_INFO, items);
    saveTravelInfoToFirestore(info);
  },

  delete: (id: string): void => {
    const items = getFromStorage<TravelInfo>(KEYS.TRAVEL_INFO).filter((i) => i.id !== id);
    saveToStorage(KEYS.TRAVEL_INFO, items);
    deleteTravelInfoFromFirestore(id);
  },
};

// --- Cloud sync helpers ---

/**
 * Load all trips and related data from Firestore and overwrite localStorage.
 * Call this on startup or via a manual "Sync" button so all devices see
 * the same data.
 */
export async function syncFromFirestore(): Promise<void> {
  const userId = getCurrentUserId();
  if (!userId) {
    clearAllTripDataFromStorage();
    return;
  }

  try {
    const tripsSnap = await getDocs(query(collection(db, 'trips'), where('userId', '==', userId)));
    const trips: Trip[] = [];
    tripsSnap.forEach((docSnap) => {
      const data = docSnap.data() as Trip;
      trips.push({ ...data, id: docSnap.id, userId: data.userId || userId });
    });
    saveToStorage(KEYS.TRIPS, trips);

    const tripIds = trips.map((t) => t.id);
    if (tripIds.length === 0) {
      saveToStorage(KEYS.SCHEDULES, []);
      saveToStorage(KEYS.EXPENSES, []);
      saveToStorage(KEYS.SHOPPING, []);
      saveToStorage(KEYS.TRAVEL_INFO, []);
      localStorage.removeItem(KEYS.CURRENT_TRIP);
      return;
    }

    const allSchedules: ScheduleItem[] = [];
    const allExpenses: Expense[] = [];
    const allShopping: ShoppingItem[] = [];
    const allInfos: TravelInfo[] = [];

    for (const tripId of tripIds) {
      const [schedulesSnap, expensesSnap, shoppingSnap, infoSnap] = await Promise.all([
        getDocs(query(collection(db, 'schedules'), where('tripId', '==', tripId))),
        getDocs(query(collection(db, 'expenses'), where('tripId', '==', tripId))),
        getDocs(query(collection(db, 'shoppingItems'), where('tripId', '==', tripId))),
        getDocs(query(collection(db, 'travelInfo'), where('tripId', '==', tripId))),
      ]);

      schedulesSnap.forEach((docSnap) => {
        allSchedules.push({ ...(docSnap.data() as ScheduleItem), id: docSnap.id });
      });
      expensesSnap.forEach((docSnap) => {
        allExpenses.push({ ...(docSnap.data() as Expense), id: docSnap.id });
      });
      shoppingSnap.forEach((docSnap) => {
        allShopping.push({ ...(docSnap.data() as ShoppingItem), id: docSnap.id });
      });
      infoSnap.forEach((docSnap) => {
        allInfos.push({ ...(docSnap.data() as TravelInfo), id: docSnap.id });
      });
    }

    saveToStorage(KEYS.SCHEDULES, allSchedules);
    saveToStorage(KEYS.EXPENSES, allExpenses);
    saveToStorage(KEYS.SHOPPING, allShopping);
    saveToStorage(KEYS.TRAVEL_INFO, allInfos);

    const currentTripId = localStorage.getItem(KEYS.CURRENT_TRIP);
    if (currentTripId && !tripIds.includes(currentTripId)) {
      localStorage.removeItem(KEYS.CURRENT_TRIP);
    }
  } catch (e) {
    console.error('Failed to sync from Firestore', e);
  }
}

export function clearUserSessionData(): void {
  clearAllTripDataFromStorage();
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}
