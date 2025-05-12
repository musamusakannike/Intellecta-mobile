import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { API_ROUTES } from '@/constants';

interface Notification {
  _id: string;
  title: string;
  message: string;
  type: string;
  isActive: boolean;
  createdBy: {
    _id: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface NotificationsResponse {
  status: string;
  count: number;
  notifications: Notification[];
}

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<string | null>(null);

  // Fetch notifications from API
  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = await SecureStore.getItemAsync('token');
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      const response = await fetch(API_ROUTES.NOTIFICATIONS.GET_NOTIFICATIONS, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data: NotificationsResponse = await response.json();
      
      if (response.ok) {
        setNotifications(data.notifications);
        
        // Calculate unread notifications (those created after last checked time)
        const lastCheckedTime = await AsyncStorage.getItem('lastNotificationCheck');
        setLastChecked(lastCheckedTime);
        
        if (lastCheckedTime) {
          const lastCheckedDate = new Date(lastCheckedTime);
          const unreadNotifications = data.notifications.filter(
            notification => new Date(notification.createdAt) > lastCheckedDate
          );
          setUnreadCount(unreadNotifications.length);
        } else {
          // If never checked before, all are unread
          setUnreadCount(data.notifications.length);
        }
        
        // Update last checked time
        const now = new Date().toISOString();
        await AsyncStorage.setItem('lastNotificationCheck', now);
        setLastChecked(now);
      } else {
        setError(data.status === 'error' ? 'Failed to load notifications' : 'An error occurred');
      }
    } catch (err) {
      setError('Error fetching notifications');
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      const now = new Date().toISOString();
      await AsyncStorage.setItem('lastNotificationCheck', now);
      setLastChecked(now);
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking notifications as read:', err);
    }
  }, []);

  // Initial fetch on mount
  useEffect(() => {
    fetchNotifications();
    
    // Set up polling for notifications (every 5 minutes)
    const intervalId = setInterval(() => {
      fetchNotifications();
    }, 5 * 60 * 1000);
    
    return () => clearInterval(intervalId);
  }, [fetchNotifications]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    lastChecked,
    fetchNotifications,
    markAllAsRead
  };
};
