import AnimatedSplash from "@/components/AnimatedSplash";
import ToastProvider from "@/components/Toast/ToastProvider";
import { Stack, useRouter } from "expo-router";
import * as SecureStore from 'expo-secure-store';
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, View } from "react-native";

export default function RootLayout() {
  const [isSplashReady, setIsSplashReady] = useState(false);
  const [hasToken, setHasToken] = useState<boolean | null>(null); // null while checking
  const hasNavigatedRef = useRef(false);
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;

    // const noTokenTest = async () => {
    //   await SecureStore.deleteItemAsync('token'); // For testing purposes, remove this in production
    // }

    const checkAuthToken = async () => {
      try {
        const token = await SecureStore.getItemAsync('token');

        // Simulate timeout fallback (e.g., 5s max wait)
        if (isMounted) {
          setHasToken(!!token);
        }
      } catch (error) {
        console.error('Error checking auth token:', error);
        if (isMounted) {
          setHasToken(false);
        }
      }
    };

    // noTokenTest();
    checkAuthToken();

    // Safety timeout to avoid indefinite loading
    const timeout = setTimeout(() => {
      if (isMounted && hasToken === null) {
        setHasToken(false);
      }
    }, 5000);

    return () => {
      isMounted = false;
      clearTimeout(timeout);
    };
  }, [hasToken]);

  useEffect(() => {
    if (isSplashReady && hasToken !== null && !hasNavigatedRef.current) {
      hasNavigatedRef.current = true; // Prevent multiple navigations

      if (!hasToken) {
        router.replace('/auth/login');
      } else {
        router.replace('/');
      }
    }
  }, [isSplashReady, hasToken, router]);

  if (!isSplashReady) {
    return <AnimatedSplash onFinish={() => setIsSplashReady(true)} />;
  }

  if (hasToken === null) {
    // Fallback UI instead of null
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: "#111827" }}>
        <ActivityIndicator size="large" color={"#fff"} />
      </View>
    );
  }

  return (
    <ToastProvider>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="auth/login" options={{ headerShown: false }} />
        <Stack.Screen name="auth/register" options={{ headerShown: false }} />
        <Stack.Screen name="auth/profile" options={{ headerShown: false }} />
        <Stack.Screen name="auth/edit-profile" options={{ headerShown: false }} />
        <Stack.Screen name="course/[courseId]" options={{ headerShown: false }} />
        <Stack.Screen name="topic/[topicId]" options={{ headerShown: false }} />
        <Stack.Screen name="lesson/[lessonId]" options={{ headerShown: false }} />
        <Stack.Screen name="premium/manage" options={{ headerShown: false }} />
        <Stack.Screen name="premium/subscribe" options={{ headerShown: false }} />
        <Stack.Screen name="premium/invoices" options={{ headerShown: false }} />
        <Stack.Screen name="premium/payment" options={{ headerShown: false }} />
        <Stack.Screen name="premium/change-plan" options={{ headerShown: false }} />
        <Stack.Screen name="(pages)/security" options={{ headerShown: false }} />
        <Stack.Screen name="(pages)/help" options={{ headerShown: false }} />
        <Stack.Screen name="(pages)/termsprivacy" options={{ headerShown: false }} />
        <Stack.Screen name="(pages)/courses" options={{ headerShown: false }} />
        <Stack.Screen name="(pages)/favourites" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" options={{ headerShown: false }} />
      </Stack>
    </ToastProvider>
  );
}
