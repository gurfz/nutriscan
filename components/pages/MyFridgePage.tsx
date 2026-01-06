import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { useRouter, Href } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Refrigerator, TrendingUp, ChefHat, X, Sparkles } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useFridge } from '@/providers/FridgeProvider';
import { useSubscription } from '@/providers/SubscriptionProvider';
import { getHealthScoreColor } from '@/types/product';
import { generateText } from '@rork-ai/toolkit-sdk';
import PageSwitcher from '@/components/PageSwitcher';

interface MealIdea {
  name: string;
  description: string;
  ingredients: string[];
  missingIngredients: string[];
  cookTime: string;
  difficulty: string;
  healthScore?: number;
}

export default function MyFridgePage() {
  const router = useRouter();
  const { fridgeItems, removeFromFridge } = useFridge();
  const { isPremium } = useSubscription();
  const [activeSection, setActiveSection] = useState<'insights' | 'meals'>('insights');
  const [mealIdeas, setMealIdeas] = useState<MealIdea[]>([]);
  const [isGeneratingMeals, setIsGeneratingMeals] = useState(false);
  const [fridgeItemPositions, setFridgeItemPositions] = useState<Record<string, { row: number; col: number }>>({});
  const fridgeAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setFridgeItemPositions(prev => {
      const positions: Record<string, { row: number; col: number }> = {};
      fridgeItems.forEach((item, index) => {
        if (prev[item.barcode]) {
          positions[item.barcode] = prev[item.barcode];
        } else {
          positions[item.barcode] = {
            row: Math.floor(index / 3),
            col: index % 3,
          };
        }
      });
      return positions;
    });
  }, [fridgeItems]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(fridgeAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(fridgeAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [fridgeAnim]);

  useEffect(() => {
    const generateMealIdeas = async () => {
      if (fridgeItems.length === 0 || !isPremium || activeSection !== 'meals') {
        return;
      }

      if (mealIdeas.length > 0) {
        return;
      }

      setIsGeneratingMeals(true);
      try {
        const ingredientsList = fridgeItems
          .map(item => `${item.name} (${item.brand})`)
          .join(', ');

        const prompt = `Based on these food items: ${ingredientsList}

Generate 4 creative meal ideas. Format as JSON array:
[
  {
    "name": "Meal Name",
    "description": "Brief description",
    "ingredients": ["ingredient1", "ingredient2"],
    "missingIngredients": ["salt", "olive oil"],
    "cookTime": "30 minutes",
    "difficulty": "Easy"
  }
]

Only return the JSON array.`;

        const response = await generateText({ messages: [{ role: 'user', content: prompt }] });
        const cleanedResponse = response.trim().replace(/```json\n?/g, '').replace(/```\n?/g, '');
        const meals = JSON.parse(cleanedResponse) as MealIdea[];
        
        const mealsWithScores = meals.map(meal => ({
          ...meal,
          healthScore: 80,
        }));
        
        setMealIdeas(mealsWithScores);
      } catch (error) {
        console.error('[MealIdeas] Failed:', error);
        setMealIdeas([]);
      } finally {
        setIsGeneratingMeals(false);
      }
    };
    generateMealIdeas();
  }, [fridgeItems, activeSection, mealIdeas.length, isPremium]);

  const avgScore = fridgeItems.length > 0
    ? Math.round(fridgeItems.reduce((sum, item) => sum + item.healthScore, 0) / fridgeItems.length)
    : 0;

  const healthyCount = fridgeItems.filter(item => item.healthScore >= 80).length;

  const handlePaywallPress = () => {
    router.push('/paywall' as Href);
  };

  const translateY = fridgeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -10],
  });

  if (!isPremium) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[Colors.primaryLight, Colors.background]}
          style={styles.headerGradient}
        />
        <PageSwitcher currentPage="fridge" />
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.paywallContainer}>
            <Animated.View style={[styles.fridgeIcon, { transform: [{ translateY }] }]}>
              <LinearGradient
                colors={[Colors.primary, Colors.primaryDark]}
                style={styles.fridgeIconGradient}
              >
                <Refrigerator color="#FFFFFF" size={64} />
              </LinearGradient>
            </Animated.View>

            <Text style={styles.paywallTitle}>Unlock My Fridge</Text>
            <Text style={styles.paywallDescription}>
              Track your fridge items, get AI-powered meal ideas, and receive health insights with NutriScan Premium
            </Text>

            <View style={styles.paywallFeatures}>
              <View style={styles.paywallFeature}>
                <View style={styles.paywallFeatureDot} />
                <Text style={styles.paywallFeatureText}>Organize your fridge items</Text>
              </View>
              <View style={styles.paywallFeature}>
                <View style={styles.paywallFeatureDot} />
                <Text style={styles.paywallFeatureText}>AI-powered meal suggestions</Text>
              </View>
              <View style={styles.paywallFeature}>
                <View style={styles.paywallFeatureDot} />
                <Text style={styles.paywallFeatureText}>Health insights & analytics</Text>
              </View>
              <View style={styles.paywallFeature}>
                <View style={styles.paywallFeatureDot} />
                <Text style={styles.paywallFeatureText}>Nutritional recommendations</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.paywallButton}
              onPress={handlePaywallPress}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={[Colors.primary, Colors.primaryDark]}
                style={styles.paywallButtonGradient}
              >
                <Text style={styles.paywallButtonText}>Subscribe Now</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[Colors.primaryLight, Colors.background]}
        style={styles.headerGradient}
      />
      <PageSwitcher currentPage="fridge" />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>My Fridge</Text>
          <Text style={styles.subtitle}>{fridgeItems.length} items</Text>
        </View>

        <Animated.View style={[styles.fridgeContainer, { transform: [{ translateY }] }]}>
          <LinearGradient
            colors={[Colors.surface, Colors.surfaceSecondary]}
            style={styles.fridgeBody}
          >
            <View style={styles.fridgeDoor}>
              <View style={styles.fridgeHandle} />
              <View style={styles.fridgeGrid}>
                {fridgeItems.slice(0, 12).map((item) => {
                  const pos = fridgeItemPositions[item.barcode] || { row: 0, col: 0 };
                  return (
                    <View
                      key={item.barcode}
                      style={[
                        styles.fridgeBox,
                        {
                          left: `${pos.col * 31 + 3}%`,
                          top: `${pos.row * 23 + 5}%`,
                        },
                      ]}
                    >
                      <View style={styles.boxInner}>
                        <Image source={{ uri: item.imageUrl }} style={styles.boxImage} />
                        <TouchableOpacity
                          style={styles.boxRemove}
                          onPress={() => removeFromFridge(item.barcode)}
                        >
                          <X color="#FFFFFF" size={10} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {fridgeItems.length === 0 && (
          <View style={styles.emptyState}>
            <Refrigerator color={Colors.textMuted} size={48} />
            <Text style={styles.emptyTitle}>Your Fridge is Empty</Text>
            <Text style={styles.emptyText}>
              Add items by scanning products and tapping the fridge icon
            </Text>
          </View>
        )}

        {fridgeItems.length > 0 && (
          <>
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tab, activeSection === 'insights' && styles.tabActive]}
                onPress={() => setActiveSection('insights')}
              >
                <TrendingUp color={activeSection === 'insights' ? Colors.primary : Colors.textSecondary} size={20} />
                <Text style={[styles.tabText, activeSection === 'insights' && styles.tabTextActive]}>
                  Insights
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeSection === 'meals' && styles.tabActive]}
                onPress={() => setActiveSection('meals')}
              >
                <ChefHat color={activeSection === 'meals' ? Colors.primary : Colors.textSecondary} size={20} />
                <Text style={[styles.tabText, activeSection === 'meals' && styles.tabTextActive]}>
                  Meal Ideas
                </Text>
              </TouchableOpacity>
            </View>

            {activeSection === 'insights' && (
              <View style={styles.insightsSection}>
                <View style={styles.insightCard}>
                  <View style={styles.insightHeader}>
                    <TrendingUp color={Colors.primary} size={24} />
                    <Text style={styles.insightTitle}>Average Health Score</Text>
                  </View>
                  <Text style={[styles.insightValue, { color: getHealthScoreColor(avgScore) }]}>
                    {avgScore}
                  </Text>
                  <Text style={styles.insightDescription}>
                    Overall health rating of your fridge items
                  </Text>
                </View>

                <View style={styles.insightCard}>
                  <View style={styles.insightHeader}>
                    <Sparkles color={Colors.success} size={24} />
                    <Text style={styles.insightTitle}>Healthy Foods</Text>
                  </View>
                  <Text style={[styles.insightValue, { color: Colors.success }]}>
                    {healthyCount}
                  </Text>
                  <Text style={styles.insightDescription}>
                    Items with health score 80+
                  </Text>
                </View>
              </View>
            )}

            {activeSection === 'meals' && (
              <View style={styles.mealsSection}>
                {isGeneratingMeals ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                    <Text style={styles.loadingText}>Generating meal ideas...</Text>
                  </View>
                ) : mealIdeas.length > 0 ? (
                  mealIdeas.map((meal, index) => (
                    <View key={index} style={styles.mealCard}>
                      <View style={styles.mealHeader}>
                        <Text style={styles.mealName}>{meal.name}</Text>
                        {meal.healthScore && (
                          <View style={[styles.mealScore, { backgroundColor: getHealthScoreColor(meal.healthScore) + '20' }]}>
                            <Text style={[styles.mealScoreText, { color: getHealthScoreColor(meal.healthScore) }]}>
                              {meal.healthScore}
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.mealDescription}>{meal.description}</Text>
                      <View style={styles.mealMeta}>
                        <Text style={styles.mealMetaText}>⏱️ {meal.cookTime}</Text>
                        <Text style={styles.mealMetaText}>📊 {meal.difficulty}</Text>
                      </View>
                    </View>
                  ))
                ) : (
                  <View style={styles.emptyMeals}>
                    <ChefHat color={Colors.textMuted} size={48} />
                    <Text style={styles.emptyMealsText}>No meal ideas yet</Text>
                  </View>
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>
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
    height: 300,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  fridgeContainer: {
    marginHorizontal: 24,
    marginBottom: 24,
  },
  fridgeBody: {
    borderRadius: 20,
    padding: 20,
    minHeight: 300,
  },
  fridgeDoor: {
    position: 'relative',
    flex: 1,
  },
  fridgeHandle: {
    position: 'absolute',
    right: 10,
    top: '50%',
    width: 8,
    height: 60,
    backgroundColor: Colors.border,
    borderRadius: 4,
    marginTop: -30,
  },
  fridgeGrid: {
    flex: 1,
    position: 'relative',
  },
  fridgeBox: {
    position: 'absolute',
    width: '28%',
    aspectRatio: 1,
  },
  boxInner: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.border,
    padding: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  boxImage: {
    width: '100%',
    height: '100%',
    borderRadius: 4,
  },
  boxRemove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.danger,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 24,
    marginBottom: 16,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: Colors.primaryLight,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: Colors.primary,
    fontWeight: '700' as const,
  },
  insightsSection: {
    paddingHorizontal: 24,
    gap: 16,
  },
  insightCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  insightValue: {
    fontSize: 48,
    fontWeight: '700' as const,
    marginBottom: 8,
  },
  insightDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  mealsSection: {
    paddingHorizontal: 24,
    gap: 12,
  },
  mealCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  mealName: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  mealScore: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  mealScoreText: {
    fontSize: 14,
    fontWeight: '700' as const,
  },
  mealDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 12,
    lineHeight: 20,
  },
  mealMeta: {
    flexDirection: 'row',
    gap: 16,
  },
  mealMetaText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  emptyMeals: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyMealsText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 48,
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  paywallContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 60,
  },
  fridgeIcon: {
    marginBottom: 32,
  },
  fridgeIconGradient: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  paywallTitle: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  paywallDescription: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  paywallFeatures: {
    width: '100%',
    marginBottom: 32,
  },
  paywallFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  paywallFeatureDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginRight: 12,
  },
  paywallFeatureText: {
    fontSize: 16,
    color: Colors.text,
  },
  paywallButton: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  paywallButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  paywallButtonText: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
});
