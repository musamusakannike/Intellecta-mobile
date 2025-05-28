import { ForgotPasswordModal } from '@/components/ForgotPasswordModal';
import { ToastContext } from "@/components/Toast/ToastContext";
import { VerifyEmailModal } from '@/components/VerifyEmailModal';
import { API_ROUTES } from '@/constants';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { makeRedirectUri, ResponseType } from 'expo-auth-session';
import { useAuthRequest } from 'expo-auth-session/providers/google';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useContext, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isFormValid, setIsFormValid] = useState(false);
  const [isFocused, setIsFocused] = useState({ email: false, password: false });
  const [isVerifyEmailModal, setIsVerifyEmailModal] = useState(false);
  const [isForgotPasswordModal, setIsForgotPasswordModal] = useState(false);

  const passwordRef = useRef<TextInput>(null);
  const router = useRouter();
  const toast = useContext(ToastContext);

  // Validate form inputs
  useEffect(() => {
    const isValidEmail = /\S+@\S+\.\S+/.test(email);
    const isValidPassword = password.length >= 8;
    setIsFormValid(isValidEmail && isValidPassword);
  }, [email, password]);

  const handleLogin = async () => {
    if (!isFormValid) {
      toast?.showToast({
        type: 'error',
        message: 'Please check your email and password.',
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_ROUTES.AUTH.LOGIN}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();

      if (data.status === 'success') {
        // Store the token
        await SecureStore.setItemAsync('token', data.token);
        await AsyncStorage.setItem('username', data.user.username);
        await AsyncStorage.setItem('fullname', data.user.fullname);
        await AsyncStorage.setItem('email', data.user.email);
        await AsyncStorage.setItem('profileImage', data.user.profileImage);
        await AsyncStorage.setItem('isPremium', JSON.stringify(data.user.isPremium));
        await AsyncStorage.setItem('joinedDate', JSON.stringify(data.user.joinedDate));

        toast?.showToast({
          type: 'success',
          message: data.message || 'Login successful',
        });

        // Navigate to the main app
        router.replace('/');
      } else {
        toast?.showToast({
          type: 'error',
          message: data.message || 'Login failed. Please try again.',
        });
      }
    } catch (error) {
      toast?.showToast({
        type: 'error',
        message: 'Network error. Please check your connection.',
      });
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFocus = (field: any) => {
    setIsFocused(prev => ({ ...prev, [field]: true }));
  };

  const handleBlur = (field: any) => {
    setIsFocused(prev => ({ ...prev, [field]: false }));
  };

  const handleSignUp = () => {
    router.push('/auth/register');
  };

  const handleVerifyEmail = () => {
    setIsVerifyEmailModal(true);
  };

  const handleForgotPassword = () => {
    setIsForgotPasswordModal(true);
  };

  // Google Auth
  const redirectUri = makeRedirectUri({
    scheme: 'Intellecta',
  });
  const [request, response, promptAsync] = useAuthRequest({
    clientId: '231107779970-1jgpt29dv8mm65k65gdiqdabvk5bd6on.apps.googleusercontent.com',
    redirectUri,
    responseType: ResponseType.IdToken,
    scopes: ['profile', 'email', 'openid'],
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      if (id_token) {
        // Send id_token to your backend to exchange for JWT
        fetch(`${API_ROUTES.AUTH.LOGIN.replace('/login', '/google')}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id_token }),
        })
          .then(res => res.json())
          .then(async data => {
            if (data.token) {
              await SecureStore.setItemAsync('token', data.token);
              toast?.showToast({ type: 'success', message: 'Google login successful!' });
              router.replace('/');
            } else {
              toast?.showToast({ type: 'error', message: data.message || 'Google login failed.' });
            }
          })
          .catch(() => {
            toast?.showToast({ type: 'error', message: 'Google login failed.' });
          });
      }
    }
  }, [response, router, toast]);

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

        <LinearGradient
          colors={['#090E23', '#1F2B5E', '#0C1339']}
          style={styles.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <Image
                source={require('@/assets/images/icon.png')}
                style={styles.logo}
                defaultSource={require('@/assets/images/icon.png')}
              />
              <Text style={styles.appName}>Intellecta</Text>
              <Text style={styles.subtitle}>Knowledge amplified</Text>
            </View>

            <View style={styles.formContainer}>
              <Text style={styles.welcomeText}>Welcome back</Text>
              <Text style={styles.loginText}>Sign in to continue</Text>

              <View style={styles.inputContainer}>
                <View style={[
                  styles.inputWrapper,
                  isFocused.email && styles.inputWrapperFocused
                ]}>
                  <Ionicons
                    name="mail-outline"
                    size={20}
                    color={isFocused.email ? "#4F78FF" : "#8A8FA3"}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Email address"
                    placeholderTextColor="#8A8FA3"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    returnKeyType="next"
                    onSubmitEditing={() => passwordRef.current?.focus()}
                    onFocus={() => handleFocus('email')}
                    onBlur={() => handleBlur('email')}
                    autoCorrect={false}
                  />
                </View>

                <View style={[
                  styles.inputWrapper,
                  isFocused.password && styles.inputWrapperFocused
                ]}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color={isFocused.password ? "#4F78FF" : "#8A8FA3"}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    ref={passwordRef}
                    style={styles.input}
                    placeholder="Password"
                    placeholderTextColor="#8A8FA3"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    returnKeyType="done"
                    onSubmitEditing={handleLogin}
                    onFocus={() => handleFocus('password')}
                    onBlur={() => handleBlur('password')}
                  />
                  <TouchableOpacity
                    style={styles.eyeIcon}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <Ionicons
                      name={showPassword ? "eye-off-outline" : "eye-outline"}
                      size={20}
                      color="#8A8FA3"
                    />
                  </TouchableOpacity>
                </View>

                <View style={styles.forgotPasswordContainer}>
                  <TouchableOpacity
                    style={styles.forgotPassword}
                    onPress={handleVerifyEmail}
                  >
                    <Text style={styles.forgotPasswordText}>Verify Email</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.forgotPassword}
                    onPress={handleForgotPassword}
                  >
                    <Text style={styles.forgotPasswordText}>Forgot password?</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[
                    styles.loginButton,
                    isFormValid ? styles.loginButtonActive : styles.loginButtonDisabled
                  ]}
                  onPress={handleLogin}
                  disabled={isLoading || !isFormValid}
                  activeOpacity={0.8}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.loginButtonText}>Sign In</Text>
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>

              <View style={styles.socialLogin}>
                <TouchableOpacity style={styles.socialButton} onPress={() => promptAsync()} disabled={!request}>
                  <Ionicons name="logo-google" size={24} color="#4285F4" />
                  <Text style={styles.socialButtonText}>Sign in with Google</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.socialButton}>
                  <Ionicons name="logo-github" size={20} color="#FFFFFF" />
                  <Text style={styles.socialButtonText}>GitHub</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Don&apos;t have an account? </Text>
              <TouchableOpacity onPress={handleSignUp}>
                <Text style={styles.signUpText}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          <VerifyEmailModal
            visible={isVerifyEmailModal}
            onClose={() => setIsVerifyEmailModal(false)}
          />
          <ForgotPasswordModal
            visible={isForgotPasswordModal}
            onClose={() => setIsForgotPasswordModal(false)}
          />
        </LinearGradient>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 80,
    height: 80,
    resizeMode: 'contain',
    marginBottom: 16,
  },
  logoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(79, 120, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    color: '#4F78FF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif-light',
  },
  subtitle: {
    fontSize: 14,
    color: '#B4C6EF',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  formContainer: {
    width: '100%',
    maxWidth: 360,
    alignSelf: 'center',
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  loginText: {
    fontSize: 16,
    color: '#B4C6EF',
    marginBottom: 30,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 20,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 12,
    height: 56,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  inputWrapperFocused: {
    borderColor: '#4F78FF',
    backgroundColor: 'rgba(79, 120, 255, 0.08)',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    height: '100%',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  eyeIcon: {
    padding: 10,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    color: '#4F78FF',
    fontSize: 14,
    fontWeight: '500',
  },
  loginButton: {
    backgroundColor: '#4F78FF',
    borderRadius: 12,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  loginButtonActive: {
    backgroundColor: '#4F78FF',
  },
  loginButtonDisabled: {
    backgroundColor: 'rgba(79, 120, 255, 0.5)',
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  dividerText: {
    color: '#B4C6EF',
    paddingHorizontal: 16,
    fontSize: 14,
  },
  socialLogin: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    height: 56,
    width: '48%',
  },
  socialButtonText: {
    color: '#FFFFFF',
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 40,
  },
  footerText: {
    color: '#B4C6EF',
    fontSize: 14,
  },
  signUpText: {
    color: '#4F78FF',
    fontSize: 14,
    fontWeight: '600',
  },
  forgotPasswordContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  }
});