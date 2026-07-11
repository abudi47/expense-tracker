import React, { Component, ReactNode } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';

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
          <Ionicons name="warning-outline" size={48} color="#ef4444" />
          <Text className={`${theme.title} text-xl font-bold mt-4 text-center`}>
            Something went wrong
          </Text>
          <Text className={`${theme.subtitle} text-sm mt-2 text-center`}>{this.state.message}</Text>
          <TouchableOpacity
            onPress={() => this.setState({ hasError: false, message: '' })}
            className="mt-6 bg-accent px-6 py-3 rounded-xl"
          >
            <Text className="text-white font-semibold">Try again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}
