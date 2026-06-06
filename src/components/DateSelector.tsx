import React, { useEffect, useRef } from 'react';
import { DateItem } from '../types';

interface DateSelectorProps {
  dates: DateItem[];
  selectedDateId: string;
  onSelectDate: (id: string) => void;
  matchCounts?: Record<string, number>;
  activeTab?: string;
}

// EAT timezone is UTC+3
const getEATDateStr = (date: Date): string => {
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  const eatDate = new Date(utc + (3 * 3600000));
  const yyyy = eatDate.getFullYear();
  const mm = String(eatDate.getMonth() + 1).padStart(2, '0');
  const dd = String(eatDate.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const getRelativeDayName = (dateId: string): string | null => {
  const todayObj = new Date();
  const todayStr = getEATDateStr(todayObj);

  const yesterdayObj = new Date();
  yesterdayObj.setDate(yesterdayObj.getDate() - 1);
  const yesterdayStr = getEATDateStr(yesterdayObj);

  const tomorrowObj = new Date();
  tomorrowObj.setDate(tomorrowObj.getDate() + 1);
  const tomorrowStr = getEATDateStr(tomorrowObj);

  if (dateId === todayStr) return 'TODAY';
  if (dateId === yesterdayStr) return 'YESTERDAY';
  if (dateId === tomorrowStr) return 'TOMORROW';
  return null;
};

export const DateSelector: React.FC<DateSelectorProps> = ({
  dates,
  selectedDateId,
  onSelectDate,
  matchCounts = {},
  activeTab,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!selectedDateId || !containerRef.current) return;

    let timer: NodeJS.Timeout;
    let attempts = 0;

    const tryScroll = () => {
      const activeElement = document.getElementById(`date-pill-${selectedDateId}`);
      if (activeElement && containerRef.current) {
        const container = containerRef.current;
        const containerWidth = container.clientWidth;
        const activeOffsetLeft = activeElement.offsetLeft;
        const activeWidth = activeElement.clientWidth;

        const targetScrollLeft = Math.max(0, activeOffsetLeft - (containerWidth / 2) + (activeWidth / 2));

        if (animFrameRef.current) {
          cancelAnimationFrame(animFrameRef.current);
        }

        const start = container.scrollLeft;
        const change = targetScrollLeft - start;
        const duration = 150; // Ultra-snappy 150ms speed
        let startTime: number | null = null;

        const step = (timestamp: number) => {
          if (!startTime) startTime = timestamp;
          const elapsed = timestamp - startTime;
          const progress = Math.min(elapsed / duration, 1);
          
          // Elegant Cubic ease-out (fast start, smooth deceleration)
          const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
          container.scrollLeft = start + change * easeOutCubic(progress);

          if (progress < 1) {
            animFrameRef.current = requestAnimationFrame(step);
          } else {
            animFrameRef.current = null;
          }
        };

        animFrameRef.current = requestAnimationFrame(step);
      } else if (attempts < 8) {
        attempts++;
        timer = setTimeout(tryScroll, 25);
      }
    };

    timer = setTimeout(tryScroll, 10);

    return () => {
      clearTimeout(timer);
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [selectedDateId, dates, activeTab]);

  return (
    <div className="w-full pt-1.5 pb-0.5 select-none">
      {/* Scrollable Container with custom scrollbar hidden */}
      <div 
        ref={containerRef}
        className="flex space-x-3.5 overflow-x-auto pb-1 px-4 scrollbar-none snap-x snap-mandatory"
      >
        {dates.map((date) => {
          const isSelected = date.id === selectedDateId;
          const count = matchCounts[date.id] || 0;
          const relativeLabel = getRelativeDayName(date.id);

          return (
            <button
              key={date.id}
              id={`date-pill-${date.id}`}
              onClick={() => onSelectDate(date.id)}
              className="flex-none snap-start relative w-[74px] h-[108px] overflow-visible focus:outline-none group cursor-pointer"
            >
              {/* Outer scale animations on selection or group hover */}
              <div className={`absolute top-0 left-0 w-full h-[82px] rounded-[24px] transition-all duration-300 flex flex-col items-center justify-start pt-3.5 px-1 ${
                isSelected
                  ? 'bg-gradient-to-b from-[#13192B] to-[#0A0D18] border-2 border-[#F5C400] shadow-[0_4px_16px_rgba(245,196,0,0.15)] scale-[1.02]'
                  : 'bg-[#101424] border border-[#1E2538] group-hover:border-[#2A3550] group-hover:bg-[#12182c]'
              }`}>
                {/* Inner highlight overlay for the active day */}
                {isSelected && (
                  <div className="absolute inset-0 rounded-[22px] bg-gradient-to-b from-[#F5C400]/10 to-transparent pointer-events-none" />
                )}

                {/* Relative Label or Month */}
                <div className="text-center select-none flex flex-col items-center z-10">
                  {relativeLabel ? (
                    <span className={`block text-[8px] font-black tracking-widest uppercase px-1.5 py-0.5 rounded-md leading-none ${
                      isSelected ? 'bg-[#F5C400]/15 text-[#F5C400]' : 'text-slate-500 bg-slate-900/40'
                    }`}>
                      {relativeLabel}
                    </span>
                  ) : (
                    <span className={`block text-[9px] font-extrabold tracking-wide uppercase leading-none ${
                      isSelected ? 'text-[#F5C400]' : 'text-slate-500'
                    }`}>
                      {date.month}
                    </span>
                  )}
                  
                  <span className={`block text-[11px] font-black tracking-wider uppercase mt-1 ${
                    isSelected ? 'text-white' : 'text-slate-400'
                  }`}>
                    {date.dayName}
                  </span>
                </div>

                {/* Day Number Circle - Overlapping the bottom edge perfectly at its lateral center */}
                <div className="absolute bottom-0 translate-y-1/2 z-20">
                  {isSelected ? (
                    /* Active State Circle with separated glow layer */
                    <div className="relative flex items-center justify-center w-[44px] h-[44px] select-none scale-[1.02] transition-transform">
                      {/* Soft outward glow behind the circle */}
                      <div className="absolute inset-[-4px] bg-[#F5C400]/22 rounded-full blur-[6px] pointer-events-none" />
                      
                      {/* 100% Vector-Sharp Solid Circle Container */}
                      <div className="absolute inset-0 bg-[#F5C400] rounded-full flex items-center justify-center shadow-lg shadow-black/40">
                        <span className="text-sm tracking-tight leading-none font-sans font-black text-black">
                          {date.dayNumber}
                        </span>
                      </div>
                    </div>
                  ) : (
                    /* Inactive State Circle - No glow, matching the card elements */
                    <div className="relative flex items-center justify-center w-[40px] h-[40px] rounded-full border border-[#1E2538] bg-[#141A2E] text-slate-300 font-extrabold select-none transition-all group-hover:border-[#2A3550] group-hover:bg-[#182038] group-hover:text-white">
                      <span className="text-sm tracking-tight leading-none font-sans">
                        {date.dayNumber}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Day Counts Badge displayed absolute to the button wrapper */}
              {count > 0 && (
                <span className={`absolute -top-1 -right-1 px-2 py-0.5 rounded-full text-[9px] font-sans font-black shadow-lg border transition-all z-30 ${
                  isSelected
                    ? 'bg-[#F5C400] text-black border-[#F5C400]/40 shadow-[#F5C400]/20'
                    : 'bg-[#181F33] text-slate-300 border-[#252F4A]'
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
