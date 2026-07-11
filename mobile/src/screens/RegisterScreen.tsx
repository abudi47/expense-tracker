import { useState } from 'react';
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardFormScreen contentContainerClassName="flex-grow justify-center px-6 py-12">
      <TouchableOpacity onPress={() => navigation.goBack()} className="mb-6 flex-row items-center">
        <Ionicons name="arrow-back" size={22} color={palette.primary} />
        <Text className="text-accent ml-2 font-medium">Back to sign in</Text>
      </TouchableOpacity>

      <View className="mb-8">
        <Text className={`${theme.title} text-3xl font-bold`}>Create account</Text>
        <Text className={`${theme.subtitle} text-base mt-2`}>Set up your account in under a minute</Text>
      </View>

      {error ? (
        <View className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-xl p-3 mb-4">
          <Text className="text-red-700 dark:text-red-300 text-sm">{error}</Text>
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
        <Text className={theme.subtitle}>
          Already have an account? <Text className="text-accent font-semibold">Sign in</Text>
        </Text>
      </TouchableOpacity>
    </KeyboardFormScreen>
  );
}
