import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { shiftCalendarMonth } from '../utils/calendarNavigation';

interface CalendarPickerProps {
  calendarMonth: { year: number; month: number };
  selectedDate?: string;
  minDate?: string;
  maxDate?: string;
  dragOffset: number;           // 0–100
  dragDirection: 'prev' | 'next' | null;
  isSnappingBack: boolean;
  showLeftArrow: boolean;
  showRightArrow: boolean;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onSelectDate: (dateStr: string) => void;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  calendarNavigationProps: React.HTMLAttributes<HTMLElement>;
}

function MonthGrid({ year, month, selectedDate, minDate, maxDate, onSelectDate }: {
  year: number; month: number; selectedDate?: string;
  minDate?: string; maxDate?: string; onSelectDate: (d: string) => void;
}) {
  const firstDay = new Date(year, month, 1).getDay();
  const total = new Date(year, month + 1, 0).getDate();
  const days: (number | null)[] = [...Array(firstDay).fill(null)];
  for (let i = 1; i <= total; i++) days.push(i);

  return (
    <div className="flex-shrink-0 px-1" style={{ width: '50%' }}>
      <div className="text-center font-semibold text-gray-900 py-2 mb-2">
        {format(new Date(year, month), 'MMMM yyyy')}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
          <div key={d} className="text-center text-xs font-semibold text-gray-500 py-1">{d}</div>
        ))}
        {days.map((day, idx) => {
          const dateStr = day
            ? `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            : null;
          const disabled = !!(day && dateStr && ((minDate && dateStr < minDate) || (maxDate && dateStr > maxDate)));
          const selected = !!(day && dateStr && selectedDate === dateStr && !disabled);
          return (
            <button
              key={idx}
              type="button"
              onClick={() => { if (day && dateStr && !disabled) onSelectDate(dateStr); }}
              disabled={disabled}
              className={`aspect-square text-sm rounded font-medium transition-colors
                ${day ? (disabled ? 'text-gray-300 cursor-not-allowed opacity-40' : 'hover:bg-purple-100 cursor-pointer text-gray-900') : ''}
                ${selected ? 'bg-purple-400 !text-white' : ''}`}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function CalendarPicker({
  calendarMonth, selectedDate, minDate, maxDate,
  dragOffset, dragDirection, isSnappingBack,
  showLeftArrow, showRightArrow,
  onPreviousMonth, onNextMonth, onSelectDate,
  header, footer, calendarNavigationProps,
}: CalendarPickerProps) {
  const { year, month } = calendarMonth;

  // Build the two-panel strip.
  // Going NEXT: [current | next],  strip starts at translateX(0%) and slides to translateX(-50%)
  // Going PREV: [prev | current],  strip starts at translateX(-50%) and slides to translateX(0%)
  const progress = dragOffset / 100; // 0→1

  let leftMonth: { year: number; month: number };
  let rightMonth: { year: number; month: number };
  let translatePct: number;

  if (dragDirection === 'next') {
    leftMonth = { year, month };
    rightMonth = shiftCalendarMonth({ year, month }, 1);
    translatePct = -progress * 50;          // 0% → -50%
  } else if (dragDirection === 'prev') {
    leftMonth = shiftCalendarMonth({ year, month }, -1);
    rightMonth = { year, month };
    translatePct = -50 + progress * 50;     // -50% → 0%
  } else {
    leftMonth = { year, month };
    rightMonth = { year, month };
    translatePct = 0;
  }

  // Transition only when committing (offset=100) or snapping back to rest.
  // offset=0 without snapping = teleport (no transition).
  const transition = (dragOffset >= 100 || isSnappingBack) ? 'transform 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)' : 'none';

  return (
    <div
      style={{ touchAction: 'pan-y' }}
      {...calendarNavigationProps}
    >
      {header}

      {/* Overlay arrows + sliding row scoped together */}
      <div className="relative overflow-hidden">
        {showLeftArrow && (
          <button
            type="button"
            onClick={onPreviousMonth}
            className="absolute left-0 top-0 bottom-0 w-12 flex items-center justify-center bg-gradient-to-r from-white/95 to-transparent z-10 text-gray-400 hover:text-purple-500 transition-colors"
          >
            <ChevronLeft className="w-7 h-7" />
          </button>
        )}
        {showRightArrow && (
          <button
            type="button"
            onClick={onNextMonth}
            className="absolute right-0 top-0 bottom-0 w-12 flex items-center justify-center bg-gradient-to-l from-white/95 to-transparent z-10 text-gray-400 hover:text-purple-500 transition-colors"
          >
            <ChevronRight className="w-7 h-7" />
          </button>
        )}

        <div className="flex items-start gap-1">
          <button type="button" onClick={onPreviousMonth} className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0 mt-1">←</button>

          <div className="flex-1 overflow-hidden">
            <div
              style={{
                display: 'flex',
                width: '200%',
                transform: `translateX(${translatePct}%)`,
                transition,
                willChange: 'transform',
              }}
            >
              <MonthGrid
                year={leftMonth.year} month={leftMonth.month}
                selectedDate={selectedDate} minDate={minDate} maxDate={maxDate}
                onSelectDate={onSelectDate}
              />
              <MonthGrid
                year={rightMonth.year} month={rightMonth.month}
                selectedDate={selectedDate} minDate={minDate} maxDate={maxDate}
                onSelectDate={onSelectDate}
              />
            </div>
          </div>

          <button type="button" onClick={onNextMonth} className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0 mt-1">→</button>
        </div>
      </div>

      {footer && <div className="mt-3">{footer}</div>}
    </div>
  );
}
