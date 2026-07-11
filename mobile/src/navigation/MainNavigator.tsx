import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import AssetsDashboardScreen from '../screens/AssetsDashboardScreen';
import TransactionListScreen from '../screens/TransactionListScreen';
import InsightsScreen from '../screens/InsightsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { MainTabParamList } from './types';
import { useTheme } from '../context/ThemeContext';
import { palette } from '../theme';

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainNavigator() {
  const { isDark } = useTheme();
  const tabColors = isDark ? palette.dark.tabBar : palette.light.tabBar;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: tabColors.bg,
          borderTopColor: tabColors.border,
          paddingBottom: 4,
          height: 60,
        },
        tabBarActiveTintColor: tabColors.active,
        tabBarInactiveTintColor: tabColors.inactive,
        tabBarIcon: ({ color, size }) => {
          const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
            Assets: 'wallet',
            Transactions: 'list-outline',
            Insights: 'bar-chart-outline',
            Settings: 'settings-outline',
          };
          return <Ionicons name={icons[route.name]} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Assets" component={AssetsDashboardScreen} />
      <Tab.Screen name="Transactions" component={TransactionListScreen} />
      <Tab.Screen name="Insights" component={InsightsScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}
