import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { getCalendars } from 'expo-localization';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { registerToken } from './api/pushTokens';

const DEVICE_ID_KEY = 'push-device-id';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: true,
  }),
});

async function getOrCreateDeviceId(): Promise<string> {
  const existing = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (existing) return existing;
  const id = `${Platform.OS}-${Date.now()}-${Math.round(Math.random() * 1_000_000_000)}`;
  await AsyncStorage.setItem(DEVICE_ID_KEY, id);
  return id;
}

/** Request permission (if needed), get the Expo push token, and register it for the current user. */
export async function registerForPush(): Promise<void> {
  if (!Device.isDevice) return; // push works on physical devices only
  const settings = await Notifications.getPermissionsAsync();
  const granted = settings.granted || (await Notifications.requestPermissionsAsync()).granted;
  if (!granted) return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const projectId = (Constants.expoConfig?.extra?.eas as { projectId?: string } | undefined)
    ?.projectId;
  const tokenResp = await Notifications.getExpoPushTokenAsync(
    projectId ? { projectId } : undefined,
  );
  await registerToken({
    token: tokenResp.data,
    platform: Platform.OS === 'ios' ? 'ios' : 'android',
    timezone: getCalendars()[0]?.timeZone ?? null,
    deviceId: await getOrCreateDeviceId(),
  });
}

/** Subscribe to notification taps → deep-link. Returns an unsubscribe fn. */
export function addNotificationTapHandler(onTrip: (tripId: string) => void): () => void {
  const sub = Notifications.addNotificationResponseReceivedListener((resp) => {
    const data = resp.notification.request.content.data as { tripId?: string };
    if (data?.tripId) onTrip(data.tripId);
  });
  return () => sub.remove();
}
