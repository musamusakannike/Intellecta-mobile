import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ToastType } from './ToastContext';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  type: ToastType;
  message: string;
}

const COLORS = {
  success: { bg: '#4CAF50', icon: 'checkmark-circle' },
  error: { bg: '#F44336', icon: 'close-circle' },
  info: { bg: '#2196F3', icon: 'information-circle' },
  warning: { bg: '#FFC107', icon: 'warning' },
};

const Toast: React.FC<Props> = ({ type, message }) => {
  const { bg, icon } = COLORS[type];

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <Ionicons name={icon as "warning" | "checkmark-circle" | "close-circle" | "information-circle"} size={22} color="white" style={styles.icon} />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  icon: {
    marginRight: 10,
  },
  message: {
    color: '#fff',
    flex: 1,
    fontSize: 15,
  },
});

export default Toast;
