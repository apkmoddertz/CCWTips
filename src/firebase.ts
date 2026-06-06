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
  initializeFirestore,
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
  apiKey: "AIzaSyB97Rw3a9wCJyB4RsPs3t5tXd7XoxUZXIU",
  authDomain: "cstips-147d2.firebaseapp.com",
  projectId: "cstips-147d2",
  storageBucket: "cstips-147d2.firebasestorage.app",
  messagingSenderId: "149848705944",
  appId: "1:149848705944:web:1ddfb42aeb87a6c7e7f9ed"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Use custom database ID if available, otherwise default, employing long polling for robust cloud sandbox connectivity
const dbId = (firebaseConfig as any).firestoreDatabaseId;
export const db = dbId 
  ? initializeFirestore(app, { experimentalForceLongPolling: true }, dbId)
  : initializeFirestore(app, { experimentalForceLongPolling: true });

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
    console.warn("Firestore error during profile fetch; reading from local cache.", error);
    const cached = localStorage.getItem(`cached_profile_${uid}`);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        // ignore
      }
    }
    
    // Basic fallback profile
    const emailLower = auth.currentUser?.email?.toLowerCase() || '';
    const isAdminEmail = emailLower === 'ngimbabetwin@gmail.com' || emailLower === 'jilalamasanja1998@gmail.com';
    return {
      uid,
      email: auth.currentUser?.email || '',
      isVip: false,
      role: isAdminEmail ? 'admin' : 'user'
    };
  }
}

export async function createUserProfile(uid: string, email: string, username?: string): Promise<DBUser> {
  const path = `users/${uid}`;
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
    console.warn("Firestore is offline or permission is restricted. Saving profile locally.", error);
    try {
      localStorage.setItem(`cached_profile_${uid}`, JSON.stringify(newUser));
    } catch (e) {
      // storage quota
    }
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
  const path = `matches/${matchId}`;
  const payload = cleanUndefined({
    ...match,
    id: matchId,
    createdAt: serverTimestamp()
  });

  try {
    await setDoc(doc(db, 'matches', matchId), payload);
    return matchId;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

export async function dbUpdateMatch(matchId: string, fields: Partial<MatchTip>): Promise<void> {
  const path = `matches/${matchId}`;
  const cleanedFields = cleanUndefined(fields);
  try {
    await updateDoc(doc(db, 'matches', matchId), cleanedFields);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
    throw error;
  }
}

export async function dbDeleteMatch(matchId: string): Promise<void> {
  const path = `matches/${matchId}`;
  try {
    // Copy to recycle_bin first if it exists
    const matchSnap = await getDoc(doc(db, 'matches', matchId));
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
    await deleteDoc(doc(db, 'matches', matchId));
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

// Data recovery system is disabled to keep predictions strictly custom-assigned by admin
export async function restoreScreenshotMatches(): Promise<number> {
  console.log('Restore screenshot matches system disabled to prevent default/template overrides.');
  return 0;
}
