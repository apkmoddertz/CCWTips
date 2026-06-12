import React, { useState, useEffect } from 'react';
import { MatchTip } from '../types';
import { Check, X, Clock, Edit2, CheckSquare, Trash2, Gem, Bookmark, Shield, Flame, Copy } from 'lucide-react';
import { DateTimeRowPicker } from './DateTimePicker';
import { getEATMatchKickoffTimestamp } from './VipCountdown';

interface MatchCardProps {
  match: MatchTip;
  isAdminActive: boolean;
  isVipUnlocked: boolean;
  onRedirectToPlans: () => void;
  onUpdateMatch?: (id: string, updatedFields: Partial<MatchTip>) => void;
  onDeleteMatch?: (id: string) => void;
  onDuplicateMatch?: (match: MatchTip) => void;
  isFollowed?: boolean;
  onToggleFollow?: () => void;
}

const PremiumShieldCrownDiamondIcon: React.FC<{ className?: string }> = ({ className = "w-4 h-4" }) => {
  return (
    <svg 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      className={className}
    >
      <defs>
        <linearGradient id="premiumGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFAD4" />
          <stop offset="35%" stopColor="#F5C400" />
          <stop offset="70%" stopColor="#AD8000" />
          <stop offset="100%" stopColor="#F5C400" />
        </linearGradient>
      </defs>
      
      {/* Padlock Shackle for the Lock look */}
      <path 
        d="M8.5 8.5V5.5a3.5 3.5 0 0 1 7 0v3" 
        stroke="url(#premiumGoldGrad)" 
        strokeWidth="1.8" 
        strokeLinecap="round"
      />

      {/* High-end Fintech Shield Background silhouette */}
      <path 
        d="M12 21.5s7-3.5 7-9.5V8.5l-7-3-7 3v4c0 6 7 9.5 7 9.5z" 
        stroke="url(#premiumGoldGrad)" 
        strokeWidth="1.8" 
        strokeLinecap="round" 
        strokeLinejoin="round"
        fill="rgba(9,12,23,0.85)"
      />
      
      {/* Elegant Crown overlay */}
      <path 
        d="M8.5 11l1.5 1 2-2.5 2 2.5 1.5-1v3h-7V11z" 
        fill="url(#premiumGoldGrad)"
        stroke="url(#premiumGoldGrad)"
        strokeWidth="0.4"
        strokeLinejoin="round"
      />
      
      {/* Precision cut Diamond emblem at the core */}
      <path 
        d="M12 13.5l2.25 2.25-2.25 2.25-2.25-2.25 2.25-2.25z" 
        fill="none"
        stroke="url(#premiumGoldGrad)"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export const MatchCard: React.FC<MatchCardProps> = ({
  match,
  isAdminActive,
  isVipUnlocked,
  onRedirectToPlans,
  onUpdateMatch,
  onDeleteMatch,
  onDuplicateMatch,
  isFollowed = false,
  onToggleFollow,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editHome, setEditHome] = useState(match.homeTeam);
  const [editAway, setEditAway] = useState(match.awayTeam);
  const [editTime, setEditTime] = useState(match.time);
  const [editPred, setEditPred] = useState(match.prediction);
  const [editOdds, setEditOdds] = useState(match.odds?.toString() || '');
  const [editType, setEditType] = useState(match.type);
  const [editStatus, setEditStatus] = useState(match.status);
  const [editDateId, setEditDateId] = useState(match.dateId);

  // Local ticker to keep track of precise live time
  const [currentCardTime, setCurrentCardTime] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentCardTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Compute if match is currently live (between kickoff and 90 mins later) in EAT (UTC+3)
  const kickoffTime = getEATMatchKickoffTimestamp(match.dateId, match.time);
  const isMatchCurrentlyLive = match.status === 'pending' && kickoffTime > 0 && currentCardTime >= kickoffTime && currentCardTime < kickoffTime + (90 * 60 * 1000); // 90 mins = 5400000ms

  const handleStartEditing = () => {
    setEditHome(match.homeTeam);
    setEditAway(match.awayTeam);
    setEditTime(match.time);
    setEditPred(match.prediction);
    setEditOdds(match.odds?.toString() || '');
    setEditType(match.type);
    setEditStatus(match.status);
    setEditDateId(match.dateId);
    setIsEditing(true);
  };

  const handleSave = () => {
    if (onUpdateMatch) {
      onUpdateMatch(match.id, {
        homeTeam: editHome,
        awayTeam: editAway,
        time: editTime,
        prediction: editPred,
        odds: editOdds ? parseFloat(editOdds) : undefined,
        type: editType,
        status: editStatus,
        dateId: editDateId,
      });
    }
    setIsEditing(false);
  };

  const handleStatusToggle = () => {
    if (onUpdateMatch) {
      let nextStatus: 'win' | 'lose' | 'pending' = 'pending';
      if (match.status === 'pending') nextStatus = 'win';
      else if (match.status === 'win') nextStatus = 'lose';
      onUpdateMatch(match.id, { status: nextStatus });
    }
  };

  const handleTypeToggle = () => {
    if (onUpdateMatch) {
      onUpdateMatch(match.id, { type: match.type === 'free' ? 'vip' : 'free' });
    }
  };

  const isLocked = match.type === 'vip' && match.status === 'pending' && !isVipUnlocked && !isAdminActive;

  return (
    <div 
      className={`relative group overflow-hidden bg-[#0C101C] rounded-[18px] py-2 px-3 mb-2 shadow-md transition-all duration-300 ${
        match.type === 'vip' 
          ? 'border border-[#1E2538]' 
          : 'border border-[#1E2538] hover:border-[#1E2538]'
      }`}
    >
      {/* Stadium Floodlights beam effect in upper corners */}
      {match.type === 'vip' && (
        <div 
          className="absolute inset-0 pointer-events-none opacity-[0.18] rounded-[18px]"
          style={{
            backgroundImage: 'radial-gradient(circle at 85% 0%, rgba(59, 130, 246, 0.15) 0%, transparent 45%)'
          }}
        />
      )}

      {/* Moving Shimmer Sweep Effect across the background */}
      {match.type === 'vip' && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[18px]">
          <div className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-shimmer-sweep pointer-events-none" />
        </div>
      )}

      {isEditing && (
        /* STUNNING POP-UP DIALOG MODAL FOR EDITING MATCH TIPS */
        <div className="fixed inset-0 bg-[#05070F]/85 backdrop-blur-md z-50 flex items-center justify-center p-3 select-none animate-fade-in">
          <div className="relative bg-[#0D1222] border border-[#1E2538] w-full max-w-[340px] rounded-[24px] overflow-hidden shadow-2xl flex flex-col p-4 space-y-3.5 text-slate-100">
            {/* Yellow decorative top bar */}
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#F5C400] to-amber-500"></div>

            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800/60 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-[#F5C400]/10 flex items-center justify-center border border-[#F5C400]/20">
                  <Edit2 className="w-3.5 h-3.5 text-[#F5C400]" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-white uppercase tracking-wider font-heading">Edit Match Tip</h3>
                  <p className="text-[8.5px] text-slate-450 font-mono leading-none mt-0.5">Control & Update Panel</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="h-7 w-7 rounded-full bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:text-white flex items-center justify-center text-slate-400 transition active:scale-90"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Home & Away Teams Selection Row */}
            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div>
                <label className="block text-[8.5px] text-slate-400 font-extrabold mb-1 uppercase tracking-wider">Home Team</label>
                <input
                  type="text"
                  required
                  value={editHome}
                  onChange={(e) => setEditHome(e.target.value)}
                  className="w-full bg-[#111625] border border-slate-700/85 rounded-xl px-2.5 py-2 text-xs text-white focus:border-[#10B981] outline-none transition"
                />
              </div>
              <div>
                <label className="block text-[8.5px] text-slate-400 font-extrabold mb-1 uppercase tracking-wider">Away Team</label>
                <input
                  type="text"
                  required
                  value={editAway}
                  onChange={(e) => setEditAway(e.target.value)}
                  className="w-full bg-[#111625] border border-slate-700/85 rounded-xl px-2.5 py-2 text-xs text-white focus:border-[#10B981] outline-none transition"
                />
              </div>
            </div>

            {/* DateTime Selection Row Picker */}
            <DateTimeRowPicker
              dateId={editDateId}
              timeString={editTime}
              onDateTimeChange={(newDate, newTime) => {
                setEditDateId(newDate);
                setEditTime(newTime);
              }}
            />

            {/* Odds & Prediction Row */}
            <div className="grid grid-cols-3 gap-2.5 text-xs">
              <div>
                <label className="block text-[8.5px] text-slate-400 font-extrabold mb-1 uppercase tracking-wider">Odds</label>
                <input
                  type="text"
                  placeholder="1.50"
                  value={editOdds}
                  onChange={(e) => setEditOdds(e.target.value)}
                  className="w-full bg-[#111625] border border-slate-700/85 rounded-xl px-2.5 py-2 text-xs text-white focus:border-[#10B981] outline-none transition font-mono"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-[8.5px] text-slate-400 font-extrabold mb-1 uppercase tracking-wider">Prediction</label>
                <input
                  type="text"
                  required
                  value={editPred}
                  onChange={(e) => setEditPred(e.target.value)}
                  className="w-full bg-[#111625] border border-slate-700/85 rounded-xl px-2.5 py-2 text-xs text-white focus:border-[#10B981] outline-none transition"
                />
              </div>
            </div>

            {/* Category and Outcome Status dropdown rows */}
            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div>
                <label className="block text-[8.5px] text-slate-400 font-extrabold mb-1 uppercase tracking-wider">Category</label>
                <select
                  value={editType}
                  onChange={(e) => setEditType(e.target.value as 'free' | 'vip')}
                  className="w-full bg-[#111625] border border-slate-700/85 rounded-xl px-2 py-2 text-xs text-slate-200 focus:border-[#10B981] outline-none transition"
                >
                  <option value="free">Free Tips</option>
                  <option value="vip">VIP Premium Tips</option>
                </select>
              </div>
              <div>
                <label className="block text-[8.5px] text-slate-400 font-extrabold mb-1 uppercase tracking-wider">Outcome Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as 'pending' | 'win' | 'lose')}
                  className="w-full bg-[#111625] border border-slate-700/85 rounded-xl px-2 py-2 text-xs text-slate-200 focus:border-[#10B981] outline-none transition"
                >
                  <option value="pending">Pending</option>
                  <option value="win">Win (Green)</option>
                  <option value="lose">Lose (Red)</option>
                </select>
              </div>
            </div>

            {/* Actions for modal */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-800/40">
              <button
                type="button"
                onClick={handleSave}
                className="flex-1 bg-[#F5C400] hover:bg-[#ffe04d] text-slate-950 rounded-xl py-2.5 text-xs font-black uppercase transition flex items-center justify-center gap-1.5 focus:ring-2 focus:ring-[#F5C400]/50"
              >
                <CheckSquare className="w-4 h-4" /> Save Changes
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl px-4.5 py-2.5 text-xs font-black uppercase transition border border-slate-800"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {!isEditing && (
        /* Standard View Mode */
        <div className="relative">
          {/* Unlock Overlay for non-VIP pending matches */}
          {isLocked && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center p-2 bg-[#04060C]/94 backdrop-blur-[3.5px] rounded-[18px]">
              {/* Stadium Floodlights beams in lock overlay background */}
              <div 
                className="absolute inset-0 pointer-events-none opacity-40 rounded-[18px]"
                style={{
                  backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.22) 0% , transparent 60%)'
                }}
              />
              
              {/* Star / Twinkle mini sparks */}
              <div className="absolute top-2 left-6 w-1 h-1 bg-blue-400 rounded-full animate-ping pointer-events-none opacity-60" style={{ animationDuration: '2.5s' }} />
              <div className="absolute bottom-3 right-8 w-1 h-1 bg-blue-300 rounded-full animate-ping pointer-events-none opacity-45" style={{ animationDuration: '3.8s' }} />
              <div className="absolute top-3 right-5 w-1.5 h-1.5 bg-white rounded-full animate-ping pointer-events-none opacity-50" style={{ animationDuration: '2s' }} />

              {/* Advanced Golden Drifting Particle Material - Perfectly layered */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[18px]">
                <div 
                  className="absolute left-[12%] bottom-[-5px] w-[3px] h-[3px] rounded-full bg-[#F5C400] opacity-95 animate-particle-1" 
                  style={{ boxShadow: '0 0 6px 1px rgba(245, 196, 0, 0.9)' }} 
                />
                <div 
                  className="absolute left-[28%] bottom-[-4px] w-[4px] h-[4px] rounded-full bg-[#FFF2A3] opacity-75 animate-particle-2" 
                  style={{ animationDelay: '0.5s', boxShadow: '0 0 5px 1px rgba(255, 242, 163, 0.8)' }} 
                />
                <div 
                  className="absolute left-[45%] bottom-[-6px] w-[3px] h-[3px] rounded-full bg-[#FFFFFF] opacity-90 animate-particle-3" 
                  style={{ animationDelay: '1.2s', boxShadow: '0 0 4px 1px rgba(255, 255, 255, 0.8)' }} 
                />
                <div 
                  className="absolute left-[62%] bottom-[-5px] w-[4px] h-[4px] rounded-full bg-[#F5C400] opacity-70 animate-particle-1" 
                  style={{ animationDelay: '1.8s', boxShadow: '0 0 6px 1px rgba(245, 196, 0, 0.8)' }} 
                />
                <div 
                  className="absolute left-[80%] bottom-[-4px] w-[3px] h-[3px] rounded-full bg-[#FFA900] opacity-85 animate-particle-2" 
                  style={{ animationDelay: '2.4s', boxShadow: '0 0 5px 1px rgba(255, 169, 0, 0.85)' }} 
                />
                <div 
                  className="absolute left-[35%] bottom-[-3px] w-[3px] h-[3px] rounded-full bg-[#FFFFFF] opacity-65 animate-particle-3" 
                  style={{ animationDelay: '3.0s', boxShadow: '0 0 4px 1.5px rgba(255, 255, 255, 0.7)' }} 
                />
                <div 
                  className="absolute left-[70%] bottom-[-6px] w-[4px] h-[4px] rounded-full bg-[#FFF2A3] opacity-80 animate-particle-1" 
                  style={{ animationDelay: '0.8s', boxShadow: '0 0 5px 1px rgba(255, 242, 163, 0.9)' }} 
                />
                <div 
                  className="absolute left-[54%] bottom-[-4px] w-[3.5px] h-[3.5px] rounded-full bg-[#F5C400] opacity-75 animate-particle-2" 
                  style={{ animationDelay: '3.5s', boxShadow: '0 0 5px 1px rgba(245, 196, 0, 0.75)' }} 
                />
              </div>

              {isMatchCurrentlyLive ? (
                <div className="flex flex-col items-center gap-1 animate-fade-in relative z-10 pb-1">
                  <div className="bg-rose-550/15 border border-rose-500/25 text-rose-400 font-extrabold text-[9.5px] uppercase tracking-wider py-1 px-3.5 rounded-full select-none flex items-center gap-1 shadow-[0_0_12px_rgba(244,63,94,0.15)]">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-rose-500"></span>
                    </span>
                    <span>LIVE MATCH LOCKED</span>
                  </div>
                  <span className="text-[8.5px] text-slate-400 font-bold tracking-tight opacity-95">
                    Locked for Live VIP Members
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-1.5 w-full relative z-10">
                  {/* Highly polished premium lock emblem centered */}
                  <div className="flex flex-col items-center select-none mt-[-6px]">
                    <div className="relative p-1 bg-[#05070D]/95 rounded-full border border-slate-800 flex items-center justify-center">
                      <PremiumShieldCrownDiamondIcon className="w-[26px] h-[26px]" />
                    </div>
                  </div>

                  {/* Soft blue glow core backing the button */}
                  <div className="absolute w-[75px] h-[24px] bg-[#3B82F6]/15 rounded-full blur-[9px] pointer-events-none -mt-3.5" />
                  
                  <button
                    type="button"
                    onClick={onRedirectToPlans}
                    className="relative z-10 w-[42%] max-w-[124px] h-[32px] bg-[#F5C400] text-slate-950 text-[9.5px] font-black uppercase tracking-widest rounded-[10px] flex items-center justify-center gap-1.5 shadow-[0_3px_10px_rgba(0,0,0,0.6)] hover:scale-[1.05] active:scale-[0.95] transition-all duration-300 overflow-hidden cursor-pointer"
                  >
                    {/* Shimmer line sweep inside the buttons */}
                    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[10px]">
                      <div className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/60 to-transparent -translate-x-full animate-shimmer-sweep" />
                    </div>
                    
                    <PremiumShieldCrownDiamondIcon className="w-[12px] h-[12px] !filter-none flex-shrink-0" />
                    <span className="leading-none text-center">Unlock VIP</span>
                  </button>
                </div>
              )}
            </div>
          )}

          <div className={isLocked ? 'filter blur-[3.8px] pointer-events-none select-none opacity-[0.38]' : ''}>
            {/* Top Date / Bookmark Row */}
            <div className="flex items-center justify-between gap-1.5 mb-1.5 px-0.5 select-none text-[10px]">
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-tight flex-shrink-0">{match.dateId}</span>
                {match.type === 'vip' && (
                  <div className="flex gap-1 items-center overflow-x-auto scrollbar-none flex-nowrap shrink-0">
                    <span className="text-[7.5px] font-extrabold uppercase bg-amber-500/10 border border-amber-500/30 text-amber-400 px-1.5 py-0.2 rounded tracking-wider animate-pulse whitespace-nowrap">
                      ★ VIP Exclusive
                    </span>
                    <span className="text-[7.5px] font-extrabold uppercase bg-red-400/10 border border-red-500/30 text-red-450 px-1.5 py-0.2 rounded tracking-wider whitespace-nowrap">
                      🔥 Hot Pick
                    </span>
                  </div>
                )}
              </div>
              
              {onToggleFollow && !isLocked && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFollow();
                  }}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#0c101c] border border-slate-800/80 hover:border-[#F5C400]/30 transition text-[9.5px] font-black uppercase text-slate-400 cursor-pointer flex-shrink-0"
                  title={isFollowed ? "Remove from my tracking dashboard" : "Bookmark this prediction"}
                >
                  <Bookmark className={`w-3 h-3 ${isFollowed ? "text-[#F5C400] fill-[#F5C400]" : "text-slate-500"}`} />
                  <span className={isFollowed ? "text-[#F5C400]" : "text-slate-400"}>
                    {isFollowed ? "Tracked" : "Track"}
                  </span>
                </button>
              )}
            </div>

            {/* Teams Row (Two visual plates connected by "vs" from pictures) */}
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 mb-1.5">
              {/* Home Team Capsule */}
              <div className="bg-[#1B2132] rounded-[10px] px-2.5 py-1 text-center min-h-[28px] flex items-center justify-center">
                <span className="text-slate-100 text-[12px] font-bold tracking-wide leading-none line-clamp-1">
                  {match.homeTeam}
                </span>
              </div>

              {/* VS Divider badge */}
              <div className="px-1 font-sans font-black text-[#F5C400] text-[11px] uppercase select-none tracking-widest drop-shadow-[0_0_4px_rgba(245,196,0,0.4)]">
                vs
              </div>

              {/* Away Team Capsule */}
              <div className="bg-[#1B2132] rounded-[10px] px-2.5 py-1 text-center min-h-[28px] flex items-center justify-center">
                <span className="text-slate-100 text-[12px] font-bold tracking-wide leading-none line-clamp-1">
                  {match.awayTeam}
                </span>
              </div>
            </div>

            {/* Details Row: Kickoff, Selection, Result Badges (No separator line matching photos!) */}
            <div className="flex items-center justify-between mt-1.5 px-0.5">
              <div className="flex items-center space-x-1.5 min-w-0 flex-1">
                {/* Match Time */}
                <span className="text-[12px] font-extrabold text-slate-100 tracking-wider flex-shrink-0">
                  {match.time}
                </span>
                
                <span className="text-slate-500 font-extrabold select-none flex-shrink-0 text-[10px]">
                  →
                </span>

                {/* Prediction Text */}
                <span className="text-slate-200 text-[12px] font-bold leading-tight line-clamp-1 pr-2">
                  <span className="text-slate-200">{match.prediction}</span>
                  {match.odds !== undefined && match.odds !== null && (
                    <span className="text-[#F5C400] font-extrabold text-[12px] ml-0.5 tracking-wide select-none">
                      @{Number(match.odds).toFixed(2)}
                    </span>
                  )}
                </span>
              </div>

            {/* Premium Status Result Badges with pure styles */}
            <div className="flex-shrink-0 flex items-center">
              {match.status === 'win' && (
                <div 
                  onClick={isAdminActive ? handleStatusToggle : undefined}
                  className={`flex items-center space-x-1 bg-[#00B140] text-black font-black text-[10px] uppercase py-[2.5px] px-[10px] rounded-full select-none ${isAdminActive ? 'cursor-pointer hover:opacity-85 active:scale-95' : ''}`}
                >
                  <Check className="w-2.5 h-2.5 stroke-[4] text-black" />
                  <span>Win</span>
                </div>
              )}

              {match.status === 'lose' && (
                <div 
                  onClick={isAdminActive ? handleStatusToggle : undefined}
                  className={`flex items-center space-x-0.5 bg-[#F43F5E] text-white font-black text-[10px] uppercase py-[2.5px] px-[10px] rounded-full select-none ${isAdminActive ? 'cursor-pointer hover:opacity-85 active:scale-95' : ''}`}
                >
                  <X className="w-2.5 h-2.5 stroke-[4]" />
                  <span>Lose</span>
                </div>
              )}

              {match.status === 'pending' && (
                isMatchCurrentlyLive ? (
                  <div 
                    onClick={isAdminActive ? handleStatusToggle : undefined}
                    className={`flex items-center gap-1.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-extrabold text-[10px] py-[2.5px] px-3 rounded-full select-none shadow-[0_0_12px_rgba(16,185,129,0.35)] animate-pulse transition duration-1000 ${isAdminActive ? 'cursor-pointer hover:bg-emerald-500/25 active:scale-95' : ''}`}
                    title="Match is currently Live!"
                  >
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                    </span>
                    <span className="tracking-wide uppercase text-[9.5px]">Live</span>
                  </div>
                ) : (
                  <div 
                    onClick={isAdminActive ? handleStatusToggle : undefined}
                    className={`bg-[#F5C400] text-black font-black text-[10px] py-[2.5px] px-[10px] rounded-full select-none ${isAdminActive ? 'cursor-pointer hover:opacity-90 active:scale-95' : ''}`}
                  >
                    Pending
                  </div>
                )
              )}
            </div>
          </div>

          {/* Admin Panels Tools Trigger overlay inside the card */}
          {isAdminActive && (
            <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] font-mono text-slate-400">
              <div className="flex items-center gap-2">
                {/* Free vs VIP toggle badge spacer */}
                <button
                  type="button"
                  onClick={handleTypeToggle}
                  className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                    match.type === 'vip' 
                      ? 'bg-[#F5C400]/20 text-[#F5C400] border border-[#F5C400]/40' 
                      : 'bg-slate-850 text-slate-300 border border-slate-800'
                  }`}
                >
                  {match.type}
                </button>
                <button
                  type="button"
                  onClick={handleStatusToggle}
                  className="bg-slate-850 hover:bg-slate-800 border border-slate-800 px-2 py-0.5 rounded text-[9px] font-black uppercase text-slate-300"
                >
                  Status: {match.status}
                </button>
              </div>

              <div className="flex items-center space-x-2">
                {onDuplicateMatch && (
                  <button
                    type="button"
                    onClick={() => onDuplicateMatch(match)}
                    className="flex items-center justify-center text-slate-350 hover:text-[#F5C400] bg-slate-850 hover:bg-slate-800 p-1 rounded border border-slate-850 transition"
                    title="Duplicate this match"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleStartEditing}
                  className="flex items-center gap-1 text-slate-300 hover:text-[#F5C400] bg-slate-850 hover:bg-slate-800 px-2.5 py-0.5 rounded border border-slate-850 transition"
                >
                  <Edit2 className="w-3 h-3" /> Edit
                </button>
                {onDeleteMatch && (
                  <button
                    type="button"
                    onClick={() => onDeleteMatch(match.id)}
                    className="flex items-center gap-1 text-red-400 hover:text-red-300 bg-red-950/20 hover:bg-red-950/40 px-2.5 py-0.5 rounded border border-red-900/40 transition"
                  >
                    <Trash2 className="w-3 h-3" /> Del
                  </button>
                )}
              </div>
            </div>
          )}
          </div>
        </div>
      )}
    </div>
  );
};
