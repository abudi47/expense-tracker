import { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Input, Button } from '../components/ui';
import { KeyboardFormScreen } from '../components/KeyboardFormScreen';
import { useAuth } from '../context/AuthContext';
import { AuthStackParamList } from '../navigation/types';
import { theme } from '../theme';
import { palette } from '../theme';
import { useThemeColors } from '../theme/useThemeColors';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const { login, loginWithBiometric, canUseBiometricLogin, biometricLabel } = useAuth();
  const colors = useThemeColors();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [bioLoading, setBioLoading] = useState(false);
  const [error, setError] = useState('');
  const autoBioAttempted = useRef(false);

  useEffect(() => {
    if (canUseBiometricLogin && !autoBioAttempted.current) {
      autoBioAttempted.current = true;
      handleBiometricLogin(true);
    }
  }, [canUseBiometricLogin]);

  const handleBiometricLogin = async (silent = false) => {
    setBioLoading(true);
    if (!silent) setError('');
    try {
      await loginWithBiometric();
    } catch (err) {
      if (!silent) setError(err instanceof Error ? err.message : 'Biometric login failed');
    } finally {
      setBioLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardFormScreen contentContainerClassName="flex-grow justify-center px-6 py-12">
      <View className="items-center mb-8">
        <View className="w-16 h-16 rounded-2xl bg-accent items-center justify-center mb-4">
          <Ionicons name="wallet" size={32} color="#fff" />
        </View>
        <Text className={`${theme.title} text-3xl font-bold text-center`}>Welcome back</Text>
        <Text className={`${theme.subtitle} text-base mt-2 text-center`}>
          Sign in to track your money easily
        </Text>
      </View>

      {canUseBiometricLogin && (
        <View className="mb-6">
          <Button
            title={`Unlock with ${biometricLabel}`}
            onPress={() => handleBiometricLogin()}
            loading={bioLoading}
            variant="secondary"
            icon={<Ionicons name="finger-print" size={22} color={palette.primary} />}
          />
          <View className="flex-row items-center my-5">
            <View className={`flex-1 h-px ${theme.divider}`} />
            <Text className={`${theme.subtitle} mx-3 text-sm`}>or use email</Text>
            <View className={`flex-1 h-px ${theme.divider}`} />
          </View>
        </View>
      )}

      {error ? (
        <View className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-xl p-3 mb-4">
          <Text className="text-red-700 dark:text-red-300 text-sm">{error}</Text>
        </View>
      ) : null}

      <Input label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
      <View>
        <Input label="Password" value={password} onChangeText={setPassword} placeholder="Enter your password" secureTextEntry={!showPassword} autoComplete="password" />
        <TouchableOpacity onPress={() => setShowPassword(!showPassword)} className="absolute right-3 top-9 p-1">
          <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={22} color={colors.icon} />
        </TouchableOpacity>
      </View>

      <Button title="Sign In" onPress={handleLogin} loading={loading} />

      <TouchableOpacity onPress={() => navigation.navigate('Register')} className="mt-6 items-center py-2">
        <Text className={theme.subtitle}>
          Don't have an account? <Text className="text-accent font-semibold">Sign up</Text>
        </Text>
      </TouchableOpacity>
    </KeyboardFormScreen>
  );
}
