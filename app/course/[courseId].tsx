import React, { useState, useEffect, useContext } from 'react';
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
  Image
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { ToastContext } from "@/components/Toast/ToastContext";
import * as Haptics from 'expo-haptics';
import { Skeleton } from "@/components/Skeleton";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  Extrapolate
} from 'react-native-reanimated';
import { API_ROUTES } from '@/constants';

const { width } = Dimensions.get('window');

interface Topic {
  _id: string;
  title: string;
  description: string;
  course: string;
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

interface CourseDetails {
  _id: string;
  title: string;
  description: string;
  category: string;
  price: number;
  instructor: string;
  coverImage?: string;
}

export default function CourseDetails() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [courseDetails, setCourseDetails] = useState<CourseDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedTopics, setExpandedTopics] = useState<Record<string, boolean>>({});

  const toast = useContext(ToastContext);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { courseId } = useLocalSearchParams();
  
  const scrollY = useSharedValue(0);
  const headerHeight = useSharedValue(200);

  // Fetch course details and topics
  const fetchCourseData = async () => {
    try {
      setIsLoading(true);
      const token = await SecureStore.getItemAsync('token');
      
      if (!token) {
        router.replace('/auth/login');
        return;
      }

      // Fetch course details
      const courseResponse = await fetch(`${API_ROUTES.COURSES.GET_COURSE_BY_ID}/${courseId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!courseResponse.ok) {
        const errorData = await courseResponse.json();
        throw new Error(errorData.message || 'Failed to fetch course details');
      }

      const courseData = await courseResponse.json();
      setCourseDetails(courseData.course);
      console.log(courseData.course);

      // Fetch topics
      const topicsResponse = await fetch(`${API_ROUTES.COURSES.GET_COURSE_BY_ID}/${courseId}/topics`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!topicsResponse.ok) {
        const errorData = await topicsResponse.json();
        throw new Error(errorData.message || 'Failed to fetch topics');
      }

      const topicsData = await topicsResponse.json();
      setTopics(topicsData);

      // Initialize expanded state for all topics (first one expanded by default)
      const initialExpandedState: Record<string, boolean> = {};
      topicsData.forEach((topic: Topic, index: number) => {
        initialExpandedState[topic._id] = index === 0;
      });
      setExpandedTopics(initialExpandedState);

    } catch (error) {
      console.error('Error fetching course data:', error);
      toast?.showToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to load course data',
      });
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCourseData();
  }, [courseId]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchCourseData();
  };

  const toggleTopicExpansion = (topicId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpandedTopics(prev => ({
      ...prev,
      [topicId]: !prev[topicId]
    }));
  };

  const navigateToTopic = (topicId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Navigate to topic content
    router.push(`/topic/${topicId}`);
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

  // Add new animated styles for text elements
  const titleAnimatedStyle = useAnimatedStyle(() => {
    return {
      fontSize: interpolate(
        scrollY.value,
        [0, 100],
        [24, 20],
        Extrapolate.CLAMP
      ),
      opacity: interpolate(
        scrollY.value,
        [0, 100],
        [1, 0.9],
        Extrapolate.CLAMP
      ),
    };
  });

  const categoryAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(
        scrollY.value,
        [0, 50],
        [1, 0],
        Extrapolate.CLAMP
      ),
      transform: [{
        translateY: interpolate(
          scrollY.value,
          [0, 50],
          [0, -10],
          Extrapolate.CLAMP
        ),
      }],
    };
  });

  const metaInfoAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(
        scrollY.value,
        [0, 50],
        [1, 0.7],
        Extrapolate.CLAMP
      ),
    };
  });

  // Render loading skeleton
  const renderSkeleton = () => (
    <View style={styles.skeletonContainer}>
      <Skeleton style={styles.skeletonHeader} />
      <Skeleton style={styles.skeletonSubtitle} />
      
      <View style={styles.skeletonTopicsContainer}>
        {[1, 2, 3, 4].map((item) => (
          <View key={item} style={styles.skeletonTopic}>
            <View style={styles.skeletonTopicHeader}>
              <Skeleton style={styles.skeletonTopicNumber} />
              <Skeleton style={styles.skeletonTopicTitle} />
            </View>
            <Skeleton style={styles.skeletonTopicDescription} />
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

          {courseDetails && (
            <View style={styles.courseHeaderInfo}>
              <Animated.Text style={[styles.courseCategory, categoryAnimatedStyle]}>
                {courseDetails.category}
              </Animated.Text>
              <Animated.Text style={[styles.courseTitle, titleAnimatedStyle]}>
                {courseDetails.title}
              </Animated.Text>
              
              <Animated.View style={[styles.courseMetaInfo, metaInfoAnimatedStyle]}>
                <View style={styles.metaItem}>
                  <Ionicons name="book-outline" size={16} color="#B4C6EF" />
                  <Text style={styles.metaText}>{topics.length} Topics</Text>
                </View>
                
                <View style={styles.metaItem}>
                  <Ionicons name="time-outline" size={16} color="#B4C6EF" />
                  <Text style={styles.metaText}>
                    {topics.length * 15} mins
                  </Text>
                </View>
                
                <View style={styles.priceBadge}>
                  <Text style={styles.priceText}>
                    ${courseDetails.price.toFixed(2)}
                  </Text>
                </View>
              </Animated.View>
            </View>
          )}
        </Animated.View>

        {/* Main Content */}
        <ScrollView
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
              headerHeight.value = withSpring(200, { damping: 20, stiffness: 90 });
            }
          }}
          scrollEventThrottle={16}
        >
          {isLoading ? (
            renderSkeleton()
          ) : (
            <>
              {/* Course Description */}
              <View style={styles.descriptionContainer}>
                <Text style={styles.sectionTitle}>About This Course</Text>
                <Text style={styles.descriptionText}>
                  {courseDetails?.description || 'No description available'}
                </Text>
              </View>

              {/* Topics List */}
              <View style={styles.topicsContainer}>
                <Text style={styles.sectionTitle}>Course Content</Text>
                
                {topics.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Ionicons name="book-outline" size={60} color="#4F78FF" style={styles.emptyIcon} />
                    <Text style={styles.emptyTitle}>No topics available</Text>
                    <Text style={styles.emptyText}>This course doesn't have any content yet</Text>
                  </View>
                ) : (
                  topics.map((topic, index) => (
                    <View key={topic._id} style={styles.topicCard}>
                      <TouchableOpacity
                        style={styles.topicHeader}
                        onPress={() => toggleTopicExpansion(topic._id)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.topicNumberContainer}>
                          <Text style={styles.topicNumber}>{index + 1}</Text>
                        </View>
                        
                        <View style={styles.topicTitleContainer}>
                          <Text style={styles.topicTitle}>{topic.title}</Text>
                          <Text style={styles.topicDate}>
                            Added {formatDate(topic.createdAt)}
                          </Text>
                        </View>
                        
                        <Ionicons 
                          name={expandedTopics[topic._id] ? "chevron-up" : "chevron-down"} 
                          size={24} 
                          color="#B4C6EF" 
                        />
                      </TouchableOpacity>
                      
                      {expandedTopics[topic._id] && (
                        <View style={styles.topicContent}>
                          <Text style={styles.topicDescription}>
                            {topic.description}
                          </Text>
                          
                          <TouchableOpacity
                            style={styles.startButton}
                            onPress={() => navigateToTopic(topic._id)}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.startButtonText}>Start Topic</Text>
                            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={styles.startButtonIcon} />
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  ))
                )}
              </View>
            </>
          )}
        </ScrollView>

        {/* Floating Action Button */}
        {!isLoading && topics.length > 0 && (
          <TouchableOpacity
            style={styles.fab}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              // Navigate to first topic
              if (topics.length > 0) {
                router.push(`/topic/${topics[0]._id}`);
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
              <Text style={styles.fabText}>Start Course</Text>
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
    backgroundColor: 'rgba(9, 14, 35, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
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
  courseHeaderInfo: {
    paddingBottom: 10,
  },
  courseCategory: {
    fontSize: 14,
    color: '#4F78FF',
    fontWeight: '600',
    marginBottom: 4,
  },
  courseTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  courseMetaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  metaText: {
    fontSize: 14,
    color: '#B4C6EF',
    marginLeft: 6,
  },
  priceBadge: {
    backgroundColor: 'rgba(79, 120, 255, 0.2)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  priceText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4F78FF',
  },
  scrollContent: {
    paddingTop: 220,
    paddingBottom: 100,
  },
  descriptionContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  descriptionText: {
    fontSize: 15,
    lineHeight: 24,
    color: '#B4C6EF',
  },
  topicsContainer: {
    paddingHorizontal: 20,
  },
  topicCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  topicHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  topicNumberContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(79, 120, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  topicNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4F78FF',
  },
  topicTitleContainer: {
    flex: 1,
  },
  topicTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  topicDate: {
    fontSize: 12,
    color: '#8A8FA3',
  },
  topicContent: {
    padding: 16,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  topicDescription: {
    fontSize: 14,
    lineHeight: 22,
    color: '#B4C6EF',
    marginBottom: 16,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(79, 120, 255, 0.2)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  startButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4F78FF',
    marginRight: 8,
  },
  startButtonIcon: {
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
  skeletonTopicsContainer: {
    marginTop: 20,
  },
  skeletonTopic: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  skeletonTopicHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  skeletonTopicNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginRight: 12,
  },
  skeletonTopicTitle: {
    height: 20,
    width: '60%',
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  skeletonTopicDescription: {
    height: 60,
    width: '100%',
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
});