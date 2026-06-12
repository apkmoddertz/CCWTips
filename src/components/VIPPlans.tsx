import React, { useState, useEffect } from 'react';
import { VIPPlan } from '../types';
import { db } from '../firebase';
import { doc, setDoc, collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { 
  ShieldCheck, 
  Sparkles, 
  Check, 
  CreditCard, 
  Wallet, 
  Zap, 
  Award, 
  Copy, 
  Upload, 
  CheckCircle, 
  ArrowLeft, 
  ArrowRight, 
  X, 
  Coins, 
  Smartphone, 
  FileText,
  AlertCircle,
  Lock,
  Eye,
  Calendar,
  DollarSign,
  Image as ImageIcon,
  Clock
} from 'lucide-react';
import { getEATExpirationTimestamp } from './VipCountdown';
import { UserPaymentReceipts } from './UserPaymentReceipts';

interface VIPPlansProps {
  plans: VIPPlan[];
  onUnlockVip: () => void;
  isUnlocked: boolean;
  onShowNotification: (msg: string, type: 'success' | 'info') => void;
  currentUser?: { uid: string; email: string; role: 'user' | 'admin'; isVip: boolean; username?: string } | null;
  hasLiveVipMatches?: boolean;
}

export const VIPPlans: React.FC<VIPPlansProps> = ({
  plans,
  onUnlockVip,
  isUnlocked,
  onShowNotification,
  currentUser,
  hasLiveVipMatches = false,
}) => {
  const [sliderVal, setSliderVal] = useState(4); // Default to value 4 (5 Months)
  const [checkoutPlan, setCheckoutPlan] = useState<null | { duration: string; price: number }>(null);
  
  // Checkout flow state machine
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1); // 1: Method, 2: Copy & Pay, 3: Upload Proof, 4: Awaiting Success
  const [selectedMethod, setSelectedMethod] = useState<'trc25' | 'bep25' | 'western_union' | 'mpesa_tz' | 'mpesa_ke'>('trc25');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [txHashOrPhone, setTxHashOrPhone] = useState('');
  const [screenshot, setScreenshot] = useState<string>('');
  const [screenshotName, setScreenshotName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // User custom receipts history state and fullscreen zoom image URL
  const [userReceipts, setUserReceipts] = useState<any[]>([]);
  const [userReceiptsLoading, setUserReceiptsLoading] = useState(false);
  const [userSelectedReceiptUrl, setUserSelectedReceiptUrl] = useState<string | null>(null);

  // Countdown timer for active VIP subscribed state
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    totalMs: number;
    isExpired: boolean;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: 0, isExpired: false });

  useEffect(() => {
    if (!isUnlocked || !currentUser?.vipEndDate) return;

    const expirationTime = getEATExpirationTimestamp(currentUser.vipEndDate);

    const updateTimer = () => {
      const now = Date.now();
      const diff = expirationTime - now;

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: 0, isExpired: true });
      } else {
        const days = Math.floor(diff / (24 * 3600000));
        const hours = Math.floor((diff % (24 * 3600000)) / 3600000);
        const minutes = Math.floor((diff % 3600000) / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        setTimeLeft({
          days,
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
  }, [isUnlocked, currentUser?.vipEndDate]);

  useEffect(() => {
    if (!currentUser) {
      setUserReceipts([]);
      return;
    }
    setUserReceiptsLoading(true);
    const paymentsRef = collection(db, 'payments');
    const q = query(
      paymentsRef,
      where('userId', '==', currentUser.uid)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      list.sort((a: any, b: any) => new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime());
      setUserReceipts(list);
      setUserReceiptsLoading(false);
    }, (error) => {
      console.warn("User realtime receipts subscription failed under current network status:", error);
      setUserReceiptsLoading(false);
    });
    
    return () => unsubscribe();
  }, [currentUser]);

  // Map slider values to dynamic durations and prices
  const getSliderPlanData = (val: number) => {
    switch (val) {
      case 1: return { duration: '1 Day', price: 15, savings: 'Daily Pass', odds: '24H Full Access' };
      case 2: return { duration: '1 Month', price: 420, savings: 'Save 20%', odds: '30-Day Pro Access' };
      case 3: return { duration: '3 Months', price: 999, savings: 'Save 30%', odds: 'Quarterly Gold Tier' };
      case 4: return { duration: '5 Months', price: 1600, savings: 'Best Value - Over 50% Off', odds: '5-Month Ultimate' };
      case 5: return { duration: '6 Months', price: 1800, savings: 'Semi-Annual Spec', odds: 'Pro Access Extension' };
      case 6: return { duration: '12 Months', price: 2900, savings: 'Lifetime VIP Pass', odds: 'Annual Platinum VIP' };
      default: return { duration: `${val} Months`, price: val * 300, savings: 'Special Rate', odds: 'Custom VIP Pass' };
    }
  };

  const currentSliderPlan = getSliderPlanData(sliderVal);

  const startCheckout = (duration: string, price: number) => {
    if (!currentUser) {
      onShowNotification('Please log in or register to purchase premium VIP membership!', 'info');
      return;
    }
    if (hasLiveVipMatches) {
      onShowNotification('⚠️ Cannot subscribe to VIP while live premium matches are in progress!', 'info');
      return;
    }
    setCheckoutPlan({ duration, price });
    setStep(1);
    setSelectedMethod('trc25');
    setTxHashOrPhone('');
    setScreenshot('');
    setScreenshotName('');
    setValidationError(null);
  };

  const closeCheckout = () => {
    setCheckoutPlan(null);
  };

  // Convert USD to local currencies for mobile money estimates
  const getConvertedPriceText = (usdPrice: number) => {
    if (selectedMethod === 'mpesa_tz') {
      const converted = Math.round(usdPrice * 2600);
      return `${converted.toLocaleString()} TZS (1$ ≈ 2,600 TZS)`;
    }
    if (selectedMethod === 'mpesa_ke') {
      const converted = Math.round(usdPrice * 135);
      return `${converted.toLocaleString()} KES (1$ ≈ 135 KES)`;
    }
    return `$${usdPrice} USDT`;
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    onShowNotification(`${label} copied successfully!`, 'success');
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 3 * 1024 * 1024) {
        onShowNotification('Image too large! Maximum allowed is 3MB.', 'info');
        return;
      }
      setScreenshotName(file.name);
      setValidationError(null);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setScreenshot(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !checkoutPlan) return;
    if (!screenshot) {
      onShowNotification('Please upload/capture your payment screenshot receipt!', 'info');
      return;
    }

    setIsSubmitting(true);
    setValidationError(null);
    try {
      // Fetch user's pending transactions to verify potential duplicate screenshot receipts
      const paymentsRef = collection(db, 'payments');
      const q = query(
        paymentsRef,
        where('userId', '==', currentUser.uid),
        where('status', '==', 'pending')
      );
      const querySnapshot = await getDocs(q);
      
      let isDuplicateImage = false;
      const cleanTxHash = txHashOrPhone.trim();
      
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        
        // Match exact screenshot base64 strings
        if (data.screenshot === screenshot) {
          isDuplicateImage = true;
        }
        
        // Match explicit unique transaction/phone strings
        if (cleanTxHash && cleanTxHash !== 'Not Provided' && data.txHashOrPhone === cleanTxHash) {
          isDuplicateImage = true;
        }
      });

      if (isDuplicateImage) {
        setValidationError('You already have a pending transaction with this same payment proof receipt! Please wait for our admin team to approve it.');
        onShowNotification('You already have a pending transaction with this image!', 'info');
        setIsSubmitting(false);
        return;
      }

      const payId = 'pay_' + Math.random().toString(36).substring(2, 11);
      
      let methodLabel = '';
      if (selectedMethod === 'trc25') methodLabel = 'USDT TRC20';
      else if (selectedMethod === 'bep25') methodLabel = 'USDT BEP20';
      else if (selectedMethod === 'western_union') methodLabel = 'Western Union';
      else if (selectedMethod === 'mpesa_tz') methodLabel = 'M-PESA Tanzania';
      else if (selectedMethod === 'mpesa_ke') methodLabel = 'M-PESA Kenya';

      await setDoc(doc(db, 'payments', payId), {
        id: payId,
        userId: currentUser.uid,
        userEmail: currentUser.email,
        username: currentUser.username || 'Not Provided',
        planDuration: checkoutPlan.duration,
        planPrice: checkoutPlan.price,
        paymentMethod: methodLabel,
        screenshot: screenshot,
        txHashOrPhone: txHashOrPhone.trim() || 'Not Provided',
        status: 'pending',
        submittedAt: new Date().toISOString()
      });

      setStep(4);
      onShowNotification('Payment proof submitted! Awaiting administrator approval.', 'success');
    } catch (err: any) {
      console.error('Error submitting payment proof:', err);
      onShowNotification(err.message || 'Firestore connection issue.', 'info');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render method instructions
  const getMethodDetails = () => {
    switch (selectedMethod) {
      case 'trc25':
        return {
          address: 'TF9jvMGRF2pANTjSFbHVXMpbUWTCm3khkK',
          network: 'TRC-20 (Tron)',
          fee: '~1.5 USDT',
          title: 'USDT TRC20 Deposit'
        };
      case 'bep25':
        return {
          address: '0x9281546584200EE91dD44F329F555EE2d2Bd3212',
          network: 'BEP-20 (Binance Smart Chain)',
          fee: '~0.1 USDT',
          title: 'USDT BEP20 Deposit'
        };
      case 'western_union':
        return {
          receiverName: 'Peter J Mganila',
          country: 'Tanzania',
          mechanism: 'Bank Pick-Up',
          title: 'Western Union Payment (Bank Pick-Up)'
        };
      case 'mpesa_tz':
        return {
          agent: 'Zainabu S Abdallah',
          phone: '+255791716498',
          service: 'M-PESA Tanzania Agent',
          title: 'M-PESA Tanzania Direct Payment'
        };
      case 'mpesa_ke':
        return {
          agent: 'TINGA NAYUNGU',
          phone: '+254703671469',
          service: 'M-PESA Kenya Agent',
          title: 'M-PESA Kenya Direct Payment'
        };
    }
  };

  const details = getMethodDetails();

  return (
    <div className="w-full px-4 py-2 select-none" id="vip_plans_section">
      {/* Premium Banner Intro */}
      <div className="text-center mb-5 pt-1">
        <div className="inline-flex items-center gap-1 bg-[#F5C400]/10 border border-[#F5C400]/22 px-2.5 py-1 rounded-full mb-2">
          <Sparkles className="w-3.5 h-3.5 text-[#F5C400] animate-pulse" />
          <span className="text-[9px] font-black tracking-widest text-[#F5C400] uppercase font-mono">
            INSTANT ACCESS GUARANTEED
          </span>
        </div>
        <h2 className="relative block font-sans font-black text-[20px] sm:text-[24px] uppercase tracking-tighter text-white whitespace-nowrap">
          UNLOCK <span className="text-[#F5C400] drop-shadow-[0_2px_10px_rgba(245,196,0,0.35)]">PRO PACKAGES</span>
        </h2>
        <p className="text-slate-400 text-[11px] mt-1 font-bold">
          High odds prediction analysis curated by real experts
        </p>
      </div>

      {hasLiveVipMatches && (
        <div className="mb-6 bg-rose-500/10 border border-rose-500/25 rounded-2xl p-4.5 text-center flex flex-col items-center gap-2 select-none animate-pulse">
          <div className="h-9 w-9 rounded-full bg-rose-550/15 flex items-center justify-center border border-rose-500/20 text-rose-400">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-sans font-black text-white uppercase tracking-tight">VIP Subscriptions Locked</h4>
            <p className="text-slate-400 text-[10px] max-w-xs mx-auto mt-1 leading-relaxed font-medium">
              New VIP memberships are temporarily closed because a premium VIP match is currently <span className="text-rose-400 font-bold">LIVE</span>. Subscriptions will reopen as soon as the live match ends!
            </p>
          </div>
        </div>
      )}

      {isUnlocked ? (
        /* ALREADY ACTIVE VIP MODE */
        <div className="bg-gradient-to-br from-[#121B31] to-[#0A0F1D] border border-amber-500/40 rounded-3xl p-6 text-center shadow-lg shadow-amber-500/5 mb-8 relative overflow-hidden" id="unlocked_vip_indicator">
          {/* Ambient drop glows */}
          <div className="absolute top-0 right-0 p-3 bg-amber-500/10 text-[#F5C400] rounded-bl-2xl">
            <Sparkles className="w-4 h-4 animate-spin" style={{ animationDuration: '6s' }} />
          </div>
          
          <div className="w-14 h-14 bg-[#F5C400]/10 border border-[#F5C400]/30 text-[#F5C400] rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner shadow-orange-500/10">
            <ShieldCheck className="w-8 h-8 stroke-[1.8]" />
          </div>

          <h3 className="text-xl font-sans font-black text-[#F5C400] tracking-tight uppercase">CONGRATULATIONS!</h3>
          <p className="text-slate-200 text-[11px] max-w-xs mx-auto mt-2 leading-relaxed font-semibold">
            Congratulations! You are officially an active VIP subscriber. Access high-accuracy prediction slips instantly on the matches feed.
          </p>

          <div className="mt-5 border-t border-slate-805 pt-4 flex flex-col gap-2.5 max-w-xs mx-auto">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-bold">Account Status:</span>
              <span className="text-[#F5C400] font-black uppercase tracking-wider bg-[#F5C400]/10 border border-[#F5C400]/25 px-2.5 py-0.5 rounded-lg">
                ACTIVE PRO PACKAGE
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-bold">Access Level:</span>
              <span className="text-emerald-400 font-extrabold uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-0.5 rounded-lg">
                UNLIMITED SLIPS
              </span>
            </div>
          </div>

          {/* High-Tech Premium Ticking Countdown Layout for Subscribed Pro VIP */}
          {!timeLeft.isExpired && currentUser?.vipEndDate && (
            <div className="mt-6 pt-5 border-t border-slate-805">
              <div className="flex items-center justify-center gap-1.5 mb-3.5">
                <Clock className="w-3.5 h-3.5 text-[#F5C400] animate-pulse" />
                <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider font-mono">
                  Membership Active Time Left
                </span>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              </div>
              
              <div className="flex justify-center items-center gap-2 select-none">
                {timeLeft.days > 0 && (
                  <>
                    <div className="bg-[#1c2438]/90 border border-slate-800/80 rounded-xl px-2.5 py-2 flex flex-col items-center min-w-[50px] shadow-lg relative overflow-hidden">
                      <span className="text-base font-extrabold text-white font-mono leading-none drop-shadow-[0_2px_8px_rgba(255,255,255,0.1)]">
                        {String(timeLeft.days).padStart(2, '0')}
                      </span>
                      <span className="text-[7.5px] font-mono text-[#F5C400] font-black uppercase tracking-wider mt-1">
                        Days
                      </span>
                    </div>
                    <span className="text-base font-extrabold text-slate-600 font-mono animate-pulse">:</span>
                  </>
                )}
                <div className="bg-[#1c2438]/90 border border-slate-800/80 rounded-xl px-2.5 py-2 flex flex-col items-center min-w-[50px] shadow-lg relative overflow-hidden">
                  <span className="text-base font-extrabold text-white font-mono leading-none drop-shadow-[0_2px_8px_rgba(255,255,255,0.1)]">
                    {String(timeLeft.hours).padStart(2, '0')}
                  </span>
                  <span className="text-[7.5px] font-mono text-[#F5C400] font-black uppercase tracking-wider mt-1">
                    Hrs
                  </span>
                </div>
                <span className="text-base font-extrabold text-slate-600 font-mono animate-pulse">:</span>
                <div className="bg-[#1c2438]/90 border border-slate-800/80 rounded-xl px-2.5 py-2 flex flex-col items-center min-w-[50px] shadow-lg relative overflow-hidden">
                  <span className="text-base font-extrabold text-[#F5C400] font-mono leading-none drop-shadow-[0_2px_8px_rgba(245,196,0,0.15)]">
                    {String(timeLeft.minutes).padStart(2, '0')}
                  </span>
                  <span className="text-[7.5px] font-mono text-slate-400 font-bold uppercase tracking-wider mt-1">
                    Mins
                  </span>
                </div>
                <span className="text-base font-extrabold text-slate-600 font-mono animate-pulse">:</span>
                <div className="bg-[#1c2438]/90 border border-rose-500/25 rounded-xl px-2.5 py-2 flex flex-col items-center min-w-[50px] shadow-lg relative overflow-hidden">
                  <span className="text-base font-extrabold text-rose-400 font-mono leading-none drop-shadow-[0_2px_8px_rgba(244,63,94,0.15)] animate-pulse">
                    {String(timeLeft.seconds).padStart(2, '0')}
                  </span>
                  <span className="text-[7.5px] font-mono text-rose-450 font-black uppercase tracking-wider mt-1">
                    Secs
                  </span>
                </div>
              </div>

              <div className="mt-4 bg-slate-900/60 rounded-xl py-1.5 px-3 inline-flex items-center gap-1.5 border border-slate-800/50 shadow-inner">
                <Calendar className="w-3 h-3 text-slate-400" />
                <span className="text-[9.5px] font-mono font-medium text-slate-400">
                  Subscription Expiry Date: <span className="text-white font-extrabold">{currentUser?.vipEndDate}</span> (23:59 EAT)
                </span>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* COMPACT PREMIUM APK ROW DISPLAY WITH SLIDER SELECTOR AT THE BOTTOM */
        <div className="space-y-4" id="plans_selection_dashboard">
          
          {/* 3 Premium Options in One Row */}
          <div className="grid grid-cols-3 gap-2.5 w-full">
            
            {/* CARD 1: 1 Day - $15 */}
            <div 
              onClick={() => startCheckout('1 Day', 15)}
              className="group cursor-pointer relative bg-gradient-to-b from-[#0D221C] to-[#07100D] border border-emerald-500/30 hover:border-emerald-400 active:scale-95 transition-all duration-200 rounded-2xl pt-3 pb-3.5 px-1.5 flex flex-col justify-between items-center text-center shadow-lg shadow-emerald-500/5 hover:shadow-black/40"
              id="plan_1day_btn"
            >
              <div className="absolute -inset-[1px] bg-gradient-to-b from-emerald-500/20 to-transparent rounded-2xl -z-10 opacity-75" />
              
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-emerald-500 text-[7.5px] font-black px-1.5 py-0.5 rounded-full text-black uppercase tracking-wider select-none leading-none">
                DAILY PLAN
              </div>
              
              <div className="mt-1.5">
                <span className="block text-emerald-300 text-[9px] font-black uppercase tracking-wide">
                  1 Day Pass
                </span>
                <span className="block text-white text-xl font-extrabold tracking-tight mt-1 group-hover:text-emerald-400 transition-colors leading-none">
                  $15
                </span>
              </div>

              <div className="mt-3.5 w-full px-1">
                <div className="bg-emerald-500 text-slate-950 text-[8px] font-black tracking-wider uppercase py-1.5 rounded-lg text-center transition-all shadow-[0_2px_8px_rgba(16,185,129,0.35)]">
                  ACTIVATE
                </div>
              </div>
            </div>

            {/* CARD 2: 1 Month - $420 */}
            <div 
              onClick={() => startCheckout('1 Month', 420)}
              className="group cursor-pointer relative bg-gradient-to-b from-[#181F3B] to-[#0A0D1D] border border-cyan-500/40 hover:border-cyan-400 active:scale-95 transition-all duration-200 rounded-2xl pt-3 pb-3.5 px-1.5 flex flex-col justify-between items-center text-center shadow-lg shadow-cyan-500/5 hover:shadow-black/40"
              id="plan_1month_btn"
            >
              <div className="absolute -inset-[1px] bg-gradient-to-b from-cyan-400/20 to-transparent rounded-2xl -z-10 opacity-75" />
              
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-cyan-500 text-[7.5px] font-black px-1.5 py-0.5 rounded-full text-black uppercase tracking-wider select-none leading-none animate-pulse">
                BEST PLAN
              </div>
              
              <div className="mt-1.5">
                <span className="block text-cyan-300 text-[9px] font-black uppercase tracking-wide">
                  Monthly
                </span>
                <span className="block text-white text-xl font-extrabold tracking-tight mt-1 group-hover:text-[#F5C400] transition-colors leading-none">
                  $420
                </span>
              </div>

              <div className="mt-3.5 w-full px-1">
                <div className="bg-cyan-500 text-black text-[8px] font-black tracking-wider uppercase py-1.5 rounded-lg text-center transition-all hover:brightness-110">
                  ACTIVATE
                </div>
              </div>
            </div>

            {/* CARD 3: 5 Months - $1600 */}
            <div 
              onClick={() => startCheckout('5 Months', 1600)}
              className="group cursor-pointer relative bg-gradient-to-b from-[#1C182E] to-[#080614] border border-[#F5C400]/40 hover:border-[#F5C400] active:scale-95 transition-all duration-200 rounded-2xl pt-3 pb-3.5 px-1.5 flex flex-col justify-between items-center text-center shadow-xl shadow-amber-500/5 hover:shadow-black/40"
              id="plan_5months_btn"
            >
              <div className="absolute -inset-[1px] bg-gradient-to-b from-[#F5C400]/30 to-transparent rounded-2xl -z-10 opacity-80" />

              <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-[#F5C400] text-[7.5px] font-black px-1.5 py-0.5 rounded-full text-black uppercase tracking-wider select-none leading-none">
                MEGA PLAN
              </div>
              
              <div className="mt-1.5">
                <span className="block text-[#F5C400] text-[9px] font-black uppercase tracking-wide">
                  5 Months
                </span>
                <span className="block text-white text-xl font-extrabold tracking-tight mt-1 group-hover:text-[#F5C400] transition-colors leading-none">
                  $1600
                </span>
              </div>

              <div className="mt-3.5 w-full px-1">
                <div className="bg-[#F5C400] text-black text-[8px] font-black tracking-wider uppercase py-1.5 rounded-lg text-center transition-all shadow-[0_2px_8px_rgba(245,196,0,0.3)]">
                  ACTIVATE
                </div>
              </div>
            </div>

          </div>

          {/* Bottom Custom Range Plan Selector Display Box */}
          <div className="bg-gradient-to-r from-[#0C1122] to-[#121A30] border border-slate-805/90 rounded-[24px] p-4.5 shadow-lg relative overflow-hidden" id="range_selector_card">
            
            <div className="absolute top-0 right-0 bg-gradient-to-l from-amber-500 to-red-600 border-l border-b border-red-500/25 text-white text-[8px] font-black uppercase px-2.5 py-0.8 rounded-bl-xl tracking-widest select-none z-10">
              {currentSliderPlan.odds}
            </div>

            <div className="flex items-center justify-between gap-2.5 mb-3.5">
              <div>
                <span className="text-[10px] uppercase font-mono font-extrabold text-slate-400 tracking-wider">
                  Selected Range:
                </span>
                <h3 className="text-white text-base font-black tracking-tight uppercase flex items-center gap-1 mt-0.5 font-heading">
                  <Award className="w-4 h-4 text-[#F5C400]" />
                  {currentSliderPlan.duration} VIP Pass
                </h3>
              </div>
              <div className="text-right">
                <span className="text-[9px] uppercase font-mono font-extrabold text-[#F5C400] tracking-widest block bg-[#F5C400]/10 px-1.5 py-0.5 rounded mb-0.5 select-none leading-none">
                  {currentSliderPlan.savings}
                </span>
                <span className="text-xl font-black text-white tracking-tight">
                  ${currentSliderPlan.price}
                </span>
              </div>
            </div>

            {/* Premium Range Slider */}
            <div className="bg-slate-900/60 border border-slate-805 p-3 rounded-2xl mb-4">
              <div className="flex justify-between items-center text-[8.5px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                <span>1 Day</span>
                <span className="text-[#F5C400] font-black flex items-center gap-0.5">
                  <Zap className="w-2.5 h-2.5 fill-current" /> SLIDE RANGE
                </span>
                <span>12 Months</span>
              </div>
              
              <input
                type="range"
                min="1"
                max="6"
                step="1"
                value={sliderVal}
                onChange={(e) => setSliderVal(parseInt(e.target.value))}
                className="w-full accent-[#F5C400] bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
                id="range_slider_input"
              />
              
              <div className="flex justify-between text-[7px] text-slate-500 font-mono mt-1 px-0.5">
                <span>1D</span>
                <span>1M</span>
                <span>3M</span>
                <span className="text-[#F5C400] font-bold">5M</span>
                <span>6M</span>
                <span>12M</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => startCheckout(currentSliderPlan.duration, currentSliderPlan.price)}
              className="w-full bg-[#F5C400] hover:bg-[#E2B200] active:scale-97 text-black text-xs font-black uppercase py-2.5 px-4 rounded-xl transition-all duration-200 shadow-[0_0_12px_rgba(245,196,0,0.25)] flex items-center justify-center gap-1.5"
              id="activate_slider_btn"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              Unlock Premium {currentSliderPlan.duration}
            </button>
          </div>
          
        </div>
      )}

      {/* USER PAYMENT RECEIPTS HISTORY */}
      <UserPaymentReceipts 
        userReceipts={userReceipts} 
        userReceiptsLoading={userReceiptsLoading} 
        onShowNotification={onShowNotification} 
      />

      {/* --- PREMIUUM MULTI-STAGE APK PAYMENT FLOW --- */}
      {checkoutPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-3 select-none animate-fade-in" id="apk_payment_modal">
          <div className="relative w-full max-w-[390px] bg-[#040816] border border-[#161B30] rounded-[30px] p-4 text-slate-100 shadow-2xl flex flex-col max-h-[95vh] overflow-hidden">
            {/* Ambient luxury glow overlay */}
            <div className="absolute -top-12 -left-12 w-40 h-40 bg-purple-600/10 rounded-full blur-2.5xl pointer-events-none"></div>
            <div className="absolute -bottom-12 -right-12 w-40 h-40 bg-indigo-600/10 rounded-full blur-2.5xl pointer-events-none"></div>

            {/* Modal Header Tab Info */}
            <div className="flex items-center justify-between pb-3.5 border-b border-[#11162B] mb-4.5">
              <div>
                <span className="text-[8px] font-mono font-black text-[#A78BFA] tracking-widest uppercase">STAGE {step} OF 3</span>
                <h4 className="text-xs font-black text-white uppercase tracking-wider font-heading">VIP SYSTEM GATEWAY</h4>
              </div>
              <button 
                type="button"
                onClick={closeCheckout}
                className="h-7 w-7 rounded-full bg-slate-900/80 border border-slate-800/80 hover:bg-slate-850 flex items-center justify-center text-slate-400 hover:text-white transition active:scale-90"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* --- PREMIUM STEP PROGRESSIVE BAR (MATCHING SCREENSHOT) --- */}
            {step < 4 && (
              <div className="flex items-center justify-between px-2 mb-5 select-none relative">
                {[
                  { num: 1, label: 'METHOD' },
                  { num: 2, label: 'PAYMENT' },
                  { num: 3, label: 'UPLOAD PROOF' },
                ].map((s, idx) => {
                  const isCompleted = step > s.num;
                  const isActive = step === s.num;
                  return (
                    <React.Fragment key={s.num}>
                      <div className="flex flex-col items-center flex-1 relative z-10">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center font-black text-xs transition-all duration-300 relative ${
                          isCompleted 
                            ? 'bg-gradient-to-br from-[#7C3AED] to-[#9333EA] text-white shadow-[0_0_10px_rgba(147,51,234,0.45)]' 
                            : isActive 
                              ? 'bg-gradient-to-br from-[#8B5CF6] to-[#C084FC] text-white ring-4 ring-[#8B5CF6]/20 shadow-[0_0_15px_rgba(139,92,246,0.65)]' 
                              : 'bg-[#121625] border border-[#1E2538] text-slate-500'
                        }`}>
                          {isCompleted ? <Check className="w-4 h-4 stroke-[3.5]" /> : s.num}
                        </div>
                        <span className={`text-[8.5px] font-black uppercase tracking-widest mt-2 transition duration-300 ${
                          isActive ? 'text-[#C084FC] font-black' : isCompleted ? 'text-[#8B5CF6]' : 'text-slate-500'
                        }`}>{s.label}</span>
                      </div>
                      {idx < 2 && (
                        <div className={`h-[1.5px] flex-1 -mt-5.5 transition duration-500 relative z-0 ${
                          step > s.num ? 'bg-gradient-to-r from-[#7C3AED] to-[#8B5CF6]' : 'bg-[#1E2538]'
                        }`}></div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            )}

            {/* Scrollable Container Area */}
            <div className="flex-1 overflow-y-auto scrollbar-none pr-0.5 space-y-4 pb-2 text-xs">
              
              {/* --- STAGE 1: SELECT PAYMENT METHOD --- */}
              {step === 1 && (
                <div className="space-y-4 animate-fade-in">
                  
                  {/* Premium Shield Crown Bento Banner Card */}
                  <div className="bg-gradient-to-br from-[#1E114D] via-[#110C2A] to-[#060814] border border-[#3E1F7C]/60 rounded-[22px] p-4 flex items-center justify-between shadow-2xl relative overflow-hidden">
                    <div className="absolute inset-0 bg-radial-gradient-glow pointer-events-none opacity-40"></div>
                    
                    <div className="flex-1 pr-3 z-10">
                      <span className="text-[10px] uppercase font-black tracking-widest text-[#9369FF]">Plan</span>
                      <h4 className="text-[15.5px] font-black text-white leading-tight tracking-tight mt-0.5">
                        {checkoutPlan.duration} Premium Gateway
                      </h4>
                      <div className="mt-4 inline-block bg-[#160E35] border border-[#3E1A7D] px-4 py-2 rounded-xl shadow-inner shadow-black/80">
                        <span className="block text-[8px] uppercase tracking-widest text-[#B39DFF] font-extrabold select-none">Total Value</span>
                        <span className="text-[16.5px] font-black text-[#D8B4FE] tracking-tight leading-none block mt-1">
                          ${checkoutPlan.price} USD
                        </span>
                      </div>
                    </div>

                    <div className="relative w-22 h-22 flex items-center justify-center flex-shrink-0 z-10 select-none">
                      <div className="absolute w-16 h-16 bg-[#8B5CF6]/20 blur-xl rounded-full"></div>
                      <svg className="w-20 h-20 drop-shadow-[0_4px_16px_rgba(139,92,246,0.55)]" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                          <linearGradient id="pedestalGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#4c1d95" />
                            <stop offset="100%" stopColor="#020617" />
                          </linearGradient>
                          <linearGradient id="shieldBg" x1="50%" y1="0%" x2="50%" y2="100%">
                            <stop offset="0%" stopColor="#2e1065" />
                            <stop offset="100%" stopColor="#020617" />
                          </linearGradient>
                          <linearGradient id="shieldBorder" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#c084fc" />
                            <stop offset="50%" stopColor="#a78bfa" />
                            <stop offset="100%" stopColor="#4c1d95" />
                          </linearGradient>
                          <linearGradient id="crownGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#fbbf24" />
                            <stop offset="100%" stopColor="#f59e0b" />
                          </linearGradient>
                        </defs>
                        <path d="M12 76 C 12 68, 88 68, 88 76 C 88 82, 12 82, 12 76 Z" fill="url(#pedestalGrad)" opacity="0.85" />
                        <ellipse cx="50" cy="76" rx="36" ry="3.5" fill="#1e1b4b" opacity="0.6" />
                        <path d="M50 14 L80 24 C80 50, 50 72, 50 72 C 50 72, 20 50, 20 L50 24 Z" fill="url(#shieldBg)" stroke="url(#shieldBorder)" strokeWidth="2.5" strokeLinejoin="round" />
                        <path d="M35 52 L39 39 L50 45 L61 39 L65 52 Z" fill="url(#crownGrad)" stroke="#fbbf24" strokeWidth="0.8" />
                        <circle cx="35" cy="52" r="1.5" fill="#f59e0b" />
                        <circle cx="50" cy="45" r="1.5" fill="#f59e0b" />
                        <circle cx="65" cy="52" r="1.5" fill="#f59e0b" />
                        <path d="M32 55 H68 V57.5 H32 Z" fill="#f59e0b" />
                      </svg>
                    </div>
                  </div>

                  {/* Header labels with dynamic Secure text */}
                  <div className="flex items-center justify-between text-[10px] font-black tracking-widest uppercase text-slate-355 px-1 border-b border-[#1C243C]/60 pb-2 mt-2">
                    <span>SELECT PAYMENT METHOD</span>
                    <span className="flex items-center gap-1 text-[9px] font-bold normal-case text-slate-400 tracking-normal">
                      <Lock className="w-3 h-3 text-[#A78BFA] stroke-[2.5]" /> All transactions are secure
                    </span>
                  </div>

                  <div className="space-y-2">
                    {/* TRC-20 Method */}
                    <button
                      type="button"
                      onClick={() => setSelectedMethod('trc25')}
                      className={`w-full flex items-center justify-between p-3.5 rounded-[20px] border text-left transition duration-300 ${
                        selectedMethod === 'trc25'
                          ? 'bg-gradient-to-r from-[#171336] to-[#0D1122] border-[#8B5CF6] shadow-[0_0_15px_rgba(139,92,246,0.15)] ring-1 ring-[#8B5CF6]/50 text-white'
                          : 'bg-[#0B1020] border-[#161C30] text-slate-300 hover:bg-slate-900/60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {selectedMethod === 'trc25' ? (
                          <div className="w-5 h-5 rounded-full bg-[#8B5CF6] flex items-center justify-center text-white scale-100 transition-all duration-300 shadow-[0_0_8px_rgba(139,92,246,0.6)] flex-shrink-0">
                            <Check className="w-3.5 h-3.5 stroke-[4] text-white" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full border-2 border-slate-700 bg-slate-950 transition-all duration-300 flex-shrink-0"></div>
                        )}
                        <div className="h-7 px-2 rounded-lg bg-[#10B981]/15 flex items-center justify-center text-[#10B981] font-black font-mono text-[9.5px] border border-[#10B981]/25">
                          TRC
                        </div>
                        <div>
                          <span className="block font-black text-xs text-white leading-snug">USDT (TRC-20)</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <div className="bg-[#10B981]/10 border border-[#10B981]/35 text-[#10B981] text-[7.5px] font-black uppercase tracking-wider py-0.5 px-2 rounded-full">
                          FAST ⚡
                        </div>
                        <ArrowRight className={`w-3.5 h-3.5 ${selectedMethod === 'trc25' ? 'text-[#8B5CF6]' : 'text-slate-600'}`} />
                      </div>
                    </button>

                    {/* BEP-20 Method */}
                    <button
                      type="button"
                      onClick={() => setSelectedMethod('bep25')}
                      className={`w-full flex items-center justify-between p-3.5 rounded-[20px] border text-left transition duration-300 ${
                        selectedMethod === 'bep25'
                          ? 'bg-gradient-to-r from-[#171336] to-[#0D1122] border-[#8B5CF6] shadow-[0_0_15px_rgba(139,92,246,0.15)] ring-1 ring-[#8B5CF6]/50 text-white'
                          : 'bg-[#0B1020] border-[#161C30] text-slate-300 hover:bg-slate-900/60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {selectedMethod === 'bep25' ? (
                          <div className="w-5 h-5 rounded-full bg-[#8B5CF6] flex items-center justify-center text-white scale-100 transition-all duration-300 shadow-[0_0_8px_rgba(139,92,246,0.6)] flex-shrink-0">
                            <Check className="w-3.5 h-3.5 stroke-[4] text-white" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full border-2 border-slate-700 bg-slate-950 transition-all duration-300 flex-shrink-0"></div>
                        )}
                        <div className="h-7 px-2 rounded-lg bg-yellow-500/10 flex items-center justify-center text-[#F5C400] font-black font-mono text-[9.5px] border border-[#F5C400]/25">
                          BEP
                        </div>
                        <div>
                          <span className="block font-black text-xs text-white leading-snug">USDT (BEP-20)</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <div className="bg-yellow-500/10 border border-yellow-500/35 text-yellow-500 text-[7.5px] font-black uppercase tracking-wider py-0.5 px-2 rounded-full">
                          LOW FEE 💰
                        </div>
                        <ArrowRight className={`w-3.5 h-3.5 ${selectedMethod === 'bep25' ? 'text-[#8B5CF6]' : 'text-slate-600'}`} />
                      </div>
                    </button>

                    {/* Western Union Method */}
                    <button
                      type="button"
                      onClick={() => setSelectedMethod('western_union')}
                      className={`w-full flex items-center justify-between p-3.5 rounded-[20px] border text-left transition duration-300 ${
                        selectedMethod === 'western_union'
                          ? 'bg-gradient-to-r from-[#171336] to-[#0D1122] border-[#8B5CF6] shadow-[0_0_15px_rgba(139,92,246,0.15)] ring-1 ring-[#8B5CF6]/50 text-white'
                          : 'bg-[#0B1020] border-[#161C30] text-slate-300 hover:bg-slate-900/60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {selectedMethod === 'western_union' ? (
                          <div className="w-5 h-5 rounded-full bg-[#8B5CF6] flex items-center justify-center text-white scale-100 transition-all duration-300 shadow-[0_0_8px_rgba(139,92,246,0.6)] flex-shrink-0">
                            <Check className="w-3.5 h-3.5 stroke-[4] text-white" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full border-2 border-slate-700 bg-slate-950 transition-all duration-300 flex-shrink-0"></div>
                        )}
                        <div className="h-7 px-2 rounded-lg bg-indigo-500/10 flex items-center justify-center text-[#BBB0FF] font-black font-mono text-[9.5px] border border-indigo-500/25">
                          WU
                        </div>
                        <div>
                          <span className="block font-black text-xs text-white leading-snug">Western Union (Bank Pick-Up)</span>
                          <span className="block text-[9px] text-slate-400 font-semibold mt-0.5">Peter J Mganila • global transfer</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <div className="bg-indigo-500/10 border border-indigo-500/35 text-indigo-400 text-[7.5px] font-black uppercase tracking-wider py-0.5 px-2 rounded-full">
                          GLOBAL 🌍
                        </div>
                        <ArrowRight className={`w-3.5 h-3.5 ${selectedMethod === 'western_union' ? 'text-[#8B5CF6]' : 'text-slate-600'}`} />
                      </div>
                    </button>

                    {/* M-PESA TZ Method */}
                    <button
                      type="button"
                      onClick={() => setSelectedMethod('mpesa_tz')}
                      className={`w-full flex items-center justify-between p-3.5 rounded-[20px] border text-left transition duration-300 ${
                        selectedMethod === 'mpesa_tz'
                          ? 'bg-gradient-to-r from-[#171336] to-[#0D1122] border-[#8B5CF6] shadow-[0_0_15px_rgba(139,92,246,0.15)] ring-1 ring-[#8B5CF6]/50 text-white'
                          : 'bg-[#0B1020] border-[#161C30] text-slate-300 hover:bg-slate-900/60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {selectedMethod === 'mpesa_tz' ? (
                          <div className="w-5 h-5 rounded-full bg-[#8B5CF6] flex items-center justify-center text-white scale-100 transition-all duration-300 shadow-[0_0_8px_rgba(139,92,246,0.6)] flex-shrink-0">
                            <Check className="w-3.5 h-3.5 stroke-[4] text-white" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full border-2 border-slate-700 bg-slate-950 transition-all duration-300 flex-shrink-0"></div>
                        )}
                        <div className="h-7 px-2 rounded-lg bg-red-500/15 flex items-center justify-center text-red-500 font-black font-mono text-[9.5px] border border-red-500/30">
                          TZS
                        </div>
                        <div>
                          <span className="block font-black text-xs text-white leading-snug">M-PESA Tanzania Agent</span>
                          <span className="block text-[9px] text-slate-400 font-semibold mt-0.5">Zainabu Abdallah • Mobile Money</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <Smartphone className={`w-4 h-4 ${selectedMethod === 'mpesa_tz' ? 'text-[#8B5CF6]' : 'text-slate-500'}`} />
                        <ArrowRight className={`w-3.5 h-3.5 ${selectedMethod === 'mpesa_tz' ? 'text-[#8B5CF6]' : 'text-slate-600'}`} />
                      </div>
                    </button>

                    {/* M-PESA KE Method */}
                    <button
                      type="button"
                      onClick={() => setSelectedMethod('mpesa_ke')}
                      className={`w-full flex items-center justify-between p-3.5 rounded-[20px] border text-left transition duration-300 ${
                        selectedMethod === 'mpesa_ke'
                          ? 'bg-gradient-to-r from-[#171336] to-[#0D1122] border-[#8B5CF6] shadow-[0_0_15px_rgba(139,92,246,0.15)] ring-1 ring-[#8B5CF6]/50 text-white'
                          : 'bg-[#0B1020] border-[#161C30] text-slate-300 hover:bg-slate-900/60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {selectedMethod === 'mpesa_ke' ? (
                          <div className="w-5 h-5 rounded-full bg-[#8B5CF6] flex items-center justify-center text-white scale-100 transition-all duration-300 shadow-[0_0_8px_rgba(139,92,246,0.6)] flex-shrink-0">
                            <Check className="w-3.5 h-3.5 stroke-[4] text-white" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full border-2 border-slate-700 bg-slate-950 transition-all duration-300 flex-shrink-0"></div>
                        )}
                        <div className="h-7 px-2 rounded-lg bg-green-500/15 flex items-center justify-center text-green-500 font-black font-mono text-[9.5px] border border-green-500/30">
                          KES
                        </div>
                        <div>
                          <span className="block font-black text-xs text-white leading-snug">M-PESA Kenya Agent</span>
                          <span className="block text-[9px] text-slate-400 font-semibold mt-0.5">TINGA NAYUNGU • Mobile Money</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <Smartphone className={`w-4 h-4 ${selectedMethod === 'mpesa_ke' ? 'text-[#8B5CF6]' : 'text-slate-500'}`} />
                        <ArrowRight className={`w-3.5 h-3.5 ${selectedMethod === 'mpesa_ke' ? 'text-[#8B5CF6]' : 'text-slate-600'}`} />
                      </div>
                    </button>
                  </div>

                  {/* PROCEED TO PAYMENT BUTTON (MATCHES SCREENSHOT) */}
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="w-full bg-gradient-to-r from-[#7C3AED] via-[#9333EA] to-[#C084FC] hover:shadow-[0_0_24px_rgba(147,51,234,0.6)] text-white text-xs font-black uppercase py-4 px-5 rounded-full flex items-center justify-center relative active:scale-97 transition duration-300 shadow-[0_4px_24px_rgba(147,51,234,0.4)] mt-4 cursor-pointer font-sans"
                    id="apk_proceed_payment_btn"
                  >
                    <div className="absolute left-2.5 bg-black/30 w-8 h-8 rounded-full flex items-center justify-center">
                      <Lock className="w-4 h-4 text-white stroke-[2.5]" />
                    </div>
                    <span className="tracking-widest pr-4 pl-3">PROCEED TO PAYMENT</span>
                    <ArrowRight className="w-4 h-4 text-white stroke-[3.5] animate-pulse" />
                  </button>

                  {/* Encryption disclaimer footer */}
                  <div className="flex items-center justify-center gap-1.5 mt-3 text-slate-400 text-[10px] select-none">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 stroke-[2.5]" />
                    <span>Your payment information is safe and encrypted</span>
                  </div>
                </div>
              )}

              {/* --- STAGE 2: MAKE PAYMENT & COPY --- */}
              {step === 2 && (
                <div className="space-y-3.5 animate-fade-in text-xs">
                  <div className="bg-slate-950 border border-slate-850 p-2.8 rounded-xl text-[10.5px] leading-relaxed">
                    <span className="block uppercase text-slate-500 font-black text-[8px] tracking-widest">Gateway</span>
                    <span className="block font-extrabold text-white text-[12px]">{details.title}</span>
                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-900/60">
                      <span className="text-slate-400">Total Price:</span>
                      <span className="text-[#F5C410] font-black text-[13px]">{getConvertedPriceText(checkoutPlan.price)}</span>
                    </div>
                  </div>

                  <p className="text-[9.5px] text-slate-400 font-medium">
                    Please transfer the exact amount above to the agent/address below. Click the Copy button to capture values instantly.
                  </p>

                  {/* CRYPTO BLOCK PREPARATION */}
                  {(selectedMethod === 'trc25' || selectedMethod === 'bep25') && (
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between items-center text-[8.5px] font-black uppercase text-slate-400 mb-1 tracking-wider">
                          <span>Deposit Network Protocol</span>
                          <span className="text-teal-400">Lock Match</span>
                        </div>
                        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-2.5 font-mono text-[10px] text-white">
                          {details.network}
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between items-center text-[8.5px] font-black uppercase text-slate-400 mb-1 tracking-wider">
                          <span>USDT Wallet Address</span>
                          {copiedField === 'Address' && <span className="text-emerald-400 font-bold">✔ Copied</span>}
                        </div>
                        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between gap-1">
                          <span className="font-mono text-[9px] text-zinc-300 break-all select-all flex-1 pr-1 leading-normal">
                            {details.address}
                          </span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(details.address || '', 'Address')}
                            className="bg-[#F5C400]/10 hover:bg-[#F5C400]/20 border border-[#F5C400]/20 text-[#F5C400] p-2 rounded-lg transition"
                            title="Copy Wallet Address"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="mt-1 text-[8.5px] leading-tight text-slate-500 font-mono">
                          Min deposit: 10 USDT. Network Fee: {details.fee}. Ensure your sender wallet matches the chosen platform network.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* WESTERN UNION ENVELOPE */}
                  {selectedMethod === 'western_union' && (
                    <div className="space-y-3 bg-[#111625]/80 border border-indigo-500/20 rounded-2xl p-4 shadow-sm shadow-indigo-950/40">
                      <div>
                        <div className="flex justify-between items-center text-[8.5px] font-black uppercase text-slate-400 mb-1 tracking-wider">
                          <span>Recipient Full Name</span>
                          {copiedField === 'Recipient' && <span className="text-emerald-400 font-bold font-mono">✔ Copied</span>}
                        </div>
                        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between gap-1 text-[12px] font-extrabold text-white">
                          <span className="font-mono text-[12.5px] text-[#F5C400]">Peter J Mganila</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard('Peter J Mganila', 'Recipient')}
                            className="bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/25 text-[#A78BFA] py-1.5 px-2.5 rounded-lg transition flex items-center gap-1 text-[10px]"
                          >
                            <Copy className="w-3.5 h-3.5 shrink-0" /> Copy
                          </button>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between items-center text-[8.5px] font-black uppercase text-slate-400 mb-1 tracking-wider">
                          <span>Country / Location</span>
                          {copiedField === 'Country' && <span className="text-emerald-400 font-bold font-mono">✔ Copied</span>}
                        </div>
                        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between gap-1 text-[11px] font-bold text-white">
                          <span className="uppercase text-slate-200">Tanzania</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard('Tanzania', 'Country')}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-350 p-1.5 rounded transition"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between items-center text-[8.5px] font-black uppercase text-slate-400 mb-1 tracking-wider">
                          <span>Payout Channel</span>
                        </div>
                        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-2.5 text-xs text-white font-extrabold flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/25 text-[#BBB0FF] font-mono text-[10px] uppercase">Bank Pick-Up</span>
                        </div>
                      </div>

                      <div className="mt-2.5 p-3 bg-indigo-500/5 border border-indigo-500/15 rounded-xl text-[10px] text-zinc-300 font-medium leading-relaxed shadow-inner">
                        <span className="block font-black text-[#A78BFA] uppercase tracking-wider text-[8.5px] mb-1">⚠️ CRITICAL REQUIREMENT</span>
                        Western Union requires strict verification. Before completing your payment, make sure Country (<strong className="text-white">Tanzania</strong>) and Receiver Names (<strong className="text-white">Peter J Mganila</strong>) match your Western Union transaction slip identically. No spelling mistakes!
                      </div>
                    </div>
                  )}

                  {/* MOBILE MONEY ENVELOPE */}
                  {(selectedMethod === 'mpesa_tz' || selectedMethod === 'mpesa_ke') && (
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between items-center text-[8.5px] font-black uppercase text-slate-400 mb-1 tracking-wider">
                          <span>Agent Mobile Transfer Number</span>
                          {copiedField === 'Phone' && <span className="text-emerald-400 font-bold">✔ Copied</span>}
                        </div>
                        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between gap-1">
                          <span className="font-mono text-[12px] font-extrabold text-[#F5C400] select-all">
                            {details.phone}
                          </span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(details.phone || '', 'Phone')}
                            className="bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 py-1.5 px-2.5 rounded-lg text-[9px] font-bold transition flex items-center gap-1"
                          >
                            <Copy className="w-3 h-3" /> Copy
                          </button>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between items-center text-[8.5px] font-black uppercase text-slate-400 mb-1 tracking-wider">
                          <span>Registered Agent/Receiver Name</span>
                          {copiedField === 'Name' && <span className="text-emerald-400 font-bold font-mono">✔ Copied</span>}
                        </div>
                        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between gap-1 text-[11px] font-extrabold text-white">
                          <span className="uppercase">{details.agent}</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(details.agent || '', 'Name')}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-300 p-1.5 rounded"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                        <p className="mt-1 text-[8px] leading-relaxed text-amber-500 font-mono uppercase bg-amber-500/5 border border-amber-500/10 rounded p-1.5 flex gap-1">
                          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                          Confirm the registered receiver profile name matches EXACTLY before authorizing the pin push on your terminal!
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2.5 border-t border-slate-850/80">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="bg-slate-900 hover:bg-slate-800 text-slate-350 rounded-xl px-4 py-3 font-black border border-slate-800 flex items-center justify-center transition hover:text-white"
                      title="Back to Gateway Methods"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => setStep(3)}
                      className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black uppercase tracking-wider text-[11px] py-3 px-5 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition shadow-[0_4px_16px_rgba(16,185,129,0.35)]"
                    >
                      <span>I Have Transferred</span>
                      <ArrowRight className="w-4 h-4 text-slate-950 stroke-[3]" />
                    </button>
                  </div>
                </div>
              )}

              {/* --- STAGE 3: UPLOAD PHOTO OF RECEIPT --- */}
              {step === 3 && (
                <form onSubmit={handleSubmitProof} className="space-y-3.5 animate-fade-in text-xs">
                  <div className="bg-slate-950 border border-slate-850 p-2.5 rounded-xl text-center text-[10.5px]">
                    Plan: <span className="text-[#F5C400] font-black">{checkoutPlan.duration} (${checkoutPlan.price})</span><br />
                    Network: <span className="text-white font-bold">{details.title}</span>
                  </div>

                  <div>
                    <label className="block text-[8.5px] text-slate-450 font-black mb-1 uppercase tracking-wider">
                      {selectedMethod === 'mpesa_tz' || selectedMethod === 'mpesa_ke' 
                        ? 'Sender Registered Name & Mobile Number'
                        : selectedMethod === 'western_union'
                          ? '10-Digit MTCN (Money Transfer Control Number) or Reference No'
                          : selectedMethod === 'trc25' || selectedMethod === 'bep25'
                            ? 'Transaction Hash / TxID'
                            : 'Sender Info / Phone Number or Tx Hash'}
                    </label>
                    <input
                      type="text"
                      placeholder={selectedMethod === 'mpesa_tz' || selectedMethod === 'mpesa_ke'
                        ? 'e.g. John Doe, +255 712 345 678'
                        : selectedMethod === 'western_union'
                          ? 'e.g. 1234567890 (MTCN Code)'
                          : selectedMethod === 'trc25' || selectedMethod === 'bep25'
                            ? 'e.g. 0x8a9b1c2d3e4f56789...'
                            : 'e.g. Reference No / Sender Phone Number'}
                      required
                      value={txHashOrPhone}
                      onChange={(e) => setTxHashOrPhone(e.target.value)}
                      className="w-full bg-[#111625] border border-slate-800 focus:border-[#F5C400] outline-none rounded-xl py-2 px-3 text-xs text-white tracking-wide"
                    />

                    {/* GATEWAY-SPECIFIC INSTRUCTION WARNING BANNERS */}
                    {(selectedMethod === 'mpesa_tz' || selectedMethod === 'mpesa_ke') && (
                      <div className="mt-2 p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[10px] text-amber-400 font-bold flex items-start gap-2 leading-relaxed shadow-sm">
                        <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-400 animate-pulse" />
                        <div>
                          <span className="block font-black uppercase text-[8px] tracking-wide text-amber-300 mb-0.5">Mobile Payment Verification</span>
                          <span>Please include your <strong>Registered Sender Names</strong> (first & last name as registered on the sim) so we can manually approve your matches.</span>
                        </div>
                      </div>
                    )}

                    {selectedMethod === 'western_union' && (
                      <div className="mt-2 p-2.5 bg-purple-550/15 border border-purple-500/20 rounded-xl text-[10px] text-purple-300 font-bold flex items-start gap-2 leading-relaxed shadow-sm">
                        <AlertCircle className="w-4 h-4 flex-shrink-0 text-[#A78BFA] animate-pulse" />
                        <div>
                          <span className="block font-black uppercase text-[8px] tracking-wide text-purple-200 mb-0.5">MTCN Code Verification</span>
                          <span>Please input your authentic 10-digit <strong>MTCN (Money Transfer Control Number)</strong> code. Make sure to double check that you do not slip any digits.</span>
                        </div>
                      </div>
                    )}

                    {(selectedMethod === 'trc25' || selectedMethod === 'bep25') && (
                      <div className="mt-2 p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl text-[10px] text-blue-400 font-bold flex items-start gap-2 leading-relaxed shadow-sm">
                        <AlertCircle className="w-4 h-4 flex-shrink-0 text-blue-400 animate-pulse" />
                        <div>
                          <span className="block font-black uppercase text-[8px] tracking-wide text-blue-300 mb-0.5">Blockchain Transaction Hash</span>
                          <span>Make sure to copy and paste the official <strong>Hash / TxID</strong> of your transfer (TRC20 or BEP20) to avoid any automated delay.</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* SCREENSHOT FILE DROPArea */}
                  <div>
                    <label className="block text-[8.5px] text-slate-450 font-black mb-1 uppercase tracking-wider">
                      Upload Payment Screenshot Receipt
                    </label>
                    
                    <div className="relative border border-dashed border-slate-700/80 rounded-xl p-4 bg-slate-900/40 hover:bg-slate-900/80 transition flex flex-col items-center justify-center text-center cursor-pointer min-h-[90px]">
                      <input
                        type="file"
                        accept="image/*"
                        required
                        onChange={handleFileChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      
                      {screenshot ? (
                        <div className="space-y-2">
                          <CheckCircle className="w-6 h-6 text-emerald-400 mx-auto" />
                          <span className="block text-[10px] text-emerald-300 font-extrabold truncate max-w-[200px]">
                            {screenshotName || 'screenshot_receipt.png'}
                          </span>
                          <span className="text-[7.5px] uppercase font-mono text-slate-500 bg-slate-950 border border-slate-900 px-1.5 py-0.5 rounded">
                            Change Receipt
                          </span>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Upload className="w-6 h-6 text-slate-500 mx-auto" />
                          <span className="block text-[10px] text-slate-300 font-extrabold">Tap to Upload Receipt Screenshot</span>
                          <span className="block text-[7.5px] text-slate-500 font-mono">PNG, JPG, HEIC up to 3MB maximum</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* PREVIEW OF SCREENSHOT TO MAKE USER HAPPY */}
                  {screenshot && (
                    <div className="border border-slate-800 rounded-xl p-1.5 bg-[#07090F] overflow-hidden">
                      <p className="text-[7.5px] font-black uppercase text-slate-500 mb-1 px-0.5 tracking-wider font-mono">Proof Image Attachment Preview:</p>
                      <img 
                        src={screenshot} 
                        alt="Screenshot receipt proof" 
                        className="w-full h-16 rounded object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}

                  {validationError && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 flex items-start gap-2.5 shadow-md shadow-red-950/10" id="vip_checkout_error_banner">
                      <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-400 animate-bounce" />
                      <div className="space-y-1">
                        <span className="block font-black uppercase text-[8.5px] tracking-wider text-red-300">Submission Blocked</span>
                        <p className="text-[10px] leading-relaxed font-bold">
                          {validationError}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2.5 border-t border-slate-850/80">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="bg-slate-900 hover:bg-slate-800 text-slate-350 rounded-xl px-4 py-3 font-black border border-slate-800 flex items-center justify-center transition hover:text-white"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 bg-[#F5C400] hover:bg-[#ffe04d] text-slate-950 font-black uppercase tracking-wider py-3 px-5 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition disabled:opacity-50 cursor-pointer shadow-[0_4px_16px_rgba(245,196,0,0.35)]"
                    >
                      {isSubmitting ? (
                        <>
                          <svg className="animate-spin h-3.5 w-3.5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>Validating payment proof...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4 text-black stroke-[3]" />
                          <span>Submit Verification</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* --- STAGE 4: SUCCESS RECEIVED AWAITING --- */}
              {step === 4 && (
                <div className="space-y-4 animate-fade-in text-center py-3">
                  <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-inner shadow-emerald-500/10">
                    <CheckCircle className="w-7 h-7 stroke-[2]" />
                  </div>

                  <div>
                     <h5 className="text-slate-100 text-sm font-black uppercase tracking-tight font-heading">PAYMENT RECORDED</h5>
                     <p className="text-[10px] text-slate-400 mt-1 max-w-[250px] mx-auto leading-relaxed">
                       Your payment verification screenshot has been submitted to Cash Cow database successfully! 
                     </p>
                  </div>

                  <div className="bg-slate-950 border border-slate-850 p-3 rounded-2xl text-left space-y-1.5">
                    <div className="flex justify-between font-mono text-[9.5px]">
                      <span className="text-slate-500">Receipt Status:</span>
                      <span className="text-amber-400 font-extrabold uppercase">Pending Admin Approval</span>
                    </div>
                    <div className="flex justify-between font-mono text-[9.5px]">
                      <span className="text-slate-500">Plan Duration:</span>
                      <span className="text-slate-350 font-bold">{checkoutPlan.duration} VIP Pass</span>
                    </div>
                    <div className="flex justify-between font-mono text-[9.5px]">
                      <span className="text-slate-500">Payment Gateway:</span>
                      <span className="text-slate-350">{details.title}</span>
                    </div>
                  </div>

                  <div className="bg-slate-900/40 border border-slate-850 p-2.5 rounded-xl text-[9px] text-slate-450 text-left leading-relaxed">
                    🌟 <span className="font-bold text-slate-300">Fast Approvals Tracker:</span> Admin processes confirmations usually within 5 to 20 minutes. Once verified, Pro Package Access triggers instantly on your APK dashboard. 
                  </div>

                  <button
                    type="button"
                    onClick={closeCheckout}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase py-2.8 px-4 rounded-xl border border-slate-800 transition active:scale-95"
                  >
                    Close & Monitor Stream
                  </button>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
};
