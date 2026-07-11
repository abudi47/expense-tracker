import { useState } from 'react';
import { View, Text, ScrollView, Alert, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card, Button, SettingRow, ScreenHeader } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { palette, theme, ThemeMode } from '../theme';
import { useThemeColors } from '../theme/useThemeColors';

export default function SettingsScreen() {
  const { user, logout, biometricAvailable, biometricLabel, biometricEnabled, enableBiometric, disableBiometric } =
    useAuth();
  const { mode, setMode, isDark } = useTheme();
  const colors = useThemeColors();
  const [bioBusy, setBioBusy] = useState(false);

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
        Alert.alert('Enabled', `${biometricLabel} login is now active.`);
      } else {
        await disableBiometric();
      }
    } catch (err) {
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
    await setMode(next);
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
              <Text className="text-white text-xl font-bold">
                {user?.name?.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View className="ml-4 flex-1">
              <Text className={`${theme.title} text-lg font-semibold`}>{user?.name}</Text>
              <Text className={`${theme.subtitle} text-sm`}>{user?.email}</Text>
            </View>
          </View>
        </Card>

        <Text className={`${theme.subtitle} text-xs font-semibold uppercase mb-2 ml-1`}>
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

        <Text className={`${theme.subtitle} text-xs font-semibold uppercase mb-2 ml-1`}>
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

        <Text className={`${theme.subtitle} text-xs font-semibold uppercase mb-2 ml-1`}>
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
