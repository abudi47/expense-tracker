import { View, Text, ScrollView, Platform, Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as IntentLauncher from 'expo-intent-launcher';
import { Button, Card } from '../components/ui';
import { theme, fonts, palette } from '../theme';
import { api } from '../services/api';
import { useToast } from '../components/Toast';
import { haptics } from '../utils/haptics';

/**
 * DISCLOSURE COPY — review before Play Store submission that requests
 * notification-listener access. Do not ship Phase 3 store builds until approved.
 */
export const NOTIFICATION_DISCLOSURE = {
  title: 'Read bank notifications (Android)',
  summary:
    'Asset Tracker can watch notification banners from banks and wallets (CBE, Bank of Abyssinia, telebirr) to suggest transactions for your review. We never post to your balance without your approval.',
  bullets: [
    'We read the title and text of notifications from financial apps you allow — not your full SMS inbox.',
    'We do not request the READ_SMS permission.',
    'Parsed amounts go to a “Detected — needs review” queue. You confirm the account before anything affects balances.',
    'You can turn this off anytime in Settings, and revoke access in Android Settings → Notifications → Device & app notifications.',
    'Only short parsed fields are stored (amount, date, reference). Full message bodies are not kept after processing.',
  ],
  playStoreJustification:
    'This app uses the Notification Listener Service solely to parse bank and payment confirmation notifications for optional expense tracking. Access is user-initiated, opt-in, and limited to extracting transaction fields for a manual review queue. The app does not read SMS, does not send messages, and does not use notification access for advertising.',
};

export default function NotificationAccessScreen() {
  const navigation = useNavigation();
  const { showToast } = useToast();

  const openSystemSettings = async () => {
    if (Platform.OS !== 'android') {
      showToast('Notification listening is Android-only', 'info');
      return;
    }
    try {
      await IntentLauncher.startActivityAsync(
        'android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS'
      );
    } catch {
      await Linking.openSettings();
    }
  };

  const enable = async () => {
    haptics.medium();
    try {
      await api.put('/settings/preferences', {
        ingest: { androidNotifications: true },
      });
      await openSystemSettings();
      showToast('Enable Asset Tracker in the list, then return', 'info');
      navigation.goBack();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to enable', 'error');
    }
  };

  return (
    <ScrollView className={`flex-1 ${theme.screen}`} contentContainerClassName="px-5 pb-10 pt-4">
      <Text className={theme.title} style={{ fontFamily: fonts.bold, fontSize: 24, marginBottom: 8 }}>
        {NOTIFICATION_DISCLOSURE.title}
      </Text>
      <Text className={theme.subtitle} style={{ fontFamily: fonts.regular, fontSize: 15, marginBottom: 16 }}>
        {NOTIFICATION_DISCLOSURE.summary}
      </Text>

      <Card className="mb-4">
        {NOTIFICATION_DISCLOSURE.bullets.map((b) => (
          <View key={b} className="flex-row mb-3">
            <Text style={{ color: palette.primary, marginRight: 8 }}>•</Text>
            <Text className={`${theme.title} flex-1`} style={{ fontFamily: fonts.regular, fontSize: 14 }}>
              {b}
            </Text>
          </View>
        ))}
      </Card>

      <Card className="mb-6" style={{ borderColor: palette.warning + '55', borderWidth: 1 }}>
        <Text style={{ fontFamily: fonts.semibold, color: palette.warning, marginBottom: 6 }}>
          For store review (do not submit until approved)
        </Text>
        <Text className={theme.subtitle} style={{ fontFamily: fonts.regular, fontSize: 12 }}>
          {NOTIFICATION_DISCLOSURE.playStoreJustification}
        </Text>
      </Card>

      {Platform.OS === 'android' ? (
        <Button title="I understand — enable access" onPress={enable} />
      ) : (
        <Text className={theme.subtitle} style={{ fontFamily: fonts.medium, textAlign: 'center' }}>
          This feature is only available on Android.
        </Text>
      )}
    </ScrollView>
  );
}
