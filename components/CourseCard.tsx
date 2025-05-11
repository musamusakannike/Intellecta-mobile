import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons, FontAwesome } from '@expo/vector-icons';

export const CourseCard = ({ course, onPress, style }: { course: any, onPress: any, style: any }) => {
  console.log(JSON.stringify(course, null, 2));
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
        <View style={styles.categoryContainer}>
          <Text style={styles.category}>{course.categories[0]}</Text>
        </View>

        <Text style={styles.title} numberOfLines={1}>
          {course.title}
        </Text>

        <Text style={styles.instructor} numberOfLines={1}>
          {course.description}
        </Text>

        <View style={styles.footer}>
          <Text style={styles.price}>
            {course.price > 0 ? `$${course.price?.toFixed(2)}` : 'Free'}
          </Text>

          <View style={styles.rating}>
            <FontAwesome name="star" size={14} color="#FFD700" style={styles.ratingIcon} />
            <Text style={styles.ratingText}>{course.ratingStats.averageRating?.toFixed(1)}</Text>
          </View>
        </View>
      </View>

      {course.isFeatured && (
        <View style={styles.featuredBadge}>
          <Ionicons name="star" size={12} color="#FFFFFF" />
        </View>
      )}
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
  categoryContainer: {
    backgroundColor: 'rgba(79, 120, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 8,
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
  price: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
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
});