import { useCallback, useState } from 'react';
import { View, Text, ScrollView, Alert, Switch } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Card, Button, SettingRow, ScreenHeader, Input } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../components/Toast';
import { api, FxSettings } from '../services/api';
import { palette, theme, ThemeMode, fonts } from '../theme';
import { useThemeColors } from '../theme/useThemeColors';
import { haptics } from '../utils/haptics';

export default function SettingsScreen() {
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

  const loadFx = async () => {
    try {
      const data = await api.get<FxSettings>('/settings/fx');
      setFx(data);
      setCryptoRate(String(data.cryptoUsdToEtb));
      setBankRate(String(data.bankUsdToEtb));
    } catch {
      // ignore
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadFx();
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
