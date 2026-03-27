import { Platform } from 'react-native';
import createContextHook from '@nkzw/create-context-hook';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, useCallback } from 'react';
import Purchases from 'react-native-purchases';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SCAN_COUNT_KEY = 'daily_scan_count';
const LAST_RESET_KEY = 'last_scan_reset';
const FREE_SCANS_PER_DAY = 5;

function getRCToken() {
  if (__DEV__ || Platform.OS === 'web') {
    return process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY;
  }
  return Platform.select({
    ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY,
    android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY,
    default: process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY,
  });
}

const apiKey = getRCToken();
if (apiKey) {
  Purchases.configure({ apiKey });
  console.log('[RevenueCat] Configured with API key');
}

export const [SubscriptionProvider, useSubscription] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [scanCount, setScanCount] = useState<number>(0);
  const [isPremium, setIsPremium] = useState<boolean>(false);

  const customerInfoQuery = useQuery({
    queryKey: ['customerInfo'],
    queryFn: async () => {
      try {
        console.log('[RevenueCat] Fetching customer info...');
        const info = await Purchases.getCustomerInfo();
        console.log('[RevenueCat] Customer info:', info.entitlements.active);
        return info;
      } catch (error) {
        console.error('[RevenueCat] Error fetching customer info:', error);
        return null;
      }
    },
  });

  const offeringsQuery = useQuery({
    queryKey: ['offerings'],
    queryFn: async () => {
      try {
        console.log('[RevenueCat] Fetching offerings...');
        const offerings = await Purchases.getOfferings();
        console.log('[RevenueCat] Offerings:', offerings.current);
        return offerings;
      } catch (error) {
        console.error('[RevenueCat] Error fetching offerings:', error);
        return null;
      }
    },
  });

  const scanCountQuery = useQuery({
    queryKey: ['scanCount'],
    queryFn: async () => {
      const today = new Date().toDateString();
      const lastReset = await AsyncStorage.getItem(LAST_RESET_KEY);
      
      if (lastReset !== today) {
        console.log('[Subscription] Resetting daily scan count');
        await AsyncStorage.setItem(LAST_RESET_KEY, today);
        await AsyncStorage.setItem(SCAN_COUNT_KEY, '0');
        return 0;
      }

      const stored = await AsyncStorage.getItem(SCAN_COUNT_KEY);
      const count = stored ? parseInt(stored, 10) : 0;
      console.log('[Subscription] Current scan count:', count);
      return count;
    },
  });

  useEffect(() => {
    if (customerInfoQuery.data) {
      const hasProEntitlement = customerInfoQuery.data.entitlements.active['nutriscan Pro'] !== undefined;
      setIsPremium(hasProEntitlement);
      console.log('[Subscription] Premium status:', hasProEntitlement);
    }
  }, [customerInfoQuery.data]);

  useEffect(() => {
    if (scanCountQuery.data !== undefined) {
      setScanCount(scanCountQuery.data);
    }
  }, [scanCountQuery.data]);

  const purchaseMutation = useMutation({
    mutationFn: async (packageToPurchase: string) => {
      console.log('[RevenueCat] Starting purchase...');
      const offerings = offeringsQuery.data;
      if (!offerings?.current) {
        throw new Error('No offerings available');
      }

      const pkg = offerings.current.availablePackages.find(
        (p) => p.identifier === packageToPurchase
      );

      if (!pkg) {
        throw new Error('Package not found');
      }

      const { customerInfo } = await Purchases.purchasePackage(pkg);
      console.log('[RevenueCat] Purchase successful');
      return customerInfo;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customerInfo'] });
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async () => {
      console.log('[RevenueCat] Restoring purchases...');
      const customerInfo = await Purchases.restorePurchases();
      console.log('[RevenueCat] Restore successful');
      return customerInfo;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customerInfo'] });
    },
  });

  const incrementScanCount = useCallback(async () => {
    const newCount = scanCount + 1;
    setScanCount(newCount);
    await AsyncStorage.setItem(SCAN_COUNT_KEY, newCount.toString());
    console.log('[Subscription] Incremented scan count to:', newCount);
    queryClient.invalidateQueries({ queryKey: ['scanCount'] });
  }, [scanCount, queryClient]);

  const canScan = isPremium || scanCount < FREE_SCANS_PER_DAY;
  const scansRemaining = isPremium ? Infinity : Math.max(0, FREE_SCANS_PER_DAY - scanCount);

  return {
    isPremium,
    canScan,
    scanCount,
    scansRemaining,
    incrementScanCount,
    offerings: offeringsQuery.data,
    isLoading: customerInfoQuery.isLoading || offeringsQuery.isLoading || scanCountQuery.isLoading,
    purchase: purchaseMutation.mutate,
    isPurchasing: purchaseMutation.isPending,
    restore: restoreMutation.mutate,
    isRestoring: restoreMutation.isPending,
  };
});
