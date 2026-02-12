export interface Trip {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  destination: string;
  themeColor?: string;
}

export interface ScheduleItem {
  id: string;
  tripId: string;
  date: string;
  timeFrom: string;
  timeTo?: string;
  location: string;
  category: 'food' | 'shopping' | 'hotel' | 'transportation' | 'attraction' | 'other';
  googleMapsLink?: string;
  notes?: string;
}

export interface Expense {
  id: string;
  tripId: string;
  date: string;
  item: string;
  currency: string;
  price: number;
  category: 'food' | 'shopping' | 'hotel' | 'transportation' | 'attraction' | 'other';
  whoPaid?: string;
}

export interface ShoppingItem {
  id: string;
  tripId: string;
  name: string;
  category: string;
  link?: string;
  purchased: boolean;
}

export interface TravelInfo {
  id: string;
  tripId: string;
  type: 'hotel' | 'flight' | 'car-rental' | 'restaurant';
  name: string;
  confirmationNumber?: string;
  date?: string;
  time?: string;
  address?: string;
  phone?: string;
  notes?: string;
}

export interface WeatherData {
  date: string;
  tempMin: number;
  tempMax: number;
  condition: string;
  icon: string;
  suggestion: string;
}
