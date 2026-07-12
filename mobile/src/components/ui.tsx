import {
  TextInput,
  TextInputProps,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { theme, fonts } from '../theme';
import { useThemeColors } from '../theme/useThemeColors';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export function Input({ label, error, className, ...props }: InputProps) {
  const colors = useThemeColors();
  return (
    <View className="mb-4">
      {label && (
        <Text
          className={`${theme.label} text-sm mb-1.5`}
          style={{ fontFamily: fonts.medium }}
        >
          {label}
        </Text>
      )}
      <TextInput
        className={`${theme.input} rounded-xl px-4 py-3.5 text-base ${error ? 'border-red-500' : ''} ${className || ''}`}
        style={{ fontFamily: fonts.regular }}
        placeholderTextColor={colors.textMuted}
        {...props}
      />
      {error && (
        <Text
          className="text-red-500 dark:text-red-400 text-xs mt-1"
          style={{ fontFamily: fonts.regular }}
        >
          {error}
        </Text>
      )}
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

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading,
  disabled,
  icon,
}: ButtonProps) {
  const colors = useThemeColors();
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

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
    <AnimatedPressable
      onPress={onPress}
      disabled={disabled || loading}
      onPressIn={() => {
        scale.value = withSpring(0.97);
      }}
      onPressOut={() => {
        scale.value = withSpring(1);
      }}
      style={animStyle}
      className={`rounded-xl py-4 items-center flex-row justify-center gap-2 ${variants[variant]} ${disabled || loading ? 'opacity-50' : ''}`}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'secondary' || variant === 'ghost' ? colors.tabBar.active : '#fff'}
        />
      ) : (
        <>
          {icon}
          <Text
            className={`${textVariants[variant]} text-base`}
            style={{ fontFamily: 'Poppins_600SemiBold' }}
          >
            {title}
          </Text>
        </>
      )}
    </AnimatedPressable>
  );
}

interface CardProps {
  children: React.ReactNode;
  className?: string;
  style?: object;
}

export function Card({ children, className, style }: CardProps) {
  return (
    <View className={`${theme.card} rounded-2xl p-4 ${className || ''}`} style={style}>
      {children}
    </View>
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
        <Text className={`${theme.title} text-base`} style={{ fontFamily: fonts.medium }}>
          {title}
        </Text>
        {subtitle ? (
          <Text className={`${theme.subtitle} text-xs mt-0.5`} style={{ fontFamily: fonts.regular }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
    </TouchableOpacity>
  );
}

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}

export function ScreenHeader({ title, subtitle, right }: ScreenHeaderProps) {
  return (
    <View className="px-5 pt-14 pb-4 flex-row items-end justify-between">
      <View className="flex-1">
        {subtitle ? (
          <Text
            className={`${theme.subtitle} text-sm`}
            style={{ fontFamily: 'Poppins_400Regular' }}
          >
            {subtitle}
          </Text>
        ) : null}
        <Text
          className={`${theme.title} text-2xl ${subtitle ? 'mt-1' : ''}`}
          style={{ fontFamily: 'Poppins_700Bold' }}
        >
          {title}
        </Text>
      </View>
      {right}
    </View>
  );
}
