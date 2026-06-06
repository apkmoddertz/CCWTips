import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Eye, 
  Calendar, 
  DollarSign, 
  Award, 
  Smartphone, 
  Globe, 
  Coins, 
  CreditCard,
  ImageIcon,
  ArrowRight,
  Download,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Zap
} from 'lucide-react';

interface UserPaymentReceiptsProps {
  userReceipts: any[];
  userReceiptsLoading: boolean;
  onShowNotification: (msg: string, type: 'success' | 'info') => void;
}

// Format ISO string to Tanzania Dar es Salaam timezone (EAT - East Africa Time, UTC+3)
export function formatEATDateTime(isoString: string | undefined): { date: string; time: string } {
  if (!isoString) {
    return { date: 'N/A', time: 'N/A' };
  }
  try {
    const d = new Date(isoString);
    const formatterDate = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Africa/Dar_es_Salaam',
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
    const formatterTime = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Africa/Dar_es_Salaam',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    return { 
      date: formatterDate.format(d), 
      time: `${formatterTime.format(d)} EAT` 
    };
  } catch (err) {
    console.error("Error formatting EAT date-time:", err);
    return { date: 'N/A', time: 'N/A' };
  }
}

// Compute custom Tanzania EAT formatted relative dates (Today, Yesterday, Earlier)
export function getEATRelativeHeader(dateStr: string): { relativeLabel: string; subtitle: string; dayName: string } {
  try {
    // Current date in Africa/Dar_es_Salaam timezone
    const getEATDateString = (daysOffset: number = 0): string => {
      const d = new Date();
      d.setDate(d.getDate() - daysOffset);
      const formatter = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Africa/Dar_es_Salaam',
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });
      return formatter.format(d);
    };

    const getEATDayNameFormat = (daysOffset: number = 0): string => {
      const d = new Date();
      d.setDate(d.getDate() - daysOffset);
      const formatter = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Africa/Dar_es_Salaam',
        weekday: 'long'
      });
      return formatter.format(d);
    };

    const todayStrInEAT = getEATDateString(0);
    const yesterdayStrInEAT = getEATDateString(1);

    if (dateStr === todayStrInEAT) {
      return {
        relativeLabel: 'TODAY',
        subtitle: `${getEATDayNameFormat(0)}, ${dateStr}`,
        dayName: getEATDayNameFormat(0)
      };
    } else if (dateStr === yesterdayStrInEAT) {
      return {
        relativeLabel: 'YESTERDAY',
        subtitle: `${getEATDayNameFormat(1)}, ${dateStr}`,
        dayName: getEATDayNameFormat(1)
      };
    } else {
      // Find what weekday it was originalmente
      let parsedDayName = 'Earlier Transaction';
      try {
        const parts = dateStr.split(' ');
        // We can construct a standard Date object to fetch weekday name
        // formatted as "06 June 2026"
        const dayInt = parseInt(parts[0]);
        const monthMap: { [m: string]: number } = {
          'January': 0, 'February': 1, 'March': 2, 'April': 3, 'May': 4, 'June': 5,
          'July': 6, 'August': 7, 'September': 8, 'October': 9, 'November': 10, 'December': 11
        };
        const monthInt = monthMap[parts[1]] || 0;
        const yearInt = parseInt(parts[2]);
        const calculatedDate = new Date(yearInt, monthInt, dayInt);
        const weekdayFormatter = new Intl.DateTimeFormat('en-GB', { weekday: 'long' });
        parsedDayName = weekdayFormatter.format(calculatedDate);
      } catch (err) {
        // Fallback
      }
      return {
        relativeLabel: 'EARLIER',
        subtitle: `${parsedDayName}, ${dateStr}`,
        dayName: parsedDayName
      };
    }
  } catch (err) {
    return { relativeLabel: 'EARLIER', subtitle: dateStr, dayName: 'EAT Transaction' };
  }
}

const getPaymentMethodIcon = (method: string = '') => {
  const m = method.toLowerCase();
  if (m.includes('usdt') || m.includes('crypto')) return <Coins className="w-3.5 h-3.5 text-amber-500" />;
  if (m.includes('mpesa')) return <Smartphone className="w-3.5 h-3.5 text-emerald-500" />;
  if (m.includes('western')) return <Globe className="w-3.5 h-3.5 text-cyan-500" />;
  return <CreditCard className="w-3.5 h-3.5 text-[#F5C400]" />;
};

export const UserPaymentReceipts: React.FC<UserPaymentReceiptsProps> = ({
  userReceipts,
  userReceiptsLoading,
  onShowNotification
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'regenerated'>('all');
  const [fullscreenScreenshot, setFullscreenScreenshot] = useState<string | null>(null);

  // Statistics calculation for user-specific counts
  const userStats = useMemo(() => {
    let total = userReceipts.length;
    let pending = 0;
    let approved = 0;
    let rejected = 0;
    let regenerated = 0;

    userReceipts.forEach(r => {
      const status = (r.status || 'pending').toLowerCase();
      if (status === 'pending') pending++;
      if (status === 'approved') approved++;
      if (status === 'rejected') rejected++;
      if (status === 'regenerated') regenerated++;
    });

    return { total, pending, approved, rejected, regenerated };
  }, [userReceipts]);

  // Handle smooth scroll back up to pricing slider selection to make a deposit
  const handleScrollToPayments = () => {
    const section = document.getElementById('vip_plans_section') || document.getElementById('plans_selection_dashboard');
    if (section) {
      section.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Filter and sort receipts (Newest submission always on top)
  const sortedAndFilteredReceipts = useMemo(() => {
    let list = [...userReceipts];
    // Sort descending by submittedAt EAT Unix Timestamp
    list.sort((a, b) => new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime());

    if (activeTab === 'all') return list;
    return list.filter(rcpt => (rcpt.status || 'pending').toLowerCase() === activeTab);
  }, [userReceipts, activeTab]);

  // Group receipts by EAT Date
  const groupedReceipts = useMemo(() => {
    const groups: { [date: string]: any[] } = {};
    sortedAndFilteredReceipts.forEach(rcpt => {
      const { date } = formatEATDateTime(rcpt.submittedAt);
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(rcpt);
    });
    
    // Sort grouped date keys by submittedAt of their first item (newest first)
    return Object.keys(groups).sort((a, b) => {
      const itemA = groups[a][0];
      const itemB = groups[b][0];
      return new Date(itemB.submittedAt || 0).getTime() - new Date(itemA.submittedAt || 0).getTime();
    }).map(date => {
      const meta = getEATRelativeHeader(date);
      return {
        date,
        relativeLabel: meta.relativeLabel,
        subtitle: meta.subtitle,
        receipts: groups[date]
      };
    });
  }, [sortedAndFilteredReceipts]);

  // Render highly visible premium status badge
  const renderStatusBadge = (status: string = 'pending') => {
    switch (status.toLowerCase()) {
      case 'approved':
        return (
          <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-extrabold text-[10px] uppercase tracking-wider rounded-full shadow-[0_0_12.5px_-3px_rgba(16,185,129,0.35)] select-none">
            <CheckCircle className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Payment Approved</span>
          </div>
        );
      case 'rejected':
        return (
          <div className="flex items-center gap-2 px-3 py-1 bg-red-500/10 border border-red-500/30 text-rose-450 font-extrabold text-[10px] uppercase tracking-wider rounded-full shadow-[0_0_12.5px_-3px_rgba(239,68,68,0.35)] select-none">
            <XCircle className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Verification Failed</span>
          </div>
        );
      case 'regenerated':
        return (
          <div className="flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/30 text-blue-400 font-extrabold text-[10px] uppercase tracking-wider rounded-full shadow-[0_0_12.5px_-3px_rgba(59,130,246,0.35)] select-none animate-pulse">
            <RefreshCw className="w-3.5 h-3.5 animate-spin duration-3000 stroke-[2.5]" />
            <span>New Proof Required</span>
          </div>
        );
      case 'pending':
      default:
        return (
          <div className="flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 font-extrabold text-[10px] uppercase tracking-wider rounded-full shadow-[0_0_12.5px_-3px_rgba(245,158,11,0.35)] select-none">
            <Clock className="w-3.5 h-3.5 animate-pulse" />
            <span>Awaiting Verification</span>
          </div>
        );
    }
  };

  const handleDownloadProof = (url: string, id: string) => {
    if (url.startsWith('data:')) {
      const link = document.createElement('a');
      link.href = url;
      link.download = `verified_receipt_${id.substring(0,6)}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      onShowNotification("Verification receipt downloaded!", "success");
    } else {
      window.open(url, '_blank');
    }
  };

  return (
    <div className="mt-12 border-t border-[#141B2D]/80 pt-8" id="user_receipts_history_container">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 px-1">
        <div className="space-y-1">
          <h3 className="font-heading font-black text-[15px] sm:text-[17px] text-white uppercase tracking-wider flex items-center gap-2.5">
            <div className="flex items-center justify-center w-7 h-7 bg-[#F5C400]/10 border border-[#F5C400]/25 rounded-lg">
              <FileText className="w-4 h-4 text-[#F5C400]" />
            </div>
            My Payment Receipts
          </h3>
          <p className="text-[11px] text-slate-400 font-medium tracking-wide">
            Track all submitted payment confirmations & active membership status
          </p>
        </div>
      </div>

      {/* REVOLUT / STRIPE STYLE STAT CARDS PANEL */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-6">
        {[
          { label: 'Pending Secure', val: userStats.pending, color: 'text-amber-400', bg: 'bg-amber-450/4 border-amber-500/10' },
          { label: 'Payment Approved', val: userStats.approved, color: 'text-emerald-400', bg: 'bg-emerald-450/4 border-emerald-500/10' },
          { label: 'Verification Failed', val: userStats.rejected, color: 'text-rose-450', bg: 'bg-rose-450/4 border-rose-500/10' },
          { label: 'New Proof Req', val: userStats.regenerated, color: 'text-blue-400', bg: 'bg-blue-450/4 border-blue-500/10' }
        ].map((c, i) => (
          <div key={i} className={`rounded-2xl p-3 border hover:border-slate-800 transition duration-300 ${c.bg}`}>
            <span className="text-[8.5px] font-mono uppercase tracking-widest text-slate-500 font-black block">{c.label}</span>
            <span className={`text-[19px] font-mono font-black mt-1 leading-none block ${c.color}`}>{c.val}</span>
          </div>
        ))}
      </div>

      {/* FILTER TABS */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-3.5 scrollbar-none mb-8 border-b border-[#141B2E]/65 px-1">
        {[
          { id: 'all', label: 'All Receipts', count: userStats.total },
          { id: 'pending', label: 'Awaiting', count: userStats.pending },
          { id: 'approved', label: 'Approved', count: userStats.approved },
          { id: 'rejected', label: 'Failed', count: userStats.rejected },
          { id: 'regenerated', label: 'Action Required', count: userStats.regenerated }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2.5 text-[10.5px] font-black uppercase tracking-wider rounded-xl transition duration-200 flex items-center gap-2 cursor-pointer shrink-0 border ${
              activeTab === tab.id
                ? 'bg-gradient-to-r from-slate-900 via-[#10162A] to-slate-900 text-[#F5C400] border-[#F5C400]/40 shadow-lg shadow-[#F5C400]/3'
                : 'bg-transparent text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-900/40'
            }`}
          >
            <span>{tab.label}</span>
            <span className={`px-2 py-0.5 rounded-lg font-mono text-[8.5px] font-black leading-none ${
              activeTab === tab.id ? 'bg-[#F5C400]/15 text-[#F5C400]' : 'bg-slate-950 text-slate-500'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* CORE LOGIC VIEWS */}
      {userReceiptsLoading ? (
        <div className="py-20 text-center bg-slate-950/20 rounded-[28px] border border-slate-900/80 text-slate-400 text-xs font-mono uppercase tracking-widest flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-7 h-7 text-[#F5C400] animate-spin" />
          <span className="font-extrabold">Loading payments ledger data...</span>
        </div>
      ) : sortedAndFilteredReceipts.length === 0 ? (
        <div className="py-16 px-6 text-center bg-[#070B18]/65 rounded-[32px] border-2 border-dashed border-[#141B2D] hover:border-slate-800 transition duration-300">
          <div className="w-12 h-12 rounded-full bg-[#111A31] border border-slate-800/80 flex items-center justify-center mx-auto mb-4 text-[#F5C400]">
            <ImageIcon className="w-5 h-5" />
          </div>
          <h4 className="text-[14px] text-white font-black uppercase tracking-wider">No Payment Receipts Yet</h4>
          <p className="text-[11.5px] text-slate-400 mt-1.5 max-w-sm mx-auto leading-relaxed">
            Your submitted payment confirmations will appear here. Submit a snapshot receipt to unlock unlimited VIP tips.
          </p>
          <button
            onClick={handleScrollToPayments}
            className="mt-5 px-5 py-2.5 bg-gradient-to-r from-[#F5C400] to-[#E2B100] text-slate-950 font-black text-[11px] uppercase tracking-widest rounded-xl hover:shadow-[0_0_15px_rgba(245,196,0,0.35)] active:scale-95 transition cursor-pointer"
          >
            Make Payment
          </button>
        </div>
      ) : (
        <div className="space-y-12 relative pl-4 border-l-2 border-slate-900/70 ml-2.5">
          
          {groupedReceipts.map(group => (
            <div key={group.date} className="relative space-y-6">
              
              {/* TIMELINE DESIGN NODE POINT */}
              <div className="absolute -left-[22.5px] top-1.5 w-[14.5px] h-[14.5px] rounded-full bg-[#030610] border-[2.5px] border-[#F5C400] shadow-[0_0_10px_#F5C400] flex items-center justify-center z-10" />
              
              {/* STICKY GROUP HEADER */}
              <div className="sticky top-0 z-20 bg-[#030610] py-1.5 flex flex-col gap-0.5 select-none drop-shadow-lg">
                <span className="text-[10px] font-mono font-black text-[#F5C400] tracking-widest leading-none">
                  {group.relativeLabel}
                </span>
                <span className="text-[14px] font-heading font-extrabold text-slate-205 tracking-tight uppercase">
                  {group.subtitle}
                </span>
              </div>

              {/* STACKED LIST */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-2">
                {group.receipts.map(rcpt => {
                  const { date: submitDate, time: submitTime } = formatEATDateTime(rcpt.submittedAt);
                  const isApproved = rcpt.status === 'approved';
                  const isRejected = rcpt.status === 'rejected';
                  const isRegenerated = rcpt.status === 'regenerated';
                  const isPending = (rcpt.status || 'pending') === 'pending';

                  // Local currency TZ/KE equivalent estimations
                  let currencyLabel = '';
                  const mMethod = (rcpt.paymentMethod || '').toLowerCase();
                  if (mMethod.includes('kenya') && rcpt.planPrice) {
                    currencyLabel = `≈ ${(Math.round(rcpt.planPrice * 135)).toLocaleString()} KES`;
                  } else if (mMethod.includes('tanzania') && rcpt.planPrice) {
                    currencyLabel = `≈ ${(Math.round(rcpt.planPrice * 2600)).toLocaleString()} TZS`;
                  }

                  return (
                    <div 
                      key={rcpt.id}
                      className="group/card relative bg-gradient-to-b from-[#0B0F1E] to-[#060914] border border-[#141B2E] hover:border-[#F5C400]/40 rounded-[28px] p-5 shadow-xl transition-all duration-300 flex flex-col gap-4.5 overflow-hidden"
                    >
                      {/* Left glowing border overlay representing status */}
                      <div className={`absolute left-0 top-4 bottom-4 w-1 rounded-r-lg ${
                        isApproved ? 'bg-emerald-500 shadow-[0_0_8px_#10B981]' :
                        isRejected ? 'bg-rose-500 shadow-[0_0_8px_#EF4444]' :
                        isRegenerated ? 'bg-blue-500 shadow-[0_0_8px_#3B82F6]' :
                        'bg-amber-500 shadow-[0_0_8px_#F59E0B]'
                      }`} />

                      {/* --- CARD TOP SECTION --- */}
                      <div className="flex justify-between items-start gap-4 select-none">
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <Zap className="w-3.5 h-3.5 text-[#F5C400] animate-pulse" />
                            <span className="text-[8.5px] font-mono font-black uppercase tracking-widest text-slate-500">
                              CERTIFIED VIP LOCK
                            </span>
                          </div>
                          <h4 className="text-white text-[13.5px] font-black uppercase font-heading tracking-tight truncate">
                            {rcpt.planDuration} PASSVIP
                          </h4>
                          <span className="inline-block text-[9px] font-mono text-slate-400 font-bold">
                            {submitDate} • {submitTime}
                          </span>
                        </div>
                        <div className="shrink-0 text-right flex flex-col items-end gap-1.5">
                          {renderStatusBadge(rcpt.status)}
                          <div className="flex items-center gap-1 text-[8.5px] font-mono text-[#F5C400] font-black bg-[#F5C400]/5 px-2.5 py-0.5 rounded-md border border-[#F5C400]/10 shrink-0">
                            {getPaymentMethodIcon(rcpt.paymentMethod)}
                            <span className="truncate">{rcpt.paymentMethod || 'Manual'}</span>
                          </div>
                        </div>
                      </div>

                      {/* --- CARD MIDDLE SECTION: LARGE SCREENSHOT PREVIEW --- */}
                      {rcpt.screenshot ? (
                        <div className="relative space-y-2 select-none">
                          <div 
                            onClick={() => setFullscreenScreenshot(rcpt.screenshot)}
                            className="relative h-48 rounded-[22px] overflow-hidden bg-slate-950 border border-[#141B2E] hover:border-slate-800 flex items-center justify-center cursor-zoom-in group/img transition-all duration-300 shadow-inner"
                          >
                            <img 
                              src={rcpt.screenshot} 
                              alt="Manual Payment Screenshot proof" 
                              className="h-full w-full object-contain pointer-events-none group-hover/img:scale-[1.01] transition duration-350"
                              referrerPolicy="no-referrer"
                              loading="lazy"
                            />
                            {/* Overlay frame and buttons */}
                            <div className="absolute inset-0 bg-slate-950/70 opacity-0 group-hover/img:opacity-100 flex flex-col items-center justify-center gap-1.5 transition-all duration-200">
                              <Eye className="w-5 h-5 text-[#F5C400]" />
                              <span className="text-[10px] font-black uppercase text-white tracking-widest">
                                CLICK TO ENLARGE SCREENSHOT
                              </span>
                            </div>
                          </div>
                          
                          {/* Image width indicator badge */}
                          <span className="text-[8.5px] font-mono text-slate-500 uppercase font-black block text-right">
                            Screenshot proof (75% Card space)
                          </span>
                        </div>
                      ) : (
                        <div className="p-4 rounded-2xl border border-rose-500/25 bg-rose-500/5 text-rose-450 flex items-center gap-2.5 text-[10px] select-none font-bold">
                          <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                          <span>System Warning: No validation receipt image submitted! Please resubmit.</span>
                        </div>
                      )}

                      {/* --- STATUS PROGRESSIVE TIMELINE TRACKER --- */}
                      <div className="border-t border-[#141C30]/50 pt-4 flex flex-col gap-2 relative pl-1">
                        <span className="text-[8px] font-mono font-black uppercase tracking-widest text-slate-500 block mb-1">
                          Payment Verification Tracker
                        </span>

                        <div className="flex items-center justify-between relative pl-1 select-none">
                          {/* Connecting lines */}
                          <div className="absolute left-4 right-4 top-2.5 h-[1.5px] border-t border-dashed border-slate-800 z-0" />
                          
                          {/* STAGE 1: SUBMITTED */}
                          <div className="flex flex-col items-center gap-1 z-10 text-center flex-1">
                            <div className="w-5 h-5 rounded-full bg-[#10B981] text-white flex items-center justify-center text-[8px] font-bold shadow-[0_0_8px_#10B981]">
                              ✓
                            </div>
                            <span className="text-[8.5px] font-mono text-slate-300 font-extrabold leading-none mt-1">Submitted</span>
                            <span className="text-[7.5px] font-mono text-slate-500 block shrink-0">{submitTime.replaceAll(' EAT', '')}</span>
                          </div>

                          {/* STAGE 2: UNDER REVIEW */}
                          <div className="flex flex-col items-center gap-1 z-10 text-center flex-1">
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold ${
                              isPending 
                                ? 'bg-amber-500 text-slate-950 animate-pulse font-black shadow-[0_0_8px_#F59E0B]' 
                                : 'bg-[#10B981] text-white'
                            }`}>
                              {isPending ? '⏳' : '✓'}
                            </div>
                            <span className="text-[8.5px] font-mono text-slate-300 font-extrabold leading-none mt-1">Reviewing</span>
                            <span className="text-[7.5px] font-mono text-slate-500 block shrink-0">
                              {isPending ? 'Processing' : 'Done'}
                            </span>
                          </div>

                          {/* STAGE 3: RESOLVED */}
                          <div className="flex flex-col items-center gap-1 z-10 text-center flex-1">
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[8.5px] font-bold ${
                              isApproved ? 'bg-emerald-500 text-white shadow-[0_0_8px_#10B981]' :
                              isRejected ? 'bg-rose-500 text-white shadow-[0_0_8px_#EF4444]' :
                              isRegenerated ? 'bg-blue-500 text-white shadow-[0_0_8px_#3B82F6]' :
                              'bg-slate-900 border border-slate-800 text-slate-600'
                            }`}>
                              {isApproved ? '✓' : isRejected ? '✕' : isRegenerated ? '↺' : '○'}
                            </div>
                            <span className="text-[8.5px] font-mono font-extrabold leading-none mt-1 truncate max-w-[70px] text-slate-300">
                              {isApproved ? 'Approved' : isRejected ? 'Failed' : isRegenerated ? 'Reject' : 'Pending'}
                            </span>
                            <span className="text-[7.5px] font-mono text-slate-500 block shrink-0">
                              {isApproved ? 'VIP Live' : isRejected ? 'Declined' : isRegenerated ? 'Re-upload' : 'Pending'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* --- CARD BOTTOM DETAIL GRID --- */}
                      <div className="bg-[#050811] p-3.5 rounded-[22px] border border-slate-900/60 text-[10.5px] select-all grid grid-cols-2 gap-3">
                        <div className="space-y-0.5">
                          <span className="text-[8px] font-mono text-slate-500 uppercase tracking-widest font-black block">
                            Purchase Tier
                          </span>
                          <span className="text-white font-extrabold block uppercase">
                            {rcpt.planDuration} Pass VIP
                          </span>
                        </div>

                        <div className="space-y-0.5">
                          <span className="text-[8px] font-mono text-slate-500 uppercase tracking-widest font-black block">
                            Amount Paid
                          </span>
                          <span className="text-white font-mono font-black block leading-none mt-0.5">
                            ${rcpt.planPrice?.toFixed(2)} USD
                          </span>
                          {currencyLabel && (
                            <span className="text-[8.5px] font-mono text-emerald-400 block mt-1 leading-none font-bold select-none">
                              {currencyLabel}
                            </span>
                          )}
                        </div>

                        <div className="space-y-0.5 col-span-2 border-t border-slate-900/80 pt-2">
                          <span className="text-[8px] font-mono text-slate-500 uppercase tracking-widest font-black block">
                            Transaction Reference ID
                          </span>
                          <span className="text-slate-305 font-mono font-black break-all block leading-tight">
                            {rcpt.txHashOrPhone || 'N/A Verification Protocol'}
                          </span>
                        </div>
                      </div>

                      {/* --- DYNAMIC USER CONTROLS BUTTONS AREA --- */}
                      <div className="border-t border-[#141B2D]/60 pt-3.5 flex flex-wrap gap-2 items-center justify-between select-none font-sans font-bold text-[10px]">
                        
                        {/* Status context label */}
                        <span className="text-[9px] font-mono text-slate-500 uppercase font-black">
                          {isPending && '🔒 AWAITING CONFIRMATION'}
                          {isApproved && '🔓 GOLD ACCESS GRANTED'}
                          {isRejected && '❌ SUBMISSION COMPROMISED'}
                          {isRegenerated && '⚠️ URGENT RESUBMISSION REQ'}
                        </span>

                        <div className="flex items-center gap-1.5 ml-auto">
                          
                          {/* Common proof zoom toggle */}
                          {rcpt.screenshot && (
                            <button
                              type="button"
                              onClick={() => setFullscreenScreenshot(rcpt.screenshot)}
                              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-850 text-slate-201 rounded-xl transition flex items-center gap-1 px-3 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View Screen</span>
                            </button>
                          )}

                          {/* State specific buttons */}
                          {isApproved && rcpt.screenshot && (
                            <button
                              type="button"
                              onClick={() => handleDownloadProof(rcpt.screenshot, rcpt.id)}
                              className="px-3.5 py-2 bg-[#F5C400] text-slate-950 font-black uppercase tracking-wider rounded-xl hover:shadow-[0_0_12px_rgba(245,196,0,0.2)] active:scale-95 transition flex items-center gap-1 cursor-pointer"
                            >
                              <Download className="w-3.5 h-3.5 stroke-[2.3]" />
                              <span>Download Receipt</span>
                            </button>
                          )}

                          {isRejected && (
                            <button
                              type="button"
                              onClick={handleScrollToPayments}
                              className="px-3.5 py-2 bg-gradient-to-r from-rose-600 to-rose-700 text-white font-extrabold uppercase tracking-wide rounded-xl active:scale-95 transition flex items-center gap-1 cursor-pointer shadow-lg shadow-rose-900/10"
                            >
                              <RefreshCw className="w-3.5 h-3.5 animate-spin duration-3500" />
                              <span>Resubmit Payment</span>
                            </button>
                          )}

                          {isRegenerated && (
                            <button
                              type="button"
                              onClick={handleScrollToPayments}
                              className="px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black uppercase tracking-widest rounded-xl hover:shadow-[0_0_10px_rgba(59,130,246,0.3)] active:scale-95 transition flex items-center gap-1 cursor-pointer"
                            >
                              <RefreshCw className="w-3.5 h-3.5 animate-spin duration-5000" />
                              <span>Upload New Proof</span>
                            </button>
                          )}

                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>

            </div>
          ))}

        </div>
      )}

      {/* FULLSCREEN ZOOM MODAL OVERLAY */}
      {fullscreenScreenshot && (
        <div className="fixed inset-0 bg-black/99 z-[250] flex flex-col items-center justify-center p-4 select-none animate-fade-in animate-duration-150">
          <div className="max-w-[420px] w-full flex flex-col items-center">
            
            <div className="w-full flex justify-between items-center mb-3.5">
              <span className="text-[9px] text-slate-400 font-mono tracking-widest uppercase">
                Secure Screenshot Proof Inspector
              </span>
              <button 
                onClick={() => setFullscreenScreenshot(null)}
                className="bg-slate-900 border border-slate-800 text-slate-300 hover:text-white rounded-full px-3.5 py-1.8 text-[10px] tracking-wider font-extrabold uppercase transition cursor-pointer"
              >
                Close Zoom ✕
              </button>
            </div>

            <div className="w-full bg-[#040815] border border-slate-900 rounded-[32px] overflow-hidden p-2.5 flex items-center justify-center max-h-[72vh] shadow-2xl relative">
              <img 
                src={fullscreenScreenshot} 
                alt="Fullscreen verification receipt image" 
                className="max-h-[68vh] w-full object-contain rounded-[24px]"
                referrerPolicy="no-referrer"
              />
            </div>

            <div className="w-full flex items-center justify-center gap-3.5 mt-4">
              <button
                onClick={() => handleDownloadProof(fullscreenScreenshot, 'zoom')}
                className="px-4.5 py-2 bg-slate-900 border border-slate-800 text-[#F5C400] text-[10px] font-mono uppercase tracking-widest rounded-full hover:bg-slate-800 transition flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Save Offline proof</span>
              </button>
            </div>
            
          </div>
        </div>
      )}

    </div>
  );
};
