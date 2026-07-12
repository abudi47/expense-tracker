import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from 'react';
import { View, Text, Animated, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../theme/useThemeColors';
import { palette, theme, fonts } from '../theme';
import { haptics } from '../utils/haptics';

type ToastType = 'success' | 'error' | 'info';

interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
  duration: number;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

function ToastItem({ toast, onDismiss }: { toast: ToastMessage; onDismiss: () => void }) {
  const colors = useThemeColors();
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const progressAnim = useRef(new Animated.Value(1)).current;

  const config = {
    success: { icon: 'checkmark-circle' as const, bg: colors.toast.success, color: palette.income },
    error: { icon: 'alert-circle' as const, bg: colors.toast.error, color: palette.expense },
    info: { icon: 'information-circle' as const, bg: colors.toast.info, color: palette.primary },
  }[toast.type];

  useEffect(() => {
    Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }).start();
    Animated.timing(progressAnim, {
      toValue: 0,
      duration: toast.duration,
      useNativeDriver: false,
    }).start();
    const timer = setTimeout(onDismiss, toast.duration);
    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => {
    Animated.timing(slideAnim, { toValue: -100, duration: 200, useNativeDriver: true }).start(
      onDismiss
    );
  };

  return (
    <Animated.View
      style={{ transform: [{ translateY: slideAnim }] }}
      className="mx-4 mb-2 rounded-xl overflow-hidden shadow-lg"
    >
      <View style={{ backgroundColor: config.bg }} className="px-4 py-3 flex-row items-center">
        <Ionicons name={config.icon} size={22} color={config.color} />
        <Text className={`${theme.title} flex-1 ml-3 text-sm`} style={{ fontFamily: fonts.medium }}>
          {toast.message}
        </Text>
        <TouchableOpacity onPress={dismiss} hitSlop={8}>
          <Ionicons name="close" size={18} color={colors.icon} />
        </TouchableOpacity>
      </View>
      <Animated.View
        style={{
          height: 3,
          backgroundColor: config.color,
          width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
        }}
      />
    </Animated.View>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info', duration = 3000) => {
      if (type === 'success') haptics.success();
      else if (type === 'error') haptics.error();
      else haptics.light();
      const id = Date.now().toString();
      setToasts((prev) => [...prev, { id, type, message, duration }]);
    },
    []
  );

  const dismiss = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <View className="absolute top-12 left-0 right-0 z-50" pointerEvents="box-none">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </View>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
