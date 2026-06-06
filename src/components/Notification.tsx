import React, { useEffect } from 'react';
import { Bell, CheckCircle, Info, Sparkles } from 'lucide-react';

interface NotificationProps {
  message: string;
  type: 'success' | 'info';
  onClose: () => void;
}

export const Notification: React.FC<NotificationProps> = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 4500);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="absolute top-24 left-4 right-4 z-50 mx-auto max-w-[340px] bg-[#0C1224]/95 border-2 border-[#F5C400]/40 rounded-2xl p-4 shadow-2xl shadow-black/80 flex items-start space-x-3 backdrop-blur-md animate-fade-in">
      {/* Decorative pulse glow */}
      <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-[#F5C400]/20 to-orange-500/10 opacity-60 blur-md pointer-events-none"></div>

      <div className="relative flex-shrink-0 mt-0.5">
        {type === 'success' ? (
          <div className="p-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle className="w-5 h-5" />
          </div>
        ) : (
          <div className="p-1 rounded-full bg-[#F5C400]/10 text-[#F5C400] border border-[#F5C400]/20">
            <Info className="w-5 h-5" />
          </div>
        )}
      </div>

      <div className="relative flex-1 min-w-0 pr-1 select-none">
        <div className="font-sans font-black text-white text-xs uppercase tracking-wider flex items-center gap-1">
          {type === 'success' ? 'Upgrade Completed!' : 'Applet Notice'}
          {type === 'success' && <Sparkles className="w-3.5 h-3.5 text-[#F5C400] animate-pulse" />}
        </div>
        <p className="font-sans font-medium text-slate-300 text-[11px] mt-1 pr-1 leading-relaxed">
          {message}
        </p>
      </div>

      <button
        onClick={onClose}
        className="relative flex-shrink-0 text-slate-500 hover:text-slate-300 text-xs font-bold leading-none p-1"
      >
        ✕
      </button>
    </div>
  );
};
