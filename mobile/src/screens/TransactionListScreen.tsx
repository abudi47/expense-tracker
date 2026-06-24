import { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { api, Transaction } from '../services/api';
import { formatCurrency, formatDate } from '../utils/format';
import { RootStackParamList } from '../navigation/types';
import { theme } from '../theme';

type FilterType = 'all' | 'income' | 'expense';

export default function TransactionListScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [refreshing, setRefreshing] = useState(false);

  const loadTransactions = async () => {
    const params = filter !== 'all' ? `?type=${filter}` : '';
    const data = await api.get<{ transactions: Transaction[] }>(`/transactions${params}`);
    setTransactions(data.transactions);
  };

  useFocusEffect(
    useCallback(() => {
      loadTransactions().catch(() => {});
    }, [filter])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTransactions().catch(() => {});
    setRefreshing(false);
  };

  const handleDelete = (item: Transaction) => {
    Alert.alert('Delete Transaction', 'Are you sure you want to delete this entry?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await api.delete(`/transactions/${item._id}`);
          loadTransactions();
        },
      },
    ]);
  };

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'income', label: 'Income' },
    { key: 'expense', label: 'Expenses' },
  ];

  return (
    <View className={`flex-1 ${theme.screen}`}>
      <View className="px-5 pt-14 pb-3 flex-row justify-between items-center">
        <Text className="text-white text-2xl font-bold">Transactions</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('AddTransaction', {})}
          className="bg-accent rounded-full w-10 h-10 items-center justify-center"
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View className="flex-row px-5 mb-3 gap-2">
        {filters.map((f) => (
          <TouchableOpacity
            key={f.key}
            onPress={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-full ${filter === f.key ? 'bg-accent' : 'bg-navy-800'}`}
          >
            <Text className={`text-sm font-medium ${filter === f.key ? 'text-white' : 'text-navy-400'}`}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={transactions}
        keyExtractor={(item) => item._id}
        contentContainerClassName="px-5 pb-8"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />
        }
        ListEmptyComponent={
          <View className="items-center py-16">
            <Ionicons name="receipt-outline" size={48} color="#486581" />
            <Text className="text-navy-400 mt-4">No transactions yet</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => navigation.navigate('AddTransaction', { transaction: item })}
            onLongPress={() => handleDelete(item)}
            className="bg-navy-800 rounded-xl p-4 mb-3 flex-row items-center border border-navy-700"
          >
            <View
              className={`w-10 h-10 rounded-full items-center justify-center ${item.type === 'income' ? 'bg-green-900/50' : 'bg-red-900/50'}`}
            >
              <Ionicons
                name={item.type === 'income' ? 'arrow-down' : 'arrow-up'}
                size={20}
                color={item.type === 'income' ? '#10b981' : '#ef4444'}
              />
            </View>
            <View className="flex-1 ml-3">
              <Text className="text-white font-medium">
                {item.type === 'income' ? item.source || item.category : item.category}
              </Text>
              <Text className="text-navy-400 text-xs mt-0.5">
                {formatDate(item.date)}
                {item.isRecurring ? ' · Recurring' : ''}
                {item.note ? ` · ${item.note}` : ''}
              </Text>
            </View>
            <Text
              className={`font-bold ${item.type === 'income' ? 'text-green-400' : 'text-red-400'}`}
            >
              {item.type === 'income' ? '+' : '-'}
              {formatCurrency(item.amount)}
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}
