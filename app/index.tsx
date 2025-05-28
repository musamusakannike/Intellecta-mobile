"use client"

import { API_ROUTES } from "@/constants"
import { AntDesign, Ionicons } from "@expo/vector-icons"
import AsyncStorage from "@react-native-async-storage/async-storage"
import CommunityNetInfo from '@react-native-community/netinfo'
import * as Haptics from "expo-haptics"
import { LinearGradient } from "expo-linear-gradient"
import { type RelativePathString, useRouter } from "expo-router"
import * as SecureStore from "expo-secure-store"
import React, { useCallback, useContext, useEffect, useState } from "react"
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Platform,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native"
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Avatar } from "../components/Avatar"
import { CourseCard } from "../components/CourseCard"
import { NotificationBadge } from "../components/NotificationBadge"
import { Pagination } from "../components/Pagination"
import { Skeleton } from "../components/Skeleton"
import { ToastContext } from "../components/Toast/ToastContext"

const { width } = Dimensions.get("window")

interface Course {
  _id: string
  title: string
  description: string
  price: number
  category: string
  isFeatured: boolean
}

interface FilterState {
  minPrice: string
  maxPrice: string
  isFeatured: boolean
  sortBy: string
  sortOrder: string
  category: string
  search: string
  page: number
  limit: number
}

interface FeaturedItem {
  id: number
  title: string
  subtitle: string
  color1: string
  color2: string
  route: RelativePathString
}

// Categories with icons
const categories = [
  { id: 1, name: "All", icon: "grid-outline" },
  { id: 2, name: "Physics", icon: "planet-outline" },
  { id: 3, name: "Math", icon: "calculator-outline" },
  { id: 4, name: "Programming", icon: "code-slash-outline" },
  { id: 5, name: "Language", icon: "chatbubbles-outline" },
  { id: 6, name: "Art", icon: "color-palette-outline" },
  { id: 7, name: "Business", icon: "briefcase-outline" },
  { id: 8, name: "Science", icon: "flask-outline" },
]

// Featured sliders
const featuredItems: FeaturedItem[] = [
  {
    id: 1,
    title: "Spring Sale",
    subtitle: "Get 50% off selected courses",
    color1: "#4F78FF",
    color2: "#8A53FF",
    route: "/courses" as RelativePathString,
  },
  {
    id: 2,
    title: "New Courses",
    subtitle: "Check out our latest additions",
    color1: "#FF5E5E",
    color2: "#FF9D5C",
    route: "/courses" as RelativePathString,
  },
  {
    id: 3,
    title: "Premium Access",
    subtitle: "Unlimited learning for one price",
    color1: "#4CAF50",
    color2: "#8BC34A",
    route: "/premium/subscribe" as RelativePathString,
  },
]

// Update the useNotifications hook to include the API calls
const useNotifications = () => {
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const toast = useContext(ToastContext)

  const fetchAllNotifications = useCallback(async () => {
    try {
      setIsLoading(true)
      const storedToken = await SecureStore.getItemAsync("token")

      const response = await fetch(`${API_ROUTES.NOTIFICATIONS.GET_NOTIFICATIONS}`, {
        headers: {
          Authorization: `Bearer ${storedToken}`,
        },
      })

      const data = await response.json()

      if (response.ok) {
        setNotifications(data.notifications)
        return data
      } else {
        toast?.showToast({
          type: "error",
          message: data.message || "Failed to fetch notifications",
        })
        return { notifications: [] }
      }
    } catch (error) {
      console.error("Error fetching notifications:", error)
      toast?.showToast({
        type: "error",
        message: "Network error. Please check your connection.",
      })
      return { notifications: [] }
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  const fetchUnreadNotifications = useCallback(async () => {
    try {
      const storedToken = await SecureStore.getItemAsync("token")

      const response = await fetch(`${API_ROUTES.NOTIFICATIONS.GET_UNREAD}`, {
        headers: {
          Authorization: `Bearer ${storedToken}`,
        },
      })

      const data = await response.json()

      if (data.status === "success") {
        setUnreadCount(data.count)
        return data
      } else {
        console.error("Failed to fetch unread notifications:", data.message)
        return { count: 0, notifications: [] }
      }
    } catch (error) {
      console.error("Error fetching unread notifications:", error)
      return { count: 0, notifications: [] }
    }
  }, [])

  const markNotificationAsRead = useCallback(async (notificationId: string) => {
    try {
      const storedToken = await SecureStore.getItemAsync("token")

      const response = await fetch(`${API_ROUTES.NOTIFICATIONS.MARK_AS_READ}/${notificationId}/read`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${storedToken}`,
        },
      })

      if (response.ok) {
        // Update the unread count
        fetchUnreadNotifications()
        // Update the notifications list
        fetchAllNotifications()

        toast?.showToast({
          type: "success",
          message: "Notification marked as read",
        })
      } else {
        const data = await response.json()
        toast?.showToast({
          type: "error",
          message: data.message || "Failed to mark notification as read",
        })
      }
    } catch (error) {
      console.error("Error marking notification as read:", error)
      toast?.showToast({
        type: "error",
        message: "Network error. Please check your connection.",
      })
    }
  }, [toast, fetchUnreadNotifications, fetchAllNotifications])

  const markAllAsRead = useCallback(async () => {
    try {
      const storedToken = await SecureStore.getItemAsync("token")

      const response = await fetch(`${API_ROUTES.NOTIFICATIONS.MARK_ALL_AS_READ}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${storedToken}`,
        },
      })

      if (response.ok) {
        setUnreadCount(0)
        fetchAllNotifications()

        toast?.showToast({
          type: "success",
          message: "All notifications marked as read",
        })
      } else {
        const data = await response.json()
        toast?.showToast({
          type: "error",
          message: data.message || "Failed to mark all notifications as read",
        })
      }
    } catch (error) {
      console.error("Error marking all notifications as read:", error)
      toast?.showToast({
        type: "error",
        message: "Network error. Please check your connection.",
      })
    }
  }, [toast, fetchAllNotifications])

  // Fetch unread notifications on mount
  useEffect(() => {
    fetchUnreadNotifications()
  }, [fetchUnreadNotifications])

  return {
    unreadCount,
    notifications,
    isLoading,
    fetchNotifications: {
      data: { notifications },
      isLoading,
      refetch: fetchAllNotifications,
    },
    fetchUnreadNotifications,
    markNotificationAsRead,
    markAllAsRead,
  }
}

// Remove useOfflineSupport hook and keep only network status check
const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(true)
  const toast = useContext(ToastContext)

  useEffect(() => {
    const unsubscribe = CommunityNetInfo.addEventListener((state) => {
      setIsOnline(state.isConnected ?? true)

      if (state.isConnected && !state.isInternetReachable) {
        toast?.showToast({
          type: "warning",
          message: "Limited connectivity detected",
        })
      } else if (!state.isConnected) {
        toast?.showToast({
          type: "info",
          message: "You're offline. Using cached data.",
        })
      }
    })

    return () => unsubscribe()
  }, [toast])

  return { isOnline }
}

export default function Dashboard() {
  const [username, setUsername] = useState("Learner")
  const [profileImage, setProfileImage] = useState<string | null>(null)
  // const [courses, setCourses] = useState<Course[]>([])
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 })
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [filterModalVisible, setFilterModalVisible] = useState(false)
  const [notificationsModalVisible, setNotificationsModalVisible] = useState(false)
  const [filters, setFilters] = useState<FilterState>({
    minPrice: "",
    maxPrice: "",
    isFeatured: false,
    sortBy: "createdAt",
    sortOrder: "desc",
    category: "",
    search: "",
    page: 1,
    limit: 10,
  })
  const [activeFilters, setActiveFilters] = useState(0)

  const toast = useContext(ToastContext)
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { unreadCount, fetchNotifications, markAllAsRead, markNotificationAsRead } = useNotifications()
  const { isOnline } = useNetworkStatus()

  // Animated values for scrolling effects
  const scrollY = useSharedValue(0)
  const headerHeight = useSharedValue(180)
  const searchOpacity = useSharedValue(1)

  // Load user data
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const storedToken = await SecureStore.getItemAsync("token")

        if (!storedToken) {
          try {
            await router.replace("/auth/login");
            // Optionally, set a state like setIsRedirecting(true) to show a spinner
          } catch (err) {
            // Show a fallback UI or error message
            toast?.showToast({
              type: "error",
              message: "Navigation failed. Please restart the app.",
            });
            console.log(err);
            // Optionally, force reload as a last resort
            router.reload();
          }
          return;
        }

        const storedUsername = await AsyncStorage.getItem("username")
        if (storedUsername) {
          setUsername(storedUsername)
        }

        const storedProfileImage = await AsyncStorage.getItem("profileImage")
        if (storedProfileImage) {
          setProfileImage(storedProfileImage)
        }
      } catch (error) {
        console.error("Error loading user data:", error)
      }
    }

    loadUserData()
  }, [router, toast])

  // Fetch courses with filters
  const fetchCourses = useCallback(
    async (page = 1, resetFilters = false) => {
      try {
        setIsLoading(true)

        // If offline, use cached data
        if (!isOnline) {
          toast?.showToast({
            type: "info",
            message: "You're offline. Using cached data.",
          })
          setIsLoading(false)
          setRefreshing(false)
          return
        }

        const appliedFilters: FilterState = resetFilters
          ? {
            minPrice: "",
            maxPrice: "",
            isFeatured: false,
            sortBy: "createdAt",
            sortOrder: "desc",
            category: "",
            search: "",
            page: 1,
            limit: 10,
          }
          : {
            ...filters,
            page,
            search: searchQuery,
            category:
              selectedCategory && selectedCategory !== "All"
                ? selectedCategory.toLowerCase()
                : "",
          }

        // Construct the query string
        const params = new URLSearchParams()
        if (appliedFilters.search) params.append("search", appliedFilters.search)
        if (appliedFilters.category) params.append("category", appliedFilters.category)
        if (appliedFilters.minPrice) params.append("minPrice", appliedFilters.minPrice)
        if (appliedFilters.maxPrice) params.append("maxPrice", appliedFilters.maxPrice)
        if (appliedFilters.isFeatured) params.append("isFeatured", "true")
        if (appliedFilters.sortBy) params.append("sortBy", appliedFilters.sortBy)
        if (appliedFilters.sortOrder) params.append("sortOrder", appliedFilters.sortOrder)
        params.append("page", appliedFilters.page.toString())
        params.append("limit", appliedFilters.limit.toString())

        const storedToken = await SecureStore.getItemAsync("token")
        const response = await fetch(`${API_ROUTES.COURSES.GET_COURSES}?${params.toString()}`, {
          headers: {
            Authorization: `Bearer ${storedToken}`,
          },
        })

        const data = await response.json()

        if (response.ok) {
          setFilteredCourses(data.courses)
          setPagination(data.pagination)

          console.log("Fetched courses:", JSON.stringify(data.courses, null, 2))
        } else {
          toast?.showToast({
            type: "error",
            message: data.message || "Failed to fetch courses",
          })
        }
      } catch (error) {
        toast?.showToast({
          type: "error",
          message: "Network error. Please check your connection.",
        })
        console.error("Error fetching courses:", error)
      } finally {
        setIsLoading(false)
        setRefreshing(false)
      }
    },
    [searchQuery, selectedCategory, filters, isOnline, toast],
  )

  // Initial fetch
  useEffect(() => {
    fetchCourses()
  }, [fetchCourses])

  // Pull-to-refresh handler
  const handleRefresh = () => {
    setRefreshing(true)
    fetchCourses(1, true)
    fetchNotifications.refetch()
  }

  // Apply filters
  const applyFilters = (newFilters: FilterState) => {
    setFilters(newFilters)
    setFilterModalVisible(false)

    // Count active filters
    let count = 0
    if (newFilters.minPrice) count++
    if (newFilters.maxPrice) count++
    if (newFilters.isFeatured) count++
    if (newFilters.sortBy !== "createdAt" || newFilters.sortOrder !== "desc") count++
    setActiveFilters(count)

    fetchCourses(1)
  }

  // Reset filters
  const resetFilters = () => {
    const defaultFilters = {
      minPrice: "",
      maxPrice: "",
      isFeatured: false,
      sortBy: "createdAt",
      sortOrder: "desc",
      category: "",
      search: "",
      page: 1,
      limit: 10,
    }
    setFilters(defaultFilters)
    setActiveFilters(0)
    setFilterModalVisible(false)
    fetchCourses(1, true)
  }

  // Handle page change
  const handlePageChange = (page: number) => {
    fetchCourses(page)
  }

  // Header animation
  const headerAnimatedStyle = useAnimatedStyle(() => {
    return {
      height: headerHeight.value,
      opacity: searchOpacity.value,
      zIndex: 900,
    }
  })

  // Scroll handler for animations
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const scrollPosition = event.nativeEvent.contentOffset.y
    scrollY.value = scrollPosition

    // Collapse header on scroll
    if (scrollPosition > 50) {
      headerHeight.value = withSpring(100, { damping: 20, stiffness: 90 })
      searchOpacity.value = withTiming(0, { duration: 200 })
    } else {
      headerHeight.value = withSpring(180, { damping: 20, stiffness: 90 })
      searchOpacity.value = withTiming(1, { duration: 200 })
    }
  }

  // Navigate to course details
  const navigateToCourseDetails = (course: Course) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    router.push(`/course/${course._id}`)
  }

  // Profile button press
  const handleProfilePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    router.push("/auth/profile")
  }

  // Handle notifications button press
  const handleNotificationsPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setNotificationsModalVisible(true)
    markAllAsRead()
  }


  // Render featured slider item
  const renderFeaturedItem = (item: FeaturedItem) => (
    <TouchableOpacity style={styles.featuredItem} activeOpacity={0.9} onPress={() => router.push(item.route)}>
      <LinearGradient colors={[item.color1, item.color2]} style={styles.featuredGradient}>
        <View style={styles.featuredContent}>
          <Text style={styles.featuredTitle}>{item.title}</Text>
          <Text style={styles.featuredSubtitle}>{item.subtitle}</Text>
          <TouchableOpacity style={styles.featuredButton} onPress={() => router.push(item.route)}>
            <Text style={styles.featuredButtonText}>Explore</Text>
            <AntDesign name="arrowright" size={16} color="#FFFFFF" style={styles.featuredButtonIcon} />
          </TouchableOpacity>
        </View>
        <View style={styles.featuredDeco}>
          <View style={styles.featuredCircle} />
          <View style={[styles.featuredCircle, styles.featuredCircle2]} />
        </View>
      </LinearGradient>
    </TouchableOpacity>
  )

  // Empty state
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="search-outline" size={70} color="#4F78FF" style={styles.emptyIcon} />
      <Text style={styles.emptyTitle}>No courses found</Text>
      <Text style={styles.emptyText}>Try adjusting your search or filters</Text>
      <TouchableOpacity style={styles.emptyButton} onPress={resetFilters} activeOpacity={0.8}>
        <Text style={styles.emptyButtonText}>Reset Filters</Text>
      </TouchableOpacity>
    </View>
  )

  // Loading skeleton
  const renderSkeleton = () => (
    <>
      {[1, 2, 3].map((item) => (
        <View key={item} style={styles.skeletonCard}>
          <Skeleton style={styles.skeletonImage} />
          <View style={styles.skeletonContent}>
            <Skeleton style={styles.skeletonTitle} />
            <Skeleton style={styles.skeletonDescription} />
            <View style={styles.skeletonFooter}>
              <Skeleton style={styles.skeletonPrice} />
              <Skeleton style={styles.skeletonRating} />
            </View>
          </View>
        </View>
      ))}
    </>
  )

  // Offline banner
  const renderOfflineBanner = () => {
    if (isOnline) return null

    return (
      <View style={styles.offlineBanner}>
        <Ionicons name="cloud-offline-outline" size={18} color="#FFFFFF" />
        <Text style={styles.offlineBannerText}>You&apos;re offline. Using cached data.</Text>
      </View>
    )
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
        {renderOfflineBanner()}

        {/* Main Content */}
        <ScrollView
          contentContainerStyle={[styles.scrollContent, !isOnline && styles.scrollContentOffline]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#4F78FF"
              colors={["#4F78FF"]}
            />
          }
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          {/* Animated Header */}
          <Animated.View style={[styles.header, headerAnimatedStyle]}>
            <View style={styles.headerTop}>
              <View style={styles.headerInfo}>
                <Text style={styles.greeting}>Hello,</Text>
                <Text style={styles.username}>{username}</Text>
              </View>

              <View style={styles.headerActions}>
                <TouchableOpacity style={styles.iconButton} onPress={handleNotificationsPress} activeOpacity={0.7}>
                  <Ionicons name="notifications-outline" size={24} color="#FFFFFF" />
                  <NotificationBadge count={unreadCount} />
                </TouchableOpacity>

                <TouchableOpacity onPress={handleProfilePress} activeOpacity={0.7}>
                  <Avatar
                    source={{ uri: profileImage || "" }}
                    size={40}
                    text={username.charAt(0)}
                    style={styles.avatar}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <Animated.View style={[styles.searchContainer, { opacity: searchOpacity }]}>
              <View style={styles.searchInputContainer}>
                <Ionicons name="search-outline" size={20} color="#8A8FA3" style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search courses..."
                  placeholderTextColor="#8A8FA3"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  returnKeyType="search"
                  onSubmitEditing={() => fetchCourses(1)}
                />
                {searchQuery ? (
                  <TouchableOpacity
                    style={styles.clearButton}
                    onPress={() => {
                      setSearchQuery("")
                      fetchCourses(1, true)
                    }}
                  >
                    <Ionicons name="close-circle" size={18} color="#8A8FA3" />
                  </TouchableOpacity>
                ) : null}
              </View>

              <TouchableOpacity
                style={[styles.filterButton, activeFilters > 0 && styles.filterButtonActive]}
                onPress={() => setFilterModalVisible(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="options-outline" size={20} color={activeFilters > 0 ? "#FFFFFF" : "#8A8FA3"} />
                {activeFilters > 0 && (
                  <View style={styles.filterBadge}>
                    <Text style={styles.filterBadgeText}>{activeFilters}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </Animated.View>
          </Animated.View>

          {/* Categories */}
          <View style={styles.categoriesContainer}>
            <FlatList
              data={categories}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.categoryItem, selectedCategory === item.name && styles.categoryIconActive]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                    setSelectedCategory(item.name)
                    fetchCourses(1)
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.categoryIcon, selectedCategory === item.name && styles.categoryIconActive]}>
                    <Ionicons name={item.icon as any} size={20} color={selectedCategory === item.name ? "#FFFFFF" : "#8A8FA3"} />
                  </View>
                  <Text style={[styles.categoryText, selectedCategory === item.name && styles.categoryTextActive]}>
                    {item.name}
                  </Text>
                </TouchableOpacity>
              )}
              keyExtractor={(item) => item.id.toString()}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoriesList}
            />
          </View>

          {/* Featured Slider */}
          <View style={styles.featuredContainer}>
            <FlatList
              data={featuredItems}
              renderItem={({ item }) => renderFeaturedItem(item)}
              keyExtractor={(item) => item.id.toString()}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.featuredList}
              snapToInterval={width * 0.9 + 10}
              decelerationRate="fast"
              pagingEnabled
            />
          </View>

          {/* Courses Section */}
          <View style={styles.coursesSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {selectedCategory === "All" ? "All Courses" : `${selectedCategory} Courses`}
              </Text>
              {pagination && <Text style={styles.coursesCount}>{pagination.total} courses</Text>}
            </View>

            {/* Courses List */}
            {isLoading ? (
              renderSkeleton()
            ) : filteredCourses.length > 0 ? (
              <>
                {filteredCourses.map((course) => (
                  <View key={course._id} style={styles.courseCardContainer}>
                    <CourseCard course={course} onPress={() => navigateToCourseDetails(course)} style={styles.courseCard} />
                  </View>
                ))}

                {/* Pagination */}
                {pagination.pages > 1 && (
                  <Pagination
                    currentPage={pagination.page}
                    totalPages={pagination.pages}
                    onPageChange={handlePageChange}
                  />
                )}
              </>
            ) : (
              renderEmptyState()
            )}
          </View>
        </ScrollView>

        {/* Notifications Modal */}
        {notificationsModalVisible && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Notifications</Text>
                <TouchableOpacity onPress={() => setNotificationsModalVisible(false)} style={styles.modalCloseButton}>
                  <Ionicons name="close" size={24} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              {fetchNotifications.isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#4F78FF" />
                </View>
              ) : fetchNotifications.data?.notifications?.length > 0 ? (
                <FlatList
                  data={fetchNotifications.data.notifications}
                  keyExtractor={(item: any) => item._id}
                  renderItem={({ item }) => (
                    <TouchableOpacity style={styles.notificationItem} onPress={() => markNotificationAsRead(item._id)}>
                      <View
                        style={[
                          styles.notificationTypeIndicator,
                          item.type === "info"
                            ? styles.infoIndicator
                            : item.type === "warning"
                              ? styles.warningIndicator
                              : styles.successIndicator,
                        ]}
                      />
                      <View style={styles.notificationContent}>
                        <Text style={styles.notificationTitle}>{item.title}</Text>
                        <Text style={styles.notificationMessage}>{item.message}</Text>
                      </View>
                    </TouchableOpacity>
                  )}
                  contentContainerStyle={styles.notificationsList}
                />
              ) : (
                <View style={styles.emptyNotifications}>
                  <Ionicons name="notifications-off-outline" size={60} color="#4F78FF" />
                  <Text style={styles.emptyNotificationsText}>No notifications yet</Text>
                </View>
              )}

              {fetchNotifications.data?.notifications?.length > 0 && (
                <TouchableOpacity style={styles.markAllReadButton} onPress={markAllAsRead}>
                  <Text style={styles.markAllReadText}>Mark all as read</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Filter Modal */}
        {filterModalVisible && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Filter Courses</Text>
                <TouchableOpacity onPress={() => setFilterModalVisible(false)} style={styles.modalCloseButton}>
                  <Ionicons name="close" size={24} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.filterContent}>
                <View style={styles.filterSection}>
                  <Text style={styles.filterSectionTitle}>Price Range</Text>
                  <View style={styles.priceInputs}>
                    <View style={styles.priceInputContainer}>
                      <Text style={styles.priceInputLabel}>Min</Text>
                      <TextInput
                        style={styles.priceInput}
                        placeholder="0"
                        placeholderTextColor="#8A8FA3"
                        keyboardType="numeric"
                        value={filters.minPrice}
                        onChangeText={(text) => setFilters({ ...filters, minPrice: text })}
                      />
                    </View>
                    <View style={styles.priceInputDivider} />
                    <View style={styles.priceInputContainer}>
                      <Text style={styles.priceInputLabel}>Max</Text>
                      <TextInput
                        style={styles.priceInput}
                        placeholder="1000"
                        placeholderTextColor="#8A8FA3"
                        keyboardType="numeric"
                        value={filters.maxPrice}
                        onChangeText={(text) => setFilters({ ...filters, maxPrice: text })}
                      />
                    </View>
                  </View>
                </View>

                <View style={styles.filterSection}>
                  <Text style={styles.filterSectionTitle}>Featured Courses</Text>
                  <TouchableOpacity
                    style={styles.switchContainer}
                    onPress={() => setFilters({ ...filters, isFeatured: !filters.isFeatured })}
                  >
                    <Text style={styles.switchLabel}>Show only featured courses</Text>
                    <View style={[styles.switchTrack, filters.isFeatured && styles.switchTrackActive]}>
                      <View style={[styles.switchThumb, filters.isFeatured && styles.switchThumbActive]} />
                    </View>
                  </TouchableOpacity>
                </View>

                <View style={styles.filterSection}>
                  <Text style={styles.filterSectionTitle}>Sort By</Text>
                  <View style={styles.sortOptions}>
                    <TouchableOpacity
                      style={[styles.sortOption, filters.sortBy === "createdAt" && styles.sortOptionActive]}
                      onPress={() => setFilters({ ...filters, sortBy: "createdAt" })}
                    >
                      <Text
                        style={[styles.sortOptionText, filters.sortBy === "createdAt" && styles.sortOptionTextActive]}
                      >
                        Date
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.sortOption, filters.sortBy === "price" && styles.sortOptionActive]}
                      onPress={() => setFilters({ ...filters, sortBy: "price" })}
                    >
                      <Text style={[styles.sortOptionText, filters.sortBy === "price" && styles.sortOptionTextActive]}>
                        Price
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.sortOption, filters.sortBy === "title" && styles.sortOptionActive]}
                      onPress={() => setFilters({ ...filters, sortBy: "title" })}
                    >
                      <Text style={[styles.sortOptionText, filters.sortBy === "title" && styles.sortOptionTextActive]}>
                        Title
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.filterSection}>
                  <Text style={styles.filterSectionTitle}>Sort Order</Text>
                  <View style={styles.sortOptions}>
                    <TouchableOpacity
                      style={[styles.sortOption, filters.sortOrder === "asc" && styles.sortOptionActive]}
                      onPress={() => setFilters({ ...filters, sortOrder: "asc" })}
                    >
                      <Text style={[styles.sortOptionText, filters.sortOrder === "asc" && styles.sortOptionTextActive]}>
                        Ascending
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.sortOption, filters.sortOrder === "desc" && styles.sortOptionActive]}
                      onPress={() => setFilters({ ...filters, sortOrder: "desc" })}
                    >
                      <Text
                        style={[styles.sortOptionText, filters.sortOrder === "desc" && styles.sortOptionTextActive]}
                      >
                        Descending
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>

              <View style={styles.filterActions}>
                <TouchableOpacity style={styles.resetButton} onPress={resetFilters}>
                  <Text style={styles.resetButtonText}>Reset</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.applyButton} onPress={() => applyFilters(filters)}>
                  <Text style={styles.applyButtonText}>Apply Filters</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </LinearGradient>
    </SafeAreaView>
  )
}

// Add these styles to the StyleSheet at the bottom of the file
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
    justifyContent: "space-between",
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: "#090E23",
    maxHeight: 140,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 16,
  },
  headerInfo: {
    flex: 1,
  },
  greeting: {
    fontSize: 14,
    color: "#B4C6EF",
    marginBottom: 4,
  },
  username: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconButton: {
    padding: 8,
    marginRight: 16,
    position: "relative",
  },
  iconButtonActive: {
    backgroundColor: "#4F78FF",
    borderRadius: 20,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 50,
    marginRight: 12,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 16,
    height: "100%",
    fontFamily: Platform.OS === "ios" ? "Helvetica Neue" : "sans-serif",
  },
  clearButton: {
    padding: 6,
  },
  filterButton: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  filterButtonActive: {
    backgroundColor: "#4F78FF",
  },
  filterBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#FF5E5E",
    justifyContent: "center",
    alignItems: "center",
  },
  filterBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "bold",
  },
  scrollContent: {
    paddingTop: 150,
    paddingBottom: 20,
  },
  scrollContentOffline: {
    paddingTop: 180, // Extra space for offline banner
  },
  categoriesContainer: {
    marginBottom: 16,
  },
  categoriesList: {
    paddingTop: 16,
    paddingHorizontal: 20,
  },
  featuredContainer: {
    marginBottom: 24,
  },
  featuredList: {
    paddingHorizontal: 20,
  },
  featuredItem: {
    width: width * 0.9,
    height: 140,
    marginRight: 10,
    borderRadius: 16,
    overflow: "hidden",
  },
  featuredGradient: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
    overflow: "hidden",
  },
  featuredContent: {
    flex: 1,
    justifyContent: "center",
    zIndex: 2,
  },
  featuredTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  featuredSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    marginBottom: 16,
  },
  featuredButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  featuredButtonText: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "600",
    marginRight: 8,
  },
  featuredButtonIcon: {
    marginTop: 1,
  },
  featuredDeco: {
    position: "absolute",
    right: -30,
    bottom: -30,
    zIndex: 1,
  },
  featuredCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  featuredCircle2: {
    position: "absolute",
    top: 30,
    left: 30,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
  },
  coursesSection: {
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  coursesCount: {
    fontSize: 14,
    color: "#B4C6EF",
  },
  courseCardContainer: {
    marginBottom: 16,
  },
  courseCard: {
    marginBottom: 0,
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
    marginBottom: 20,
  },
  emptyButton: {
    backgroundColor: "#4F78FF",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  emptyButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  skeletonCard: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 16,
    marginBottom: 16,
    padding: 12,
    height: 120,
  },
  skeletonImage: {
    width: 96,
    height: 96,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  skeletonContent: {
    flex: 1,
    marginLeft: 12,
    justifyContent: "space-between",
  },
  skeletonTitle: {
    height: 20,
    width: "80%",
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    marginBottom: 8,
  },
  skeletonDescription: {
    height: 16,
    width: "90%",
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    marginBottom: 8,
  },
  skeletonFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  skeletonPrice: {
    height: 18,
    width: 80,
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  skeletonRating: {
    height: 18,
    width: 60,
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  avatar: {
    marginLeft: 8,
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
  filterContent: {
    padding: 16,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 12,
  },
  priceInputs: {
    flexDirection: "row",
    alignItems: "center",
  },
  priceInputContainer: {
    flex: 1,
  },
  priceInputLabel: {
    fontSize: 14,
    color: "#B4C6EF",
    marginBottom: 8,
  },
  priceInput: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#FFFFFF",
    fontSize: 16,
  },
  priceInputDivider: {
    width: 20,
    height: 2,
    backgroundColor: "#B4C6EF",
    marginHorizontal: 12,
    marginTop: 20,
  },
  switchContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  switchLabel: {
    fontSize: 14,
    color: "#FFFFFF",
  },
  switchTrack: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    padding: 2,
  },
  switchTrackActive: {
    backgroundColor: "#4F78FF",
  },
  switchThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
  },
  switchThumbActive: {
    transform: [{ translateX: 22 }],
  },
  sortOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -6,
  },
  sortOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    marginRight: 12,
    marginBottom: 12,
  },
  sortOptionActive: {
    backgroundColor: "#4F78FF",
  },
  sortOptionText: {
    fontSize: 14,
    color: "#B4C6EF",
  },
  sortOptionTextActive: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  filterActions: {
    flexDirection: "row",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
  },
  resetButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    marginRight: 12,
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  applyButton: {
    flex: 2,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#4F78FF",
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  notificationsList: {
    padding: 16,
  },
  notificationItem: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  notificationTypeIndicator: {
    width: 4,
    borderRadius: 2,
    marginRight: 12,
  },
  infoIndicator: {
    backgroundColor: "#4F78FF",
  },
  warningIndicator: {
    backgroundColor: "#FF9D5C",
  },
  successIndicator: {
    backgroundColor: "#4CAF50",
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 14,
    color: "#B4C6EF",
  },
  emptyNotifications: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  emptyNotificationsText: {
    fontSize: 16,
    color: "#B4C6EF",
    marginTop: 16,
  },
  markAllReadButton: {
    padding: 16,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
  },
  markAllReadText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4F78FF",
  },
  loadingContainer: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  offlineBanner: {
    backgroundColor: "#FF5E5E",
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  offlineBannerText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 8,
  },
  categoryItem: {
    alignItems: "center",
    marginRight: 16,
    minWidth: 70,
  },
  categoryIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  categoryIconActive: {
    backgroundColor: "#4F78FF",
    borderRadius: 10,
  },
  categoryText: {
    fontSize: 12,
    color: "#8A8FA3",
  },
  categoryTextActive: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
})
