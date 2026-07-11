import { ReactNode, useRef, useCallback } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ScrollViewProps,
  View,
  findNodeHandle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../theme';

interface KeyboardFormScreenProps extends ScrollViewProps {
  children: ReactNode;
  headerOffset?: number;
}

export function KeyboardFormScreen({
  children,
  headerOffset = 0,
  contentContainerClassName,
  ...scrollProps
}: KeyboardFormScreenProps) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);

  const keyboardVerticalOffset =
    Platform.OS === 'ios' ? insets.top + headerOffset + 10 : headerOffset;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className={`flex-1 ${theme.screen}`}
      keyboardVerticalOffset={keyboardVerticalOffset}
    >
      <ScrollView
        ref={scrollRef}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        contentContainerClassName={`px-5 py-6 pb-12 ${contentContainerClassName || ''}`}
        {...scrollProps}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export function useScrollToInput(scrollRef: React.RefObject<ScrollView | null>) {
  return useCallback(
    (inputRef: React.RefObject<View | null>) => {
      if (!scrollRef.current || !inputRef.current) return;
      const node = findNodeHandle(inputRef.current);
      if (node && scrollRef.current) {
        setTimeout(() => {
          scrollRef.current?.scrollResponderScrollNativeHandleToKeyboard(node, 80, true);
        }, 100);
      }
    },
    [scrollRef]
  );
}
