import React, { useState, useEffect, useContext, useCallback } from "react"
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  SafeAreaView,
  FlatList,
  Image,
  ActivityIndicator,
  Dimensions,
} from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { useRouter } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { ToastContext } from "../../components/Toast/ToastContext"
import * as Haptics from "expo-haptics"
import { CourseCard } from "../../components/CourseCard"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { getFavorites, favoritesEmitter, removeFromFavorites } from "../../utils/favourites"

const { width } = Dimensions.get("window")

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [viewMode, setViewMode] = useState<"grid" | "list">("list")

  const toast = useContext(ToastContext)
  const router = useRouter()
  const insets = useSafeAreaInsets()

  // Load favorites
  const loadFavorites = useCallback(async () => {
    try {
      setIsLoading(true)
      const favoriteCourses = await getFavorites()
      setFavorites(favoriteCourses)
    } catch (error) {
      console.error('Error loading favorites:', error)
      toast?.showToast({
        type: "error",
        message: "Failed to load favorites",
      })
    } finally {
      setIsLoading(false)
      setRefreshing(false)
    }
  }, [])

  // Initial load
  useEffect(() => {
    loadFavorites()
  }, [loadFavorites])

  // Listen for favorites updates
  useEffect(() => {
    const handleFavoritesUpdated = (updatedFavorites: any[]) => {
      setFavorites(updatedFavorites);
    };

    // Add event listener
    favoritesEmitter.on('favoritesUpdated', handleFavoritesUpdated);

    // Clean up
    return () => {
      favoritesEmitter.off('favoritesUpdated', handleFavoritesUpdated);
    };
  }, []);

  // Pull-to-refresh handler
  const handleRefresh = () => {
    setRefreshing(true)
    loadFavorites()
  }

  // Navigate to course details
  const navigateToCourseDetails = (course: any) => {
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

  // Remove from favorites
  const handleRemoveFromFavorites = async (courseId: string, event: any) => {
    event.stopPropagation();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await removeFromFavorites(courseId);
    // The event listener will update the state
  };

  // Empty state
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="heart-outline" size={70} color="#4F78FF" style={styles.emptyIcon} />
      <Text style={styles.emptyTitle}>No favorites yet</Text>
      <Text style={styles.emptyText}>Courses you favorite will appear here</Text>
      <TouchableOpacity 
        style={styles.emptyButton} 
        onPress={() => router.push('/courses')} 
        activeOpacity={0.8}
      >
        <Text style={styles.emptyButtonText}>Browse Courses</Text>
      </TouchableOpacity>
    </View>
  )

  // Loading state
  const renderLoading = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#4F78FF" />
      <Text style={styles.loadingText}>Loading favorites...</Text>
    </View>
  )

  // Render grid view of courses
  const renderGridView = () => (
    <View style={styles.gridContainer}>
      {favorites.map((course) => (
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
            <Image
              source={{ uri: course.image || 'https://via.placeholder.com/300' }}
              style={styles.gridImage}
              resizeMode="cover"
            />
          </View>
          <View style={styles.gridCardContent}>
            <Text style={styles.gridCardTitle} numberOfLines={2}>{course.title}</Text>
            <View style={styles.gridCardFooter}>
              <Text style={styles.gridCardPrice}>
                {course.price > 0 ? `$${course.price?.toFixed(2)}` : 'Free'}
              </Text>
              <TouchableOpacity 
                style={styles.gridFavoriteButton}
                onPress={(e) => handleRemoveFromFavorites(course._id, e)}
              >
                <Ionicons name="heart" size={18} color="#FF5E5E" />
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      ))}
    </View>
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
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Favorites</Text>
          <TouchableOpacity style={styles.viewModeButton} onPress={toggleViewMode}>
            <Ionicons 
              name={viewMode === "list" ? "grid-outline" : "list-outline"} 
              size={24} 
              color="#FFFFFF" 
            />
          </TouchableOpacity>
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
          {isLoading ? (
            renderLoading()
          ) : favorites.length > 0 ? (
            <View style={styles.favoritesSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Your Favorite Courses</Text>
                <Text style={styles.coursesCount}>{favorites.length} courses</Text>
              </View>

              {viewMode === "list" ? (
                // List view
                favorites.map((course) => (
                  <View key={course._id} style={styles.courseCardContainer}>
                    <CourseCard course={course} onPress={() => navigateToCourseDetails(course)} style={styles.courseCard} />
                  </View>
                ))
              ) : (
                // Grid view
                renderGridView()
              )}
            </View>
          ) : (
            renderEmptyState()
          )}
        </ScrollView>
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
  scrollContent: {
    paddingBottom: 20,
    minHeight: '100%',
  },
  favoritesSection: {
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
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
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
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#B4C6EF",
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
    position: "relative",
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  featuredBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "#4F78FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    zIndex: 1,
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
  gridFavoriteButton: {
    padding: 6,
  },
})