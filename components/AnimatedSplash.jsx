import React, { useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  Text,
  Animated,
  Dimensions,
  StatusBar,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import LottieView from "lottie-react-native";

const { width, height } = Dimensions.get("window");

export default function EnhancedSplash({ onFinish }) {
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const translateYText = useRef(new Animated.Value(20)).current;
  const translateYSubtext = useRef(new Animated.Value(15)).current;
  const opacitySubtext = useRef(new Animated.Value(0)).current;
  const lottieRef = useRef(null);

  useEffect(() => {
    // Play the animations in sequence
    StatusBar.setBarStyle("light-content");

    // Start the logo animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(translateYText, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // After logo appears, show the tagline
      Animated.parallel([
        Animated.timing(opacitySubtext, {
          toValue: 1,
          duration: 600,
          delay: 200,
          useNativeDriver: true,
        }),
        Animated.timing(translateYSubtext, {
          toValue: 0,
          duration: 600,
          delay: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // Play the lottie animation
      if (lottieRef.current) {
        lottieRef.current.play();
      }
    });

    // Finish after a suitable delay - longer to appreciate the animation
    const timer = setTimeout(onFinish, 3700);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" />

      <LinearGradient
        colors={["#090E23", "#1F2B5E", "#0C1339"]}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Particle animation in background */}
        {/* <View style={styles.lottieContainer}>
          <LottieView
            ref={lottieRef}
            source={particleAnimation}
            style={styles.lottie}
            autoPlay
            loop
          />
        </View> */}

        <View style={styles.contentContainer}>
          {/* Main logo/text */}
          <Animated.View
            style={[
              styles.logoContainer,
              {
                opacity: fadeAnim,
                transform: [
                  { scale: scaleAnim },
                  { translateY: translateYText },
                ],
              },
            ]}
          >
            <Text style={styles.text}>Intellecta</Text>
          </Animated.View>

          {/* Glowing dot under the text */}
          <View style={styles.dotsContainer}>
            <Animated.View
              style={[styles.dot, styles.dotGlow, { opacity: fadeAnim }]}
            />
            <Animated.View style={[styles.dot, { opacity: fadeAnim }]} />
          </View>

          {/* Tagline */}
          <Animated.Text
            style={[
              styles.subText,
              {
                opacity: opacitySubtext,
                transform: [{ translateY: translateYSubtext }],
              },
            ]}
          >
            Knowledge amplified
          </Animated.Text>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  contentContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  logoContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    fontSize: 48,
    color: "#fff",
    fontWeight: "bold",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 10,
    fontFamily: Platform.OS === "ios" ? "Helvetica Neue" : "sans-serif-light",
  },
  subText: {
    fontSize: 18,
    color: "#B4C6EF",
    letterSpacing: 4,
    textTransform: "uppercase",
    marginTop: 15,
    fontFamily: Platform.OS === "ios" ? "Helvetica Neue" : "sans-serif-light",
  },
  dotsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    height: 20,
    alignItems: "center",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#4F78FF",
    marginHorizontal: 2,
  },
  dotGlow: {
    shadowColor: "#4F78FF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 6,
  },
  lottieContainer: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.6,
  },
  lottie: {
    flex: 1,
  },
});
