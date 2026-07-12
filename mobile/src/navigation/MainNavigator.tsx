import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AssetsDashboardScreen from '../screens/AssetsDashboardScreen';
import TransactionListScreen from '../screens/TransactionListScreen';
import InsightsScreen from '../screens/InsightsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { MainTabParamList } from './types';
import { AnimatedTabBar } from '../components/AnimatedTabBar';

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <AnimatedTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Assets" component={AssetsDashboardScreen} />
      <Tab.Screen name="Transactions" component={TransactionListScreen} />
      <Tab.Screen name="Insights" component={InsightsScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}
