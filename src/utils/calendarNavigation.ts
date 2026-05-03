import { useRef, useState, useCallback } from 'react';
import type { Dispatch, SetStateAction, TouchEvent, WheelEvent } from 'react';

export interface CalendarMonth {
  year: number;
  month: number;
}

const SWIPE_THRESHOLD = 40;
const SCROLL_PX_PER_MONTH = 100;

export const shiftCalendarMonth = (current: CalendarMonth, delta: number): CalendarMonth => {
  const d = new Date(current.year, current.month + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
};

export const useCalendarNavigation = (
  setCalendarMonth: Dispatch<SetStateAction<CalendarMonth>>
) => {
  const touchStartXRef = useRef<number | null>(null);
  const rawRef = useRef(0);
  const lockedRef = useRef(false);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [dragOffset, setDragOffset] = useState(0);
  const [dragDirection, setDragDirection] = useState<'prev' | 'next' | null>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

 const [isSnappingBack, setIsSnappingBack] = useState(false);

  // Commit: animate strip to 100%, then teleport: flip month + reset offset with no transition
  const commit = useCallback((dir: 'prev' | 'next') => {
    if (lockedRef.current) return;
    lockedRef.current = true;
    rawRef.current = 0; // reset immediately so no further wheel events can re-trigger
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    setDragDirection(dir);
    setDragOffset(0);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setDragOffset(100);
        setTimeout(() => {
          if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
          setCalendarMonth(prev => shiftCalendarMonth(prev, dir === 'next' ? 1 : -1));
          setDragDirection(null);
          setDragOffset(0);
          lockedRef.current = false;
        }, 420);
      });
    });
  }, [setCalendarMonth]);

  const snapBack = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    rawRef.current = 0;
    setIsSnappingBack(true);
    setDragOffset(0);
    setTimeout(() => {
      setDragDirection(null);
      setIsSnappingBack(false);
    }, 220);
  }, []);

  const goToPreviousMonth = useCallback(() => {
    if (lockedRef.current) return;
    commit('prev');
  }, [commit]);

  const goToNextMonth = useCallback(() => {
    if (lockedRef.current) return;
    commit('next');
  }, [commit]);

  const onWheel = (event: WheelEvent<HTMLElement>) => {
    const dx = Math.abs(event.deltaX) > Math.abs(event.deltaY)
      ? event.deltaX
      : (event.shiftKey ? event.deltaY : 0);
    if (Math.abs(dx) < 3) return;
    event.preventDefault();
    if (lockedRef.current) return;

    rawRef.current += dx;

    // Direction: positive raw = scrolled right = going to next month (content moves left)
    const dir: 'prev' | 'next' = rawRef.current > 0 ? 'next' : 'prev';
    if (dragDirection === null) setDragDirection(dir);

    rawRef.current = Math.max(-SCROLL_PX_PER_MONTH, Math.min(SCROLL_PX_PER_MONTH, rawRef.current));
    setDragOffset(Math.abs(rawRef.current));

    if (Math.abs(rawRef.current) >= SCROLL_PX_PER_MONTH) {
      commit(dir);
      return;
    }

    // Auto-commit or snap-back after scroll goes idle for 150ms
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    const capturedDir = dir;
    idleTimerRef.current = setTimeout(() => {
      if (lockedRef.current) return;
      const abs = Math.abs(rawRef.current);
      if (abs >= SCROLL_PX_PER_MONTH / 2) {
        commit(capturedDir);
      } else {
        snapBack();
      }
    }, 150);
  };

  const onTouchStart = (event: TouchEvent<HTMLElement>) => {
    touchStartXRef.current = event.touches[0]?.clientX ?? null;
  };

  const onTouchEnd = (event: TouchEvent<HTMLElement>) => {
    if (touchStartXRef.current === null) return;
    const endX = event.changedTouches[0]?.clientX;
    if (typeof endX !== 'number') { touchStartXRef.current = null; return; }
    const delta = endX - touchStartXRef.current;
    touchStartXRef.current = null;
    if (Math.abs(delta) < SWIPE_THRESHOLD) { snapBack(); return; }
    // Swipe left → next, swipe right → prev
    if (delta < 0) goToNextMonth(); else goToPreviousMonth();
  };

  const onMouseEnter = () => { setShowLeftArrow(true); setShowRightArrow(true); };
  const onMouseLeave = () => {
    setShowLeftArrow(false);
    setShowRightArrow(false);
    if (!lockedRef.current && rawRef.current !== 0) snapBack();
  };

  return {
    goToPreviousMonth,
    goToNextMonth,
    showLeftArrow,
    showRightArrow,
    dragOffset,
    dragDirection,
    isSnappingBack,
    calendarNavigationProps: { onWheel, onTouchStart, onTouchEnd, onMouseEnter, onMouseLeave },
  };
};
