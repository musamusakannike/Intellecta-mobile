"use client"

import React, { useState, useEffect, useContext } from "react"
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  SafeAreaView,
} from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { useRouter, useLocalSearchParams } from "expo-router"
import AsyncStorage from "@react-native-async-storage/async-storage"
import * as SecureStore from "expo-secure-store"
import { Ionicons } from "@expo/vector-icons"
import { ToastContext } from "@/components/Toast/ToastContext"
import * as Haptics from "expo-haptics"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  Extrapolate,
} from "react-native-reanimated"
import { API_ROUTES } from "@/constants"

// Import components
import ReviewModal from "@/components/ReviewModal"
import ReviewItem from "@/components/ReviewItem"
import RatingStats from "@/components/RatingStats"
import ConfirmationModal from "@/components/ConfirmationModal"

// Define interfaces for your data types
interface Topic {
  _id: string
  title: string
  description: string
  course: string
  order: number
  isActive: boolean
  createdAt: string
  updatedAt: string
  __v: number
}

interface CourseDetails {
  _id: string
  title: string
  description: string
  category: string
  price: number
  instructor: string
  coverImage?: string
  ratingStats: {
    averageRating: number
    totalRatings: number
    ratingDistribution: {
      1: number
      2: number
      3: number
      4: number
      5: number
    }
  }
}

interface Review {
  _id: string
  user: {
    _id: string
    username: string
    email: string
  }
  course: string
  rating: number
  title: string
  content: string
  isVerified: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export default function CourseDetails() {
  // State variables
  const [topics, setTopics] = useState<Topic[]>([])
  const [courseDetails, setCourseDetails] = useState<CourseDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [expandedTopics, setExpandedTopics] = useState<Record<string, boolean>>({})
  const [reviews, setReviews] = useState<Review[]>([])
  const [reviewsLoading, setReviewsLoading] = useState(true)
  const [reviewModalVisible, setReviewModalVisible] = useState(false)
  const [confirmModalVisible, setConfirmModalVisible] = useState(false)
  const [selectedReview, setSelectedReview] = useState<Review | null>(null)
  const [userReview, setUserReview] = useState<Review | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [reviewsPage, setReviewsPage] = useState(1)
  const [reviewsPagination, setReviewsPagination] = useState({
    total: 0,
    page: 1,
    pages: 1,
  })
  const [showReviews, setShowReviews] = useState(false)

  // Hooks
  const toast = useContext(ToastContext)
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { courseId } = useLocalSearchParams()

  // Animation values
  const scrollY = useSharedValue(0)
  const headerHeight = useSharedValue(200)

  // Fetch user ID
  useEffect(() => {
    const fetchUserId = async () => {
      try {
        const id = await AsyncStorage.getItem("userId")
        setUserId(id)
      } catch (error) {
        console.error("Error fetching user ID:", error)
      }
    }

    fetchUserId()
  }, [])

  // Fetch course data
  const fetchCourseData = async () => {
    try {
      setIsLoading(true)
      const token = await SecureStore.getItemAsync("token")

      if (!token) {
        router.replace("/auth/login")
        return
      }

      // Fetch course details
      const courseResponse = await fetch(`${API_ROUTES.COURSES.GET_COURSE_BY_ID}/${courseId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!courseResponse.ok) {
        const errorData = await courseResponse.json()
        throw new Error(errorData.message || "Failed to fetch course details")
      }

      const courseData = await courseResponse.json()
      setCourseDetails(courseData.course)

      // Fetch topics
      const topicsResponse = await fetch(`${API_ROUTES.COURSES.GET_COURSE_BY_ID}/${courseId}/topics`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!topicsResponse.ok) {
        const errorData = await topicsResponse.json()
        throw new Error(errorData.message || "Failed to fetch topics")
      }

      const topicsData = await topicsResponse.json()
      setTopics(topicsData)

      // Initialize expanded state for all topics (first one expanded by default)
      const initialExpandedState: Record<string, boolean> = {}
      topicsData.forEach((topic: Topic, index: number) => {
        initialExpandedState[topic._id] = index === 0
      })
      setExpandedTopics(initialExpandedState)
    } catch (error) {
      console.error("Error fetching course data:", error)
      toast?.showToast({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to load course data",
      })
    } finally {
      setIsLoading(false)
      setRefreshing(false)
    }
  }

  // Fetch reviews
  const fetchReviews = async (page = 1) => {
    try {
      setReviewsLoading(true)
      const token = await SecureStore.getItemAsync("token")

      if (!token) {
        router.replace("/auth/login")
        return
      }

      const response = await fetch(
        `${API_ROUTES.COURSES.GET_COURSE_BY_ID}/${courseId}/reviews?page=${page}&limit=5&sortBy=createdAt&sortOrder=desc`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to fetch reviews")
      }

      const data = await response.json()

      if (page === 1) {
        setReviews(data.reviews)
      } else {
        setReviews((prev) => [...prev, ...data.reviews])
      }

      setReviewsPagination(data.pagination)

      // Find user's review if it exists
      if (userId) {
        const userReviewFound = data.reviews.find((review: Review) => review.user._id === userId)
        if (userReviewFound) {
          setUserReview(userReviewFound)
        }
      }
    } catch (error) {
      console.error("Error fetching reviews:", error)
      toast?.showToast({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to load reviews",
      })
    } finally {
      setReviewsLoading(false)
    }
  }

  // Initial data fetch
  useEffect(() => {
    fetchCourseData()
  }, [courseId])

  // Fetch reviews when showReviews changes
  useEffect(() => {
    if (showReviews) {
      fetchReviews()
    }
  }, [showReviews, userId])

  // Handle refresh
  const handleRefresh = () => {
    setRefreshing(true)
    fetchCourseData()
    if (showReviews) {
      fetchReviews(1)
    }
  }

  // Toggle topic expansion
  const toggleTopicExpansion = (topicId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setExpandedTopics((prev) => ({
      ...prev,
      [topicId]: !prev[topicId],
    }))
  }

  // Navigate to topic
  const navigateToTopic = (topicId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    router.push(`/topic/${topicId}`)
  }

  // Handle back button press
  const handleBackPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    router.back()
  }

  // Load more reviews
  const loadMoreReviews = () => {
    if (reviewsPage < reviewsPagination.pages) {
      const nextPage = reviewsPage + 1
      setReviewsPage(nextPage)
      fetchReviews(nextPage)
    }
  }

  // Handle add review
  const handleAddReview = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    setSelectedReview(null)
    setReviewModalVisible(true)
  }

  // Handle edit review
  const handleEditReview = (review: Review) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    setSelectedReview(review)
    setReviewModalVisible(true)
  }

  // Handle delete review
  const handleDeleteReview = (review: Review) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    setSelectedReview(review)
    setConfirmModalVisible(true)
  }

  // Submit review
  const submitReview = async (reviewData: { rating: number; title: string; content: string }) => {
    try {
      const token = await SecureStore.getItemAsync("token")

      if (!token) {
        router.replace("/auth/login")
        return
      }

      let response

      if (selectedReview) {
        // Update existing review
        response = await fetch(`${API_ROUTES.COURSES.UPDATE_REVIEW}/${selectedReview._id}`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(reviewData),
        })
      } else {
        // Create new review
        response = await fetch(`${API_ROUTES.COURSES.CREATE_REVIEW}/${courseId}/reviews`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(reviewData),
        })
      }

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to submit review")
      }

      toast?.showToast({
        type: "success",
        message: selectedReview ? "Review updated successfully" : "Review submitted successfully",
      })

      // Refresh course data to update rating stats
      fetchCourseData()
      // Refresh reviews
      fetchReviews(1)
    } catch (error) {
      console.error("Error submitting review:", error)
      toast?.showToast({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to submit review",
      })
      throw error
    }
  }

  // Confirm delete review
  const confirmDeleteReview = async () => {
    try {
      if (!selectedReview) return

      const token = await SecureStore.getItemAsync("token")

      if (!token) {
        router.replace("/auth/login")
        return
      }

      const response = await fetch(`${API_ROUTES.COURSES.DELETE_REVIEW}/${selectedReview._id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to delete review")
      }

      toast?.showToast({
        type: "success",
        message: "Review deleted successfully",
      })

      // Refresh course data to update rating stats
      fetchCourseData()
      // Refresh reviews
      fetchReviews(1)
      setUserReview(null)
    } catch (error) {
      console.error("Error deleting review:", error)
      toast?.showToast({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to delete review",
      })
    } finally {
      setConfirmModalVisible(false)
    }
  }

  // Header animation
  const headerAnimatedStyle = useAnimatedStyle(() => {
    return {
      height: headerHeight.value,
      opacity: interpolate(scrollY.value, [0, 100], [1, 0.9], Extrapolate.CLAMP),
    }
  })

  // Title animation
  const titleAnimatedStyle = useAnimatedStyle(() => {
    return {
      fontSize: interpolate(scrollY.value, [0, 100], [24, 20], Extrapolate.CLAMP),
      opacity: interpolate(scrollY.value, [0, 100], [1, 0.9], Extrapolate.CLAMP),
    }
  })

  // Category animation
  const categoryAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(scrollY.value, [0, 50], [1, 0], Extrapolate.CLAMP),
      transform: [
        {
          translateY: interpolate(scrollY.value, [0, 50], [0, -10], Extrapolate.CLAMP),
        },
      ],
    }
  })

  // Meta info animation
  const metaInfoAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(scrollY.value, [0, 50], [1, 0.7], Extrapolate.CLAMP),
    }
  })

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      <LinearGradient
        colors={["#090E23", "#1F2B5E", "#0C1339"]}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Header */}
        <Animated.View style={[styles.header, headerAnimatedStyle]}>
          <TouchableOpacity style={styles.backButton} onPress={handleBackPress} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          {courseDetails && (
            <View style={styles.courseHeaderInfo}>
              <Animated.Text style={[styles.courseCategory, categoryAnimatedStyle]}>
                {courseDetails.category}
              </Animated.Text>
              <Animated.Text style={[styles.courseTitle, titleAnimatedStyle]}>{courseDetails.title}</Animated.Text>

              <Animated.View style={[styles.courseMetaInfo, metaInfoAnimatedStyle]}>
                <View style={styles.metaItem}>
                  <Ionicons name="book-outline" size={16} color="#B4C6EF" />
                  <Text style={styles.metaText}>{topics.length} Topics</Text>
                </View>

                <View style={styles.metaItem}>
                  <Ionicons name="time-outline" size={16} color="#B4C6EF" />
                  <Text style={styles.metaText}>{topics.length * 15} mins</Text>
                </View>

                <View style={styles.priceBadge}>
                  <Text style={styles.priceText}>${courseDetails.price.toFixed(2)}</Text>
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
            scrollY.value = event.nativeEvent.contentOffset.y
            if (event.nativeEvent.contentOffset.y > 50) {
              headerHeight.value = withSpring(120, { damping: 20, stiffness: 90 })
            } else {
              headerHeight.value = withSpring(200, { damping: 20, stiffness: 90 })
            }
          }}
          scrollEventThrottle={16}
        >
          {/* Course Description */}
          {!isLoading && courseDetails && (
            <>
              <View style={styles.descriptionContainer}>
                <Text style={styles.sectionTitle}>About This Course</Text>
                <Text style={styles.descriptionText}>{courseDetails.description || "No description available"}</Text>
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
                          <Text style={styles.topicDate}>Added {formatDate(topic.createdAt)}</Text>
                        </View>

                        <Ionicons
                          name={expandedTopics[topic._id] ? "chevron-up" : "chevron-down"}
                          size={24}
                          color="#B4C6EF"
                        />
                      </TouchableOpacity>

                      {expandedTopics[topic._id] && (
                        <View style={styles.topicContent}>
                          <Text style={styles.topicDescription}>{topic.description}</Text>

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

              {/* Reviews Section */}
              <View style={styles.reviewsContainer}>
                <View style={styles.reviewsHeader}>
                  <Text style={styles.sectionTitle}>Reviews</Text>
                  <TouchableOpacity
                    style={styles.toggleButton}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                      setShowReviews(!showReviews)
                    }}
                  >
                    <Text style={styles.toggleButtonText}>{showReviews ? "Hide Reviews" : "Show Reviews"}</Text>
                    <Ionicons name={showReviews ? "chevron-up" : "chevron-down"} size={16} color="#4F78FF" />
                  </TouchableOpacity>
                </View>

                {showReviews && (
                  <>
                    {/* Rating Statistics */}
                    {courseDetails && courseDetails.ratingStats && <RatingStats stats={courseDetails.ratingStats} />}

                    {/* Add Review Button */}
                    {!userReview && (
                      <TouchableOpacity style={styles.addReviewButton} onPress={handleAddReview} activeOpacity={0.8}>
                        <Ionicons name="star" size={18} color="#FFFFFF" style={styles.addReviewIcon} />
                        <Text style={styles.addReviewText}>Write a Review</Text>
                      </TouchableOpacity>
                    )}

                    {/* Reviews List */}
                    {reviewsLoading ? (
                      <View style={styles.loadingContainer}>
                        <Text style={styles.loadingText}>Loading reviews...</Text>
                      </View>
                    ) : reviews.length > 0 ? (
                      <View style={styles.reviewsList}>
                        {reviews.map((review) => (
                          <ReviewItem
                            key={review._id}
                            review={review}
                            isUserReview={userId === review.user._id}
                            onEdit={() => handleEditReview(review)}
                            onDelete={() => handleDeleteReview(review)}
                          />
                        ))}

                        {/* Load More Button */}
                        {reviewsPage < reviewsPagination.pages && (
                          <TouchableOpacity style={styles.loadMoreButton} onPress={loadMoreReviews} activeOpacity={0.8}>
                            <Text style={styles.loadMoreText}>Load More Reviews</Text>
                            <Ionicons name="chevron-down" size={16} color="#4F78FF" />
                          </TouchableOpacity>
                        )}
                      </View>
                    ) : (
                      <View style={styles.emptyReviews}>
                        <Ionicons name="chatbubble-outline" size={60} color="#4F78FF" style={styles.emptyIcon} />
                        <Text style={styles.emptyTitle}>No reviews yet</Text>
                        <Text style={styles.emptyText}>Be the first to review this course</Text>
                      </View>
                    )}
                  </>
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
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
              // Navigate to first topic
              if (topics.length > 0) {
                router.push(`/topic/${topics[0]._id}`)
              }
            }}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={["#4F78FF", "#8A53FF"]}
              style={styles.fabGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.fabText}>Start Course</Text>
              <Ionicons name="play" size={18} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Review Modal */}
        <ReviewModal
          visible={reviewModalVisible}
          onClose={() => setReviewModalVisible(false)}
          onSubmit={submitReview}
          existingReview={
            selectedReview
              ? {
                rating: selectedReview.rating,
                title: selectedReview.title,
                content: selectedReview.content,
              }
              : undefined
          }
          isEditing={!!selectedReview}
        />

        {/* Confirmation Modal */}
        <ConfirmationModal
          visible={confirmModalVisible}
          onClose={() => setConfirmModalVisible(false)}
          onConfirm={confirmDeleteReview}
          title="Delete Review"
          message="Are you sure you want to delete your review? This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          type="danger"
        />
      </LinearGradient>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#090E23",
  },
  gradient: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: "rgba(9, 14, 35, 0.95)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  courseHeaderInfo: {
    paddingBottom: 10,
  },
  courseCategory: {
    fontSize: 14,
    color: "#4F78FF",
    fontWeight: "600",
    marginBottom: 4,
  },
  courseTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 12,
  },
  courseMetaInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
  },
  metaText: {
    fontSize: 14,
    color: "#B4C6EF",
    marginLeft: 6,
  },
  priceBadge: {
    backgroundColor: "rgba(79, 120, 255, 0.2)",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  priceText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#4F78FF",
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
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 16,
  },
  descriptionText: {
    fontSize: 15,
    lineHeight: 24,
    color: "#B4C6EF",
  },
  topicsContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  topicCard: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 16,
    marginBottom: 16,
    overflow: "hidden",
  },
  topicHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  topicNumberContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(79, 120, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  topicNumber: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#4F78FF",
  },
  topicTitleContainer: {
    flex: 1,
  },
  topicTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  topicDate: {
    fontSize: 12,
    color: "#8A8FA3",
  },
  topicContent: {
    padding: 16,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.05)",
  },
  topicDescription: {
    fontSize: 14,
    lineHeight: 22,
    color: "#B4C6EF",
    marginBottom: 16,
  },
  startButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(79, 120, 255, 0.2)",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  startButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4F78FF",
    marginRight: 8,
  },
  startButtonIcon: {
    marginTop: 1,
  },
  fab: {
    position: "absolute",
    bottom: 30,
    right: 20,
    borderRadius: 28,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  fabGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 28,
  },
  fabText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginRight: 8,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyIcon: {
    marginBottom: 16,
    opacity: 0.6,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#B4C6EF",
    textAlign: "center",
  },
  // Reviews section styles
  reviewsContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  reviewsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  toggleButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: "rgba(79, 120, 255, 0.1)",
  },
  toggleButtonText: {
    fontSize: 14,
    color: "#4F78FF",
    marginRight: 4,
  },
  addReviewButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4F78FF",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  addReviewIcon: {
    marginRight: 8,
  },
  addReviewText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  reviewsList: {
    marginTop: 8,
  },
  loadMoreButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    marginTop: 8,
  },
  loadMoreText: {
    fontSize: 14,
    color: "#4F78FF",
    marginRight: 4,
  },
  emptyReviews: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  loadingContainer: {
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    fontSize: 14,
    color: "#B4C6EF",
  },
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(9, 14, 35, 0.9)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  modalContainer: {
    width: "90%",
    maxHeight: "80%",
    backgroundColor: "#1F2B5E",
    borderRadius: 20,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  modalCloseButton: {
    padding: 4,
  },
})
