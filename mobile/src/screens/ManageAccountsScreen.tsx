import { useCallback, useState } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  Modal,
  Alert,
  Text,
  ScrollView,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader, Button, Input, Card } from '../components/ui';
import { KeyboardFormScreen } from '../components/KeyboardFormScreen';
import { AccountCard, EmptyState } from '../components/design';
import { api, Account } from '../services/api';
import { useToast } from '../components/Toast';
import { theme, ACCOUNT_ICONS, ACCOUNT_COLORS, CURRENCIES } from '../theme';
import { palette } from '../theme';
import { CategoryChip } from '../components/design';

export default function ManageAccountsScreen() {
  const navigation = useNavigation();
  const { showToast } = useToast();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('wallet');
  const [color, setColor] = useState(palette.primary);
  const [currency, setCurrency] = useState('USD');
  const [openingBalance, setOpeningBalance] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const data = await api.get<Account[]>('/accounts');
    setAccounts(data);
  };

  useFocusEffect(useCallback(() => { load().catch(() => {}); }, []));

  const openModal = (account?: Account) => {
    if (account) {
      setEditing(account);
      setName(account.name);
      setIcon(account.icon);
      setColor(account.color);
      setCurrency(account.currency);
      setOpeningBalance(String(account.openingBalance || 0));
    } else {
      setEditing(null);
      setName('');
      setIcon('wallet');
      setColor(palette.primary);
      setCurrency('USD');
      setOpeningBalance('0');
    }
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      showToast('Enter an account name', 'error');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        name: name.trim(),
        icon,
        color,
        currency,
        openingBalance: parseFloat(openingBalance) || 0,
      };
      if (editing) {
        await api.put(`/accounts/${editing._id}`, payload);
        showToast('Account updated', 'success');
      } else {
        await api.post('/accounts', payload);
        showToast('Account created', 'success');
      }
      setModalVisible(false);
      load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (account: Account) => {
    Alert.alert('Delete Account', `Remove "${account.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await api.delete(`/accounts/${account._id}`);
          showToast('Account removed', 'info');
          load();
        },
      },
    ]);
  };

  return (
    <View className={`flex-1 ${theme.screen}`}>
      <ScreenHeader
        title="Manage Accounts"
        right={
          <TouchableOpacity onPress={() => openModal()} className="bg-accent rounded-full w-10 h-10 items-center justify-center">
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        }
      />

      <FlatList
        data={accounts}
        keyExtractor={(item) => item._id}
        contentContainerClassName="px-5 pb-8"
        ListEmptyComponent={
          <EmptyState icon="wallet-outline" title="No accounts" subtitle="Tap + to create one" />
        }
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => openModal(item)} onLongPress={() => handleDelete(item)}>
            <AccountCard {...item} />
          </TouchableOpacity>
        )}
      />

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View className="flex-1 justify-end bg-black/50">
          <View className={`${theme.modal} rounded-t-3xl max-h-[90%]`}>
            <KeyboardFormScreen contentContainerClassName="px-5 py-6">
              <Text className={`${theme.title} text-xl font-bold mb-4`}>
                {editing ? 'Edit Account' : 'New Account'}
              </Text>
              <Input label="Name" value={name} onChangeText={setName} placeholder="Local Bank, Binance..." />
              <Text className={`${theme.label} text-sm mb-2 font-medium`}>Icon</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
                <View className="flex-row gap-2">
                  {ACCOUNT_ICONS.map((ic) => (
                    <TouchableOpacity
                      key={ic}
                      onPress={() => setIcon(ic)}
                      className={`w-11 h-11 rounded-full items-center justify-center border ${icon === ic ? 'bg-accent border-accent' : theme.chip}`}
                    >
                      <Ionicons
                        name={ic as keyof typeof Ionicons.glyphMap}
                        size={20}
                        color={icon === ic ? '#fff' : color}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
              <Text className={`${theme.label} text-sm mb-2 font-medium`}>Color</Text>
              <View className="flex-row flex-wrap gap-2 mb-4">
                {ACCOUNT_COLORS.map((c) => (
                  <TouchableOpacity
                    key={c}
                    onPress={() => setColor(c)}
                    className={`w-9 h-9 rounded-full ${color === c ? 'border-2 border-white' : ''}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </View>
              <Text className={`${theme.label} text-sm mb-2 font-medium`}>Currency</Text>
              <View className="flex-row flex-wrap gap-2 mb-4">
                {CURRENCIES.map((cur) => (
                  <CategoryChip
                    key={cur}
                    label={cur}
                    selected={currency === cur}
                    onPress={() => setCurrency(cur)}
                  />
                ))}
              </View>
              <Input
                label="Opening Balance"
                value={openingBalance}
                onChangeText={setOpeningBalance}
                keyboardType="decimal-pad"
                placeholder="0"
              />
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
