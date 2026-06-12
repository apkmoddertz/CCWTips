import React from 'react';
import { Lock, User, LogOut, ToggleLeft, ToggleRight, Sparkles, Shield, Crown, Flame, Gem } from 'lucide-react';

interface HeaderProps {
  onAdminClick: () => void;
  isAdminActive: boolean;
  isVipActive: boolean;
  activeTab: 'free' | 'vip' | 'plans' | 'profile';
  setActiveTab: (tab: 'free' | 'vip' | 'plans' | 'profile') => void;
  userEmail?: string;
  userRole?: 'user' | 'admin';
  userName?: string;
  perspective?: 'admin' | 'user';
  onTogglePerspective?: () => void;
  onSignOut?: () => void;
  onOpenManageUsers?: () => void;
  isApprovalsTickerOn?: boolean;
  onToggleApprovalsTicker?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  onAdminClick, 
  isAdminActive, 
  isVipActive,
  activeTab,
  setActiveTab,
  userEmail,
  userRole,
  userName,
  perspective,
  onTogglePerspective,
  onSignOut,
  onOpenManageUsers,
  isApprovalsTickerOn,
  onToggleApprovalsTicker
}) => {
  const [isProfileOpen, setIsProfileOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#141A2E] bg-[#070b19]/95 backdrop-blur-md px-4 pt-2.5 pb-0 flex flex-col gap-2 shadow-lg shadow-black/25">
      {/* Top Row: Brand, Logo & Panel Trigger */}
      <div className="flex items-center justify-between w-full">
        {/* Left: Brand Mascot & Logo */}
        <div className="flex items-center space-x-3 select-none">
          <div 
            className={`relative group ${userRole === 'admin' ? 'cursor-pointer' : ''}`} 
            onClick={userRole === 'admin' ? onAdminClick : undefined}
          >
            {/* Neon gold pulsing background ring */}
            <div className="absolute -inset-0.5 rounded-full bg-gradient-to-r from-[#F5C400] to-[#E2B200] opacity-75 blur-sm transition duration-1000 group-hover:opacity-100"></div>
            
            <div className="relative h-9 w-9 rounded-full overflow-hidden bg-[#0A0E1A] border-2 border-[#F5C400] flex items-center justify-center">
              <img
                src="https://i.ibb.co/Lhzt1vX1/cashcowlogo.png"
                alt="Cash Cow VIP Logo"
                className="h-full w-full object-cover"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  // Defensive fallback to dynamic text or standard inline SVG
                  (e.target as any).style.display = 'none';
                  const container = (e.target as any).parentNode;
                  if (container) {
                    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                    svg.setAttribute("viewBox", "0 0 100 100");
                    svg.setAttribute("class", "w-7 h-7 fill-[#F5C400]");
                    svg.innerHTML = `
                      <circle cx="50" cy="50" r="45" fill="#1e293b"/>
                      <path d="M30,45 C20,30 40,25 35,40" stroke="#F5C400" stroke-width="6" fill="text" stroke-linecap="round"/>
                      <path d="M70,45 C80,30 60,25 65,40" stroke="#F5C400" stroke-width="6" fill="text" stroke-linecap="round"/>
                      <ellipse cx="50" cy="55" rx="20" ry="15" fill="#f59e0b"/>
                      <circle cx="43" cy="55" r="3" fill="#000"/>
                      <circle cx="57" cy="55" r="3" fill="#000"/>
                      <circle cx="43" cy="40" r="5" fill="#F5C400"/>
                      <circle cx="57" cy="40" r="5" fill="#F5C400"/>
                    `;
                    container.appendChild(svg);
                  }
                }}
              />
            </div>
            {isAdminActive && (
              <span className="absolute -bottom-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-red-500 ring-2 ring-slate-900">
                <span className="h-1.2 w-1.2 rounded-full bg-white animate-ping"></span>
              </span>
            )}
          </div>
        </div>

        {/* Center: App Name */}
        <div className="flex flex-col items-center select-none text-center">
          <h1 className="font-heading font-extrabold text-[15px] sm:text-base text-white tracking-wide flex items-center gap-2 font-sans justify-center">
            <span>Cash Cow <span className="text-[#F5C400] drop-shadow-[0_0_8px_rgba(245,196,0,0.4)] font-extrabold">VIP</span></span>
            {isVipActive ? (
              <span className="relative inline-flex items-center justify-center rounded-full bg-gradient-to-r from-[#F5C400] to-amber-500 text-[9.5px] font-black text-slate-950 px-2.5 py-0.5 uppercase tracking-wider select-none shadow-[0_0_15px_rgba(245,196,0,0.6)] border border-yellow-300/30 scale-105 transform animate-pulse font-mono">
                PRO
                <span className="absolute -inset-0.5 rounded-full bg-[#F5C400]/20 blur-sm animate-ping -z-10"></span>
              </span>
            ) : (
              <span className="relative inline-flex items-center justify-center rounded-full bg-slate-950 border border-slate-800 text-[9.5px] font-bold text-slate-400 px-2.5 py-0.5 uppercase tracking-wider select-none shadow-inner font-mono">
                FREE
              </span>
            )}
          </h1>
        </div>

        {/* Right: Circular user avatar with absolute sub dropdown */}
        <div className="flex items-center gap-2">
          <div className="relative">
            {/* Soft yellow neon glow beneath avatar */}
            <div className="absolute -inset-0.5 rounded-full bg-[#F5C400] opacity-40 blur-md hover:opacity-75 transition duration-300"></div>
            
            <button 
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="relative h-9 w-9 rounded-full bg-gradient-to-br from-[#F5C400] to-[#E2B200] flex items-center justify-center shadow-md border-2 border-slate-950 transition duration-300 hover:scale-105 active:scale-95 text-black cursor-pointer"
              title="View Account Profile"
            >
              <User className="w-4.5 h-4.5 stroke-[2.5]" />
              <span className="absolute top-0 right-0 block h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-slate-900"></span>
            </button>

            {/* Dropdown Card */}
            {isProfileOpen && (
              <>
                {/* Invisible backdrop to dismiss dropdown on click-away */}
                <div className="fixed inset-0 z-40" onClick={() => setIsProfileOpen(false)}></div>
                
                <div className="absolute right-0 mt-3 w-64 rounded-2xl bg-[#0D1222] border border-[#1E2538] p-4.5 shadow-[0_12px_40px_rgba(0,0,0,0.8)] z-50 animate-fade-in text-left">
                  {/* Yellow accent top line */}
                  <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#F5C400] to-amber-500 rounded-t-2xl"></div>
                  
                  {/* User Profile Info Header */}
                  <div className="block mb-3.5 border-b border-slate-800/60 pb-3">
                    <span className="block text-[8px] font-mono uppercase tracking-widest text-slate-450 leading-none mb-1">
                      Authenticated Account
                    </span>
                    <span className="block text-xs font-black text-white truncate max-w-full uppercase tracking-wide">
                      {userName || userEmail?.split('@')[0] || 'Premium VIP User'}
                    </span>
                    <span className="block text-[10px] text-slate-400 font-mono select-all truncate mt-1">
                      {userEmail}
                    </span>
                  </div>

                  {/* Badges / Information */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-[10px] font-bold bg-slate-950 p-2 rounded-xl border border-slate-900">
                      <span className="text-slate-450 uppercase font-mono">My Privilege</span>
                      <span className={`uppercase px-2 py-0.5 rounded font-black tracking-wide text-[8.5px] ${
                        userRole === 'admin' 
                          ? 'bg-red-500/10 text-red-400 border border-red-500/20' 
                          : 'bg-[#F5C400]/10 text-[#F5C400] border border-[#F5C400]/20'
                      }`}>
                        {userRole === 'admin' ? 'SYSTEM ADMIN' : 'USER'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-bold bg-slate-950 p-2 rounded-xl border border-slate-900">
                      <span className="text-slate-450 uppercase font-mono">VIP Access</span>
                      <span className={`px-2 py-0.5 rounded font-black tracking-wide text-[9px] ${
                        isVipActive 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                          : 'bg-slate-900 text-slate-400'
                      }`}>
                        {isVipActive ? 'Unlocked (Active)' : 'Locked'}
                      </span>
                    </div>
                  </div>

                  {/* Action Commands */}
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileOpen(false);
                        setActiveTab('profile');
                      }}
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-[10px] font-black text-white bg-slate-900 border border-[#F5C400]/25 hover:border-[#F5C400]/50 hover:bg-slate-850 transition cursor-pointer list-none uppercase tracking-wider text-center"
                    >
                      <User className="w-3.5 h-3.5 text-[#F5C400]" />
                      <span>My Profile Dashboard</span>
                    </button>

                    {/* Admin only Manage Users action */}
                    {userRole === 'admin' && onOpenManageUsers && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsProfileOpen(false);
                          onOpenManageUsers();
                        }}
                        className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-[10px] font-black text-[#F5C400] bg-[#F5C400]/10 border border-[#F5C400]/30 hover:bg-[#F5C400]/18 transition cursor-pointer uppercase tracking-wider text-center"
                      >
                        <Shield className="w-3.5 h-3.5 text-[#F5C400]" />
                        <span>Manage Users</span>
                      </button>
                    )}

                    {onSignOut && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsProfileOpen(false);
                          onSignOut();
                        }}
                        className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-[10px] font-black text-rose-400 bg-rose-500/5 hover:bg-rose-500/12 border border-rose-500/15 hover:text-rose-300 transition cursor-pointer uppercase tracking-wider text-center"
                      >
                        <LogOut className="w-3.5 h-3.5 text-rose-450" />
                        <span>Logout Session</span>
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Admin Role Perspective Switcher Sub-bar (Exclusive to bootstrapped admin gmail) */}
      {userRole === 'admin' && onTogglePerspective && (
        <div className="flex items-center justify-between bg-gradient-to-r from-amber-500/10 via-amber-500/15 to-transparent border border-amber-500/25 rounded-xl px-3 py-1.5 mx-0.5 mb-1.5 text-xs select-none">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#F5C400] animate-pulse" />
            <span className="font-sans font-black text-[#F5C400] text-[9.5px] uppercase tracking-wider">
              ADMIN SIMULATOR MODE
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* VIP Ticker Toggle */}
            {onToggleApprovalsTicker && (
              <button
                type="button"
                onClick={onToggleApprovalsTicker}
                className={`flex items-center gap-1.5 px-2.2 py-0.8 bg-[#090e1c] border rounded-lg text-[9px] font-black tracking-wider transition-all duration-300 ${
                  isApprovalsTickerOn
                    ? 'border-emerald-500/85 text-emerald-400'
                    : 'border-rose-500/50 text-rose-550'
                } cursor-pointer`}
                title={`${isApprovalsTickerOn ? 'Mute' : 'Show'} VIP Approvals Notification Stream`}
              >
                <span>TICKER: {isApprovalsTickerOn ? 'ON' : 'OFF'}</span>
                {isApprovalsTickerOn ? (
                  <ToggleRight className="w-3.8 h-3.8 text-emerald-400" />
                ) : (
                  <ToggleLeft className="w-3.8 h-3.8 text-slate-550" />
                )}
              </button>
            )}

            {/* Admin Perspective Toggle */}
            <button
              onClick={onTogglePerspective}
              className={`flex items-center gap-1.5 px-2.2 py-0.8 bg-[#090e1c] border rounded-lg text-[9px] font-black tracking-wider transition-all duration-300 ${
                perspective === 'admin'
                  ? 'border-[#F5C400] text-[#F5C400]'
                  : 'border-slate-800 text-slate-500'
              } cursor-pointer`}
            >
              {perspective === 'admin' ? (
                <>
                  <span>ADMIN ACTIVE</span>
                  <ToggleRight className="w-3.8 h-3.8 text-[#F5C400]" />
                </>
              ) : (
                <>
                  <span>USER SIM</span>
                  <ToggleLeft className="w-3.8 h-3.8 text-slate-600" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Bottom Row: Luxury Segmented APK Menu Navigation Tabs */}
      <div className="w-full select-none mt-1">
        <div className="bg-[#0B1020] border border-[#161C30] p-1 rounded-xl flex items-center justify-between gap-1 w-full shadow-inner shadow-black/40">
          {/* FREE TIPS */}
          <button
            onClick={() => setActiveTab('free')}
            className={`flex-1 py-2 text-center text-[10px] font-black tracking-wider uppercase transition-all duration-300 rounded-[8px] flex items-center justify-center gap-1.5 ${
              activeTab === 'free'
                ? 'bg-[#F5C400] text-slate-950 shadow-[0_2px_10px_rgba(245,196,0,0.25)] scale-[1.02]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
            }`}
          >
            <Flame className={`w-3.5 h-3.5 ${activeTab === 'free' ? 'text-slate-950 fill-current' : 'text-orange-500 fill-orange-500/10'}`} />
            <span>FREE TIPS</span>
          </button>

          {/* VIP TIPS */}
          <button
            onClick={() => setActiveTab('vip')}
            className={`flex-1 py-2 text-center text-[10px] font-black tracking-wider uppercase transition-all duration-300 rounded-[8px] flex items-center justify-center gap-1.5 relative ${
              activeTab === 'vip'
                ? 'bg-[#F5C400] text-slate-950 shadow-[0_2px_10px_rgba(245,196,0,0.25)] scale-[1.02]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
            }`}
          >
            <Crown className={`w-3.5 h-3.5 ${activeTab === 'vip' ? 'text-slate-950 fill-current' : 'text-[#F5C400] fill-[#F5C400]/10'}`} />
            <span>VIP TIPS</span>
          </button>

          {/* VIP PLANS */}
          <button
            onClick={() => setActiveTab('plans')}
            className={`flex-1 py-2 text-center text-[10px] font-black tracking-wider uppercase transition-all duration-300 rounded-[8px] flex items-center justify-center gap-1.5 ${
              activeTab === 'plans'
                ? 'bg-[#F5C400] text-slate-950 shadow-[0_2px_10px_rgba(245,196,0,0.25)] scale-[1.02]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/45'
            }`}
          >
            <Gem className={`w-3.5 h-3.5 ${activeTab === 'plans' ? 'text-slate-950 fill-current' : 'text-cyan-400 fill-cyan-400/10'}`} />
            <span>VIP PLANS</span>
          </button>
        </div>
      </div>
    </header>
  );
};
