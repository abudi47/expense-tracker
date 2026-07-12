import { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Button, Input } from '../components/ui';
import { CategoryChip, EmptyState, ErrorState } from '../components/design';
import { KeyboardFormScreen } from '../components/KeyboardFormScreen';
import { DatePickerField } from '../components/DatePickerField';
import { api, Account, ScheduledItem, ApiError } from '../services/api';
import { formatCurrency, toInputDate } from '../utils/format';
import { theme, fonts, palette } from '../theme';
import { RootStackParamList } from '../navigation/types';
import { useToast } from '../components/Toast';
import { haptics } from '../utils/haptics';

function accountNameOf(item: ScheduledItem) {
  if (item.account?.name) return item.account.name;
  if (typeof item.accountId === 'object' && item.accountId) return item.accountId.name;
  return 'Account';
}

export default function ScheduledItemsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { showToast } = useToast();
  const [items, setItems] = useState<ScheduledItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const data = await api.get<ScheduledItem[]>('/scheduled-items');
      setItems(data.filter((i) => i.status !== 'cancelled' && i.status !== 'landed'));
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const land = async (item: ScheduledItem, force = false, allowOverdraft = false) => {
    try {
      await api.post(`/scheduled-items/${item._id}/land`, { force, allowOverdraft });
      showToast('Added to your ledger', 'success');
      load();
    } catch (err) {
      if (err instanceof ApiError && err.code === 'DUPLICATE') {
        Alert.alert('Possible duplicate', 'A similar transaction already exists. Land anyway?', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Land anyway', onPress: () => land(item, true, allowOverdraft) },
        ]);
        return;
      }
      if (err instanceof ApiError && err.code === 'OVERDRAFT') {
        Alert.alert('Overdraft', err.message, [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Continue', style: 'destructive', onPress: () => land(item, force, true) },
        ]);
        return;
      }
      showToast(err instanceof Error ? err.message : 'Failed to land', 'error');
    }
  };

  const cancel = (item: ScheduledItem) => {
    Alert.alert('Cancel scheduled item?', item.title, [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Cancel item',
        style: 'destructive',
        onPress: async () => {
          await api.delete(`/scheduled-items/${item._id}`);
          load();
        },
      },
    ]);
  };

  return (
    <View className={`flex-1 ${theme.screen}`}>
      <View className="px-5 pt-2 pb-3 flex-row justify-between items-center">
        <Text className={theme.subtitle} style={{ fontFamily: fonts.regular, fontSize: 13 }}>
          Upcoming income & bills
        </Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('AddScheduledItem')}
          className="rounded-full w-10 h-10 items-center justify-center"
          style={{ backgroundColor: palette.primary }}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {error ? <ErrorState message={error} onRetry={load} /> : null}

      <FlatList
        data={items}
        keyExtractor={(i) => i._id}
        contentContainerClassName="px-5 pb-10"
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              icon="calendar-outline"
              title="No scheduled items"
              subtitle="Track salary, rent, and bills before they land"
            />
          ) : null
        }
        renderItem={({ item }) => {
          const overdue = item.status === 'overdue';
          const color = item.direction === 'incoming' ? palette.income : palette.expense;
          return (
            <View className={`${theme.card} rounded-2xl p-4 mb-3`}>
              <View className="flex-row justify-between items-start">
                <View className="flex-1 pr-3">
                  <View className="flex-row items-center gap-2 mb-1">
                    <Text className={theme.title} style={{ fontFamily: fonts.semibold }}>
                      {item.title}
                    </Text>
                    {overdue ? (
                      <View className="px-2 py-0.5 rounded" style={{ backgroundColor: palette.warning + '33' }}>
                        <Text style={{ fontFamily: fonts.medium, fontSize: 10, color: palette.warning }}>
                          Overdue
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <Text className={theme.subtitle} style={{ fontFamily: fonts.regular, fontSize: 12 }}>
                    {new Date(item.expectedDate).toLocaleDateString()} · {accountNameOf(item)}
                    {item.recurring ? ' · Recurring' : ''}
                  </Text>
                </View>
                <Text style={{ fontFamily: fonts.bold, color, fontVariant: ['tabular-nums'] }}>
                  {item.direction === 'incoming' ? '+' : '-'}
                  {formatCurrency(item.amount, item.currency)}
                </Text>
              </View>
              <View className="flex-row gap-2 mt-3">
                <TouchableOpacity
                  onPress={() => {
                    haptics.medium();
                    Alert.alert(
                      'Confirm landing',
                      `Add ${formatCurrency(item.amount)} to your real balance as ${
                        item.direction === 'incoming' ? 'income' : 'expense'
                      }?`,
                      [
                        { text: 'Not yet', style: 'cancel' },
                        { text: 'Confirm', onPress: () => land(item) },
                      ]
                    );
                  }}
                  className="flex-1 py-2.5 rounded-xl items-center"
                  style={{ backgroundColor: palette.primary }}
                >
                  <Text style={{ fontFamily: fonts.semibold, color: '#fff', fontSize: 13 }}>
                    Mark landed
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => cancel(item)}
                  className="px-4 py-2.5 rounded-xl items-center border"
                  style={{ borderColor: palette.expense + '55' }}
                >
                  <Ionicons name="close" size={18} color={palette.expense} />
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

export function AddScheduledItemScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { showToast } = useToast();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [direction, setDirection] = useState<'incoming' | 'outgoing'>('incoming');
  const [accountId, setAccountId] = useState('');
  const [date, setDate] = useState(toInputDate(new Date()));
  const [recurring, setRecurring] = useState(false);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useFocusEffect(
    useCallback(() => {
      api.get<Account[]>('/accounts').then((data) => {
        setAccounts(data);
        if (!accountId && data[0]) setAccountId(data[0]._id);
      }).catch(() => {});
    }, [])
  );

  const save = async () => {
    const parsed = parseFloat(amount);
    if (!title.trim() || !parsed || !accountId) {
      setError('Title, amount, and account are required');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.post('/scheduled-items', {
        title: title.trim(),
        amount: parsed,
        direction,
        expectedDate: new Date(date).toISOString(),
        accountId,
        recurring,
        note: note.trim(),
      });
      showToast('Scheduled item saved', 'success');
      navigation.goBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardFormScreen>
      <Text className={`${theme.title} text-2xl mb-6`} style={{ fontFamily: fonts.bold }}>
        Schedule item
      </Text>

      <View
        className="flex-row mb-5 rounded-xl p-1"
        style={{ backgroundColor: palette.primary + '14' }}
      >
        {(['incoming', 'outgoing'] as const).map((d) => (
          <TouchableOpacity
            key={d}
            onPress={() => setDirection(d)}
            className="flex-1 py-3 rounded-lg items-center"
            style={direction === d ? { backgroundColor: palette.primary } : undefined}
          >
            <Text
              style={{
                fontFamily: fonts.semibold,
                color: direction === d ? '#fff' : palette.primary,
                textTransform: 'capitalize',
              }}
            >
              {d}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {error ? (
        <View className="bg-red-100 dark:bg-red-900/30 border border-red-300 rounded-xl p-3 mb-4">
          <Text className="text-red-700 dark:text-red-300 text-sm">{error}</Text>
        </View>
      ) : null}

      <Input label="Title" value={title} onChangeText={setTitle} placeholder="Salary, Rent..." />
      <Input label="Amount" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0.00" />
      <DatePickerField label="Expected date" value={date} onChange={setDate} />

      <Text className={`${theme.label} text-sm mb-2`} style={{ fontFamily: fonts.medium }}>
        Account
      </Text>
      <View className="flex-row flex-wrap gap-2 mb-4">
        {accounts.map((a) => (
          <CategoryChip
            key={a._id}
            label={a.name}
            selected={accountId === a._id}
            onPress={() => setAccountId(a._id)}
          />
        ))}
      </View>

      <Input label="Note (optional)" value={note} onChangeText={setNote} placeholder="Optional note" />

      <View className={`${theme.card} rounded-xl px-4 py-3 mb-6 flex-row items-center justify-between`}>
        <View>
          <Text className={theme.title} style={{ fontFamily: fonts.medium }}>Recurring monthly</Text>
          <Text className={theme.subtitle} style={{ fontFamily: fonts.regular, fontSize: 12 }}>
            Create next month after landing
          </Text>
        </View>
        <Switch
          value={recurring}
          onValueChange={setRecurring}
          trackColor={{ false: '#D1D5DB', true: palette.primary }}
        />
      </View>

      <Button title="Save" onPress={save} loading={loading} />
    </KeyboardFormScreen>
  );
}
