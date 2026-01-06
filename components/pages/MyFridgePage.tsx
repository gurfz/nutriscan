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
  Modal,
} from 'react-native';
import { useRouter, Href } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Refrigerator, TrendingUp, ChefHat, X, Sparkles, Clock, AlertCircle } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useFridge } from '@/providers/FridgeProvider';
import { useSubscription } from '@/providers/SubscriptionProvider';
import { getHealthScoreColor } from '@/types/product';
import CircularProgress from '@/components/CircularProgress';
import { generateText } from '@rork-ai/toolkit-sdk';

interface MealIdea {
  name: string;
  description: string;
  ingredients: string[];
  missingIngredients: string[];
  cookTime: string;
  difficulty: string;
  healthScore?: number;
}

interface Recipe {
  mealName: string;
  servings: number;
  prepTime: string;
  cookTime: string;
  ingredients: { item: string; amount: string }[];
  instructions: string[];
  tips?: string[];
}

export default function MyFridgePage() {
  const router = useRouter();
  const { fridgeItems, removeFromFridge } = useFridge();
  const { isPremium } = useSubscription();
  const [activeSection, setActiveSection] = useState<'insights' | 'meals'>('insights');
  const [mealIdeas, setMealIdeas] = useState<MealIdea[]>([]);
  const [isGeneratingMeals, setIsGeneratingMeals] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<MealIdea | null>(null);
  const [generatedRecipe, setGeneratedRecipe] = useState<Recipe | null>(null);
  const [isGeneratingRecipe, setIsGeneratingRecipe] = useState(false);
  const fridgeAnim = React.useRef(new Animated.Value(0)).current;

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
        
        const mealsWithScores = meals.map(meal => {
          const matchingProducts = fridgeItems.filter(item => {
            const itemName = item.name.toLowerCase();
            const itemBrand = item.brand.toLowerCase();
            return meal.ingredients.some(ing => {
              const ingLower = ing.toLowerCase();
              return ingLower.includes(itemName) || itemName.includes(ingLower) || ingLower.includes(itemBrand);
            });
          });
          
          const healthScore = matchingProducts.length > 0
            ? Math.round(matchingProducts.reduce((sum, p) => sum + p.healthScore, 0) / matchingProducts.length)
            : 75;
          
          return { ...meal, healthScore };
        });
        
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
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Fridge</Text>
          <Text style={styles.subtitle}>{fridgeItems.length} items</Text>
        </View>

        <Animated.View style={[styles.fridgeContainer, { transform: [{ translateY }] }]}>
          <View style={styles.fridgeOuter}>
            <LinearGradient
              colors={['#B0BEC5', '#90A4AE']}
              style={styles.fridgeTop}
            >
              <View style={styles.fridgeTopShine} />
              <View style={styles.fridgeDisplay}>
                <View style={styles.fridgeDisplayDot} />
                <View style={[styles.fridgeDisplayDot, { backgroundColor: '#4CAF50' }]} />
                <View style={[styles.fridgeDisplayDot, { opacity: 0.3 }]} />
              </View>
            </LinearGradient>
            
            <LinearGradient
              colors={['#ECEFF1', '#CFD8DC']}
              style={styles.fridgeBody}
            >
              <View style={styles.fridgeDoor}>
                <LinearGradient
                  colors={['#FAFAFA', '#F5F5F5', '#EEEEEE']}
                  style={styles.fridgeDoorFrame}
                >
                  <View style={styles.fridgeHandle}>
                    <View style={styles.fridgeHandleInner} />
                  </View>
                  
                  <View style={styles.fridgeDoorInner}>
                    <View style={styles.fridgeShelves}>
                      <ScrollView
                        style={styles.fridgeItemsScroll}
                        contentContainerStyle={styles.fridgeItemsContainer}
                        showsVerticalScrollIndicator={false}
                      >
                        {fridgeItems.map((item, index) => (
                          <View key={item.barcode} style={styles.fridgeItemBar}>
                            <View style={styles.dragHandle}>
                              <View style={styles.dragLine} />
                              <View style={styles.dragLine} />
                              <View style={styles.dragLine} />
                            </View>
                            <Image source={{ uri: item.imageUrl }} style={styles.fridgeItemImage} />
                            <View style={styles.fridgeItemInfo}>
                              <Text style={styles.fridgeItemName} numberOfLines={1}>
                                {item.name}
                              </Text>
                              <Text style={styles.fridgeItemBrand} numberOfLines={1}>
                                {item.brand}
                              </Text>
                            </View>
                            <View style={[styles.fridgeItemScore, { backgroundColor: getHealthScoreColor(item.healthScore) + '20' }]}>
                              <Text style={[styles.fridgeItemScoreText, { color: getHealthScoreColor(item.healthScore) }]}>
                                {item.healthScore}
                              </Text>
                            </View>
                            <TouchableOpacity
                              style={styles.fridgeItemRemove}
                              onPress={() => removeFromFridge(item.barcode)}
                            >
                              <X color={Colors.danger} size={16} />
                            </TouchableOpacity>
                          </View>
                        ))}
                      </ScrollView>
                    </View>
                  </View>
                </LinearGradient>
              </View>
            </LinearGradient>
            
            <LinearGradient
              colors={['#90A4AE', '#78909C']}
              style={styles.fridgeBottom}
            >
              <View style={styles.fridgeFoot} />
              <View style={styles.fridgeFoot} />
            </LinearGradient>
          </View>
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
                  mealIdeas.map((meal, index) => {
                    const mealHealthScore = meal.healthScore || 75;
                    const scoreColor = getHealthScoreColor(mealHealthScore);
                    return (
                    <TouchableOpacity
                      key={index}
                      style={styles.mealCard}
                      onPress={() => setSelectedMeal(meal)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.mealCardContent}>
                        <View style={styles.mealScoreCircle}>
                          <CircularProgress
                            size={56}
                            strokeWidth={4}
                            progress={mealHealthScore}
                            color={scoreColor}
                            backgroundColor={scoreColor + '20'}
                          >
                            <Text style={[styles.mealScoreText, { color: scoreColor }]}>{mealHealthScore}</Text>
                          </CircularProgress>
                        </View>
                        <View style={styles.mealContent}>
                          <Text style={styles.mealName}>{meal.name}</Text>
                          <Text style={styles.mealDescription} numberOfLines={2}>{meal.description}</Text>
                          <View style={styles.mealMeta}>
                            <View style={styles.mealMetaItem}>
                              <Clock color={Colors.textSecondary} size={12} />
                              <Text style={styles.mealMetaText}>{meal.cookTime}</Text>
                            </View>
                            <Text style={styles.mealMetaDivider}>•</Text>
                            <Text style={styles.mealMetaText}>{meal.difficulty}</Text>
                          </View>
                        </View>
                      </View>
                    </TouchableOpacity>
                    );
                  })
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

      <Modal
        visible={selectedMeal !== null}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setSelectedMeal(null);
          setGeneratedRecipe(null);
          setIsGeneratingRecipe(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedMeal?.name}</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => {
                  setSelectedMeal(null);
                  setGeneratedRecipe(null);
                  setIsGeneratingRecipe(false);
                }}
              >
                <X color={Colors.textSecondary} size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalScrollView}
              showsVerticalScrollIndicator={false}
            >
              {selectedMeal && (
                <View style={styles.modalContent}>
                  <View style={styles.mealDetailMeta}>
                    <View style={styles.mealDetailMetaItem}>
                      <Clock color={Colors.primary} size={20} />
                      <Text style={styles.mealDetailMetaText}>{selectedMeal.cookTime}</Text>
                    </View>
                    <View style={styles.mealDetailMetaItem}>
                      <TrendingUp color={Colors.secondary} size={20} />
                      <Text style={styles.mealDetailMetaText}>{selectedMeal.difficulty}</Text>
                    </View>
                  </View>

                  <Text style={styles.mealDetailDescription}>{selectedMeal.description}</Text>

                  <View style={styles.mealDetailSection}>
                    <View style={styles.mealDetailSectionHeader}>
                      <Refrigerator color={Colors.success} size={20} />
                      <Text style={styles.mealDetailSectionTitle}>From Your Fridge</Text>
                    </View>
                    {selectedMeal.ingredients.map((ingredient, idx) => (
                      <View key={idx} style={styles.mealDetailIngredientItem}>
                        <View style={[styles.ingredientCheckmark, { backgroundColor: Colors.success }]} />
                        <Text style={styles.mealDetailIngredientText}>{ingredient}</Text>
                      </View>
                    ))}
                  </View>

                  {selectedMeal.missingIngredients.length > 0 && (
                    <View style={styles.mealDetailSection}>
                      <View style={styles.mealDetailSectionHeader}>
                        <AlertCircle color={Colors.warning} size={20} />
                        <Text style={styles.mealDetailSectionTitle}>You Might Need</Text>
                      </View>
                      {selectedMeal.missingIngredients.map((ingredient, idx) => (
                        <View key={idx} style={styles.mealDetailIngredientItem}>
                          <View style={[styles.ingredientCheckmark, { backgroundColor: Colors.warning }]} />
                          <Text style={[styles.mealDetailIngredientText, { color: Colors.textSecondary }]}>{ingredient}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {!generatedRecipe ? (
                    <TouchableOpacity
                      style={styles.generateRecipeButton}
                      onPress={async () => {
                        if (isGeneratingRecipe) return;
                        
                        setIsGeneratingRecipe(true);
                        try {
                          const prompt = `Create a detailed recipe for "${selectedMeal.name}".

Available ingredients: ${selectedMeal.ingredients.join(', ')}
Additional ingredients: ${selectedMeal.missingIngredients.join(', ') || 'none'}

Provide:
- Servings, prep time, cook time
- Ingredients list with amounts
- Step-by-step instructions
- Optional tips

Format as JSON:
{
  "mealName": "${selectedMeal.name}",
  "servings": 4,
  "prepTime": "15 minutes",
  "cookTime": "30 minutes",
  "ingredients": [{"item": "ingredient", "amount": "2 cups"}],
  "instructions": ["Step 1", "Step 2"],
  "tips": ["tip 1"]
}

Only return JSON.`;

                          const response = await generateText({ messages: [{ role: 'user', content: prompt }] });
                          const cleanedResponse = response.trim().replace(/```json\n?/g, '').replace(/```\n?/g, '');
                          const recipe = JSON.parse(cleanedResponse) as Recipe;
                          setGeneratedRecipe(recipe);
                        } catch (error) {
                          console.error('[Recipe] Failed:', error);
                        } finally {
                          setIsGeneratingRecipe(false);
                        }
                      }}
                      activeOpacity={0.7}
                      disabled={isGeneratingRecipe}
                    >
                      {isGeneratingRecipe ? (
                        <>
                          <ActivityIndicator size="small" color="#FFFFFF" />
                          <Text style={styles.generateRecipeButtonText}>Generating...</Text>
                        </>
                      ) : (
                        <>
                          <ChefHat color="#FFFFFF" size={20} />
                          <Text style={styles.generateRecipeButtonText}>Generate Recipe</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.recipeContainer}>
                      <View style={styles.recipeDivider}>
                        <View style={styles.recipeDividerLine} />
                        <Text style={styles.recipeDividerText}>FULL RECIPE</Text>
                        <View style={styles.recipeDividerLine} />
                      </View>

                      <View style={styles.recipeMetaRow}>
                        <View style={styles.recipeMetaItem}>
                          <Text style={styles.recipeMetaLabel}>Servings</Text>
                          <Text style={styles.recipeMetaValue}>{generatedRecipe.servings}</Text>
                        </View>
                        <View style={styles.recipeMetaItem}>
                          <Text style={styles.recipeMetaLabel}>Prep</Text>
                          <Text style={styles.recipeMetaValue}>{generatedRecipe.prepTime}</Text>
                        </View>
                        <View style={styles.recipeMetaItem}>
                          <Text style={styles.recipeMetaLabel}>Cook</Text>
                          <Text style={styles.recipeMetaValue}>{generatedRecipe.cookTime}</Text>
                        </View>
                      </View>

                      <View style={styles.recipeSection}>
                        <Text style={styles.recipeSectionTitle}>Ingredients</Text>
                        {generatedRecipe.ingredients.map((ingredient, idx) => (
                          <View key={idx} style={styles.recipeIngredientItem}>
                            <View style={styles.recipeIngredientBullet} />
                            <Text style={styles.recipeIngredientAmount}>{ingredient.amount}</Text>
                            <Text style={styles.recipeIngredientName}>{ingredient.item}</Text>
                          </View>
                        ))}
                      </View>

                      <View style={styles.recipeSection}>
                        <Text style={styles.recipeSectionTitle}>Instructions</Text>
                        {generatedRecipe.instructions.map((instruction, idx) => (
                          <View key={idx} style={styles.recipeInstructionItem}>
                            <View style={styles.recipeInstructionNumber}>
                              <Text style={styles.recipeInstructionNumberText}>{idx + 1}</Text>
                            </View>
                            <Text style={styles.recipeInstructionText}>{instruction}</Text>
                          </View>
                        ))}
                      </View>

                      {generatedRecipe.tips && generatedRecipe.tips.length > 0 && (
                        <View style={styles.recipeTipsSection}>
                          <View style={styles.recipeTipsHeader}>
                            <Sparkles color={Colors.primary} size={18} />
                            <Text style={styles.recipeTipsTitle}>Pro Tips</Text>
                          </View>
                          {generatedRecipe.tips.map((tip, idx) => (
                            <Text key={idx} style={styles.recipeTipText}>• {tip}</Text>
                          ))}
                        </View>
                      )}
                    </View>
                  )}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    paddingTop: 64,
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
  fridgeOuter: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 16,
  },
  fridgeTop: {
    height: 40,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    justifyContent: 'space-between',
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: 20,
    borderWidth: 3,
    borderBottomWidth: 0,
    borderColor: '#90A4AE',
  },
  fridgeTopShine: {
    position: 'absolute',
    top: 6,
    left: '15%',
    width: '70%',
    height: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 5,
  },
  fridgeDisplay: {
    flexDirection: 'row',
    gap: 6,
    zIndex: 1,
  },
  fridgeDisplayDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF5252',
    shadowColor: '#FF5252',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
  },
  fridgeBody: {
    minHeight: 420,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderLeftWidth: 3,
    borderRightWidth: 3,
    borderColor: '#B0BEC5',
  },
  fridgeDoor: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  fridgeDoorFrame: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  fridgeDoorInner: {
    flex: 1,
    padding: 16,
  },
  fridgeShelves: {
    flex: 1,
  },
  fridgeHandle: {
    position: 'absolute',
    right: -2,
    top: '40%',
    width: 16,
    height: 120,
    backgroundColor: '#9E9E9E',
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
    marginTop: -60,
    shadowColor: '#000',
    shadowOffset: { width: -3, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 8,
    zIndex: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderRightWidth: 0,
    borderColor: '#757575',
  },
  fridgeHandleInner: {
    width: 4,
    height: 80,
    backgroundColor: '#BDBDBD',
    borderRadius: 2,
  },
  fridgeItemsScroll: {
    flex: 1,
  },
  fridgeItemsContainer: {
    gap: 8,
  },
  fridgeItemBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  dragHandle: {
    width: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    gap: 2,
  },
  dragLine: {
    width: 16,
    height: 2,
    backgroundColor: Colors.textMuted,
    borderRadius: 1,
    opacity: 0.4,
  },
  fridgeItemImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: Colors.surfaceSecondary,
  },
  fridgeItemInfo: {
    flex: 1,
    marginLeft: 10,
    marginRight: 8,
  },
  fridgeItemName: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 2,
  },
  fridgeItemBrand: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  fridgeItemScore: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 4,
  },
  fridgeItemScoreText: {
    fontSize: 12,
    fontWeight: '700' as const,
  },
  fridgeItemRemove: {
    padding: 6,
  },
  fridgeBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 60,
    paddingVertical: 12,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    borderWidth: 3,
    borderTopWidth: 0,
    borderColor: '#90A4AE',
  },
  fridgeFoot: {
    width: 70,
    height: 20,
    backgroundColor: '#546E7A',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 2,
    borderColor: '#37474F',
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
  mealCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mealScoreCircle: {
    marginRight: 12,
  },
  mealContent: {
    flex: 1,
  },
  mealMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  mealMetaDivider: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.text,
    flex: 1,
  },
  modalCloseButton: {
    padding: 8,
  },
  modalScrollView: {
    maxHeight: '100%',
  },
  modalContent: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  mealDetailMeta: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 16,
    marginBottom: 16,
  },
  mealDetailMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  mealDetailMetaText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  mealDetailDescription: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: 24,
  },
  mealDetailSection: {
    marginBottom: 24,
  },
  mealDetailSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  mealDetailSectionTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  mealDetailIngredientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 10,
  },
  ingredientCheckmark: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  mealDetailIngredientText: {
    fontSize: 14,
    color: Colors.text,
    flex: 1,
  },
  generateRecipeButton: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 16,
    gap: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  generateRecipeButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  recipeContainer: {
    marginTop: 24,
  },
  recipeDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 12,
  },
  recipeDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  recipeDividerText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.textSecondary,
    letterSpacing: 1,
  },
  recipeMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  recipeMetaItem: {
    alignItems: 'center',
    gap: 4,
  },
  recipeMetaLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  recipeMetaValue: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  recipeSection: {
    marginBottom: 24,
  },
  recipeSectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 12,
  },
  recipeIngredientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  recipeIngredientBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
  },
  recipeIngredientAmount: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.primary,
    minWidth: 80,
  },
  recipeIngredientName: {
    fontSize: 14,
    color: Colors.text,
    flex: 1,
  },
  recipeInstructionItem: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 12,
  },
  recipeInstructionNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recipeInstructionNumberText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.primary,
  },
  recipeInstructionText: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    lineHeight: 22,
  },
  recipeTipsSection: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  recipeTipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  recipeTipsTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.primary,
  },
  recipeTipText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
    marginBottom: 6,
  },
});
