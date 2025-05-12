import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface NotificationBadgeProps {
  count: number;
  style?: object;
}

export const NotificationBadge = ({ count, style }: NotificationBadgeProps) => {
  if (count <= 0) {
    return (
      <View style={[styles.dot, style]} />
    );
  }
  
  return (
    <View style={[styles.badge, style]}>
      <Text style={styles.count}>
        {count > 99 ? '99+' : count}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  dot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF5E5E',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FF5E5E',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  count: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
});
