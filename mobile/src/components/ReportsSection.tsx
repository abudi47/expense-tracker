import { useState } from 'react';
import { View, Text, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Input, Button, Card } from './ui';
import { CategoryChip } from './design';
import { DatePickerField } from './DatePickerField';
import { api } from '../services/api';
import { useToast } from './Toast';
import { theme, palette, fonts } from '../theme';

export default function ReportsSection() {
  const { showToast } = useToast();
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
      const data = await api.get<{ pagination: { total: number } }>(`/transactions${buildListQuery()}`);
      setResultCount(data.pagination.total);
      showToast(`${data.pagination.total} transactions found`, 'info');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Search failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    setLoading(true);
    try {
      const data = await api.exportTransactions(buildFilters());
      const csvHeader = 'Date,Type,Category,Amount,Account,Source,Note\n';
      const csvRows = data.transactions
        .map((t) => {
          const date = new Date(t.date).toISOString().split('T')[0];
          const note = String(t.note || '').replace(/"/g, '""');
          const source = String(t.source || '').replace(/"/g, '""');
          return `${date},${t.type},${t.category},${t.amount},${t.accountId || ''},"${source}","${note}"`;
        })
        .join('\n');
      await Share.share({ message: csvHeader + csvRows, title: 'Transaction Export' });
      showToast('Export ready to share', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Export failed', 'error');
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
    <View className="mb-8">
      <Text className={`${theme.title} text-lg mb-3`} style={{ fontFamily: fonts.semibold }}>
        Reports & Export
      </Text>
      <Card>
        <View className="flex-row gap-2 mb-4">
          {filters.map((f) => (
            <CategoryChip
              key={f.key}
              label={f.label}
              selected={type === f.key}
              onPress={() => setType(f.key)}
            />
          ))}
        </View>
        <Input
          label="Category"
          value={category}
          onChangeText={setCategory}
          placeholder="Optional"
        />
        <DatePickerField
          label="Start Date"
          value={startDate}
          onChange={setStartDate}
          placeholder="Any start date"
          allowClear
          maximumDate={endDate ? new Date(`${endDate}T12:00:00`) : undefined}
        />
        <DatePickerField
          label="End Date"
          value={endDate}
          onChange={setEndDate}
          placeholder="Any end date"
          allowClear
          minimumDate={startDate ? new Date(`${startDate}T12:00:00`) : undefined}
        />
        <Button title="Search" onPress={handleSearch} loading={loading} />
        {resultCount !== null && (
          <View className={`mt-3 ${theme.cardMuted} rounded-xl p-3 flex-row items-center`}>
            <Ionicons name="search" size={18} color={palette.primary} />
            <Text className={`${theme.title} ml-2 text-sm`}>{resultCount} found</Text>
          </View>
        )}
        <View className="mt-4">
          <Button
            title="Export CSV"
            onPress={handleExport}
            loading={loading}
            variant="secondary"
          />
        </View>
      </Card>
    </View>
  );
}
