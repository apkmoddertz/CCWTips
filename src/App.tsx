/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { MatchTip, VIPPlan, DateItem } from './types';
import { INITIAL_DATES, INITIAL_MATCHES, PLANS } from './data';
import { Header } from './components/Header';
import { DateSelector } from './components/DateSelector';
import { MatchCard } from './components/MatchCard';
import { VIPPlans } from './components/VIPPlans';
import { AdminPanel } from './components/AdminPanel';
import { Notification } from './components/Notification';
import { VipCountdown, getEATExpirationTimestamp, getEATMatchKickoffTimestamp } from './components/VipCountdown';
import { Lock, Sparkles, TrendingUp, Info, ShieldAlert, Zap, Send, Loader2, Plus } from 'lucide-react';

// Firebase core integration
import { 
  auth, 
  db, 
  seedMatchesIfEmpty, 
  restoreScreenshotMatches,
  dbAddMatch, 
  dbUpdateMatch, 
  dbDeleteMatch, 
  updateUserVipStatus, 
  fetchUserProfile, 
  createUserProfile,
  updateUserRole
} from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, onSnapshot, query, orderBy, limit, doc, updateDoc, setDoc, getDocs } from 'firebase/firestore';
import { AuthForm } from './components/AuthForm';
import { UserProfile } from './components/UserProfile';
import { VipApprovalsTicker } from './components/VipApprovalsTicker';
import { registerPushNotifications, removePushNotificationListeners } from './utils/pushNotifications';

// --- DAR ES SALAAM (EAST AFRICA TIME, UTC+3) CALENDAR UTILITIES ---
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];
const DAY_NAMES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

// Returns Date shifted to EAT (UTC+3) representation
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

// Dynamically generate complete DateItem list around EAT Today & any specific match dates
const getCalendarDates = (matchesList: MatchTip[]): DateItem[] => {
  const datesMap = new Map<string, DateItem>();
  const today = new Date();

  // Core range: -3 to +8 EAT days relative to current date (inclusive timeline layout)
  for (let i = -3; i <= 8; i++) {
    const d = new Date();
    d.setDate(today.getDate() + i);
    const eatDate = getEATDate(d);
    
    const yyyy = eatDate.getFullYear();
    const mm = String(eatDate.getMonth() + 1).padStart(2, '0');
    const dd = String(eatDate.getDate()).padStart(2, '0');
    const id = `${yyyy}-${mm}-${dd}`;
    
    datesMap.set(id, {
      id,
      month: MONTH_NAMES[eatDate.getMonth()],
      dayName: DAY_NAMES[eatDate.getDay()],
      dayNumber: dd,
    });
  }

  // Also overlay custom date parameters from custom matches to avoid truncation
  matchesList.forEach((m) => {
    if (m.dateId && !datesMap.has(m.dateId)) {
      const parts = m.dateId.split('-').map(Number);
      if (parts.length === 3) {
        const [y, mNum, dNum] = parts;
        const utcDate = new Date(Date.UTC(y, mNum - 1, dNum));
        datesMap.set(m.dateId, {
          id: m.dateId,
          month: MONTH_NAMES[utcDate.getUTCMonth()],
          dayName: DAY_NAMES[utcDate.getUTCDay()],
          dayNumber: String(dNum).padStart(2, '0'),
        });
      }
    }
  });

  return Array.from(datesMap.values()).sort((a, b) => a.id.localeCompare(b.id));
};

// --- HIGH-TECH PREMIUM LINEUP ANALYZER EFFECT FOR EMPTY STATE ---
const LineupAnalyzerEffect = () => {
  return (
    <div className="relative overflow-hidden w-full bg-gradient-to-b from-[#0D1222]/40 to-[#060914]/60 border border-[#1E2538]/40 rounded-[28px] p-12 text-center shadow-xl flex flex-col items-center justify-center min-h-[280px]">
      {/* Absolute center rotating glowing gold loaders */}
      <div className="relative w-16 h-16 flex items-center justify-center">
        {/* Pulsing golden base aura */}
        <div className="absolute inset-0 rounded-full bg-[#F5C400]/5 border border-[#F5C400]/15 animate-pulse"></div>
        {/* Rapid inner spinning loader ring */}
        <div className="absolute inset-1 rounded-full border border-dashed border-[#F5C400]/25 animate-spin" style={{ animationDuration: '3s' }}></div>
        {/* Solid active golden accent rotater ring */}
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#F5C400] animate-spin"></div>
        {/* Center glowing golden beacon dot */}
        <div className="relative w-7 h-7 rounded-full bg-[#070A14] border border-[#1E2538] flex items-center justify-center">
          <div className="w-2.5 h-2.5 rounded-full bg-[#F5C400] shadow-[0_0_8px_#F5C400] animate-ping"></div>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  // Core Application States
  const [activeTab, setActiveTab] = useState<'free' | 'vip' | 'plans' | 'profile'>('free');
  const [selectedDateId, setSelectedDateId] = useState<string>(() => getTodayInEATString());
  const [matches, setMatches] = useState<MatchTip[]>([]);
  const [matchesLoading, setMatchesLoading] = useState<boolean>(true);
  const [dates, setDates] = useState<DateItem[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  // Followed predictions state tracking per user profile UID
  const [followedTipIds, setFollowedTipIds] = useState<string[]>([]);
  
  // Confetti Simulation State after completing a simulated payment
  const [showConfetti, setShowConfetti] = useState<boolean>(false);

  // Authenticated User States
  const [currentUser, setCurrentUser] = useState<{ 
    uid: string; 
    email: string; 
    role: 'user' | 'admin'; 
    isVip: boolean; 
    username?: string;
    vipStartDate?: string;
    vipEndDate?: string;
    country?: string;
    city?: string;
  } | null>(() => {
    try {
      const cachedLastUid = localStorage.getItem('last_logged_in_uid');
      if (cachedLastUid) {
        const cachedProfile = localStorage.getItem(`cached_profile_${cachedLastUid}`);
        if (cachedProfile) {
          const parsed = JSON.parse(cachedProfile);
          if (parsed && parsed.uid) {
            return parsed;
          }
        }
      }
    } catch (e) {
      // ignore
    }
    return null;
  });
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [splashImageError, setSplashImageError] = useState<boolean>(false);
  const [splashProgress, setSplashProgress] = useState<number>(0);
  const [splashText, setSplashText] = useState<string>("BOOTING SECURE CORE SHELL...");
  const [showSplash, setShowSplash] = useState<boolean>(true);
  const [adminPerspective, setAdminPerspective] = useState<'admin' | 'user'>('admin');
  const [adminPanelTab, setAdminPanelTab] = useState<'add' | 'settings' | 'users'>('add');
  const [isApprovalsTickerOn, setIsApprovalsTickerOn] = useState<boolean>(true);

  // Tick state to trigger live lock updates exactly at midnight Tanzania local time
  const [currentTickTime, setCurrentTickTime] = useState(Date.now());
  const [currentEATTodayString, setCurrentEATTodayString] = useState(() => getTodayInEATString());

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setCurrentTickTime(now);
      
      const eatToday = getTodayInEATString();
      if (eatToday !== currentEATTodayString) {
        // Midnight EAT (Tanzania Dar Es Salaam) has kicked in!
        setCurrentEATTodayString(eatToday);
        setSelectedDateId(eatToday);
        showToast("📅 A new premium betting day has automatically started! Today: " + eatToday, "success");
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [currentEATTodayString]);

  // APK Splash Loading Orchestration: animated/progressing over exactly 3 seconds (3000ms)
  useEffect(() => {
    const startTime = Date.now();
    const duration = 3000; // 3 seconds total

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(Math.round((elapsed / duration) * 100), 100);
      setSplashProgress(progress);

      if (progress < 15) {
        setSplashText("INITIALIZING APK RESOURCE DECK...");
      } else if (progress < 30) {
        setSplashText("ESTABLISHING ENCRYPTED DATALINK...");
      } else if (progress < 45) {
        setSplashText("DOWNLOADING TODAY'S EXPERT BET PREDICTIONS...");
      } else if (progress < 65) {
        setSplashText("SYNCHRONIZING VERIFIED DEPOSITS & CODES...");
      } else if (progress < 85) {
        setSplashText("FETCHING SECURE CLOUD GATEWAY STATUS...");
      } else if (progress < 100) {
        setSplashText("VERIFYING LOCAL SYSTEM INTEGRITY...");
      } else {
        setSplashText("VASH COW: CASH COW VIP IS ONLINE!");
      }

      if (progress >= 100) {
        clearInterval(interval);
      }
    }, 30); // update every 30ms for buttery-smooth performance progress rendering

    return () => clearInterval(interval);
  }, []);

  // Guarantee splash stays on screen until both Simulated Progress is 100% AND Firebase auth completes
  useEffect(() => {
    if (!authLoading && splashProgress >= 100) {
      const timer = setTimeout(() => {
        setShowSplash(false);
      }, 450); // micro-delay for realistic fade outcome
      return () => clearTimeout(timer);
    }
  }, [authLoading, splashProgress]);

  // Unconditional fallback timer to guarantee splash screen disappears and app boots even under heavy network latency
  useEffect(() => {
    const backupTimer = setTimeout(() => {
      setSplashProgress(100);
      setAuthLoading(false);
      setShowSplash(false);
    }, 4500); // 4.5 seconds maximum splash duration guard
    return () => clearTimeout(backupTimer);
  }, []);

  // APK Experience Guard: block any copy/highlight/right-click/drag selection globally
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
        e.preventDefault();
      }
    };

    const handleCopy = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
        e.preventDefault();
      }
    };

    const handleSelectStart = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
        e.preventDefault();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;
      if (!isInput && isCmdOrCtrl && (e.key === 'c' || e.key === 'C' || e.key === 'a' || e.key === 'A' || e.key === 's' || e.key === 'S')) {
        e.preventDefault();
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('selectstart', handleSelectStart);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('selectstart', handleSelectStart);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Derived VIP lock state considering Tanzania EAT midnight expiration
  const isUnlocked = (() => {
    if (!currentUser) return false;
    if (currentUser.role === 'admin' && adminPerspective === 'admin') return true;
    if (!currentUser.isVip) return false;
    if (!currentUser.vipEndDate) return false;
    
    const expirationTime = getEATExpirationTimestamp(currentUser.vipEndDate);
    return currentTickTime < expirationTime;
  })();

  // Check if there are any live VIP matches currently in play
  const hasLiveVipMatches = (() => {
    return matches.some(m => {
      if (m.type !== 'vip' || m.status !== 'pending') return false;
      const kickoff = getEATMatchKickoffTimestamp(m.dateId, m.time);
      return kickoff > 0 && currentTickTime >= kickoff && currentTickTime < kickoff + (90 * 60 * 1000);
    });
  })();

  // Check if a specific match date is unlocked for the current VIP subscription
  const isMatchDateUnlockedForUser = (matchDateId: string): boolean => {
    if (currentUser?.role === 'admin' && adminPerspective === 'admin') {
      return true;
    }
    if (currentUser?.isVip === true) {
      const today = getTodayInEATString();
      const startDate = currentUser.vipStartDate || today;
      const endDate = currentUser.vipEndDate || today;
      
      if (matchDateId >= startDate && matchDateId <= endDate) {
        const expirationTime = getEATExpirationTimestamp(endDate);
        if (currentTickTime < expirationTime) {
          return true;
        }
      }
    }
    return false;
  };

  // Is Admin actively showing edit views / panel controls
  const isAdminActive = currentUser?.role === 'admin' && adminPerspective === 'admin';

  // Sync tracked tips on login or swap
  useEffect(() => {
    if (currentUser) {
      const stored = localStorage.getItem(`followed_tips_${currentUser.uid}`);
      if (stored) {
        try {
          setFollowedTipIds(JSON.parse(stored));
        } catch (err) {
          console.error("Failed to parse followed logs from storage:", err);
          setFollowedTipIds([]);
        }
      } else {
        setFollowedTipIds([]);
      }
    } else {
      setFollowedTipIds([]);
    }
  }, [currentUser]);

  // Add/remove match from tracker list
  const handleToggleFollowTip = (matchId: string) => {
    if (!currentUser) return;
    setFollowedTipIds((prev) => {
      const next = prev.includes(matchId) 
        ? prev.filter((id) => id !== matchId) 
        : [...prev, matchId];
      localStorage.setItem(`followed_tips_${currentUser.uid}`, JSON.stringify(next));
      
      const isNowFollowing = next.includes(matchId);
      if (isNowFollowing) {
        showToast("Match prediction added to your profile tracker!", "success");
      } else {
        showToast("Match prediction removed from tracker.", "info");
      }
      return next;
    });
  };

  // Update profile username on database
  const handleUpdateUsername = async (newUsername: string) => {
    if (!currentUser) return;
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, { username: newUsername });
      setCurrentUser(prev => prev ? { ...prev, username: newUsername } : null);
      showToast('Username synchronized successfully!', 'success');
    } catch (error) {
      console.error("Failed to update user profile username on Firestore:", error);
      showToast('Could not save username to server database.', 'info');
    }
  };

  // Update profile country and city on database
  const handleUpdateLocation = async (country: string, city: string) => {
    if (!currentUser) return;
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, { country, city });
      setCurrentUser(prev => prev ? { ...prev, country, city } : null);
      showToast('Profile location updated successfully!', 'success');
    } catch (error) {
      console.error("Failed to update user profile location on Firestore:", error);
      showToast('Could not save country and city to server database.', 'info');
    }
  };

  // Auth Session Subscriptions
  useEffect(() => {
    let unsubUser: (() => void) | null = null;
    
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      try {
        if (unsubUser) {
          unsubUser();
          unsubUser = null;
        }

        if (fbUser) {
          localStorage.setItem('last_logged_in_uid', fbUser.uid);
          localStorage.setItem('is_authenticated_persist', 'true');
          const emailLower = fbUser.email?.toLowerCase() || '';
          const isAdminEmail = emailLower === 'ngimbabetwin@gmail.com' || emailLower === 'jilalamasanja1998@gmail.com';
          
          let initialProfile: any = null;
          const cached = localStorage.getItem(`cached_profile_${fbUser.uid}`);
          if (cached) {
            try {
              initialProfile = JSON.parse(cached);
            } catch (e) {
              // ignore
            }
          }
          
          if (!initialProfile) {
            // Setup a zero-latency temporary user structure to immediately solve the splash block
            initialProfile = {
              uid: fbUser.uid,
              email: fbUser.email || '',
              role: isAdminEmail ? 'admin' : 'user',
              isVip: false,
              username: '',
              vipStartDate: '',
              vipEndDate: '',
              country: '',
              city: ''
            };
          }

          // Instantly set current user state to bypass any splash screen blockage
          setCurrentUser({
            uid: fbUser.uid,
            email: fbUser.email || '',
            role: initialProfile?.role || 'user',
            isVip: !!initialProfile?.isVip,
            username: initialProfile?.username || '',
            vipStartDate: initialProfile?.vipStartDate || '',
            vipEndDate: initialProfile?.vipEndDate || '',
            country: initialProfile?.country || '',
            city: initialProfile?.city || ''
          });
          
          setActiveTab('free'); // Default Redirect to Free Tips Tab
          if (initialProfile?.role === 'admin') {
            setAdminPerspective('admin');
          }
          
          // Unblock splash loader immediately since we have established our session profile
          setAuthLoading(false);

          // Now fetch the online state of the profile asynchronously in the background.
          // This ensures that the user is absolutely NEVER stuck on any network fetch timeouts during init.
          const syncUserProfile = async () => {
            try {
              let onlineProfile = await fetchUserProfile(fbUser.uid);
              if (!onlineProfile) {
                onlineProfile = await createUserProfile(fbUser.uid, fbUser.email || '');
              } else if (isAdminEmail && onlineProfile.role !== 'admin') {
                await updateUserRole(fbUser.uid, 'admin');
                onlineProfile = { ...onlineProfile, role: 'admin' };
              }
              
              if (onlineProfile) {
                setCurrentUser({
                  uid: fbUser.uid,
                  email: fbUser.email || '',
                  role: onlineProfile.role || 'user',
                  isVip: !!onlineProfile.isVip,
                  username: onlineProfile.username || '',
                  vipStartDate: (onlineProfile as any).vipStartDate || '',
                  vipEndDate: (onlineProfile as any).vipEndDate || '',
                  country: onlineProfile.country || '',
                  city: onlineProfile.city || ''
                });
                if (onlineProfile.role === 'admin') {
                  setAdminPerspective('admin');
                }
                localStorage.setItem(`cached_profile_${fbUser.uid}`, JSON.stringify(onlineProfile));
              }
            } catch (bgError) {
              console.warn("Background user profile sync completed with warning:", bgError);
            }
          };

          syncUserProfile();

          // Set up real-time listener for user profile changes (VIP, role, username)
          const userRef = doc(db, 'users', fbUser.uid);
          unsubUser = onSnapshot(userRef, (snapshot) => {
            if (snapshot.exists()) {
              const data = snapshot.data();
              setCurrentUser(prev => {
                if (!prev) return null;
                
                const becameVip = !prev.isVip && data.isVip;
                if (becameVip) {
                  // Celebration loop
                  setTimeout(() => {
                    triggerConfettiFlow();
                    showToast('🌟 Pro Package Activated! Welcome aboard.', 'success');
                  }, 100);
                }
                
                const updated = {
                  uid: prev.uid,
                  email: prev.email,
                  role: data.role || 'user',
                  isVip: !!data.isVip,
                  username: data.username || '',
                  vipStartDate: data.vipStartDate || '',
                  vipEndDate: data.vipEndDate || '',
                  country: data.country || '',
                  city: data.city || ''
                };

                try {
                  localStorage.setItem(`cached_profile_${fbUser.uid}`, JSON.stringify(updated));
                } catch (e) {}

                return updated;
              });
            }
          }, (error) => {
            console.warn("User profile live snapshot offline or limited network:", error);
          });
        } else {
          const isPersisted = localStorage.getItem('is_authenticated_persist') === 'true';
          const cachedLastUid = localStorage.getItem('last_logged_in_uid');
          
          if (isPersisted && cachedLastUid) {
            // Keep using the cached session rather than kicking the user out due to temporary browser session drops
            setAuthLoading(false);
          } else {
            setCurrentUser(null);
            setAuthLoading(false); // Also unblock loading state when user is signed out
            localStorage.removeItem('last_logged_in_uid');
            localStorage.removeItem('is_authenticated_persist');
          }
        }
      } catch (err) {
        console.error("Critical issue inside auth state listener logic:", err);
        setAuthLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (unsubUser) unsubUser();
    };
  }, []);

  // Set up Firebase Cloud Messaging push notifications for authenticated users
  useEffect(() => {
    if (currentUser?.uid) {
      registerPushNotifications(
        currentUser.uid,
        (notification) => {
          const title = notification.title || 'Notification';
          const body = notification.body || 'New predictions published!';
          showToast(`🔔 ${title}: ${body}`, 'success');
        },
        (notification) => {
          console.log('[FCM] Notification clicked / opened:', notification);
          // Gently route user based on push target references or presence of VIP
          if (notification.data?.tab) {
            setActiveTab(notification.data.tab);
          } else if (notification.body?.toLowerCase().includes('vip')) {
            setActiveTab('vip');
          } else {
            setActiveTab('free');
          }
        }
      );
    } else {
      removePushNotificationListeners();
    }
  }, [currentUser?.uid]);

  // Listen to Firestore match predictions list inside real-time snapshot channel
  useEffect(() => {
    if (authLoading || !currentUser) {
      return;
    }

    // No automatic background seeding of matches on boot to preserve a pristine database for live users.

    setMatchesLoading(true);
    const q = collection(db, 'matches');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const dbMatches: MatchTip[] = [];
      snapshot.forEach((doc) => {
        const item = doc.data() as MatchTip;
        dbMatches.push({
          ...item,
          id: item.id || doc.id
        });
      });

      setMatches(dbMatches);
      try {
        localStorage.setItem('cached_matches_list', JSON.stringify(dbMatches));
      } catch (e) {}
      setMatchesLoading(false);
    }, (error) => {
      console.warn("Firestore read snapshot warning under offline environment:", error);
      const cached = localStorage.getItem('cached_matches_list');
      if (cached) {
        try {
          setMatches(JSON.parse(cached));
        } catch (e) {}
      }
      setMatchesLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser, authLoading]);

  // Silent background auto-reload every 15 seconds to fetch new updates without interrupting the user's flow
  useEffect(() => {
    if (authLoading || !currentUser) {
      return;
    }

    const intervalId = setInterval(async () => {
      try {
        const q = collection(db, 'matches');
        const snapshot = await getDocs(q);
        const dbMatches: MatchTip[] = [];
        snapshot.forEach((doc) => {
          const item = doc.data() as MatchTip;
          dbMatches.push({
            ...item,
            id: item.id || doc.id
          });
        });

        if (dbMatches.length > 0) {
          setMatches(dbMatches);
          try {
            localStorage.setItem('cached_matches_list', JSON.stringify(dbMatches));
          } catch (e) {}
        }
      } catch (err) {
        console.warn("Silent background matches fetch failed:", err);
      }
    }, 15000); // 15 seconds

    return () => clearInterval(intervalId);
  }, [currentUser, authLoading]);

  // Synchronize global application configurations from settings/ticker document dynamically
  useEffect(() => {
    const docRef = doc(db, 'settings', 'ticker');
    const unsubscribe = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (typeof data.isApprovalsTickerOn === 'boolean') {
          setIsApprovalsTickerOn(data.isApprovalsTickerOn);
        }
      } else {
        setIsApprovalsTickerOn(true);
      }
    }, (error) => {
      console.warn("Could not load approvals ticker state, using default true:", error);
    });
    return () => unsubscribe();
  }, []);

  const handleToggleApprovalsTicker = async () => {
    try {
      const docRef = doc(db, 'settings', 'ticker');
      const newState = !isApprovalsTickerOn;
      await setDoc(docRef, { isApprovalsTickerOn: newState }, { merge: true });
      showToast(`Notification Stream switched ${newState ? 'ON' : 'OFF'}!`, 'success');
    } catch (error) {
      console.error("Error setting approvals ticker status:", error);
      showToast('Failed to update notification stream setting.', 'info');
    }
  };

  // Update dates list dynamically when matches database is loaded, modified, or today transitions past midnight local EAT time
  useEffect(() => {
    setDates(getCalendarDates(matches));
  }, [matches, currentEATTodayString]);

  // Calculate tip counts per date for selector cards
  const matchCountsMap = useMemo(() => {
    return matches.reduce((acc, m) => {
      if (m.type === (activeTab === 'vip' ? 'vip' : 'free')) {
        acc[m.dateId] = (acc[m.dateId] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);
  }, [matches, activeTab]);

  // Only display selectors for dates that actually publish match cards (satisfies empty hides clause!)
  const filteredDatesForSelector = useMemo(() => {
    return dates.filter((d) => matchCountsMap[d.id] > 0);
  }, [dates, matchCountsMap]);

  // Check if there are any pending VIP matches specifically for the current selected date
  const hasPendingVipMatches = useMemo(() => {
    return matches.some(m => m.dateId === selectedDateId && m.type === 'vip' && m.status === 'pending');
  }, [matches, selectedDateId]);

  // Reset selected date to today when switching between Free and VIP tabs
  useEffect(() => {
    if (activeTab === 'free' || activeTab === 'vip') {
      const today = getTodayInEATString();
      setSelectedDateId(today);
    }
  }, [activeTab]);

  // Dynamic selection adjustment: assure selection is always active and correct
  useEffect(() => {
    if (activeTab === 'plans' || filteredDatesForSelector.length === 0) return;

    const isCurrentValid = filteredDatesForSelector.some((d) => d.id === selectedDateId);
    if (!isCurrentValid) {
      const today = getTodayInEATString();
      const hasToday = filteredDatesForSelector.some((d) => d.id === today);
      if (hasToday) {
        setSelectedDateId(today);
      } else {
        // Find the first date strictly greater than today (closest future/next date)
        const nextDate = filteredDatesForSelector.find((d) => d.id > today);
        if (nextDate) {
          setSelectedDateId(nextDate.id);
        } else {
          // If no next date, make the latest old to be active by default (last item in sorted selector list)
          setSelectedDateId(filteredDatesForSelector[filteredDatesForSelector.length - 1].id);
        }
      }
    }
  }, [activeTab, filteredDatesForSelector, selectedDateId]);

  // Save matches to localStorage or Firestore on custom update
  const saveMatchesToStorage = async (updatedMatches: MatchTip[]) => {
    setMatches(updatedMatches);
  };

  // Switch Admin POV / role mode permissions wrapper
  const handleTogglePerspective = () => {
    const nextPOV = adminPerspective === 'admin' ? 'user' : 'admin';
    setAdminPerspective(nextPOV);
    if (nextPOV === 'admin') {
      showToast('Admin perspective simulated: Full editing access granted!', 'success');
    } else {
      showToast('Normal user perspective simulated: VIP blocks and rules active!', 'info');
    }
  };

  // Toggle Simulated subscription status on Firestore user profile
  const handleToggleUnlock = async () => {
    if (!currentUser) return;
    try {
      const nextScope = !currentUser.isVip;
      await updateUserVipStatus(currentUser.uid, nextScope);
      setCurrentUser(prev => prev ? { ...prev, isVip: nextScope } : null);
      
      if (nextScope) {
        triggerConfettiFlow();
        showToast('VIP status activated! All premium tips are now unlocked.', 'success');
      } else {
        showToast('VIP subscription deactivated. Premium tips are locked.', 'info');
      }
    } catch (err) {
      showToast('Failed to update VIP status on server.', 'info');
    }
  };

  const handleUnlockVipDirect = async () => {
    if (!currentUser) return;
    try {
      await updateUserVipStatus(currentUser.uid, true);
      setCurrentUser(prev => prev ? { ...prev, isVip: true } : null);
      triggerConfettiFlow();
      showToast('Premium Membership Unlocked!', 'success');
    } catch (err) {
      showToast('Failed to save VIP status.', 'info');
    }
  };

  // Sign out helper
  const handleSignOut = async () => {
    try {
      localStorage.removeItem('last_logged_in_uid');
      localStorage.removeItem('is_authenticated_persist');
      setCurrentUser(null);
      await signOut(auth);
      showToast('Logged out of premium APK profile.', 'info');
    } catch (err) {
      console.error('Sign Out failed:', err);
    }
  };

  // Confetti Animation Controller
  const triggerConfettiFlow = () => {
    setShowConfetti(true);
    setTimeout(() => {
      setShowConfetti(false);
    }, 5500);
  };

  // Toast System
  const showToast = (message: string, type: 'success' | 'info') => {
    setNotification({ message, type });
  };

  // Add Match from Admin Form
  const handleAddMatch = async (newMatchData: Omit<MatchTip, 'id'>) => {
    try {
      await dbAddMatch(newMatchData);
      showToast('New match prediction published securely in Firestore!', 'success');
    } catch (err) {
      showToast('Firestore Write Rejected: Unauthorized or invalid rules schema.', 'info');
    }
  };

  // Update Match Fields from client card
  const handleUpdateMatch = async (id: string, updatedFields: Partial<MatchTip>) => {
    try {
      await dbUpdateMatch(id, updatedFields);
      showToast('Match prediction synchronized with database!', 'success');
    } catch (err) {
      showToast('Failed to update: Permission denied.', 'info');
    }
  };

  // Delete Match item
  const handleDeleteMatch = async (id: string) => {
    try {
      await dbDeleteMatch(id);
      showToast('Match prediction entry retired from database.', 'info');
    } catch (err) {
      showToast('Failed to delete: Permission denied.', 'info');
    }
  };

  // Duplicate Match item
  const handleDuplicateMatch = async (match: MatchTip) => {
    try {
      const duplicatedData: Omit<MatchTip, 'id'> = {
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        time: match.time,
        prediction: match.prediction,
        odds: match.odds,
        status: match.status,
        type: match.type,
        dateId: match.dateId,
      };
      await dbAddMatch(duplicatedData);
      showToast('Match prediction duplicated successfully!', 'success');
    } catch (err) {
      showToast('Failed to duplicate match: Permission denied.', 'info');
    }
  };

  // Factory Default Reset
  const handleResetData = async () => {
    try {
      showToast('Clearing database records...', 'info');
      // Delete all current matches
      for (const m of matches) {
        await dbDeleteMatch(m.id);
      }
      // Re-seed matches list
      await seedMatchesIfEmpty(true);
      showToast('Real-time database records refreshed with screenshot listings.', 'info');
    } catch (err) {
      showToast('Reset completed! Refreshing matches list...', 'info');
    }
  };

  // Filter Match list based on Selected tab and Selected horizontal date picker, sorted chronologically ascending by kickoff time
  const visibleMatches = matches
    .filter(
      (m) => m.dateId === selectedDateId && m.type === (activeTab === 'vip' ? 'vip' : 'free')
    )
    .sort((a, b) => (a.time || '').localeCompare(b.time || ''));

  if (showSplash) {
    return (
      <div className="min-h-screen bg-[#05070F] text-slate-100 flex justify-center items-center select-none selection:bg-transparent relative">
        <div className="w-full max-w-md bg-gradient-to-b from-[#0B0F19] via-[#05070F] to-[#010206] h-screen h-[100dvh] flex flex-col justify-between items-center py-10 px-6 shadow-2xl border-x border-[#141A2E] relative overflow-hidden">
          
          {/* Animated Sports Item Edge Border Frame Overlay */}
          <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden mix-blend-normal">
            <img 
              src="https://i.ibb.co/Y7h2qkTx/file-0000000058ac71f4bbaa71cc35b469af.png" 
              alt="Sports Border" 
              className="w-full h-full object-fill scale-100 animate-splash-border"
              referrerPolicy="no-referrer"
            />
          </div>

          {/* Subtle ambient neon grids & circles */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-amber-500/5 rounded-full blur-[80px] pointer-events-none z-0"></div>
          <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 translate-y-1/2 w-80 h-80 bg-blue-500/5 rounded-full blur-[100px] pointer-events-none z-0"></div>

          {/* Top Spacer representing the clean removed header */}
          <div className="h-6 w-full z-20"></div>

          {/* Center Content: Brand Icon & Animated Title */}
          <div className="flex flex-col items-center justify-center my-auto space-y-7 w-full relative z-20">
            {/* Pulsing Mascot Logo Badge */}
            <div className="relative group animate-splash-logo">
              {/* Pulsing outer ring glow */}
              <div className="absolute -inset-3 rounded-full bg-gradient-to-r from-yellow-500 via-[#F5C400] to-amber-500 opacity-45 blur-md"></div>
              
              {/* Spin-slow golden neon outer ring */}
              <div className="absolute -inset-1.5 rounded-full bg-gradient-to-tr from-amber-500 via-[#F5C400] to-yellow-400 opacity-90 animate-spin-slow"></div>
              
              <div className="relative h-24 w-24 rounded-full overflow-hidden bg-[#0A0E1A] border-2 border-[#F5C400]/85 flex items-center justify-center shadow-2xl shadow-black/90">
                {!splashImageError ? (
                  <img
                    src="https://i.ibb.co/Lhzt1vX1/cashcowlogo.png"
                    alt="Cash Cow VIP Logo"
                    className="h-full w-full object-cover p-1 scale-105"
                    referrerPolicy="no-referrer"
                    onError={() => {
                      setSplashImageError(true);
                    }}
                  />
                ) : (
                  /* Fallback Mascot Icon if image is slow or blocked */
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-slate-950 to-slate-900 text-center p-2">
                    <span className="text-[20px] font-black text-[#F5C400] leading-none">🐮</span>
                    <span className="text-[7.5px] font-mono font-black text-[#F5C400] tracking-widest mt-0.5 uppercase font-heading">VASH COW</span>
                  </div>
                )}
              </div>
            </div>

            {/* Title Block */}
            <div className="text-center space-y-1.5">
              <h1 className="text-2xl font-black tracking-[0.2em] uppercase bg-gradient-to-r from-amber-400 via-[#F5C400] to-yellow-500 bg-clip-text text-transparent drop-shadow-md">
                CASH COW VIP
              </h1>
              <p className="text-[9.5px] text-slate-400 font-extrabold uppercase tracking-[0.3em]">
                PREMIUM SPORTS PREDICTIONS
              </p>
            </div>
          </div>

          {/* Bottom Area: Dynamic Progress Loader */}
          <div className="w-full space-y-5 relative z-20">
            
            {/* Progress Bar & Info */}
            <div className="space-y-2.5">
              <div className="flex justify-between items-end text-[9px] font-mono">
                <span className="text-amber-400 font-bold uppercase tracking-wider animate-pulse truncate max-w-[80%]">
                  {splashText}
                </span>
                <span className="text-slate-350 font-black">
                  {splashProgress}%
                </span>
              </div>
              
              {/* Outer track */}
              <div className="h-2 w-full bg-slate-900 border border-slate-800 rounded-full p-[1.5px] overflow-hidden">
                {/* Visual bar fill with transition */}
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 via-[#F5C400] to-yellow-400 shadow-[0_0_8px_rgba(245,196,0,0.5)] transition-all duration-150 ease-out"
                  style={{ width: `${splashProgress}%` }}
                ></div>
              </div>
            </div>

            {/* Small Footer Signature */}
            <div className="text-center pt-2">
              <p className="text-[8px] font-mono text-slate-600 tracking-widest uppercase">
                AUTOMATED CRYPOGRAPHIC VERIFY &bull; STABLE MATCH ENGINE
              </p>
              <p className="text-[7px] font-mono text-amber-500/40 tracking-wider uppercase mt-1">
                Vash Cow Deck &copy; 2026. Sports prediction data is highly confidential.
              </p>
            </div>

          </div>

        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#05070F] text-slate-100 flex justify-center selection:bg-[#F5C400]/40 selection:text-white">
        <div className="w-full max-w-md bg-[#0B0F19] h-screen h-[100dvh] flex flex-col justify-center shadow-2xl relative overflow-y-auto border-x border-[#1A2135] scrollbar-none">
          <AuthForm 
            onAuthSuccess={(usr) => {
              setCurrentUser(usr);
              localStorage.setItem('last_logged_in_uid', usr.uid);
              localStorage.setItem('is_authenticated_persist', 'true');
              try {
                localStorage.setItem(`cached_profile_${usr.uid}`, JSON.stringify(usr));
              } catch (e) {}
              setActiveTab('free'); // Redirect to Free Tips Tab upon login or register
            }} 
            onShowNotification={showToast} 
          />
          {notification && (
            <Notification
              message={notification.message}
              type={notification.type}
              onClose={() => setNotification(null)}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#05070F] text-slate-100 flex justify-center selection:bg-[#F5C400]/40 selection:text-white">
      
      {/* Mobile Scaffold boundaries - Fixed height resembling native APK */}
      <div className="w-full max-w-md bg-[#0B0F19] h-screen h-[100dvh] flex flex-col shadow-2xl relative overflow-hidden border-x border-[#1A2135]">
        {/* FIXED APP HEADER STRIP */}
        <div className="flex-shrink-0 bg-[#0B0F19] border-b border-[#141A2E] z-30 shadow-md shadow-[#05070F]/50">
          {/* HEADER COMPONENT */}
          <Header 
            onAdminClick={() => {
              setAdminPanelTab('settings');
              setIsAddModalOpen(true);
            }} 
            isAdminActive={isAdminActive}
            isVipActive={isUnlocked}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            userEmail={currentUser?.email}
            userRole={currentUser?.role}
            userName={currentUser?.username || ''}
            perspective={adminPerspective}
            onTogglePerspective={handleTogglePerspective}
            onSignOut={handleSignOut}
            onOpenManageUsers={() => {
              setAdminPanelTab('users');
              setIsAddModalOpen(true);
            }}
            isApprovalsTickerOn={isApprovalsTickerOn}
            onToggleApprovalsTicker={handleToggleApprovalsTicker}
          />

          {/* ADMIN CONTROL PANEL OVERLAY REMOVED IN FAVOR OF FLOATING PLUS & CLEAN MODAL ACCORDING TO USER DIRECTIVE */}

          {/* DYNAMIC SCROLLABLE DATE SELECTOR (HIDES ON PLANS OR PROFILE PAGE TO REDUCE CLUTTER) */}
          {activeTab !== 'plans' && activeTab !== 'profile' && (
            <DateSelector
              dates={filteredDatesForSelector}
              selectedDateId={selectedDateId}
              onSelectDate={setSelectedDateId}
              matchCounts={matchCountsMap}
              activeTab={activeTab}
            />
          )}
        </div>

        {/* INDEPENDENT SCROLLING GAME CONTENT LISTS */}
        <main className="flex-1 overflow-y-auto pb-12 scrollbar-none relative">
          
          {/* Static atmospheric design ambient blur glow (stays completely static relative to moving cards!) */}
          <div className="absolute inset-0 bg-[#05070F] pointer-events-none -z-10" />
          <div className="absolute top-[8%] left-1/2 -translate-x-1/2 w-[280px] h-[280px] bg-gradient-to-tr from-[#F5C400]/4 to-[#22D3EE]/2 rounded-full blur-[100px] pointer-events-none -z-10" />
          
          <div className="pt-0.5 pb-2">
            {activeTab === 'plans' ? (
              /* PLANS PAGE */
              <VIPPlans
                plans={PLANS}
                onUnlockVip={handleUnlockVipDirect}
                isUnlocked={isUnlocked}
                onShowNotification={showToast}
                currentUser={currentUser}
                hasLiveVipMatches={hasLiveVipMatches}
              />
            ) : activeTab === 'profile' && currentUser ? (
              /* MY PROFILE PAGE Dashboard */
              <UserProfile
                user={currentUser}
                onUpdateUsername={handleUpdateUsername}
                onUpdateLocation={handleUpdateLocation}
                onDirectToPlans={() => setActiveTab('plans')}
                allMatches={matches}
                followedTipIds={followedTipIds}
                onToggleFollow={handleToggleFollowTip}
                onToggleVip={handleToggleUnlock}
              />
            ) : (
              /* REGULAR PREDICTIONS LIST (FREE OR VIP LISTS) */
              <div className="px-4">
                
                {/* Category Subtitle Header */}
                <div className="flex items-center justify-between mb-3 border-b border-slate-850 pb-1.5">
                  <span className="text-[11px] font-mono font-black text-[#F5C400] uppercase tracking-widest flex items-center gap-1">
                    <span>
                      {activeTab === 'vip' ? 'Premium VIP Tips' : 'Standard Free Tips'}
                    </span>
                  </span>
                  <span className="text-[10px] bg-slate-900 border border-slate-800 text-slate-400 px-2.5 py-0.5 rounded-full font-bold">
                    {visibleMatches.length} Matches
                  </span>
                </div>

                {/* Match Tip Listing cards */}
                {matchesLoading ? (
                  <div className="space-y-3.5">
                    {[1, 2].map((i) => (
                      <div key={i} className="relative overflow-hidden bg-[#121724] border border-[#1E2538]/80 rounded-[22px] p-3.5 px-4 mb-3 shadow-md animate-pulse">
                        <div className="flex items-center justify-between mb-3">
                          <div className="h-2.5 w-24 bg-slate-800/70 rounded-full"></div>
                          <div className="h-4 w-4 bg-slate-800/70 rounded-full"></div>
                        </div>
                        <div className="flex items-center justify-between gap-2 mb-4">
                          <div className="flex-1 flex flex-col items-center">
                            <div className="w-10 h-10 bg-slate-800/70 rounded-full mb-2"></div>
                            <div className="h-3 w-20 bg-slate-800/70 rounded-full"></div>
                          </div>
                          <div className="px-3 py-1 bg-slate-800/45 rounded text-[10px] text-slate-600 font-mono font-bold uppercase select-none">VS</div>
                          <div className="flex-1 flex flex-col items-center">
                            <div className="w-10 h-10 bg-slate-800/70 rounded-full mb-2"></div>
                            <div className="h-3 w-20 bg-slate-800/70 rounded-full"></div>
                          </div>
                        </div>
                        <div className="bg-[#0b0e17] border border-slate-900 rounded-[14px] p-2.5 flex items-center justify-between gap-2.5">
                          <div className="space-y-1.5 flex-1">
                            <div className="h-2 w-12 bg-slate-800/70 rounded-full"></div>
                            <div className="h-2.5 w-28 bg-slate-800/70 rounded-full animate-pulse"></div>
                          </div>
                          <div className="h-5 w-14 bg-slate-800/70 rounded-lg"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : visibleMatches.length > 0 ? (
                  <div className="space-y-3.5">
                    {visibleMatches.map((match) => (
                      <MatchCard
                        key={match.id}
                        match={match}
                        isAdminActive={isAdminActive}
                        isVipUnlocked={isMatchDateUnlockedForUser(match.dateId)}
                        onRedirectToPlans={() => setActiveTab('plans')}
                        onUpdateMatch={handleUpdateMatch}
                        onDeleteMatch={handleDeleteMatch}
                        onDuplicateMatch={handleDuplicateMatch}
                        isFollowed={followedTipIds.includes(match.id)}
                        onToggleFollow={() => handleToggleFollowTip(match.id)}
                      />
                    ))}
                  </div>
                ) : (
                  /* No Predictions on Selected Day - Render Premium Lineup Analyzer */
                  <div className="flex flex-col gap-4" id="empty_predictions_analyzer_container">
                    <LineupAnalyzerEffect />
                    
                    {isAdminActive && (
                      <div className="text-center">
                        <span className="text-[10px] text-slate-450 bg-[#F5C400]/10 border border-[#F5C400]/25 px-3 py-1 rounded inline-block font-mono">
                          Developer: Use the panel above to insert a match card.
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Highly attractive rolling VIP approvals and purchase proof teaser alerts for non-subscribers */}
                {isApprovalsTickerOn && (
                  <VipApprovalsTicker 
                    onUnlockVip={() => setActiveTab('plans')} 
                    isUnlocked={isUnlocked} 
                    hasPendingVipMatches={hasPendingVipMatches}
                    hasLiveVipMatches={hasLiveVipMatches}
                  />
                )}
              </div>
            )}
          </div>
        </main>

        {/* BOTTOM NAV BAR FOOTER INFORMATION SLIP FOR AESTHETICS - REDESIGNED FOR TELEGRAM CONVERSIONS */}
        <footer className="flex-shrink-0 w-full bg-[#070a14] border-t border-[#141b2e] p-3 text-center z-30">
          <a
            href="go:tg"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between bg-gradient-to-r from-[#0088cc]/15 to-[#0088cc]/25 border border-[#0088cc]/40 hover:border-[#F5C400] active:scale-95 transition-all duration-200 py-2.5 px-4 rounded-xl text-xs font-black shadow-lg hover:shadow-[#0088cc]/10 cursor-pointer text-left select-none group"
          >
            <div className="flex items-center gap-2.5">
              <div className="relative flex items-center justify-center w-7 h-7 bg-[#0088cc] rounded-lg shadow-inner group-hover:scale-105 transition-transform">
                <Send className="w-3.5 h-3.5 text-white fill-white -rotate-12 translate-x-[-0.5px] translate-y-[0.5px]" />
              </div>
              <div>
                <span className="block text-[8px] font-black text-[#22D3EE] tracking-widest uppercase leading-none mb-0.5">
                  Telegram Channel
                </span>
                <span className="block text-xs font-black text-white group-hover:text-[#F5C400] transition-colors leading-none uppercase">
                  Join <span className="text-[#F5C400]">@CashCowVIP</span> Now
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-1.5 bg-[#F5C400] text-black text-[9px] font-black uppercase tracking-wider py-1.5 px-2.5 rounded-lg shadow-inner select-none transition-all group-hover:bg-white">
              <span>JOIN FREE</span>
              <Sparkles className="w-3 h-3 text-black animate-spin" style={{ animationDuration: '3s' }} />
            </div>
          </a>
        </footer>

        {/* FLOATING ADMIN PLUS (+) BUTTON */}
        {isAdminActive && (
          <button
            onClick={() => {
              setAdminPanelTab('add');
              setIsAddModalOpen(true);
            }}
            className="absolute bottom-22 right-5 z-40 h-12 w-12 rounded-full bg-[#F5C400] text-slate-950 flex items-center justify-center shadow-[0_4px_24px_rgba(245,196,0,0.45)] hover:bg-[#ffe04d] hover:scale-110 active:scale-95 transition-all duration-300 animate-pulse border-2 border-slate-900 cursor-pointer"
            title="Create Prediction Card"
          >
            <Plus className="w-5.5 h-5.5 stroke-[3]" />
          </button>
        )}

        {/* ADMIN CONTROL PANEL MODAL OVERLAY */}
        {isAddModalOpen && (
          <AdminPanel
            dates={dates}
            selectedDateId={selectedDateId}
            isUnlocked={isUnlocked}
            onToggleUnlock={handleToggleUnlock}
            onAddMatch={handleAddMatch}
            onResetData={handleResetData}
            onClose={() => setIsAddModalOpen(false)}
            initialSubTab={adminPanelTab}
            onShowNotification={showToast}
            isApprovalsTickerOn={isApprovalsTickerOn}
            onToggleApprovalsTicker={handleToggleApprovalsTicker}
          />
        )}

        {/* FLOATING SUCCESS TOAST NOTIFIER */}
        {notification && (
          <Notification
            message={notification.message}
            type={notification.type}
            onClose={() => setNotification(null)}
          />
        )}

        {/* --- FULLSCREEN CELEBRATORY CONFETTI SHOWER MOCKUP --- */}
        {showConfetti && (
          <div className="fixed inset-0 pointer-events-none z-150 overflow-hidden">
            {/* Streamers Left */}
            <div className="absolute top-0 left-10 w-2 h-16 bg-pink-500 rounded animate-fall-fast rotate-45"></div>
            <div className="absolute top-1/4 left-5 w-3 h-3 bg-[#F5C400] rounded-full animate-fall-slow"></div>
            <div className="absolute top-1/3 left-20 w-1.5 h-12 bg-indigo-400 rounded animate-fall-medium -rotate-12"></div>
            
            {/* Streamers Right */}
            <div className="absolute top-0 right-10 w-2 h-20 bg-[#F5C400] rounded animate-fall-fast -rotate-45"></div>
            <div className="absolute top-1/5 right-12 w-3.5 h-3.5 bg-emerald-400 rounded-lg animate-fall-medium rotate-12"></div>
            <div className="absolute top-1/2 right-4 w-1.5 h-14 bg-amber-500 rounded animate-fall-slow"></div>

            {/* Sparkle stars */}
            <span className="absolute top-40 left-1/4 text-[#F5C400] text-3xl animate-ping opacity-75">✦</span>
            <span className="absolute top-24 right-1/4 text-white text-2xl animate-ping opacity-60">✦</span>
            <span className="absolute top-3/5 left-12 text-[#F5C400] text-xl animate-ping opacity-80">✦</span>
            <span className="absolute top-3/4 right-20 text-indigo-400 text-3xl animate-ping opacity-50">✦</span>
          </div>
        )}

      </div>
    </div>
  );
}
