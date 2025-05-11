import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  SafeAreaView,
  ActivityIndicator,
  Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useNavigation } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ToastContext } from '@/components/Toast/ToastContext';

export default function PremiumManage() {
  const [subscriptionData, setSubscriptionData] = useState({
    plan: 'Yearly',
    startDate: new Date(),
    nextBillingDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
    status: 'Active',
    price: 89.99
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);

  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const toast = useContext(ToastContext);

  // Load subscription data on mount
  useEffect(() => {
    const loadSubscriptionData = async () => {
      try {
        setIsLoading(true);

        // In a real app, you would fetch subscription data from API
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));

        // For now, just use the default data
        // You could load some values from AsyncStorage

      } catch (error) {
        console.error('Error loading subscription data:', error);
        toast?.showToast({
          type: 'error',
          message: 'Failed to load subscription data',
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadSubscriptionData();
  }, []);

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

  // Handle cancel subscription
  const handleCancelSubscription = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    Alert.alert(
      'Cancel Subscription',
      'Are you sure you want to cancel your premium subscription? You will still have access until the end of your current billing period.',
      [
        {
          text: 'Keep Subscription',
          style: 'cancel'
        },
        {
          text: 'Cancel Subscription',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsCancelling(true);

              // Get token for authorization
              const token = await AsyncStorage.getItem('token');

              // In a real app, you would make an API call to cancel subscription
              // For example:
              // const response = await fetch('http://localhost:5000/api/v1/subscriptions/cancel', {
              //   method: 'POST',
              //   headers: {
              //     'Content-Type': 'application/json',
              //     'Authorization': `Bearer ${token}`
              //   }
              // });

              // Simulate API delay
              await new Promise(resolve => setTimeout(resolve, 1500));

              // Update subscription data
              setSubscriptionData(prev => ({
                ...prev,
                status: 'Canceled (Expires on ' + formatDate(prev.nextBillingDate) + ')'
              }));

              toast?.showToast({
                type: 'success',
                message: 'Subscription canceled successfully',
              });
            } catch (error) {
              console.error('Error canceling subscription:', error);
              toast?.showToast({
                type: 'error',
                message: 'Failed to cancel subscription',
              });
            } finally {
              setIsCancelling(false);
            }
          }
        }
      ]
    );
  };

  // Handle change plan
  const handleChangePlan = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/premium/change-plan');
  };

  // Handle update payment
  const handleUpdatePayment = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/premium/payment');
  };

  // Handle view invoices
  const handleViewInvoices = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/premium/invoices');
  };

  if (isLoading) {
    return (
      <LinearGradient
        colors={['#090E23', '#1F2B5E', '#0C1339']}
        style={[{ flex: 1, justifyContent: 'center', alignItems: 'center' }, { paddingTop: insets.top }]}
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

          <Text style={styles.headerTitle}>Manage Subscription</Text>

          <View style={styles.placeholderView} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Premium Status Card */}
          <View style={styles.statusCard}>
            <LinearGradient
              colors={['#FFD700', '#FFAA00']}
              style={styles.statusGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.statusHeader}>
                <Ionicons name="star" size={28} color="#FFFFFF" />
                <Text style={styles.statusTitle}>Premium Active</Text>
              </View>

              <Text style={styles.statusPlan}>{subscriptionData.plan} Plan</Text>
              <Text style={styles.statusPrice}>${subscriptionData.price}</Text>

              <View style={styles.statusDivider} />

              <View style={styles.statusInfo}>
                <View style={styles.statusItem}>
                  <Text style={styles.statusLabel}>Status</Text>
                  <Text style={styles.statusValue}>{subscriptionData.status}</Text>
                </View>

                <View style={styles.statusItem}>
                  <Text style={styles.statusLabel}>Started on</Text>
                  <Text style={styles.statusValue}>{formatDate(subscriptionData.startDate)}</Text>
                </View>

                <View style={styles.statusItem}>
                  <Text style={styles.statusLabel}>Next billing date</Text>
                  <Text style={styles.statusValue}>{formatDate(subscriptionData.nextBillingDate)}</Text>
                </View>
              </View>
            </LinearGradient>
          </View>

          {/* Manage Options */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Manage Subscription</Text>

            <View style={styles.optionsCard}>
              <TouchableOpacity
                style={styles.optionItem}
                onPress={handleChangePlan}
                activeOpacity={0.7}
              >
                <View style={styles.optionIconContainer}>
                  <Ionicons name="sync-outline" size={20} color="#4F78FF" />
                </View>
                <View style={styles.optionContent}>
                  <Text style={styles.optionTitle}>Change Plan</Text>
                  <Text style={styles.optionDescription}>Switch between monthly and yearly plans</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#8A8FA3" />
              </TouchableOpacity>

              <View style={styles.separator} />

              <TouchableOpacity
                style={styles.optionItem}
                onPress={handleUpdatePayment}
                activeOpacity={0.7}
              >
                <View style={styles.optionIconContainer}>
                  <Ionicons name="card-outline" size={20} color="#4F78FF" />
                </View>
                <View style={styles.optionContent}>
                  <Text style={styles.optionTitle}>Payment Methods</Text>
                  <Text style={styles.optionDescription}>Update your payment information</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#8A8FA3" />
              </TouchableOpacity>

              <View style={styles.separator} />

              <TouchableOpacity
                style={styles.optionItem}
                onPress={handleViewInvoices}
                activeOpacity={0.7}
              >
                <View style={styles.optionIconContainer}>
                  <Ionicons name="document-text-outline" size={20} color="#4F78FF" />
                </View>
                <View style={styles.optionContent}>
                  <Text style={styles.optionTitle}>Billing History</Text>
                  <Text style={styles.optionDescription}>View past invoices and payments</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#8A8FA3" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Cancel Subscription */}
          <View style={styles.cancelContainer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancelSubscription}
              activeOpacity={0.7}
              disabled={isCancelling || subscriptionData.status !== 'Active'}
            >
              {isCancelling ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.cancelButtonText}>
                  {subscriptionData.status === 'Active' ? 'Cancel Subscription' : 'Subscription Canceled'}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Help Section */}
          <View style={styles.helpSection}>
            <Text style={styles.helpTitle}>Need Help?</Text>
            <Text style={styles.helpText}>
              If you have any questions about your subscription, please contact our support team.
            </Text>

            <TouchableOpacity
              style={styles.supportButton}
              onPress={() => router.push('/help')}
              activeOpacity={0.7}
            >
              <Text style={styles.supportButtonText}>Contact Support</Text>
            </TouchableOpacity>
          </View>
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
  placeholderView: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  statusCard: {
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  statusGradient: {
    padding: 20,
    borderRadius: 16,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 10,
  },
  statusPlan: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  statusPrice: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 4,
    marginBottom: 8,
  },
  statusDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginVertical: 16,
  },
  statusInfo: {
    marginTop: 8,
  },
  statusItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statusLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
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
  optionsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    overflow: 'hidden',
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  optionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(79, 120, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 12,
    color: '#8A8FA3',
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginLeft: 72, // Align with icon
  },
  cancelContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  cancelButton: {
    backgroundColor: 'rgba(255, 94, 94, 0.8)',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  helpSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    alignItems: 'center',
  },
  helpTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  helpText: {
    fontSize: 14,
    color: '#B4C6EF',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  supportButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: 'rgba(79, 120, 255, 0.2)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(79, 120, 255, 0.5)',
  },
  supportButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4F78FF',
  },
});