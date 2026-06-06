import { Capacitor } from '@capacitor/core';
import { PushNotifications, Token } from '@capacitor/push-notifications';
import { db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';

/**
 * Checks if the notification system is available (running on a native Android/iOS platform)
 */
export const isPushNotificationsSupported = (): boolean => {
  return Capacitor.isNativePlatform();
};

/**
 * Saves the FCM token to Firestore in the user's profile document with merge: true
 * to preserve all existing data.
 */
export async function saveTokenToFirestore(userId: string, token: string): Promise<void> {
  if (!userId) return;
  try {
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, {
      fcmToken: token,
      fcmTokenUpdatedAt: new Date().toISOString()
    }, { merge: true });
    
    // Save locally so we don't spam Firestore on every session if token is unchanged
    localStorage.setItem(`fcm_token_${userId}`, token);
    console.log(`[FCM] Token stored in Firestore for user ${userId}`);
  } catch (error) {
    console.error('[FCM] Error saving FCM token to Firestore:', error);
  }
}

/**
 * Requests native notification permissions, registers for FCM,
 * and sets up foreground/background notification handlers.
 */
export async function registerPushNotifications(
  userId: string,
  onNotificationReceived?: (notification: any) => void,
  onNotificationOpened?: (notification: any) => void
): Promise<void> {
  if (!isPushNotificationsSupported()) {
    console.log('[FCM] Push notifications are not supported on this platform (Web browser mode).');
    return;
  }

  try {
    // 1. Request notifications permissions from the native operating system
    let permissionStatus = await PushNotifications.checkPermissions();
    
    if (permissionStatus.receive === 'prompt') {
      permissionStatus = await PushNotifications.requestPermissions();
    }

    if (permissionStatus.receive !== 'granted') {
      console.warn('[FCM] Native push notification permission was denied by the user.');
      return;
    }

    // 2. Register the device with FCM APNS/Google push service
    await PushNotifications.register();

    // 3. Setup registration event listeners
    // Note: If token is refreshed, this event is fired again automatically by Capacitor
    await PushNotifications.removeAllListeners();

    await PushNotifications.addListener('registration', async (token: Token) => {
      const fcmToken = token.value;
      console.log('[FCM] Token successfully retrieved of length:', fcmToken.length);
      
      const cachedToken = localStorage.getItem(`fcm_token_${userId}`);
      if (cachedToken !== fcmToken) {
        await saveTokenToFirestore(userId, fcmToken);
      } else {
        console.log('[FCM] Token matches cached token; skipping redundant Firestore update.');
      }
    });

    await PushNotifications.addListener('registrationError', (error: any) => {
      console.error('[FCM] Native application push registration failed:', JSON.stringify(error));
    });

    // 4. Foreground listener - Handles notifications received while app is actively open and onscreen
    await PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('[FCM] Push received in FOREGROUND:', JSON.stringify(notification));
      if (onNotificationReceived) {
        onNotificationReceived(notification);
      }
    });

    // 5. Background / Terminated listener - Handles notifications clicked/completed by the user.
    // Facilitates deep-linking or context redirection upon tapping the native alert.
    await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      console.log('[FCM] Push action performed (foreground/background click):', JSON.stringify(action));
      if (onNotificationOpened) {
        onNotificationOpened(action.notification);
      }
    });

  } catch (err) {
    console.error('[FCM] Critical exception set during push registration setup:', err);
  }
}

/**
 * Removes all active Push Notification listeners from the client window
 */
export async function removePushNotificationListeners(): Promise<void> {
  if (!isPushNotificationsSupported()) return;
  try {
    await PushNotifications.removeAllListeners();
    console.log('[FCM] Push listeners successfully detached.');
  } catch (err) {
    console.error('[FCM] Failed to detach push listeners:', err);
  }
}
