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
  Platform,
  ActivityIndicator,
} from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { useRouter } from "expo-router"
import AsyncStorage from "@react-native-async-storage/async-storage"
import * as SecureStore from "expo-secure-store"
import { Ionicons } from "@expo/vector-icons"
import { ToastContext } from "../../components/Toast/ToastContext"
import * as Haptics from "expo-haptics"
import { Skeleton } from "../../components/Skeleton"
import { CourseCard } from "../../components/CourseCard"
import { Pagination } from "../../components/Pagination"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import CommunityNetInfo from '@react-native-community/netinfo'
import { API_ROUTES } from "@/constants"

const { width } = Dimensions.get("window")

interface Course {
  _id: string
  title: string
  description: string
  price: number
  category: string
  isFeatured: boolean
  rating?: number
  instructor?: string
  thumbnail?: string
  enrolledStudents?: number
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

interface Category {
  id: number
  name: string
  icon: string
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

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 })
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [filterModalVisible, setFilterModalVisible] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const [filters, setFilters] = useState<FilterState>({
    minPrice: "",
    maxPrice: "",
    isFeatured: false,
    sortBy: "createdAt",
    sortOrder: "desc",
    category: "",
    search: "",
    page: 1,
    limit: 12, // Show more courses per page
  })
  const [activeFilters, setActiveFilters] = useState(0)
  const [viewMode, setViewMode] = useState<"grid" | "list">("list")

  const toast = useContext(ToastContext)
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { isOnline } = useNetworkStatus()

  // Network status hook
  function useNetworkStatus() {
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
    }, [])

    return { isOnline }
  }

  // Load token
  useEffect(() => {
    const loadToken = async () => {
      try {
        const storedToken = await SecureStore.getItemAsync("token")
        setToken(storedToken)

        if (!storedToken) {
          router.replace("/auth/login")
          return
        }
      } catch (error) {
        console.error("Error loading token:", error)
      }
    }

    loadToken()
  }, [])

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
            limit: 12,
          }
          : {
            ...filters,
            page,
            search: searchQuery,
            category: selectedCategory !== "All" ? selectedCategory : "",
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
          setCourses(data.courses)
          setPagination(data.pagination)
          
          // Cache the results for offline use
          await AsyncStorage.setItem('cached_courses', JSON.stringify({
            courses: data.courses,
            pagination: data.pagination,
            timestamp: new Date().toISOString()
          }))
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
        
        // Try to load cached data if available
        try {
          const cachedData = await AsyncStorage.getItem('cached_courses')
          if (cachedData) {
            const { courses, pagination } = JSON.parse(cachedData)
            setCourses(courses)
            setPagination(pagination)
            toast?.showToast({
              type: "info",
              message: "Showing cached courses data",
            })
          }
        } catch (cacheError) {
          console.error("Error loading cached data:", cacheError)
        }
      } finally {
        setIsLoading(false)
        setRefreshing(false)
      }
    },
    [searchQuery, selectedCategory, filters, isOnline],
  )

  // Initial fetch
  useEffect(() => {
    fetchCourses()
  }, [fetchCourses])

  // Pull-to-refresh handler
  const handleRefresh = () => {
    setRefreshing(true)
    fetchCourses(1, true)
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
      limit: 12,
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

  // Navigate to course details
  const navigateToCourseDetails = (course: Course) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    router.push(`/course/${course._id}`)
  }

  // Handle back button press
  const handleBackPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    router.back()
  }

  // Toggle view mode (grid/list)
  const toggleViewMode = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setViewMode(viewMode === "list" ? "grid" : "list")
  }

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
      {viewMode === "list" ? (
        // List view skeletons
        Array(3).fill(0).map((_, index) => (
          <View key={index} style={styles.skeletonCard}>
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
        ))
      ) : (
        // Grid view skeletons
        <View style={styles.gridContainer}>
          {Array(6).fill(0).map((_, index) => (
            <View key={index} style={styles.gridSkeletonCard}>
              <Skeleton style={styles.gridSkeletonImage} />
              <Skeleton style={styles.gridSkeletonTitle} />
              <Skeleton style={styles.gridSkeletonPrice} />
            </View>
          ))}
        </View>
      )}
    </>
  )

  // Offline banner
  const renderOfflineBanner = () => {
    if (isOnline) return null

    return (
      <View style={styles.offlineBanner}>
        <Ionicons name="cloud-offline-outline" size={18} color="#FFFFFF" />
        <Text style={styles.offlineBannerText}>You're offline. Using cached data.</Text>
      </View>
    )
  }

  // Render grid view of courses
  const renderGridView = () => (
    <View style={styles.gridContainer}>
      {courses.map((course) => (
        <TouchableOpacity
          key={course._id}
          style={styles.gridCard}
          onPress={() => navigateToCourseDetails(course)}
          activeOpacity={0.8}
        >
          <View style={styles.gridImageContainer}>
            {course.isFeatured && (
              <View style={styles.featuredBadge}>
                <Text style={styles.featuredBadgeText}>Featured</Text>
              </View>
            )}
            <View style={styles.gridImagePlaceholder}>
              <Ionicons name={getCategoryIcon(course.category) as React.ComponentProps<typeof Ionicons>['name']} size={30} color="#FFFFFF" />
            </View>
          </View>
          <View style={styles.gridCardContent}>
            <Text style={styles.gridCardTitle} numberOfLines={2}>{course.title}</Text>
            <View style={styles.gridCardFooter}>
              <Text style={styles.gridCardPrice}>
                ${course.price.toFixed(2)}
              </Text>
              <View style={styles.gridCardRating}>
                <Ionicons name="star" size={12} color="#FFD700" />
                <Text style={styles.gridCardRatingText}>{course.rating || 4.5}</Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  )

  // Get category icon
  const getCategoryIcon = (
    categoryName: string
  ): (typeof categories)[number]["icon"] => {
    const category = categories.find(cat => cat.name === categoryName)
    return category?.icon || "grid-outline"
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

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Explore Courses</Text>
          <TouchableOpacity style={styles.viewModeButton} onPress={toggleViewMode}>
            <Ionicons 
              name={viewMode === "list" ? "grid-outline" : "list-outline"} 
              size={24} 
              color="#FFFFFF" 
            />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
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
        </View>

        {/* Categories */}
        <View style={styles.categoriesContainer}>
          <FlatList
            data={categories}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.categoryItem, selectedCategory === item.name && styles.categoryItemActive]}
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
        >
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
                {viewMode === "list" ? (
                  // List view
                  courses.map((course) => (
                    <View key={course._id} style={styles.courseCardContainer}>
                      <CourseCard course={course} onPress={() => navigateToCourseDetails(course)} style={styles.courseCard} />
                    </View>
                  ))
                ) : (
                  // Grid view
                  renderGridView()
                )}

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
                    <TouchableOpacity
                      style={[styles.sortOption, filters.sortBy === "rating" && styles.sortOptionActive]}
                      onPress={() => setFilters({ ...filters, sortBy: "rating" })}
                    >
                      <Text style={[styles.sortOptionText, filters.sortBy === "rating" && styles.sortOptionTextActive]}>
                        Rating
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#090E23",
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  viewModeButton: {
    padding: 8,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
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
  categoriesContainer: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.05)",
  },
  categoriesList: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  categoryItem: {
    alignItems: "center",
    marginRight: 16,
    minWidth: 70,
  },
  categoryItemActive: {
    opacity: 1,
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
  scrollContent: {
    paddingBottom: 20,
  },
  coursesSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
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
  // Grid view styles
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginHorizontal: -5,
  },
  gridCard: {
    width: (width - 50) / 2,
    marginBottom: 16,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    overflow: "hidden",
  },
  gridImageContainer: {
    height: 120,
    backgroundColor: "rgba(79, 120, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  gridImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(79, 120, 255, 0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  featuredBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "#4F78FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  featuredBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "bold",
  },
  gridCardContent: {
    padding: 12,
  },
  gridCardTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 8,
    height: 40,
  },
  gridCardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  gridCardPrice: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#4F78FF",
  },
  gridCardRating: {
    flexDirection: "row",
    alignItems: "center",
  },
  gridCardRatingText: {
    fontSize: 12,
    color: "#FFFFFF",
    marginLeft: 4,
  },
  // Grid skeleton styles
  gridSkeletonCard: {
    width: (width - 50) / 2,
    marginBottom: 16,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    overflow: "hidden",
  },
  gridSkeletonImage: {
    height: 120,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  gridSkeletonTitle: {
    height: 16,
    width: "90%",
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    marginTop: 12,
    marginBottom: 8,
    marginHorizontal: 12,
  },
  gridSkeletonPrice: {
    height: 14,
    width: "40%",
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    marginBottom: 12,
    marginHorizontal: 12,
  },
})