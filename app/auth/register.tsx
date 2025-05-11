import React, { useState, useContext, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  ActivityIndicator,
  ScrollView,
  Image,
  Keyboard,
  TouchableWithoutFeedback
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ToastContext } from "@/components/Toast/ToastContext";
import * as SecureStore from 'expo-secure-store';
import { API_ROUTES } from '@/constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Register() {
  const [username, setUsername] = useState('');
  const [fullname, setFullname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isFormValid, setIsFormValid] = useState(false);
  const [isFocused, setIsFocused] = useState({
    username: false,
    fullname: false,
    email: false,
    password: false
  });

  const fullnameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const router = useRouter();
  const toast = useContext(ToastContext);

  // Validate form inputs
  useEffect(() => {
    const isValidUsername = username.length >= 3;
    const isValidFullname = fullname.length >= 3;
    const isValidEmail = /\S+@\S+\.\S+/.test(email);
    const isValidPassword = password.length >= 8;
    setIsFormValid(isValidUsername && isValidFullname && isValidEmail && isValidPassword);
  }, [username, fullname, email, password]);

  const handleRegister = async () => {
    if (!isFormValid) {
      toast?.showToast({
        type: 'error',
        message: 'Please check all fields are filled correctly.',
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_ROUTES.AUTH.REGISTER}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          fullname,
          email,
          password,
        }),
      });

      const data = await response.json();
      console.log(JSON.stringify(data, null, 2));

      if (data.status === 'success') {
        // Store the token if provided
        if (data.token) {
          await SecureStore.setItemAsync('token', data.token);
          await AsyncStorage.setItem('username', data.user.username);
          await AsyncStorage.setItem('fullname', data.user.fullname);
          await AsyncStorage.setItem('email', data.user.email);
          if (data.user.profileImage) {
            await AsyncStorage.setItem('profileImage', data.user.profileImage);
          }
          await AsyncStorage.setItem('isPremium', JSON.stringify(data.user.isPremium || false));
          await AsyncStorage.setItem('joinedDate', JSON.stringify(data.user.joinedDate || new Date()));
        }

        toast?.showToast({
          type: 'success',
          message: 'Verify your email to continue, check your email for verification link.',
        });

        // Navigate to the main app or login page based on your flow
        router.replace('/auth/login');
      } else {
        toast?.showToast({
          type: 'error',
          message: data.message || 'Registration failed. Please try again.',
        });
      }
    } catch (error) {
      toast?.showToast({
        type: 'error',
        message: 'Network error. Please check your connection.',
      });
      console.error('Registration error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFocus = (field: string) => {
    setIsFocused(prev => ({ ...prev, [field]: true }));
  };

  const handleBlur = (field: string) => {
    setIsFocused(prev => ({ ...prev, [field]: false }));
  };

  const handleSignIn = () => {
    router.push('/auth/login');
  };

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
              <Text style={styles.welcomeText}>Create Account</Text>
              <Text style={styles.loginText}>Sign up to get started</Text>

              <View style={styles.inputContainer}>
                {/* Username Input */}
                <View style={[
                  styles.inputWrapper,
                  isFocused.username && styles.inputWrapperFocused
                ]}>
                  <Ionicons
                    name="person-outline"
                    size={20}
                    color={isFocused.username ? "#4F78FF" : "#8A8FA3"}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Username"
                    placeholderTextColor="#8A8FA3"
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                    returnKeyType="next"
                    onSubmitEditing={() => fullnameRef.current?.focus()}
                    onFocus={() => handleFocus('username')}
                    onBlur={() => handleBlur('username')}
                    autoCorrect={false}
                  />
                </View>

                {/* Full Name Input */}
                <View style={[
                  styles.inputWrapper,
                  isFocused.fullname && styles.inputWrapperFocused
                ]}>
                  <Ionicons
                    name="person-circle-outline"
                    size={20}
                    color={isFocused.fullname ? "#4F78FF" : "#8A8FA3"}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    ref={fullnameRef}
                    style={styles.input}
                    placeholder="Full Name"
                    placeholderTextColor="#8A8FA3"
                    value={fullname}
                    onChangeText={setFullname}
                    returnKeyType="next"
                    onSubmitEditing={() => emailRef.current?.focus()}
                    onFocus={() => handleFocus('fullname')}
                    onBlur={() => handleBlur('fullname')}
                  />
                </View>

                {/* Email Input */}
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
                    ref={emailRef}
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

                {/* Password Input */}
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
                    onSubmitEditing={handleRegister}
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

                <TouchableOpacity
                  style={[
                    styles.registerButton,
                    isFormValid ? styles.registerButtonActive : styles.registerButtonDisabled
                  ]}
                  onPress={handleRegister}
                  disabled={isLoading || !isFormValid}
                  activeOpacity={0.8}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.registerButtonText}>Sign Up</Text>
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>

              <View style={styles.socialLogin}>
                <TouchableOpacity style={styles.socialButton}>
                  <Ionicons name="logo-google" size={20} color="#FFFFFF" />
                  <Text style={styles.socialButtonText}>Google</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.socialButton}>
                  <Ionicons name="logo-apple" size={20} color="#FFFFFF" />
                  <Text style={styles.socialButtonText}>Apple</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <TouchableOpacity onPress={handleSignIn}>
                <Text style={styles.signInText}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
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
  registerButton: {
    backgroundColor: '#4F78FF',
    borderRadius: 12,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 8,
  },
  registerButtonActive: {
    backgroundColor: '#4F78FF',
  },
  registerButtonDisabled: {
    backgroundColor: 'rgba(79, 120, 255, 0.5)',
  },
  registerButtonText: {
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
  signInText: {
    color: '#4F78FF',
    fontSize: 14,
    fontWeight: '600',
  }
});