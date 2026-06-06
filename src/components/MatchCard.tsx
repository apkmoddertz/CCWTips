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
    <div className="relative group overflow-hidden bg-[#121724] border border-[#1E2538] rounded-[18px] py-2 px-3 mb-2 shadow-md transition-all duration-300 hover:border-[#F5C400]/20 hover:shadow-lg hover:shadow-black/30">
      {/* Subtle inner card glow for VIP items */}
      {match.type === 'vip' && (
        <div className="absolute inset-x-0 top-0 h-[1.5px] bg-[#F5C400]/40"></div>
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
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center p-2 bg-[#0c101c]/90 backdrop-blur-[5px] rounded-[18px]">
              {isMatchCurrentlyLive ? (
                <div className="flex flex-col items-center gap-1.5 animate-fade-in relative z-10">
                  <div className="bg-rose-550/15 border border-rose-500/25 text-rose-400 font-extrabold text-[10.5px] uppercase tracking-wider py-1.5 px-4 rounded-full select-none flex items-center gap-1.5 shadow-[0_0_12px_rgba(244,63,94,0.15)]">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-rose-500"></span>
                    </span>
                    <span>LIVE MATCH LOCKED</span>
                  </div>
                  <span className="text-[9.5px] text-slate-400 font-bold tracking-tight opacity-95">
                    Subscriptions Locked For Live VIP Matches
                  </span>
                </div>
              ) : (
                <>
                  {/* Soft yellow drop glow layer behind the pill button */}
                  <div className="absolute w-[120px] h-[34px] bg-[#F5C400]/22 rounded-full blur-[10px] pointer-events-none" />
                  
                  <button
                    type="button"
                    onClick={onRedirectToPlans}
                    className="relative z-10 bg-[#F5C400] hover:bg-[#ffd11a] text-[#05070F] text-[12.5px] font-black tracking-tight px-5 py-2.5 rounded-full flex items-center justify-center gap-1.5 shadow-[0_4px_16px_rgba(245,196,0,0.55)] transition duration-200 active:scale-95 cursor-pointer"
                  >
                    <Gem className="w-3.5 h-3.5 fill-[#05070F]" strokeWidth={2.5} />
                    <span>Unlock VIP</span>
                  </button>
                </>
              )}
            </div>
          )}

          <div className={isLocked ? 'filter blur-[7px] pointer-events-none select-none opacity-20' : ''}>
            {/* Top Date / Bookmark Row */}
            <div className="flex items-center justify-between mb-1.5 px-0.5 select-none text-[10px]">
              <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-tight">{match.dateId}</span>
              
              {onToggleFollow && !isLocked && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFollow();
                  }}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#0c101c] border border-slate-800/80 hover:border-[#F5C400]/30 transition text-[9.5px] font-black uppercase text-slate-400 cursor-pointer"
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
                {isLocked ? "★ Premium Opponent A" : match.homeTeam}
              </span>
            </div>

            {/* VS Divider badge */}
            <div className="px-1 font-sans font-black text-[#F5C400] text-[11px] uppercase select-none tracking-widest drop-shadow-[0_0_4px_rgba(245,196,0,0.4)]">
              vs
            </div>

            {/* Away Team Capsule */}
            <div className="bg-[#1B2132] rounded-[10px] px-2.5 py-1 text-center min-h-[28px] flex items-center justify-center">
              <span className="text-slate-100 text-[12px] font-bold tracking-wide leading-none line-clamp-1">
                {isLocked ? "★ Premium Opponent B" : match.awayTeam}
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
                {isLocked ? (
                  "🔒 Premium Selection Locked"
                ) : (
                  <>
                    <span className="text-slate-200">{match.prediction}</span>
                    {match.odds !== undefined && match.odds !== null && (
                      <span className="text-[#F5C400] font-extrabold text-[12px] ml-0.5 tracking-wide select-none">
                        @{Number(match.odds).toFixed(2)}
                      </span>
                    )}
                  </>
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
