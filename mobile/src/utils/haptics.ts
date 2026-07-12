import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

async function safe(fn: () => Promise<void>) {
  try {
    if (Platform.OS === 'web') return;
    await fn();
  } catch {
    // Haptics unsupported — ignore
  }
}

export const haptics = {
  light: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  medium: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  success: () =>
    safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: () =>
    safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  error: () =>
    safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
  selection: () => safe(() => Haptics.selectionAsync()),
};
