import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

// Fix the type definition for source to properly handle require and uri objects
interface AvatarProps {
  source: any; // Use 'any' instead of 'string' to handle both require() and {uri: string}
  size?: number;
  text?: string;
  style?: any;
}

export const Avatar = ({ source, size = 40, text = '?', style }: AvatarProps) => {
  // Colors that match the app's theme
  const colors = ['#4F78FF', '#8A53FF', '#FF5E5E', '#FF9D5C', '#4CAF50'];
  
  // Deterministic color based on text
  const getColorFromText = (text: string) => {
    if (!text) return colors[0];
    const charCode = text.charCodeAt(0);
    return colors[charCode % colors.length];
  };
  
  const backgroundColor = getColorFromText(text);
  
  // Check if we have a valid source to render
  const hasValidSource = () => {
    if (!source) return false;
    
    // Handle both object formats: {uri: string} and required module
    if (typeof source === 'object') {
      // Check for required module (has default property) or uri object
      return (source.default || (source.uri && typeof source.uri === 'string'));
    }
    
    return false;
  };
  
  return (
    <View style={[
      styles.container, 
      { width: size, height: size, borderRadius: size / 2 },
      style
    ]}>
      {hasValidSource() ? (
        <Image 
          source={source} 
          style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]} 
          defaultSource={require('@/assets/images/icon.png')} // Fallback
        />
      ) : (
        <View style={[styles.textContainer, { backgroundColor }]}>
          <Text style={[styles.text, { fontSize: size * 0.4 }]}>
            {text}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  textContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});