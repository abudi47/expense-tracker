import { useCallback, useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { PieChart, LineChart, BarChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Card, ScreenHeader } from '../components/ui';
import { EmptyState, ErrorState } from '../components/design';
import { SkeletonCard } from '../components/Skeleton';
import BudgetsSection from '../components/BudgetsSection';
import ReportsSection from '../components/ReportsSection';
import { api, DashboardSummary } from '../services/api';
import { formatCurrency, percentChange } from '../utils/format';
import { RootStackParamList } from '../navigation/types';
import { theme, typography, palette } from '../theme';
import { useChartConfig, PIE_COLORS, useThemeColors } from '../theme/useThemeColors';

const screenWidth = Dimensions.get('window').width;

export default function InsightsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const colors = useThemeColors();
  const chartConfig = useChartConfig();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadSummary = async () => {
    try {
      const data = await api.get<DashboardSummary>('/dashboard/summary');
      setSummary(data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load insights');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { loadSummary(); }, []));

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSummary();
    setRefreshing(false);
  };

  const expenseChange = summary
    ? percentChange(summary.thisMonth.expenses, summary.lastMonth.expenses)
    : 0;

  const pieData = useMemo(
    () =>
      summary?.spendingByCategory.slice(0, 7).map((item, i) => ({
        name: item.category.length > 10 ? item.category.slice(0, 10) + '…' : item.category,
        amount: item.total,
        color: PIE_COLORS[i % PIE_COLORS.length],
        legendFontColor: colors.chartLabel,
        legendFontSize: 12,
      })) || [],
    [summary, colors.chartLabel]
  );

  const trendLabels = summary?.monthlyTrend.map((m) => m.month) || [];
  const trendIncome = summary?.monthlyTrend.map((m) => m.income) || [];
  const trendExpenses = summary?.monthlyTrend.map((m) => m.expenses) || [];

  return (
    <View className={`flex-1 ${theme.screen}`}>
      <ScrollView
        contentContainerClassName="pb-24"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.primary} />
        }
      >
        <ScreenHeader title="Insights" subtitle="Spending trends & budgets" />

        {error ? (
          <View className="px-5"><ErrorState message={error} onRetry={loadSummary} /></View>
        ) : null}

        {loading ? (
          <View className="px-5">
            <SkeletonCard />
            <SkeletonCard />
          </View>
        ) : summary ? (
          <View className="px-5">
            <Animated.View entering={FadeInDown.duration(400)}>
              <Card className="mb-4 bg-accent/10 border-accent/30">
                <Text className={`${theme.subtitle} text-sm`}>Net Flow (Accounts)</Text>
                <Text className={`${theme.title} ${typography.display} mt-1`}>
                  {formatCurrency(summary.balance)}
                </Text>
                <View className="flex-row mt-3 gap-4">
                  <View>
                    <Text className="text-green-500 text-xs">Income</Text>
                    <Text className={`${theme.title} font-semibold`}>
                      {formatCurrency(summary.totalIncome)}
                    </Text>
                  </View>
                  <View>
                    <Text className="text-red-500 text-xs">Expenses</Text>
                    <Text className={`${theme.title} font-semibold`}>
                      {formatCurrency(summary.totalExpenses)}
                    </Text>
                  </View>
                </View>
              </Card>
            </Animated.View>

            {(summary.legacy?.income > 0 || summary.legacy?.expenses > 0) && (
              <Card className="mb-4 border-amber-300 dark:border-amber-700">
                <Text className={`${theme.subtitle} text-xs font-semibold uppercase`}>Legacy Balance</Text>
                <Text className={`${theme.title} text-lg font-bold mt-1`}>
                  {formatCurrency(summary.legacy.balance)}
                </Text>
              </Card>
            )}

            <View className="flex-row gap-3 mb-4">
              <Card className="flex-1">
                <Text className={`${theme.subtitle} text-xs`}>This Month</Text>
                <Text className={`${theme.title} text-lg font-bold mt-1`}>
                  {formatCurrency(summary.thisMonth.net)}
                </Text>
              </Card>
              <Card className="flex-1">
                <Text className={`${theme.subtitle} text-xs`}>vs Last Month</Text>
                <Text
                  className={`text-lg font-bold mt-1 ${expenseChange <= 0 ? 'text-green-500' : 'text-red-500'}`}
                >
                  {expenseChange > 0 ? '+' : ''}{expenseChange}% expenses
                </Text>
              </Card>
            </View>

            {summary.budgetAlerts.length > 0 && (
              <Card className="mb-4 border-yellow-500/40">
                <View className="flex-row items-center mb-2">
                  <Ionicons name="warning" size={18} color={palette.warning} />
                  <Text className="text-yellow-500 font-semibold ml-2">Budget Alerts</Text>
                </View>
                {summary.budgetAlerts.map((alert) => (
                  <View key={alert.category} className={`py-2 border-t ${theme.divider}`}>
                    <View className="flex-row justify-between">
                      <Text className={theme.title}>{alert.category}</Text>
                      <Text className={alert.status === 'over' ? 'text-red-500' : 'text-yellow-500'}>
                        {alert.percentage}%
                      </Text>
                    </View>
                    <Text className={`${theme.subtitle} text-xs mt-0.5`}>
                      {formatCurrency(alert.spent)} of {formatCurrency(alert.monthlyLimit)}
                    </Text>
                  </View>
                ))}
              </Card>
            )}

            {pieData.length > 0 ? (
              <Card className="mb-4 items-center">
                <Text className={`${theme.title} font-semibold self-start mb-2`}>By Category</Text>
                <PieChart
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
            ) : (
              <EmptyState icon="pie-chart-outline" title="No spending data yet" />
            )}

            {trendLabels.length > 0 && (
              <Card className="mb-4">
                <Text className={`${theme.title} font-semibold mb-2`}>6-Month Trend</Text>
                <LineChart
                  data={{
                    labels: trendLabels,
                    datasets: [
                      { data: trendIncome.length ? trendIncome : [0], color: () => palette.income },
                      { data: trendExpenses.length ? trendExpenses : [0], color: () => palette.expense },
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

            {summary.spendingByCategory.length > 0 && (
              <Card className="mb-4">
                <Text className={`${theme.title} font-semibold mb-2`}>Top Categories</Text>
                <BarChart
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

            <BudgetsSection />
            <ReportsSection />
          </View>
        ) : null}
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
