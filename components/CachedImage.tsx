import React, { useState, useEffect } from 'react';
import { Image, ActivityIndicator, StyleSheet, View, ImageStyle, ImageResizeMode } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Crypto from 'expo-crypto';

interface CachedImageProps {
  source: string;
  style?: ImageStyle | ImageStyle[];
  resizeMode?: ImageResizeMode;
}

/**
 * CachedImage Component
 * Efficiently displays images by caching them using expo-file-system
 */
const CachedImage: React.FC<CachedImageProps> = ({ source, style, resizeMode = 'cover' }) => {
  const [imageUri, setImageUri] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadImage = async () => {
      try {
        const fileName = await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256,
          source
        );

        const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
        const metadata = await FileSystem.getInfoAsync(fileUri);

        if (metadata.exists) {
          if (isMounted) setImageUri(fileUri);
        } else {
          const download = await FileSystem.downloadAsync(source, fileUri);
          if (isMounted) setImageUri(download.uri);
        }
      } catch (error) {
        console.error('Error loading cached image:', error);
        if (isMounted) setImageUri(source); // Fallback to original URL
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadImage();

    return () => {
      isMounted = false;
    };
  }, [source]);

  if (loading || !imageUri) {
    return (
      <View style={[styles.loaderContainer, style]}>
        <ActivityIndicator size="small" color="#999" />
      </View>
    );
  }

  return <Image source={{ uri: imageUri }} style={style} resizeMode={resizeMode} />;
};

const styles = StyleSheet.create({
  loaderContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
});

export default CachedImage;
