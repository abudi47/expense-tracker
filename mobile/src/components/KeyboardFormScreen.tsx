import { ReactNode } from 'react';
import { View, ViewProps } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { theme } from '../theme';

interface KeyboardFormScreenProps {
  children: ReactNode;
  contentContainerClassName?: string;
  className?: string;
  style?: ViewProps['style'];
}

/**
 * Scrolls the focused input above the keyboard (iOS + Android).
 */
export function KeyboardFormScreen({
  children,
  contentContainerClassName,
  className,
  style,
}: KeyboardFormScreenProps) {
  return (
    <View className={`flex-1 ${theme.screen} ${className || ''}`} style={style}>
      <KeyboardAwareScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingTop: 24, paddingBottom: 48 }}
        contentContainerClassName={contentContainerClassName}
        keyboardShouldPersistTaps="handled"
        bottomOffset={40}
        extraKeyboardSpace={20}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </KeyboardAwareScrollView>
    </View>
  );
}
