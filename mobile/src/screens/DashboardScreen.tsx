import { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';import { PieChart, LineChart, BarChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import { Card, ScreenHeader } from '../components/ui';
import { api, DashboardSummary } from '../services/api';
import { formatCurrency, percentChange } from '../utils/format';
import { useAuth } from '../context/AuthContext';
import { RootStackParamList } from '../navigation/types';
import { theme } from '../theme';
const screenWidth = Dimensions.get('window').width;
const chartConfig = {
  backgroundColor: '#1e293b',
  backgroundGradientFrom: '#1e293b',
  backgroundGradientTo: '#334155',
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(148, 163, 184, ${opacity})`,
  propsForDots: { r: '4', strokeWidth: '2', stroke: '#3b82f6' },
};

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

export default function DashboardScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadSummary = async () => {
    try {
      const data = await api.get<DashboardSummary>('/dashboard/summary');
      setSummary(data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadSummary();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSummary();
    setRefreshing(false);
  };

  const expenseChange = summary
    ? percentChange(summary.thisMonth.expenses, summary.lastMonth.expenses)
    : 0;

  const pieData =
    summary?.spendingByCategory.slice(0, 7).map((item, i) => ({
      name: item.category.length > 10 ? item.category.slice(0, 10) + '…' : item.category,
      amount: item.total,
      color: PIE_COLORS[i % PIE_COLORS.length],
      legendFontColor: '#94a3b8',
      legendFontSize: 12,
    })) || [];

  const trendLabels = summary?.monthlyTrend.map((m) => m.month) || [];
  const trendIncome = summary?.monthlyTrend.map((m) => m.income) || [];
  const trendExpenses = summary?.monthlyTrend.map((m) => m.expenses) || [];

  return (
    <View className={`flex-1 ${theme.screen}`}>
    <ScrollView
      className="flex-1"
      contentContainerClassName="pb-24"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />}
    >
      <ScreenHeader title="Dashboard" subtitle={`Hello, ${user?.name?.split(' ')[0] || 'there'}`} />
      {error ? (
        <View className="mx-5 mb-4 bg-red-900/30 border border-red-700 rounded-xl p-3">
          <Text className="text-red-300 text-sm">{error}</Text>
        </View>
      ) : null}

      <View className="px-5">
        <Card className="mb-4 bg-accent/10 dark:bg-accent/10 border-accent/30">
          <Text className={`${theme.subtitle} text-sm`}>Current Balance</Text>
          <Text className={`${theme.title} text-3xl font-bold mt-1`}>            {summary ? formatCurrency(summary.balance) : '—'}
          </Text>
          <View className="flex-row mt-3 gap-4">
            <View>
              <Text className="text-green-400 text-xs">Income</Text>
              <Text className={`${theme.title} font-semibold`}>                {summary ? formatCurrency(summary.totalIncome) : '—'}
              </Text>
            </View>
            <View>
              <Text className="text-red-400 text-xs">Expenses</Text>
              <Text className={`${theme.title} font-semibold`}>                {summary ? formatCurrency(summary.totalExpenses) : '—'}
              </Text>
            </View>
          </View>
        </Card>

        <View className="flex-row gap-3 mb-4">
          <Card className="flex-1">
            <Text className={`${theme.subtitle} text-xs`}>This Month</Text>
            <Text className={`${theme.title} text-lg font-bold mt-1`}>              {summary ? formatCurrency(summary.thisMonth.net) : '—'}
            </Text>
            <Text className="text-navy-500 text-xs mt-1">
              {summary
                ? `${formatCurrency(summary.thisMonth.income)} in · ${formatCurrency(summary.thisMonth.expenses)} out`
                : ''}
            </Text>
          </Card>
          <Card className="flex-1">
            <Text className={`${theme.subtitle} text-xs`}>vs Last Month</Text>            <Text
              className={`text-lg font-bold mt-1 ${expenseChange <= 0 ? 'text-green-400' : 'text-red-400'}`}
            >
              {summary ? `${expenseChange > 0 ? '+' : ''}${expenseChange}% expenses` : '—'}
            </Text>
            <Text className="text-navy-500 text-xs mt-1">
              Last: {summary ? formatCurrency(summary.lastMonth.expenses) : '—'}
            </Text>
          </Card>
        </View>

        {summary && summary.budgetAlerts.length > 0 && (
          <Card className="mb-4 border-yellow-600/50">
            <View className="flex-row items-center mb-2">
              <Ionicons name="warning" size={18} color="#f59e0b" />
              <Text className="text-yellow-400 font-semibold ml-2">Budget Alerts</Text>
            </View>
            {summary.budgetAlerts.map((alert) => (
              <View
                key={alert.category}
                className={`py-2 border-t border-navy-700 ${alert.status === 'over' ? '' : ''}`}
              >
                <View className="flex-row justify-between">
                  <Text className={theme.title}>{alert.category}</Text>                  <Text
                    className={alert.status === 'over' ? 'text-red-400' : 'text-yellow-400'}
                  >
                    {alert.percentage}%
                  </Text>
                </View>
                <Text className="text-navy-400 text-xs mt-0.5">
                  {formatCurrency(alert.spent)} of {formatCurrency(alert.monthlyLimit)}
                </Text>
              </View>
            ))}
          </Card>
        )}

        {pieData.length > 0 && (
          <Card className="mb-4 items-center">
            <Text className={`${theme.title} font-semibold self-start mb-2`}>Spending by Category</Text>            <PieChart
              data={pieData}
              width={screenWidth - 72}
              height={180}
              chartConfig={chartConfig}
              accessor="amount"
              backgroundColor="transparent"
              paddingLeft="12"
              absolute
            />
          </Card>
        )}

        {trendLabels.length > 0 && (
          <Card className="mb-4">
            <Text className={`${theme.title} font-semibold mb-2`}>Income vs Expenses (6 months)</Text>            <LineChart
              data={{
                labels: trendLabels,
                datasets: [
                  { data: trendIncome.length ? trendIncome : [0], color: () => '#10b981' },
                  { data: trendExpenses.length ? trendExpenses : [0], color: () => '#ef4444' },
                ],
                legend: ['Income', 'Expenses'],
              }}
              width={screenWidth - 72}
              height={200}
              chartConfig={chartConfig}
              bezier
              style={{ borderRadius: 12 }}
            />
          </Card>
        )}

        {summary && summary.spendingByCategory.length > 0 && (
          <Card className="mb-4">
            <Text className={`${theme.title} font-semibold mb-2`}>Category Breakdown</Text>            <BarChart
              data={{
                labels: summary.spendingByCategory.slice(0, 5).map((c) =>
                  c.category.length > 6 ? c.category.slice(0, 6) : c.category
                ),
                datasets: [{ data: summary.spendingByCategory.slice(0, 5).map((c) => c.total) }],
              }}
              width={screenWidth - 72}
              height={200}
              chartConfig={chartConfig}
              yAxisLabel="$"
              yAxisSuffix=""
              style={{ borderRadius: 12 }}
            />
          </Card>
        )}
      </View>
    </ScrollView>

      <TouchableOpacity
        onPress={() => navigation.navigate('AddTransaction', {})}
        className="absolute bottom-6 right-5 w-14 h-14 rounded-full bg-accent items-center justify-center shadow-lg"
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}