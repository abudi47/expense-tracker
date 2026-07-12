import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Input, Button } from '../components/ui';
import { KeyboardFormScreen } from '../components/KeyboardFormScreen';
import { DatePickerField } from '../components/DatePickerField';
import { CategoryChip } from '../components/design';
import { api, Category, Transaction, Account, ApiError } from '../services/api';
import { toInputDate, formatCurrency } from '../utils/format';
import { useToast } from '../components/Toast';
import { RootStackParamList } from '../navigation/types';
import { theme, fonts, palette } from '../theme';
import { useThemeColors } from '../theme/useThemeColors';
import { haptics } from '../utils/haptics';

type Props = NativeStackScreenProps<RootStackParamList, 'AddTransaction'>;

export default function AddTransactionScreen({ navigation, route }: Props) {
  const existing = route.params?.transaction as Transaction | undefined;
  const preselectedAccountId = route.params?.accountId;
  const isEdit = !!existing;
  const { showToast } = useToast();
  const colors = useThemeColors();

  const [type, setType] = useState<'income' | 'expense'>(existing?.type as 'income' | 'expense' || 'expense');
  const [amount, setAmount] = useState(existing ? String(existing.amount) : '');
  const [category, setCategory] = useState(existing?.category || '');
  const [source, setSource] = useState(existing?.source || '');
  const [date, setDate] = useState(existing ? toInputDate(existing.date) : toInputDate(new Date()));
  const [note, setNote] = useState(existing?.note || '');
  const [isRecurring, setIsRecurring] = useState(existing?.isRecurring || false);
  const [customCategory, setCustomCategory] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountId, setAccountId] = useState(existing?.accountId || preselectedAccountId || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<Category[]>(`/dashboard/categories?type=${type}`).then(setCategories).catch(() => {});
  }, [type]);

  useEffect(() => {
    api.get<Account[]>('/accounts').then((data) => {
      setAccounts(data);
      if (!accountId && data.length > 0) setAccountId(data[0]._id);
    }).catch(() => {});
  }, []);

  const buildPayload = (allowOverdraft = false) => {
    const parsedAmount = parseFloat(amount);
    const finalCategory = category === '__custom__' ? customCategory.trim() : category;
    return {
      type,
      amount: parsedAmount,
      accountId,
      category: finalCategory,
      source: type === 'income' ? source.trim() : undefined,
      date: new Date(date).toISOString(),
      note: note.trim(),
      isRecurring,
      allowOverdraft,
    };
  };

  const handleSave = async (allowOverdraft = false) => {
    const parsedAmount = parseFloat(amount);
    const finalCategory = category === '__custom__' ? customCategory.trim() : category;

    if (!parsedAmount || parsedAmount <= 0) {
      setError('Enter a valid amount');
      return;
    }
    if (!accountId) {
      setError('Select an account');
      return;
    }
    if (!finalCategory) {
      setError('Select or enter a category');
      return;
    }
    if (type === 'income' && !source.trim()) {
      setError('Enter an income source');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = buildPayload(allowOverdraft);
      if (isEdit && existing) {
        await api.put(`/transactions/${existing._id}`, payload);
        showToast('Transaction updated', 'success');
      } else {
        await api.post('/transactions', payload);
        showToast('Transaction saved', 'success');
      }
      navigation.goBack();
    } catch (err) {
      if (err instanceof ApiError && err.code === 'OVERDRAFT') {
        haptics.warning();
        const projected = err.data?.projectedBalance as number;
        const accountName = (err.data?.accountName as string) || 'this account';
        Alert.alert(
          'Overdraft Warning',
          `This expense would bring ${accountName} to ${formatCurrency(projected)}. Continue anyway?`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Continue', onPress: () => handleSave(true) },
          ]
        );
      } else {
        haptics.error();
        setError(err instanceof Error ? err.message : 'Failed to save');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    if (!existing) return;
    Alert.alert('Delete Transaction', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await api.delete(`/transactions/${existing._id}`);
          showToast('Transaction deleted', 'info');
          navigation.goBack();
        },
      },
    ]);
  };

  const selectedAccount = accounts.find((a) => a._id === accountId);

  return (
    <KeyboardFormScreen>
      <Text className={`${theme.title} text-2xl mb-6`} style={{ fontFamily: fonts.bold }}>
        {isEdit ? 'Edit Transaction' : 'Add Transaction'}
      </Text>

      <View
        className="flex-row mb-6 rounded-xl p-1"
        style={{ backgroundColor: palette.primary + '14' }}
      >
        {(['expense', 'income'] as const).map((t) => (
          <TouchableOpacity
            key={t}
            onPress={() => {
              haptics.selection();
              setType(t);
              setCategory('');
            }}
            className="flex-1 py-3 rounded-lg items-center"
            style={type === t ? { backgroundColor: palette.primary } : undefined}
          >
            <Text
              style={{
                fontFamily: fonts.semibold,
                textTransform: 'capitalize',
                color: type === t ? '#fff' : palette.primary,
              }}
            >
              {t}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {error ? (
        <View className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-xl p-3 mb-4">
          <Text className="text-red-700 dark:text-red-300 text-sm">{error}</Text>
        </View>
      ) : null}

      <Text className={`${theme.label} text-sm mb-2 font-medium`}>Account</Text>
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
      {selectedAccount && (
        <Text className={`${theme.subtitle} text-xs mb-4`}>
          Balance: {formatCurrency(selectedAccount.balance)} {selectedAccount.currency}
        </Text>
      )}

      <Input label="Amount" value={amount} onChangeText={setAmount} placeholder="0.00" keyboardType="decimal-pad" />

      {type === 'income' && (
        <Input label="Source" value={source} onChangeText={setSource} placeholder="Salary, Freelance..." />
      )}

      <Text className={`${theme.label} text-sm mb-2 font-medium`}>Category</Text>
      <View className="flex-row flex-wrap gap-2 mb-4">
        {categories.map((cat) => (
          <CategoryChip
            key={cat._id}
            label={cat.name}
            selected={category === cat.name}
            onPress={() => setCategory(cat.name)}
          />
        ))}
        <CategoryChip label="Custom" selected={category === '__custom__'} onPress={() => setCategory('__custom__')} />
      </View>

      {category === '__custom__' && (
        <Input label="Custom Category" value={customCategory} onChangeText={setCustomCategory} placeholder="Enter category" />
      )}

      <DatePickerField label="Date" value={date} onChange={setDate} />
      <Input label="Note (optional)" value={note} onChangeText={setNote} placeholder="Add a note..." multiline />

      <View className={`flex-row items-center justify-between mb-6 ${theme.card} rounded-xl px-4 py-3`}>
        <View>
          <Text className={`${theme.title} font-medium`}>Recurring</Text>
          <Text className={`${theme.subtitle} text-xs`}>Mark as recurring</Text>
        </View>
        <Switch
          value={isRecurring}
          onValueChange={setIsRecurring}
          trackColor={{ false: colors.switchOff, true: palette.primary }}
          thumbColor="#fff"
        />
      </View>

      <Button title={isEdit ? 'Update' : 'Save'} onPress={() => handleSave()} loading={loading} />
      {isEdit && (
        <View className="mt-3">
          <Button title="Delete Transaction" onPress={handleDelete} variant="danger" />
        </View>
      )}
    </KeyboardFormScreen>
  );
}
