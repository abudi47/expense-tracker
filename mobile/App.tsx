import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { ToastProvider } from './src/components/Toast';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import AuthNavigator from './src/navigation/AuthNavigator';
import MainNavigator from './src/navigation/MainNavigator';
import AddTransactionScreen from './src/screens/AddTransactionScreen';
import AccountDetailScreen from './src/screens/AccountDetailScreen';
import ManageAccountsScreen from './src/screens/ManageAccountsScreen';
import TransferScreen from './src/screens/TransferScreen';
import { RootStackParamList } from './src/navigation/types';
import { theme } from './src/theme';
import { palette } from './src/theme';
import { useThemeColors } from './src/theme/useThemeColors';
import './global.css';

const Stack = createNativeStackNavigator<RootStackParamList>();

function RootNavigator() {
  const { token, loading } = useAuth();
  const { isDark } = useTheme();
  const colors = useThemeColors();

  if (loading) {
    return (
      <View className={`flex-1 ${theme.screen} items-center justify-center`}>
        <ActivityIndicator size="large" color={palette.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
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

  return (
    <AuthProvider>
      <ToastProvider>
        <NavigationContainer theme={isDark ? DarkTheme : DefaultTheme}>
          <RootNavigator />
        </NavigationContainer>
      </ToastProvider>
    </AuthProvider>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ErrorBoundary>
          <ThemeProvider>
            <AppContent />
          </ThemeProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
