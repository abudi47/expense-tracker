import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Share, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Input, Button, Card } from '../components/ui';
import { api } from '../services/api';
import { theme } from '../theme';

export default function ReportsScreen() {
  const [type, setType] = useState<'all' | 'income' | 'expense'>('all');
  const [category, setCategory] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [resultCount, setResultCount] = useState<number | null>(null);

  const buildFilters = () => ({
    type: type !== 'all' ? type : undefined,
    category: category.trim() || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

  const buildListQuery = () => {
    const params = new URLSearchParams();
    const filters = buildFilters();
    if (filters.type) params.append('type', filters.type);
    if (filters.category) params.append('category', filters.category);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    const qs = params.toString();
    return qs ? `?${qs}` : '';
  };

  const handleSearch = async () => {
    setLoading(true);
    try {
      const data = await api.get<{ transactions: unknown[]; pagination: { total: number } }>(
        `/transactions${buildListQuery()}`
      );
      setResultCount(data.pagination.total);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    setLoading(true);
    try {
      const data = await api.exportTransactions(buildFilters());

      const csvHeader = 'Date,Type,Category,Amount,Source,Note,Recurring\n';
      const csvRows = data.transactions
        .map((t) => {
          const date = new Date(t.date).toISOString().split('T')[0];
          const note = String(t.note || '').replace(/"/g, '""');
          const source = String(t.source || '').replace(/"/g, '""');
          return `${date},${t.type},${t.category},${t.amount},"${source}","${note}",${t.isRecurring}`;
        })
        .join('\n');

      await Share.share({
        message: csvHeader + csvRows,
        title: 'Transaction Export',
      });
    } catch (err) {
      Alert.alert('Export failed', err instanceof Error ? err.message : 'Could not export');
    } finally {
      setLoading(false);
    }
  };

  const filters: { key: typeof type; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'income', label: 'Income' },
    { key: 'expense', label: 'Expense' },
  ];

  return (
    <ScrollView className={`flex-1 ${theme.screen}`} contentContainerClassName="px-5 pt-14 pb-8">
      <Text className="text-white text-2xl font-bold mb-6">Reports</Text>

      <Card className="mb-4">
        <Text className="text-navy-300 text-sm mb-2 font-medium">Transaction Type</Text>
        <View className="flex-row gap-2 mb-4">
          {filters.map((f) => (
            <TouchableOpacity
              key={f.key}
              onPress={() => setType(f.key)}
              className={`px-4 py-2 rounded-full ${type === f.key ? 'bg-accent' : 'bg-navy-700'}`}
            >
              <Text className={`text-sm ${type === f.key ? 'text-white' : 'text-navy-400'}`}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Input
          label="Category (optional)"
          value={category}
          onChangeText={setCategory}
          placeholder="Food, Transport..."
        />
        <Input
          label="Start Date (YYYY-MM-DD)"
          value={startDate}
          onChangeText={setStartDate}
          placeholder="2026-01-01"
        />
        <Input
          label="End Date (YYYY-MM-DD)"
          value={endDate}
          onChangeText={setEndDate}
          placeholder="2026-12-31"
        />

        <Button title="Search" onPress={handleSearch} loading={loading} />

        {resultCount !== null && (
          <View className="mt-4 bg-navy-700 rounded-xl p-3 flex-row items-center">
            <Ionicons name="search" size={18} color="#60a5fa" />
            <Text className="text-white ml-2">{resultCount} transaction(s) found</Text>
          </View>
        )}
      </Card>

      <Card>
        <View className="flex-row items-center mb-3">
          <Ionicons name="download-outline" size={20} color="#60a5fa" />
          <Text className="text-white font-semibold ml-2">Export Summary</Text>
        </View>
        <Text className="text-navy-400 text-sm mb-4">
          Export filtered transactions as CSV using the current filters above.
        </Text>
        <Button title="Export CSV" onPress={handleExport} loading={loading} variant="secondary" />
      </Card>
    </ScrollView>
  );
}
