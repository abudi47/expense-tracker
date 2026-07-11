import { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { PieChart, LineChart, BarChart } from 'react-native-chart-kit';
import { Card, ScreenHeader } from '../components/ui';
import { AccountCard, EmptyState, ErrorState } from '../components/design';
import { SkeletonAccountCards, SkeletonCard } from '../components/Skeleton';
import { api, AccountsSummary } from '../services/api';
import { formatCurrency } from '../utils/format';
import { useAuth } from '../context/AuthContext';
import { theme, typography } from '../theme';
import { useThemeColors, useChartConfig, PIE_COLORS } from '../theme/useThemeColors';
import { RootStackParamList } from '../navigation/types';
import { palette } from '../theme';

const screenWidth = Dimensions.get('window').width;

export default function AssetsDashboardScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const colors = useThemeColors();
  const chartConfig = useChartConfig();
  const [summary, setSummary] = useState<AccountsSummary | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const data = await api.get<AccountsSummary>('/accounts/summary');
      setSummary(data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load assets');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  return (
    <ScrollView
      className={`flex-1 ${theme.screen}`}
      contentContainerClassName="pb-8"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.primary} />
      }
    >
      <ScreenHeader
        title="Assets"
        subtitle={`Hello, ${user?.name?.split(' ')[0]}`}
        right={
          <TouchableOpacity
            onPress={() => navigation.navigate('ManageAccounts')}
            className="bg-accent/15 p-2.5 rounded-full"
          >
            <Ionicons name="settings-outline" size={22} color={palette.primary} />
          </TouchableOpacity>
        }
      />

      <View className="px-5">
        {error ? <ErrorState message={error} onRetry={load} /> : null}

        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonAccountCards />
          </>
        ) : summary ? (
          <>
            <Animated.View entering={FadeInDown.duration(400)}>
              <Card className="mb-4 bg-accent/10 dark:bg-accent/10 border-accent/30">
                <Text className={`${theme.subtitle} text-sm`}>Total Assets</Text>
                {summary.totalsByCurrency.length === 0 ? (
                  <Text className={`${theme.title} ${typography.display} mt-1`}>$0.00</Text>
                ) : (
                  summary.totalsByCurrency.map((t) => (
                    <Text key={t.currency} className={`${theme.title} ${typography.display} mt-1`}>
                      {formatCurrency(t.total)} {t.currency}
                    </Text>
                  ))
                )}
              </Card>
            </Animated.View>

            <View className="flex-row justify-between items-center mb-3">
              <Text className={`${theme.title} ${typography.subheading}`}>Your Accounts</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Transfer')}>
                <Text className="text-accent text-sm font-semibold">Transfer</Text>
              </TouchableOpacity>
            </View>

            <View className="flex-row flex-wrap justify-between">
              {summary.accounts.map((account, i) => (
                <Animated.View
                  key={account._id}
                  entering={FadeInDown.delay(i * 80).duration(350)}
                  className="w-[48%]"
                >
                  <AccountCard
                    {...account}
                    onPress={() =>
                      navigation.navigate('AccountDetail', { accountId: account._id })
                    }
                  />
                </Animated.View>
              ))}
            </View>

            {summary.accounts.length === 0 && (
              <EmptyState
                icon="wallet-outline"
                title="No accounts yet"
                subtitle="Tap the gear icon to add your first account"
              />
            )}

            {summary.legacyTransactionCount > 0 && (
              <Card className="mt-4 border-amber-300 dark:border-amber-700">
                <Text className={`${theme.subtitle} text-xs uppercase font-semibold`}>
                  Legacy Data
                </Text>
                <Text className={`${theme.title} text-sm mt-1`}>
                  {summary.legacyTransactionCount} old transaction(s) not linked to accounts
                </Text>
              </Card>
            )}
          </>
        ) : null}
      </View>
    </ScrollView>
  );
}
