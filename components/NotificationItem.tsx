import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';

interface NotificationProps {
  id: string;
  title: string;
  message: string;
  type: string;
  createdAt: string;
  onPress?: () => void;
}

export const NotificationItem = ({ 
  id, 
  title, 
  message, 
  type, 
  createdAt, 
  onPress 
}: NotificationProps) => {
  // Get icon based on notification type
  const getIcon = () => {
    switch (type) {
      case 'info':
        return <Ionicons name="information-circle" size={24} color="#4F78FF" />;
      case 'success':
        return <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />;
      case 'warning':
        return <Ionicons name="warning" size={24} color="#FF9D5C" />;
      case 'error':
        return <Ionicons name="alert-circle" size={24} color="#FF5E5E" />;
      default:
        return <Ionicons name="notifications" size={24} color="#4F78FF" />;
    }
  };

  // Format date to relative time (e.g., "5 minutes ago")
  const formattedDate = formatDistanceToNow(new Date(createdAt), { addSuffix: true });

  return (
    <TouchableOpacity 
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.iconContainer}>
        {getIcon()}
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message} numberOfLines={5}>{message}</Text>
        <Text style={styles.time}>{formattedDate}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    marginBottom: 12,
  },
  iconContainer: {
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  message: {
    fontSize: 14,
    color: '#B4C6EF',
    marginBottom: 8,
  },
  time: {
    fontSize: 12,
    color: '#8A8FA3',
  }
});
