import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import AuthNavigator from './src/navigation/AuthNavigator';
import MainNavigator from './src/navigation/MainNavigator';
import AddTransactionScreen from './src/screens/AddTransactionScreen';
import { RootStackParamList } from './src/navigation/types';
import { theme } from './src/theme';
import './global.css';

const Stack = createNativeStackNavigator<RootStackParamList>();

function RootNavigator() {
  const { token, loading } = useAuth();
  const { isDark } = useTheme();

  if (loading) {
    return (
      <View className={`flex-1 ${theme.screen} items-center justify-center`}>
        <ActivityIndicator size="large" color="#3b82f6" />
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
              headerStyle: { backgroundColor: isDark ? '#0f172a' : '#ffffff' },
              headerTintColor: isDark ? '#fff' : '#0f172a',
              headerTitle: '',
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
      <NavigationContainer theme={isDark ? DarkTheme : DefaultTheme}>
        <RootNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
