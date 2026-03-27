import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Check, Sparkles, Zap, Shield } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';
import { useSubscription } from '@/providers/SubscriptionProvider';

export default function PaywallScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ returnTo?: string }>();
  const { offerings, purchase, isPurchasing, restore, isRestoring, scansRemaining } = useSubscription();
  const [selectedPackage, setSelectedPackage] = useState<string>('$rc_monthly');

  const handlePurchase = async () => {
    try {
      await purchase(selectedPackage);
      Alert.alert('Success!', 'Welcome to NutriScan Premium!', [
        { text: 'Start Scanning', onPress: () => router.back() }
      ]);
    } catch (err: any) {
      if (!err.userCancelled) {
        Alert.alert('Purchase Failed', 'Unable to complete purchase. Please try again.');
      }
    }
  };

  const handleRestore = async () => {
    try {
      await restore();
      Alert.alert('Restored!', 'Your purchases have been restored.', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch {
      Alert.alert('Restore Failed', 'No purchases found to restore.');
    }
  };

  const monthlyPackage = offerings?.current?.availablePackages.find(
    (pkg) => pkg.identifier === '$rc_monthly'
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[Colors.primary, Colors.primaryDark]}
        style={styles.headerGradient}
      />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => {
              if (params.returnTo === 'insights') {
                router.replace('/(tabs)' as any);
              } else {
                router.back();
              }
            }}
            testID="close-paywall"
          >
            <X color="#FFFFFF" size={24} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.heroSection}>
            <View style={styles.iconContainer}>
              <Sparkles color="#FFFFFF" size={48} />
            </View>
            <Text style={styles.title}>Unlock Unlimited Scans</Text>
            <Text style={styles.subtitle}>
              You&apos;ve used {5 - scansRemaining} of your 5 free daily scans
            </Text>
          </View>

          <View style={styles.featuresSection}>
            <View style={styles.featureRow}>
              <View style={styles.featureIcon}>
                <Zap color={Colors.warning} size={24} />
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>Unlimited Scans</Text>
                <Text style={styles.featureDescription}>
                  Scan as many products as you want, every day
                </Text>
              </View>
            </View>

            <View style={styles.featureRow}>
              <View style={styles.featureIcon}>
                <Shield color={Colors.primary} size={24} />
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>Advanced Analysis</Text>
                <Text style={styles.featureDescription}>
                  Get detailed health insights and recommendations
                </Text>
              </View>
            </View>

            <View style={styles.featureRow}>
              <View style={styles.featureIcon}>
                <Check color={Colors.success} size={24} />
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>No Ads</Text>
                <Text style={styles.featureDescription}>
                  Enjoy an ad-free experience
                </Text>
              </View>
            </View>
          </View>

          {monthlyPackage && (
            <View style={styles.pricingSection}>
              <TouchableOpacity
                style={[styles.packageCard, styles.packageCardSelected]}
                onPress={() => setSelectedPackage('$rc_monthly')}
                activeOpacity={0.8}
              >
                <View style={styles.packageHeader}>
                  <Text style={styles.packageTitle}>Monthly Premium</Text>
                  <View style={styles.popularBadge}>
                    <Text style={styles.popularText}>POPULAR</Text>
                  </View>
                </View>
                <Text style={styles.packagePrice}>
                  {monthlyPackage.product.priceString}/month
                </Text>
                <Text style={styles.packageDescription}>
                  Cancel anytime
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity
            style={[styles.subscribeButton, isPurchasing && styles.subscribeButtonDisabled]}
            onPress={handlePurchase}
            disabled={isPurchasing}
          >
            <LinearGradient
              colors={['#FFFFFF', '#F0F0F0']}
              style={styles.subscribeButtonGradient}
            >
              {isPurchasing ? (
                <ActivityIndicator color={Colors.primary} />
              ) : (
                <Text style={styles.subscribeButtonText}>Subscribe</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.restoreButton}
            onPress={handleRestore}
            disabled={isRestoring}
          >
            <Text style={styles.restoreButtonText}>
              {isRestoring ? 'Restoring...' : 'Restore Purchases'}
            </Text>
          </TouchableOpacity>

          <Text style={styles.disclaimer}>
            Subscription automatically renews unless auto-renew is turned off at least 24 hours before the end of the current period.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 400,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 60,
    alignItems: 'flex-end',
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  heroSection: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 24,
    paddingBottom: 40,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 22,
  },
  featuresSection: {
    backgroundColor: Colors.surface,
    marginHorizontal: 24,
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  featureContent: {
    flex: 1,
    paddingTop: 4,
  },
  featureTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  pricingSection: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  packageCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  packageCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  packageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  packageTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  popularBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  popularText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  packagePrice: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.primary,
    marginBottom: 4,
  },
  packageDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  subscribeButton: {
    marginHorizontal: 24,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  subscribeButtonDisabled: {
    opacity: 0.6,
  },
  subscribeButtonGradient: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  subscribeButtonText: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.primary,
  },
  restoreButton: {
    marginHorizontal: 24,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  restoreButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  disclaimer: {
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 32,
  },
});
