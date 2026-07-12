import { useCallback, useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  Dimensions,
  Pressable,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { PieChart, LineChart, BarChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Card, ScreenHeader } from '../components/ui';
import { EmptyState, ErrorState } from '../components/design';
import { GradientCard, SoftGlow } from '../components/GradientCard';
import { AnimatedBalance } from '../components/AnimatedBalance';
import { SkeletonCard } from '../components/Skeleton';
import BudgetsSection from '../components/BudgetsSection';
import ReportsSection from '../components/ReportsSection';
import { api, DashboardSummary } from '../services/api';
import { formatCurrency, percentChange } from '../utils/format';
import { RootStackParamList } from '../navigation/types';
import { theme, fonts, palette } from '../theme';
import { useChartConfig, PIE_COLORS, useThemeColors } from '../theme/useThemeColors';
import { haptics } from '../utils/haptics';
import { onDataRefresh } from '../utils/dataRefresh';

const screenWidth = Dimensions.get('window').width;
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function InsightsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const colors = useThemeColors();
  const chartConfig = useChartConfig();
  const fabScale = useSharedValue(1);
  const fabStyle = useAnimatedStyle(() => ({ transform: [{ scale: fabScale.value }] }));
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadSummary = useCallback(async () => {
    try {
      const data = await api.get<DashboardSummary>('/dashboard/summary');
      setSummary(data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load insights');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSummary();
      return onDataRefresh(() => {
        loadSummary();
      });
    }, [loadSummary])
  );

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
              <GradientCard style={{ marginBottom: 16 }}>
                <SoftGlow />
                <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>
                  Net Flow (Accounts)
                </Text>
                <AnimatedBalance
                  value={summary.balance}
                  style={{ fontSize: 32, lineHeight: 40, color: '#fff', marginTop: 6 }}
                />
                <View className="flex-row mt-4 gap-6">
                  <View>
                    <Text style={{ fontFamily: fonts.medium, fontSize: 11, color: '#6EE7B7' }}>
                      Income
                    </Text>
                    <Text
                      style={{
                        fontFamily: fonts.semibold,
                        fontSize: 15,
                        color: '#fff',
                        fontVariant: ['tabular-nums'],
                      }}
                    >
                      {formatCurrency(summary.totalIncome)}
                    </Text>
                  </View>
                  <View>
                    <Text style={{ fontFamily: fonts.medium, fontSize: 11, color: '#FCA5A5' }}>
                      Expenses
                    </Text>
                    <Text
                      style={{
                        fontFamily: fonts.semibold,
                        fontSize: 15,
                        color: '#fff',
                        fontVariant: ['tabular-nums'],
                      }}
                    >
                      {formatCurrency(summary.totalExpenses)}
                    </Text>
                  </View>
                </View>
              </GradientCard>
            </Animated.View>

            {(summary.legacy?.income > 0 || summary.legacy?.expenses > 0) && (
              <Card className="mb-4" style={{ borderColor: palette.warning + '55', borderWidth: 1 }}>
                <Text
                  className={`${theme.subtitle} text-xs uppercase`}
                  style={{ fontFamily: fonts.semibold }}
                >
                  Legacy Balance
                </Text>
                <Text
                  className={`${theme.title} text-lg mt-1`}
                  style={{ fontFamily: fonts.bold, fontVariant: ['tabular-nums'] }}
                >
                  {formatCurrency(summary.legacy.balance)}
                </Text>
              </Card>
            )}

            <View className="flex-row gap-3 mb-4">
              <Card className="flex-1">
                <Text className={`${theme.subtitle} text-xs`} style={{ fontFamily: fonts.medium }}>
                  This Month
                </Text>
                <Text
                  className={`${theme.title} text-lg mt-1`}
                  style={{ fontFamily: fonts.bold, fontVariant: ['tabular-nums'] }}
                >
                  {formatCurrency(summary.thisMonth.net)}
                </Text>
              </Card>
              <Card className="flex-1">
                <Text className={`${theme.subtitle} text-xs`} style={{ fontFamily: fonts.medium }}>
                  vs Last Month
                </Text>
                <Text
                  style={{
                    fontFamily: fonts.bold,
                    fontSize: 18,
                    marginTop: 4,
                    color: expenseChange <= 0 ? palette.income : palette.expense,
                  }}
                >
                  {expenseChange > 0 ? '+' : ''}
                  {expenseChange}% expenses
                </Text>
              </Card>
            </View>

            {summary.budgetAlerts.length > 0 && (
              <Card className="mb-4" style={{ borderColor: palette.warning + '66', borderWidth: 1 }}>
                <View className="flex-row items-center mb-2">
                  <Ionicons name="warning" size={18} color={palette.warning} />
                  <Text
                    style={{
                      fontFamily: fonts.semibold,
                      marginLeft: 8,
                      color: palette.warning,
                    }}
                  >
                    Budget Alerts
                  </Text>
                </View>
                {summary.budgetAlerts.map((alert) => (
                  <View key={alert.category} className={`py-2 border-t ${theme.divider}`}>
                    <View className="flex-row justify-between">
                      <Text className={theme.title} style={{ fontFamily: fonts.medium }}>
                        {alert.category}
                      </Text>
                      <Text
                        style={{
                          fontFamily: fonts.semibold,
                          color: alert.status === 'over' ? palette.expense : palette.warning,
                        }}
                      >
                        {alert.percentage}%
                      </Text>
                    </View>
                    <Text className={`${theme.subtitle} text-xs mt-0.5`} style={{ fontFamily: fonts.regular }}>
                      {formatCurrency(alert.spent)} of {formatCurrency(alert.monthlyLimit)}
                    </Text>
                  </View>
                ))}
              </Card>
            )}

            {pieData.length > 0 ? (
              <Animated.View entering={FadeInDown.delay(100).duration(400)}>
                <Card className="mb-4 items-center">
                  <Text
                    className={`${theme.title} self-start mb-2`}
                    style={{ fontFamily: fonts.semibold }}
                  >
                    By Category
                  </Text>
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
              </Animated.View>
            ) : (
              <EmptyState icon="pie-chart-outline" title="No spending data yet" subtitle="Add expenses to see your breakdown" />
            )}

            {trendLabels.length > 0 && (
              <Card className="mb-4">
                <Text className={theme.title} style={{ fontFamily: fonts.semibold, marginBottom: 8 }}>
                  6-Month Trend
                </Text>
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
                <Text className={theme.title} style={{ fontFamily: fonts.semibold, marginBottom: 8 }}>
                  Top Categories
                </Text>
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
                  yAxisLabel=""
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

      <AnimatedPressable
        onPress={() => {
          haptics.light();
          navigation.navigate('AddTransaction', {});
        }}
        onPressIn={() => {
          fabScale.value = withSpring(0.9);
        }}
        onPressOut={() => {
          fabScale.value = withSpring(1);
        }}
        style={[
          fabStyle,
          {
            position: 'absolute',
            bottom: 24,
            right: 20,
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: palette.primary,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: palette.primary,
            shadowOpacity: 0.45,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 4 },
            elevation: 6,
          },
        ]}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </AnimatedPressable>
    </View>
  );
}
