import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ScanHistoryProvider, useScanHistory } from "@/providers/ScanHistoryProvider";
import { SettingsProvider } from "@/providers/SettingsProvider";
import { SubscriptionProvider } from "@/providers/SubscriptionProvider";
import { FridgeProvider, useFridge } from "@/providers/FridgeProvider";
import { MealTrackerProvider } from "@/providers/MealTrackerProvider";
import { LeafBuddyProvider } from "@/providers/LeafBuddyProvider";
import GlobalLeafBuddy from "@/components/GlobalLeafBuddy";
import { LinearGradient } from 'expo-linear-gradient';
import { View } from 'react-native';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function ConnectProviders() {
  const { setFridgeRemover } = useScanHistory();
  const { removeFromFridge } = useFridge();

  useEffect(() => {
    setFridgeRemover(removeFromFridge);
  }, [setFridgeRemover, removeFromFridge]);

  return null;
}

function RootLayoutNav() {
  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={['#f0fff4', '#e6fff0', '#dcfce7']}
        style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
      />
      <ConnectProviders />
      <Stack screenOptions={{ headerBackTitle: "Back" }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen 
        name="scanner" 
        options={{ 
          presentation: "fullScreenModal",
          headerShown: false,
        }} 
      />
      <Stack.Screen 
        name="product/[barcode]" 
        options={{ 
          headerShown: false,
        }} 
      />
      <Stack.Screen 
        name="greens" 
        options={{ 
          headerShown: false,
        }} 
      />
      <Stack.Screen 
        name="additives" 
        options={{ 
          headerShown: false,
        }} 
      />
      <Stack.Screen 
        name="paywall" 
        options={{ 
          presentation: "fullScreenModal",
          headerShown: false,
        }} 
      />
      </Stack>
      <GlobalLeafBuddy />
    </View>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SubscriptionProvider>
          <SettingsProvider>
            <ScanHistoryProvider>
              <FridgeProvider>
                <MealTrackerProvider>
                  <LeafBuddyProvider>
                    <RootLayoutNav />
                  </LeafBuddyProvider>
                </MealTrackerProvider>
              </FridgeProvider>
            </ScanHistoryProvider>
          </SettingsProvider>
        </SubscriptionProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
