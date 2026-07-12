import { useCallback, useState } from 'react';
import { View, Text, ScrollView, Alert, Switch, Platform, Pressable } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { Card, Button, SettingRow, ScreenHeader, Input } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../components/Toast';
import { api, FxSettings, GmailSyncResult, UserPreferences } from '../services/api';
import { palette, theme, ThemeMode, fonts } from '../theme';
import { useThemeColors } from '../theme/useThemeColors';
import { haptics } from '../utils/haptics';
import { RootStackParamList } from '../navigation/types';
import { startAndroidNotificationBridge } from '../services/androidNotificationListener';
import { enablePushAlerts, disablePushAlerts, notifyLocalDetected } from '../services/pushNotifications';
import { formatSyncToast, saveLastSyncStats } from '../utils/lastSyncStats';
import { emitDataRefresh } from '../utils/dataRefresh';

WebBrowser.maybeCompleteAuthSession();

export default function SettingsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, logout, biometricAvailable, biometricLabel, biometricEnabled, enableBiometric, disableBiometric } =
    useAuth();
  const { mode, setMode, isDark } = useTheme();
  const colors = useThemeColors();
  const { showToast } = useToast();
  const [bioBusy, setBioBusy] = useState(false);
  const [fx, setFx] = useState<FxSettings | null>(null);
  const [cryptoRate, setCryptoRate] = useState('180');
  const [bankRate, setBankRate] = useState('158');
  const [fxSaving, setFxSaving] = useState(false);
  const [prefs, setPrefs] = useState<UserPreferences | null>(null);
  const [detectedCount, setDetectedCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const loadAll = async () => {
    try {
      const [fxData, prefData, countData] = await Promise.all([
        api.get<FxSettings>('/settings/fx'),
        api.get<UserPreferences>('/settings/preferences'),
        api.get<{ needsReviewCount: number }>('/detected/count').catch(() => ({ needsReviewCount: 0 })),
      ]);
      setFx(fxData);
      setCryptoRate(String(fxData.cryptoUsdToEtb));
      setBankRate(String(fxData.bankUsdToEtb));
      setPrefs(prefData);
      setDetectedCount(countData.needsReviewCount);
      if (prefData.ingest.androidNotifications && Platform.OS === 'android') {
        startAndroidNotificationBridge();
      }
    } catch {
      // ignore
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadAll();
    }, [])
  );

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  const handleBiometricToggle = async (value: boolean) => {
    setBioBusy(true);
    try {
      if (value) {
        await enableBiometric();
        haptics.success();
        Alert.alert('Enabled', `${biometricLabel} login is now active.`);
      } else {
        await disableBiometric();
        haptics.light();
      }
    } catch (err) {
      haptics.error();
      Alert.alert(
        'Could not update',
        err instanceof Error ? err.message : 'Something went wrong'
      );
    } finally {
      setBioBusy(false);
    }
  };

  const cycleTheme = async () => {
    const order: ThemeMode[] = ['light', 'dark', 'system'];
    const next = order[(order.indexOf(mode) + 1) % order.length];
    haptics.selection();
    await setMode(next);
  };

  const saveFxRates = async () => {
    const crypto = parseFloat(cryptoRate);
    const bank = parseFloat(bankRate);
    if (!crypto || crypto <= 0 || !bank || bank <= 0) {
      showToast('Enter valid rates greater than 0', 'error');
      return;
    }
    setFxSaving(true);
    try {
      const data = await api.put<FxSettings>('/settings/fx', {
        cryptoUsdToEtb: crypto,
        bankUsdToEtb: bank,
      });
      setFx(data);
      showToast('Conversion rates saved', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save rates', 'error');
    } finally {
      setFxSaving(false);
    }
  };

  const themeLabel =
    mode === 'system' ? 'System default' : mode === 'light' ? 'Light' : 'Dark';

  const setWindowDays = async (days: 7 | 14 | 30) => {
    haptics.selection();
    const data = await api.put<UserPreferences>('/settings/preferences', {
      scheduledWindowDays: days,
    });
    setPrefs(data);
    showToast(`Landing window set to ${days} days`, 'success');
  };

  const connectGmail = async () => {
    try {
      const { url } = await api.get<{ url: string }>('/ingest/gmail/auth-url');
      await WebBrowser.openBrowserAsync(url);
      await loadAll();
      showToast('Return here after authorizing Gmail', 'info');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gmail connect failed', 'error');
    }
  };

  const disconnectGmail = async () => {
    await api.post('/ingest/gmail/disconnect', {});
    await loadAll();
    showToast('Gmail disconnected', 'info');
  };

  const toggleIngest = async (key: 'gmailBinance' | 'gmailGrey', value: boolean) => {
    if (value && !prefs?.ingest.gmailConnected) {
      Alert.alert('Connect Gmail first', 'Authorize read-only Gmail access before enabling a source.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Connect', onPress: connectGmail },
      ]);
      return;
    }
    const data = await api.put<UserPreferences>('/settings/preferences', {
      ingest: { [key]: value },
    });
    setPrefs(data);
  };

  const syncGmail = async () => {
    setSyncing(true);
    try {
      const result = await api.post<GmailSyncResult>('/ingest/gmail/sync', {});
      const breakdown = {
        scanned: result.scanned || 0,
        queued: result.queued || 0,
        parseFailed: result.parseFailed || 0,
        duplicates: result.duplicates || 0,
        alreadyQueued: result.alreadyQueued || 0,
        skippedOther: result.skippedOther,
        needsReviewCount: result.needsReviewCount,
        samples: result.samples,
      };
      await saveLastSyncStats(breakdown);
      const msg = formatSyncToast(breakdown);
      if (breakdown.queued > 0) {
        showToast(msg, 'success');
        await notifyLocalDetected(breakdown.queued);
        emitDataRefresh('gmail-sync');
        navigation.navigate('DetectedInbox');
      } else if (breakdown.parseFailed > 0) {
        showToast(`${msg}. Couldn’t parse — open Detected for details.`, 'info');
        emitDataRefresh('gmail-sync');
      } else {
        showToast(msg, breakdown.alreadyQueued > 0 ? 'info' : 'success');
        emitDataRefresh('gmail-sync');
      }
      await loadAll();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Sync failed', 'error');
    } finally {
      setSyncing(false);
    }
  };

  const togglePushAlerts = async (value: boolean) => {
    try {
      if (value) {
        await enablePushAlerts();
        showToast('Push alerts enabled', 'success');
      } else {
        await disablePushAlerts();
        showToast('Push alerts disabled', 'info');
      }
      await loadAll();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not update push alerts', 'error');
    }
  };

  return (
    <ScrollView className={`flex-1 ${theme.screen}`} contentContainerClassName="pb-10">
      <ScreenHeader title="Settings" subtitle="Customize your experience" />

      <View className="px-5">
        <Card className="mb-4">
          <View className="flex-row items-center">
            <View className="w-14 h-14 rounded-full bg-accent items-center justify-center">
              <Text className="text-white text-xl" style={{ fontFamily: fonts.bold }}>
                {user?.name?.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View className="ml-4 flex-1">
              <Text className={`${theme.title} text-lg`} style={{ fontFamily: fonts.semibold }}>
                {user?.name}
              </Text>
              <Text className={`${theme.subtitle} text-sm`} style={{ fontFamily: fonts.regular }}>
                {user?.email}
              </Text>
            </View>
          </View>
        </Card>

        <Text
          className={`${theme.subtitle} text-xs uppercase mb-2 ml-1`}
          style={{ fontFamily: fonts.semibold, letterSpacing: 0.6 }}
        >
          Currency conversion
        </Text>
        <Card className="mb-4">
          <Text className={`${theme.title} font-medium mb-1`}>USD → ETB rates</Text>
          <Text className={`${theme.subtitle} text-xs mb-4`}>
            Binance / Grey / Bybit / USDT use the crypto rate. Local bank & other USD use the bank
            rate. Totals on Assets can switch between ETB and USD.
          </Text>
          <Input
            label="Crypto / Grey rate (1 USD = ? Br)"
            value={cryptoRate}
            onChangeText={setCryptoRate}
            keyboardType="decimal-pad"
            placeholder="180"
          />
          <Input
            label="Bank / other USD rate (1 USD = ? Br)"
            value={bankRate}
            onChangeText={setBankRate}
            keyboardType="decimal-pad"
            placeholder="158"
          />
          {fx ? (
            <Text className={`${theme.subtitle} text-xs mb-3`}>
              Current: Crypto {fx.cryptoUsdToEtb} · Bank {fx.bankUsdToEtb} · Default view{' '}
              {fx.displayCurrency}
            </Text>
          ) : null}
          <Button title="Save rates" onPress={saveFxRates} loading={fxSaving} />
        </Card>

        <Text
          className={`${theme.subtitle} text-xs uppercase mb-2 ml-1`}
          style={{ fontFamily: fonts.semibold, letterSpacing: 0.6 }}
        >
          Scheduled / landing soon
        </Text>
        <Card className="mb-4">
          <Text className={theme.title} style={{ fontFamily: fonts.medium, marginBottom: 8 }}>
            Look-ahead window
          </Text>
          <View className="flex-row gap-2 mb-3">
            {([7, 14, 30] as const).map((d) => (
              <Pressable
                key={d}
                onPress={() => setWindowDays(d)}
                className="flex-1 py-2.5 rounded-xl items-center border"
                style={{
                  backgroundColor:
                    prefs?.scheduledWindowDays === d ? palette.primary : 'transparent',
                  borderColor: palette.primary + '44',
                }}
              >
                <Text
                  style={{
                    fontFamily: fonts.semibold,
                    color: prefs?.scheduledWindowDays === d ? '#fff' : palette.primary,
                  }}
                >
                  {d}d
                </Text>
              </Pressable>
            ))}
          </View>
          <SettingRow
            icon={<Ionicons name="calendar-outline" size={22} color={palette.primary} />}
            title="Manage scheduled items"
            subtitle="Salary, rent, upcoming bills"
            onPress={() => navigation.navigate('ScheduledItems')}
            right={<Ionicons name="chevron-forward" size={20} color={colors.icon} />}
          />
        </Card>

        <Text
          className={`${theme.subtitle} text-xs uppercase mb-2 ml-1`}
          style={{ fontFamily: fonts.semibold, letterSpacing: 0.6 }}
        >
          Auto-detect (opt-in)
        </Text>
        <Card className="mb-4">
          <SettingRow
            icon={<Ionicons name="mail-unread-outline" size={22} color={palette.primary} />}
            title="Detected inbox"
            subtitle={
              detectedCount > 0
                ? `${detectedCount} waiting for review`
                : 'Review suggested transactions'
            }
            onPress={() => navigation.navigate('DetectedInbox')}
            right={<Ionicons name="chevron-forward" size={20} color={colors.icon} />}
          />
          <View className={`h-px my-1 ${theme.divider}`} />
          <SettingRow
            icon={<Ionicons name="logo-google" size={22} color={palette.primary} />}
            title="Gmail (read-only)"
            subtitle={
              prefs?.ingest.gmailConnected
                ? prefs.ingest.gmailEmail || 'Connected'
                : 'Scan Binance & Grey confirmations'
            }
            onPress={prefs?.ingest.gmailConnected ? disconnectGmail : connectGmail}
            right={
              <Text style={{ fontFamily: fonts.medium, color: palette.primary, fontSize: 13 }}>
                {prefs?.ingest.gmailConnected ? 'Disconnect' : 'Connect'}
              </Text>
            }
          />
          <SettingRow
            icon={<Ionicons name="logo-bitcoin" size={22} color={palette.primary} />}
            title="Scan Binance email"
            subtitle="Deposit / withdrawal confirmations"
            right={
              <Switch
                value={!!prefs?.ingest.gmailBinance}
                onValueChange={(v) => toggleIngest('gmailBinance', v)}
                trackColor={{ false: colors.switchOff, true: palette.primary }}
              />
            }
          />
          <SettingRow
            icon={<Ionicons name="card-outline" size={22} color={palette.primary} />}
            title="Scan Grey email"
            subtitle="Amount received / tendered emails"
            right={
              <Switch
                value={!!prefs?.ingest.gmailGrey}
                onValueChange={(v) => toggleIngest('gmailGrey', v)}
                trackColor={{ false: colors.switchOff, true: palette.primary }}
              />
            }
          />
          {prefs?.ingest.gmailConnected ? (
            <View className="mt-2">
              <Button title="Sync Gmail now" onPress={syncGmail} loading={syncing} variant="secondary" />
            </View>
          ) : null}
          {Platform.OS === 'android' ? (
            <>
              <View className={`h-px my-2 ${theme.divider}`} />
              <SettingRow
                icon={<Ionicons name="notifications-outline" size={22} color={palette.primary} />}
                title="Bank notifications"
                subtitle={
                  prefs?.ingest.androidNotifications
                    ? 'Enabled — review disclosure to change'
                    : 'CBE, BOA, telebirr (Android)'
                }
                onPress={() => navigation.navigate('NotificationAccess')}
                right={<Ionicons name="chevron-forward" size={20} color={colors.icon} />}
              />
            </>
          ) : null}
          <View className={`h-px my-2 ${theme.divider}`} />
          <SettingRow
            icon={<Ionicons name="notifications-circle-outline" size={22} color={palette.primary} />}
            title="Push alerts for detected"
            subtitle="Notify when new items need review or scheduled items go overdue"
            right={
              <Switch
                value={!!prefs?.pushAlertsEnabled}
                onValueChange={togglePushAlerts}
                trackColor={{ false: colors.switchOff, true: palette.primary }}
              />
            }
          />
        </Card>

        <Text
          className={`${theme.subtitle} text-xs uppercase mb-2 ml-1`}
          style={{ fontFamily: fonts.semibold, letterSpacing: 0.6 }}
        >
          Appearance
        </Text>
        <Card className="mb-4">
          <SettingRow
            icon={<Ionicons name={isDark ? 'moon' : 'sunny'} size={22} color={palette.primary} />}
            title="Theme"
            subtitle={themeLabel}
            onPress={cycleTheme}
            right={<Ionicons name="chevron-forward" size={20} color={colors.icon} />}
          />
        </Card>

        <Text
          className={`${theme.subtitle} text-xs uppercase mb-2 ml-1`}
          style={{ fontFamily: fonts.semibold, letterSpacing: 0.6 }}
        >
          Security
        </Text>
        <Card className="mb-4">
          {biometricAvailable ? (
            <SettingRow
              icon={<Ionicons name="finger-print" size={22} color={palette.primary} />}
              title={`${biometricLabel} login`}
              subtitle={
                biometricEnabled
                  ? 'Quick unlock when opening the app'
                  : 'Use biometrics instead of typing your password'
              }
              right={
                <Switch
                  value={biometricEnabled}
                  onValueChange={handleBiometricToggle}
                  disabled={bioBusy}
                  trackColor={{ false: colors.switchOff, true: palette.primary }}
                />
              }
            />
          ) : (
            <SettingRow
              icon={<Ionicons name="finger-print" size={22} color={colors.icon} />}
              title="Biometric login"
              subtitle="Not available on this device"
            />
          )}
        </Card>

        <Text
          className={`${theme.subtitle} text-xs uppercase mb-2 ml-1`}
          style={{ fontFamily: fonts.semibold, letterSpacing: 0.6 }}
        >
          About
        </Text>
        <Card className="mb-6">
          <SettingRow
            icon={<Ionicons name="information-circle-outline" size={22} color={colors.icon} />}
            title="App version"
            subtitle="1.1.0"
          />
        </Card>

        <Button title="Sign Out" onPress={handleLogout} variant="danger" />
      </View>
    </ScrollView>
  );
}
