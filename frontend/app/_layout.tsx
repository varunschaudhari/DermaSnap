import { Stack } from 'expo-router';
import { useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { AuthProvider } from '../contexts/AuthContext';

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const router = useRouter();
  
  useEffect(() => {
    // Hide splash screen after app is ready
    setTimeout(() => {
      SplashScreen.hideAsync();
    }, 1000);
  }, []);

  return (
    <AuthProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="auth/login" options={{ headerShown: false }} />
        <Stack.Screen name="auth/register" options={{ headerShown: false }} />
        <Stack.Screen name="profiles" options={{ headerShown: false }} />
        <Stack.Screen name="doctor/index" options={{ headerShown: false }} />
        <Stack.Screen name="admin/index" options={{ headerShown: false }} />
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="camera" options={{ headerShown: false }} />
        <Stack.Screen name="processing" options={{ headerShown: false }} />
        <Stack.Screen name="results" options={{ headerShown: false }} />
        <Stack.Screen name="history" options={{ headerShown: false }} />
        <Stack.Screen name="profile-detail" options={{ headerShown: false }} />
        <Stack.Screen name="progress" options={{ headerShown: false }} />
        <Stack.Screen name="treatments" options={{ headerShown: false }} />
        <Stack.Screen name="comparison" options={{ headerShown: false }} />
        <Stack.Screen name="relationships" options={{ headerShown: false }} />
      </Stack>
    </AuthProvider>
  );
}