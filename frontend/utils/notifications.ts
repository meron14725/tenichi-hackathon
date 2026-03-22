import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { router } from 'expo-router';

// Configure how notifications are handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Request notification permissions from the user.
 * Returns true if granted, false otherwise.
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return false;
  }

  // iOS specific channel setup is handled automatically by expo-notifications
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('schedule-reminders', {
      name: '予定のリマインダー',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
    });
  }

  return true;
}

/**
 * Schedule a local push notification 10 minutes before departure.
 *
 * @param scheduleTitle - The title of the schedule (used for notification title)
 * @param departureTime - ISO 8601 string of the departure time
 * @returns The notification identifier, or null if scheduling failed
 */
export async function scheduleNotification(
  scheduleTitle: string,
  departureTime: string
): Promise<string | null> {
  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      console.warn('Notification permissions not granted');
      return null;
    }

    const departureDate = new Date(departureTime);
    const notifyDate = new Date(departureDate.getTime() - 10 * 60 * 1000); // 10 minutes before

    // Don't schedule if the notification time has already passed
    if (notifyDate <= new Date()) {
      return null;
    }

    const trigger: Notifications.NotificationTriggerInput = {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: notifyDate,
    };

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: scheduleTitle,
        body: '予定の時間が近づいています。',
        sound: 'default',
        data: { screen: 'today' },
      },
      trigger,
    });

    return id;
  } catch (error) {
    console.error('Failed to schedule notification:', error);
    return null;
  }
}

/**
 * Set up listener that navigates to the today screen when a notification is tapped.
 * Call this once in the root layout.
 */
export function setupNotificationResponseListener() {
  const subscription = Notifications.addNotificationResponseReceivedListener(response => {
    const data = response.notification.request.content.data;
    if (data?.screen === 'today') {
      router.push('/(tabs)');
    }
  });

  return subscription;
}
