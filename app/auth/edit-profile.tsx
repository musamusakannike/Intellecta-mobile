import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  StatusBar,
  SafeAreaView,
  ActivityIndicator,
  Image,
  Platform,
  KeyboardAvoidingView
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ToastContext } from '@/components/Toast/ToastContext';
import { Avatar } from '@/components/Avatar';
import { API_ROUTES } from '@/constants';

interface UserData {
  username: string;
  fullName: string;
  email: string;
  profileImage: string | null;
}

// Fixed avatar options - using correct URL format without numbers causing casting issues
const AVATAR_OPTIONS = [
  'https://i.ibb.co/fY1zKkzj/Musa-Musa-Kannike-Elegant-attire-fused-with-subtle-metallic-elements-07d42a72-5e9e-4e2d-b034-ce021dc.png',
  'https://i.ibb.co/Kp1vVZRF/Musa-Musa-Kannike-A-relaxed-approachable-avatar-with-cosmic-gradien-28377154-5fef-4156-8ce2-ba20327c.png',
  'https://i.ibb.co/35QzzmWq/Musa-Musa-Kannike-A-minimalistic-male-clean-cut-avatar-with-sharp-g-9a1a9e78-e31e-426f-8f70-d33984e2.png',
  'https://i.ibb.co/DfZNvW1K/Musa-Musa-Kannike-An-avatar-wearing-futuristic-headphones-a-lightwe-f7cb7e36-3a42-4b85-8174-614599ba.png',
  'https://i.ibb.co/jPYpdsW3/Musa-Musa-Kannike-A-bold-explorer-with-a-cosmic-visor-and-sleek-spac-c0eed684-a6f3-44a0-be18-d937269.png'
];

export default function EditProfile() {
  const [userData, setUserData] = useState<UserData>({
    username: '',
    fullName: '',
    email: '',
    profileImage: null
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | null>>({});

  const router = useRouter();
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

        setUserData({
          username: username || '',
          fullName: fullName || '',
          email: email || '',
          profileImage: profileImage || null
        });
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

  // Handle input changes
  const handleChange = (field: keyof UserData, value: string) => {
    setUserData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }

    setHasChanges(true);
  };

  // Validate form
  const validateForm = () => {
    const newErrors: Record<string, string | null> = {};

    if (!userData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (userData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    }

    if (userData.email && !/\S+@\S+\.\S+/.test(userData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Replace handleImagePick with handleAvatarSelect
  const handleAvatarSelect = (avatarUrl: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setUserData(prev => ({
      ...prev,
      profileImage: avatarUrl
    }));
    setHasChanges(true);
  };

  // Handle saving profile changes
  const handleSave = async () => {
    if (!validateForm()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      setIsSaving(true);

      // Get token for authorization
      const token = await SecureStore.getItemAsync('token');

      // Update user data in AsyncStorage
      await AsyncStorage.setItem('username', userData.username);
      if (userData.fullName) await AsyncStorage.setItem('fullName', userData.fullName);
      if (userData.email) await AsyncStorage.setItem('email', userData.email);
      if (userData.profileImage) await AsyncStorage.setItem('profileImage', userData.profileImage);

      const response = await fetch(`${API_ROUTES.USERS.UPDATE_PROFILE}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          username: userData.username,
          fullName: userData.fullName,
          email: userData.email,
          profileImage: userData.profileImage,
        })
      });

      const data = await response.json();

      if (data.status === 'success') {
        if (data.user && data.user.profileImage) {
          await AsyncStorage.setItem('profileImage', userData.profileImage || '');
        }

        toast?.showToast({
          type: 'success',
          message: 'Profile updated successfully',
        });

        setHasChanges(false);
        router.back();
      } else {
        toast?.showToast({
          type: 'error',
          message: data.message || 'Failed to update profile',
        });
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      toast?.showToast({
        type: 'error',
        message: 'Failed to update profile',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle back navigation
  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (hasChanges) {
      Alert.alert(
        'Discard Changes',
        'You have unsaved changes. Are you sure you want to discard them?',
        [
          {
            text: 'Cancel',
            style: 'cancel'
          },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => router.back()
          }
        ]
      );
    } else {
      router.back();
    }
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

          <Text style={styles.headerTitle}>Edit Profile</Text>

          <TouchableOpacity
            style={[styles.saveButton, !hasChanges && styles.saveButtonDisabled]}
            onPress={handleSave}
            activeOpacity={hasChanges ? 0.7 : 1}
            disabled={isSaving || !hasChanges}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.saveButtonText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidingView}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Profile Image Section */}
            <View style={styles.imageSection}>
              <View style={styles.avatarContainer}>
                {/* Fixed Avatar usage */}
                <Avatar
                  source={userData.profileImage ? { uri: userData.profileImage } : require('@/assets/images/icon.png')}
                  size={120}
                  text={userData.fullName?.charAt(0) || userData.username?.charAt(0) || '?'}
                  style={{ borderRadius: 100 }}
                />
              </View>

              <Text style={styles.avatarTitle}>Choose your avatar</Text>
              <View style={styles.avatarGrid}>
                {AVATAR_OPTIONS.map((avatarUrl, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.avatarOption,
                      userData.profileImage === avatarUrl && styles.selectedAvatar
                    ]}
                    onPress={() => handleAvatarSelect(avatarUrl)}
                    activeOpacity={0.7}
                  >
                    <Image
                      source={{ uri: avatarUrl }}
                      style={styles.avatarImage}
                      defaultSource={require('@/assets/images/icon.png')}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Form Fields */}
            <View style={styles.formSection}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Username *</Text>
                <View style={[styles.inputContainer, errors.username && styles.inputError]}>
                  <Ionicons name="at-outline" size={20} color="#8A8FA3" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter username"
                    placeholderTextColor="#8A8FA3"
                    value={userData.username}
                    onChangeText={(text) => handleChange('username', text)}
                    autoCapitalize="none"
                    selectionColor="#4F78FF"
                  />
                </View>
                {errors.username && (
                  <Text style={styles.errorText}>{errors.username}</Text>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Full Name</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="person-outline" size={20} color="#8A8FA3" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your full name"
                    placeholderTextColor="#8A8FA3"
                    value={userData.fullName}
                    onChangeText={(text) => handleChange('fullName', text)}
                    selectionColor="#4F78FF"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email</Text>
                <View style={[styles.inputContainer, errors.email && styles.inputError]}>
                  <Ionicons name="mail-outline" size={20} color="#8A8FA3" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your email address"
                    placeholderTextColor="#8A8FA3"
                    value={userData.email}
                    onChangeText={(text) => handleChange('email', text)}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    selectionColor="#4F78FF"
                  />
                </View>
                {errors.email && (
                  <Text style={styles.errorText}>{errors.email}</Text>
                )}
              </View>
            </View>

            <Text style={styles.requiredText}>* Required fields</Text>
          </ScrollView>
        </KeyboardAvoidingView>
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
  keyboardAvoidingView: {
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
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#4F78FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: 'rgba(79, 120, 255, 0.5)',
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  imageSection: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  avatarTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 20,
  },
  avatarOption: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedAvatar: {
    borderColor: '#4F78FF',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  formSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  inputError: {
    borderColor: '#FF5E5E',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: '100%',
    color: '#FFFFFF',
    fontSize: 16,
  },
  errorText: {
    fontSize: 12,
    color: '#FF5E5E',
    marginTop: 5,
  },
  requiredText: {
    fontSize: 12,
    color: '#8A8FA3',
    textAlign: 'center',
    marginBottom: 20,
  },
});