import React, { useState, useEffect } from 'react';
import { Clock, ShieldAlert, Sparkles, RefreshCw, Key, LogIn, ChevronRight, Award } from 'lucide-react';

// Get Unix timestamp of 23:59:59.999 on endDateStr in Tanzania local time (EAT, UTC+3)
export const getEATExpirationTimestamp = (endDateStr: string): number => {
  if (!endDateStr) return 0;
  const parts = endDateStr.split('-').map(Number);
  if (parts.length !== 3) return 0;
  const [year, month, day] = parts;
  // 23:59:59.999 EAT = 20:59:59.999 UTC
  return Date.UTC(year, month - 1, day, 20, 59, 59, 999);
};

// Get Unix timestamp of kickoff time in Tanzania local time (EAT, UTC+3)
export const getEATMatchKickoffTimestamp = (dateId: string, timeStr: string): number => {
  if (!dateId || !timeStr) return 0;
  // Split dates "YYYY-MM-DD"
  const dateParts = dateId.split('-').map(Number);
  // Split times "HH:MM"
  const cleanTime = timeStr.trim();
  const timeParts = cleanTime.split(':').map(Number);
  if (dateParts.length !== 3 || timeParts.length < 2) return 0;
  
  const [year, month, day] = dateParts;
  const [hour, minute] = timeParts;
  // EAT matches are 3 hours ahead of UTC, so UTC Hour = hour - 3
  return Date.UTC(year, month - 1, day, hour - 3, minute, 0, 0);
};

interface VipCountdownProps {
  vipEndDate?: string;
  isVip: boolean;
  onRedirectToPlans?: () => void;
  onExpirationTriggered?: () => void;
}

export const VipCountdown: React.FC<VipCountdownProps> = ({
  vipEndDate,
  isVip,
  onRedirectToPlans,
  onExpirationTriggered
}) => {
  const [timeLeft, setTimeLeft] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
    totalMs: number;
    isExpired: boolean;
  }>({ hours: 0, minutes: 0, seconds: 0, totalMs: 0, isExpired: true });

  const [hasTriggeredCallback, setHasTriggeredCallback] = useState(false);

  useEffect(() => {
    if (!isVip || !vipEndDate) {
      setTimeLeft({ hours: 0, minutes: 0, seconds: 0, totalMs: 0, isExpired: true });
      return;
    }

    const expirationTime = getEATExpirationTimestamp(vipEndDate);

    const updateTimer = () => {
      const now = Date.now();
      const diff = expirationTime - now;

      if (diff <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0, totalMs: 0, isExpired: true });
        if (onExpirationTriggered && !hasTriggeredCallback) {
          setHasTriggeredCallback(true);
          onExpirationTriggered();
        }
      } else {
        const hours = Math.floor(diff / 3600000);
        const minutes = Math.floor((diff % 3600000) / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        setTimeLeft({
          hours,
          minutes,
          seconds,
          totalMs: diff,
          isExpired: false
        });
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [vipEndDate, isVip, onExpirationTriggered, hasTriggeredCallback]);

  // Reset trigger callback flag if expiration date shifts
  useEffect(() => {
    setHasTriggeredCallback(false);
  }, [vipEndDate]);

  if (!isVip || !vipEndDate) return null;

  // Let's assume a 1-day subscription corresponds to 24 hours (86,400,000 ms)
  // We can calculate the percentage progress of the day
  const maxMs = 24 * 3600 * 1000;
  const percentageLeft = Math.min(100, Math.max(0, (timeLeft.totalMs / maxMs) * 100));

  // Render the Countdown interface
  return (
    <div className="w-full relative overflow-hidden rounded-[24px] bg-slate-950 border border-slate-900 shadow-2xl p-4.5" id="vip_countdown_container">
      {/* Background radial soft light overlay representing Tanzania theme or active vibe */}
      <div className={`absolute top-0 right-0 w-32 h-32 rounded-full mix-blend-screen filter blur-3xl opacity-15 pointer-events-none transition-all duration-700 ${
        timeLeft.isExpired 
          ? 'bg-rose-550' 
          : percentageLeft < 15 
            ? 'bg-amber-500 animate-pulse' 
            : 'bg-emerald-500'
      }`} />

      {timeLeft.isExpired ? (
        /* EXPIRATION BANNER WITH HIGH INTENSITY ERROR ANIMATION */
        <div className="flex flex-col items-center text-center p-3.5 space-y-4 animate-fade-in" id="subscription_expired_view">
          <div className="relative">
            {/* Glowing warning ring */}
            <div className="absolute -inset-1 rounded-full bg-rose-500 opacity-60 blur-md animate-pulse"></div>
            <div className="relative w-12 h-12 rounded-full bg-slate-950 border border-rose-500 flex items-center justify-center text-rose-500">
              <ShieldAlert className="w-6 h-6 animate-bounce" />
            </div>
          </div>
          
          <div className="space-y-1">
            <span className="text-[8.5px] font-mono font-black text-rose-500 bg-rose-500/10 border border-rose-500/25 px-2.5 py-0.5 rounded-full uppercase tracking-widest">
              Membership Terminated
            </span>
            <h3 className="text-sm font-sans font-black text-white uppercase tracking-tight">
              VIP Subscription Expired
            </h3>
            <p className="text-slate-400 text-[11px] max-w-[270px] mx-auto leading-relaxed">
              Premium access automatically ended at <span className="text-rose-400 font-bold">23:59 PM</span> Tanzania time. Subscribe again to unlock today's guaranteed tips!
            </p>
          </div>

          <button
            type="button"
            onClick={onRedirectToPlans}
            className="w-full max-w-[240px] py-2 px-4 rounded-xl text-[10px] font-black text-slate-950 bg-gradient-to-r from-[#F5C400] to-[#E2B200] hover:from-[#E2B200] hover:to-[#CF9F00] shadow-[0_4px_15px_rgba(245,196,0,0.3)] transition transform active:scale-97 flex items-center justify-center gap-1.5 uppercase tracking-wider cursor-pointer font-sans"
          >
            <span>Renew VIP Plan</span>
            <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        </div>
      ) : (
        /* ACTIVE HIGH TECH TICKING COUNTDOWN */
        <div className="flex flex-col gap-3.5 animate-fade-in" id="subscription_active_countdown_view">
          {/* Active status top info bar */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-900">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  percentageLeft < 15 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${
                  percentageLeft < 15 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}></span>
              </span>
              <span className="text-[9.5px] font-heading font-black text-slate-200 uppercase tracking-wider">
                VIP Access Active
              </span>
            </div>
            
            <div className="flex items-center gap-1.5 font-mono text-[9px] text-slate-400">
              <Clock className="w-3.5 h-3.5 text-[#F5C400]" />
              EAT (Tanzania Time)
            </div>
          </div>

          {/* Core countdown digit display block */}
          <div className="flex items-center justify-center gap-3 py-2.5 bg-[#0B0F1A]/80 border border-slate-900 rounded-2xl relative overflow-hidden">
            <div className="flex flex-col items-center">
              <span className="text-xl font-mono font-black text-white tracking-widest leading-none">
                {String(timeLeft.hours).padStart(2, '0')}
              </span>
              <span className="text-[7.5px] font-mono uppercase tracking-widest text-[#F5C400] mt-1 font-bold">Hours</span>
            </div>
            
            <span className="text-lg font-mono font-black text-[#F5C400]/40 animate-pulse -translate-y-1">:</span>

            <div className="flex flex-col items-center">
              <span className="text-xl font-mono font-black text-white tracking-widest leading-none">
                {String(timeLeft.minutes).padStart(2, '0')}
              </span>
              <span className="text-[7.5px] font-mono uppercase tracking-widest text-[#F5C400] mt-1 font-bold">Mins</span>
            </div>

            <span className="text-lg font-mono font-black text-[#F5C400]/40 animate-pulse -translate-y-1">:</span>

            <div className="flex flex-col items-center">
              <span className="text-xl font-mono font-black text-[#F5C450] tracking-widest leading-none drop-shadow-[0_0_6px_rgba(245,196,0,0.5)]">
                {String(timeLeft.seconds).padStart(2, '0')}
              </span>
              <span className="text-[7.5px] font-mono uppercase tracking-widest text-[#F5C400] mt-1 font-bold">Secs</span>
            </div>
          </div>

          {/* Sleek Progress Indicator bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[8px] font-mono uppercase text-slate-500">
              <span>Access Progression</span>
              <span className={percentageLeft < 15 ? 'text-amber-400 font-bold animate-pulse' : 'text-slate-350'}>
                {timeLeft.hours}H left tonight
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-900 border border-slate-950 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-1000 ${
                  percentageLeft < 15 
                    ? 'bg-gradient-to-r from-amber-500 to-rose-500' 
                    : 'bg-gradient-to-r from-emerald-500 to-teal-400'
                }`}
                style={{ width: `${percentageLeft}%` }}
              />
            </div>
          </div>

          {/* Expiration Note Footer */}
          <div className="text-center">
            <p className="text-[9px] text-[#F5C400]/70 font-mono italic">
              ⚡ Expires at 23:59 PM today ({vipEndDate}) EAT
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
