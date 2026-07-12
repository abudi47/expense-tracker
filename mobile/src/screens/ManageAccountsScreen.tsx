import { useCallback, useState } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  Modal,
  Alert,
  Text,
  ScrollView,
  Pressable,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { Button, Input } from '../components/ui';
import { AccountCard, EmptyState, CategoryChip } from '../components/design';
import { api, Account } from '../services/api';
import { useToast } from '../components/Toast';
import { theme, ACCOUNT_ICONS, ACCOUNT_COLORS, CURRENCIES, FX_GROUPS, palette } from '../theme';
import { useThemeColors } from '../theme/useThemeColors';

type FxGroup = 'crypto' | 'bank' | 'local';

export default function ManageAccountsScreen() {
  const { showToast } = useToast();
  const colors = useThemeColors();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('wallet');
  const [color, setColor] = useState<string>(palette.primary);
  const [currency, setCurrency] = useState('ETB');
  const [fxGroup, setFxGroup] = useState<FxGroup>('local');
  const [openingBalance, setOpeningBalance] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const data = await api.get<Account[]>('/accounts');
    setAccounts(data);
  };

  useFocusEffect(
    useCallback(() => {
      load().catch(() => {});
    }, [])
  );

  const closeModal = () => {
    if (loading) return;
    setModalVisible(false);
  };

  const openModal = (account?: Account) => {
    if (account) {
      setEditing(account);
      setName(account.name);
      setIcon(account.icon);
      setColor(account.color);
      setCurrency(account.currency);
      setFxGroup(account.fxGroup || 'local');
      setOpeningBalance(String(account.openingBalance || 0));
    } else {
      setEditing(null);
      setName('');
      setIcon('wallet');
      setColor(palette.primary);
      setCurrency('ETB');
      setFxGroup('local');
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
        fxGroup,
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
      <View className="px-5 pt-2 pb-3 flex-row justify-between items-center">
        <Text className={`${theme.subtitle} text-sm`}>Your wallets & banks</Text>
        <TouchableOpacity
          onPress={() => openModal()}
          className="rounded-full w-10 h-10 items-center justify-center"
          style={{
            backgroundColor: palette.primary,
            shadowColor: palette.primary,
            shadowOpacity: 0.4,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 3 },
            elevation: 4,
          }}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

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

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={closeModal}
      >
        <View className="flex-1">
          <Pressable className="flex-1 bg-black/50 justify-end" onPress={closeModal}>
            <Pressable
              onPress={(e) => e.stopPropagation()}
              className="rounded-t-3xl max-h-[85%]"
              style={{ backgroundColor: colors.modal }}
            >
              <View className="items-center pt-3 pb-1">
                <View className="w-10 h-1 rounded-full bg-slate-300 dark:bg-navy-600" />
              </View>
              <KeyboardAwareScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                bottomOffset={24}
                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32, paddingTop: 8 }}
              >
                <Text className={`${theme.title} text-xl font-bold mb-4`}>
                  {editing ? 'Edit Account' : 'New Account'}
                </Text>
                <Input
                  label="Name"
                  value={name}
                  onChangeText={setName}
                  placeholder="Local Bank, Binance..."
                />
                <Text className={`${theme.label} text-sm mb-2 font-medium`}>Icon</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
                  <View className="flex-row gap-2">
                    {ACCOUNT_ICONS.map((ic) => (
                      <TouchableOpacity
                        key={ic}
                        onPress={() => setIcon(ic)}
                        className={`w-11 h-11 rounded-full items-center justify-center border ${
                          icon === ic ? 'bg-accent border-accent' : theme.chip
                        }`}
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
                      onPress={() => {
                        setCurrency(cur);
                        if (cur === 'ETB') setFxGroup('local');
                        else if (cur === 'USDT') setFxGroup('crypto');
                        else if (fxGroup === 'local') setFxGroup('bank');
                      }}
                    />
                  ))}
                </View>
                <Text className={`${theme.label} text-sm mb-2 font-medium`}>
                  Conversion rate group
                </Text>
                <Text className={`${theme.subtitle} text-xs mb-2`}>
                  Crypto/Grey uses the higher rate; bank uses the lower rate. Set rates in Settings.
                </Text>
                <View className="mb-4 gap-2">
                  {FX_GROUPS.map((g) => (
                    <TouchableOpacity
                      key={g.id}
                      onPress={() => setFxGroup(g.id)}
                      className={`rounded-xl px-3 py-3 border ${
                        fxGroup === g.id ? 'bg-accent/15 border-accent' : theme.chip
                      }`}
                    >
                      <Text
                        className={`font-semibold text-sm ${
                          fxGroup === g.id ? 'text-accent' : theme.title
                        }`}
                      >
                        {g.label}
                      </Text>
                      <Text className={`${theme.subtitle} text-xs mt-0.5`}>{g.hint}</Text>
                    </TouchableOpacity>
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
                <View className="mt-2">
                  <Button title="Cancel" onPress={closeModal} variant="secondary" />
                </View>
              </KeyboardAwareScrollView>
            </Pressable>
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}
