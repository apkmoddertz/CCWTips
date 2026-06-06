import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Sparkles, 
  UserCheck, 
  ArrowRight, 
  Zap, 
  Flame, 
  CheckCircle, 
  Loader2, 
  RefreshCw, 
  Award, 
  Smartphone, 
  DollarSign, 
  Receipt 
} from 'lucide-react';

interface ApprovalItem {
  id: number;
  name: string;
  location: string;
  plan: string;
  method: string;
  price: string;
  timeAgo: string;
  refId: string;
  gateway: string;
  agent: string;
  isRealWallet: boolean;
}

interface CountryPreset {
  country: string;
  code: string;
  names: string[];
  cities: string[];
  localCurrency: string;
  rate: number;
  currencySymbol: string;
}

const COUNTRY_PRESETS: CountryPreset[] = [
  {
    country: "Tanzania",
    code: "TZ",
    names: ["Rashid M.", "Amina J.", "Fatma H.", "Juma S.", "Peter M.", "Neema K.", "Saidi A.", "Baraka Y.", "Hadija S.", "Iddi B."],
    cities: ["Zanzibar", "Dar es Salaam", "Arusha", "Mwanza", "Dodoma", "Morogoro", "Tanga", "Kahama"],
    localCurrency: "TZS",
    rate: 2605,
    currencySymbol: "TZS"
  },
  {
    country: "Kenya",
    code: "Kenya",
    names: ["Kenji T.", "Erick O.", "Hassan M.", "Grace W.", "David M.", "Mercy A.", "Samuel K.", "Faith J.", "Wanjiku N.", "Kipruto L."],
    cities: ["Nairobi", "Kisumu", "Mombasa", "Nakuru", "Eldoret", "Malindi", "Thika", "Kitale"],
    localCurrency: "KES",
    rate: 135,
    currencySymbol: "KES"
  },
  {
    country: "Uganda",
    code: "Uganda",
    names: ["Chipo O.", "Ronald L.", "Fiona N.", "Bob M.", "Joseph K.", "Babirye S.", "Kizza D.", "Nakitto F."],
    cities: ["Kampala", "Entebbe", "Gulu", "Jinja", "Mbarara", "Mbale", "Masaka"],
    localCurrency: "UGX",
    rate: 3800,
    currencySymbol: "UGX"
  },
  {
    country: "Nigeria",
    code: "Nigeria",
    names: ["Babajide O.", "Grace A.", "Chinedu E.", "Temitope A.", "Blessing I.", "Olumide S.", "Ezenwa C.", "Folake Y."],
    cities: ["Lagos", "Abuja", "Ibadan", "Port Harcourt", "Benin City", "Kaduna", "Enugu"],
    localCurrency: "NGN",
    rate: 1450,
    currencySymbol: "₦"
  },
  {
    country: "Ghana",
    code: "Ghana",
    names: ["Kofi K.", "Abena A.", "Kwame B.", "Yaw O.", "Ama S.", "Gifty E.", "Mensah T.", "Boateng P."],
    cities: ["Accra", "Kumasi", "Tamale", "Tema", "Takoradi", "Cape Coast"],
    localCurrency: "GHS",
    rate: 15.2,
    currencySymbol: "GH₵"
  },
  {
    country: "Zambia",
    code: "Zambia",
    names: ["Mutale M.", "Mwansa C.", "Chanda K.", "Mwape S.", "Mwila L.", "Bwalya J.", "Phiri D."],
    cities: ["Lusaka", "Kitwe", "Ndola", "Livingstone", "Kabwe", "Chingola"],
    localCurrency: "ZMW",
    rate: 25,
    currencySymbol: "ZMW"
  },
  {
    country: "South Africa",
    code: "ZA",
    names: ["Sibu N.", "Johan V.", "Thabo M.", "Zola D.", "Pieter K.", "Naledi S.", "Sizwe B."],
    cities: ["Johannesburg", "Cape Town", "Durban", "Pretoria", "Soweto", "East London"],
    localCurrency: "ZAR",
    rate: 18.5,
    currencySymbol: "R"
  },
  {
    country: "United Kingdom",
    code: "UK",
    names: ["Liam W.", "Oliver D.", "Jack T.", "Chloe F.", "Emma M.", "Thomas B.", "Sophie H."],
    cities: ["London", "Birmingham", "Leeds", "Glasgow", "Manchester", "Liverpool", "Bristol"],
    localCurrency: "GBP",
    rate: 0.78,
    currencySymbol: "£"
  },
  {
    country: "United States",
    code: "US",
    names: ["Austin C.", "Michael S.", "Jessica L.", "David K.", "Linda M.", "John D.", "Sarah W."],
    cities: ["Austin", "New York", "Los Angeles", "Chicago", "Houston", "Phoenix", "Philadelphia", "San Diego", "Dallas", "Miami", "Seattle"],
    localCurrency: "USD",
    rate: 1,
    currencySymbol: "$"
  },
  {
    country: "Germany",
    code: "Germany",
    names: ["Sven L.", "Hans G.", "Lukas M.", "Jonas K.", "Maximilian S.", "Leon B.", "Mia S."],
    cities: ["Berlin", "Hamburg", "Munich", "Cologne", "Frankfurt", "Düsseldorf", "Dortmund"],
    localCurrency: "EUR",
    rate: 0.92,
    currencySymbol: "€"
  },
  {
    country: "Spain",
    code: "Spain",
    names: ["Marcos R.", "Alejandro F.", "Sofia B.", "Lucia C.", "Daniel G.", "Mateo T."],
    cities: ["Madrid", "Barcelona", "Valencia", "Seville", "Zaragoza", "Malaga"],
    localCurrency: "EUR",
    rate: 0.92,
    currencySymbol: "€"
  },
  {
    country: "Sweden",
    code: "Sweden",
    names: ["Sven L.", "Astrid E.", "Erik J.", "Lars O.", "Freja M.", "Nils K."],
    cities: ["Stockholm", "Gothenburg", "Malmö", "Uppsala", "Västerås"],
    localCurrency: "EUR",
    rate: 0.92,
    currencySymbol: "€"
  },
  {
    country: "Brazil",
    code: "Brazil",
    names: ["Lucas R.", "Thiago S.", "Camila M.", "Fernanda P.", "Bruno G.", "Gabriel D.", "Juliana K."],
    cities: ["Sao Paulo", "Rio de Janeiro", "Brasilia", "Salvador", "Fortaleza", "Belo Horizonte"],
    localCurrency: "BRL",
    rate: 5.6,
    currencySymbol: "R$"
  },
  {
    country: "United Arab Emirates",
    code: "UAE",
    names: ["Hassan A.", "Mohammed K.", "Fatima S.", "Zayed M.", "Mariam B.", "Omar F."],
    cities: ["Dubai", "Abu Dhabi", "Sharjah", "Al Ain", "Ajman"],
    localCurrency: "AED",
    rate: 3.67,
    currencySymbol: "AED"
  }
];

const PLAN_PRESETS = [
  { text: "1 Day VIP Pass", priceUsd: 15 },
  { text: "1 Month VIP", priceUsd: 420 },
  { text: "3 Months VIP", priceUsd: 999 },
  { text: "5 Months VIP (Ultimate)", priceUsd: 1600 },
  { text: "6 Months VIP", priceUsd: 1800 },
  { text: "12 Months VIP (Premium Lifetime)", priceUsd: 2900 }
];

const TIME_PRESETS = [
  "Just now",
  "12 seconds ago",
  "25 seconds ago",
  "45 seconds ago",
  "1 minute ago",
  "2 minutes ago",
  "3 minutes ago",
  "5 minutes ago",
  "7 minutes ago",
  "10 minutes ago",
  "12 minutes ago",
  "15 minutes ago",
  "18 minutes ago",
  "25 minutes ago",
  "32 minutes ago",
  "45 minutes ago",
  "1 hour ago"
];

function buildApprovals(): ApprovalItem[] {
  const approvals: ApprovalItem[] = [];
  
  for (let i = 0; i < 150; i++) {
    // Choose dynamic plans matching the pricing slider structure in VIPPlans.tsx - heavily biased to 1 Day, sometimes 1 Month or 5 Months
    const planIndexDist = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 3];
    const planPreset = PLAN_PRESETS[planIndexDist[(i * 9 + 4) % planIndexDist.length]];
    const plan = planPreset.text;
    const usdVal = planPreset.priceUsd;
    
    // Choose one of the 5 requested payment methods round-robin 
    // 0: USDT (TRC-20)
    // 1: USDT (BEP-20)
    // 2: Western Union (Bank Pick-Up)
    // 3: M-PESA Tanzania Agent
    // 4: M-PESA Kenya Agent
    const methodIndex = (i * 7) % 5;
    
    let method = "";
    let gateway = "";
    let agent = "";
    let priceText = "";
    let isRealWallet = false;
    let countryPreset: CountryPreset;
    
    if (methodIndex === 3) {
      // M-PESA Tanzania Agent
      countryPreset = COUNTRY_PRESETS[0]; // Tanzania
      method = "M-PESA Tanzania Agent";
      gateway = "Vodacom Tanzania Pay-Out Gateway";
      agent = "Zainabu Abdallah";
      isRealWallet = true;
      const localVal = Math.round(usdVal * 2605);
      priceText = `${localVal.toLocaleString()} TZS ($${usdVal})`;
    } else if (methodIndex === 4) {
      // M-PESA Kenya Agent
      countryPreset = COUNTRY_PRESETS[1]; // Kenya
      method = "M-PESA Kenya Agent";
      gateway = "Safaricom Daraja API Push Gateway";
      agent = "TINGA NAYUNGU";
      isRealWallet = true;
      const localVal = Math.round(usdVal * 135);
      priceText = `${localVal.toLocaleString()} KES ($${usdVal})`;
    } else if (methodIndex === 0) {
      // USDT (TRC-20) [FAST]
      const globalCountries = COUNTRY_PRESETS.filter(c => c.code !== "TZ" && c.code !== "Kenya");
      countryPreset = globalCountries[i % globalCountries.length];
      method = "USDT (TRC-20) [FAST]";
      gateway = "TRON Network Ledger Sync Node";
      agent = "System Blockchain Address";
      isRealWallet = false;
      priceText = `${usdVal.toLocaleString()} USDT`;
    } else if (methodIndex === 1) {
      // USDT (BEP-20) [LOW FEE]
      const globalCountries = COUNTRY_PRESETS.filter(c => c.code !== "TZ" && c.code !== "Kenya");
      countryPreset = globalCountries[(i + 3) % globalCountries.length];
      method = "USDT (BEP-20) [LOW FEE]";
      gateway = "BSC Settlement Smart Contract";
      agent = "System Blockchain Address";
      isRealWallet = false;
      priceText = `${usdVal.toLocaleString()} USDT`;
    } else {
      // Western Union (Bank Pick-Up) [GLOBAL]
      const globalCountries = COUNTRY_PRESETS.filter(c => c.code !== "TZ" && c.code !== "Kenya");
      countryPreset = globalCountries[(i + 7) % globalCountries.length];
      method = "Western Union (Bank Pick-Up) [GLOBAL]";
      gateway = "Western Union Payout Verification";
      agent = "Peter J Mganila";
      isRealWallet = false;
      
      if (countryPreset.localCurrency === "USD") {
        priceText = `$${usdVal.toLocaleString()} USD`;
      } else {
        const localVal = Math.round(usdVal * countryPreset.rate);
        const symbol = countryPreset.currencySymbol;
        priceText = `$${usdVal.toLocaleString()} USD (≈ ${symbol}${localVal.toLocaleString()})`;
      }
    }
    
    const name = countryPreset.names[Math.floor((i * 13 + 3) % countryPreset.names.length)];
    const city = countryPreset.cities[Math.floor((i * 19 + 7) % countryPreset.cities.length)];
    const location = `${city}, ${countryPreset.code}`;
    
    let refId = '';
    if (method.includes("M-PESA")) {
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      let code = '';
      for (let j = 0; j < 8; j++) {
        code += chars[(i * 13 + j * 7) % chars.length];
      }
      refId = `TXMP-${code}`;
    } else if (method.includes("USDT")) {
      const chars = "0123456789abcdef";
      let hash = '0x';
      for (let j = 0; j < 12; j++) {
        hash += chars[(i * 17 + j * 11) % chars.length];
      }
      refId = `${hash}...${chars[(i * 23) % chars.length]}${chars[(i * 29) % chars.length]}`;
    } else {
      const num = Math.floor(10000000 + (i * 1634567) % 90000000);
      refId = `MTCN: ${num}`;
    }
    
    const timeAgo = TIME_PRESETS[i % TIME_PRESETS.length];
    
    approvals.push({
      id: i + 1,
      name,
      location,
      plan,
      method,
      price: priceText,
      timeAgo,
      refId,
      gateway,
      agent,
      isRealWallet
    });
  }
  
  return approvals;
}

const LIVE_APPROVALS = buildApprovals();

interface VipApprovalsTickerProps {
  onUnlockVip: () => void;
  isUnlocked: boolean;
  hasPendingVipMatches: boolean;
  hasLiveVipMatches: boolean;
}

export const VipApprovalsTicker: React.FC<VipApprovalsTickerProps> = ({ 
  onUnlockVip, 
  isUnlocked,
  hasPendingVipMatches,
  hasLiveVipMatches
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [verifyingState, setVerifyingState] = useState<'verifying' | 'success'>('success');
  const [animate, setAnimate] = useState(true);

  // Slow queue rotation: switches every 18 seconds to look authentically checked and verified
  useEffect(() => {
    if (isUnlocked || !hasPendingVipMatches || hasLiveVipMatches) return;

    const interval = setInterval(() => {
      // Step A: animate out
      setAnimate(false);
      
      setTimeout(() => {
        // Step B: Choose next transaction
        setCurrentIndex((prev) => (prev + 1) % LIVE_APPROVALS.length);
        // Step C: Put into a simulated pending verification scan
        setVerifyingState('verifying');
        setAnimate(true);

        // Step D: After 1.8 seconds of scanning the ledger statement, confirm with a green tick!
        setTimeout(() => {
          setVerifyingState('success');
        }, 1800);

      }, 400);

    }, 18000); // 18 seconds interval (reduced rate speed for maximum reliability & realism)

    return () => clearInterval(interval);
  }, [isUnlocked, hasPendingVipMatches, hasLiveVipMatches]);

  if (isUnlocked || !hasPendingVipMatches || hasLiveVipMatches) return null;

  const current = LIVE_APPROVALS[currentIndex];

  // Helper colors for the different payment channels
  const getBadgeColors = (method: string) => {
    const m = method.toLowerCase();
    if (m.includes('kenya') || m.includes('ghana') || m.includes('uganda') || m.includes('zambia') || m.includes('momo') || m.includes('opay') || m.includes('palmpay')) {
      return {
        bg: 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400',
        dot: 'bg-emerald-500',
        glow: 'shadow-[0_0_15px_rgba(16,185,129,0.15)]'
      };
    }
    if (m.includes('tanzania') || m.includes('tigo') || m.includes('airtel')) {
      return {
        bg: 'bg-rose-950/20 border-rose-500/30 text-rose-400',
        dot: 'bg-rose-500',
        glow: 'shadow-[0_0_15px_rgba(244,63,94,0.12)]'
      };
    }
    if (m.includes('usdt')) {
      return {
        bg: 'bg-teal-950/30 border-teal-500/30 text-teal-400',
        dot: 'bg-teal-400',
        glow: 'shadow-[0_0_15px_rgba(20,184,166,0.12)]'
      };
    }
    if (m.includes('pix') || m.includes('sepa') || m.includes('eft') || m.includes('visa') || m.includes('mastercard') || m.includes('bank')) {
      return {
        bg: 'bg-blue-950/30 border-blue-500/30 text-blue-400',
        dot: 'bg-blue-400',
        glow: 'shadow-[0_0_15px_rgba(59,130,246,0.12)]'
      };
    }
    return {
      bg: 'bg-amber-950/30 border-amber-500/30 text-amber-400',
      dot: 'bg-[#F5C400]',
      glow: 'shadow-[0_0_15px_rgba(245,196,0,0.12)]'
    };
  };

  const styleConfig = getBadgeColors(current.method);

  return (
    <div className="mt-8 mb-4 max-w-md mx-auto px-1 select-none" id="live_approvals_ticker_container">
      {/* Centered Automated Clearing Stream Active Badge */}
      <div className="flex items-center justify-center gap-1.5 mb-2.5">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span className="text-[9px] font-mono text-slate-400 font-extrabold uppercase tracking-widest">
          LIVE VIP APPROVALS HAPPENING NOW
        </span>
      </div>

      {/* Main Alert Card */}
      <div className="relative overflow-hidden bg-gradient-to-b from-[#101423] to-[#060912] border border-slate-800 rounded-2xl p-4 shadow-[0_15px_35px_rgba(0,0,0,0.7)] transition-all duration-300">
        
        {/* Glowing visual indicators */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-[#F5C400]/4 rounded-full blur-xl pointer-events-none" />

        <div className={`transition-all duration-500 transform ${animate ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-1.5 scale-98'}`}>
          <div className="flex items-start gap-4">
            
            {/* Status Icon Panel */}
            <div className={`relative flex-shrink-0 w-12 h-12 rounded-xl bg-slate-900 border flex flex-col items-center justify-center transition-all duration-300 ${styleConfig.glow} ${
              verifyingState === 'verifying' ? 'border-amber-500/40 bg-amber-950/10' : 'border-emerald-500/40 bg-emerald-950/15'
            }`}>
              {verifyingState === 'verifying' ? (
                <RefreshCw className="w-5 h-5 text-amber-400 animate-spin" />
              ) : (
                <UserCheck className="w-5 h-5 text-emerald-400" />
              )}

              {/* Verified pill */}
              <div className="absolute -top-1 -right-1 w-4.5 h-4.5 rounded-full border border-slate-950 flex items-center justify-center bg-slate-900">
                {verifyingState === 'verifying' ? (
                  <Loader2 className="w-3 h-3 text-amber-400 animate-spin" />
                ) : (
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-450 fill-emerald-500/20" />
                )}
              </div>
              
              <span className={`text-[7px] font-mono font-black uppercase mt-0.5 tracking-wider ${
                verifyingState === 'verifying' ? 'text-amber-400' : 'text-emerald-400'
              }`}>
                {verifyingState === 'verifying' ? 'sync' : 'verified'}
              </span>
            </div>

            {/* Content Segment */}
            <div className="flex-1 min-w-0">
              
              {/* Row 1: Name, Location Badge, active label */}
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="text-xs font-black text-white flex items-center gap-1.5">
                  {current.name}
                  <span className="text-[8.5px] font-bold text-slate-350 bg-slate-900 border border-slate-800/80 px-2 py-0.2 rounded-md">
                    {current.location}
                  </span>
                </span>

                <span className={`text-[8.5px] font-mono font-extrabold shrink-0 border px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-1 transition-all ${
                  verifyingState === 'verifying'
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                    : 'bg-emerald-500/10 border-emerald-500/35 text-emerald-400'
                }`}>
                  <span className={`w-1 h-1 rounded-full ${verifyingState === 'verifying' ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400 animate-ping'}`}></span>
                  {verifyingState === 'verifying' ? 'VERIFYING PAYMENT...' : 'LIVE ACTIVATED NOW'}
                </span>
              </div>

              {/* Dynamic body based on verification state */}
              {verifyingState === 'verifying' ? (
                <div className="space-y-1.5 py-1">
                  <div className="text-[10.5px] text-amber-400 font-mono font-bold animate-pulse flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    LIVE VIP APPROVALS HAPPENING NOW: CONFIRMING PAYMENT...
                  </div>
                  <div className="text-[9px] text-slate-450 font-mono leading-tight">
                    Confirming incoming {current.method} payment ledger statement check. Paying users are automatically approved and verified now!
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {/* Real package purchase description */}
                  <p className="text-[11.5px] text-slate-205 leading-relaxed font-sans font-medium">
                    Unlocked <span className="text-amber-400 font-extrabold">{current.plan}</span> instantly. Transferred <span className="text-white font-extrabold">{current.price}</span> to agent <strong className="text-emerald-400 underline decoration-emerald-500/40 decoration-wavy">{current.agent}</strong>.
                  </p>

                  {/* Fully authentic looking transaction details block */}
                  <div className="bg-slate-950/80 rounded-xl p-2.5 mt-1 border border-slate-900 flex flex-col gap-1 font-mono text-[9px] text-slate-400">
                    <div className="flex justify-between items-center text-slate-450 border-b border-slate-900/60 pb-1 mb-1">
                      <span>VERIFIED TARGET:</span>
                      <span className="text-slate-300 font-semibold">{current.method} Gateway</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-450">
                      <span>SYSTEM GATEWAY:</span>
                      <span className="text-slate-300 text-[8.5px]">{current.gateway}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>ACCOUNT TRACE:</span>
                      <span className="text-emerald-400/90 font-bold">{current.agent}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>RECEIPT TRANSACTION REF:</span>
                      <span className="text-[#F5C400] font-bold tracking-tight select-all bg-[#F5C400]/10 px-1 py-0.2 rounded border border-[#F5C400]/15">{current.refId}</span>
                    </div>
                    <div className="flex justify-between items-center text-[8.5px] border-t border-slate-900/60 pt-1 mt-1 font-sans">
                      <span>SYSTEM STATUS:</span>
                      <span className="text-emerald-400 font-black flex items-center gap-1">
                        <CheckCircle className="w-3 h-3 text-emerald-400" /> PRO MEMBERSHIP SYNCED SUCCESSFULLY
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Cost & Timestamp bar */}
              <div className="flex items-center justify-between mt-3 pt-1 border-t border-slate-900/80">
                <span className="text-xs font-mono font-black text-emerald-400 flex items-center gap-1">
                  <Receipt className="w-3.5 h-3.5" />
                  {current.price}
                </span>
                <span className="text-[9.5px] font-mono text-slate-500 font-bold flex items-center gap-1">
                  <RefreshCw className="w-3 h-3" />
                  Processed {current.timeAgo}
                </span>
              </div>

            </div>
          </div>
        </div>

        {/* Dynamic loading progress bar that fills when verifying */}
        <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-slate-900 overflow-hidden">
          <div className={`h-full bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-500 rounded-full transition-all duration-[1800ms] ${
            verifyingState === 'verifying' ? 'w-0' : 'w-full'
          }`} />
        </div>
      </div>

      {/* Highly persuasive interactive Call To Action (Pulsing) */}
      <button 
        type="button"
        onClick={onUnlockVip}
        className="w-full mt-3 group/ticker relative overflow-hidden bg-gradient-to-r from-amber-500 via-[#F5C400] to-yellow-500 hover:from-amber-600 hover:to-yellow-600 active:scale-[0.98] text-slate-950 font-black text-[11.5px] tracking-wider py-2.8 px-4 rounded-xl uppercase transition-all duration-300 shadow-lg shadow-black/40 flex items-center justify-center gap-1.5 cursor-pointer"
      >
         <Flame className="w-4 h-4 animate-pulse text-red-700 fill-red-650" />
         <span>Pay and Get Verified Now! Instant Access</span>
         <ArrowRight className="w-3.5 h-3.5 group-hover/ticker:translate-x-1 transition-transform font-bold" />
       </button>
    </div>
  );
};
