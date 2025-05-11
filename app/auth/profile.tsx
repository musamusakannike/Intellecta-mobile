import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  StatusBar,
  SafeAreaView,
  ActivityIndicator,
  Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useNavigation } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { ToastContext } from '@/components/Toast/ToastContext';
import { Avatar } from '@/components/Avatar';
import { API_ROUTES } from '@/constants';

interface UserData {
  username: string;
  fullName: string;
  email: string;
  profileImage: string;
  isPremium: boolean;
  joinedDate: Date | null;
}


export default function Profile() {
  const [userData, setUserData] = useState<UserData>({
    username: '',
    fullName: '',
    email: '',
    profileImage: '',
    isPremium: false,
    joinedDate: null
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const toast = useContext(ToastContext);

  // Load user data on mount
  useEffect(() => {
    const loadUserData = async () => {
      try {
        setIsLoading(true);

        // Load from AsyncStorage
        const username = await AsyncStorage.getItem('username');
        const fullName = await AsyncStorage.getItem('fullName');
        const email = await AsyncStorage.getItem('email');
        const profileImage = await AsyncStorage.getItem('profileImage');
        const isPremium = JSON.parse(await AsyncStorage.getItem('isPremium') || 'false');
        const joinedDate = JSON.parse(await AsyncStorage.getItem('joinedDate') || 'null');

        setUserData({
          username: username || 'User',
          fullName: fullName || '',
          email: email || '',
          profileImage: profileImage || '',
          isPremium,
          joinedDate: joinedDate ? new Date(joinedDate) : null
        });

        // Load settings
        const savedDarkMode = await AsyncStorage.getItem('darkMode');
        setDarkMode(savedDarkMode !== 'false'); // Default to true

        const savedNotifications = await AsyncStorage.getItem('notifications');
        setNotificationsEnabled(savedNotifications !== 'false'); // Default to true
      } catch (error) {
        console.error('Error loading user data:', error);
        toast?.showToast({
          type: 'error',
          message: 'Failed to load profile data',
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadUserData();
  }, []);

  // Handle settings toggle
  const handleToggleDarkMode = async (value: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDarkMode(value);
    await AsyncStorage.setItem('darkMode', value.toString());
  };

  const handleToggleNotifications = async (value: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setNotificationsEnabled(value);
    await AsyncStorage.setItem('notifications', value.toString());
  };

  // Handle logout
  const handleLogout = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              // Clear token and redirect to login
              await SecureStore.deleteItemAsync('token');
              router.replace('/auth/login');

              toast?.showToast({
                type: 'success',
                message: 'Logged out successfully',
              });
            } catch (error) {
              console.error('Error during logout:', error);
            }
          }
        }
      ]
    );
  };

  // Handle account deletion
  const handleDeleteAccount = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    Alert.alert(
      'Delete Account',
      'This action cannot be undone. All your data will be permanently deleted.',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsDeleting(true);

              // Get token for authorization
              const token = await SecureStore.getItemAsync('token');

              // Make API call to delete account
              const response = await fetch(`${API_ROUTES.USERS.DELETE_USER}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${token}`
                }
              });

              const data = await response.json();

              if (response.ok) {
                // Clear all AsyncStorage data
                await AsyncStorage.clear();

                // Show success message and navigate to login
                toast?.showToast({
                  type: 'success',
                  message: 'Account deleted successfully',
                });

                router.replace('/auth/login');
              } else {
                throw new Error(data.message || 'Failed to delete account');
              }
            } catch (error: any) {
              console.error('Error deleting account:', error);
              toast?.showToast({
                type: 'error',
                message: error.message || 'Failed to delete account',
              });
            } finally {
              setIsDeleting(false);
            }
          }
        }
      ]
    );
  };

  // Format date
  const formatDate = (date: Date) => {
    if (!date) return '';
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(date).toLocaleDateString(undefined, options);
  };

  // Handle back navigation
  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.goBack();
  };

  // Handle premium subscription
  const handleSubscribe = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (userData.isPremium) {
      router.push('/premium/manage');
    } else {
      router.push('/premium/subscribe');
    }
  };

  // Handle edit profile
  const handleEditProfile = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/auth/edit-profile');
  };

  if (isLoading) {
    return (
      <LinearGradient
        colors={['#090E23', '#1F2B5E', '#0C1339']}
        style={[styles.loadingContainer, { paddingTop: insets.top }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <ActivityIndicator size="large" color="#4F78FF" />
      </LinearGradient>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      <LinearGradient
        colors={['#090E23', '#1F2B5E', '#0C1339']}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Profile</Text>

          <TouchableOpacity
            style={styles.editButton}
            onPress={handleEditProfile}
            activeOpacity={0.7}
          >
            <Ionicons name="pencil" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Profile Card */}
          <View style={styles.profileCard}>
            <View style={styles.avatarContainer}>
              <Avatar
                source={userData.profileImage}
                size={100}
                text={userData.fullName?.charAt(0) || userData.username?.charAt(0)}
                style={{ borderRadius: 12 }}
              />

              {userData.isPremium && (
                <View style={styles.premiumBadge}>
                  <Ionicons name="star" size={16} color="#FFFFFF" />
                </View>
              )}
            </View>

            <Text style={styles.fullName}>{userData.fullName || userData.username}</Text>
            {userData.username !== userData.fullName && (
              <Text style={styles.username}>@{userData.username}</Text>
            )}

            <Text style={styles.joinedDate}>Joined {userData.joinedDate ? formatDate(userData.joinedDate) : 'Not set'}</Text>

            {/* Premium Banner */}
            <TouchableOpacity
              style={[styles.premiumBanner, userData.isPremium && styles.premiumActiveBanner]}
              onPress={handleSubscribe}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={userData.isPremium ? ['#FFD700', '#FFAA00'] : ['#4F78FF', '#8A53FF']}
                style={[styles.premiumGradient, { borderRadius: 12 }]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <View style={styles.premiumContent}>
                  <View style={styles.premiumIconContainer}>
                    <Ionicons
                      name={userData.isPremium ? "star" : "star-outline"}
                      size={24}
                      color="#FFFFFF"
                    />
                  </View>

                  <View style={styles.premiumTextContainer}>
                    <Text style={styles.premiumTitle}>
                      {userData.isPremium ? 'Premium Member' : 'Upgrade to Premium'}
                    </Text>
                    <Text style={styles.premiumSubtitle}>
                      {userData.isPremium ? 'Access all premium courses' : 'Unlock all courses and features'}
                    </Text>
                  </View>

                  <Ionicons name="chevron-forward-outline" size={20} color="#FFFFFF" />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* User Details Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account Information</Text>

            <View style={styles.detailsCard}>
              <View style={styles.detailItem}>
                <View style={styles.detailIconContainer}>
                  <Ionicons name="person-outline" size={20} color="#4F78FF" />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Full Name</Text>
                  <Text style={styles.detailValue}>{userData.fullName || 'Not set'}</Text>
                </View>
              </View>

              <View style={styles.separator} />

              <View style={styles.detailItem}>
                <View style={styles.detailIconContainer}>
                  <Ionicons name="at-outline" size={20} color="#4F78FF" />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Username</Text>
                  <Text style={styles.detailValue}>{userData.username}</Text>
                </View>
              </View>

              <View style={styles.separator} />

              <View style={styles.detailItem}>
                <View style={styles.detailIconContainer}>
                  <Ionicons name="mail-outline" size={20} color="#4F78FF" />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Email Address</Text>
                  <Text style={styles.detailValue}>{userData.email || 'Not set'}</Text>
                </View>
              </View>

              <View style={styles.separator} />

              <View style={styles.detailItem}>
                <View style={styles.detailIconContainer}>
                  <Ionicons name="calendar-outline" size={20} color="#4F78FF" />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Member Since</Text>
                  <Text style={styles.detailValue}>{userData.joinedDate ? formatDate(userData.joinedDate) : 'Not set'}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Settings Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Settings</Text>

            <View style={styles.settingsCard}>
              <View style={styles.settingItem}>
                <View style={styles.settingIconContainer}>
                  <Ionicons name="speedometer-outline" size={20} color="#4F78FF" />
                </View>
                <View style={styles.settingContent}>
                  <Text style={styles.settingLabel}>Data Saver</Text>
                </View>
                <Switch
                  value={darkMode}
                  onValueChange={handleToggleDarkMode}
                  trackColor={{ false: 'rgba(255, 255, 255, 0.1)', true: '#4F78FF' }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <View style={styles.separator} />

              <View style={styles.settingItem}>
                <View style={styles.settingIconContainer}>
                  <Ionicons name="notifications-outline" size={20} color="#4F78FF" />
                </View>
                <View style={styles.settingContent}>
                  <Text style={styles.settingLabel}>Push Notifications</Text>
                </View>
                <Switch
                  value={notificationsEnabled}
                  onValueChange={handleToggleNotifications}
                  trackColor={{ false: 'rgba(255, 255, 255, 0.1)', true: '#4F78FF' }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <View style={styles.separator} />

              <TouchableOpacity
                style={styles.settingItem}
                onPress={() => router.push('/security')}
                activeOpacity={0.7}
              >
                <View style={styles.settingIconContainer}>
                  <Ionicons name="lock-closed-outline" size={20} color="#4F78FF" />
                </View>
                <View style={styles.settingContent}>
                  <Text style={styles.settingLabel}>Security</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#8A8FA3" />
              </TouchableOpacity>

              <View style={styles.separator} />

              <TouchableOpacity
                style={styles.settingItem}
                onPress={() => router.push('/help')}
                activeOpacity={0.7}
              >
                <View style={styles.settingIconContainer}>
                  <Ionicons name="help-circle-outline" size={20} color="#4F78FF" />
                </View>
                <View style={styles.settingContent}>
                  <Text style={styles.settingLabel}>Help & Support</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#8A8FA3" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Account Actions */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
              activeOpacity={0.7}
            >
              <Ionicons name="log-out-outline" size={20} color="#FFFFFF" style={styles.buttonIcon} />
              <Text style={styles.logoutButtonText}>Log Out</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.deleteButton}
              onPress={handleDeleteAccount}
              activeOpacity={0.7}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color="#FFFFFF" style={styles.buttonIcon} />
              ) : (
                <Ionicons name="trash-outline" size={20} color="#FFFFFF" style={styles.buttonIcon} />
              )}
              <Text style={styles.deleteButtonText}>Delete Account</Text>
            </TouchableOpacity>
          </View>

          {/* App Version */}
          <Text style={styles.versionText}>Version 1.0.0</Text>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090E23',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  profileCard: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  premiumBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#090E23',
  },
  fullName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  username: {
    fontSize: 16,
    color: '#B4C6EF',
    marginBottom: 8,
  },
  joinedDate: {
    fontSize: 14,
    color: '#8A8FA3',
    marginBottom: 20,
  },
  premiumBanner: {
    width: '100%',
    marginTop: 10,
    borderRadius: 12,
    overflow: 'hidden',
  },
  premiumActiveBanner: {
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  premiumGradient: {
    padding: 16,
  },
  premiumContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  premiumIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  premiumTextContainer: {
    flex: 1,
  },
  premiumTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  premiumSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  detailsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  detailIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(79, 120, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#8A8FA3',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginVertical: 4,
  },
  settingsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  settingIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(79, 120, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  settingContent: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  actionButtons: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4F78FF',
    borderRadius: 12,
    paddingVertical: 16,
    marginBottom: 12,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 94, 94, 0.8)',
    borderRadius: 12,
    paddingVertical: 16,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  buttonIcon: {
    marginRight: 8,
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#8A8FA3',
    marginBottom: 20,
  },
});