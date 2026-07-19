import { useState } from 'react';
import { View, Text, ScrollView, Platform, Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Button, Card } from '../components/ui';
import { theme, fonts, palette } from '../theme';
import { api } from '../services/api';
import { useToast } from '../components/Toast';
import { haptics } from '../utils/haptics';
import {
  hasSmsPermission,
  isNativeSmsReaderAvailable,
  requestSmsPermission,
  scanAndIngestRecent,
  startAndroidSmsBridge,
} from '../services/androidSmsReader';

/**
 * DISCLOSURE COPY — READ_SMS is a Play restricted permission.
 * Sideload / EAS preview is the intended distribution path unless a compliance
 * pass for Play Store is completed separately.
 */
export const SMS_DISCLOSURE = {
  title: 'Read bank SMS (Android)',
  summary:
    'Asset Tracker can read matching SMS from CBE, Bank of Abyssinia, and telebirr to suggest transactions for your review. We never post to your balance without your approval.',
  bullets: [
    'We only upload SMS that look like bank or wallet confirmations (sender/keywords filter) — not your full inbox.',
    'This uses the Android READ_SMS permission. It works in an EAS-built APK, not in Expo Go.',
    'Parsed amounts go to a “Detected — needs review” queue. You confirm the account before anything affects balances.',
    'You can turn this off anytime in Settings, and revoke SMS permission in Android Settings → Apps → Asset Tracker → Permissions.',
    'Only short parsed fields are stored (amount, date, reference). Full message bodies are not kept after processing.',
  ],
  playStoreNote:
    'READ_SMS is a restricted permission on Google Play. This build is intended for sideload / internal EAS distribution. Do not submit to Play without a separate compliance review.',
};

function formatScanResult(result: {
  created: number;
  matched: number;
  skipped: number;
  scanned?: number;
  error?: string;
}) {
  if (result.error) return result.error;
  if (result.created > 0) return `Queued ${result.created} SMS for review`;
  if ((result.scanned || 0) > 0 && result.matched === 0) {
    return `Found ${result.scanned} bank-like SMS but none parsed — check backend is deployed.`;
  }
  if ((result.matched || 0) > 0 && result.created === 0) {
    return `Matched ${result.matched} already in Detected (no new items).`;
  }
  return 'Bank SMS enabled — new matching messages will appear in Detected';
}

export default function SmsAccessScreen() {
  const navigation = useNavigation();
  const { showToast } = useToast();
  const nativeReady = isNativeSmsReaderAvailable();
  const [busy, setBusy] = useState(false);

  const enable = async () => {
    haptics.medium();
    if (Platform.OS !== 'android') {
      showToast('Bank SMS reading is Android-only', 'info');
      return;
    }

    setBusy(true);
    try {
      await api.put('/settings/preferences', {
        ingest: { androidSms: true },
      });

      if (!nativeReady) {
        showToast(
          'Rebuild required: SMS reading works only after an EAS Android build (not Expo Go).',
          'info'
        );
        navigation.goBack();
        return;
      }

      const granted = (await requestSmsPermission()) || hasSmsPermission();
      if (!granted) {
        showToast('SMS permission denied. Enable it in Android Settings to use Bank SMS.', 'error');
        await Linking.openSettings().catch(() => {});
        navigation.goBack();
        return;
      }

      startAndroidSmsBridge();
      const result = await scanAndIngestRecent(80);
      const msg = formatScanResult(result);
      showToast(msg, result.error ? 'error' : result.created > 0 ? 'success' : 'info');
      if (!result.error) navigation.goBack();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to enable', 'error');
    } finally {
      setBusy(false);
    }
  };

  const rescan = async () => {
    haptics.light();
    setBusy(true);
    try {
      if (!hasSmsPermission()) {
        const granted = await requestSmsPermission();
        if (!granted) {
          showToast('SMS permission required', 'error');
          return;
        }
      }
      startAndroidSmsBridge();
      const result = await scanAndIngestRecent(80);
      showToast(
        formatScanResult(result),
        result.error ? 'error' : result.created > 0 ? 'success' : 'info'
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Scan failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView className={`flex-1 ${theme.screen}`} contentContainerClassName="px-5 pb-10 pt-4">
      <Text className={theme.title} style={{ fontFamily: fonts.bold, fontSize: 24, marginBottom: 8 }}>
        {SMS_DISCLOSURE.title}
      </Text>
      <Text className={theme.subtitle} style={{ fontFamily: fonts.regular, fontSize: 15, marginBottom: 16 }}>
        {SMS_DISCLOSURE.summary}
      </Text>

      <Card className="mb-4">
        {SMS_DISCLOSURE.bullets.map((b) => (
          <View key={b} className="flex-row mb-3">
            <Text style={{ color: palette.primary, marginRight: 8 }}>•</Text>
            <Text className={`${theme.title} flex-1`} style={{ fontFamily: fonts.regular, fontSize: 14 }}>
              {b}
            </Text>
          </View>
        ))}
      </Card>

      {!nativeReady ? (
        <Card className="mb-4" style={{ borderColor: palette.primary + '44', borderWidth: 1 }}>
          <Text style={{ fontFamily: fonts.semibold, color: palette.primary, marginBottom: 6 }}>
            EAS rebuild required
          </Text>
          <Text className={theme.subtitle} style={{ fontFamily: fonts.regular, fontSize: 13 }}>
            Native SMS reading is included in the project, but Expo Go cannot grant or use READ_SMS.
            Run an EAS preview/production Android build, install the APK, then enable Bank SMS here.
          </Text>
        </Card>
      ) : null}

      <Card className="mb-6" style={{ borderColor: palette.warning + '55', borderWidth: 1 }}>
        <Text style={{ fontFamily: fonts.semibold, color: palette.warning, marginBottom: 6 }}>
          Distribution note
        </Text>
        <Text className={theme.subtitle} style={{ fontFamily: fonts.regular, fontSize: 12 }}>
          {SMS_DISCLOSURE.playStoreNote}
        </Text>
      </Card>

      {Platform.OS === 'android' ? (
        <>
          <Button
            title="I understand — enable Bank SMS"
            onPress={enable}
            loading={busy}
            disabled={busy}
          />
          {nativeReady ? (
            <View className="mt-3">
              <Button
                title="Scan inbox now"
                onPress={rescan}
                variant="secondary"
                loading={busy}
                disabled={busy}
              />
            </View>
          ) : null}
        </>
      ) : (
        <Text className={theme.subtitle} style={{ fontFamily: fonts.medium, textAlign: 'center' }}>
          This feature is only available on Android.
        </Text>
      )}
    </ScrollView>
  );
}
