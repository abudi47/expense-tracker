import { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ScreenHeader } from '../components/ui';
import { AccountCard, EmptyState, ErrorState } from '../components/design';
import { GradientCard, SoftGlow } from '../components/GradientCard';
import { AnimatedBalance } from '../components/AnimatedBalance';
import { SkeletonAccountCards, SkeletonCard } from '../components/Skeleton';
import { api, AccountsSummary } from '../services/api';
import { formatCurrency } from '../utils/format';
import { useAuth } from '../context/AuthContext';
import { theme, fonts, palette } from '../theme';
import { RootStackParamList } from '../navigation/types';
import { haptics } from '../utils/haptics';

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
        subtitle={`Hello, ${user?.name?.split(' ')[0] || 'there'}`}
        right={
          <TouchableOpacity
            onPress={() => navigation.navigate('ManageAccounts')}
            className="p-2.5 rounded-full"
            style={{ backgroundColor: palette.primary + '18' }}
          >
            <Ionicons name="settings-outline" size={22} color={palette.primary} />
          </TouchableOpacity>
        }
      />

      <View className="px-5">
        <View
          className="flex-row mb-4 rounded-xl p-1"
          style={{ backgroundColor: palette.primary + '14' }}
        >
          {(['ETB', 'USD'] as const).map((c) => (
              <Pressable
              key={c}
              onPress={() => {
                haptics.selection();
                switchCurrency(c);
              }}
              className="flex-1 py-2.5 rounded-lg items-center"
              style={
                displayCurrency === c
                  ? {
                      backgroundColor: palette.primary,
                      shadowColor: palette.primary,
                      shadowOpacity: 0.35,
                      shadowRadius: 6,
                      shadowOffset: { width: 0, height: 2 },
                      elevation: 3,
                    }
                  : undefined
              }
            >
              <Text
                style={{
                  fontFamily: fonts.semibold,
                  fontSize: 13,
                  color: displayCurrency === c ? '#fff' : palette.primary,
                }}
              >
                View in {c}
              </Text>
            </Pressable>
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
              <GradientCard style={{ marginBottom: 16 }}>
                <SoftGlow />
                <Text
                  style={{
                    fontFamily: fonts.medium,
                    fontSize: 13,
                    color: 'rgba(255,255,255,0.8)',
                  }}
                >
                  Total Assets ({displayCurrency})
                </Text>
                <AnimatedBalance
                  value={summary.totalConverted || 0}
                  currency={displayCurrency}
                  style={{ fontSize: 34, lineHeight: 42, color: '#fff', marginTop: 6 }}
                />
                {fx ? (
                  <Text
                    style={{
                      fontFamily: fonts.regular,
                      fontSize: 11,
                      color: 'rgba(255,255,255,0.65)',
                      marginTop: 10,
                    }}
                  >
                    Crypto/Grey 1 USD = {fx.cryptoUsdToEtb} Br · Bank 1 USD = {fx.bankUsdToEtb} Br
                  </Text>
                ) : null}
                <View className="flex-row mt-4 gap-3">
                  <TouchableOpacity
                    onPress={() => navigation.navigate('Transfer')}
                    className="flex-row items-center px-3.5 py-2 rounded-full"
                    style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
                  >
                    <Ionicons name="swap-horizontal" size={16} color="#fff" />
                    <Text
                      style={{
                        fontFamily: fonts.semibold,
                        fontSize: 12,
                        color: '#fff',
                        marginLeft: 6,
                      }}
                    >
                      Transfer
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => navigation.navigate('ManageAccounts')}
                    className="flex-row items-center px-3.5 py-2 rounded-full"
                    style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
                  >
                    <Ionicons name="add" size={16} color="#fff" />
                    <Text
                      style={{
                        fontFamily: fonts.semibold,
                        fontSize: 12,
                        color: '#fff',
                        marginLeft: 6,
                      }}
                    >
                      Add account
                    </Text>
                  </TouchableOpacity>
                </View>
              </GradientCard>
            </Animated.View>

            {summary.totalsByCurrency.length > 1 && (
              <View className={`${theme.card} rounded-2xl p-4 mb-4`}>
                <Text
                  className={`${theme.subtitle} text-xs uppercase mb-2`}
                  style={{ fontFamily: fonts.semibold, letterSpacing: 0.6 }}
                >
                  By original currency
                </Text>
                {summary.totalsByCurrency.map((t) => (
                  <View key={t.currency} className="flex-row justify-between py-1.5">
                    <Text className={theme.subtitle} style={{ fontFamily: fonts.medium }}>
                      {t.currency}
                    </Text>
                    <Text
                      className={theme.title}
                      style={{ fontFamily: fonts.semibold, fontVariant: ['tabular-nums'] }}
                    >
                      {formatCurrency(t.total, t.currency)}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            <View className="flex-row justify-between items-center mb-3">
              <Text className={theme.title} style={{ fontFamily: fonts.semibold, fontSize: 18 }}>
                Your Accounts
              </Text>
              <Text
                style={{ fontFamily: fonts.medium, fontSize: 12, color: palette.primary }}
              >
                {summary.accounts.length} total
              </Text>
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
              <View
                className={`${theme.card} rounded-2xl p-4 mt-4`}
                style={{ borderColor: palette.warning + '55', borderWidth: 1 }}
              >
                <Text
                  className={`${theme.subtitle} text-xs uppercase`}
                  style={{ fontFamily: fonts.semibold }}
                >
                  Legacy Data
                </Text>
                <Text
                  className={`${theme.title} text-sm mt-1`}
                  style={{ fontFamily: fonts.regular }}
                >
                  {summary.legacyTransactionCount} old transaction(s) not linked to accounts
                </Text>
              </View>
            )}
          </>
        ) : null}
      </View>
    </ScrollView>
  );
}
