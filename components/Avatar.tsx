import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

export const Avatar = ({ source, size = 40, text, style }: { source: string, size: number, text: string, style: any }) => {
  // Colors that match the app's theme
  const colors = ['#4F78FF', '#8A53FF', '#FF5E5E', '#FF9D5C', '#4CAF50'];
  
  // Deterministic color based on text
  const getColorFromText = (text: string) => {
    if (!text) return colors[0];
    const charCode = text.charCodeAt(0);
    return colors[charCode % colors.length];
  };
  
  const backgroundColor = getColorFromText(text);
  
  return (
    <View style={[
      styles.container, 
      { width: size, height: size, borderRadius: size / 2 },
      style
    ]}>
      {source ? (
        <Image 
          source={{ uri: source }} 
          style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]} 
        />
      ) : (
        <View style={[styles.textContainer, { backgroundColor }]}>
          <Text style={[styles.text, { fontSize: size * 0.4 }]}>
            {text || '?'}
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