import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  where,
  serverTimestamp,
  getDocFromServer
} from 'firebase/firestore';
import { MatchTip } from './types';
import { INITIAL_MATCHES } from './data';

// The exact Firebase config provided by the user
const firebaseConfig = {
  apiKey: "AIzaSyA7RiWuvCZ55nZ6hvqm-AXuk6IcII8DT7M",
  authDomain: "cashcowbet.firebaseapp.com",
  projectId: "cashcowbet",
  storageBucket: "cashcowbet.firebasestorage.app",
  messagingSenderId: "295826345481",
  appId: "1:295826345481:web:c86d3e9d543199cba1f2d8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Use custom database ID if available, otherwise default
export const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId);

// Connection test from skill instructions
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    const errorStr = error instanceof Error ? error.message : String(error);
    if (errorStr.includes('offline') || errorStr.includes('unavailable') || errorStr.includes('Failed to get document')) {
      console.warn("Please check your Firebase configuration or network status if persistent offline issues occur.", errorStr);
    }
  }
}
testConnection();

// --- FIRESTORE ERROR HANDLING STRUCTURE (SKILL REQUIREMENT) ---
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error Payload: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// --- USER DATABASE CRUD HELPERS ---
export interface DBUser {
  uid: string;
  email: string;
  isVip: boolean;
  role: 'user' | 'admin';
  username?: string;
  vipStartDate?: string;
  vipEndDate?: string;
  country?: string;
  city?: string;
}

export async function fetchUserProfile(uid: string): Promise<DBUser | null> {
  const path = `users/${uid}`;
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      const userData = userDoc.data() as DBUser;
      try {
        localStorage.setItem(`cached_profile_${uid}`, JSON.stringify(userData));
      } catch (e) {
        // storage quota full or restricted
      }

      // Self-heal/migrate legacy users to usernames mapping in Firestore
      if (userData.username) {
        try {
          const uKey = userData.username.trim().toLowerCase();
          const nameDoc = await getDoc(doc(db, 'usernames', uKey));
          if (!nameDoc.exists()) {
            await setDoc(doc(db, 'usernames', uKey), {
              uid: userData.uid,
              email: userData.email,
              username: userData.username
            });
          }
        } catch (migErr) {
          console.warn("Could not write username migration doc:", migErr);
        }
      }

      return userData;
    }
    return null;
  } catch (error: any) {
    const errorStr = error instanceof Error ? error.message : String(error);
    const isOffline = error?.code === 'unavailable' || errorStr.toLowerCase().includes('offline') || errorStr.toLowerCase().includes('failed to get document');
    
    if (isOffline) {
      console.warn("Firestore is offline or unreachable. Reading cached profile from localStorage...");
      const cached = localStorage.getItem(`cached_profile_${uid}`);
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch {
          // ignore
        }
      }
      
      // Basic offline fallback profile
      const emailLower = auth.currentUser?.email?.toLowerCase() || '';
      const isAdminEmail = emailLower === 'ngimbabetwin@gmail.com' || emailLower === 'jilalamasanja1998@gmail.com';
      return {
        uid,
        email: auth.currentUser?.email || '',
        isVip: false,
        role: isAdminEmail ? 'admin' : 'user'
      };
    }
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

export async function createUserProfile(uid: string, email: string, username?: string): Promise<DBUser> {
  const path = `users/${uid}`;
  // Hardcoded bootstrapped emails get 'admin', all other users default to 'user'
  const emailLower = email.toLowerCase();
  const isAdminEmail = emailLower === 'ngimbabetwin@gmail.com' || emailLower === 'jilalamasanja1998@gmail.com';
  const role = isAdminEmail ? 'admin' : 'user';
  const newUser: DBUser = {
    uid,
    email,
    isVip: false,
    role,
    ...(username ? { username } : {})
  };

  try {
    await setDoc(doc(db, 'users', uid), newUser);

    // Save usernames mapping doc for lookup routing
    if (username) {
      try {
        const uKey = username.trim().toLowerCase();
        await setDoc(doc(db, 'usernames', uKey), {
          uid,
          email,
          username
        });
      } catch (migErr) {
        console.error("Could not write usernames mapping doc during registration:", migErr);
      }
    }

    try {
      localStorage.setItem(`cached_profile_${uid}`, JSON.stringify(newUser));
    } catch (e) {
      // storage quota
    }
    return newUser;
  } catch (error: any) {
    const errorStr = error instanceof Error ? error.message : String(error);
    const isOffline = error?.code === 'unavailable' || errorStr.toLowerCase().includes('offline');
    
    if (isOffline) {
      console.warn("Firestore is offline during profile registration. Saving profile locally.");
      try {
        localStorage.setItem(`cached_profile_${uid}`, JSON.stringify(newUser));
      } catch (e) {
        // storage quota
      }
      return newUser;
    }
    handleFirestoreError(error, OperationType.WRITE, path);
    return newUser;
  }
}

export async function updateUserVipStatus(uid: string, isVip: boolean): Promise<void> {
  const path = `users/${uid}`;
  try {
    await updateDoc(doc(db, 'users', uid), { isVip });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updateUserRole(uid: string, role: 'user' | 'admin'): Promise<void> {
  const path = `users/${uid}`;
  try {
    await updateDoc(doc(db, 'users', uid), { role });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// --- MATCHES CRUD WITH ERROR HANDLERS ---
function cleanUndefined<T extends object>(obj: T): T {
  const cleaned = { ...obj } as any;
  for (const key of Object.keys(cleaned)) {
    if (cleaned[key] === undefined) {
      delete cleaned[key];
    }
  }
  return cleaned;
}

export async function dbAddMatch(match: Omit<MatchTip, 'id'>): Promise<string> {
  const matchId = `match-${Date.now()}`;
  const path = `cashcow_vip_tips/${matchId}`;
  const payload = cleanUndefined({
    ...match,
    id: matchId,
    createdAt: serverTimestamp()
  });

  try {
    await setDoc(doc(db, 'cashcow_vip_tips', matchId), payload);
    return matchId;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

export async function dbUpdateMatch(matchId: string, fields: Partial<MatchTip>): Promise<void> {
  const path = `cashcow_vip_tips/${matchId}`;
  const cleanedFields = cleanUndefined(fields);
  try {
    await updateDoc(doc(db, 'cashcow_vip_tips', matchId), cleanedFields);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
    throw error;
  }
}

export async function dbDeleteMatch(matchId: string): Promise<void> {
  const path = `cashcow_vip_tips/${matchId}`;
  try {
    // Copy to recycle_bin first if it exists
    const matchSnap = await getDoc(doc(db, 'cashcow_vip_tips', matchId));
    if (matchSnap.exists()) {
      const matchData = matchSnap.data();
      const backupId = `deleted-${matchId}-${Date.now()}`;
      await setDoc(doc(db, 'recycle_bin', backupId), {
        ...matchData,
        backupId: backupId,
        deletedAt: new Date().toISOString()
      });
    }
  } catch (backupErr) {
    console.warn("Failed to create match backup in recycle bin:", backupErr);
  }

  try {
    await deleteDoc(doc(db, 'cashcow_vip_tips', matchId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    throw error;
  }
}

// Helper to get EAT date string for a given offset from current date
export function getEATDateString(offset: number): string {
  const d = new Date();
  const utc = d.getTime() + d.getTimezoneOffset() * 60000;
  const eatDate = new Date(utc + (3 * 3600000));
  eatDate.setDate(eatDate.getDate() + offset);
  
  const yyyy = eatDate.getFullYear();
  const mm = String(eatDate.getMonth() + 1).padStart(2, '0');
  const dd = String(eatDate.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// Maps static template date IDs to dynamic relative EAT dates (Disabled dynamic shifting to prevent matches auto-shifting date with different real-time boundaries)
function mapTemplateDateToDynamic(staticDate: string): string {
  return staticDate;
}

// Seeding standard initial data is disabled to keep predictions strictly custom-assigned by admin
export async function seedMatchesIfEmpty(force: boolean = false): Promise<void> {
  console.log('Auto seeding of default tips disabled to provide a clean slate for the production admin.');
  return;
}

// Data recovery system to restore matches from the user's screenshots
export async function restoreScreenshotMatches(): Promise<number> {
  const SCREENSHOT_RECOVERY_MATCHES: Omit<MatchTip, 'id'>[] = [
    // --- JUNE 06 (Tomorrow SAT 06) ---
    // Free Tips
    {
      homeTeam: 'Paraguay',
      awayTeam: 'Nicaragua',
      time: '01:15',
      prediction: 'Home win',
      odds: 1.20,
      status: 'pending',
      type: 'free',
      dateId: '2026-06-06'
    },
    {
      homeTeam: 'Crown Legacy',
      awayTeam: 'Philadelphia II',
      time: '02:00',
      prediction: 'Home Or Draw',
      odds: 1.27,
      status: 'pending',
      type: 'free',
      dateId: '2026-06-06'
    },

    // --- JUNE 05 (Today FRI 05) ---
    // VIP Tips
    {
      homeTeam: 'Russia',
      awayTeam: 'Burkina Faso',
      time: '20:00',
      prediction: 'HT/FT: 1/1',
      odds: 2.10,
      status: 'pending',
      type: 'vip',
      dateId: '2026-06-05'
    },
    {
      homeTeam: 'Logan Lightning',
      awayTeam: 'Capalaba',
      time: '13:30',
      prediction: 'Under 2.5Goals',
      odds: 3.50,
      status: 'win',
      type: 'vip',
      dateId: '2026-06-05'
    },

    // --- JUNE 04 (Yesterday THU 04) ---
    // VIP Tips
    {
      homeTeam: 'Lesotho',
      awayTeam: 'Kenya',
      time: '16:00',
      prediction: 'Away/Away',
      odds: 2.90,
      status: 'lose',
      type: 'vip',
      dateId: '2026-06-04'
    },
    {
      homeTeam: 'France',
      awayTeam: 'Ivory Coast',
      time: '22:10',
      prediction: 'Home win',
      odds: 1.30,
      status: 'lose',
      type: 'vip',
      dateId: '2026-06-04'
    },

    // Free Tips
    {
      homeTeam: 'Laholms',
      awayTeam: 'Hassleholms IF',
      time: '20:00',
      prediction: 'Draw Or Away',
      odds: 1.20,
      status: 'win',
      type: 'free',
      dateId: '2026-06-04'
    },
    {
      homeTeam: 'SSA U20',
      awayTeam: 'Galicia U20',
      time: '15:00',
      prediction: 'Home Or Draw',
      odds: 1.20,
      status: 'lose',
      type: 'free',
      dateId: '2026-06-04'
    }
  ];

  let restoredCount = 0;
  try {
    // Fetch all existing matches to compare
    const snapshot = await getDocs(collection(db, 'cashcow_vip_tips'));
    const existing = snapshot.docs.map(doc => doc.data() as MatchTip);

    for (const item of SCREENSHOT_RECOVERY_MATCHES) {
      // Avoid duplication by comparing identifying traits
      const alreadyExists = existing.some(m => 
        m.homeTeam.trim().toLowerCase() === item.homeTeam.trim().toLowerCase() &&
        m.awayTeam.trim().toLowerCase() === item.awayTeam.trim().toLowerCase() &&
        m.dateId === item.dateId &&
        m.type === item.type
      );

      if (!alreadyExists) {
        await dbAddMatch(item);
        restoredCount++;
      }
    }
  } catch (error) {
    console.error('Error executing screenshot recovery restore:', error);
  }
  return restoredCount;
}
