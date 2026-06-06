import React, { useState, useEffect } from 'react';
import { MatchTip, DateItem } from '../types';
import { db, restoreScreenshotMatches } from '../firebase';
import { collection, getDocs, doc, updateDoc, deleteDoc, setDoc } from 'firebase/firestore';
import { Key, Plus, RefreshCw, X, Shield, PlusCircle, CheckCircle, Database, Settings, Sparkles, Users, Trash2, Calendar, User, Mail, DollarSign, Copy, Eye, Image, Search, ShieldCheck, ShieldAlert, Lock, Check, Download, Share2 } from 'lucide-react';
import { DateTimeRowPicker } from './DateTimePicker';
import { exportReceiptToPNG } from '../utils/canvasExporter';
import { AdminReceiptsManager } from './AdminReceiptsManager';

// --- DAR ES SALAAM (EAST AFRICA TIME, UTC+3) DATE-TIME HELPERS ---
const getEATDate = (date: Date = new Date()): Date => {
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  return new Date(utc + (3 * 3600000));
};

const getTodayInEATString = (): string => {
  const eatDate = getEATDate();
  const yyyy = eatDate.getFullYear();
  const mm = String(eatDate.getMonth() + 1).padStart(2, '0');
  const dd = String(eatDate.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const getNowInEATTimeString = (): string => {
  const eatDate = getEATDate();
  const hh = String(eatDate.getHours()).padStart(2, '0');
  const mm = String(eatDate.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
};

const getFutureEATDateString = (daysOffset: number): string => {
  const d = new Date();
  const utc = d.getTime() + d.getTimezoneOffset() * 60000;
  const eatDate = new Date(utc + (3 * 3600000));
  eatDate.setDate(eatDate.getDate() + daysOffset);
  const yyyy = eatDate.getFullYear();
  const mm = String(eatDate.getMonth() + 1).padStart(2, '0');
  const dd = String(eatDate.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const formatDurationForReceipt = (duration: string | undefined): string => {
  if (!duration) return 'N/A';
  const norm = duration.toLowerCase().replace(/\s+/g, '');
  if (
    norm.includes('1day') || 
    norm === '1day' || 
    norm === 'day' || 
    norm === 'single' || 
    norm === 'singleday' || 
    norm === 'daily' || 
    norm === '1'
  ) {
    return '1day';
  }
  return duration;
};

interface AdminPanelProps {
  dates: DateItem[];
  selectedDateId: string;
  isUnlocked: boolean;
  onToggleUnlock: () => void;
  onAddMatch: (match: Omit<MatchTip, 'id'>) => void;
  onResetData: () => void;
  onClose: () => void;
  initialSubTab?: 'add' | 'payments' | 'users' | 'settings';
  onShowNotification?: (msg: string, type: 'success' | 'info') => void;
  isApprovalsTickerOn?: boolean;
  onToggleApprovalsTicker?: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  dates,
  selectedDateId,
  isUnlocked,
  onToggleUnlock,
  onAddMatch,
  onResetData,
  onClose,
  initialSubTab = 'add',
  onShowNotificationByLegacy, // wait, let's use the explicit name onShowNotification
  onShowNotification,
  isApprovalsTickerOn = true,
  onToggleApprovalsTicker,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'add' | 'payments' | 'users' | 'settings'>(initialSubTab as any);

  // Add Match state
  const [home, setHome] = useState('');
  const [away, setAway] = useState('');
  const [time, setTime] = useState(() => getNowInEATTimeString());
  const [prediction, setPrediction] = useState('Over 1.5 Goals');
  const [odds, setOdds] = useState('1.50');
  const [tipType, setTipType] = useState<'free' | 'vip'>('free');
  const [tipStatus, setTipStatus] = useState<'pending' | 'win' | 'lose'>('pending');
  const [publishDateId, setPublishDateId] = useState(() => getTodayInEATString());
  const [isSubmittingMatch, setIsSubmittingMatch] = useState(false);
  const [keepPanelOpen, setKeepPanelOpen] = useState(true);

  // Set default today & now on render check
  useEffect(() => {
    setTime(getNowInEATTimeString());
    setPublishDateId(getTodayInEATString());
  }, []);

  const [isResetConfirming, setIsResetConfirming] = useState(false);
  const [isRestoringScreenshot, setIsRestoringScreenshot] = useState(false);

  const handleExecuteScreenshotRestore = async () => {
    setIsRestoringScreenshot(true);
    try {
      const restored = await restoreScreenshotMatches();
      if (restored > 0) {
        onShowNotification?.(`Success! Recovered ${restored} screenshot matches on June 4th, 5th, and 6th with perfect Free/VIP sorting!`, 'success');
      } else {
        onShowNotification?.('Matches have already been restored! All 8 screenshot matches are live of your database.', 'info');
      }
    } catch (err: any) {
      console.error('Failed to execute screenshot recovery:', err);
      onShowNotification?.(`Recovery failed: ${err.message}`, 'info');
    } finally {
      setIsRestoringScreenshot(false);
    }
  };

  // Manage Users state
  const [usersList, setUsersList] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [actionUserId, setActionUserId] = useState<string | null>(null);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userVipFilter, setUserVipFilter] = useState<'all' | 'vip' | 'free'>('all');

  // Payments verification state
  const [paymentsList, setPaymentsList] = useState<any[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [selectedScreenshotUrl, setSelectedScreenshotUrl] = useState<string | null>(null);
  const [showEmailsInReceipts, setShowEmailsInReceipts] = useState(true);

  // Approving payment date range modal state
  const [paymentToApprove, setPaymentToApprove] = useState<any | null>(null);
  const [approvalEndDate, setApprovalEndDate] = useState<string>(() => getTodayInEATString());
  const [approvalRangeType, setApprovalRangeType] = useState<'today' | 'week' | 'custom'>('today');

  // Recycle Bin states
  const [deletedMatches, setDeletedMatches] = useState<any[]>([]);
  const [deletedLoading, setDeletedLoading] = useState(false);

  const fetchDeletedMatches = async () => {
    setDeletedLoading(true);
    try {
      const col = collection(db, 'recycle_bin');
      const snapshot = await getDocs(col);
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      list.sort((a: any, b: any) => new Date(b.deletedAt || 0).getTime() - new Date(a.deletedAt || 0).getTime());
      setDeletedMatches(list);
    } catch (err) {
      console.error('Error fetching recycle bin:', err);
    } finally {
      setDeletedLoading(false);
    }
  };

  const handleRestoreMatch = async (item: any) => {
    try {
      const originalId = item.id;
      const { backupId, deletedAt, ...originalFields } = item;
      
      const docRef = doc(db, 'matches', originalId);
      await setDoc(docRef, {
        ...originalFields,
        createdAt: new Date().toISOString()
      });

      await deleteDoc(doc(db, 'recycle_bin', item.backupId));
      setDeletedMatches(prev => prev.filter(m => m.backupId !== item.backupId));
      onShowNotification?.(`Success! Match prediction restored successfully.`, 'success');
    } catch (err: any) {
      console.error('Failed to restore match prediction:', err);
      onShowNotification?.(`Restoration failed: ${err.message}`, 'info');
    }
  };

  const handlePurgeDeletedMatch = async (backupId: string) => {
    if (!window.confirm('Delete this backup from Recycle Bin permanently? This CANNOT be undone.')) return;
    try {
      await deleteDoc(doc(db, 'recycle_bin', backupId));
      setDeletedMatches(prev => prev.filter(m => m.backupId !== backupId));
      onShowNotification?.(`Backup purged permanently.`, 'info');
    } catch (err: any) {
      console.error('Failed to purge item:', err);
    }
  };

  const handleClearRecycleBin = async () => {
    if (!window.confirm('Permanently purge ALL items in the Recycle Bin? This action is IRREVERSIBLE.')) return;
    try {
      for (const item of deletedMatches) {
        await deleteDoc(doc(db, 'recycle_bin', item.backupId));
      }
      setDeletedMatches([]);
      onShowNotification?.(`All backups permanently cleared.`, 'success');
    } catch (err: any) {
      console.error('Failed to clear recycle bin:', err);
    }
  };

  // Sync initial tab when loaded/re-opened
  useEffect(() => {
    setActiveSubTab(initialSubTab);
  }, [initialSubTab]);

  // Read users / payments list on active sub-tab switch and prefetch on mount
  useEffect(() => {
    fetchUsers();
    fetchPayments();
  }, []);

  useEffect(() => {
    if (activeSubTab === 'users') {
      fetchUsers();
    } else if (activeSubTab === 'payments') {
      fetchPayments();
    } else if (activeSubTab === 'settings') {
      fetchDeletedMatches();
    }
  }, [activeSubTab]);

  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const col = collection(db, 'users');
      const snapshot = await getDocs(col);
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsersList(list);
    } catch (err) {
      console.error('Error fetching users collection:', err);
    } finally {
      setUsersLoading(false);
    }
  };

  const fetchPayments = async () => {
    setPaymentsLoading(true);
    try {
      const col = collection(db, 'payments');
      const snapshot = await getDocs(col);
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // Sort payments by submittedAt descending (newest first)
      list.sort((a: any, b: any) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
      setPaymentsList(list);
    } catch (err) {
      console.error('Error fetching payments verification collection:', err);
    } finally {
      setPaymentsLoading(false);
    }
  };

  const handleApprovePayment = (payment: any) => {
    setApprovalRangeType('today');
    setApprovalEndDate(getTodayInEATString());
    setPaymentToApprove(payment);
  };

  const handleConfirmApprovePayment = async (payment: any, endDate: string) => {
    setActionUserId(payment.id);
    try {
      const today = getTodayInEATString();
      
      // 1. Elevate user profile isVip: true, vipStartDate: today, vipEndDate: endDate
      const userRef = doc(db, 'users', payment.userId);
      await updateDoc(userRef, { 
        isVip: true,
        vipStartDate: today,
        vipEndDate: endDate
      });

      // 2. Set payment document status: approved, vipStartDate, vipEndDate
      const payRef = doc(db, 'payments', payment.id);
      await updateDoc(payRef, { 
        status: 'approved',
        vipStartDate: today,
        vipEndDate: endDate
      });

      // 3. Update local state
      setPaymentsList(prev => prev.map(p => p.id === payment.id ? { 
        ...p, 
        status: 'approved',
        vipStartDate: today,
        vipEndDate: endDate
      } : p));
      
      onShowNotification?.(`Approved! VIP activated from ${today} to ${endDate} for ${payment.userEmail || 'user'}.`, 'success');
      setPaymentToApprove(null);
    } catch (err: any) {
      console.error('Error approving payment proof:', err);
      onShowNotification?.('Approval failed: ' + err.message, 'info');
    } finally {
      setActionUserId(null);
    }
  };

  const handleRejectPayment = async (payment: any) => {
    setActionUserId(payment.id);
    try {
      // Set payment document status: rejected
      const payRef = doc(db, 'payments', payment.id);
      await updateDoc(payRef, { status: 'rejected' });

      // Update local state
      setPaymentsList(prev => prev.map(p => p.id === payment.id ? { ...p, status: 'rejected' } : p));
      
      onShowNotification?.(`Payment verification rejected.`, 'info');
    } catch (err: any) {
      console.error('Error rejecting payment proof:', err);
    } finally {
      setActionUserId(null);
    }
  };

  const handleToggleUserVip = async (userId: string, currentVip: boolean) => {
    setActionUserId(userId);
    try {
      const docRef = doc(db, 'users', userId);
      await updateDoc(docRef, { isVip: !currentVip });
      setUsersList(prev => prev.map(u => u.uid === userId ? { ...u, isVip: !currentVip } : u));
    } catch (err) {
      console.error('Failed to change VIP status:', err);
    } finally {
      setActionUserId(null);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Are you sure you want to delete this user document from the database?')) return;
    setActionUserId(userId);
    try {
      const docRef = doc(db, 'users', userId);
      await deleteDoc(docRef);
      setUsersList(prev => prev.filter(u => u.uid !== userId));
    } catch (err) {
      console.error('Failed to delete user profile:', err);
    } finally {
      setActionUserId(null);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!home || !away) return;

    setIsSubmittingMatch(true);
    try {
      await onAddMatch({
        homeTeam: home.trim(),
        awayTeam: away.trim(),
        time,
        prediction: prediction.trim(),
        odds: odds ? (parseFloat(odds) || 1.5) : 1.5,
        status: tipStatus,
        type: tipType,
        dateId: publishDateId,
      });

      // Show instant notification of successful publishing
      onShowNotification?.(`Success! "${home.trim()} vs ${away.trim()}" published to ${tipType.toUpperCase()} tips instantly.`, 'success');

      // Clear teams only to allow immediate submission of the next match in the row
      setHome('');
      setAway('');
      // We do not reset publishDateId, tipType, or prediction so they don't have to keep choosing them!

      if (!keepPanelOpen) {
        onClose();
      }
    } catch (err: any) {
      console.error('Error adding match prediction:', err);
      onShowNotification?.(`Failed to publish: ${err.message || 'Unauthorized rules schema'}`, 'info');
    } finally {
      setIsSubmittingMatch(false);
    }
  };

  return (
    <div className="absolute inset-0 bg-[#05070F]/85 backdrop-blur-md z-50 flex items-center justify-center p-3 animate-fade-in">
      {/* Container - Fixed centering within EAT container boundaries */}
      <div className={`relative bg-[#0D1222] border border-[#1E2538] w-full transition-all duration-300 rounded-[24px] overflow-hidden shadow-2xl flex flex-col max-h-[85vh] ${activeSubTab === 'payments' || activeSubTab === 'users' || activeSubTab === 'settings' ? 'max-w-[540px]' : 'max-w-[340px]'}`}>
        {/* Yellow decorative top bar */}
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#F5C400] to-amber-500"></div>

        {/* Modal Header */}
        <div className="px-4 pt-4 pb-2.5 flex items-center justify-between border-b border-slate-800/60 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-[#F5C400]/10 flex items-center justify-center border border-[#F5C400]/20">
              <Shield className="w-4 h-4 text-[#F5C400]" />
            </div>
            <div>
              <h3 className="text-xs font-black text-white uppercase tracking-wider">Admin Dashboard</h3>
              <p className="text-[8.5px] text-slate-450 font-mono leading-none mt-0.5">Control & Management Platform</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-7 w-7 rounded-full bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:text-white flex items-center justify-center text-slate-400 transition active:scale-90"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Sub-Tabs Selector */}
        <div className="flex border-b border-slate-800/40 bg-[#0A0D1A] px-2 py-1.5 gap-1 flex-shrink-0">
          <button
            onClick={() => setActiveSubTab('add')}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition ${
              activeSubTab === 'add'
                ? 'bg-[#F5C400]/10 text-[#F5C400] border border-[#F5C400]/25'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Publish</span>
          </button>

          <button
            onClick={() => setActiveSubTab('payments')}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition ${
              activeSubTab === 'payments'
                ? 'bg-[#F5C400]/10 text-[#F5C400] border border-[#F5C400]/25'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Receipts</span>
          </button>
          
          <button
            onClick={() => setActiveSubTab('users')}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition ${
              activeSubTab === 'users'
                ? 'bg-[#F5C400]/10 text-[#F5C400] border border-[#F5C400]/25'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Users</span>
          </button>

          <button
            onClick={() => setActiveSubTab('settings')}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition ${
              activeSubTab === 'settings'
                ? 'bg-[#F5C400]/10 text-[#F5C400] border border-[#F5C400]/25'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Simulation</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="p-4 overflow-y-auto scrollbar-none flex-1">
          {activeSubTab === 'add' && (
            /* Publish Tip Form */
            <form onSubmit={handleAddSubmit} className="space-y-3.5">
              
              {/* Home & Away Teams Selection Row */}
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div>
                  <label className="block text-[8.5px] text-slate-400 font-extrabold mb-1 uppercase tracking-wider">Home Team</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Man City"
                    value={home}
                    onChange={(e) => setHome(e.target.value)}
                    className="w-full bg-[#111625] border border-slate-700/85 rounded-xl px-2.5 py-2 text-xs text-white focus:border-[#10B981] outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-[8.5px] text-slate-400 font-extrabold mb-1 uppercase tracking-wider">Away Team</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Real Madrid"
                    value={away}
                    onChange={(e) => setAway(e.target.value)}
                    className="w-full bg-[#111625] border border-slate-700/85 rounded-xl px-2.5 py-2 text-xs text-white focus:border-[#10B981] outline-none transition"
                  />
                </div>
              </div>

              {/* REAL-TIME AND ADVANCED DATE PICKER INTEGRATION - ONE ROW */}
              <DateTimeRowPicker
                dateId={publishDateId}
                timeString={time}
                onDateTimeChange={(newDate, newTime) => {
                  setPublishDateId(newDate);
                  setTime(newTime);
                }}
              />

              {/* Odds and Prediction Selection Column/Row */}
              <div className="grid grid-cols-3 gap-2.5 text-xs">
                <div>
                  <label className="block text-[8.5px] text-slate-400 font-extrabold mb-1 uppercase tracking-wider">Odds</label>
                  <input
                    type="text"
                    placeholder="1.85"
                    value={odds}
                    onChange={(e) => setOdds(e.target.value)}
                    className="w-full bg-[#111625] border border-slate-700/85 rounded-xl px-2.5 py-2 text-xs text-white focus:border-[#10B981] outline-none transition font-mono"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-[8.5px] text-slate-400 font-extrabold mb-1 uppercase tracking-wider">Prediction</label>
                  <input
                    type="text"
                    required
                    placeholder="Over 1.5 Goals"
                    value={prediction}
                    onChange={(e) => setPrediction(e.target.value)}
                    className="w-full bg-[#111625] border border-slate-700/85 rounded-xl px-2.5 py-2 text-xs text-white focus:border-[#10B981] outline-none transition"
                  />
                </div>
              </div>

              {/* Category and Tip outcome state selection */}
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div>
                  <label className="block text-[8.5px] text-slate-400 font-extrabold mb-1 uppercase tracking-wider">Category</label>
                  <select
                    value={tipType}
                    onChange={(e) => setTipType(e.target.value as 'free' | 'vip')}
                    className="w-full bg-[#111625] border border-slate-700/85 rounded-xl px-2 py-2 text-xs text-slate-200 focus:border-[#10B981] outline-none transition"
                  >
                    <option value="free">Free Tips</option>
                    <option value="vip">VIP Premium Tips</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[8.5px] text-slate-400 font-extrabold mb-1 uppercase tracking-wider">Outcome Status</label>
                  <select
                    value={tipStatus}
                    onChange={(e) => setTipStatus(e.target.value as 'win' | 'lose' | 'pending')}
                    className="w-full bg-[#111625] border border-slate-700/85 rounded-xl px-2 py-2 text-xs text-slate-200 focus:border-[#10B981] outline-none transition"
                  >
                    <option value="pending">Pending</option>
                    <option value="win">Win (Green)</option>
                    <option value="lose">Lose (Red)</option>
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmittingMatch}
                  className="w-full bg-[#F5C400] hover:bg-[#ffe04d] disabled:opacity-50 text-slate-950 text-xs font-black uppercase py-2.8 px-4 rounded-xl flex items-center justify-center gap-1.5 transition active:scale-97 cursor-pointer"
                >
                  {isSubmittingMatch ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Publishing to Firestore...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 stroke-[3]" /> Register Match Tip
                    </>
                  )}
                </button>

                <label className="flex items-center gap-2 mt-2.5 px-1 text-slate-400 font-mono text-[8px] uppercase select-none cursor-pointer">
                  <input
                    type="checkbox"
                    checked={keepPanelOpen}
                    onChange={(e) => setKeepPanelOpen(e.target.checked)}
                    className="w-3 h-3 bg-[#111625] border-slate-700 text-[#F5C400] rounded focus:ring-0 cursor-pointer"
                  />
                  <span>Keep dashboard open for consecutive entries</span>
                </label>
              </div>
            </form>
          )}

          {activeSubTab === 'payments' && (
            <AdminReceiptsManager 
              paymentsList={paymentsList} 
              paymentsLoading={paymentsLoading} 
              onRefreshList={fetchPayments} 
              onShowNotification={onShowNotification} 
            />
          )}

          {activeSubTab === 'payments_old_backup' && (
            /* Payments Verification Dashboard */
            <div className="space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-800/60 pb-1.5 flex-shrink-0 gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-350 flex items-center gap-1.5 font-heading">
                  <Database className="w-3.5 h-3.5 text-[#F5C400]" /> VIP receipts
                </span>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowEmailsInReceipts(!showEmailsInReceipts)}
                    className="text-[8px] bg-slate-900 border border-slate-800 hover:border-[#F5C400]/40 px-2 py-1 rounded text-slate-300 font-extrabold uppercase transition cursor-pointer select-none"
                    id="toggle_emails_btn"
                  >
                    {showEmailsInReceipts ? "Hide Emails" : "Show Emails"}
                  </button>
                  <span className="text-[9px] bg-[#0A0D15] border border-slate-800 px-2 py-1 rounded text-[#F5C400] font-black font-mono leading-none">
                    {paymentsList.length} Total
                  </span>
                </div>
              </div>

              {paymentsLoading ? (
                <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1.5 scrollbar-thin">
                  {[1, 2].map((i) => (
                    <div key={i} className="bg-[#111625]/60 border border-[#1C2235]/60 p-4 rounded-[20px] space-y-4 animate-pulse">
                      <div className="flex justify-between items-center bg-slate-900/20 p-3 rounded-2xl">
                        <div className="flex items-center gap-3">
                          <div className="h-11 w-11 rounded-full bg-slate-800" />
                          <div className="space-y-1.5">
                            <div className="h-3 w-28 bg-slate-800 rounded" />
                            <div className="h-2.5 w-36 bg-slate-800 rounded" />
                          </div>
                        </div>
                        <div className="h-4 w-12 bg-slate-850 rounded" />
                      </div>
                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="h-14 bg-slate-850 rounded-2xl" />
                        <div className="h-14 bg-slate-850 rounded-2xl" />
                      </div>
                      <div className="h-16 bg-slate-850 rounded-2xl" />
                      <div className="h-48 bg-slate-850 rounded-2xl" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1.5 scrollbar-thin">
                  {paymentsList.length === 0 ? (
                    <div className="py-12 text-center rounded-2xl bg-slate-900/20 border border-slate-900 border-dashed">
                      <Image className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                      <p className="text-[10px] font-mono text-slate-500">No payment receipts uploaded yet</p>
                    </div>
                  ) : (
                    paymentsList.map((pay) => {
                      const computedDuration = formatDurationForReceipt(pay.planDuration);
                      const isSingle = computedDuration === '1day';
                      
                      // Calculate approximate mobile money local values
                      const isTz = pay.paymentMethod?.toLowerCase().includes('tanzania');
                      const isKe = pay.paymentMethod?.toLowerCase().includes('kenya');
                      let localEstimate = '';
                      if (isTz && pay.planPrice) {
                        localEstimate = `≈ ${(Math.round(pay.planPrice * 2600)).toLocaleString()} TZS`;
                      } else if (isKe && pay.planPrice) {
                        localEstimate = `≈ ${(Math.round(pay.planPrice * 135)).toLocaleString()} KES`;
                      }

                      return (
                        <div key={pay.id} className="relative bg-gradient-to-b from-[#111625] to-[#0A0D18] border border-[#1C2235] hover:border-[#F5C400]/25 transition-all duration-300 p-4 rounded-[20px] flex flex-col gap-4 text-xs shadow-lg overflow-hidden group">
                          {/* Ambient decorative layout glows */}
                          <div className="absolute top-0 right-0 w-32 h-32 bg-[#F5C400]/5 rounded-full blur-[40px] pointer-events-none group-hover:bg-[#F5C400]/8 transition duration-500"></div>
                          <div className="absolute -left-10 -bottom-10 w-24 h-24 bg-cyan-500/5 rounded-full blur-[30px] pointer-events-none"></div>
                          
                          {/* Left boundary indicator colored by status */}
                          <div className={`absolute left-0 top-0 bottom-0 w-[4px] bg-gradient-to-b ${
                            pay.status === 'approved' ? 'from-emerald-500 to-teal-600' : pay.status === 'rejected' ? 'from-rose-500 to-red-600' : 'from-amber-400 to-[#F5C400]'
                          }`}></div>

                          {/* 1. HEADER SECTION */}
                          <div className="flex items-center justify-between gap-2.5 bg-slate-900/40 p-3 rounded-2xl border border-slate-850/60 font-sans">
                            <div className="flex items-center gap-3">
                              {/* Large circular avatar with placeholder and indicator */}
                              <div className="relative h-11 w-11 rounded-full bg-gradient-to-br from-slate-900 to-[#121A2F] border border-[#1E2538] flex items-center justify-center text-slate-350 shadow-inner group-hover:border-[#F5C400]/30 transition duration-300 overflow-hidden shrink-0">
                                <span className="text-[12px] font-black tracking-tight text-[#F5C450] uppercase">
                                  {pay.username && pay.username !== 'Not Provided' ? pay.username.substring(0, 2) : (pay.userEmail ? pay.userEmail.substring(0, 2) : 'VIP')}
                                </span>
                                {/* Glow status circle badge indicator on top */}
                                <div className={`absolute bottom-0.5 right-0.5 h-2.5 w-2.5 rounded-full border border-slate-900 ${
                                  pay.status === 'approved' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]' : pay.status === 'rejected' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.7)]' : 'bg-[#F5C400] shadow-[0_0_8px_rgba(245,196,0,0.7)] animate-pulse'
                                }`}></div>
                              </div>
                              
                              <div className="space-y-0.5 min-w-0">
                                <span className="font-extrabold text-slate-100 text-[13px] leading-tight select-all truncate block">
                                  {pay.username && pay.username !== 'Not Provided' ? pay.username : (showEmailsInReceipts ? `@${pay.userEmail?.split('@')[0] || 'customer'}` : 'User Profile')}
                                </span>
                                
                                {/* Email below username styled subtly */}
                                {showEmailsInReceipts ? (
                                  <div className="flex items-center gap-1">
                                    <span className="text-[9.5px] font-mono text-slate-400 truncate max-w-[150px] select-all">
                                      {pay.userEmail}
                                    </span>
                                    <button
                                      onClick={() => {
                                        if (pay.userEmail) {
                                          navigator.clipboard.writeText(pay.userEmail);
                                          onShowNotification?.('Copied user email!', 'success');
                                        }
                                      }}
                                      className="p-1 hover:bg-slate-800 rounded transition text-slate-500 hover:text-[#F5C400] cursor-pointer shrink-0"
                                      title="Copy Email Address"
                                    >
                                      <Copy className="w-2.5 h-2.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-[9.5px] font-mono text-slate-600 block italic leading-none select-none">
                                    Email secured/hidden
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="text-right flex-shrink-0 flex flex-col items-end">
                              {/* Modern status badge with glow */}
                              <span className={`px-2.5 py-0.5 rounded-full text-[8.5px] font-black uppercase tracking-wider select-none border shadow-md flex items-center gap-1 ${
                                pay.status === 'approved'
                                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 shadow-emerald-500/5'
                                  : pay.status === 'rejected'
                                    ? 'bg-red-500/10 border-red-500/40 text-red-500 shadow-red-500/5'
                                    : 'bg-[#F5C400]/10 border-[#F5C400]/40 text-[#F5C400] shadow-[#F5C400]/15'
                              }`}>
                                <span className={`h-1.2 w-1.2 rounded-full ${
                                  pay.status === 'approved' ? 'bg-emerald-450' : pay.status === 'rejected' ? 'bg-red-450' : 'bg-[#F5C400] animate-ping'
                                }`}></span>
                                {pay.status}
                              </span>
                              {/* Submission date-time cleaner display */}
                              <span className="block text-[8px] font-mono text-slate-450 mt-1.5 uppercase font-bold tracking-tight">
                                {pay.submittedAt ? new Date(pay.submittedAt).toLocaleDateString(undefined, {month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'}) : 'N/A'}
                              </span>
                            </div>
                          </div>

                          {/* 2. PAYMENT DETAILS PLAN & PRICE INFORMATION */}
                          <div className="grid grid-cols-2 gap-2.5">
                            {/* VIP Plan Duration */}
                            <div className="bg-[#0A0E1A]/80 p-3 rounded-2xl border border-slate-850 flex flex-col justify-between">
                              <div className="flex items-center gap-1.5 text-slate-450">
                                <Calendar className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                <span className="text-[8px] font-mono uppercase tracking-wider font-bold">Planned Duration</span>
                              </div>
                              <div className="mt-2.5">
                                {isSingle ? (
                                  <span className="inline-block text-[11px] font-black text-rose-450 bg-rose-500/10 border border-rose-500/25 px-2 py-0.5 rounded-lg uppercase font-mono tracking-tight shadow-sm">
                                    1 Day Access
                                  </span>
                                ) : (
                                  <span className="text-[12px] font-extrabold text-slate-100 uppercase tracking-tight">
                                    {pay.planDuration}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Amount Paid - Strongest element with green conversion text */}
                            <div className="bg-[#0A0E1A]/80 p-3 rounded-2xl border border-slate-850 flex flex-col justify-between">
                              <div className="flex items-center gap-1.5 text-slate-450">
                                <DollarSign className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                <span className="text-[8px] font-mono uppercase tracking-wider font-bold">Amount Paid</span>
                              </div>
                              <div className="mt-1.5">
                                <span className="text-[14px] font-black text-white font-mono leading-none block">
                                  ${pay.planPrice?.toFixed(2)} <span className="text-[9px] text-[#F5C400]">USD</span>
                                </span>
                                {localEstimate ? (
                                  <span className="text-[9px] font-mono text-emerald-400 font-bold block mt-1 tracking-tight">
                                    {localEstimate}
                                  </span>
                                ) : (
                                  <span className="text-[8.5px] font-mono text-slate-550 block mt-1">
                                    Conversion N/A
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* 3. PAYMENT PROTOCOL REFERENCE CONTAINER */}
                          <div className="bg-[#0A0D16]/60 p-3 rounded-2xl border border-slate-850/60 space-y-2.5">
                            <div className="flex justify-between items-center">
                              <span className="text-slate-450 font-mono uppercase text-[8px] font-bold tracking-wider">Payment Protocol</span>
                              {/* Display M-PESA as clean badge */}
                              <span className="text-slate-200 font-black uppercase text-[8.5px] bg-[#F5C400]/10 text-[#F5C400] px-2 py-0.5 rounded-lg border border-[#F5C400]/20 tracking-wider">
                                {pay.paymentMethod && pay.paymentMethod.toUpperCase().includes('KENYA') ? 'M-PESA KENYA' : (pay.paymentMethod || 'Manual Money Transfer')}
                              </span>
                            </div>
                            
                            <div className="bg-slate-950/80 border border-slate-850 p-2.5 rounded-xl flex items-center justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <span className="block text-[7.5px] font-mono uppercase tracking-widest text-slate-550 mb-0.5">PHONE OR TRANSACTION REF</span>
                                <span className="text-slate-200 font-mono font-bold text-[10.5px] select-all truncate block">
                                  {pay.txHashOrPhone}
                                </span>
                              </div>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(pay.txHashOrPhone);
                                  onShowNotification?.('Copied Transaction ID!', 'success');
                                }}
                                className="p-1.5 hover:bg-slate-800 rounded-lg border border-slate-800 hover:border-slate-700 hover:text-[#F5C400] text-slate-400 transition"
                                title="Copy Transaction Reference ID"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            </div>
                          </div>

                          {/* 4. SCREENSHOT PROOF OPTION */}
                          {pay.screenshot ? (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <label className="text-[8px] font-mono text-slate-400 block uppercase font-extrabold flex items-center gap-1 mt-0.5 tracking-wider">
                                  <Image className="w-3 h-3 text-[#F5C400]" /> Proof of Payment Submitted
                                </label>
                                <span className="text-[8px] text-slate-500 font-mono">Click to expand</span>
                              </div>
                              
                              <div 
                                className="relative h-48 rounded-2xl overflow-hidden bg-[#060913] border-2 border-slate-850 flex items-center justify-center cursor-zoom-in hover:border-[#F5C400]/40 transition-all duration-300 group/proof shadow-md shadow-black/40"
                                onClick={() => setSelectedScreenshotUrl(pay.screenshot)}
                              >
                                <img
                                  src={pay.screenshot}
                                  alt="Screenshot Receipt proof"
                                  className="w-full h-full object-contain pointer-events-none group-hover/proof:scale-[1.03] transition-transform duration-500"
                                  referrerPolicy="no-referrer"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/30 opacity-0 group-hover/proof:opacity-100 flex flex-col items-center justify-center gap-1.5 transition-all duration-305">
                                  <div className="flex items-center gap-1.5 bg-[#F5C400] text-slate-950 px-3.5 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg transform translate-y-2 group-hover/proof:translate-y-0 transition duration-300">
                                    <Eye className="w-3.5 h-3.5 stroke-[3]" /> Inspect Receipt Proof
                                  </div>
                                </div>
                                <div className="absolute top-2.5 right-2.5 bg-black/75 p-1.5 rounded-lg border border-slate-800 text-slate-300">
                                  <Eye className="w-3 h-3" />
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="bg-red-500/5 border border-red-500/20 p-4 rounded-xl flex items-center gap-2.5 text-red-400 font-semibold text-[9.5px]">
                              <ShieldAlert className="w-4 h-4 text-red-550 shrink-0" />
                              <span>Critical: No payment proof attachment was submitted with this request!</span>
                            </div>
                          )}

                          {/* Subscribed VIP Period date indication row */}
                          {pay.status === 'approved' && pay.vipStartDate && pay.vipEndDate && (
                            <div className="bg-emerald-500/10 border border-emerald-500/25 p-2.5 rounded-xl text-[9px] font-mono text-left text-emerald-400 font-bold leading-none pl-3">
                              📅 Active Subscribed VIP Period: {pay.vipStartDate} to {pay.vipEndDate}
                            </div>
                          )}

                          {/* Export high-end PNG share voucher option (hides email, displays username) */}
                          <div className="mt-0.5">
                            <button
                              type="button"
                              onClick={() => {
                                exportReceiptToPNG({
                                  ...pay,
                                  planPrice: pay.planPrice || 0
                                }, onShowNotification);
                              }}
                              className="w-full relative overflow-hidden bg-gradient-to-r from-slate-900 via-[#131b2e] to-slate-900 hover:from-[#16213e] hover:to-[#0f172a] border border-[#303f6b]/50 hover:border-[#F5C400]/40 text-slate-300 hover:text-white font-extrabold py-2 px-3 rounded-xl uppercase transition duration-300 active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-black/25 group/export"
                              title="Export High-Resolution Telegram Share PNG Card"
                            >
                              <div className="absolute inset-0 bg-gradient-to-r from-[#F5C400]/5 to-transparent pointer-events-none opacity-0 group-hover/export:opacity-100 transition duration-305"></div>
                              <Share2 className="w-3.5 h-3.5 text-[#F5C400] shrink-0" />
                              <span className="text-[9px] tracking-wider text-slate-200 group-hover/export:text-white">Export Telegram Share Card (PNG)</span>
                            </button>
                          </div>

                          {/* 5. APPROVE & REJECT ACTION MODULES */}
                          {pay.status === 'pending' && (
                            <div className="flex flex-col sm:flex-row gap-2.5 pt-1.5 border-t border-slate-850/40">
                              {/* Primary Approve Button with green gradient and strong glow */}
                              <button
                                type="button"
                                disabled={actionUserId === pay.id}
                                onClick={() => handleApprovePayment(pay)}
                                className="group/btn relative flex-1 overflow-hidden bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 text-white font-black py-2.5 rounded-xl uppercase transition active:scale-97 disabled:opacity-50 cursor-pointer flex flex-col items-center justify-center gap-0.5 shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/30 font-sans"
                              >
                                <div className="absolute inset-0 bg-white/10 opacity-0 hover:opacity-100 transition duration-300"></div>
                                <div className="flex items-center justify-center gap-1.5">
                                  <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
                                  <span className="text-[10px] tracking-wider">APPROVE VIP</span>
                                </div>
                                <span className="text-[7.5px] font-sans font-bold text-slate-100/90 tracking-normal normal-case">Confirm and approve this request</span>
                              </button>

                              {/* Secondary Reject Button */}
                              <button
                                type="button"
                                disabled={actionUserId === pay.id}
                                onClick={() => handleRejectPayment(pay)}
                                className="group/btn relative flex-1 overflow-hidden bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-550 hover:to-rose-550 border border-red-500/15 text-white font-bold py-2.5 rounded-xl uppercase transition active:scale-97 disabled:opacity-50 cursor-pointer flex flex-col items-center justify-center gap-0.5 shadow-md font-sans"
                              >
                                <div className="flex items-center justify-center gap-1.5">
                                  <ShieldAlert className="w-4 h-4" />
                                  <span className="text-[10px] tracking-wider text-white">REJECT</span>
                                </div>
                                <span className="text-[7.5px] font-sans font-bold text-slate-150/80 tracking-normal normal-case">Decline this request</span>
                              </button>
                            </div>
                          )}

                          {/* 6. BOTTOM SECTION SECURITY AND TRANSACTION BADGES */}
                          <div className="flex items-center justify-between border-t border-slate-850/60 pt-2.5 text-[8.5px] text-slate-450 mt-1 font-sans">
                            <div className="flex items-center gap-1.5">
                              <Lock className="w-3.5 h-3.5 text-[#F5C400] shrink-0" />
                              <span className="italic leading-tight select-none">Review payment details and screenshot before taking action.</span>
                            </div>
                            <div className="flex items-center gap-1 bg-[#F5C400]/10 border border-[#F5C400]/25 text-[#F5C400] px-1.5 py-0.5 rounded text-[7.5px] font-black uppercase shrink-0 select-none">
                              <Shield className="w-2 h-2 fill-[#F5C400]/20" /> SECURED
                            </div>
                          </div>

                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          )}

          {activeSubTab === 'users' && (
            /* Manage Users Panel */
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800/60 pb-1.5">
                <span className="text-[9px] font-mono uppercase tracking-wider text-slate-400 font-bold">Registered Users</span>
                <span className="text-[9px] bg-slate-955 border border-slate-800 px-2 py-0.5 rounded text-[#F5C400] font-black">{usersList.length} total</span>
              </div>

              {/* Users Search Form */}
              <div className="bg-[#0A0D14] p-2 rounded-xl border border-slate-850 flex items-center gap-1.5 focus-within:border-[#F5C400]/40 transition">
                <Search className="w-3.5 h-3.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search by email or username..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  className="bg-transparent border-none outline-none text-[10px] text-slate-200 placeholder-slate-650 flex-1 py-0.5 font-medium"
                  id="admin_user_search_input"
                />
                {userSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setUserSearchQuery('')}
                    className="text-[8.5px] text-slate-500 hover:text-slate-350 uppercase font-mono tracking-wider font-extrabold pr-0.5 transition cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* VIP / FREE Filter Pills */}
              <div className="flex items-center gap-1.5 bg-[#070A0F] p-1 rounded-xl border border-slate-900/80">
                <button
                  type="button"
                  onClick={() => setUserVipFilter('all')}
                  className={`flex-1 py-1 px-2 rounded-lg text-[9px] font-mono uppercase tracking-wider transition-all duration-150 font-bold cursor-pointer text-center ${
                    userVipFilter === 'all'
                      ? 'bg-slate-800 text-[#F5C400] font-black border border-slate-700/60 shadow-sm shadow-[#F5C400]/5'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                  }`}
                >
                  All ({usersList.length})
                </button>
                
                <button
                  type="button"
                  onClick={() => setUserVipFilter('vip')}
                  className={`flex-1 py-1 px-2 rounded-lg text-[9px] font-mono uppercase tracking-wider transition-all duration-150 font-bold cursor-pointer text-center ${
                    userVipFilter === 'vip'
                      ? 'bg-emerald-950/40 text-emerald-400 font-black border border-emerald-500/30'
                      : 'text-slate-400 hover:text-emerald-400/80 hover:bg-slate-900/50'
                  }`}
                >
                  ★ VIP ({usersList.filter(u => u.isVip).length})
                </button>

                <button
                  type="button"
                  onClick={() => setUserVipFilter('free')}
                  className={`flex-1 py-1 px-2 rounded-lg text-[9px] font-mono uppercase tracking-wider transition-all duration-150 font-bold cursor-pointer text-center ${
                    userVipFilter === 'free'
                      ? 'bg-slate-900 text-slate-300 border border-slate-800 font-extrabold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                  }`}
                >
                  Free ({usersList.filter(u => !u.isVip).length})
                </button>
              </div>

              {usersLoading ? (
                <div className="py-12 text-center">
                  <RefreshCw className="w-6 h-6 text-[#F5C400] animate-spin mx-auto mb-2" />
                  <span className="text-[10px] font-mono tracking-widest text-slate-500 uppercase">Syncing Profiles...</span>
                </div>
              ) : (
                <div className="space-y-2 max-h-[44vh] overflow-y-auto pr-1 scrollbar-thin">
                  {(() => {
                    const query = userSearchQuery.trim().toLowerCase();
                    const filtered = usersList.filter((usr) => {
                      // Apply text search
                      if (query) {
                        const email = (usr.email || '').toLowerCase();
                        const username = (usr.username || '').toLowerCase();
                        if (!email.includes(query) && !username.includes(query)) {
                          return false;
                        }
                      }
                      // Apply VIP/FREE filter
                      if (userVipFilter === 'vip') return !!usr.isVip;
                      if (userVipFilter === 'free') return !usr.isVip;
                      return true;
                    });

                    if (filtered.length === 0) {
                      return (
                        <p className="text-[10px] font-medium text-slate-500 text-center py-6">
                          {userSearchQuery || userVipFilter !== 'all' ? 'No matching users found' : 'No user documents found'}
                        </p>
                      );
                    }

                    return filtered.map((usr) => (
                      <div key={usr.id} className="bg-[#111625] border border-[#1C2235] p-2.5 rounded-xl flex flex-col gap-1.5 relative">
                        <div className="flex items-start justify-between">
                          <div className="min-w-0 pr-1 flex-1">
                            <span className="block text-[10.5px] font-black text-slate-100 truncate uppercase tracking-tight">
                              {usr.username || usr.email?.split('@')[0] || 'User Profile'}
                            </span>
                            <span className="block text-[9px] font-mono text-slate-400 select-all truncate">
                              {usr.email}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {/* Toggle VIP status button */}
                            <button
                              type="button"
                              disabled={actionUserId === usr.id}
                              onClick={() => handleToggleUserVip(usr.id, !!usr.isVip)}
                              className={`px-2 py-1 rounded text-[8px] font-black uppercase border transition active:scale-95 cursor-pointer ${
                                usr.isVip 
                                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                                  : 'bg-slate-950 border-slate-800 text-slate-400'
                              }`}
                              title="Toggle VIP Privilege"
                            >
                              {usr.isVip ? '★ VIP' : 'FREE'}
                            </button>

                            {/* Delete Button */}
                            <button
                              type="button"
                              disabled={actionUserId === usr.id}
                              onClick={() => handleDeleteUser(usr.id)}
                              className="text-slate-500 hover:text-red-400 p-1 bg-slate-950 border border-slate-800 hover:border-red-900 rounded transition active:scale-90 cursor-pointer"
                              title="Delete Record"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {/* Status Label Stripe */}
                        <div className="flex items-center justify-between text-[8px] font-mono border-t border-slate-800/40 pt-1 mt-0.5">
                          <span className="text-slate-500 uppercase">UID: {usr.id.slice(0, 8)}...</span>
                          <span className={`uppercase font-bold ${usr.role === 'admin' ? 'text-red-400' : 'text-slate-400'}`}>
                            Role: {usr.role || 'user'}
                          </span>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              )}
            </div>
          )}

          {activeSubTab === 'settings' && (
            /* Simulation Toolkit */
            <div className="space-y-4">
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-3.5">
                <div className="flex items-center gap-1.5 mb-2">
                  <Key className="w-3.5 h-3.5 text-[#F5C400]" />
                  <h4 className="text-[10.5px] font-black uppercase text-slate-200 tracking-wide">Premium Auth Override</h4>
                </div>
                <p className="text-[9.5px] text-slate-450 leading-relaxed mb-3">
                  Simulate standard premium subscription credentials on your active session without actual transactions.
                </p>
                
                <div className="flex items-center justify-between bg-slate-950 p-2 rounded-xl border border-slate-850">
                  <span className="text-[9px] text-slate-400 font-bold px-1 uppercase font-mono">My Active VIP Status:</span>
                  <button
                    type="button"
                    onClick={onToggleUnlock}
                    className={`px-2.5 py-1.2 rounded-lg text-[9px] font-black uppercase transition-all duration-200 ${
                      isUnlocked
                        ? 'bg-amber-500/10 border border-[#F5C400]/40 text-[#F5C400]'
                        : 'bg-slate-800 border border-slate-700 text-slate-400'
                    }`}
                  >
                    {isUnlocked ? 'Unlocked' : 'Locked'}
                  </button>
                </div>
              </div>

              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-3.5">
                <div className="flex items-center gap-1.5 mb-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <h4 className="text-[10.5px] font-black uppercase text-slate-200 tracking-wide">Live Activation Stream</h4>
                </div>
                <p className="text-[9.5px] text-slate-450 leading-relaxed mb-3">
                  Toggle visibility of the fake rolling VIP activations notification stream for all users.
                </p>
                
                <div className="flex items-center justify-between bg-slate-950 p-2 rounded-xl border border-slate-850">
                  <span className="text-[9px] text-slate-400 font-bold px-1 uppercase font-mono">Notification Stream:</span>
                  <button
                    type="button"
                    onClick={onToggleApprovalsTicker}
                    className={`px-2.5 py-1.2 rounded-lg text-[9px] font-black uppercase transition-all duration-200 ${
                      isApprovalsTickerOn
                        ? 'bg-emerald-500/10 border border-emerald-500/40 text-emerald-400'
                        : 'bg-red-500/10 border border-red-500/30 text-red-500'
                    }`}
                  >
                    {isApprovalsTickerOn ? 'ON' : 'OFF'}
                  </button>
                </div>
              </div>

              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-3.5">
                <div className="flex items-center gap-1.5 mb-2">
                  <Database className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                  <h4 className="text-[10.5px] font-black uppercase text-rose-450 tracking-wide">Database Administration</h4>
                </div>
                <p className="text-[9.5px] text-rose-400/80 leading-relaxed mb-3">
                  ⚠️ This action deletes custom changes on Firestore and restores default template high-odds football fixtures.
                </p>

                {isResetConfirming ? (
                  <div className="bg-[#1C1417] border border-rose-950/60 p-2.5 rounded-xl space-y-2">
                    <span className="block text-[9px] text-rose-300 font-black uppercase tracking-wider text-center">Are you absolute sure?</span>
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          await onResetData();
                          setIsResetConfirming(false);
                          onClose();
                        }}
                        className="flex-1 bg-red-600 hover:bg-red-500 text-white font-black text-[9px] py-1.2 rounded-lg uppercase whitespace-nowrap"
                      >
                        Confirm Wipe
                      </button>
                      <button
                        onClick={() => setIsResetConfirming(false)}
                        className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[9px] py-1.2 rounded-lg uppercase"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsResetConfirming(true)}
                    className="w-full flex items-center justify-center gap-1.5 bg-red-950/20 hover:bg-red-950/40 text-rose-300 border border-red-900/40 text-[10px] font-black py-2 px-3 rounded-xl transition cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" /> Reset Database Records
                  </button>
                )}
              </div>

              {/* SCREENSHOT DATA RECOVERY WIDGET */}
              <div className="bg-[#121829] border border-amber-950 rounded-2xl p-3.5 space-y-3">
                <div className="flex items-center gap-1.5 border-b border-amber-950/40 pb-2">
                  <Sparkles className="w-3.5 h-3.5 text-[#F5C400]" />
                  <h4 className="text-[10.5px] font-black uppercase text-amber-100 tracking-wide">Screenshot Data Recovery</h4>
                </div>
                
                <p className="text-[9.5px] text-slate-400 leading-relaxed">
                  Lost matches you entered before? Restore the <strong>8 custom predictions</strong> for Friday, Thursday, and Saturday exactly as shown in your images, automatically matched to Free vs. VIP tabs and EAT dates!
                </p>

                <button
                  type="button"
                  disabled={isRestoringScreenshot}
                  onClick={handleExecuteScreenshotRestore}
                  className="w-full flex items-center justify-center gap-1.5 bg-[#F5C400] hover:bg-[#F5C400]/90 text-slate-950 text-[10px] font-black py-2 px-3 rounded-xl transition cursor-pointer disabled:opacity-50 select-none shadow-md"
                >
                  {isRestoringScreenshot ? (
                    <>
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      Recovering Matches...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3 h-3" />
                      Restore From Screenshots
                    </>
                  )}
                </button>
              </div>

              {/* ADVANCED ADMIN RECYCLE BIN & DATA PROTECTION CORES */}
              <div className="bg-[#121829] border border-slate-800 rounded-2xl p-3.5 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800/60 pb-2">
                  <div className="flex items-center gap-1.5">
                    <Trash2 className="w-3.5 h-3.5 text-[#F5C400]" />
                    <h4 className="text-[10.5px] font-black uppercase text-slate-100 tracking-wide">Recycle Bin</h4>
                  </div>
                  {deletedMatches.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearRecycleBin}
                      className="text-[8px] font-mono text-rose-450 hover:text-rose-400 font-extrabold uppercase bg-red-950/15 border border-red-900/30 px-2 py-0.8 rounded hover:bg-red-950/30 select-none cursor-pointer transition"
                    >
                      Empty bin
                    </button>
                  )}
                </div>

                <p className="text-[9.5px] text-slate-400 leading-relaxed">
                  Safeguards custom prediction tips against accidental loss, deletion, or factory resets.
                </p>

                {deletedLoading ? (
                  <div className="text-center py-4">
                    <RefreshCw className="w-4 h-4 text-slate-500 animate-spin mx-auto" />
                    <span className="text-[8.5px] font-mono text-slate-550 block mt-1.5 uppercase">Loading backups...</span>
                  </div>
                ) : deletedMatches.length === 0 ? (
                  <div className="bg-slate-950/30 border border-slate-850 border-dashed rounded-xl p-4 text-center">
                    <span className="text-[9px] font-mono text-slate-500 leading-tight block">
                      Trash is empty. Any matches you delete (one-by-one or via factory reset) will be securely preserved here for instant recovery.
                    </span>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[220px] overflow-y-auto scrollbar-none pr-1">
                    {deletedMatches.map((item) => {
                      const EATDeletedAt = item.deletedAt
                        ? new Date(item.deletedAt).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit', second: '2-digit'})
                        : 'Unknown Time';

                      return (
                        <div 
                          key={item.backupId} 
                          className="bg-slate-950/80 border border-slate-850 p-2.5 rounded-xl text-[9px] flex flex-col gap-1.5 hover:border-slate-800 transition relative overflow-hidden group"
                        >
                          {/* Mini Header */}
                          <div className="flex items-center justify-between font-mono text-[7.8px] text-slate-500 font-semibold border-b border-slate-850/60 pb-1">
                            <span className="text-slate-500 uppercase">Ref: {item.backupId.slice(-6)}</span>
                            <span className="text-slate-400 capitalize">{EATDeletedAt}</span>
                          </div>

                          {/* Match Content details */}
                          <div className="flex items-center justify-between gap-1.5">
                            <div className="min-w-0">
                              <span className="text-slate-200 font-extrabold text-[10px] block truncate">
                                {item.homeTeam} vs {item.awayTeam}
                              </span>
                              <div className="flex items-center gap-1.5 text-slate-450 font-mono text-[8px] mt-0.5">
                                <span className="bg-slate-900 px-1.2 py-0.2 rounded text-[7.5px] border border-slate-850">{item.time}</span>
                                <span>Prediction: <strong className="text-slate-300 font-extrabold">{item.prediction}</strong></span>
                                <span className="text-[#F5C400] font-black">@{item.odds?.toFixed(2)}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <span className={`px-1 rounded-[4px] text-[7px] font-black uppercase tracking-wider ${
                                item.type === 'vip' 
                                  ? 'bg-amber-500/10 border border-amber-500/20 text-[#F5C450]' 
                                  : 'bg-slate-900 border border-slate-800 text-slate-400'
                              }`}>
                                {item.type}
                              </span>
                              <span className={`px-1 rounded-[4px] text-[7px] font-black uppercase tracking-wider ${
                                item.status === 'win' 
                                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' 
                                  : item.status === 'lose' 
                                    ? 'bg-rose-500/15 text-rose-450 border border-rose-500/20' 
                                    : 'bg-slate-900 border border-slate-800 text-slate-400'
                              }`}>
                                {item.status}
                              </span>
                            </div>
                          </div>

                          {/* Actions Row */}
                          <div className="flex items-center justify-between border-t border-slate-850/40 pt-1 mt-0.5 animate-fade-in">
                            <span className="text-slate-500 font-mono leading-none font-bold text-[7.5px]">Day Code: {item.dateId}</span>
                            <div className="flex items-center gap-1.5">
                              {/* Restore Trigger */}
                              <button
                                type="button"
                                onClick={() => handleRestoreMatch(item)}
                                className="bg-emerald-500/15 border border-emerald-500/25 hover:bg-emerald-500/25 text-emerald-400 text-[8px] font-black uppercase px-2 py-0.5 rounded transition cursor-pointer select-none flex items-center gap-1 leading-none shadow-sm font-sans"
                              >
                                <RefreshCw className="w-2.5 h-2.5" /> Restore
                              </button>

                              {/* Delete Perm */}
                              <button
                                type="button"
                                onClick={() => handlePurgeDeletedMatch(item.backupId)}
                                className="text-slate-500 hover:text-red-400 p-1 bg-slate-900 border border-slate-850 hover:border-red-950 rounded transition active:scale-95 cursor-pointer text-[7.5px]"
                                title="Delete Permanently"
                              >
                                <Trash2 className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* FULLSCREEN ZOOM RECEIPT LIGHTBOX */}
      {selectedScreenshotUrl && (
        <div className="fixed inset-0 bg-black/95 z-200 flex flex-col items-center justify-center p-4 animate-fade-in">
          <div className="max-w-[480px] w-full flex flex-col items-center animate-scale-up">
            <div className="w-full flex justify-end mb-2">
              <button
                type="button"
                onClick={() => setSelectedScreenshotUrl(null)}
                className="bg-slate-900 border border-slate-800 hover:bg-slate-800 p-2 rounded-full text-slate-300 font-extrabold flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <img
              src={selectedScreenshotUrl}
              alt="Receipt Verification Large"
              className="w-full h-auto max-h-[70vh] rounded-2xl object-contain border border-slate-800 shadow-2xl"
              referrerPolicy="no-referrer"
            />
            
            <span className="text-[10px] text-slate-400 mt-2 font-mono uppercase tracking-widest text-center">Receipt Verification Capture</span>
          </div>
        </div>
      )}

      {/* SELECTIVE DATE VIP APPROVAL OVERLAY */}
      {paymentToApprove && (
        <div className="fixed inset-0 bg-[#05070F]/90 backdrop-blur-md z-[210] flex items-center justify-center p-3 sm:p-4 animate-fade-in">
          <div className="relative bg-[#0D1222] border border-[#1E2538] w-full max-w-[310px] rounded-[24px] overflow-hidden shadow-2xl flex flex-col p-4 text-slate-100">
            {/* Emerald top bar decorative */}
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-emerald-500 to-teal-500"></div>

            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800/60 pb-2.5 mb-3.5">
              <div>
                <h4 className="text-xs font-black text-white uppercase tracking-wider font-heading">Set VIP Date Range</h4>
                <p className="text-[8.5px] text-slate-400 font-mono leading-none mt-0.5">Select allowed match dates</p>
              </div>
              <button
                type="button"
                onClick={() => setPaymentToApprove(null)}
                className="h-6 w-6 rounded-full bg-slate-900 border border-slate-800 hover:bg-slate-800 flex items-center justify-center text-slate-450 transition"
              >
                <X className="w-3 h-3" />
              </button>
            </div>

            {/* User Info info indicator */}
            <div className="bg-[#111625] p-2.5 rounded-xl mb-3.5 text-[9.5px] border border-[#1C2235]">
              <span className="text-slate-450 block font-semibold">User Email:</span>
              <span className="text-white font-mono block select-all break-all">{paymentToApprove.userEmail}</span>
              <span className="text-emerald-400 font-bold block mt-1 uppercase tracking-tight">Plan: {paymentToApprove.planDuration}</span>
            </div>

            {/* Range selection presets buttons */}
            <div className="space-y-3.5">
              <div className="space-y-1.5">
                <label className="block text-[8.5px] text-slate-400 font-extrabold uppercase tracking-wider">Select Access Preset</label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setApprovalRangeType('today');
                      setApprovalEndDate(getTodayInEATString());
                    }}
                    className={`py-1.5 px-2 rounded-lg text-[9.5px] font-black uppercase transition border ${
                      approvalRangeType === 'today'
                        ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                        : 'bg-slate-900 border-slate-800 text-slate-450 hover:text-slate-200'
                    }`}
                  >
                    Today Only
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setApprovalRangeType('week');
                      setApprovalEndDate(getFutureEATDateString(7));
                    }}
                    className={`py-1.5 px-2 rounded-lg text-[9.5px] font-black uppercase transition border ${
                      approvalRangeType === 'week'
                        ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                        : 'bg-slate-900 border-slate-800 text-slate-450 hover:text-slate-200'
                    }`}
                  >
                    Next 1 Week
                  </button>
                </div>
              </div>

              {/* End Date Date Picker Input */}
              <div className="space-y-1.5 pt-1">
                <label className="block text-[8.5px] text-slate-400 font-extrabold uppercase tracking-wider">
                  Access Expiration Date
                </label>
                <input
                  type="date"
                  required
                  value={approvalEndDate}
                  onChange={(e) => {
                    setApprovalRangeType('custom');
                    setApprovalEndDate(e.target.value);
                  }}
                  className="w-full bg-[#111625] border border-slate-700/85 rounded-xl px-2.5 py-2 text-xs text-white focus:border-emerald-500 outline-none transition font-semibold"
                />
                <p className="text-[8.5px] text-slate-450 italic leading-snug">
                  User will view VIP match dates between today and <span className="text-emerald-400 font-bold">{approvalEndDate}</span> (inclusive).
                </p>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-2 pt-3.5 border-t border-slate-800/45 mt-3.5">
                <button
                  type="button"
                  disabled={actionUserId === paymentToApprove.id}
                  onClick={() => handleConfirmApprovePayment(paymentToApprove, approvalEndDate)}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-black text-[10px] py-2.5 rounded-xl uppercase tracking-wider transition active:scale-97"
                >
                  {actionUserId === paymentToApprove.id ? 'Saving...' : 'Activate & Approve'}
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentToApprove(null)}
                  className="bg-slate-900 border border-slate-800 text-slate-400 font-bold text-[10px] py-2.5 px-3.5 rounded-xl uppercase transition hover:text-slate-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
