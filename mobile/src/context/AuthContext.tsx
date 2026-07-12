import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { api } from '../services/api';
import { authenticateWithBiometric, getBiometricSupport } from '../services/biometric';

interface User {
  id: string;
  name: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  biometricAvailable: boolean;
  biometricLabel: string;
  biometricEnabled: boolean;
  canUseBiometricLogin: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loginWithBiometric: () => Promise<void>;
  enableBiometric: () => Promise<void>;
  disableBiometric: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

/** SecureStore keys may only contain alphanumeric, '.', '-', '_' — no '@' etc. */
const biometricKey = (email: string) =>
  `biometric_enabled_${email.toLowerCase().replace(/[^a-z0-9._-]/g, '_')}`;

async function isBiometricEnabledForEmail(email: string): Promise<boolean> {
  return (await SecureStore.getItemAsync(biometricKey(email))) === 'true';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricLabel, setBiometricLabel] = useState('Biometrics');
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [hasStoredSession, setHasStoredSession] = useState(false);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const bio = await getBiometricSupport();
      setBiometricAvailable(bio.available);
      setBiometricLabel(bio.label);

      const storedToken = await SecureStore.getItemAsync(TOKEN_KEY);
      const storedUserJson = await SecureStore.getItemAsync(USER_KEY);

      if (storedToken && storedUserJson) {
        const storedUser = JSON.parse(storedUserJson) as User;
        setHasStoredSession(true);
        const bioEnabled = await isBiometricEnabledForEmail(storedUser.email);
        setBiometricEnabled(bioEnabled);

        if (!bioEnabled) {
          setToken(storedToken);
          setUser(storedUser);
          api.setToken(storedToken);
          try {
            const prefs = await api.get<{ pushAlertsEnabled?: boolean }>('/settings/preferences');
            if (prefs.pushAlertsEnabled) {
              const { registerForPushNotifications } = await import('../services/pushNotifications');
              await registerForPushNotifications();
            }
          } catch {
            // optional
          }
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const persistAuth = async (newToken: string, newUser: User) => {
    await SecureStore.setItemAsync(TOKEN_KEY, newToken);
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(newUser));
    api.setToken(newToken);
    setToken(newToken);
    setUser(newUser);
    setHasStoredSession(true);
    const bioEnabled = await isBiometricEnabledForEmail(newUser.email);
    setBiometricEnabled(bioEnabled);
    // Re-register push token when session is active and user opted in
    try {
      const prefs = await api.get<{ pushAlertsEnabled?: boolean }>('/settings/preferences');
      if (prefs.pushAlertsEnabled) {
        const { registerForPushNotifications } = await import('../services/pushNotifications');
        await registerForPushNotifications();
      }
    } catch {
      // FCM may be unconfigured — ignore so login still works
    }
  };

  const restoreStoredSession = async () => {
    const storedToken = await SecureStore.getItemAsync(TOKEN_KEY);
    const storedUser = await SecureStore.getItemAsync(USER_KEY);
    if (!storedToken || !storedUser) {
      throw new Error('No saved session found. Please sign in with your password.');
    }
    setToken(storedToken);
    setUser(JSON.parse(storedUser));
    api.setToken(storedToken);
    try {
      const prefs = await api.get<{ pushAlertsEnabled?: boolean }>('/settings/preferences');
      if (prefs.pushAlertsEnabled) {
        const { registerForPushNotifications } = await import('../services/pushNotifications');
        await registerForPushNotifications();
      }
    } catch {
      // FCM may be unconfigured — ignore so login still works
    }
  };

  const login = async (email: string, password: string) => {
    const data = await api.post<{ token: string; user: User }>('/auth/login', {
      email,
      password,
    });
    await persistAuth(data.token, data.user);
  };

  const register = async (name: string, email: string, password: string) => {
    const data = await api.post<{ token: string; user: User }>('/auth/register', {
      name,
      email,
      password,
    });
    await persistAuth(data.token, data.user);
  };

  const logout = async () => {
    const bioEnabled = biometricEnabled;

    if (!bioEnabled) {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(USER_KEY);
      setHasStoredSession(false);
    }

    api.setToken(null);
    setToken(null);
    setUser(null);
  };

  const loginWithBiometric = async () => {
    const ok = await authenticateWithBiometric(`Unlock with ${biometricLabel}`);
    if (!ok) {
      throw new Error(`${biometricLabel} authentication cancelled`);
    }
    await restoreStoredSession();
  };

  const enableBiometric = async () => {
    if (!biometricAvailable) {
      throw new Error(`${biometricLabel} is not available on this device`);
    }
    if (!user?.email) {
      throw new Error('Sign in first to enable biometric login');
    }
    const ok = await authenticateWithBiometric(`Enable ${biometricLabel} login`);
    if (!ok) {
      throw new Error(`${biometricLabel} authentication cancelled`);
    }
    await SecureStore.setItemAsync(biometricKey(user.email), 'true');
    setBiometricEnabled(true);
  };

  const disableBiometric = async () => {
    const email = user?.email;
    if (email) {
      await SecureStore.deleteItemAsync(biometricKey(email));
    } else {
      const storedUser = await SecureStore.getItemAsync(USER_KEY);
      if (storedUser) {
        await SecureStore.deleteItemAsync(biometricKey(JSON.parse(storedUser).email));
      }
    }
    setBiometricEnabled(false);
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
    setHasStoredSession(false);
  };

  const canUseBiometricLogin =
    biometricAvailable && biometricEnabled && hasStoredSession && !token;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        biometricAvailable,
        biometricLabel,
        biometricEnabled,
        canUseBiometricLogin,
        login,
        register,
        logout,
        loginWithBiometric,
        enableBiometric,
        disableBiometric,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
