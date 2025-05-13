import React, { useContext, useState } from 'react';
import {
    Modal,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    TouchableWithoutFeedback,
    Keyboard,
    Platform,
} from 'react-native';
import { API_ROUTES } from '../constants';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { ToastContext } from "@/components/Toast/ToastContext";

interface ForgotPasswordModalProps {
    visible: boolean;
    onClose: () => void;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
    visible,
    onClose,
}) => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [isFocused, setIsFocused] = useState(false);

    const toast = useContext(ToastContext);

    const handleVerifyEmail = async () => {
        if (!email) {
            toast?.showToast({
                type: 'error',
                message: 'Please enter your email address',
            });
            return;
        }

        if (!/\S+@\S+\.\S+/.test(email)) {
            toast?.showToast({
                type: 'error',
                message: 'Please enter a valid email address',
            });
            return;
        }

        try {
            setLoading(true);
            const response = await fetch(API_ROUTES.AUTH.FORGOT_PASSWORD, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (response.ok) {
                toast?.showToast({
                    type: 'success',
                    message: 'Verification email has been sent. Please check your inbox.',
                });
                onClose();
            } else {
                toast?.showToast({
                    type: 'error',
                    message: data.message || 'Failed to send verification email',
                });
            }
        } catch (error) {
            toast?.showToast({
                type: 'error',
                message: 'Something went wrong. Please try again.',
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={styles.overlay}>
                    <LinearGradient
                        colors={['#090E23', '#1F2B5E', '#0C1339']}
                        style={styles.modalContainer}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        <Text style={styles.title}>Forgot Password</Text>
                        <Text style={styles.description}>
                            Enter your email address to receive a verification link.
                        </Text>

                        <View style={[
                            styles.inputWrapper,
                            isFocused && styles.inputWrapperFocused
                        ]}>
                            <Ionicons
                                name="mail-outline"
                                size={20}
                                color={isFocused ? "#4F78FF" : "#8A8FA3"}
                                style={styles.inputIcon}
                            />
                            <TextInput
                                style={styles.input}
                                placeholder="Email address"
                                placeholderTextColor="#8A8FA3"
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoCorrect={false}
                                onFocus={() => setIsFocused(true)}
                                onBlur={() => setIsFocused(false)}
                            />
                        </View>

                        <View style={styles.buttonContainer}>
                            <TouchableOpacity
                                style={[styles.button, styles.cancelButton]}
                                onPress={onClose}
                                disabled={loading}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[
                                    styles.button,
                                    styles.verifyButton,
                                    !email && styles.buttonDisabled
                                ]}
                                onPress={handleVerifyEmail}
                                disabled={loading || !email}
                                activeOpacity={0.8}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#FFFFFF" size="small" />
                                ) : (
                                    <Text style={styles.buttonText}>Verify</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </LinearGradient>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modalContainer: {
        width: '100%',
        maxWidth: 400,
        borderRadius: 16,
        padding: 24,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: 12,
        textAlign: 'center',
    },
    description: {
        fontSize: 16,
        color: '#B4C6EF',
        marginBottom: 24,
        textAlign: 'center',
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 12,
        marginBottom: 24,
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
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
    },
    button: {
        flex: 1,
        borderRadius: 12,
        height: 56,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
    },
    verifyButton: {
        backgroundColor: '#4F78FF',
    },
    buttonDisabled: {
        backgroundColor: 'rgba(79, 120, 255, 0.5)',
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    cancelButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
});