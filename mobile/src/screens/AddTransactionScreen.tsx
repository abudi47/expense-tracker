import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Input, Button } from '../components/ui';
import { api, Category, Transaction } from '../services/api';
import { toInputDate } from '../utils/format';
import { RootStackParamList } from '../navigation/types';
import { theme } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'AddTransaction'>;

export default function AddTransactionScreen({ navigation, route }: Props) {
  const existing = route.params?.transaction as Transaction | undefined;
  const isEdit = !!existing;

  const [type, setType] = useState<'income' | 'expense'>(existing?.type || 'expense');
  const [amount, setAmount] = useState(existing ? String(existing.amount) : '');
  const [category, setCategory] = useState(existing?.category || '');
  const [source, setSource] = useState(existing?.source || '');
  const [date, setDate] = useState(existing ? toInputDate(existing.date) : toInputDate(new Date()));
  const [note, setNote] = useState(existing?.note || '');
  const [isRecurring, setIsRecurring] = useState(existing?.isRecurring || false);
  const [customCategory, setCustomCategory] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<Category[]>(`/dashboard/categories?type=${type}`).then(setCategories).catch(() => {});
  }, [type]);

  const handleSave = async () => {
    const parsedAmount = parseFloat(amount);
    const finalCategory = category === '__custom__' ? customCategory.trim() : category;

    if (!parsedAmount || parsedAmount <= 0) {
      setError('Enter a valid amount');
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

    const payload = {
      type,
      amount: parsedAmount,
      category: finalCategory,
      source: type === 'income' ? source.trim() : undefined,
      date: new Date(date).toISOString(),
      note: note.trim(),
      isRecurring,
    };

    try {
      if (isEdit && existing) {
        await api.put(`/transactions/${existing._id}`, payload);
      } else {
        await api.post('/transactions', payload);
      }
      navigation.goBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
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
          navigation.goBack();
        },
      },
    ]);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className={`flex-1 ${theme.screen}`}
    >
      <ScrollView contentContainerClassName="px-5 py-6 pb-12" keyboardShouldPersistTaps="handled">
        <Text className="text-white text-2xl font-bold mb-6">
          {isEdit ? 'Edit Transaction' : 'Add Transaction'}
        </Text>

        <View className="flex-row mb-6 bg-navy-800 rounded-xl p-1">
          {(['expense', 'income'] as const).map((t) => (
            <TouchableOpacity
              key={t}
              onPress={() => {
                setType(t);
                setCategory('');
              }}
              className={`flex-1 py-3 rounded-lg items-center ${type === t ? 'bg-accent' : ''}`}
            >
              <Text className={`font-semibold capitalize ${type === t ? 'text-white' : 'text-navy-400'}`}>
                {t}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {error ? (
          <View className="bg-red-900/30 border border-red-700 rounded-xl p-3 mb-4">
            <Text className="text-red-300 text-sm">{error}</Text>
          </View>
        ) : null}

        <Input
          label="Amount"
          value={amount}
          onChangeText={setAmount}
          placeholder="0.00"
          keyboardType="decimal-pad"
        />

        {type === 'income' && (
          <Input
            label="Source"
            value={source}
            onChangeText={setSource}
            placeholder="Salary, Freelance, etc."
          />
        )}

        <Text className="text-navy-300 text-sm mb-2 font-medium">Category</Text>
        <View className="flex-row flex-wrap gap-2 mb-4">
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat._id}
              onPress={() => setCategory(cat.name)}
              className={`px-3 py-2 rounded-full border ${category === cat.name ? 'bg-accent border-accent' : 'bg-navy-800 border-navy-600'}`}
            >
              <Text className={category === cat.name ? 'text-white text-sm' : 'text-navy-300 text-sm'}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            onPress={() => setCategory('__custom__')}
            className={`px-3 py-2 rounded-full border ${category === '__custom__' ? 'bg-accent border-accent' : 'bg-navy-800 border-navy-600'}`}
          >
            <Text className={category === '__custom__' ? 'text-white text-sm' : 'text-navy-300 text-sm'}>
              Custom
            </Text>
          </TouchableOpacity>
        </View>

        {category === '__custom__' && (
          <Input
            label="Custom Category"
            value={customCategory}
            onChangeText={setCustomCategory}
            placeholder="Enter category name"
          />
        )}

        <Input label="Date (YYYY-MM-DD)" value={date} onChangeText={setDate} placeholder="2026-07-10" />

        <Input
          label="Note (optional)"
          value={note}
          onChangeText={setNote}
          placeholder="Add a note..."
          multiline
        />

        <View className="flex-row items-center justify-between mb-6 bg-navy-800 rounded-xl px-4 py-3">
          <View>
            <Text className="text-white font-medium">Recurring</Text>
            <Text className="text-navy-400 text-xs">Mark as recurring income/expense</Text>
          </View>
          <Switch
            value={isRecurring}
            onValueChange={setIsRecurring}
            trackColor={{ false: '#334e68', true: '#3b82f6' }}
            thumbColor="#fff"
          />
        </View>

        <Button title={isEdit ? 'Update' : 'Save'} onPress={handleSave} loading={loading} />

        {isEdit && (
          <View className="mt-3">
            <Button title="Delete Transaction" onPress={handleDelete} variant="danger" />
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
