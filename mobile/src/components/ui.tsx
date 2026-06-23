import {
  TextInput,
  TextInputProps,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { theme } from '../theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export function Input({ label, error, className, ...props }: InputProps) {
  return (
    <View className="mb-4">
      {label && (
        <Text className={`${theme.label} text-sm mb-1.5 font-medium`}>{label}</Text>
      )}
      <TextInput
        className={`${theme.input} rounded-xl px-4 py-3.5 text-base ${error ? 'border-red-500' : ''} ${className || ''}`}
        placeholderTextColor="#94a3b8"
        {...props}
      />
      {error && <Text className="text-red-500 dark:text-red-400 text-xs mt-1">{error}</Text>}
    </View>
  );
}

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading,
  disabled,
  icon,
}: ButtonProps) {
  const variants = {
    primary: 'bg-accent',
    secondary: 'bg-slate-200 dark:bg-navy-700 border border-slate-300 dark:border-navy-500',
    danger: 'bg-red-600',
    ghost: 'bg-transparent border border-slate-300 dark:border-navy-600',
  };

  const textVariants = {
    primary: 'text-white',
    secondary: 'text-slate-900 dark:text-white',
    danger: 'text-white',
    ghost: 'text-slate-700 dark:text-navy-200',
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      className={`rounded-xl py-4 items-center flex-row justify-center gap-2 ${variants[variant]} ${disabled || loading ? 'opacity-50' : ''}`}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'secondary' || variant === 'ghost' ? '#3b82f6' : '#fff'} />
      ) : (
        <>
          {icon}
          <Text className={`${textVariants[variant]} font-semibold text-base`}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className }: CardProps) {
  return (
    <View className={`${theme.card} rounded-2xl p-4 ${className || ''}`}>{children}</View>
  );
}

interface SettingRowProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  right?: React.ReactNode;
}

export function SettingRow({ icon, title, subtitle, onPress, right }: SettingRowProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress && !right}
      activeOpacity={onPress ? 0.7 : 1}
      className="flex-row items-center py-3 min-h-[52px]"
    >
      {icon}
      <View className="ml-3 flex-1">
        <Text className={`${theme.title} text-base`}>{title}</Text>
        {subtitle ? (
          <Text className={`${theme.subtitle} text-xs mt-0.5`}>{subtitle}</Text>
        ) : null}
      </View>
      {right}
    </TouchableOpacity>
  );
}

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
}

export function ScreenHeader({ title, subtitle }: ScreenHeaderProps) {
  return (
    <View className="px-5 pt-14 pb-4">
      {subtitle ? (
        <Text className={`${theme.subtitle} text-sm`}>{subtitle}</Text>
      ) : null}
      <Text className={`${theme.title} text-2xl font-bold ${subtitle ? 'mt-1' : ''}`}>
        {title}
      </Text>
    </View>
  );
}
