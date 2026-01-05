import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Sparkles, Calendar, ChefHat, Zap } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';
import { useSubscription } from '@/providers/SubscriptionProvider';

export default function MealPlansTab() {
  const router = useRouter();
  const { isPremium } = useSubscription();

  if (!isPremium) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[Colors.primary, Colors.primaryDark]}
          style={styles.headerGradient}
        />
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.paywallContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.paywallHero}>
              <View style={styles.paywallIconContainer}>
                <Calendar color="#FFFFFF" size={64} />
              </View>
              <Text style={styles.paywallTitle}>Unlock Meal Ideas</Text>
              <Text style={styles.paywallSubtitle}>
                Get AI-powered meal suggestions based on your fridge contents
              </Text>
            </View>

            <View style={styles.paywallFeatures}>
              <View style={styles.paywallFeature}>
                <View style={styles.paywallFeatureIcon}>
                  <ChefHat color={Colors.primary} size={28} />
                </View>
                <View style={styles.paywallFeatureContent}>
                  <Text style={styles.paywallFeatureTitle}>Smart Recipes</Text>
                  <Text style={styles.paywallFeatureDescription}>
                    Get personalized recipe suggestions using your ingredients
                  </Text>
                </View>
              </View>

              <View style={styles.paywallFeature}>
                <View style={styles.paywallFeatureIcon}>
                  <Sparkles color={Colors.warning} size={28} />
                </View>
                <View style={styles.paywallFeatureContent}>
                  <Text style={styles.paywallFeatureTitle}>AI-Powered</Text>
                  <Text style={styles.paywallFeatureDescription}>
                    Advanced AI creates healthy meals you&apos;ll love
                  </Text>
                </View>
              </View>

              <View style={styles.paywallFeature}>
                <View style={styles.paywallFeatureIcon}>
                  <Zap color={Colors.success} size={28} />
                </View>
                <View style={styles.paywallFeatureContent}>
                  <Text style={styles.paywallFeatureTitle}>Reduce Waste</Text>
                  <Text style={styles.paywallFeatureDescription}>
                    Use what you have and minimize food waste
                  </Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={styles.paywallButton}
              onPress={() => router.push('/paywall' as any)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[Colors.primary, Colors.primaryDark]}
                style={styles.paywallButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.paywallButtonText}>Upgrade to Premium</Text>
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  return <View style={styles.container} />;
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
    height: 300,
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  paywallContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 32,
  },
  paywallHero: {
    alignItems: 'center',
    marginBottom: 48,
  },
  paywallIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  paywallTitle: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
  },
  paywallSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 22,
  },
  paywallFeatures: {
    marginBottom: 32,
  },
  paywallFeature: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  paywallFeatureIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  paywallFeatureContent: {
    flex: 1,
    justifyContent: 'center',
  },
  paywallFeatureTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  paywallFeatureDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  paywallButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  paywallButtonGradient: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  paywallButtonText: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
});
