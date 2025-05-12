import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
    Dimensions,
    ScrollView,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { NotificationItem } from './NotificationItem';
import { API_ROUTES } from '@/constants';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');

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

interface NotificationsModalProps {
    visible: boolean;
    onClose: () => void;
    token: string | null;
}

export const NotificationsModal = ({ visible, onClose, token }: NotificationsModalProps) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    const fetchNotifications = async () => {
        if (!token) return;

        try {
            setLoading(true);
            setError(null);

            const response = await fetch(API_ROUTES.NOTIFICATIONS.GET_NOTIFICATIONS, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data: NotificationsResponse = await response.json();

            if (response.ok) {
                setNotifications(data.notifications);
            } else {
                setError(data.status === 'error' ? 'Failed to load notifications' : 'An error occurred');
            }
        } catch (err) {
            setError('Network error. Please check your connection.');
            console.error('Error fetching notifications:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        if (visible) {
            fetchNotifications();
        }
    }, [visible, token]);

    const handleRefresh = () => {
        setRefreshing(true);
        fetchNotifications();
    };

    const handleNotificationPress = (notification: Notification) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        // Handle notification press - could navigate to relevant screen based on notification type
        console.log('Notification pressed:', notification);
    };

    const renderEmptyState = () => (
        <View style={styles.emptyContainer}>
            <Ionicons name="notifications-off-outline" size={70} color="#4F78FF" style={styles.emptyIcon} />
            <Text style={styles.emptyTitle}>No notifications</Text>
            <Text style={styles.emptyText}>You don't have any notifications yet</Text>
        </View>
    );

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <BlurView intensity={20} style={styles.overlay} tint="dark">
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <View style={styles.header}>
                            <Text style={styles.title}>Notifications</Text>
                            <TouchableOpacity onPress={() => onClose()} style={styles.closeButton}>
                                <Ionicons name="close" size={24} color="#FFFFFF" />
                            </TouchableOpacity>
                        </View>

                        {loading && !refreshing ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="large" color="#4F78FF" />
                                <Text style={styles.loadingText}>Loading notifications...</Text>
                            </View>
                        ) : error ? (
                            <View style={styles.errorContainer}>
                                <Ionicons name="alert-circle-outline" size={50} color="#FF5E5E" />
                                <Text style={styles.errorText}>{error}</Text>
                                <TouchableOpacity
                                    style={styles.retryButton}
                                    onPress={fetchNotifications}
                                >
                                    <Text style={styles.retryButtonText}>Retry</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <FlatList
                                data={notifications}
                                keyExtractor={(item) => item._id}
                                renderItem={({ item }) => (
                                    <NotificationItem
                                        id={item._id}
                                        title={item.title}
                                        message={item.message}
                                        type={item.type}
                                        createdAt={item.createdAt}
                                        onPress={() => handleNotificationPress(item)}
                                    />
                                )}
                                contentContainerStyle={styles.listContent}
                                showsVerticalScrollIndicator={false}
                                ListEmptyComponent={renderEmptyState}
                                onRefresh={handleRefresh}
                                refreshing={refreshing}
                            />
                        )}
                    </View>
                </View>
            </BlurView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(9, 14, 35, 0.8)',
        width: "100%",
        height: "100%",
    },
    modalContainer: {
        width: width * 0.9,
        height: height * 0.8,
        maxHeight: height * 0.8,
        borderRadius: 20,
        overflow: 'hidden',
        backgroundColor: '#0C1339',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        position: "absolute",
        left: width / 2,
        top: height / 2,
        transform: [
            { translateX: -(width * 0.9) / 2 },
            { translateY: -(height * 0.8) / 2 },
        ],
        zIndex: 1001,
    },
    modalContent: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    closeButton: {
        padding: 4,
    },
    listContent: {
        padding: 16,
        flexGrow: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        color: '#B4C6EF',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    errorText: {
        marginTop: 12,
        fontSize: 16,
        color: '#FF5E5E',
        textAlign: 'center',
        marginBottom: 16,
    },
    retryButton: {
        backgroundColor: '#4F78FF',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 12,
    },
    retryButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    emptyIcon: {
        marginBottom: 16,
        opacity: 0.6,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 14,
        color: '#B4C6EF',
        textAlign: 'center',
    },
});
