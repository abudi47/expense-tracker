import { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Input, Button } from '../components/ui';
import { KeyboardFormScreen } from '../components/KeyboardFormScreen';
import { useAuth } from '../context/AuthContext';
import { AuthStackParamList } from '../navigation/types';
import { theme, fonts, palette } from '../theme';
import { useThemeColors } from '../theme/useThemeColors';
import { haptics } from '../utils/haptics';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

export default function RegisterScreen({ navigation }: Props) {
  const { register } = useAuth();
  const colors = useThemeColors();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async () => {
    if (!name || !email || !password) {
      setError('Please fill in all fields');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await register(name.trim(), email.trim(), password);
      haptics.success();
    } catch (err) {
      haptics.error();
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardFormScreen contentContainerClassName="flex-grow justify-center px-6 py-12">
      <TouchableOpacity onPress={() => navigation.goBack()} className="mb-6 flex-row items-center">
        <Ionicons name="arrow-back" size={22} color={palette.primary} />
        <Text style={{ fontFamily: fonts.medium, color: palette.primary, marginLeft: 8 }}>
          Back to sign in
        </Text>
      </TouchableOpacity>

      <View className="mb-8">
        <Text className={theme.title} style={{ fontFamily: fonts.bold, fontSize: 30 }}>
          Create account
        </Text>
        <Text className={`${theme.subtitle} mt-2`} style={{ fontFamily: fonts.regular, fontSize: 15 }}>
          Set up your account in under a minute
        </Text>
      </View>

      {error ? (
        <View className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-xl p-3 mb-4">
          <Text className="text-red-700 dark:text-red-300 text-sm" style={{ fontFamily: fonts.regular }}>
            {error}
          </Text>
        </View>
      ) : null}

      <Input label="Full name" value={name} onChangeText={setName} placeholder="John Doe" />
      <Input label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" />
      <View>
        <Input label="Password" value={password} onChangeText={setPassword} placeholder="At least 6 characters" secureTextEntry={!showPassword} />
        <TouchableOpacity onPress={() => setShowPassword(!showPassword)} className="absolute right-3 top-9 p-1">
          <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={22} color={colors.icon} />
        </TouchableOpacity>
      </View>

      <Button title="Create Account" onPress={handleRegister} loading={loading} />

      <TouchableOpacity onPress={() => navigation.navigate('Login')} className="mt-6 items-center py-2">
        <Text className={theme.subtitle} style={{ fontFamily: fonts.regular }}>
          Already have an account?{' '}
          <Text style={{ fontFamily: fonts.semibold, color: palette.primary }}>Sign in</Text>
        </Text>
      </TouchableOpacity>
    </KeyboardFormScreen>
  );
}
