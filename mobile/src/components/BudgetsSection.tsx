import { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Input, Button, Card } from './ui';
import { KeyboardFormScreen } from './KeyboardFormScreen';
import { CategoryChip } from './design';
import { api, Budget, Category } from '../services/api';
import { formatCurrency } from '../utils/format';
import { useToast } from './Toast';
import { theme } from '../theme';
import { palette } from '../theme';

export default function BudgetsSection() {
  const { showToast } = useToast();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
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

  useFocusEffect(useCallback(() => { loadData().catch(() => {}); }, []));

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
    if (!selectedCategory || !limit || limit <= 0) {
      setError('Select category and enter a valid limit');
      return;
    }
    setLoading(true);
    try {
      if (editingId) {
        await api.put(`/budgets/${editingId}`, { category: selectedCategory, monthlyLimit: limit });
      } else {
        await api.post('/budgets', { category: selectedCategory, monthlyLimit: limit });
      }
      showToast('Budget saved', 'success');
      setModalVisible(false);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  const getBarColor = (status?: string) => {
    if (status === 'over') return 'bg-red-500';
    if (status === 'warning') return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const usedCategories = budgets.map((b) => b.category);

  return (
    <View className="mb-6">
      <View className="flex-row justify-between items-center mb-3">
        <Text className={`${theme.title} text-lg font-semibold`}>Budgets</Text>
        <TouchableOpacity onPress={() => openModal()}>
          <Ionicons name="add-circle-outline" size={26} color={palette.primary} />
        </TouchableOpacity>
      </View>

      {budgets.length === 0 ? (
        <Card>
          <Text className={`${theme.subtitle} text-sm`}>No budgets set. Tap + to add one.</Text>
        </Card>
      ) : (
        budgets.map((item) => {
          const pct = Math.min(item.percentage || 0, 100);
          return (
            <TouchableOpacity key={item._id} onPress={() => openModal(item)}>
              <Card className="mb-2">
                <View className="flex-row justify-between">
                  <Text className={`${theme.title} font-semibold`}>{item.category}</Text>
                  <Text className={item.status === 'over' ? 'text-red-500' : item.status === 'warning' ? 'text-yellow-500' : 'text-green-500'}>
                    {item.percentage}%
                  </Text>
                </View>
                <Text className={`${theme.subtitle} text-sm mt-1`}>
                  {formatCurrency(item.spent || 0)} of {formatCurrency(item.monthlyLimit)}
                </Text>
                <View className={`h-2 ${theme.divider} rounded-full mt-3 overflow-hidden`}>
                  <View className={`h-full rounded-full ${getBarColor(item.status)}`} style={{ width: `${pct}%` }} />
                </View>
              </Card>
            </TouchableOpacity>
          );
        })
      )}

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View className="flex-1 justify-end bg-black/50">
          <View className={`${theme.modal} rounded-t-3xl max-h-[90%]`}>
            <KeyboardFormScreen contentContainerClassName="px-5 py-6">
              <Text className={`${theme.title} text-xl font-bold mb-4`}>
                {editingId ? 'Edit Budget' : 'New Budget'}
              </Text>
              {error ? (
                <Text className="text-red-500 text-sm mb-3">{error}</Text>
              ) : null}
              <Text className={`${theme.label} text-sm mb-2 font-medium`}>Category</Text>
              <View className="flex-row flex-wrap gap-2 mb-4">
                {(editingId ? categories.filter((c) => c.name === selectedCategory) : categories.filter((c) => !usedCategories.includes(c.name))).map((cat) => (
                  <CategoryChip key={cat._id} label={cat.name} selected={selectedCategory === cat.name} onPress={() => setSelectedCategory(cat.name)} />
                ))}
              </View>
              <Input label="Monthly Limit" value={monthlyLimit} onChangeText={setMonthlyLimit} keyboardType="decimal-pad" />
              <Button title="Save" onPress={handleSave} loading={loading} />
              <View className="mt-2 mb-4">
                <Button title="Cancel" onPress={() => setModalVisible(false)} variant="secondary" />
              </View>
            </KeyboardFormScreen>
          </View>
        </View>
      </Modal>
    </View>
  );
}
