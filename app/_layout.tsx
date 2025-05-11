import { Stack, useRouter } from "expo-router";
import AnimatedSplash from "@/components/AnimatedSplash";
import { useState, useEffect } from "react";
import * as SecureStore from 'expo-secure-store';
import ToastProvider from "@/components/Toast/ToastProvider";

export default function RootLayout() {
  const [isSplashReady, setIsSplashReady] = useState(false);
  const [hasToken, setHasToken] = useState<boolean | null>(null); // null while checking
  const router = useRouter();

  useEffect(() => {
    const checkAuthToken = async () => {
      try {
        const token = await SecureStore.getItemAsync('token');
        setHasToken(!!token);
      } catch (error) {
        console.error('Error checking auth token:', error);
        setHasToken(false);
      }
    };

    checkAuthToken();
  }, []);

  useEffect(() => {
    if (isSplashReady && hasToken !== null) {
      // Navigate based on token presence
      if (!hasToken) {
        router.replace('/auth/login');
      } else {
        router.replace('/');
      }
    }
  }, [isSplashReady, hasToken]);

  if (!isSplashReady) {
    return <AnimatedSplash onFinish={() => setIsSplashReady(true)} />;
  }

  // Return empty fragment while checking auth state
  if (hasToken === null) {
    return null;
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
        <Stack.Screen name="premium/manage" options={{ headerShown: false }} />
        <Stack.Screen name="premium/subscribe" options={{ headerShown: false }} />
        <Stack.Screen name="premium/invoices" options={{ headerShown: false }} />
        <Stack.Screen name="premium/payment" options={{ headerShown: false }} />
        <Stack.Screen name="premium/change-plan" options={{ headerShown: false }} />
        <Stack.Screen name="(pages)/security" options={{ headerShown: false }} />
        <Stack.Screen name="(pages)/help" options={{ headerShown: false }} />
      </Stack>
    </ToastProvider>
  );
}