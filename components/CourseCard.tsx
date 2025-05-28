import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { isFavorite, toggleFavorite, favoritesEmitter } from '../utils/favourites';

export const CourseCard = ({ course, onPress, style }: { course: any, onPress: any, style: any }) => {
  const [isFav, setIsFav] = useState(false);

  // Check if course is in favorites when component mounts
  useEffect(() => {
    const checkFavoriteStatus = async () => {
      try {
        const isCourseFavorite = await isFavorite(course._id);
        setIsFav(isCourseFavorite);
      } catch (error) {
        console.error('Error checking favorite status:', error);
      }
    };

    checkFavoriteStatus();

    // Listen for favorites updates
    const handleFavoritesUpdated = (favorites: any[]) => {
      const isCourseFavorite = favorites.some(fav => fav._id === course._id);
      setIsFav(isCourseFavorite);
    };

    favoritesEmitter.on('favoritesUpdated', handleFavoritesUpdated);

    // Clean up
    return () => {
      favoritesEmitter.off('favoritesUpdated', handleFavoritesUpdated);
    };
  }, [course._id]);

  // Toggle favorite status
  const handleToggleFavorite = async (event: any) => {
    event.stopPropagation(); // Prevent triggering the card's onPress

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await toggleFavorite(course);
      // No need to update state here as the event listener will handle it
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Image
        source={{ uri: course.image || 'https://via.placeholder.com/300' }}
        style={styles.image}
        resizeMode="cover"
      />

      <View style={styles.content}>
        <View style={styles.topSection}>
          <View style={styles.categoryContainer}>
            <Text style={styles.category}>{course.categories?.[0] || course.category || 'General'}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {/* {course.isFeatured && (
              <View style={styles.featuredBadge}>
                <Ionicons name="star" size={12} color="#FFFFFF" />
              </View>
            )} */}
            <TouchableOpacity
              style={styles.favoriteButton}
              onPress={handleToggleFavorite}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isFav ? "heart" : "heart-outline"}
                size={22}
                color={isFav ? "#FF5E5E" : "#FFFFFF"}
              />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.title} numberOfLines={1}>
          {course.title}
        </Text>

        <Text style={styles.instructor} numberOfLines={1}>
          {course.description}
        </Text>

        <View style={styles.footer}>

          <View style={styles.rating}>
            <FontAwesome name="star" size={14} color="#FFD700" style={styles.ratingIcon} />
            <Text style={styles.ratingText}>
              {course.ratingStats?.averageRating?.toFixed(1) || course.rating?.toFixed(1) || '4.5'}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    position: 'relative',
  },
  image: {
    width: 100,
    height: 120,
    borderRadius: 12,
    margin: 10,
  },
  content: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  topSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryContainer: {
    backgroundColor: 'rgba(79, 120, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  category: {
    color: '#4F78FF',
    fontSize: 12,
    fontWeight: '600',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  instructor: {
    color: '#B4C6EF',
    fontSize: 14,
    marginBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  ratingIcon: {
    marginRight: 4,
  },
  ratingText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  featuredBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#FF9D5C',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  favoriteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});