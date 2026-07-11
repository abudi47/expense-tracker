import { useState } from 'react';
import { View, Text, TouchableOpacity, Platform, Modal, Pressable } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { theme, palette } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { useThemeColors } from '../theme/useThemeColors';
import { formatDate, toInputDate } from '../utils/format';

interface DatePickerFieldProps {
  label: string;
  value: string; // YYYY-MM-DD or empty
  onChange: (date: string) => void;
  placeholder?: string;
  maximumDate?: Date;
  minimumDate?: Date;
  allowClear?: boolean;
}

function parseDate(value: string): Date {
  if (!value) return new Date();
  const d = new Date(value.includes('T') ? value : `${value}T12:00:00`);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

export function DatePickerField({
  label,
  value,
  onChange,
  placeholder = 'Select date',
  maximumDate,
  minimumDate,
  allowClear = false,
}: DatePickerFieldProps) {
  const colors = useThemeColors();
  const { isDark } = useTheme();
  const [show, setShow] = useState(false);
  const [tempDate, setTempDate] = useState(parseDate(value));

  const openPicker = () => {
    setTempDate(parseDate(value));
    setShow(true);
  };

  const applyDate = (date: Date) => {
    onChange(toInputDate(date));
    setShow(false);
  };

  const onAndroidChange = (event: DateTimePickerEvent, selected?: Date) => {
    setShow(false);
    if (event.type === 'set' && selected) {
      onChange(toInputDate(selected));
    }
  };

  const onIOSChange = (_event: DateTimePickerEvent, selected?: Date) => {
    if (selected) setTempDate(selected);
  };

  return (
    <View className="mb-4">
      <Text className={`${theme.label} text-sm mb-1.5 font-medium`}>{label}</Text>
      <TouchableOpacity
        onPress={openPicker}
        activeOpacity={0.8}
        className={`${theme.input} rounded-xl px-4 py-3.5 flex-row items-center justify-between`}
      >
        <Text className={value ? theme.title : theme.subtitle}>
          {value ? formatDate(value) : placeholder}
        </Text>
        <View className="flex-row items-center gap-2">
          {allowClear && value ? (
            <TouchableOpacity
              onPress={() => onChange('')}
              hitSlop={8}
              className="p-1"
            >
              <Ionicons name="close-circle" size={18} color={colors.icon} />
            </TouchableOpacity>
          ) : null}
          <Ionicons name="calendar-outline" size={20} color={palette.primary} />
        </View>
      </TouchableOpacity>

      {show && Platform.OS === 'android' && (
        <DateTimePicker
          value={parseDate(value)}
          mode="date"
          display="calendar"
          onChange={onAndroidChange}
          maximumDate={maximumDate}
          minimumDate={minimumDate}
        />
      )}

      {Platform.OS === 'ios' && (
        <Modal visible={show} transparent animationType="slide" onRequestClose={() => setShow(false)}>
          <Pressable className="flex-1 bg-black/40 justify-end" onPress={() => setShow(false)}>
            <Pressable
              onPress={(e) => e.stopPropagation()}
              className="rounded-t-3xl px-4 pt-3 pb-8"
              style={{ backgroundColor: colors.modal }}
            >
              <View className="flex-row justify-between items-center mb-2">
                <TouchableOpacity onPress={() => setShow(false)} className="px-2 py-2">
                  <Text className={`${theme.subtitle} text-base`}>Cancel</Text>
                </TouchableOpacity>
                <Text className={`${theme.title} font-semibold`}>Select date</Text>
                <TouchableOpacity onPress={() => applyDate(tempDate)} className="px-2 py-2">
                  <Text className="text-accent font-semibold text-base">Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={tempDate}
                mode="date"
                display="spinner"
                onChange={onIOSChange}
                maximumDate={maximumDate}
                minimumDate={minimumDate}
                themeVariant={isDark ? 'dark' : 'light'}
                style={{ alignSelf: 'center' }}
              />
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}
