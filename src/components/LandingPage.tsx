import { useState, useRef } from 'react';
import { MapPin, Calendar, Plus, Globe, Navigation, Camera, Users } from 'lucide-react';
import { format, parseISO, subMonths, addMonths } from 'date-fns';
import { Trip } from '../types';
import { useTranslation } from '../utils/i18n';
import { auth } from '../utils/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';

interface LandingPageProps {
  trips: Trip[];
  currentTripId: string | null;
  onSelectTrip: (id: string) => void;
  onNewTrip: () => void;
  onOpenTrip: (id: string) => void;
}

type Filter = 'recent' | 'past' | 'favorites' | 'shared';

const HERO_IMAGE = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1400&q=80';

export function LandingPage({ trips, currentTripId, onSelectTrip, onNewTrip, onOpenTrip }: LandingPageProps) {
  const { t } = useTranslation();
  const dashboardRef = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState<Filter>('recent');

  const now = new Date();
  const sixMonthsAgo = subMonths(now, 6);
  const sixMonthsAhead = addMonths(now, 6);

  const filteredTrips = trips
    .filter(t => {
      const start = t.startDate ? new Date(t.startDate) : null;
      const end = t.endDate ? new Date(t.endDate) : null;
      const currentUserId = auth.currentUser?.uid;
      if (filter === 'recent') return start && start >= sixMonthsAgo && start <= sixMonthsAhead;
      if (filter === 'past') return end && end < now;
      if (filter === 'favorites') return t.favorite?.[currentUserId || ''] === true;
      if (filter === 'shared') return t.sharedWith?.includes(currentUserId || '');
      return true;
    })
    .sort((a, b) => (b.startDate || '').localeCompare(a.startDate || ''));

  const totalTrips = trips.length;
  const destinations = new Set(trips.flatMap(t =>
    t.destinations?.map(d => d.name) ?? [t.destination]
  )).size;

  const scrollToDashboard = () => {
    const target = dashboardRef.current;
    if (!target) return;
    const start = window.scrollY;
    const end = target.getBoundingClientRect().top + window.scrollY;
    const distance = end - start;
    const duration = 900;
    let startTime: number | null = null;
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const ease = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;
      window.scrollTo(0, start + distance * ease);
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  const getDestinationLabel = (trip: Trip) => {
    if (trip.destinations && trip.destinations.length > 0) {
      return trip.destinations
        .slice()
        .sort((a, b) => a.startDate.localeCompare(b.startDate))
        .map(d => d.name)
        .join(' → ');
    }
    return trip.destination;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="max-w-7xl mx-auto px-4 pt-4">
      <div className="relative rounded-2xl overflow-hidden" style={{ minHeight: 280 }}>
        <img src={HERO_IMAGE} alt="Travel" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />
        <div className="relative z-10 p-8 flex flex-col justify-center" style={{ minHeight: 280 }}>
          <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-3">
            {t('Capture every')} <span className="text-purple-300">{t('adventure')}</span><br />{t('you take.')}
          </h1>
          <p className="text-white/70 text-sm max-w-xs mb-6">
            {t('Your personal travel diary to document locations, feelings, and memories from around the globe.')}
          </p>
          <button
            onClick={scrollToDashboard}
            className="w-fit px-6 py-2.5 bg-white text-gray-900 font-semibold rounded-full hover:bg-gray-100 transition-colors text-sm"
          >
            {t('Start')}
          </button>
        </div>
      </div>

      {/* Trip Dashboard */}
      <div ref={dashboardRef} className="px-0 pt-8 pb-4">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1">
            {(['recent', 'past', 'favorites', 'shared'] as Filter[]).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filter === f ? 'bg-purple-500 text-white' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                {f === 'recent' ? t('Recent') : f === 'past' ? t('Past') : f === 'favorites' ? t('Favorites') : t('Shared')}
              </button>
            ))}
          </div>
          <span className="text-sm text-gray-500">
            🗂 {t('Total Trips:')} <span className="font-bold text-gray-800">{totalTrips}</span>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTrips.map(trip => {
            const isActive = trip.id === currentTripId;
            const destLabel = getDestinationLabel(trip);
            return (
              <div
                key={trip.id}
                onClick={() => { onSelectTrip(trip.id); onOpenTrip(trip.id); }}
                className={`bg-white rounded-2xl border cursor-pointer hover:shadow-md transition-shadow overflow-hidden ${
                  isActive ? 'border-purple-400 ring-2 ring-purple-200' : 'border-gray-200'
                }`}
              >
                <div className="relative h-40 bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center overflow-hidden">
                  {trip.coverPhoto
                    ? <img src={trip.coverPhoto} alt={trip.name} className="absolute inset-0 w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
                    : <MapPin className="w-10 h-10 text-white/40" />
                  }
                  {trip.favorite?.[auth.currentUser?.uid || ''] && (
                    <span className="absolute top-3 left-3 text-yellow-400 text-lg drop-shadow">★</span>
                  )}
                  {trip.sharedWith?.includes(auth.currentUser?.uid || '') && (
                    <span className="absolute top-3 right-3 text-white/80 text-lg drop-shadow" title="Shared with you">
                      <Users className="w-5 h-5" />
                    </span>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
                    <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                    {trip.startDate && trip.endDate
                      ? `${format(parseISO(trip.startDate), 'MMM dd')} - ${format(parseISO(trip.endDate), 'MMM dd, yyyy')}`
                      : t('No dates set')}
                  </div>
                  <h3 className="font-bold text-gray-900 text-sm mb-1">{trip.name}</h3>
                  <div className="flex items-start gap-1 text-xs text-purple-500">
                    <MapPin className="w-3 h-3 flex-shrink-0 mt-0.5" />
                    <span className="leading-snug">{destLabel}</span>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Add New Trip Card */}
          <div
            onClick={onNewTrip}
            className="bg-white rounded-2xl border-2 border-dashed border-gray-200 cursor-pointer hover:border-purple-300 hover:bg-purple-50/30 transition-colors flex flex-col items-center justify-center gap-3 min-h-[200px]"
          >
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
              <Plus className="w-5 h-5 text-gray-400" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-gray-400">{t('Add New Trip')}</p>
              <p className="text-xs text-gray-400">{t('Where did you go today?')}</p>
            </div>
          </div>
        </div>

        {filteredTrips.length === 0 && (
          <p className="text-center text-sm text-gray-400 py-8">
            {filter === 'favorites' ? t('No favourite trips yet.') : filter === 'shared' ? t('No shared trips yet.') : t('No trips found for this period.')}
          </p>
        )}
      </div>

      {/* Stats Banner */}
      <div className="mt-4 mb-8 bg-purple-500 rounded-2xl p-6">
        <div className="grid grid-cols-2 gap-4 text-center text-white">
          {[
            { icon: Globe, value: destinations, label: t('Destinations') },
            { icon: Navigation, value: totalTrips, label: t('Trips Taken') },
          ].map(({ icon: Icon, value, label }) => (
            <div key={label}>
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-2">
                <Icon className="w-5 h-5" />
              </div>
              <div className="text-2xl font-bold">{value}</div>
              <div className="text-xs text-white/70">{label}</div>
            </div>
          ))}
        </div>
      </div>
      </div>
    </div>
  );
}
