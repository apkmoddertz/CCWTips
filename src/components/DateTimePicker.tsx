import React, { useState, useEffect } from 'react';
import { Calendar, Clock, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface DateTimeRowPickerProps {
  dateId: string; // YYYY-MM-DD
  timeString: string; // HH:MM (24h format)
  onDateTimeChange: (newDateId: string, newTimeString: string) => void;
}

const MONTH_NAMES_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTH_NAMES_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const WEEKDAY_NAMES = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

// Format ISO/EAT string (YYYY-MM-DD) to descriptive "Wed, Jun 3"
const formatDisplayDateString = (dateId: string): string => {
  const parts = dateId.split('-').map(Number);
  if (parts.length !== 3) return dateId;
  const [y, m, d] = parts;
  const dateObj = new Date(Date.UTC(y, m - 1, d));
  const weekDay = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dateObj.getUTCDay()];
  const monthStr = MONTH_NAMES_SHORT[dateObj.getUTCMonth()];
  return `${weekDay}, ${monthStr} ${d}`;
};

// Formats HH:MM (24-hour style, e.g. "18:00") into AM/PM string ("06:00 PM")
const formatDisplayTimeString = (time24h: string): string => {
  const parts = time24h.split(':').map(Number);
  if (parts.length !== 2) return time24h;
  const [h, m] = parts;
  const period = h >= 12 ? 'PM' : 'AM';
  const displayHour = h % 12 === 0 ? 12 : h % 12;
  const displayMinute = String(m).padStart(2, '0');
  const displayHourStr = String(displayHour).padStart(2, '0');
  return `${displayHourStr}:${displayMinute} ${period}`;
};

export const DateTimeRowPicker: React.FC<DateTimeRowPickerProps> = ({
  dateId,
  timeString,
  onDateTimeChange,
}) => {
  // Modal active states
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);

  // --- CALENDAR DIALOG INTERNAL STATE ---
  const [calYear, setCalYear] = useState(2026);
  const [calMonth, setCalMonth] = useState(5); // 0-11, default June (5)
  const [tempSelectedDate, setTempSelectedDate] = useState(dateId);

  // Initialize calendar month/year based on incoming dateId
  useEffect(() => {
    const parts = dateId.split('-').map(Number);
    if (parts.length === 3) {
      setCalYear(parts[0]);
      setCalMonth(parts[1] - 1);
      setTempSelectedDate(dateId);
    }
  }, [dateId]);

  // Handle building days array for current monthly calendar grid
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const startDayOfWeek = new Date(calYear, calMonth, 1).getDay(); // day code of the 1st
  const prevMonthDays = new Date(calYear, calMonth, 0).getDate();

  const calendarDaysList: { dayNum: number; currentMonth: boolean; dateString: string }[] = [];

  // 1. Padding from previous month
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const dVal = prevMonthDays - i;
    const prevMonthIdx = calMonth === 0 ? 11 : calMonth - 1;
    const prevYearVal = calMonth === 0 ? calYear - 1 : calYear;
    const dateStr = `${prevYearVal}-${String(prevMonthIdx + 1).padStart(2, '0')}-${String(dVal).padStart(2, '0')}`;
    calendarDaysList.push({ dayNum: dVal, currentMonth: false, dateString: dateStr });
  }

  // 2. Active month days
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    calendarDaysList.push({ dayNum: d, currentMonth: true, dateString: dateStr });
  }

  // 3. Padding from next month
  const totalGridCells = 42; // standard grid layout
  const nextMonthPadding = totalGridCells - calendarDaysList.length;
  for (let d = 1; d <= nextMonthPadding; d++) {
    const nextMonthIdx = calMonth === 11 ? 0 : calMonth + 1;
    const nextYearVal = calMonth === 11 ? calYear + 1 : calYear;
    const dateStr = `${nextYearVal}-${String(nextMonthIdx + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    calendarDaysList.push({ dayNum: d, currentMonth: false, dateString: dateStr });
  }

  // Prev & Next Month handlers
  const handlePrevMonth = () => {
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear((p) => p - 1);
    } else {
      setCalMonth((p) => p - 1);
    }
  };

  const handleNextMonth = () => {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear((p) => p + 1);
    } else {
      setCalMonth((p) => p + 1);
    }
  };


  // --- TIME DIALOG INTERNAL STATE ---
  // Default values
  const [timeHour, setTimeHour] = useState(18); // 24h style (0-23)
  const [timeMinute, setTimeMinute] = useState(0); // (0-59)
  const [activeSegmentMode, setActiveSegmentMode] = useState<'hour' | 'minute'>('hour');
  
  // Sync when timeString props changes
  useEffect(() => {
    const parts = timeString.split(':').map(Number);
    if (parts.length === 2) {
      setTimeHour(parts[0]);
      setTimeMinute(parts[1]);
    }
  }, [timeString]);

  const timePeriod: 'AM' | 'PM' = timeHour >= 12 ? 'PM' : 'AM';
  const displayHourVal = timeHour % 12 === 0 ? 12 : timeHour % 12;

  // Toggle AM/PM period
  const handleSetPeriod = (p: 'AM' | 'PM') => {
    if (p === 'AM' && timeHour >= 12) {
      setTimeHour((prev) => prev - 12);
    } else if (p === 'PM' && timeHour < 12) {
      setTimeHour((prev) => prev + 12);
    }
  };

  // Click selection directly on our custom dial options
  const handleSelectHourVal = (hVal: number) => {
    let rawHour = hVal;
    if (timePeriod === 'PM') {
      rawHour = hVal === 12 ? 12 : hVal + 12;
    } else {
      rawHour = hVal === 12 ? 0 : hVal;
    }
    setTimeHour(rawHour);
    // Auto shift to minute segment on tap
    setActiveSegmentMode('minute');
  };

  const handleSelectMinuteVal = (mVal: number) => {
    setTimeMinute(mVal);
  };

  // Coordinates array for numbers layout on custom radial clock face dial (Radius = R)
  // Let's position things beautifully
  const hoursPositions = Array.from({ length: 12 }, (_, i) => {
    const h = i + 1;
    // 30 degrees per hour, minus 90 degrees offset to start 12 precisely at the top peak
    const angleRad = ((h * 30 - 90) * Math.PI) / 180;
    const rPercent = 38; // radius percentage offset from origin
    const leftX = 50 + rPercent * Math.cos(angleRad);
    const topY = 50 + rPercent * Math.sin(angleRad);
    return { value: h, left: `${leftX}%`, top: `${topY}%`, angleRad };
  });

  const minutesPositions = Array.from({ length: 12 }, (_, i) => {
    const mValue = i * 5;
    const labelVal = i === 0 ? 12 : i; // Placement sits at same angular slots as hours
    const angleRad = ((labelVal * 30 - 90) * Math.PI) / 180;
    const rPercent = 38;
    const leftX = 50 + rPercent * Math.cos(angleRad);
    const topY = 50 + rPercent * Math.sin(angleRad);
    return { value: mValue, left: `${leftX}%`, top: `${topY}%`, angleRad };
  });

  // Calculate current radial arm angle degrees for the dynamic pointing indicator dial line
  const activeAngleRad = () => {
    if (activeSegmentMode === 'hour') {
      const activeH = displayHourVal;
      return ((activeH * 30 - 90) * Math.PI) / 180;
    } else {
      // Find closest index for minutes to match 12 points, or free-map it
      const activeM = timeMinute;
      // 360 degrees / 60 minutes = 6 degrees per minute. Offset by -90 to start top center
      return ((activeM * 6 - 90) * Math.PI) / 180;
    }
  };

  const pointerAngleGrad = () => {
    const angle = activeAngleRad() * (180 / Math.PI);
    return `${angle}deg`;
  };

  // Modal confirm handlers
  const handleConfirmDateSelection = () => {
    onDateTimeChange(tempSelectedDate, timeString);
    setIsDatePickerOpen(false);
  };

  const handleConfirmTimeSelection = () => {
    const formattedHour = String(timeHour).padStart(2, '0');
    const formattedMinute = String(timeMinute).padStart(2, '0');
    onDateTimeChange(dateId, `${formattedHour}:${formattedMinute}`);
    setIsTimePickerOpen(false);
  };

  return (
    <div className="space-y-2">
      <label className="block text-[8.5px] text-slate-400 font-extrabold uppercase tracking-wider mb-1">
        Date & Kick-Off Period
      </label>

      {/* COMPACT BOTH-IN-ONE ROW VIEW WITH NEON EMBELLISHMENT */}
      <div className="grid grid-cols-2 gap-2.5">
        
        {/* Row Element A: Date Selector Trigger Button */}
        <button
          type="button"
          onClick={() => setIsDatePickerOpen(true)}
          className="flex items-center justify-between bg-[#111625] border border-slate-700/85 hover:border-[#10B981]/50 p-2.5 rounded-xl text-left transition text-white active:scale-97 cursor-pointer group"
        >
          <div className="min-w-0 flex-1">
            <span className="block text-[7.5px] font-mono text-slate-450 uppercase uppercase leading-none mb-1">Select Date</span>
            <span className="block text-[11px] font-black tracking-tight text-slate-200 truncate group-hover:text-emerald-450">
              {formatDisplayDateString(dateId)}
            </span>
          </div>
          <Calendar className="w-4.5 h-4.5 text-slate-500 group-hover:text-emerald-400 transition ml-2 flex-shrink-0" />
        </button>

        {/* Row Element B: Time Selector Trigger Button */}
        <button
          type="button"
          onClick={() => setIsTimePickerOpen(true)}
          className="flex items-center justify-between bg-[#111625] border border-slate-700/85 hover:border-[#10B981]/50 p-2.5 rounded-xl text-left transition text-white active:scale-97 cursor-pointer group"
        >
          <div className="min-w-0 flex-1">
            <span className="block text-[7.5px] font-mono text-slate-450 uppercase leading-none mb-1">Kick-off Time</span>
            <span className="block text-[11px] font-black tracking-tight text-slate-200 truncate group-hover:text-emerald-450">
              {formatDisplayTimeString(timeString)}
            </span>
          </div>
          <Clock className="w-4.5 h-4.5 text-slate-500 group-hover:text-emerald-400 transition ml-2 flex-shrink-0" />
        </button>

      </div>

      {/* =========================================
          STUNNING POP-UP DIALOG MODAL: SELECT DATE
          ========================================= */}
      {isDatePickerOpen && (
        <div className="fixed inset-0 bg-[#04060b]/90 backdrop-blur-sm z-55 flex items-center justify-center p-4 select-none animate-fade-in">
          <div className="bg-[#121624] border border-slate-800/90 w-full max-w-[300px] rounded-[24px] overflow-hidden shadow-2xl p-5 flex flex-col relative text-slate-100">
            
            {/* Modal TOP Display Header exactly as in screenshots */}
            <div className="mb-4">
              <span className="block text-[10px] font-extrabold uppercase tracking-wider text-[#10B981]">
                SELECT DATE
              </span>
              <h3 className="text-xl font-heading font-black text-white leading-tight mt-1">
                {formatDisplayDateString(tempSelectedDate)}
              </h3>
            </div>

            {/* MONTH SWITCHER AND CALENDAR PANEL */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-black text-white tracking-wide">
                  {MONTH_NAMES_FULL[calMonth]} {calYear}
                </span>
                
                {/* Arrow selectors */}
                <div className="flex items-center gap-1.5 text-slate-350">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    className="p-1 h-7 w-7 rounded-lg hover:bg-slate-800 border border-slate-800 transition flex items-center justify-center active:scale-90 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNextMonth}
                    className="p-1 h-7 w-7 rounded-lg hover:bg-slate-800 border border-slate-800 transition flex items-center justify-center active:scale-90 cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Grid Header (S M T W T F S) */}
              <div className="grid grid-cols-7 gap-1 text-center">
                {WEEKDAY_NAMES.map((name, idx) => (
                  <span key={idx} className="text-[10px] font-mono text-slate-500 font-bold uppercase py-1">
                    {name}
                  </span>
                ))}
              </div>

              {/* Grid Cells of Days */}
              <div className="grid grid-cols-7 gap-1 text-center font-mono">
                {calendarDaysList.map((dayItem, idx) => {
                  const isSelected = tempSelectedDate === dayItem.dateString;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setTempSelectedDate(dayItem.dateString)}
                      className={`relative aspect-square rounded-full text-[11px] font-bold flex items-center justify-center transition cursor-pointer ${
                        !dayItem.currentMonth ? 'text-slate-650 opacity-40' : 'text-slate-100'
                      } ${
                        isSelected 
                          ? 'bg-[#10B981] text-white font-extrabold shadow-lg shadow-[#10B981]/20' 
                          : 'hover:bg-slate-800'
                      }`}
                    >
                      {dayItem.dayNum}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bottom Footer Actions (Cancel, OK) */}
            <div className="flex items-center justify-end gap-3 mt-5 pt-3 border-t border-slate-800/40 text-xs uppercase font-extrabold">
              <button
                type="button"
                onClick={() => setIsDatePickerOpen(false)}
                className="text-slate-450 hover:text-slate-200 px-3 py-1.5 cursor-pointer font-sans"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDateSelection}
                className="text-[#10B981] hover:text-emerald-400 px-3 py-1.5 cursor-pointer font-sans"
              >
                OK
              </button>
            </div>

          </div>
        </div>
      )}

      {/* =========================================
          STUNNING POP-UP DIALOG MODAL: SELECT TIME
          ========================================= */}
      {isTimePickerOpen && (
        <div className="fixed inset-0 bg-[#04060b]/90 backdrop-blur-sm z-55 flex items-center justify-center p-4 select-none animate-fade-in">
          <div className="bg-[#121624] border border-slate-800/90 w-full max-w-[300px] rounded-[24px] overflow-hidden shadow-2xl p-5 flex flex-col relative text-slate-100">
            
            {/* Modal TOP Display Header exactly as in screenshots */}
            <div className="mb-4">
              <span className="block text-[10px] font-extrabold uppercase tracking-wider text-[#10B981]">
                SELECT TIME
              </span>
            </div>

            {/* Time Digit block segment in center exactly like screenshot */}
            <div className="flex items-center gap-2 justify-center mb-5">
              
              {/* Digit Box - HH:MM Group Box with highlighted active selectors */}
              <div className="flex items-center bg-[#0d101a] border border-slate-800 rounded-2xl p-2 px-3 gap-1 shadow-inner">
                {/* Hours Box */}
                <button
                  type="button"
                  onClick={() => setActiveSegmentMode('hour')}
                  className={`text-2xl font-black font-heading rounded-lg p-1 px-2.5 transition cursor-pointer ${
                    activeSegmentMode === 'hour'
                      ? 'bg-[#10B981]/15 border border-[#10B981]/45 text-[#10B981]'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {String(displayHourVal).padStart(2, '0')}
                </button>

                {/* Separator Colons */}
                <span className="text-xl font-extrabold text-slate-500 animate-pulse px-0.5">:</span>

                {/* Minutes Box */}
                <button
                  type="button"
                  onClick={() => setActiveSegmentMode('minute')}
                  className={`text-2xl font-black font-heading rounded-lg p-1 px-2.5 transition cursor-pointer ${
                    activeSegmentMode === 'minute'
                      ? 'bg-[#10B981]/15 border border-[#10B981]/45 text-[#10B981]'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {String(timeMinute).padStart(2, '0')}
                </button>
              </div>

              {/* AM/PM Shift card on the right side as in design */}
              <div className="flex flex-col gap-1 bg-[#0d101a] border border-slate-800 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => handleSetPeriod('AM')}
                  className={`px-2.5 py-1 text-[9.5px] font-black uppercase rounded-lg transition-transform active:scale-95 cursor-pointer ${
                    timePeriod === 'AM'
                      ? 'bg-[#10B981] text-white font-black'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  AM
                </button>
                <button
                  type="button"
                  onClick={() => handleSetPeriod('PM')}
                  className={`px-2.5 py-1 text-[9.5px] font-black uppercase rounded-lg transition-transform active:scale-95 cursor-pointer ${
                    timePeriod === 'PM'
                      ? 'bg-[#10B981] text-white font-black'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  PM
                </button>
              </div>

            </div>

            {/* RADIAL CLOCK FACE CONTROLLER STYLED PERFECTLY */}
            <div className="relative w-48 h-48 rounded-full bg-[#0d101a] border border-slate-800/80 mx-auto select-none overflow-hidden my-1 shadow-md">
              
              {/* Central Clock Pivot Point */}
              <div className="absolute top-[23.5/2] left-[23.5/2] transform -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-[#10B981] rounded-full z-15" />

              {/* Dynamic pointer line showing current set angle */}
              <div 
                className="absolute top-1/2 left-1/2 h-1 bg-[#10B981] origin-left z-10 transition-transform duration-300"
                style={{
                  width: '38%',
                  transform: `translateY(-50%) rotate(${activeSegmentMode === 'hour' ? (displayHourVal * 30 - 90) : (timeMinute * 6 - 90)}deg)`
                }}
              />

              {/* HOUR DIGITS ON RADIAL SLOT SKELETON */}
              {activeSegmentMode === 'hour' && (
                <div className="absolute inset-0 z-12">
                  {hoursPositions.map((hourPos) => {
                    const isSelected = displayHourVal === hourPos.value;
                    return (
                      <button
                        key={hourPos.value}
                        type="button"
                        onClick={() => handleSelectHourVal(hourPos.value)}
                        className={`absolute w-7.5 h-7.5 rounded-full text-[10.5px] font-extrabold flex items-center justify-center transform -translate-x-1/2 -translate-y-1/2 transition active:scale-90 cursor-pointer ${
                          isSelected 
                            ? 'bg-[#10B981] text-white font-black shadow-md border border-[#10B981]/50 scale-105 z-15' 
                            : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                        }`}
                        style={{ left: hourPos.left, top: hourPos.top }}
                      >
                        {hourPos.value}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* MINUTE DIGITS ON RADIAL SLOPE CHANNELS */}
              {activeSegmentMode === 'minute' && (
                <div className="absolute inset-0 z-12">
                  {minutesPositions.map((minPos) => {
                    // Highlight increments of 5 if selected
                    const isSelected = timeMinute === minPos.value;
                    return (
                      <button
                        key={minPos.value}
                        type="button"
                        onClick={() => handleSelectMinuteVal(minPos.value)}
                        className={`absolute w-7.5 h-7.5 rounded-full text-[10px] font-mono flex items-center justify-center transform -translate-x-1/2 -translate-y-1/2 transition active:scale-90 cursor-pointer ${
                          isSelected 
                            ? 'bg-[#10B981] text-white font-black shadow-md border border-[#10B981]/50 scale-105 z-15' 
                            : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                        }`}
                        style={{ left: minPos.left, top: minPos.top }}
                      >
                        {String(minPos.value).padStart(2, '0')}
                      </button>
                    );
                  })}
                </div>
              )}

            </div>

            {/* Bottom Footer Actions (Cancel, OK) */}
            <div className="flex items-center justify-end gap-3 mt-5 pt-3 border-t border-slate-800/40 text-xs uppercase font-extrabold">
              <button
                type="button"
                onClick={() => setIsTimePickerOpen(false)}
                className="text-slate-450 hover:text-slate-200 px-3 py-1.5 cursor-pointer font-sans"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmTimeSelection}
                className="text-[#10B981] hover:text-emerald-400 px-3 py-1.5 cursor-pointer font-sans"
              >
                OK
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
