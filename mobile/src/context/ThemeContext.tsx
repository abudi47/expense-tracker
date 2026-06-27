import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';
import { useColorScheme } from 'nativewind';
import * as SecureStore from 'expo-secure-store';
import { StatusBar } from 'expo-status-bar';
import { THEME_KEY, ThemeMode } from '../theme';

interface ThemeContextType {
  mode: ThemeMode;
  isDark: boolean;
  setMode: (mode: ThemeMode) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useSystemColorScheme();
  const { colorScheme, setColorScheme } = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [ready, setReady] = useState(false);

  const resolvedDark =
    mode === 'system' ? systemScheme === 'dark' : mode === 'dark';

  useEffect(() => {
    (async () => {
      try {
        const saved = await SecureStore.getItemAsync(THEME_KEY);
        if (saved === 'light' || saved === 'dark' || saved === 'system') {
          setModeState(saved);
          if (saved !== 'system') {
            setColorScheme(saved);
          }
        }
      } catch {
        // ignore
      } finally {
        setReady(true);
      }
    })();
  }, [setColorScheme]);

  useEffect(() => {
    if (!ready) return;
    if (mode === 'system') {
      setColorScheme('system');
    } else {
      setColorScheme(mode);
    }
  }, [mode, ready, setColorScheme]);

  const setMode = useCallback(async (next: ThemeMode) => {
    setModeState(next);
    await SecureStore.setItemAsync(THEME_KEY, next);
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        mode,
        isDark: resolvedDark ?? colorScheme === 'dark',
        setMode,
      }}
    >
      <StatusBar style={resolvedDark ? 'light' : 'dark'} />
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}
