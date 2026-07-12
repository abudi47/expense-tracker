import React, { Component, ReactNode } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme, fonts, palette } from '../theme';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <View className={`flex-1 ${theme.screen} items-center justify-center px-8`}>
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              backgroundColor: palette.expense + '18',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="warning-outline" size={36} color={palette.expense} />
          </View>
          <Text
            className={`${theme.title} text-xl mt-4 text-center`}
            style={{ fontFamily: fonts.bold }}
          >
            Something went wrong
          </Text>
          <Text
            className={`${theme.subtitle} text-sm mt-2 text-center`}
            style={{ fontFamily: fonts.regular }}
          >
            {this.state.message}
          </Text>
          <TouchableOpacity
            onPress={() => this.setState({ hasError: false, message: '' })}
            className="mt-6 px-6 py-3 rounded-xl"
            style={{ backgroundColor: palette.primary }}
          >
            <Text className="text-white" style={{ fontFamily: fonts.semibold }}>
              Try again
            </Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}
