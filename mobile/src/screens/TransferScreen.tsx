import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Button, Input } from '../components/ui';
import { KeyboardFormScreen } from '../components/KeyboardFormScreen';
import { CategoryChip } from '../components/design';
import { api, Account, ApiError } from '../services/api';
import { useToast } from '../components/Toast';
import { theme, fonts } from '../theme';
import { RootStackParamList } from '../navigation/types';
import { formatCurrency } from '../utils/format';
import { haptics } from '../utils/haptics';

type Props = NativeStackScreenProps<RootStackParamList, 'Transfer'>;

export default function TransferScreen({ navigation }: Props) {
  const { showToast } = useToast();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<Account[]>('/accounts').then(setAccounts).catch(() => {});
  }, []);

  const submit = async (allowOverdraft = false) => {
    const parsed = parseFloat(amount);
    if (!fromId || !toId) {
      setError('Select both accounts');
      return;
    }
    if (fromId === toId) {
      setError('Accounts must be different');
      return;
    }
    if (!parsed || parsed <= 0) {
      setError('Enter a valid amount');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await api.post('/transactions', {
        type: 'transfer',
        amount: parsed,
        accountId: fromId,
        toAccountId: toId,
        note: note.trim(),
        allowOverdraft,
      });
      showToast('Transfer completed', 'success');
      navigation.goBack();
    } catch (err) {
      if (err instanceof ApiError && err.code === 'OVERDRAFT') {
        haptics.warning();
        const projected = err.data?.projectedBalance as number;
        Alert.alert(
          'Insufficient Funds',
          `This transfer would leave the account at ${formatCurrency(projected)}. Continue anyway?`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Continue', style: 'destructive', onPress: () => submit(true) },
          ]
        );
      } else {
        haptics.error();
        setError(err instanceof Error ? err.message : 'Transfer failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const fromAccount = accounts.find((a) => a._id === fromId);

  return (
    <KeyboardFormScreen>
      <Text className={`${theme.title} text-2xl mb-6`} style={{ fontFamily: fonts.bold }}>
        Transfer
      </Text>

      {error ? (
        <View className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-xl p-3 mb-4">
          <Text className="text-red-700 dark:text-red-300 text-sm">{error}</Text>
        </View>
      ) : null}

      <Text className={`${theme.label} text-sm mb-2 font-medium`}>From</Text>
      <View className="flex-row flex-wrap gap-2 mb-4">
        {accounts.map((a) => (
          <CategoryChip
            key={a._id}
            label={a.name}
            selected={fromId === a._id}
            onPress={() => setFromId(a._id)}
          />
        ))}
      </View>
      {fromAccount && (
        <Text className={`${theme.subtitle} text-xs mb-4`}>
          Available: {formatCurrency(fromAccount.balance)} {fromAccount.currency}
        </Text>
      )}

      <Text className={`${theme.label} text-sm mb-2 font-medium`}>To</Text>
      <View className="flex-row flex-wrap gap-2 mb-4">
        {accounts.filter((a) => a._id !== fromId).map((a) => (
          <CategoryChip
            key={a._id}
            label={a.name}
            selected={toId === a._id}
            onPress={() => setToId(a._id)}
          />
        ))}
      </View>

      <Input label="Amount" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0.00" />
      <Input label="Note (optional)" value={note} onChangeText={setNote} placeholder="What's this for?" />

      <Button title="Transfer" onPress={() => submit()} loading={loading} />
    </KeyboardFormScreen>
  );
}
