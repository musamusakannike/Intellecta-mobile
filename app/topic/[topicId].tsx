import React, { useState, useEffect, useContext, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  RefreshControl,
  Dimensions,
  Platform,
  SafeAreaView,
  Animated as RNAnimated,
  FlatList
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { ToastContext } from "@/components/Toast/ToastContext";
import * as Haptics from 'expo-haptics';
import { Skeleton } from "@/components/Skeleton";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Extrapolate,
  FadeIn,
  FadeOut,
  SlideInRight
} from 'react-native-reanimated';
import { API_ROUTES } from '@/constants';
import { PanGestureHandler } from 'react-native-gesture-handler';

const { width, height } = Dimensions.get('window');

interface Lesson {
  _id: string;
  title: string;
  description: string;
  topic: string;
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

interface TopicDetails {
  _id: string;
  title: string;
  description: string;
  course: string;
  order: number;
  isActive: boolean;
}

export default function TopicDetails() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [topicDetails, setTopicDetails] = useState<TopicDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState<string | null>(null);
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);
  const [currentProgress, setCurrentProgress] = useState(0);

  const toast = useContext(ToastContext);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { topicId } = useLocalSearchParams();
  
  const scrollY = useSharedValue(0);
  const headerHeight = useSharedValue(180);
  const lessonCardScale = useSharedValue(1);

  // Animation values for progress bar
  const progressAnim = useRef(new RNAnimated.Value(0)).current;

  // Fetch topic details and lessons
  const fetchTopicData = async () => {
    try {
      setIsLoading(true);
      const token = await SecureStore.getItemAsync('token');
      
      if (!token) {
        router.replace('/auth/login');
        return;
      }

      // Fetch topic details
      const topicResponse = await fetch(`${API_ROUTES.COURSES.GET_TOPIC_BY_ID}/${topicId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!topicResponse.ok) {
        const errorData = await topicResponse.json();
        throw new Error(errorData.message || 'Failed to fetch topic details');
      }

      const topicData = await topicResponse.json();
      setTopicDetails(topicData.topic);

      // Fetch lessons
      const lessonsResponse = await fetch(`${API_ROUTES.LESSONS.GET_LESSONS}/${topicId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!lessonsResponse.ok) {
        const errorData = await lessonsResponse.json();
        throw new Error(errorData.message || 'Failed to fetch lessons');
      }

      const lessonsData = await lessonsResponse.json();
      setLessons(lessonsData.lessons);

      // Load completed lessons from storage
      const storedCompletedLessons = await AsyncStorage.getItem(`completed_lessons_${topicId}`);
      if (storedCompletedLessons) {
        const parsedCompletedLessons = JSON.parse(storedCompletedLessons);
        setCompletedLessons(parsedCompletedLessons);
        
        // Calculate progress
        const progress = parsedCompletedLessons.length / lessonsData.lessons.length;
        setCurrentProgress(progress);
        RNAnimated.timing(progressAnim, {
          toValue: progress,
          duration: 600,
          useNativeDriver: false
        }).start();
      } else {
        setCurrentProgress(0);
        RNAnimated.timing(progressAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: false
        }).start();
      }

    } catch (error) {
      console.error('Error fetching topic data:', error);
      toast?.showToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to load topic data',
      });
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTopicData();
  }, [topicId]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchTopicData();
  };

  const toggleLessonSelection = (lessonId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedLesson(prev => prev === lessonId ? null : lessonId);
  };

  const markLessonAsCompleted = async (lessonId: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    // Update local state
    const updatedCompletedLessons = [...completedLessons];
    
    if (!completedLessons.includes(lessonId)) {
      updatedCompletedLessons.push(lessonId);
    } else {
      const index = updatedCompletedLessons.indexOf(lessonId);
      if (index > -1) {
        updatedCompletedLessons.splice(index, 1);
      }
    }
    
    setCompletedLessons(updatedCompletedLessons);
    
    // Save to AsyncStorage
    await AsyncStorage.setItem(
      `completed_lessons_${topicId}`, 
      JSON.stringify(updatedCompletedLessons)
    );
    
    // Update progress
    const progress = updatedCompletedLessons.length / lessons.length;
    setCurrentProgress(progress);
    RNAnimated.timing(progressAnim, {
      toValue: progress,
      duration: 300,
      useNativeDriver: false
    }).start();
    
    // Show toast
    toast?.showToast({
      type: 'success',
      message: completedLessons.includes(lessonId) 
        ? 'Lesson marked as incomplete' 
        : 'Lesson completed! Great job!',
    });
  };

  const navigateToLesson = (lessonId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Navigate to lesson content
    router.push(`/lesson/${lessonId}`);
  };

  const handleBackPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  // Header animation
  const headerAnimatedStyle = useAnimatedStyle(() => {
    return {
      height: headerHeight.value,
      opacity: interpolate(
        scrollY.value,
        [0, 100],
        [1, 0.9],
        Extrapolate.CLAMP
      ),
    };
  });

  // Lesson card animation
  const onLessonCardGesture = useAnimatedStyle(() => {
    return {
      transform: [{ scale: lessonCardScale.value }]
    };
  });

  // Render loading skeleton
  const renderSkeleton = () => (
    <View style={styles.skeletonContainer}>
      <Skeleton style={styles.skeletonHeader} />
      <Skeleton style={styles.skeletonSubtitle} />
      
      <View style={styles.skeletonProgressContainer}>
        <Skeleton style={styles.skeletonProgressBar} />
      </View>
      
      <View style={styles.skeletonLessonsContainer}>
        {[1, 2, 3].map((item) => (
          <View key={item} style={styles.skeletonLesson}>
            <View style={styles.skeletonLessonHeader}>
              <Skeleton style={styles.skeletonLessonNumber} />
              <Skeleton style={styles.skeletonLessonTitle} />
            </View>
            <Skeleton style={styles.skeletonLessonDescription} />
          </View>
        ))}
      </View>
    </View>
  );

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Get lesson icon based on order
  const getLessonIcon = (order: number) => {
    const icons = [
      'book-outline',
      'document-text-outline',
      'videocam-outline',
      'mic-outline',
      'flask-outline',
      'calculator-outline'
    ];
    
    return icons[order % icons.length];
  };

  // Render lesson item
  const renderLessonItem = ({ item, index }: { item: Lesson, index: number }) => {
    const isCompleted = completedLessons.includes(item._id);
    const isSelected = selectedLesson === item._id;
    
    return (
      <Animated.View 
        entering={SlideInRight.delay(index * 100).springify()}
        style={[styles.lessonCard, isSelected && styles.lessonCardSelected]}
      >
        <TouchableOpacity
          style={styles.lessonHeader}
          onPress={() => toggleLessonSelection(item._id)}
          activeOpacity={0.7}
        >
          <View style={[
            styles.lessonIconContainer,
            isCompleted && styles.lessonIconContainerCompleted
          ]}>
            <Ionicons 
              name={getLessonIcon(item.order) as any} 
              size={20} 
              color={isCompleted ? "#FFFFFF" : "#4F78FF"} 
            />
          </View>
          
          <View style={styles.lessonTitleContainer}>
            <Text style={styles.lessonTitle}>{item.title}</Text>
            <Text style={styles.lessonDate}>
              {isCompleted ? 'Completed' : `Added ${formatDate(item.createdAt)}`}
            </Text>
          </View>
          
          <View style={styles.lessonStatusContainer}>
            {isCompleted ? (
              <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
            ) : (
              <Ionicons 
                name={isSelected ? "chevron-up" : "chevron-down"} 
                size={24} 
                color="#B4C6EF" 
              />
            )}
          </View>
        </TouchableOpacity>
        
        {isSelected && (
          <Animated.View 
            entering={FadeIn.duration(300)}
            exiting={FadeOut.duration(200)}
            style={styles.lessonContent}
          >
            <Text style={styles.lessonDescription}>
              {item.description}
            </Text>
            
            <View style={styles.lessonActions}>
              <TouchableOpacity
                style={[
                  styles.lessonActionButton,
                  styles.lessonStartButton
                ]}
                onPress={() => navigateToLesson(item._id)}
                activeOpacity={0.8}
              >
                <Text style={styles.lessonStartButtonText}>
                  {isCompleted ? 'Review Lesson' : 'Start Lesson'}
                </Text>
                <Ionicons name="play-circle-outline" size={18} color="#FFFFFF" style={styles.buttonIcon} />
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.lessonActionButton,
                  isCompleted ? styles.lessonUncompleteButton : styles.lessonCompleteButton
                ]}
                onPress={() => markLessonAsCompleted(item._id)}
                activeOpacity={0.8}
              >
                <Text style={isCompleted ? styles.lessonUncompleteButtonText : styles.lessonCompleteButtonText}>
                  {isCompleted ? 'Mark as Incomplete' : 'Mark as Completed'}
                </Text>
                <Ionicons 
                  name={isCompleted ? "close-circle-outline" : "checkmark-circle-outline"} 
                  size={18} 
                  color={isCompleted ? "#FF5E5E" : "#4CAF50"} 
                  style={styles.buttonIcon} 
                />
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}
      </Animated.View>
    );
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
        <Animated.View style={[styles.header, headerAnimatedStyle]}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={handleBackPress}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          {topicDetails && (
            <View style={styles.topicHeaderInfo}>
              <Text style={styles.topicTitle}>{topicDetails.title}</Text>
              <Text style={styles.topicDescription} numberOfLines={2}>
                {topicDetails.description}
              </Text>
              
              {!isLoading && (
                <View style={styles.progressContainer}>
                  <View style={styles.progressInfo}>
                    <Text style={styles.progressText}>
                      Your progress: {Math.round(currentProgress * 100)}%
                    </Text>
                    <Text style={styles.progressCount}>
                      {completedLessons.length}/{lessons.length} lessons
                    </Text>
                  </View>
                  
                  <View style={styles.progressBarContainer}>
                    <RNAnimated.View 
                      style={[
                        styles.progressBar,
                        {
                          width: progressAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: ['0%', '100%']
                          })
                        }
                      ]}
                    />
                  </View>
                </View>
              )}
            </View>
          )}
        </Animated.View>

        {/* Main Content */}
        {isLoading ? (
          <ScrollView
            contentContainerStyle={[styles.scrollContent, { justifyContent: 'center' }]}
            showsVerticalScrollIndicator={false}
          >
            {renderSkeleton()}
          </ScrollView>
        ) : (
          <FlatList
            data={lessons}
            renderItem={renderLessonItem}
            keyExtractor={item => item._id}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor="#4F78FF"
                colors={["#4F78FF"]}
              />
            }
            onScroll={(event) => {
              scrollY.value = event.nativeEvent.contentOffset.y;
              if (event.nativeEvent.contentOffset.y > 50) {
                headerHeight.value = withSpring(120, { damping: 20, stiffness: 90 });
              } else {
                headerHeight.value = withSpring(180, { damping: 20, stiffness: 90 });
              }
            }}
            scrollEventThrottle={16}
            ListHeaderComponent={() => (
              <View style={styles.lessonsHeader}>
                <Text style={styles.sectionTitle}>Lessons</Text>
                {lessons.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Ionicons name="book-outline" size={60} color="#4F78FF" style={styles.emptyIcon} />
                    <Text style={styles.emptyTitle}>No lessons available</Text>
                    <Text style={styles.emptyText}>This topic doesn't have any lessons yet</Text>
                  </View>
                ) : null}
              </View>
            )}
            ListEmptyComponent={() => (
              <View style={styles.emptyContainer}>
                <Ionicons name="book-outline" size={60} color="#4F78FF" style={styles.emptyIcon} />
                <Text style={styles.emptyTitle}>No lessons available</Text>
                <Text style={styles.emptyText}>This topic doesn't have any lessons yet</Text>
              </View>
            )}
          />
        )}

        {/* Floating Action Button - only show if there are incomplete lessons */}
        {!isLoading && lessons.length > 0 && completedLessons.length < lessons.length && (
          <TouchableOpacity
            style={styles.fab}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              // Find first incomplete lesson
              const incompleteLesson = lessons.find(lesson => !completedLessons.includes(lesson._id));
              if (incompleteLesson) {
                navigateToLesson(incompleteLesson._id);
              }
            }}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#4F78FF', '#8A53FF']}
              style={styles.fabGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.fabText}>Continue Learning</Text>
              <Ionicons name="play" size={18} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>
        )}
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
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: 'rgba(9, 14, 35, 0.9)',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  topicHeaderInfo: {
    paddingBottom: 10,
  },
  topicTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  topicDescription: {
    fontSize: 14,
    color: '#B4C6EF',
    marginBottom: 16,
    lineHeight: 20,
  },
  progressContainer: {
    marginTop: 4,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  progressCount: {
    fontSize: 12,
    color: '#B4C6EF',
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4F78FF',
    borderRadius: 3,
  },
  scrollContent: {
    paddingTop: 190,
    paddingBottom: 100,
    paddingHorizontal: 20,
  },
  lessonsHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  lessonCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  lessonCardSelected: {
    borderColor: 'rgba(79, 120, 255, 0.3)',
    backgroundColor: 'rgba(79, 120, 255, 0.05)',
  },
  lessonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  lessonIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(79, 120, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  lessonIconContainerCompleted: {
    backgroundColor: '#4F78FF',
  },
  lessonTitleContainer: {
    flex: 1,
  },
  lessonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  lessonDate: {
    fontSize: 12,
    color: '#8A8FA3',
  },
  lessonStatusContainer: {
    marginLeft: 12,
  },
  lessonContent: {
    padding: 16,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  lessonDescription: {
    fontSize: 14,
    lineHeight: 22,
    color: '#B4C6EF',
    marginBottom: 20,
  },
  lessonActions: {
    flexDirection: 'column',
    gap: 12,
  },
  lessonActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  lessonStartButton: {
    backgroundColor: '#4F78FF',
  },
  lessonStartButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginRight: 8,
  },
  lessonCompleteButton: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  lessonCompleteButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
    marginRight: 8,
  },
  lessonUncompleteButton: {
    backgroundColor: 'rgba(255, 94, 94, 0.1)',
  },
  lessonUncompleteButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF5E5E',
    marginRight: 8,
  },
  buttonIcon: {
    marginTop: 1,
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    borderRadius: 28,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  fabGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 28,
  },
  fabText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginRight: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
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
  skeletonContainer: {
    paddingHorizontal: 20,
  },
  skeletonHeader: {
    height: 28,
    width: '70%',
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 16,
  },
  skeletonSubtitle: {
    height: 16,
    width: '90%',
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 30,
  },
  skeletonProgressContainer: {
    marginTop: 20,
    marginBottom: 30,
  },
  skeletonProgressBar: {
    height: 6,
    width: '100%',
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  skeletonLessonsContainer: {
    marginTop: 20,
  },
  skeletonLesson: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  skeletonLessonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  skeletonLessonNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginRight: 12,
  },
  skeletonLessonTitle: {
    height: 20,
    width: '60%',
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  skeletonLessonDescription: {
    height: 60,
    width: '100%',
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
});