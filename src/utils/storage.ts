import { Trip, ScheduleItem, Expense, ShoppingItem, TravelInfo } from '../types';
import { db } from './firebase';
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

// --- Firestore write helpers (non-blocking, best-effort) ---

function saveTripToFirestore(trip: Trip) {
  try {
    const ref = doc(collection(db, 'trips'), trip.id);
    void setDoc(ref, trip, { merge: true });
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
  getAll: (): Trip[] => getFromStorage<Trip>(KEYS.TRIPS),

  save: (trip: Trip): void => {
    const trips = getFromStorage<Trip>(KEYS.TRIPS);
    const index = trips.findIndex((t) => t.id === trip.id);
    if (index >= 0) {
      trips[index] = trip;
    } else {
      trips.push(trip);
    }
    saveToStorage(KEYS.TRIPS, trips);
    saveTripToFirestore(trip);
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
    return getFromStorage<ScheduleItem>(KEYS.SCHEDULES).filter((s) => s.tripId === tripId);
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
    return getFromStorage<Expense>(KEYS.EXPENSES).filter((e) => e.tripId === tripId);
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
    return getFromStorage<ShoppingItem>(KEYS.SHOPPING).filter((s) => s.tripId === tripId);
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
    return getFromStorage<TravelInfo>(KEYS.TRAVEL_INFO).filter((t) => t.tripId === tripId);
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
  try {
    // Trips
    const tripsSnap = await getDocs(collection(db, 'trips'));
    const trips: Trip[] = [];
    tripsSnap.forEach((docSnap) => {
      const data = docSnap.data() as Trip;
      trips.push({ ...data, id: docSnap.id });
    });
    saveToStorage(KEYS.TRIPS, trips);

    const tripIds = trips.map((t) => t.id);
    if (tripIds.length === 0) return;

    // Schedules
    const schedulesSnap = await getDocs(
      query(collection(db, 'schedules'), where('tripId', 'in', tripIds.slice(0, 10)))
    );
    const schedules: ScheduleItem[] = [];
    schedulesSnap.forEach((docSnap) => {
      const data = docSnap.data() as ScheduleItem;
      schedules.push({ ...data, id: docSnap.id });
    });
    saveToStorage(KEYS.SCHEDULES, schedules);

    // Expenses
    const expensesSnap = await getDocs(
      query(collection(db, 'expenses'), where('tripId', 'in', tripIds.slice(0, 10)))
    );
    const expenses: Expense[] = [];
    expensesSnap.forEach((docSnap) => {
      const data = docSnap.data() as Expense;
      expenses.push({ ...data, id: docSnap.id });
    });
    saveToStorage(KEYS.EXPENSES, expenses);

    // Shopping items
    const shoppingSnap = await getDocs(
      query(collection(db, 'shoppingItems'), where('tripId', 'in', tripIds.slice(0, 10)))
    );
    const shopping: ShoppingItem[] = [];
    shoppingSnap.forEach((docSnap) => {
      const data = docSnap.data() as ShoppingItem;
      shopping.push({ ...data, id: docSnap.id });
    });
    saveToStorage(KEYS.SHOPPING, shopping);

    // Travel info
    const infoSnap = await getDocs(
      query(collection(db, 'travelInfo'), where('tripId', 'in', tripIds.slice(0, 10)))
    );
    const infos: TravelInfo[] = [];
    infoSnap.forEach((docSnap) => {
      const data = docSnap.data() as TravelInfo;
      infos.push({ ...data, id: docSnap.id });
    });
    saveToStorage(KEYS.TRAVEL_INFO, infos);
  } catch (e) {
    console.error('Failed to sync from Firestore', e);
  }
}

export function generateId(): string {
  return (
    Date.now().toString(36) +
    Math.random()
      .toString(36)
      .slice(2)
  );
}
