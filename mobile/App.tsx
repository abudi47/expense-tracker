import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import {
  useFonts,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { ToastProvider, useToast } from './src/components/Toast';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import AuthNavigator from './src/navigation/AuthNavigator';
import MainNavigator from './src/navigation/MainNavigator';
import AddTransactionScreen from './src/screens/AddTransactionScreen';
import AccountDetailScreen from './src/screens/AccountDetailScreen';
import ManageAccountsScreen from './src/screens/ManageAccountsScreen';
import TransferScreen from './src/screens/TransferScreen';
import ScheduledItemsScreen, {
  AddScheduledItemScreen,
} from './src/screens/ScheduledItemsScreen';
import DetectedInboxScreen from './src/screens/DetectedInboxScreen';
import SmsAccessScreen from './src/screens/SmsAccessScreen';
import { RootStackParamList } from './src/navigation/types';
import { theme, palette, fonts } from './src/theme';
import { useThemeColors } from './src/theme/useThemeColors';
import {
  setGmailAutoSyncCallbacks,
  startGmailAutoSync,
} from './src/services/gmailAutoSync';
import './global.css';

const Stack = createNativeStackNavigator<RootStackParamList>();

const navFont = { fontFamily: fonts.semibold, fontSize: 17 };

function RootNavigator() {
  const { token, loading } = useAuth();
  const colors = useThemeColors();
  const { showToast } = useToast();

  useEffect(() => {
    if (!token) return;
    setGmailAutoSyncCallbacks({
      onQueued: (count, message) => {
        showToast(message || `${count} new from Gmail`, 'success');
      },
    });
    return startGmailAutoSync();
  }, [token, showToast]);

  if (loading) {
    return (
      <View className={`flex-1 ${theme.screen} items-center justify-center`}>
        <ActivityIndicator size="large" color={palette.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        headerTitleStyle: navFont,
      }}
    >
      {token ? (
        <>
          <Stack.Screen name="MainTabs" component={MainNavigator} />
          <Stack.Screen
            name="AddTransaction"
            component={AddTransactionScreen}
            options={{
              headerShown: true,
              headerStyle: { backgroundColor: colors.surface },
              headerTintColor: colors.text,
              headerTitle: '',
              presentation: 'modal',
              animation: 'fade_from_bottom',
            }}
          />
          <Stack.Screen
            name="AccountDetail"
            component={AccountDetailScreen}
            options={{
              headerShown: true,
              headerStyle: { backgroundColor: colors.surface },
              headerTintColor: colors.text,
              headerTitle: '',
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="ManageAccounts"
            component={ManageAccountsScreen}
            options={{
              headerShown: true,
              headerStyle: { backgroundColor: colors.surface },
              headerTintColor: colors.text,
              title: 'Accounts',
            }}
          />
          <Stack.Screen
            name="Transfer"
            component={TransferScreen}
            options={{
              headerShown: true,
              headerStyle: { backgroundColor: colors.surface },
              headerTintColor: colors.text,
              title: 'Transfer',
              presentation: 'modal',
              animation: 'fade_from_bottom',
            }}
          />
          <Stack.Screen
            name="ScheduledItems"
            component={ScheduledItemsScreen}
            options={{
              headerShown: true,
              headerStyle: { backgroundColor: colors.surface },
              headerTintColor: colors.text,
              title: 'Scheduled',
            }}
          />
          <Stack.Screen
            name="AddScheduledItem"
            component={AddScheduledItemScreen}
            options={{
              headerShown: true,
              headerStyle: { backgroundColor: colors.surface },
              headerTintColor: colors.text,
              title: 'Add scheduled',
              presentation: 'modal',
              animation: 'fade_from_bottom',
            }}
          />
          <Stack.Screen
            name="DetectedInbox"
            component={DetectedInboxScreen}
            options={{
              headerShown: true,
              headerStyle: { backgroundColor: colors.surface },
              headerTintColor: colors.text,
              title: 'Detected',
            }}
          />
          <Stack.Screen
            name="SmsAccess"
            component={SmsAccessScreen}
            options={{
              headerShown: true,
              headerStyle: { backgroundColor: colors.surface },
              headerTintColor: colors.text,
              title: 'Bank SMS',
            }}
          />
        </>
      ) : (
        <Stack.Screen name="Auth" component={AuthNavigator} />
      )}
    </Stack.Navigator>
  );
}

function AppContent() {
  const { isDark } = useTheme();

  const navTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
      primary: palette.primary,
      background: isDark ? palette.dark.background : palette.light.background,
      card: isDark ? palette.dark.surface : palette.light.surface,
      text: isDark ? palette.dark.text : palette.light.text,
      border: isDark ? palette.dark.border : palette.light.border,
    },
  };

  return (
    <AuthProvider>
      <ToastProvider>
        <NavigationContainer theme={navTheme}>
          <RootNavigator />
        </NavigationContainer>
      </ToastProvider>
    </AuthProvider>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.light.background }}>
        <ActivityIndicator size="large" color={palette.primary} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <KeyboardProvider>
          <ErrorBoundary>
            <ThemeProvider>
              <AppContent />
            </ThemeProvider>
          </ErrorBoundary>
        </KeyboardProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
