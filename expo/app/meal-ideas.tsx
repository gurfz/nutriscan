import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, ChefHat, Clock, TrendingUp } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useFridge } from '@/providers/FridgeProvider';
import { useSubscription } from '@/providers/SubscriptionProvider';
import { generateText } from '@rork-ai/toolkit-sdk';

interface MealIdea {
  name: string;
  description: string;
  ingredients: string[];
  cookTime: string;
  difficulty: string;
}

export default function MealIdeasScreen() {
  const router = useRouter();
  const { fridgeItems } = useFridge();
  const { isPremium } = useSubscription();
  const [mealIdeas, setMealIdeas] = useState<MealIdea[]>([]);
  const [isGenerating, setIsGenerating] = useState(true);

  useEffect(() => {
    if (!isPremium) {
      console.log('[MealIdeas] Premium required, redirecting to paywall');
      router.replace({ pathname: '/paywall', params: { returnTo: 'insights' } } as any);
    }
  }, [isPremium, router]);

  useEffect(() => {
    const generate = async () => {
      if (!isPremium) {
        console.log('[MealIdeas] Premium required, skipping generation');
        setIsGenerating(false);
        return;
      }

      if (fridgeItems.length === 0) {
        setIsGenerating(false);
        return;
      }

      setIsGenerating(true);
      try {
        console.log('[MealIdeas] Generating meal ideas for', fridgeItems.length, 'items');
        
        const ingredientsList = fridgeItems
          .map(item => `${item.name} (${item.brand})`)
          .join(', ');

        const prompt = `Based ONLY on these food items from my fridge: ${ingredientsList}

Generate 5-7 creative meal ideas using ONLY these ingredients. Do not suggest ingredients that are not in this list. For each meal:
- Provide a creative name
- Brief description (1-2 sentences) using ONLY the listed ingredients
- List of main ingredients from my fridge that would be used
- Estimated cooking time
- Difficulty level (Easy/Medium/Hard)

Format the response as a JSON array of objects with this structure:
[
  {
    "name": "Meal Name",
    "description": "Brief description using only the available ingredients",
    "ingredients": ["ingredient1", "ingredient2"],
    "cookTime": "30 minutes",
    "difficulty": "Easy"
  }
]

Only return the JSON array, no additional text.`;

        const response = await generateText({ messages: [{ role: 'user', content: prompt }] });
        
        console.log('[MealIdeas] AI Response:', response);
        
        const cleanedResponse = response.trim().replace(/```json\n?/g, '').replace(/```\n?/g, '');
        const meals = JSON.parse(cleanedResponse) as MealIdea[];
        
        setMealIdeas(meals);
        console.log('[MealIdeas] Generated', meals.length, 'meal ideas');
      } catch (error) {
        console.error('[MealIdeas] Failed to generate meal ideas:', error);
        setMealIdeas([]);
      } finally {
        setIsGenerating(false);
      }
    };
    generate();
  }, [fridgeItems, isPremium]);



  const renderMealIdea = (meal: MealIdea, index: number) => (
    <View key={index} style={styles.mealCard}>
      <View style={styles.mealHeader}>
        <ChefHat color={Colors.primary} size={24} />
        <Text style={styles.mealName}>{meal.name}</Text>
      </View>
      <Text style={styles.mealDescription}>{meal.description}</Text>
      
      <View style={styles.mealMeta}>
        <View style={styles.metaBadge}>
          <Clock color={Colors.textSecondary} size={14} />
          <Text style={styles.metaBadgeText}>{meal.cookTime}</Text>
        </View>
        <View style={styles.metaBadge}>
          <TrendingUp color={Colors.textSecondary} size={14} />
          <Text style={styles.metaBadgeText}>{meal.difficulty}</Text>
        </View>
      </View>

      <View style={styles.ingredientsSection}>
        <Text style={styles.ingredientsSectionTitle}>From Your Fridge:</Text>
        {meal.ingredients.map((ingredient, idx) => (
          <View key={idx} style={styles.ingredientItem}>
            <View style={styles.ingredientBullet} />
            <Text style={styles.ingredientText}>{ingredient}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft color={Colors.text} size={24} />
          </TouchableOpacity>
          <Text style={styles.title}>AI Meal Ideas</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {isGenerating ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.loadingText}>Generating meal ideas...</Text>
              <Text style={styles.loadingSubtext}>
                Using only the {fridgeItems.length} items in your fridge
              </Text>
            </View>
          ) : mealIdeas.length > 0 ? (
            <>
              <Text style={styles.subtitle}>
                Here are {mealIdeas.length} meal ideas using only what you have in your fridge
              </Text>
              {mealIdeas.map((meal, index) => renderMealIdea(meal, index))}
            </>
          ) : (
            <View style={styles.emptyState}>
              <ChefHat color={Colors.textMuted} size={64} />
              <Text style={styles.emptyTitle}>No Meal Ideas</Text>
              <Text style={styles.emptyText}>
                Add more items to your fridge to get personalized meal suggestions
              </Text>
            </View>
          )}
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
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 20,
    lineHeight: 20,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
    marginTop: 8,
  },
  loadingSubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  mealCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  mealHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  mealName: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
    flex: 1,
  },
  mealDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  mealMeta: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceSecondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  metaBadgeText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  ingredientsSection: {
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingTop: 12,
  },
  ingredientsSectionTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  ingredientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  ingredientBullet: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.primary,
    marginRight: 8,
  },
  ingredientText: {
    fontSize: 14,
    color: Colors.text,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    gap: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 32,
  },
});
