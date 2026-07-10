import { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Card, ScreenHeader } from '../components/ui';
import { AccountCard, EmptyState, ErrorState } from '../components/design';
import { SkeletonAccountCards, SkeletonCard } from '../components/Skeleton';
import { api, AccountsSummary } from '../services/api';
import { formatCurrency } from '../utils/format';
import { useAuth } from '../context/AuthContext';
import { theme, typography, palette } from '../theme';
import { RootStackParamList } from '../navigation/types';

export default function AssetsDashboardScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [summary, setSummary] = useState<AccountsSummary | null>(null);
  const [displayCurrency, setDisplayCurrency] = useState<'ETB' | 'USD'>('ETB');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async (currency?: 'ETB' | 'USD') => {
    try {
      const view = currency || displayCurrency;
      const data = await api.get<AccountsSummary>(
        `/accounts/summary?displayCurrency=${view}`
      );
      setSummary(data);
      setDisplayCurrency(data.displayCurrency);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load assets');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const switchCurrency = async (next: 'ETB' | 'USD') => {
    setDisplayCurrency(next);
    setLoading(true);
    try {
      await api.put('/settings/fx', { displayCurrency: next });
      await load(next);
    } catch {
      await load(next);
    } finally {
      setLoading(false);
    }
  };

  const fx = summary?.fx;

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
        <View className="flex-row mb-4 bg-slate-200 dark:bg-navy-800 rounded-xl p-1">
          {(['ETB', 'USD'] as const).map((c) => (
            <TouchableOpacity
              key={c}
              onPress={() => switchCurrency(c)}
              className={`flex-1 py-2.5 rounded-lg items-center ${
                displayCurrency === c ? 'bg-accent' : ''
              }`}
            >
              <Text
                className={`font-semibold text-sm ${
                  displayCurrency === c ? 'text-white' : theme.subtitle
                }`}
              >
                View in {c}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {error ? <ErrorState message={error} onRetry={() => load()} /> : null}

        {loading && !summary ? (
          <>
            <SkeletonCard />
            <SkeletonAccountCards />
          </>
        ) : summary ? (
          <>
            <Animated.View entering={FadeInDown.duration(400)}>
              <Card className="mb-3 bg-accent/10 border-accent/30">
                <Text className={`${theme.subtitle} text-sm`}>
                  Total Assets ({displayCurrency})
                </Text>
                <Text className={`${theme.title} ${typography.display} mt-1`}>
                  {formatCurrency(summary.totalConverted || 0, displayCurrency)}
                </Text>
                {fx ? (
                  <Text className={`${theme.subtitle} text-xs mt-2`}>
                    Rates: Crypto/Grey 1 USD = {fx.cryptoUsdToEtb} Br · Bank 1 USD ={' '}
                    {fx.bankUsdToEtb} Br
                  </Text>
                ) : null}
              </Card>
            </Animated.View>

            {summary.totalsByCurrency.length > 1 && (
              <Card className="mb-4">
                <Text className={`${theme.subtitle} text-xs uppercase font-semibold mb-2`}>
                  By original currency
                </Text>
                {summary.totalsByCurrency.map((t) => (
                  <View key={t.currency} className="flex-row justify-between py-1">
                    <Text className={theme.subtitle}>{t.currency}</Text>
                    <Text className={`${theme.title} font-medium`}>
                      {formatCurrency(t.total, t.currency)}
                    </Text>
                  </View>
                ))}
              </Card>
            )}

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
                    displayCurrency={displayCurrency}
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
