"use client"

import React, { useState, useEffect, useContext, useCallback } from "react"
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  FlatList,
  Dimensions,
  StatusBar,
  SafeAreaView,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
  Platform,
} from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { useRouter } from "expo-router"
import AsyncStorage from "@react-native-async-storage/async-storage"
import * as SecureStore from "expo-secure-store"
import { Ionicons, AntDesign } from "@expo/vector-icons"
import { ToastContext } from "../components/Toast/ToastContext"
import * as Haptics from "expo-haptics"
import { Skeleton } from "../components/Skeleton"
import { Avatar } from "../components/Avatar"
import { CourseCard } from "../components/CourseCard"
import { Pagination } from "../components/Pagination"
import { FilterModal } from "../components/FilterModal"
import { NotificationsModal } from "../components/NotificationsModal"
import { NotificationBadge } from "../components/NotificationBadge"
import { useNotifications } from "../hooks/useNotifications"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming } from "react-native-reanimated"
import { API_ROUTES } from "@/constants"

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
}

interface Category {
  id: number
  name: string
  icon: string
}

interface FeaturedItem {
  id: number
  title: string
  subtitle: string
  color1: string
  color2: string
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
const featuredItems = [
  {
    id: 1,
    title: "Spring Sale",
    subtitle: "Get 50% off selected courses",
    color1: "#4F78FF",
    color2: "#8A53FF",
  },
  {
    id: 2,
    title: "New Courses",
    subtitle: "Check out our latest additions",
    color1: "#FF5E5E",
    color2: "#FF9D5C",
  },
  {
    id: 3,
    title: "Premium Access",
    subtitle: "Unlimited learning for one price",
    color1: "#4CAF50",
    color2: "#8BC34A",
  },
]

export default function Dashboard() {
  const [username, setUsername] = useState("Learner")
  const [profileImage, setProfileImage] = useState<string | null>(null)
  const [courses, setCourses] = useState<Course[]>([])
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 })
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [filterModalVisible, setFilterModalVisible] = useState(false)
  const [notificationsModalVisible, setNotificationsModalVisible] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const [filters, setFilters] = useState<FilterState>({
    minPrice: "",
    maxPrice: "",
    isFeatured: false,
    sortBy: "createdAt",
    sortOrder: "desc",
  })
  const [activeFilters, setActiveFilters] = useState(0)

  const toast = useContext(ToastContext)
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { unreadCount, fetchNotifications, markAllAsRead } = useNotifications()

  // Animated values for scrolling effects
  const scrollY = useSharedValue(0)
  const headerHeight = useSharedValue(180)
  const searchOpacity = useSharedValue(1)

  // Load user data
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const storedToken = await SecureStore.getItemAsync("token")
        setToken(storedToken)

        if (!storedToken) {
          router.replace("/auth/login")
          return
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
  }, [])

  // Fetch courses with filters
  const fetchCourses = useCallback(
    async (page = 1, resetFilters = false) => {
      try {
        setIsLoading(true)

        const appliedFilters: FilterState = resetFilters
          ? {
            minPrice: "",
            maxPrice: "",
            isFeatured: false,
            sortBy: "createdAt",
            sortOrder: "desc",
          }
          : filters

        const category = selectedCategory !== "All" ? selectedCategory : ""

        // Construct the query string
        const params = new URLSearchParams()
        if (searchQuery) params.append("search", searchQuery)
        if (category) params.append("category", category)
        if (appliedFilters.minPrice) params.append("minPrice", appliedFilters.minPrice)
        if (appliedFilters.maxPrice) params.append("maxPrice", appliedFilters.maxPrice)
        if (appliedFilters.isFeatured) params.append("isFeatured", "true")
        if (appliedFilters.sortBy) params.append("sortBy", appliedFilters.sortBy)
        if (appliedFilters.sortOrder) params.append("sortOrder", appliedFilters.sortOrder)
        params.append("page", page.toString())
        params.append("limit", "10")

        const storedToken = await AsyncStorage.getItem("token")
        const response = await fetch(`${API_ROUTES.COURSES.GET_COURSES}?${params.toString()}`, {
          headers: {
            Authorization: `Bearer ${storedToken}`,
          },
        })

        const data = await response.json()

        if (response.ok) {
          setCourses(data.courses)
          setFilteredCourses(data.courses)
          setPagination(data.pagination)
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
    [searchQuery, selectedCategory, filters],
  )

  // Initial fetch
  useEffect(() => {
    fetchCourses()
  }, [fetchCourses])

  // Pull-to-refresh handler
  const handleRefresh = () => {
    setRefreshing(true)
    fetchCourses(1, true)
    fetchNotifications()
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

  // Render category item
  const renderCategoryItem = ({ item }: { item: Category }) => {
    const styles = StyleSheet.create({
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

    return (
      <TouchableOpacity
        style={[styles.categoryItem, selectedCategory === item.name && styles.categoryIcon]}
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
    )
  }

  // Render featured slider item
  const renderFeaturedItem = ({ item }: { item: FeaturedItem }) => (
    <TouchableOpacity
      style={styles.featuredItem}
      activeOpacity={0.9}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      }}
    >
      <LinearGradient
        colors={[item.color1, item.color2]}
        style={[styles.featuredGradient, { borderRadius: 16 }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.featuredContent}>
          <Text style={styles.featuredTitle}>{item.title}</Text>
          <Text style={styles.featuredSubtitle}>{item.subtitle}</Text>

          <View style={styles.featuredButton}>
            <Text style={styles.featuredButtonText}>Explore</Text>
            <AntDesign name="arrowright" size={16} color="#FFFFFF" style={styles.featuredButtonIcon} />
          </View>
        </View>

        <View style={styles.featuredDeco}>
          <View style={styles.featuredCircle} />
          <View style={[styles.featuredCircle, styles.featuredCircle2]} />
        </View>
      </LinearGradient>
    </TouchableOpacity>
  )

  // Render course item
  const renderCourseItem = ({ item }: { item: Course }) => (
    <CourseCard course={item} onPress={() => navigateToCourseDetails(item)} style={styles.courseCard} />
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

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      <LinearGradient
        colors={["#090E23", "#1F2B5E", "#0C1339"]}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
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
              renderItem={renderCategoryItem}
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
              renderItem={renderFeaturedItem}
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
            ) : courses.length > 0 ? (
              <>
                {courses.map((course) => (
                  <CourseCard
                    key={course._id}
                    course={course}
                    onPress={() => navigateToCourseDetails(course)}
                    style={styles.courseCard}
                  />
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
        <NotificationsModal
          visible={notificationsModalVisible}
          onClose={() => setNotificationsModalVisible(false)}
          token={token}
        />

        {/* Filter Modal */}
        <FilterModal
          visible={filterModalVisible}
          onClose={() => setFilterModalVisible(false)}
          onApply={applyFilters}
          onReset={resetFilters}
          initialFilters={filters}
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
  courseCard: {
    marginBottom: 16,
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
})
