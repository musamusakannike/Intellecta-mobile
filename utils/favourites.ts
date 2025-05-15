import AsyncStorage from '@react-native-async-storage/async-storage';
import { EventEmitter } from 'events';

// Create an event emitter for favorites changes
export const favoritesEmitter = new EventEmitter();

// Get all favorites
export const getFavorites = async () => {
  try {
    const favoritesJson = await AsyncStorage.getItem('favorites');
    return favoritesJson ? JSON.parse(favoritesJson) : [];
  } catch (error) {
    console.error('Error getting favorites:', error);
    return [];
  }
};

// Check if a course is a favorite
export const isFavorite = async (courseId: string) => {
  try {
    const favorites = await getFavorites();
    return favorites.some((course: any) => course._id === courseId);
  } catch (error) {
    console.error('Error checking favorite status:', error);
    return false;
  }
};

// Add a course to favorites
export const addToFavorites = async (course: any) => {
  try {
    const favorites = await getFavorites();
    
    // Check if course is already in favorites
    if (!favorites.some((fav: any) => fav._id === course._id)) {
      favorites.push(course);
      await AsyncStorage.setItem('favorites', JSON.stringify(favorites));
      
      // Emit event for listeners
      favoritesEmitter.emit('favoritesUpdated', favorites);
    }
    
    return favorites;
  } catch (error) {
    console.error('Error adding to favorites:', error);
    return [];
  }
};

// Remove a course from favorites
export const removeFromFavorites = async (courseId: string) => {
  try {
    const favorites = await getFavorites();
    const updatedFavorites = favorites.filter((course: any) => course._id !== courseId);
    await AsyncStorage.setItem('favorites', JSON.stringify(updatedFavorites));
    
    // Emit event for listeners
    favoritesEmitter.emit('favoritesUpdated', updatedFavorites);
    
    return updatedFavorites;
  } catch (error) {
    console.error('Error removing from favorites:', error);
    return [];
  }
};

// Toggle favorite status
export const toggleFavorite = async (course: any) => {
  try {
    const isCourseInFavorites = await isFavorite(course._id);
    
    if (isCourseInFavorites) {
      return await removeFromFavorites(course._id);
    } else {
      return await addToFavorites(course);
    }
  } catch (error) {
    console.error('Error toggling favorite:', error);
    return [];
  }
};