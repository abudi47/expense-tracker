import { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Modal,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Input, Button, Card } from '../components/ui';
import { api, Budget, Category } from '../services/api';
import { formatCurrency } from '../utils/format';
import { theme } from '../theme';

export default function BudgetsScreen() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [monthlyLimit, setMonthlyLimit] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadData = async () => {
    const [budgetData, catData] = await Promise.all([
      api.get<Budget[]>('/budgets'),
      api.get<Category[]>('/dashboard/categories?type=expense'),
    ]);
    setBudgets(budgetData);
    setCategories(catData);
  };

  useFocusEffect(
    useCallback(() => {
      loadData().catch(() => {});
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData().catch(() => {});
    setRefreshing(false);
  };

  const openModal = (budget?: Budget) => {
    if (budget) {
      setEditingId(budget._id);
      setSelectedCategory(budget.category);
      setMonthlyLimit(String(budget.monthlyLimit));
    } else {
      setEditingId(null);
      setSelectedCategory('');
      setMonthlyLimit('');
    }
    setError('');
    setModalVisible(true);
  };

  const handleSave = async () => {
    const limit = parseFloat(monthlyLimit);
    if (!selectedCategory) {
      setError('Select a category');
      return;
    }
    if (!limit || limit <= 0) {
      setError('Enter a valid monthly limit');
      return;
    }

    setLoading(true);
    try {
      if (editingId) {
        await api.put(`/budgets/${editingId}`, { category: selectedCategory, monthlyLimit: limit });
      } else {
        await api.post('/budgets', { category: selectedCategory, monthlyLimit: limit });
      }
      setModalVisible(false);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save budget');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (budget: Budget) => {
    Alert.alert('Delete Budget', `Remove budget for ${budget.category}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await api.delete(`/budgets/${budget._id}`);
          loadData();
        },
      },
    ]);
  };

  const getStatusColor = (status?: string) => {
    if (status === 'over') return 'text-red-400';
    if (status === 'warning') return 'text-yellow-400';
    return 'text-green-400';
  };

  const getBarColor = (status?: string) => {
    if (status === 'over') return 'bg-red-500';
    if (status === 'warning') return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const usedCategories = budgets.map((b) => b.category);
  const availableCategories = categories.filter((c) => !usedCategories.includes(c.name) || editingId);

  return (
    <View className={`flex-1 ${theme.screen}`}>
      <View className="px-5 pt-14 pb-3 flex-row justify-between items-center">
        <Text className="text-white text-2xl font-bold">Budgets</Text>
        <TouchableOpacity
          onPress={() => openModal()}
          className="bg-accent rounded-full w-10 h-10 items-center justify-center"
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={budgets}
        keyExtractor={(item) => item._id}
        contentContainerClassName="px-5 pb-8"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />
        }
        ListEmptyComponent={
          <View className="items-center py-16">
            <Ionicons name="wallet-outline" size={48} color="#486581" />
            <Text className="text-navy-400 mt-4">No budgets set yet</Text>
            <Text className="text-navy-500 text-sm mt-1">Tap + to add a monthly budget</Text>
          </View>
        }
        renderItem={({ item }) => {
          const pct = Math.min(item.percentage || 0, 100);
          return (
            <TouchableOpacity
              onPress={() => openModal(item)}
              onLongPress={() => handleDelete(item)}
            >
              <Card className="mb-3">
                <View className="flex-row justify-between items-center">
                  <Text className="text-white font-semibold text-base">{item.category}</Text>
                  <Text className={`font-bold ${getStatusColor(item.status)}`}>
                    {item.percentage}%
                  </Text>
                </View>
                <Text className="text-navy-400 text-sm mt-1">
                  {formatCurrency(item.spent || 0)} of {formatCurrency(item.monthlyLimit)}
                </Text>
                <View className="h-2 bg-navy-700 rounded-full mt-3 overflow-hidden">
                  <View
                    className={`h-full rounded-full ${getBarColor(item.status)}`}
                    style={{ width: `${pct}%` }}
                  />
                </View>
                {item.status === 'over' && (
                  <Text className="text-red-400 text-xs mt-2">Over budget!</Text>
                )}
                {item.status === 'warning' && (
                  <Text className="text-yellow-400 text-xs mt-2">Approaching budget limit</Text>
                )}
              </Card>
            </TouchableOpacity>
          );
        }}
      />

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View className="flex-1 justify-end bg-black/60">
          <View className="bg-navy-900 rounded-t-3xl px-5 py-6">
            <Text className="text-white text-xl font-bold mb-4">
              {editingId ? 'Edit Budget' : 'New Budget'}
            </Text>

            {error ? (
              <View className="bg-red-900/30 border border-red-700 rounded-xl p-3 mb-4">
                <Text className="text-red-300 text-sm">{error}</Text>
              </View>
            ) : null}

            <Text className="text-navy-300 text-sm mb-2 font-medium">Category</Text>
            <View className="flex-row flex-wrap gap-2 mb-4">
              {(editingId
                ? categories.filter((c) => c.name === selectedCategory)
                : availableCategories
              ).map((cat) => (
                <TouchableOpacity
                  key={cat._id}
                  onPress={() => setSelectedCategory(cat.name)}
                  className={`px-3 py-2 rounded-full border ${selectedCategory === cat.name ? 'bg-accent border-accent' : 'bg-navy-800 border-navy-600'}`}
                >
                  <Text
                    className={
                      selectedCategory === cat.name ? 'text-white text-sm' : 'text-navy-300 text-sm'
                    }
                  >
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Input
              label="Monthly Limit"
              value={monthlyLimit}
              onChangeText={setMonthlyLimit}
              placeholder="500"
              keyboardType="decimal-pad"
            />

            <Button title="Save Budget" onPress={handleSave} loading={loading} />
            <View className="mt-2">
              <Button title="Cancel" onPress={() => setModalVisible(false)} variant="secondary" />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
