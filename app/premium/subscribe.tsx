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
  ImageBackground,
  Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useNavigation } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ToastContext } from '@/components/Toast/ToastContext';

const PLANS = [
  {
    id: 'monthly',
    name: 'Monthly',
    price: 9.99,
    description: 'Billed monthly',
    features: [
      'Access to all premium courses',
      'Unlimited downloads',
      'Ad-free experience',
      'Priority support'
    ]
  },
  {
    id: 'yearly',
    name: 'Yearly',
    price: 89.99,
    description: 'Billed annually (save 25%)',
    features: [
      'Access to all premium courses',
      'Unlimited downloads',
      'Ad-free experience',
      'Priority support',
      'Early access to new content',
      'Exclusive community access'
    ],
    popular: true
  }
];

export default function PremiumSubscribe() {
  const [selectedPlan, setSelectedPlan] = useState('yearly');
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const toast = useContext(ToastContext);
  
  // Handle plan selection
  const handleSelectPlan = (planId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedPlan(planId);
  };
  
  // Handle subscription process
  const handleSubscribe = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      setIsProcessing(true);
      
      // Get token for authorization
      const token = await AsyncStorage.getItem('token');
      
      // In a real app, you would make an API call to process payment
      // and activate subscription
      // For example:
      // const response = await fetch('http://localhost:5000/api/v1/subscriptions', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     'Authorization': `Bearer ${token}`
      //   },
      //   body: JSON.stringify({
      //     planId: selectedPlan
      //   })
      // });
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Update user's premium status in AsyncStorage
      await AsyncStorage.setItem('isPremium', 'true');
      
      toast?.showToast({
        type: 'success',
        message: 'Subscription activated successfully',
      });
      
      // Navigate to the profile screen
      router.replace('/auth/profile');
    } catch (error) {
      console.error('Error processing subscription:', error);
      toast?.showToast({
        type: 'error',
        message: 'Failed to process subscription',
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Handle restore purchases
  const handleRestore = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    try {
      setIsLoading(true);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In a real app, you would verify purchases with the store
      // For now, just show a message
      Alert.alert(
        'No Purchases Found',
        'We could not find any previous purchases associated with this account.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error restoring purchases:', error);
      toast?.showToast({
        type: 'error',
        message: 'Failed to restore purchases',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle back navigation
  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.goBack();
  };
  
  // Get the selected plan details
  const getSelectedPlan = () => {
    return PLANS.find(plan => plan.id === selectedPlan);
  };
  
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
          
          <Text style={styles.headerTitle}>Premium</Text>
          
          <View style={styles.placeholderView} />
        </View>
        
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Section */}
          <View style={styles.heroSection}>
            <View style={styles.starIconContainer}>
              <LinearGradient
                colors={['#FFD700', '#FFAA00']}
                style={styles.starIconGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="star" size={40} color="#FFFFFF" />
              </LinearGradient>
            </View>
            
            <Text style={styles.heroTitle}>Upgrade to Premium</Text>
            <Text style={styles.heroSubtitle}>
              Unlock all content and features with premium membership
            </Text>
          </View>
          
          {/* Benefits Section */}
          <View style={styles.benefitsSection}>
            <Text style={styles.sectionTitle}>Premium Benefits</Text>
            
            <View style={styles.benefitsList}>
              <View style={styles.benefitItem}>
                <View style={styles.benefitIconContainer}>
                  <Ionicons name="book" size={24} color="#4F78FF" />
                </View>
                <View style={styles.benefitContent}>
                  <Text style={styles.benefitTitle}>All Courses Access</Text>
                  <Text style={styles.benefitDescription}>
                    Get unlimited access to our entire library of courses
                  </Text>
                </View>
              </View>
              
              <View style={styles.benefitItem}>
                <View style={styles.benefitIconContainer}>
                  <Ionicons name="download" size={24} color="#4F78FF" />
                </View>
                <View style={styles.benefitContent}>
                  <Text style={styles.benefitTitle}>Offline Access</Text>
                  <Text style={styles.benefitDescription}>
                    Download courses for offline viewing anytime
                  </Text>
                </View>
              </View>
              
              <View style={styles.benefitItem}>
                <View style={styles.benefitIconContainer}>
                  <Ionicons name="shield-checkmark" size={24} color="#4F78FF" />
                </View>
                <View style={styles.benefitContent}>
                  <Text style={styles.benefitTitle}>Ad-Free Experience</Text>
                  <Text style={styles.benefitDescription}>
                    Enjoy a seamless experience without interruptions
                  </Text>
                </View>
              </View>
              
              <View style={styles.benefitItem}>
                <View style={styles.benefitIconContainer}>
                  <Ionicons name="people" size={24} color="#4F78FF" />
                </View>
                <View style={styles.benefitContent}>
                  <Text style={styles.benefitTitle}>Community Access</Text>
                  <Text style={styles.benefitDescription}>
                    Connect with experts and fellow learners
                  </Text>
                </View>
              </View>
              
              <View style={styles.benefitItem}>
                <View style={styles.benefitIconContainer}>
                  <Ionicons name="headset" size={24} color="#4F78FF" />
                </View>
                <View style={styles.benefitContent}>
                  <Text style={styles.benefitTitle}>Priority Support</Text>
                  <Text style={styles.benefitDescription}>
                    Get fast responses to all your questions
                  </Text>
                </View>
              </View>
            </View>
          </View>
          
          {/* Plans Section */}
          <View style={styles.plansSection}>
            <Text style={styles.sectionTitle}>Choose Your Plan</Text>
            
            <View style={styles.plansContainer}>
              {PLANS.map((plan) => (
                <TouchableOpacity
                  key={plan.id}
                  style={[
                    styles.planCard,
                    selectedPlan === plan.id && styles.selectedPlanCard,
                    plan.popular && styles.popularPlanCard
                  ]}
                  onPress={() => handleSelectPlan(plan.id)}
                  activeOpacity={0.8}
                >
                  {plan.popular && (
                    <View style={styles.popularBadge}>
                      <Text style={styles.popularBadgeText}>Best Value</Text>
                    </View>
                  )}
                  
                  <View style={styles.planHeader}>
                    <View style={styles.planTitleContainer}>
                      <Text style={styles.planName}>{plan.name}</Text>
                      <Text style={styles.planDescription}>{plan.description}</Text>
                    </View>
                    
                    <View style={styles.radioContainer}>
                      <View style={[
                        styles.radioOuter,
                        selectedPlan === plan.id && styles.radioOuterSelected
                      ]}>
                        {selectedPlan === plan.id && (
                          <View style={styles.radioInner} />
                        )}
                      </View>
                    </View>
                  </View>
                  
                  <View style={styles.planPriceContainer}>
                    <Text style={styles.planPrice}>${plan.price}</Text>
                  </View>
                  
                  <View style={styles.planFeatures}>
                    {plan.features.map((feature, index) => (
                      <View key={index} style={styles.featureItem}>
                        <Ionicons name="checkmark-circle" size={18} color="#4F78FF" style={styles.featureIcon} />
                        <Text style={styles.featureText}>{feature}</Text>
                      </View>
                    ))}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          {/* Subscribe Button */}
          <View style={styles.subscribeContainer}>
            <TouchableOpacity 
              style={styles.subscribeButton}
              onPress={handleSubscribe}
              activeOpacity={0.8}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="star" size={20} color="#FFFFFF" style={styles.subscribeIcon} />
                  <Text style={styles.subscribeText}>
                    Subscribe Now
                  </Text>
                </>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.restoreButton}
              onPress={handleRestore}
              activeOpacity={0.7}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#8A8FA3" />
              ) : (
                <Text style={styles.restoreText}>Restore purchases</Text>
              )}
            </TouchableOpacity>
          </View>
          
          {/* Terms and Privacy */}
          <View style={styles.termsContainer}>
            <Text style={styles.termsText}>
              By subscribing, you agree to our{' '}
              <Text style={styles.termsLink} onPress={() => router.push('/termsprivacy')}>
                Terms of Service
              </Text>
              {' '}and{' '}
              <Text style={styles.termsLink} onPress={() => router.push('/termsprivacy')}>
                Privacy Policy
              </Text>
            </Text>
            
            <Text style={styles.cancellationText}>
              You can cancel your subscription anytime from your account settings.
            </Text>
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
  heroSection: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  starIconContainer: {
    marginBottom: 16,
  },
  starIconGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#B4C6EF',
    textAlign: 'center',
    maxWidth: '80%',
  },
  benefitsSection: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  benefitsList: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  benefitIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(79, 120, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  benefitContent: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  benefitDescription: {
    fontSize: 14,
    color: '#B4C6EF',
  },
  plansSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  plansContainer: {
    marginBottom: 16,
  },
  planCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  selectedPlanCard: {
    borderColor: '#4F78FF',
    backgroundColor: 'rgba(79, 120, 255, 0.1)',
  },
  popularPlanCard: {
    borderColor: '#FFD700',
  },
  popularBadge: {
    position: 'absolute',
    top: -12,
    right: 16,
    backgroundColor: '#FFD700',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000000',
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  planTitleContainer: {
    flex: 1,
  },
  planName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  planDescription: {
    fontSize: 14,
    color: '#B4C6EF',
  },
  radioContainer: {
    marginLeft: 16,
    padding: 4,
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuterSelected: {
    borderColor: '#4F78FF',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4F78FF',
  },
  planPriceContainer: {
    marginBottom: 16,
  },
  planPrice: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  planFeatures: {
    marginTop: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureIcon: {
    marginRight: 8,
  },
  featureText: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  subscribeContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  subscribeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4F78FF',
    borderRadius: 12,
    paddingVertical: 16,
    marginBottom: 16,
  },
  subscribeIcon: {
    marginRight: 8,
  },
  subscribeText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  restoreButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  restoreText: {
    fontSize: 14,
    color: '#8A8FA3',
    textAlign: 'center',
  },
  termsContainer: {
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  termsText: {
    fontSize: 12,
    color: '#8A8FA3',
    textAlign: 'center',
    marginBottom: 8,
  },
  termsLink: {
    color: '#4F78FF',
  },
  cancellationText: {
    fontSize: 12,
    color: '#8A8FA3',
    textAlign: 'center',
  },
});