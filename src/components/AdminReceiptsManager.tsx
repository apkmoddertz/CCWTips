import React, { useState, useMemo } from 'react';
import { db } from '../firebase';
import { doc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
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
  Search,
  Filter,
  Trash2,
  Check,
  X,
  Download,
  CheckSquare,
  Square,
  TrendingUp,
  AlertTriangle,
  User,
  ShieldAlert,
  ArrowDownToLine,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Zap
} from 'lucide-react';
import { formatEATDateTime, getEATRelativeHeader } from './UserPaymentReceipts';

interface AdminReceiptsManagerProps {
  paymentsList: any[];
  paymentsLoading: boolean;
  onRefreshList: () => Promise<void>;
  onShowNotification?: (msg: string, type: 'success' | 'info') => void;
}

// Helper to get today's date in EAT format "DD Month YYYY"
const getEATTodayString = (): string => {
  const d = new Date();
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Dar_es_Salaam',
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
  return formatter.format(d);
};

export const AdminReceiptsManager: React.FC<AdminReceiptsManagerProps> = ({
  paymentsList,
  paymentsLoading,
  onRefreshList,
  onShowNotification
}) => {
  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterMethod, setFilterMethod] = useState<string>('all');
  const [datePreset, setDatePreset] = useState<string>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Selected Receipts for Bulk Actions
  const [selectedReceiptIds, setSelectedReceiptIds] = useState<string[]>([]);
  
  // Modals / Overlays
  const [zoomedScreenshot, setZoomedScreenshot] = useState<{ url: string; id: string } | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [bulkDeleteActive, setBulkDeleteActive] = useState<boolean>(false);
  
  // Expiry date picker modal state upon manual individual approval
  const [approvalTarget, setApprovalTarget] = useState<any | null>(null);
  const [customApprovalWeeks, setCustomApprovalWeeks] = useState<number>(4); // default 4 weeks
  const [isApprovingInProgress, setIsApprovingInProgress] = useState<boolean>(false);

  // Computed total statistics
  const stats = useMemo(() => {
    const todayStr = getEATTodayString();
    let total = paymentsList.length;
    let pending = 0;
    let approved = 0;
    let rejected = 0;
    let regenerated = 0;
    let todaysSubmissions = 0;
    let totalAmountReceived = 0; // Sum of approved deposits path

    paymentsList.forEach(p => {
      const status = (p.status || 'pending').toLowerCase();
      if (status === 'pending') pending++;
      if (status === 'approved') {
        approved++;
        totalAmountReceived += (p.planPrice || 0);
      }
      if (status === 'rejected') rejected++;
      if (status === 'regenerated') regenerated++;

      const { date } = formatEATDateTime(p.submittedAt);
      if (date === todayStr) {
        todaysSubmissions++;
      }
    });

    return { total, pending, approved, rejected, regenerated, todaysSubmissions, totalAmountReceived };
  }, [paymentsList]);

  // Handle preset date bounds
  const isWithinDatePreset = (submittedAt: string | undefined): boolean => {
    if (!submittedAt) return false;
    const dateObj = new Date(submittedAt);
    const now = new Date();

    if (datePreset === 'all') return true;

    if (datePreset === 'today') {
      const todayStr = getEATTodayString();
      return formatEATDateTime(submittedAt).date === todayStr;
    }

    if (datePreset === '7days') {
      const diffTime = Math.abs(now.getTime() - dateObj.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 7;
    }

    if (datePreset === '30days') {
      const diffTime = Math.abs(now.getTime() - dateObj.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 30;
    }

    if (datePreset === 'custom') {
      if (!customStartDate && !customEndDate) return true;
      const start = customStartDate ? new Date(customStartDate) : null;
      if (start) start.setHours(0, 0, 0, 0);
      
      const end = customEndDate ? new Date(customEndDate) : null;
      if (end) end.setHours(23, 59, 59, 999);

      if (start && dateObj < start) return false;
      if (end && dateObj > end) return false;
      return true;
    }

    return true;
  };

  // Filtered Receipts based on status, method, search, presets
  const filteredReceipts = useMemo(() => {
    return paymentsList.filter(p => {
      // 1. Status Filter
      if (filterStatus !== 'all' && (p.status || 'pending').toLowerCase() !== filterStatus) return false;

      // 2. Payment Method Filter
      if (filterMethod !== 'all') {
        const method = (p.paymentMethod || '').toLowerCase();
        if (filterMethod === 'usdt' && !method.includes('usdt')) return false;
        if (filterMethod === 'mpesa' && !method.includes('mpesa')) return false;
        if (filterMethod === 'western' && !method.includes('western')) return false;
        if (filterMethod === 'other' && (method.includes('usdt') || method.includes('mpesa') || method.includes('western'))) return false;
      }

      // 3. User Search Filter
      if (searchTerm.trim() !== '') {
        const query = searchTerm.toLowerCase();
        const email = (p.userEmail || '').toLowerCase();
        const username = (p.username || '').toLowerCase();
        const uid = (p.userId || '').toLowerCase();
        const txRef = (p.txHashOrPhone || '').toLowerCase();
        const id = (p.id || '').toLowerCase();

        if (
          !email.includes(query) && 
          !username.includes(query) && 
          !uid.includes(query) && 
          !txRef.includes(query) && 
          !id.includes(query)
        ) {
          return false;
        }
      }

      // 4. Date Preset Filter
      if (!isWithinDatePreset(p.submittedAt)) return false;

      return true;
    });
  }, [paymentsList, filterStatus, filterMethod, searchTerm, datePreset, customStartDate, customEndDate]);

  // Group receipts by EAT Date
  const groupedReceipts = useMemo(() => {
    const groups: { [date: string]: any[] } = {};
    filteredReceipts.forEach(rcpt => {
      const { date } = formatEATDateTime(rcpt.submittedAt);
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(rcpt);
    });

    // Chronological order: newest first
    return Object.keys(groups).sort((a, b) => {
      const firstA = groups[a][0];
      const firstB = groups[b][0];
      return new Date(firstB.submittedAt || 0).getTime() - new Date(firstA.submittedAt || 0).getTime();
    }).map(date => {
      const meta = getEATRelativeHeader(date);
      return {
        date,
        relativeLabel: meta.relativeLabel,
        subtitle: meta.subtitle,
        receipts: groups[date]
      };
    });
  }, [filteredReceipts]);

  // Select handlers
  const handleToggleSelectAll = () => {
    if (selectedReceiptIds.length === filteredReceipts.length) {
      setSelectedReceiptIds([]);
    } else {
      setSelectedReceiptIds(filteredReceipts.map(rcpt => rcpt.id));
    }
  };

  const handleToggleSelectOne = (id: string) => {
    if (selectedReceiptIds.includes(id)) {
      setSelectedReceiptIds(prev => prev.filter(item => item !== id));
    } else {
      setSelectedReceiptIds(prev => [...prev, id]);
    }
  };

  // INDIVIDUAL ACTIONS
  const handlePrepareApprove = (payment: any) => {
    setApprovalTarget(payment);
    setCustomApprovalWeeks(4); // Default to roughly 1 month (28 days)
  };

  const handleConfirmApproval = async () => {
    if (!approvalTarget) return;
    setIsApprovingInProgress(true);
    try {
      const daysOffset = customApprovalWeeks * 7;
      const d = new Date();
      d.setDate(d.getDate() + daysOffset);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const calculatedEndDate = `${year}-${month}-${day}`;
      const today = new Date().toISOString().split('T')[0];

      // Update user role & vip timestamp
      const userRef = doc(db, 'users', approvalTarget.userId);
      await updateDoc(userRef, {
        isVip: true,
        vipStartDate: today,
        vipEndDate: calculatedEndDate
      });

      // Update payment receipt document
      const payRef = doc(db, 'payments', approvalTarget.id);
      await updateDoc(payRef, {
        status: 'approved',
        vipStartDate: today,
        vipEndDate: calculatedEndDate,
        updatedAt: new Date().toISOString()
      });

      onShowNotification?.(`VIP access activated for ${approvalTarget.username} until ${calculatedEndDate}`, 'success');
      setApprovalTarget(null);
      await onRefreshList();
    } catch (err: any) {
      console.error("Error individual approving:", err);
      onShowNotification?.(`Approval failed: ${err.message}`, 'info');
    } finally {
      setIsApprovingInProgress(false);
    }
  };

  const handleRejectReceipt = async (paymentId: string, username: string) => {
    try {
      const payRef = doc(db, 'payments', paymentId);
      await updateDoc(payRef, { 
        status: 'rejected',
        updatedAt: new Date().toISOString()
      });
      onShowNotification?.(`Rejected proof from @${username}`, 'success');
      await onRefreshList();
    } catch (err: any) {
      console.error("Error setting rejected:", err);
      onShowNotification?.(`Rejection action failed`, 'info');
    }
  };

  const handleRegenerateReceipt = async (paymentId: string, username: string) => {
    try {
      const payRef = doc(db, 'payments', paymentId);
      await updateDoc(payRef, { 
        status: 'regenerated',
        updatedAt: new Date().toISOString()
      });
      onShowNotification?.(`Submitted state 'New Proof Required' to @${username}`, 'success');
      await onRefreshList();
    } catch (err: any) {
      console.error("Error individual regenerate:", err);
      onShowNotification?.(`Failed to flag status`, 'info');
    }
  };

  const handleConfirmDeleteSingle = async () => {
    if (!deleteTargetId) return;
    try {
      const payRef = doc(db, 'payments', deleteTargetId);
      await deleteDoc(payRef);
      onShowNotification?.(`Permanently deleted receipt record.`, 'success');
      setDeleteTargetId(null);
      setSelectedReceiptIds(prev => prev.filter(id => id !== deleteTargetId));
      await onRefreshList();
    } catch (err: any) {
      console.error("Error deleting single:", err);
      onShowNotification?.(`Delete failed: ${err.message}`, 'info');
    }
  };

  // BULK ACTIONS
  const handleBulkApprove = async () => {
    if (selectedReceiptIds.length === 0) return;
    const confirmApp = window.confirm(`Are you sure you want to bulk approve ${selectedReceiptIds.length} VIP receipt submissions for 4 Weeks (28 days)?`);
    if (!confirmApp) return;

    try {
      const batch = writeBatch(db);
      const daysOffset = 28; // 4 weeks
      const d = new Date();
      d.setDate(d.getDate() + daysOffset);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const calculatedEndDate = `${year}-${month}-${day}`;
      const today = new Date().toISOString().split('T')[0];

      selectedReceiptIds.forEach(id => {
        const pay = paymentsList.find(p => p.id === id);
        if (pay) {
          const userRef = doc(db, 'users', pay.userId);
          batch.update(userRef, {
            isVip: true,
            vipStartDate: today,
            vipEndDate: calculatedEndDate
          });

          const payRef = doc(db, 'payments', id);
          batch.update(payRef, {
            status: 'approved',
            vipStartDate: today,
            vipEndDate: calculatedEndDate,
            updatedAt: new Date().toISOString()
          });
        }
      });

      await batch.commit();
      onShowNotification?.(`Bulk approved ${selectedReceiptIds.length} receipts successfully!`, 'success');
      setSelectedReceiptIds([]);
      await onRefreshList();
    } catch (err: any) {
      console.error("Error bulk approving:", err);
      onShowNotification?.(`Bulk approval failed.`, 'info');
    }
  };

  const handleBulkReject = async () => {
    if (selectedReceiptIds.length === 0) return;
    const confirmRej = window.confirm(`Are you sure you want to reject the selected ${selectedReceiptIds.length} payment receipts?`);
    if (!confirmRej) return;

    try {
      const batch = writeBatch(db);
      selectedReceiptIds.forEach(id => {
        const payRef = doc(db, 'payments', id);
        batch.update(payRef, { 
          status: 'rejected',
          updatedAt: new Date().toISOString()
        });
      });
      await batch.commit();
      onShowNotification?.(`Bulk rejected ${selectedReceiptIds.length} requests successfully!`, 'success');
      setSelectedReceiptIds([]);
      await onRefreshList();
    } catch (err: any) {
      console.error("Error bulk rejecting:", err);
      onShowNotification?.(`Bulk reject failed`, 'info');
    }
  };

  const handleBulkRegenerate = async () => {
    if (selectedReceiptIds.length === 0) return;
    const confirmReg = window.confirm(`Are you sure you want to request new proof of payment (Regenerate status) for the selected ${selectedReceiptIds.length} receipts?`);
    if (!confirmReg) return;

    try {
      const batch = writeBatch(db);
      selectedReceiptIds.forEach(id => {
        const payRef = doc(db, 'payments', id);
        batch.update(payRef, { 
          status: 'regenerated',
          updatedAt: new Date().toISOString()
        });
      });
      await batch.commit();
      onShowNotification?.(`Bulk requested new proof for ${selectedReceiptIds.length} entries.`, 'success');
      setSelectedReceiptIds([]);
      await onRefreshList();
    } catch (err: any) {
      console.error("Error bulk regenerating:", err);
      onShowNotification?.(`Bulk regenerate action failed`, 'info');
    }
  };

  const handleBulkDelete = async () => {
    setBulkDeleteActive(true);
  };

  const handleConfirmBulkDelete = async () => {
    try {
      const batch = writeBatch(db);
      selectedReceiptIds.forEach(id => {
        const payRef = doc(db, 'payments', id);
        batch.delete(payRef);
      });
      await batch.commit();
      onShowNotification?.(`Bulk deleted ${selectedReceiptIds.length} receipt records successfully.`, 'success');
      setSelectedReceiptIds([]);
      setBulkDeleteActive(false);
      await onRefreshList();
    } catch (err: any) {
      console.error("Bulk delete failed:", err);
      onShowNotification?.(`Bulk delete failed`, 'info');
    }
  };

  const handleDownloadScreenshot = (screenshotUrl: string, id: string) => {
    if (screenshotUrl.startsWith('data:')) {
      const link = document.createElement('a');
      link.href = screenshotUrl;
      link.download = `verified_receipt_${id.substring(0,8)}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      window.open(screenshotUrl, '_blank');
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#060813] text-slate-100 select-none pb-8">
      
      {/* HEADER SECTION */}
      <div className="p-5 border-b border-[#141B2E] bg-slate-950 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="font-heading font-black text-[16px] text-[#F5C400] uppercase tracking-widest flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-[#F5C400]" />
            FINTECH PAYMENT VERIFICATION CONTROL
          </h3>
          <p className="text-[10px] text-slate-400 font-medium">
            Administrative gateway to verify user-submitted snapshot transaction audits (Dar es Salaam timezone)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={onRefreshList}
            className="px-4 py-2 bg-gradient-to-r from-slate-900 to-slate-950 border border-slate-800 hover:border-[#F5C400]/40 text-slate-200 text-[10px] font-black uppercase tracking-wider rounded-xl hover:text-[#F5C400] transition cursor-pointer flex items-center gap-2 shadow"
            title="Force synchronization with Firestore ledger records"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync Ledger Ledger</span>
          </button>
        </div>
      </div>

      {/* 1. TOP STATISTICS METRICS GLASS PANEL (Stripe / Paypal Business inspired) */}
      <div className="p-5 grid grid-cols-2 sm:grid-cols-7 gap-3 border-b border-[#141B2E] bg-[#0A0D1B]/40">
        {[
          { label: 'Total Submissions', val: stats.total, color: 'text-slate-100', bg: 'bg-[#121B33]/10 border-slate-900/60' },
          { label: 'Pending Review', val: stats.pending, color: 'text-amber-400 font-extrabold', bg: 'bg-amber-450/4 border-amber-500/10' },
          { label: 'Approved Access', val: stats.approved, color: 'text-emerald-400 font-extrabold', bg: 'bg-emerald-450/4 border-emerald-500/10' },
          { label: 'Rejected Proofs', val: stats.rejected, color: 'text-rose-500 font-extrabold', bg: 'bg-rose-450/4 border-rose-500/10' },
          { label: 'Regenerated Req', val: stats.regenerated, color: 'text-blue-400 font-extrabold', bg: 'bg-blue-450/4 border-blue-500/10' },
          { label: "Today's Submissions", val: stats.todaysSubmissions, color: 'text-[#F5C400] font-black', bg: 'bg-[#F5C400]/5 border-[#F5C400]/20' },
          { label: "Total Amount Rec", val: `$${stats.totalAmountReceived.toFixed(2)}`, color: 'text-emerald-400 font-black', bg: 'bg-emerald-500/5 border-emerald-500/20' }
        ].map((item, index) => (
          <div key={index} className={`rounded-2xl p-3 border hover:border-slate-805 transition duration-300 ${item.bg}`}>
            <span className="text-[7.5px] font-mono uppercase tracking-wider text-slate-500 block font-black leading-none">{item.label}</span>
            <span className={`text-[16px] font-mono mt-1 block leading-none ${item.color}`}>{item.val}</span>
          </div>
        ))}
      </div>

      {/* 2. ADVANCED STICKY FILTER ACTION CONTROL PANEL */}
      <div className="p-5 border-b border-[#141B2E] space-y-3 bg-[#0A0E1A]/85 flex flex-col sticky top-0 z-30 shadow-md">
        
        {/* Row 1: Filter Drops and Search bar */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          
          {/* User Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search user, ID, email, reference..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-850 focus:border-[#F5C400]/40 rounded-xl text-slate-100 text-[11px] font-mono outline-none"
            />
          </div>

          {/* Status Dropdown */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-mono text-slate-500 uppercase shrink-0 font-black">Status:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="flex-1 px-3 py-2 bg-slate-950 border border-slate-850 focus:border-[#F5C400]/40 rounded-xl text-slate-100 text-[11px] font-mono font-bold uppercase transition"
            >
              <option value="all">ALL STATUSES</option>
              <option value="pending">🟡 PENDING</option>
              <option value="approved">🟢 APPROVED</option>
              <option value="rejected">🔴 REJECTED</option>
              <option value="regenerated">🔵 REGENERATED</option>
            </select>
          </div>

          {/* Payment Method Dropdown */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-mono text-slate-500 uppercase shrink-0 font-black">Method:</span>
            <select
              value={filterMethod}
              onChange={(e) => setFilterMethod(e.target.value)}
              className="flex-1 px-3 py-2 bg-slate-950 border border-slate-850 focus:border-[#F5C400]/40 rounded-xl text-slate-100 text-[11px] font-mono font-bold uppercase transition"
            >
              <option value="all">ALL METADATA</option>
              <option value="usdt">USDT COINS</option>
              <option value="mpesa">M-PESA MOBILE</option>
              <option value="western">WESTERN UNION</option>
              <option value="other">MANUAL BANK</option>
            </select>
          </div>

          {/* Date Presets Toggle */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-mono text-slate-500 uppercase shrink-0 font-black">Date Range:</span>
            <select
              value={datePreset}
              onChange={(e) => setDatePreset(e.target.value)}
              className="flex-1 px-3 py-2 bg-slate-950 border border-slate-850 focus:border-[#F5C400]/40 rounded-xl text-slate-100 text-[11px] font-mono font-bold uppercase transition"
            >
              <option value="all">ALL TRANSACTIONS</option>
              <option value="today">TODAY ONLY (EAT)</option>
              <option value="7days">LAST 7 DAYS</option>
              <option value="30days">LAST 30 DAYS</option>
              <option value="custom">CUSTOM CALENDAR</option>
            </select>
          </div>
        </div>

        {/* Custom Calendar date picker drawer if preset set to custom */}
        {datePreset === 'custom' && (
          <div className="px-4 py-3 bg-slate-950/70 border border-slate-900 rounded-xl flex flex-wrap items-center gap-4.5 animate-slide-down">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500 font-mono text-[9px] uppercase font-bold">Start:</span>
              <input 
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="bg-[#0b0f1a] border border-slate-850 text-slate-200 text-[10.5px] font-mono px-2.5 py-1 rounded-lg"
              />
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500 font-mono text-[9px] uppercase font-bold">End:</span>
              <input 
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="bg-[#0b0f1a] border border-slate-850 text-slate-200 text-[10.5px] font-mono px-2.5 py-1 rounded-lg"
              />
            </div>
            <button
              onClick={() => {
                setCustomStartDate('');
                setCustomEndDate('');
              }}
              className="text-[#F5C400] text-[9.5px] font-mono uppercase bg-[#F5C400]/5 px-2.5 py-1 rounded border border-[#F5C400]/15 tracking-wider hover:bg-[#F5C400]/10 cursor-pointer text-center ml-auto"
            >
              RESET CUSTOM BOUNDS
            </button>
          </div>
        )}

        {/* Bulk Selection toggle triggers */}
        <div className="pt-2 flex items-center justify-between gap-3 text-[11px] font-sans">
          <div className="flex items-center gap-2 text-slate-400 select-none">
            <button
              onClick={handleToggleSelectAll}
              className="px-3.5 py-1.5 bg-slate-950 border border-slate-850 hover:bg-slate-900 text-[10px] font-mono uppercase tracking-wider font-bold rounded-lg transition"
            >
              {selectedReceiptIds.length === filteredReceipts.length ? 'Deselect All' : 'Select All matching'}
            </button>
            <span className="text-[10px] font-mono text-slate-555">
              Showing {filteredReceipts.length} of {paymentsList.length} receipts
            </span>
          </div>
        </div>

        {/* Bulk Actions Bar if selection made */}
        {selectedReceiptIds.length > 0 && (
          <div className="p-3.5 bg-gradient-to-r from-amber-500/10 via-slate-950 to-amber-500/5 border border-amber-500/25 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 animate-pulse select-none">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-[#F5C400]" />
              <span className="text-[10.5px] font-sans font-black text-slate-100">
                Bulk Operations Queue: <span className="text-[#F5C400] underline font-mono font-bold bg-[#F5C400]/5 px-2.5 py-0.5 rounded border border-[#F5C400]/10 text-[9.5px] ml-1">{selectedReceiptIds.length} receipts</span>
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 md:justify-end">
              <button
                onClick={handleBulkApprove}
                className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-555 text-white font-black text-[9.5px] uppercase tracking-wider rounded-xl cursor-pointer active:scale-95 transition"
              >
                Bulk Approve
              </button>
              <button
                onClick={handleBulkReject}
                className="px-3.5 py-2 bg-gradient-to-r from-red-650 to-rose-600 text-white font-black text-[9.5px] uppercase tracking-wider rounded-xl cursor-pointer active:scale-95 transition"
              >
                Bulk Reject
              </button>
              <button
                onClick={handleBulkRegenerate}
                className="px-3.5 py-2 bg-gradient-to-r from-blue-650 to-indigo-650 text-white font-black text-[9.5px] uppercase tracking-wider rounded-xl cursor-pointer active:scale-95 transition"
              >
                Bulk Request Proof
              </button>
              <button
                onClick={handleBulkDelete}
                className="px-3.5 py-2 bg-[#1C0F10] border border-red-500/30 text-rose-455 font-black text-[9.5px] uppercase tracking-wider rounded-xl cursor-pointer active:scale-95 transition hover:bg-rose-500/10 shadow"
              >
                Bulk Delete
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3. SCROLLING MAIN TIMELINE RECEIPTS LIST */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-none">
        {paymentsLoading ? (
          <div className="py-24 text-center text-slate-500 text-[11px] font-mono tracking-widest flex flex-col items-center justify-center gap-3 animate-pulse uppercase font-black">
            <RefreshCw className="w-6 h-6 text-[#F5C400] animate-spin" />
            <span>Synchronizing administrative billing metrics...</span>
          </div>
        ) : filteredReceipts.length === 0 ? (
          <div className="py-20 text-center bg-[#070b19]/45 border border-slate-900 border-dashed rounded-[32px] max-w-lg mx-auto">
            <ImageIcon className="w-10 h-10 text-slate-700 mx-auto mb-3" />
            <p className="text-[12px] text-slate-400 font-black uppercase tracking-wider">No matching transaction receipts found</p>
            <p className="text-[10px] text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
              Ensure search keywords reflect verified ID elements, customize boundaries, or expand date range calendars.
            </p>
          </div>
        ) : (
          <div className="space-y-12 relative pl-4 border-l border-slate-900/70 ml-2.5">
            {groupedReceipts.map(group => (
              <div key={group.date} className="relative space-y-6">
                
                {/* Timeline vertical node dot representing visual milestone */}
                <div className="absolute -left-[20.5px] top-1.5 w-[11.5px] h-[11.5px] rounded-full bg-[#030610] border-2 border-[#F5C400] shadow-[0_0_8px_#F5C400]" />
                
                {/* LARGE STICKY DATE DIVIDER HEADER */}
                <div className="sticky top-0 bg-[#060813] py-2 z-10 flex flex-col gap-0.5 select-none drop-shadow">
                  <span className="text-[9.5px] font-mono font-black text-[#F5C400] tracking-widest uppercase">
                    {group.relativeLabel}
                  </span>
                  <span className="text-[13.5px] font-heading font-extrabold text-slate-205 tracking-tight uppercase">
                    {group.subtitle}
                  </span>
                </div>

                {/* Receipts cards matching group bounds */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {group.receipts.map(pay => {
                    const { date: fileDate, time: fileTime } = formatEATDateTime(pay.submittedAt);
                    const { time: updateTime } = formatEATDateTime(pay.updatedAt || pay.submittedAt);
                    const isSelected = selectedReceiptIds.includes(pay.id);
                    const isPending = pay.status === 'pending';
                    const isApproved = pay.status === 'approved';
                    const isRejected = pay.status === 'rejected';
                    const isRegenerated = pay.status === 'regenerated';

                    // Convert and format Currency equivalent
                    const isTz = pay.paymentMethod?.toLowerCase().includes('tanzania');
                    const isKe = pay.paymentMethod?.toLowerCase().includes('kenya');
                    let localMoneyStr = '';
                    if (isTz && pay.planPrice) {
                      localMoneyStr = `${(Math.round(pay.planPrice * 2600)).toLocaleString()} TZS (Dar es Salaam rate)`;
                    } else if (isKe && pay.planPrice) {
                      localMoneyStr = `${(Math.round(pay.planPrice * 135)).toLocaleString()} KES`;
                    }

                    return (
                      <div 
                        key={pay.id}
                        className={`relative bg-gradient-to-b from-[#0B0F1A] to-[#04060F] border hover:border-slate-850 transition-all duration-300 p-5 rounded-[28px] flex flex-col gap-4 text-xs shadow-lg ${
                          isSelected ? 'border-amber-500/40 bg-[#0b0f1a]/95 shadow-[#F5C400]/2' : 'border-[#151B2E]'
                        }`}
                      >
                        {/* Selector indicator line representing current database state */}
                        <div className={`absolute left-0 top-4 bottom-4 w-1 rounded-r-lg ${
                          isApproved ? 'bg-emerald-500' : 
                          isRejected ? 'bg-rose-500' : 
                          isRegenerated ? 'bg-blue-500 animate-pulse' : 
                          'bg-amber-500'
                        }`} />

                        {/* Card top row with header actions and ID summary */}
                        <div className="flex items-start justify-between gap-3.5 pl-1.5 select-none font-sans">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => handleToggleSelectOne(pay.id)}
                              className="text-slate-500 hover:text-[#F5C400] cursor-pointer bg-slate-950 p-1.5 rounded-lg border border-slate-900 transition"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-amber-400" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-800" />
                              )}
                            </button>

                            <div className="h-9 w-9 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 text-[11px] font-black uppercase flex items-center justify-center shrink-0">
                              {pay.username ? pay.username.substring(0, 2) : 'UR'}
                            </div>

                            <div className="space-y-0.5 min-w-0">
                              <h4 className="font-extrabold text-[13px] text-white select-text truncate leading-none">
                                {pay.username || 'VIP Client'}
                              </h4>
                              <span className="text-[9.5px] font-mono text-slate-400 select-all block leading-none">
                                {pay.userEmail}
                              </span>
                            </div>
                          </div>

                          <div className="text-right flex flex-col items-end gap-1.5 shrink-0">
                            <span className={`px-2.5 py-0.5 rounded-full text-[8.5px] font-black uppercase tracking-wider border leading-none ${
                              isApproved ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400 font-extrabold' :
                              isRejected ? 'bg-rose-500/10 border-rose-500/25 text-rose-500 font-extrabold' :
                              isRegenerated ? 'bg-blue-500/10 border-blue-500/25 text-blue-400 font-extrabold animate-pulse' :
                              'bg-amber-400/10 border-amber-400/25 text-amber-400 font-extrabold'
                            }`}>
                              {isApproved && 'Approved'}
                              {isRejected && 'Failed'}
                              {isRegenerated && 'New Proof Req'}
                              {isPending && 'Awaiting Audit'}
                            </span>
                            <span className="block text-[8px] font-mono text-slate-500 uppercase font-black tracking-widest">{fileTime}</span>
                          </div>
                        </div>

                        {/* SCREENSHOT PREVIEW SHOWN FIRST AND LARGE OPTIMIZED FOR VERIFICATION */}
                        {pay.screenshot ? (
                          <div className="px-1 space-y-1.5 select-none">
                            <div className="relative h-56 rounded-[22px] overflow-hidden bg-slate-950 border border-slate-900 flex items-center justify-center cursor-zoom-in group/img hover:border-slate-800 transition duration-300 shadow-inner">
                              <img
                                src={pay.screenshot}
                                alt="Verification receipt screenshot proof"
                                className="w-full h-full object-contain pointer-events-none group-hover/img:scale-[1.01] transition-transform duration-350"
                                referrerPolicy="no-referrer"
                              />
                              {/* Hover frame action overlay */}
                              <div className="absolute inset-0 bg-slate-950/75 opacity-0 group-hover/img:opacity-100 flex flex-col items-center justify-center gap-2 transition duration-205">
                                <button
                                  type="button"
                                  onClick={() => setZoomedScreenshot({ url: pay.screenshot, id: pay.id })}
                                  className="px-4 py-2 bg-[#F5C400] text-[#0A0E1A] font-black tracking-widest uppercase text-[10px] rounded-xl cursor-pointer hover:scale-105 active:scale-95 transition"
                                >
                                  Open Inspect Scope
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDownloadScreenshot(pay.screenshot, pay.id)}
                                  className="px-3 py-1.5 bg-slate-900 border border-slate-800 text-slate-300 rounded-lg hover:text-white transition flex items-center gap-1 cursor-pointer text-[9px] uppercase tracking-wider font-mono"
                                >
                                  <ArrowDownToLine className="w-3.5 h-3.5" />
                                  <span>Download Screenshot</span>
                                </button>
                              </div>
                            </div>
                            <span className="text-[8px] font-mono font-black text-slate-550 uppercase block select-none text-right">
                              Verification Screenshot Proof (Immediate render viewport)
                            </span>
                          </div>
                        ) : (
                          <div className="p-4 rounded-2xl border border-rose-550/25 bg-rose-500/5 text-rose-455 flex items-center gap-3 text-[10px] select-none font-bold">
                            <ShieldAlert className="w-4 h-4 text-rose-500 fill-none" />
                            <span>System Security Defect: Raw deposit snapshot absent from storage profile ledger!</span>
                          </div>
                        )}

                        {/* COMPREHENSIVE FINANCIAL INFORMATION GRID PANEL */}
                        <div className="bg-[#050711] p-3.5 rounded-[22px] border border-slate-900/60 font-mono text-[10px] select-text grid grid-cols-2 gap-3.5 leading-tight">
                          
                          <div className="space-y-0.5">
                            <span className="text-[7.5px] text-slate-500 uppercase tracking-widest block leading-none">
                              Client Auth Profile
                            </span>
                            <span className="text-white font-extrabold block truncate uppercase">
                              {pay.username || 'System User'} 
                            </span>
                            <span className="text-slate-500 text-[8.5px] block truncate text-[9.5px]">
                              UID: {pay.userId}
                            </span>
                          </div>

                          <div className="space-y-0.5">
                            <span className="text-[7.5px] text-slate-500 uppercase tracking-widest block leading-none">
                              VIP Plan Lock-Tier
                            </span>
                            <span className="text-amber-500 font-extrabold block uppercase">
                              {pay.planDuration || 'Manual Activation'}
                            </span>
                            <span className="text-slate-500 block text-[9.5px]">
                              Rate: ${pay.planPrice?.toFixed(2)} USD
                            </span>
                          </div>

                          <div className="space-y-0.5 col-span-2 border-t border-slate-900/80 pt-2.5">
                            <span className="text-[7.5px] text-slate-500 uppercase tracking-widest block leading-none mb-1">
                              Payment Protocol Details
                            </span>
                            <div className="flex flex-col gap-1">
                              <span className="text-slate-300 font-black block tracking-wide">
                                Channel: {pay.paymentMethod || 'Other Private Wire'}
                              </span>
                              {localMoneyStr && (
                                <span className="text-emerald-400 font-black block text-[9.5px]">
                                  Equiv: {localMoneyStr}
                                </span>
                              )}
                              <span className="text-slate-400 block tracking-tight break-all">
                                Reference/Phone: {pay.txHashOrPhone || 'N/A Verification Hash'}
                              </span>
                            </div>
                          </div>

                          <div className="col-span-2 border-t border-slate-900/80 pt-2.5 grid grid-cols-3 gap-2 text-[8px] text-slate-500 font-black tracking-tight select-none">
                            <div className="space-y-0.5">
                              <span>DATE SUBMITTED</span>
                              <span className="text-slate-400 block font-mono mt-0.5">{fileDate}</span>
                            </div>
                            <div className="space-y-0.5">
                              <span>TIME TIMESTAMP</span>
                              <span className="text-slate-400 block font-mono mt-0.5">{fileTime}</span>
                            </div>
                            <div className="space-y-0.5">
                              <span>LAST UPDATE</span>
                              <span className="text-[#F5C400] block font-mono mt-0.5">{updateTime}</span>
                            </div>
                          </div>
                        </div>

                        {/* Subscription indicators if already approved */}
                        {isApproved && pay.vipStartDate && pay.vipEndDate && (
                          <div className="mx-1 px-3 py-2 bg-emerald-500/5 border border-emerald-500/15 rounded-xl text-[9px] font-mono text-emerald-400 font-bold flex items-center gap-2 select-all">
                            <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Membership limits: {pay.vipStartDate} to {pay.vipEndDate}</span>
                          </div>
                        )}

                        {/* ADMINISTRATIVE DYNAMIC ACTIONS AREA */}
                        <div className="border-t border-[#141B2E] pt-3.5 flex flex-wrap gap-2 justify-between items-center mt-1 select-none font-sans font-black text-[9.5px]">
                          
                          <div className="flex flex-wrap items-center gap-2">
                            {isPending ? (
                              <>
                                <button
                                  onClick={() => handlePrepareApprove(pay)}
                                  className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white rounded-xl active:scale-95 transition cursor-pointer flex items-center gap-1 px-3 shadow"
                                >
                                  <Check className="w-3.5 h-3.5 text-white" />
                                  <span>Approve Ledger</span>
                                </button>
                                <button
                                  onClick={() => handleRejectReceipt(pay.id, pay.username)}
                                  className="px-3 py-2 bg-[#120F16] hover:bg-rose-500/10 border border-slate-900 hover:border-rose-500/20 text-rose-450 rounded-xl cursor-pointer active:scale-95 transition"
                                >
                                  Reject Verification
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => handleRegenerateReceipt(pay.id, pay.username)}
                                className="px-3 py-2 bg-slate-900 hover:bg-blue-500/10 border border-slate-900 hover:border-blue-500/20 text-slate-350 rounded-xl cursor-pointer active:scale-95 transition flex items-center gap-1"
                              >
                                <RefreshCw className="w-3.5 h-3.5 text-blue-400 animate-spin duration-5000" />
                                <span>Status to Regenerate</span>
                              </button>
                            )}
                          </div>

                          <button
                            onClick={() => setDeleteTargetId(pay.id)}
                            className="p-2 bg-red-500/5 hover:bg-red-500/20 text-red-500 border border-slate-900 hover:border-[#EF4444]/40 rounded-xl active:scale-95 transition cursor-pointer"
                            title="Hard delete transaction proof permanently"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                      </div>
                    );
                  })}
                </div>

              </div>
            ))}
          </div>
        )}
      </div>

      {/* --- ADMINISTRATIVE OVERLAY MODALS --- */}

      {/* 1. SEPARATE SCREENSHOT ENHANCED INSPECTOR MODAL */}
      {zoomedScreenshot && (
        <div className="fixed inset-0 bg-black/99 z-[170] flex flex-col items-center justify-center p-4 animate-fade-in animate-duration-150">
          <div className="max-w-[420px] w-full flex flex-col items-center">
            
            <div className="w-full flex justify-between items-center mb-3">
              <span className="text-[10px] text-slate-400 font-mono tracking-widest uppercase">Inspect Screenshot Verification</span>
              <button 
                onClick={() => setZoomedScreenshot(null)}
                className="bg-slate-900 border border-slate-800 text-slate-300 hover:text-white rounded-full px-3.5 py-1.8 text-[10px] tracking-wider uppercase font-black cursor-pointer"
              >
                Close Zoom ✕
              </button>
            </div>

            <div className="w-full bg-[#030610] border border-slate-900 rounded-[28px] overflow-hidden p-2 flex items-center justify-center max-h-[72vh] shadow-2xl relative">
              <img 
                src={zoomedScreenshot.url} 
                alt="Verification screenshot proof" 
                className="max-h-[68vh] w-full object-contain rounded-2xl"
                referrerPolicy="no-referrer"
              />
            </div>

            <div className="w-full flex items-center justify-center gap-3 mt-4">
              <button
                onClick={() => handleDownloadScreenshot(zoomedScreenshot.url, zoomedScreenshot.id)}
                className="px-4.5 py-2 bg-slate-900 border border-slate-800 text-[#F5C400] text-[9.5px] font-mono uppercase tracking-widest rounded-xl hover:bg-slate-850 flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Save Local PNG</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. DYNAMIC MANUALLY VIP DATE PICKER CHANGER OVERLAY (Open on Approve VIP clicking) */}
      {approvalTarget && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-sm z-[160] flex items-center justify-center p-4 animate-fade-in">
          <div className="relative w-full max-w-[345px] bg-[#0A0D18] border border-[#141B2E] rounded-[32px] p-6 shadow-2xl animate-scale-up select-none">
            
            <div className="text-center space-y-2 mb-4">
              <Award className="w-8 h-8 text-[#F5C400] mx-auto animate-bounce mt-1" />
              <h4 className="text-sm font-sans font-black text-white uppercase tracking-tight">Approve VIP Access</h4>
              <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                Assign premium membership length to user <strong className="text-white">@{approvalTarget.username}</strong>
              </p>
            </div>

            <div className="space-y-4 bg-slate-950 p-4 rounded-2xl border border-slate-900 mb-5">
              <div className="space-y-1.5">
                <label className="text-[8.5px] font-mono text-slate-400 uppercase font-black tracking-wider block">Duration Preset Length:</label>
                <select
                  value={customApprovalWeeks}
                  onChange={(e) => setCustomApprovalWeeks(parseInt(e.target.value))}
                  className="w-full px-3 py-2 bg-[#090C17] border border-slate-850 focus:border-[#F5C400]/40 rounded-xl text-slate-100 text-[11px] font-mono font-bold uppercase transition outline-none"
                >
                  <option value={1}>1 WEEK PASS (7 Days)</option>
                  <option value={2}>2 WEEKS PASS (14 Days)</option>
                  <option value={4}>4 WEEKS / 1 MONTH (28 Days)</option>
                  <option value={8}>8 WEEKS / 2 MONTHS (56 Days)</option>
                  <option value={12}>12 WEEKS / 3 MONTHS (84 Days)</option>
                  <option value={24}>24 WEEKS / 6 MONTHS (168 Days)</option>
                  <option value={52}>52 WEEKS / 1 YEAR (364 Days)</option>
                </select>
              </div>

              <div className="text-center text-[9px] font-mono text-amber-500 bg-[#F5C400]/5 py-1.5 rounded-lg border border-[#F5C400]/10 leading-relaxed font-bold">
                🔒 Access starts EAT Today & automatically expires on computed end date.
              </div>
            </div>

            <div className="flex gap-2 font-sans font-bold text-[10.5px]">
              <button
                onClick={() => setApprovalTarget(null)}
                className="flex-1 py-2 bg-slate-900 hover:bg-slate-850 text-slate-350 border border-slate-850 rounded-xl uppercase transition tracking-wider cursor-pointer font-extrabold"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmApproval}
                disabled={isApprovingInProgress}
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-550 text-white rounded-xl uppercase transition tracking-widest font-black flex items-center justify-center gap-1.5 cursor-pointer shadow-lg"
              >
                {isApprovingInProgress ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                )}
                <span>CONFIRM APPROVE</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. CONFIRM PURGE SINGLE RECEIPT MODAL (LITERAL ACCORD WITH USER_REQUEST REQUIREMENTS) */}
      {deleteTargetId && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-sm z-[180] flex items-center justify-center p-4 animate-fade-in animate-duration-150 select-none">
          <div className="max-w-[325px] w-full bg-[#0B0F1A] border-2 border-rose-500/30 rounded-3xl p-6 shadow-2xl relative text-center">
            
            <div className="w-11 h-11 bg-rose-500/10 border border-rose-500/25 rounded-full flex items-center justify-center mx-auto mb-3.5 text-rose-500 animate-pulse">
              <AlertTriangle className="w-6 h-6 stroke-[1.8]" />
            </div>

            {/* Exactly as requested by User requirements */}
            <p className="text-slate-100 text-[11.5px] leading-relaxed font-black max-w-[275px] mx-auto">
              Are you sure you want to permanently delete this payment receipt?
            </p>
            <p className="text-rose-400 text-[10px] leading-relaxed font-bold mt-1.5">
              This action cannot be undone.
            </p>

            <span className="text-[8px] font-mono font-black text-rose-455 uppercase tracking-widest bg-rose-500/5 border border-rose-500/15 px-3 py-1 rounded-full mt-4 inline-block">
              Permanent purge protocol
            </span>

            <div className="flex gap-2 mt-6 font-sans font-bold text-[10.5px]">
              <button
                onClick={() => setDeleteTargetId(null)}
                className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-850 rounded-xl uppercase transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeleteSingle}
                className="flex-1 py-2.5 bg-gradient-to-r from-red-600 to-[#C62828] text-white rounded-xl uppercase transition font-black tracking-wide cursor-pointer shadow-lg active:scale-95"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. CONFIRM BULK PURGE MODAL */}
      {bulkDeleteActive && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-sm z-[180] flex items-center justify-center p-4 animate-fade-in animate-duration-150 select-none">
          <div className="max-w-[325px] w-full bg-[#0B0F1A] border-2 border-rose-500/30 rounded-3xl p-6 shadow-2xl relative text-center">
            
            <div className="w-11 h-11 bg-rose-500/10 border border-rose-500/25 rounded-full flex items-center justify-center mx-auto mb-3.5 text-rose-500 animate-pulse">
              <AlertTriangle className="w-6 h-6 stroke-[1.8]" />
            </div>

            {/* Exactly as requested by User requirements */}
            <p className="text-slate-100 text-[11.5px] leading-relaxed font-black max-w-[275px] mx-auto">
              Are you sure you want to permanently delete this payment receipt?
            </p>
            <p className="text-rose-400 text-[10px] leading-relaxed font-bold mt-1.5">
              This action cannot be undone.
            </p>

            <span className="text-[8px] font-mono font-black text-rose-455 uppercase tracking-widest bg-rose-500/5 border border-rose-500/15 px-3 py-1 rounded-full mt-4 inline-block">
              Deleting {selectedReceiptIds.length} select entries
            </span>

            <div className="flex gap-2 mt-6 font-sans font-bold text-[10.5px]">
              <button
                onClick={() => setBulkDeleteActive(false)}
                className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-850 rounded-xl uppercase transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmBulkDelete}
                className="flex-1 py-2.5 bg-gradient-to-r from-red-600 to-[#C62828] text-white rounded-xl uppercase transition font-black tracking-wide cursor-pointer shadow-lg active:scale-95"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
