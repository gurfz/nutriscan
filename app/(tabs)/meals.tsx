import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Image,
  Modal,
  ActivityIndicator,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, Href } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Refrigerator, ChefHat, X, TrendingUp, AlertCircle, Award, Leaf, ShieldAlert, Info, Clock, Sparkles, Plus, Calendar, Coffee, Utensils, Moon, Apple, Droplets, ScanLine, Flame, Wheat, Dumbbell, RefreshCw, Minus, ShoppingCart, Type, ChevronDown, ChevronUp } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useFridge } from '@/providers/FridgeProvider';
import { useMealTracker, MealType } from '@/providers/MealTrackerProvider';
import { useSettings } from '@/providers/SettingsProvider';
import { useSubscription } from '@/providers/SubscriptionProvider';
import { Product } from '@/types/product';
import NutrientProgressBar from '@/components/NutrientProgressBar';
import CircularProgress from '@/components/CircularProgress';
import { generateText } from '@rork-ai/toolkit-sdk';
import { LinearGradient } from 'expo-linear-gradient';

function getLocalDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

interface FoodGroupItemProps {
  category: string;
  items: Product[];
  recommended: string;
}

function FoodGroupItem({ category, items, recommended }: FoodGroupItemProps) {
  const status = items.length === 0 ? 'missing' : items.length < 2 ? 'low' : 'good';
  const statusColor = status === 'missing' ? Colors.danger : status === 'low' ? Colors.warning : Colors.success;
  
  return (
    <View style={styles.foodGroupItem}>
      <View style={styles.foodGroupHeader}>
        <Text style={styles.foodGroupCategory}>{category}</Text>
        <View style={[styles.foodGroupStatus, { backgroundColor: statusColor + '20' }]}>
          <Text style={[styles.foodGroupStatusText, { color: statusColor }]}>
            {items.length} {items.length === 1 ? 'item' : 'items'}
          </Text>
        </View>
      </View>
      <Text style={styles.foodGroupRecommended}>Recommended: {recommended}</Text>
      {items.length === 0 && (
        <Text style={styles.foodGroupMissing}>No items in your fridge from this group</Text>
      )}
    </View>
  );
}

interface InsightModalData {
  type: 'healthyFoods' | 'additives' | 'lowScore' | 'avgScore' | 'nutritionalNeeds';
  title: string;
  items: Product[];
  stats: {
    avgScore: number;
    organicCount: number;
    totalAdditives: number;
    highScoreCount: number;
    lowScoreCount: number;
    healthyFoodsCount: number;
    healthyFoodsPercentage: number;
  };
}

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

type ActiveTab = 'insights' | 'meals' | 'tracker';

export default function MealsScreen() {
  const router = useRouter();
  const { fridgeItems, removeFromFridge, groceryList, addToGroceryList, removeFromGroceryList, isInGroceryList } = useFridge();
  const { addMeal, removeMeal, updateMealServings, getMealsForDateAndType, getDayStats, getPeriodStats, addWater, removeWater, getWaterForDate, calculateNutrientGoals } = useMealTracker();
  const { bodyweight, fitnessGoal } = useSettings();
  const { isPremium } = useSubscription();
  const [modalData, setModalData] = useState<InsightModalData | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('insights');
  const [mealIdeas, setMealIdeas] = useState<MealIdea[]>([]);
  const [isGeneratingMeals, setIsGeneratingMeals] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<MealIdea | null>(null);
  const [generatedRecipe, setGeneratedRecipe] = useState<Recipe | null>(null);
  const [isGeneratingRecipe, setIsGeneratingRecipe] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = getLocalDateString();
    console.log('[Meals] Initial date set to today:', today);
    return today;
  });

  useEffect(() => {
    if (activeTab === 'tracker') {
      const today = getLocalDateString();
      console.log('[Meals] Tracker opened, current date:', selectedDate, 'today:', today);
      if (selectedDate !== today) {
        setSelectedDate(today);
        console.log('[Meals] Updated date to today:', today);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);
  const [showAddMealModal, setShowAddMealModal] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState<MealType>('breakfast');
  const [trackerView, setTrackerView] = useState<'day' | 'week' | 'month'>('day');
  const [showGroceryListModal, setShowGroceryListModal] = useState(false);
  const [showManualEntryModal, setShowManualEntryModal] = useState(false);
  const [manualEntryText, setManualEntryText] = useState('');
  const [isProcessingManualEntry, setIsProcessingManualEntry] = useState(false);
  const [mealsExpanded, setMealsExpanded] = useState(false);
  const [waterExpanded, setWaterExpanded] = useState(false);



  const healthInsights = useMemo(() => {
    if (fridgeItems.length === 0) return null;

    const avgScore = Math.round(
      fridgeItems.reduce((sum, item) => sum + item.healthScore, 0) / fridgeItems.length
    );
    const organicCount = fridgeItems.filter(item => item.isOrganic).length;
    const totalAdditives = fridgeItems.reduce((sum, item) => sum + (item.additives?.length || 0), 0);
    const highScoreCount = fridgeItems.filter(item => item.healthScore >= 80).length;
    const lowScoreCount = fridgeItems.filter(item => item.healthScore < 60).length;
    
    const healthyFoodsCount = fridgeItems.filter(item => item.healthScore >= 80).length;
    const healthyFoodsPercentage = Math.round((healthyFoodsCount / fridgeItems.length) * 100);

    const foodGroupsCount = [
      fridgeItems.filter(item => 
        item.category.toLowerCase().includes('fruit') || 
        item.category.toLowerCase().includes('vegetable') ||
        item.category.toLowerCase().includes('produce')
      ).length > 0,
      fridgeItems.filter(item => 
        item.category.toLowerCase().includes('grain') || 
        item.category.toLowerCase().includes('bread') ||
        item.category.toLowerCase().includes('cereal') ||
        item.category.toLowerCase().includes('pasta')
      ).length > 0,
      fridgeItems.filter(item => 
        item.category.toLowerCase().includes('meat') || 
        item.category.toLowerCase().includes('fish') ||
        item.category.toLowerCase().includes('poultry') ||
        item.category.toLowerCase().includes('eggs') ||
        item.category.toLowerCase().includes('beans')
      ).length > 0,
      fridgeItems.filter(item => 
        item.category.toLowerCase().includes('dairy') || 
        item.category.toLowerCase().includes('milk') ||
        item.category.toLowerCase().includes('cheese') ||
        item.category.toLowerCase().includes('yogurt')
      ).length > 0,
      fridgeItems.filter(item => 
        item.category.toLowerCase().includes('oil') || 
        item.category.toLowerCase().includes('fat') ||
        item.category.toLowerCase().includes('butter')
      ).length > 0,
    ].filter(Boolean).length;

    return {
      avgScore,
      organicCount,
      totalAdditives,
      highScoreCount,
      lowScoreCount,
      healthyFoodsCount,
      healthyFoodsPercentage,
      foodGroupsCount,
      items: fridgeItems,
    };
  }, [fridgeItems]);

  useEffect(() => {
    const generateMealIdeas = async () => {
      if (fridgeItems.length === 0 || activeTab !== 'meals') {
        return;
      }

      if (mealIdeas.length > 0) {
        return;
      }

      setIsGeneratingMeals(true);
      try {
        console.log('[MealIdeas] Generating meal ideas for', fridgeItems.length, 'items');
        
        const ingredientsList = fridgeItems
          .map(item => `${item.name} (${item.brand})`)
          .join(', ');

        const prompt = `Based on these food items from my fridge: ${ingredientsList}

Generate 6 creative meal ideas. For each meal:
- Provide a creative name
- Brief description (1-2 sentences)
- List of main ingredients from my fridge that would be used
- List any common ingredients that might be missing (like spices, oil, etc.) - keep this minimal
- Estimated cooking time
- Difficulty level (Easy/Medium/Hard)

Format the response as a JSON array of objects with this structure:
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

Only return the JSON array, no additional text.`;

        const response = await generateText({ messages: [{ role: 'user', content: prompt }] });
        
        console.log('[MealIdeas] AI Response:', response);
        
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
        console.log('[MealIdeas] Generated', meals.length, 'meal ideas');
      } catch (error) {
        console.error('[MealIdeas] Failed to generate meal ideas:', error);
        setMealIdeas([]);
      } finally {
        setIsGeneratingMeals(false);
      }
    };
    generateMealIdeas();
  }, [fridgeItems, activeTab, mealIdeas.length]);

  const handleInsightPress = (type: 'healthyFoods' | 'additives' | 'lowScore' | 'avgScore' | 'nutritionalNeeds') => {
    if (!healthInsights) return;
    
    let title = '';
    let items: Product[] = [];
    
    switch (type) {
      case 'avgScore':
        title = 'Average Health Score';
        items = healthInsights.items;
        break;
      case 'healthyFoods':
        title = 'Healthy Foods (80+ Score)';
        items = healthInsights.items.filter(item => item.healthScore >= 80);
        break;
      case 'additives':
        title = 'Products with Additives';
        items = healthInsights.items.filter(item => item.additives.length > 0);
        break;
      case 'lowScore':
        title = 'Items Needing Attention (Score <60)';
        items = healthInsights.items.filter(item => item.healthScore < 60);
        break;
      case 'nutritionalNeeds':
        title = 'Nutritional Needs';
        items = healthInsights.items;
        break;
    }
    
    setModalData({
      type,
      title,
      items,
      stats: healthInsights,
    });
  };

  const renderFridgeItem = ({ item }: { item: Product }) => {
    const imageUrl = item.webImageUrl && item.webImageUrl.startsWith('http') 
      ? item.webImageUrl 
      : item.imageUrl;
    const inGroceryList = isInGroceryList(item.barcode);
    return (
    <TouchableOpacity
      style={styles.fridgeItemCard}
      onPress={() => router.push({ pathname: '/product/[barcode]', params: { barcode: item.barcode } } as Href)}
      activeOpacity={0.7}
    >
      <Image source={{ uri: imageUrl }} style={styles.fridgeItemImage} />
      <View style={styles.fridgeItemInfo}>
        <Text style={styles.fridgeItemName} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.fridgeItemBrand}>{item.brand}</Text>
      </View>
      <View style={styles.fridgeItemActions}>
        <TouchableOpacity
          style={styles.addToGroceryButton}
          onPress={(e) => {
            e.stopPropagation();
            addToGroceryList(item);
          }}
          disabled={inGroceryList}
        >
          <ShoppingCart 
            color={inGroceryList ? Colors.textMuted : Colors.primary} 
            size={16} 
            fill={inGroceryList ? Colors.textMuted : 'none'}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.removeButton}
          onPress={(e) => {
            e.stopPropagation();
            removeFromFridge(item.barcode);
          }}
        >
          <X color={Colors.danger} size={18} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
    );
  };

  const renderEmptyFridge = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconContainer}>
        <Refrigerator color={Colors.textMuted} size={48} />
      </View>
      <Text style={styles.emptyTitle}>Your Fridge is Empty</Text>
      <Text style={styles.emptyText}>
        Add items to your fridge by scanning products and tapping the fridge icon
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[Colors.primaryLight, Colors.background]}
        style={styles.headerGradient}
      />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.title}>My Fridge</Text>
          <TouchableOpacity
            style={styles.groceryListButton}
            onPress={() => setShowGroceryListModal(true)}
            activeOpacity={0.7}
          >
            <ShoppingCart color={Colors.primary} size={20} />
            {groceryList.length > 0 && (
              <View style={styles.groceryListBadge}>
                <Text style={styles.groceryListBadgeText}>{groceryList.length}</Text>
              </View>
            )}
            <Text style={styles.groceryListButtonText}>Grocery List</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.fridgeSection}>
            <View style={styles.sectionHeader}>
              <Refrigerator color={Colors.primary} size={20} />
              <Text style={styles.sectionTitle}>My Fridge</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{fridgeItems.length}</Text>
              </View>
            </View>

            {fridgeItems.length === 0 ? (
              renderEmptyFridge()
            ) : (
              <FlatList
                data={fridgeItems}
                renderItem={renderFridgeItem}
                keyExtractor={(item) => item.barcode}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.fridgeList}
              />
            )}
          </View>

          {fridgeItems.length > 0 && (
            <View style={styles.tabSection}>
              <View style={styles.tabContainer}>
                <TouchableOpacity
                  style={[styles.tab, activeTab === 'insights' && styles.tabActive]}
                  onPress={() => setActiveTab('insights')}
                  activeOpacity={0.7}
                >
                  <TrendingUp color={activeTab === 'insights' ? Colors.primary : Colors.textSecondary} size={18} />
                  <Text style={[styles.tabText, activeTab === 'insights' && styles.tabTextActive]}>
                    Insights
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tab, activeTab === 'meals' && styles.tabActive]}
                  onPress={() => setActiveTab('meals')}
                  activeOpacity={0.7}
                >
                  <ChefHat color={activeTab === 'meals' ? Colors.primary : Colors.textSecondary} size={18} />
                  <Text style={[styles.tabText, activeTab === 'meals' && styles.tabTextActive]}>
                    Meal Ideas
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tab, activeTab === 'tracker' && styles.tabActive]}
                  onPress={() => setActiveTab('tracker')}
                  activeOpacity={0.7}
                >
                  <Calendar color={activeTab === 'tracker' ? Colors.primary : Colors.textSecondary} size={18} />
                  <Text style={[styles.tabText, activeTab === 'tracker' && styles.tabTextActive]}>
                    Tracker
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {fridgeItems.length > 0 && healthInsights && activeTab === 'insights' && (
            !isPremium ? (
              <View style={styles.insightsPaywallSection}>
                <View style={styles.insightsPaywallCard}>
                  <View style={styles.insightsPaywallIcon}>
                    <TrendingUp color={Colors.primary} size={48} />
                  </View>
                  <Text style={styles.insightsPaywallTitle}>Unlock Fridge Insights</Text>
                  <Text style={styles.insightsPaywallDescription}>
                    Get detailed analysis of your fridge contents and personalized recommendations with NutriScan Premium
                  </Text>
                  <View style={styles.insightsPaywallFeatures}>
                    <View style={styles.insightsPaywallFeature}>
                      <View style={styles.insightsPaywallFeatureDot} />
                      <Text style={styles.insightsPaywallFeatureText}>Average health score tracking</Text>
                    </View>
                    <View style={styles.insightsPaywallFeature}>
                      <View style={styles.insightsPaywallFeatureDot} />
                      <Text style={styles.insightsPaywallFeatureText}>Healthy foods percentage</Text>
                    </View>
                    <View style={styles.insightsPaywallFeature}>
                      <View style={styles.insightsPaywallFeatureDot} />
                      <Text style={styles.insightsPaywallFeatureText}>Nutritional needs analysis</Text>
                    </View>
                    <View style={styles.insightsPaywallFeature}>
                      <View style={styles.insightsPaywallFeatureDot} />
                      <Text style={styles.insightsPaywallFeatureText}>Additives monitoring</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.insightsPaywallButton}
                    onPress={() => router.push('/paywall' as any)}
                    activeOpacity={0.8}
                  >
                    <Sparkles color="#FFFFFF" size={20} />
                    <Text style={styles.insightsPaywallButtonText}>Upgrade to Premium</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
            <View style={styles.insightsSection}>
              <View style={styles.insightsGrid}>
                <TouchableOpacity 
                  style={styles.insightCard}
                  onPress={() => handleInsightPress('avgScore')}
                  activeOpacity={0.7}
                >
                  <View style={[styles.insightIconContainer, { backgroundColor: Colors.primaryLight }]}>
                    <TrendingUp color={Colors.primary} size={20} />
                  </View>
                  <Text style={styles.insightValue}>{healthInsights.avgScore}</Text>
                  <Text style={styles.insightLabel}>Avg Health Score</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.insightCard}
                  onPress={() => handleInsightPress('healthyFoods')}
                  activeOpacity={0.7}
                >
                  <View style={[styles.insightIconContainer, { backgroundColor: Colors.successLight }]}>
                    <Leaf color={Colors.success} size={20} />
                  </View>
                  <Text style={styles.insightValue}>{healthInsights.healthyFoodsPercentage}%</Text>
                  <Text style={styles.insightLabel}>Healthy Foods</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.insightCard}
                  onPress={() => handleInsightPress('nutritionalNeeds')}
                  activeOpacity={0.7}
                >
                  <View style={[styles.insightIconContainer, { backgroundColor: Colors.secondaryLight }]}>
                    <ChefHat color={Colors.secondary} size={20} />
                  </View>
                  <Text style={styles.insightValue}>{healthInsights.foodGroupsCount}/5</Text>
                  <Text style={styles.insightLabel}>Nutritional Needs</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.insightCard}
                  onPress={() => handleInsightPress('additives')}
                  activeOpacity={0.7}
                >
                  <View style={[styles.insightIconContainer, { backgroundColor: Colors.warningLight }]}>
                    <AlertCircle color={Colors.warning} size={20} />
                  </View>
                  <Text style={styles.insightValue}>{healthInsights.totalAdditives}</Text>
                  <Text style={styles.insightLabel}>Additives</Text>
                </TouchableOpacity>
              </View>
            </View>
            )
          )}

          {fridgeItems.length > 0 && activeTab === 'tracker' && (
            !isPremium ? (
              <View style={styles.trackerPaywallSection}>
                <View style={styles.trackerPaywallCard}>
                  <View style={styles.trackerPaywallIcon}>
                    <Calendar color={Colors.primary} size={48} />
                  </View>
                  <Text style={styles.trackerPaywallTitle}>Unlock Meal Tracking</Text>
                  <Text style={styles.trackerPaywallDescription}>
                    Track your daily meals, monitor nutrition goals, and get detailed insights with NutriScan Premium
                  </Text>
                  <View style={styles.trackerPaywallFeatures}>
                    <View style={styles.trackerPaywallFeature}>
                      <View style={styles.trackerPaywallFeatureDot} />
                      <Text style={styles.trackerPaywallFeatureText}>Track all your meals by type</Text>
                    </View>
                    <View style={styles.trackerPaywallFeature}>
                      <View style={styles.trackerPaywallFeatureDot} />
                      <Text style={styles.trackerPaywallFeatureText}>Monitor daily nutrition goals</Text>
                    </View>
                    <View style={styles.trackerPaywallFeature}>
                      <View style={styles.trackerPaywallFeatureDot} />
                      <Text style={styles.trackerPaywallFeatureText}>View weekly & monthly insights</Text>
                    </View>
                    <View style={styles.trackerPaywallFeature}>
                      <View style={styles.trackerPaywallFeatureDot} />
                      <Text style={styles.trackerPaywallFeatureText}>Track water intake</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.trackerPaywallButton}
                    onPress={() => router.push('/paywall' as any)}
                    activeOpacity={0.8}
                  >
                    <Sparkles color="#FFFFFF" size={20} />
                    <Text style={styles.trackerPaywallButtonText}>Upgrade to Premium</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
            <View style={styles.trackerSection}>
              <View style={styles.trackerViewToggle}>
                <TouchableOpacity
                  style={[styles.trackerViewButton, trackerView === 'day' && styles.trackerViewButtonActive]}
                  onPress={() => setTrackerView('day')}
                >
                  <Text style={[styles.trackerViewButtonText, trackerView === 'day' && styles.trackerViewButtonTextActive]}>Day</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.trackerViewButton, trackerView === 'week' && styles.trackerViewButtonActive]}
                  onPress={() => setTrackerView('week')}
                >
                  <Text style={[styles.trackerViewButtonText, trackerView === 'week' && styles.trackerViewButtonTextActive]}>Week</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.trackerViewButton, trackerView === 'month' && styles.trackerViewButtonActive]}
                  onPress={() => setTrackerView('month')}
                >
                  <Text style={[styles.trackerViewButtonText, trackerView === 'month' && styles.trackerViewButtonTextActive]}>Month</Text>
                </TouchableOpacity>
              </View>

              {trackerView === 'day' && (
                <>
                  <View style={styles.dateSelector}>
                    <TouchableOpacity
                      style={styles.dateSelectorButton}
                      onPress={() => {
                        const [year, month, day] = selectedDate.split('-').map(Number);
                        const date = new Date(year, month - 1, day);
                        date.setDate(date.getDate() - 1);
                        const newYear = date.getFullYear();
                        const newMonth = String(date.getMonth() + 1).padStart(2, '0');
                        const newDay = String(date.getDate()).padStart(2, '0');
                        setSelectedDate(`${newYear}-${newMonth}-${newDay}`);
                      }}
                    >
                      <Text style={styles.dateSelectorArrow}>←</Text>
                    </TouchableOpacity>
                    <View style={styles.dateSelectorCenter}>
                      <Calendar color={Colors.primary} size={18} />
                      <Text style={styles.dateSelectorText}>
                        {(() => {
                          const [year, month, day] = selectedDate.split('-').map(Number);
                          const date = new Date(year, month - 1, day);
                          return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                        })()}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.dateSelectorButton}
                      onPress={() => {
                        const [year, month, day] = selectedDate.split('-').map(Number);
                        const date = new Date(year, month - 1, day);
                        const today = getLocalDateString();
                        if (selectedDate !== today) {
                          date.setDate(date.getDate() + 1);
                          const newYear = date.getFullYear();
                          const newMonth = String(date.getMonth() + 1).padStart(2, '0');
                          const newDay = String(date.getDate()).padStart(2, '0');
                          setSelectedDate(`${newYear}-${newMonth}-${newDay}`);
                        }
                      }}
                    >
                      <Text style={styles.dateSelectorArrow}>→</Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={styles.collapsibleSection}
                    onPress={() => setMealsExpanded(!mealsExpanded)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.collapsibleHeader}>
                      <View style={styles.collapsibleHeaderLeft}>
                        <View style={[styles.collapsibleIcon, { backgroundColor: Colors.primaryLight }]}>
                          <Utensils color={Colors.primary} size={20} />
                        </View>
                        <Text style={styles.collapsibleTitle}>Food Tracking</Text>
                      </View>
                      {mealsExpanded ? (
                        <ChevronUp color={Colors.primary} size={20} />
                      ) : (
                        <ChevronDown color={Colors.textSecondary} size={20} />
                      )}
                    </View>
                  </TouchableOpacity>

                  {mealsExpanded && (
                    <View style={styles.mealTypesList}>
                      {['breakfast', 'lunch', 'dinner', 'snack'].map((type) => {
                      const mealType = type as MealType;
                      const meals = getMealsForDateAndType(selectedDate, mealType);
                      const icon = mealType === 'breakfast' ? Coffee : mealType === 'lunch' ? Utensils : mealType === 'dinner' ? Moon : Apple;
                      const IconComponent = icon;
                      
                      return (
                        <View key={type} style={styles.mealTypeSection}>
                          <View style={styles.mealTypeHeader}>
                            <View style={styles.mealTypeHeaderLeft}>
                              <View style={[styles.mealTypeIcon, { backgroundColor: Colors.primaryLight }]}>
                                <IconComponent color={Colors.primary} size={18} />
                              </View>
                              <Text style={styles.mealTypeTitle}>{type.charAt(0).toUpperCase() + type.slice(1)}</Text>
                              <View style={styles.mealTypeCount}>
                                <Text style={styles.mealTypeCountText}>{meals.length}</Text>
                              </View>
                            </View>
                            <TouchableOpacity
                              style={styles.addMealButton}
                              onPress={() => {
                                setSelectedMealType(mealType);
                                setShowAddMealModal(true);
                              }}
                            >
                              <Plus color={Colors.primary} size={18} />
                            </TouchableOpacity>
                          </View>
                          
                          {meals.length > 0 ? (
                            <View style={styles.mealsList}>
                              {meals.map((meal) => (
                                <View key={meal.id} style={styles.trackedMealItem}>
                                  <Image source={{ uri: meal.product.imageUrl }} style={styles.trackedMealImage} />
                                  <View style={styles.trackedMealInfo}>
                                    <Text style={styles.trackedMealName} numberOfLines={1}>{meal.product.name}</Text>
                                    <View style={styles.trackedMealMeta}>
                                      <View style={[styles.trackedMealBadge, { backgroundColor: getScoreColor(meal.product.healthScore) + '20' }]}>
                                        <Text style={[styles.trackedMealBadgeText, { color: getScoreColor(meal.product.healthScore) }]}>
                                          {meal.product.healthScore}
                                        </Text>
                                      </View>
                                      {meal.product.isOrganic && (
                                        <View style={[styles.trackedMealBadge, { backgroundColor: Colors.successLight }]}>
                                          <Leaf color={Colors.success} size={10} />
                                        </View>
                                      )}
                                    </View>
                                    <View style={styles.servingSizeControls}>
                                      <TouchableOpacity
                                        style={styles.servingSizeButton}
                                        onPress={() => updateMealServings(meal.id, meal.servings - 0.5)}
                                      >
                                        <Minus color={Colors.textSecondary} size={12} />
                                      </TouchableOpacity>
                                      <Text style={styles.servingSizeText}>{meal.servings} serving{meal.servings !== 1 ? 's' : ''}</Text>
                                      <TouchableOpacity
                                        style={styles.servingSizeButton}
                                        onPress={() => updateMealServings(meal.id, meal.servings + 0.5)}
                                      >
                                        <Plus color={Colors.textSecondary} size={12} />
                                      </TouchableOpacity>
                                    </View>
                                  </View>
                                  <TouchableOpacity
                                    style={styles.removeMealButton}
                                    onPress={() => removeMeal(meal.id)}
                                  >
                                    <X color={Colors.textMuted} size={16} />
                                  </TouchableOpacity>
                                </View>
                              ))}
                            </View>
                          ) : (
                            <Text style={styles.noMealsText}>No items tracked</Text>
                          )}
                        </View>
                      );
                      })}
                    </View>
                  )}

                  <TouchableOpacity
                    style={styles.collapsibleSection}
                    onPress={() => setWaterExpanded(!waterExpanded)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.collapsibleHeader}>
                      <View style={styles.collapsibleHeaderLeft}>
                        <View style={[styles.collapsibleIcon, { backgroundColor: Colors.infoLight }]}>
                          <Droplets color={Colors.info} size={20} />
                        </View>
                        <Text style={styles.collapsibleTitle}>Water Tracking</Text>
                      </View>
                      {waterExpanded ? (
                        <ChevronUp color={Colors.primary} size={20} />
                      ) : (
                        <ChevronDown color={Colors.textSecondary} size={20} />
                      )}
                    </View>
                  </TouchableOpacity>

                  {waterExpanded && (
                    <View style={styles.waterTrackerCard}>
                    <View style={styles.waterTrackerHeader}>
                      <View style={styles.waterTrackerHeaderLeft}>
                        <View style={[styles.waterTrackerIcon, { backgroundColor: Colors.infoLight }]}>
                          <Droplets color={Colors.info} size={20} />
                        </View>
                        <View>
                          <Text style={styles.waterTrackerTitle}>Water Intake</Text>
                          <Text style={styles.waterTrackerSubtitle}>Track your daily hydration</Text>
                        </View>
                      </View>
                    </View>
                    <View style={styles.waterTrackerContent}>
                      <View style={styles.waterCupsDisplay}>
                        <Text style={styles.waterCupsValue}>{getWaterForDate(selectedDate)}</Text>
                        <Text style={styles.waterCupsLabel}>cups today</Text>
                      </View>
                      <View style={styles.waterButtonsRow}>
                        <TouchableOpacity
                          style={styles.waterButton}
                          onPress={() => addWater(selectedDate, 0.5)}
                        >
                          <Droplets color={Colors.info} size={18} />
                          <Text style={styles.waterButtonText}>+</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.waterButton, styles.waterButtonRemove]}
                          onPress={() => removeWater(selectedDate, 0.5)}
                          disabled={getWaterForDate(selectedDate) < 0.5}
                        >
                          <Text style={[styles.waterButtonText, { color: Colors.danger }]}>-</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                  )}

                  <View style={styles.nutrientTrackersCard}>
                    <Text style={styles.nutrientTrackersTitle}>Daily Nutrition Goals</Text>
                    {(() => {
                      const dayStats = getDayStats(selectedDate);
                      const safeBodyweight = bodyweight || 150;
                      const safeFitnessGoal = fitnessGoal || 'maintenance';
                      const goals = calculateNutrientGoals(safeBodyweight, safeFitnessGoal);
                      
                      console.log('[Meals] Daily nutrition goals:', {
                        bodyweight: safeBodyweight,
                        fitnessGoal: safeFitnessGoal,
                        goals,
                        dayStats,
                      });
                      
                      return (
                        <>
                          <NutrientProgressBar
                            label="Calories"
                            current={dayStats.totalCalories || 0}
                            goal={goals.calories || 2250}
                            unit=""
                            color={Colors.warning}
                            icon={<Flame color={Colors.warning} size={18} />}
                          />
                          <NutrientProgressBar
                            label="Protein"
                            current={dayStats.totalProtein || 0}
                            goal={goals.protein || 120}
                            unit="g"
                            color={Colors.primary}
                            icon={<Dumbbell color={Colors.primary} size={18} />}
                          />
                          <NutrientProgressBar
                            label="Carbs"
                            current={dayStats.totalCarbs || 0}
                            goal={goals.carbs || 300}
                            unit="g"
                            color={Colors.secondary}
                            icon={<Wheat color={Colors.secondary} size={18} />}
                          />
                          <NutrientProgressBar
                            label="Fat"
                            current={dayStats.totalFat || 0}
                            goal={goals.fat || 60}
                            unit="g"
                            color={Colors.danger}
                            icon={<Apple color={Colors.danger} size={18} />}
                          />
                          <NutrientProgressBar
                            label="Water"
                            current={dayStats.waterIntake || 0}
                            goal={goals.water || 8}
                            unit=" cups"
                            color={Colors.info}
                            icon={<Droplets color={Colors.info} size={18} />}
                          />
                        </>
                      );
                    })()}
                  </View>
                </>
              )}

              {(trackerView === 'week' || trackerView === 'month') && (
                <View style={styles.periodStatsContainer}>
                  {(() => {
                    const days = trackerView === 'week' ? 7 : 30;
                    const safeBodyweight = bodyweight || 150;
                    const safeFitnessGoal = fitnessGoal || 'maintenance';
                    const stats = getPeriodStats(days, safeBodyweight, safeFitnessGoal);
                    const goals = calculateNutrientGoals(safeBodyweight, safeFitnessGoal);
                    
                    console.log('[Meals] Period stats:', {
                      trackerView,
                      bodyweight: safeBodyweight,
                      fitnessGoal: safeFitnessGoal,
                      goals,
                      stats,
                    });
                    
                    if (stats.totalMeals === 0) {
                      return (
                        <View style={styles.emptyPeriodStats}>
                          <Calendar color={Colors.textMuted} size={48} />
                          <Text style={styles.emptyPeriodStatsTitle}>No Data Yet</Text>
                          <Text style={styles.emptyPeriodStatsText}>
                            Start tracking your meals to see {trackerView === 'week' ? 'weekly' : 'monthly'} insights
                          </Text>
                        </View>
                      );
                    }

                    return (
                      <>
                        <View style={styles.periodStatsHeader}>
                          <Text style={styles.periodStatsTitle}>{trackerView === 'week' ? 'Last 7 Days' : 'Last 30 Days'}</Text>
                          <Text style={styles.periodStatsSubtitle}>{stats.totalMeals} meals tracked</Text>
                        </View>

                        <View style={styles.periodStatsGrid}>
                          <View style={styles.periodStatCard}>
                            <TrendingUp color={Colors.primary} size={24} />
                            <Text style={styles.periodStatValue}>{stats.avgHealthScore}</Text>
                            <Text style={styles.periodStatLabel}>Avg Health Score</Text>
                          </View>
                          <View style={styles.periodStatCard}>
                            <Award color={Colors.success} size={24} />
                            <Text style={styles.periodStatValue}>{stats.healthyMealsCount}</Text>
                            <Text style={styles.periodStatLabel}>Healthy Meals</Text>
                          </View>
                        </View>

                        <View style={styles.mostTrackedSection}>
                          <Text style={styles.mostTrackedTitle}>Most Tracked Meal</Text>
                          <View style={styles.mostTrackedCard}>
                            {(() => {
                              const icon = stats.mostTrackedMeal === 'breakfast' ? Coffee : stats.mostTrackedMeal === 'lunch' ? Utensils : stats.mostTrackedMeal === 'dinner' ? Moon : Apple;
                              const IconComponent = icon;
                              return <IconComponent color={Colors.primary} size={24} />;
                            })()}
                            <Text style={styles.mostTrackedText}>{stats.mostTrackedMeal.charAt(0).toUpperCase() + stats.mostTrackedMeal.slice(1)}</Text>
                          </View>
                        </View>

                        {stats.topProducts.length > 0 && (
                          <View style={styles.topProductsSection}>
                            <Text style={styles.topProductsTitle}>Top Products</Text>
                            {stats.topProducts.map((item, index) => (
                              <View key={item.product.barcode} style={styles.topProductItem}>
                                <View style={styles.topProductRank}>
                                  <Text style={styles.topProductRankText}>{index + 1}</Text>
                                </View>
                                <Image source={{ uri: item.product.imageUrl }} style={styles.topProductImage} />
                                <View style={styles.topProductInfo}>
                                  <Text style={styles.topProductName} numberOfLines={1}>{item.product.name}</Text>
                                  <Text style={styles.topProductCount}>{item.count} times</Text>
                                </View>
                                <View style={[styles.topProductScore, { backgroundColor: getScoreColor(item.product.healthScore) + '20' }]}>
                                  <Text style={[styles.topProductScoreText, { color: getScoreColor(item.product.healthScore) }]}>
                                    {item.product.healthScore}
                                  </Text>
                                </View>
                              </View>
                            ))}
                          </View>
                        )}

                        <View style={styles.periodNutritionSection}>
                          <Text style={styles.periodNutritionTitle}>Daily Average Nutrition</Text>
                          <View style={styles.periodNutritionGrid}>
                            <View style={styles.periodNutritionCard}>
                              <View style={[styles.periodNutritionIcon, { backgroundColor: Colors.warning + '20' }]}>
                                <Flame color={Colors.warning} size={20} />
                              </View>
                              <Text style={styles.periodNutritionValue}>{stats.avgNutrients.calories || 0}</Text>
                              <Text style={styles.periodNutritionLabel}>Calories</Text>
                              <Text style={styles.periodNutritionGoal}>Goal: {goals.calories || 2250}</Text>
                            </View>
                            <View style={styles.periodNutritionCard}>
                              <View style={[styles.periodNutritionIcon, { backgroundColor: Colors.primary + '20' }]}>
                                <Dumbbell color={Colors.primary} size={20} />
                              </View>
                              <Text style={styles.periodNutritionValue}>{stats.avgNutrients.protein || 0}g</Text>
                              <Text style={styles.periodNutritionLabel}>Protein</Text>
                              <Text style={styles.periodNutritionGoal}>Goal: {goals.protein || 120}g</Text>
                            </View>
                            <View style={styles.periodNutritionCard}>
                              <View style={[styles.periodNutritionIcon, { backgroundColor: Colors.secondary + '20' }]}>
                                <Wheat color={Colors.secondary} size={20} />
                              </View>
                              <Text style={styles.periodNutritionValue}>{stats.avgNutrients.carbs || 0}g</Text>
                              <Text style={styles.periodNutritionLabel}>Carbs</Text>
                              <Text style={styles.periodNutritionGoal}>Goal: {goals.carbs || 300}g</Text>
                            </View>
                            <View style={styles.periodNutritionCard}>
                              <View style={[styles.periodNutritionIcon, { backgroundColor: Colors.danger + '20' }]}>
                                <Apple color={Colors.danger} size={20} />
                              </View>
                              <Text style={styles.periodNutritionValue}>{stats.avgNutrients.fat || 0}g</Text>
                              <Text style={styles.periodNutritionLabel}>Fat</Text>
                              <Text style={styles.periodNutritionGoal}>Goal: {goals.fat || 60}g</Text>
                            </View>
                            <View style={styles.periodNutritionCard}>
                              <View style={[styles.periodNutritionIcon, { backgroundColor: Colors.info + '20' }]}>
                                <Droplets color={Colors.info} size={20} />
                              </View>
                              <Text style={styles.periodNutritionValue}>{stats.avgNutrients.water || 0}</Text>
                              <Text style={styles.periodNutritionLabel}>Water (cups)</Text>
                              <Text style={styles.periodNutritionGoal}>Goal: {goals.water || 8}</Text>
                            </View>
                          </View>
                        </View>

                        <View style={styles.goalsMetSection}>
                          <Text style={styles.goalsMetTitle}>Nutrition Goals Met</Text>
                          <Text style={styles.goalsMetSubtitle}>Percentage of days goals were achieved</Text>
                          <View style={styles.goalsMetList}>
                            <View style={styles.goalsMetItemWithBar}>
                              <View style={styles.goalsMetItemHeader}>
                                <View style={styles.goalsMetItemLeft}>
                                  <Flame color={Colors.warning} size={18} />
                                  <Text style={styles.goalsMetItemLabel}>Calories</Text>
                                </View>
                                <Text style={[styles.goalsMetItemValue, { color: (stats.nutrientGoalsMet.calories || 0) >= 70 ? Colors.success : Colors.warning }]}>
                                  {stats.nutrientGoalsMet.calories || 0}%
                                </Text>
                              </View>
                              <View style={[styles.goalsMetProgressBar, { backgroundColor: Colors.warning + '15' }]}>
                                <View style={[styles.goalsMetProgressFill, { width: `${stats.nutrientGoalsMet.calories || 0}%`, backgroundColor: (stats.nutrientGoalsMet.calories || 0) >= 70 ? Colors.success : Colors.warning }]} />
                              </View>
                            </View>
                            <View style={styles.goalsMetItemWithBar}>
                              <View style={styles.goalsMetItemHeader}>
                                <View style={styles.goalsMetItemLeft}>
                                  <Dumbbell color={Colors.primary} size={18} />
                                  <Text style={styles.goalsMetItemLabel}>Protein</Text>
                                </View>
                                <Text style={[styles.goalsMetItemValue, { color: (stats.nutrientGoalsMet.protein || 0) >= 70 ? Colors.success : Colors.warning }]}>
                                  {stats.nutrientGoalsMet.protein || 0}%
                                </Text>
                              </View>
                              <View style={[styles.goalsMetProgressBar, { backgroundColor: Colors.primary + '15' }]}>
                                <View style={[styles.goalsMetProgressFill, { width: `${stats.nutrientGoalsMet.protein || 0}%`, backgroundColor: (stats.nutrientGoalsMet.protein || 0) >= 70 ? Colors.success : Colors.primary }]} />
                              </View>
                            </View>
                            <View style={styles.goalsMetItemWithBar}>
                              <View style={styles.goalsMetItemHeader}>
                                <View style={styles.goalsMetItemLeft}>
                                  <Wheat color={Colors.secondary} size={18} />
                                  <Text style={styles.goalsMetItemLabel}>Carbs</Text>
                                </View>
                                <Text style={[styles.goalsMetItemValue, { color: (stats.nutrientGoalsMet.carbs || 0) >= 70 ? Colors.success : Colors.warning }]}>
                                  {stats.nutrientGoalsMet.carbs || 0}%
                                </Text>
                              </View>
                              <View style={[styles.goalsMetProgressBar, { backgroundColor: Colors.secondary + '15' }]}>
                                <View style={[styles.goalsMetProgressFill, { width: `${stats.nutrientGoalsMet.carbs || 0}%`, backgroundColor: (stats.nutrientGoalsMet.carbs || 0) >= 70 ? Colors.success : Colors.secondary }]} />
                              </View>
                            </View>
                            <View style={styles.goalsMetItemWithBar}>
                              <View style={styles.goalsMetItemHeader}>
                                <View style={styles.goalsMetItemLeft}>
                                  <Apple color={Colors.danger} size={18} />
                                  <Text style={styles.goalsMetItemLabel}>Fat</Text>
                                </View>
                                <Text style={[styles.goalsMetItemValue, { color: (stats.nutrientGoalsMet.fat || 0) >= 70 ? Colors.success : Colors.warning }]}>
                                  {stats.nutrientGoalsMet.fat || 0}%
                                </Text>
                              </View>
                              <View style={[styles.goalsMetProgressBar, { backgroundColor: Colors.danger + '15' }]}>
                                <View style={[styles.goalsMetProgressFill, { width: `${stats.nutrientGoalsMet.fat || 0}%`, backgroundColor: (stats.nutrientGoalsMet.fat || 0) >= 70 ? Colors.success : Colors.danger }]} />
                              </View>
                            </View>
                            <View style={styles.goalsMetItemWithBar}>
                              <View style={styles.goalsMetItemHeader}>
                                <View style={styles.goalsMetItemLeft}>
                                  <Droplets color={Colors.info} size={18} />
                                  <Text style={styles.goalsMetItemLabel}>Water</Text>
                                </View>
                                <Text style={[styles.goalsMetItemValue, { color: (stats.nutrientGoalsMet.water || 0) >= 70 ? Colors.success : Colors.warning }]}>
                                  {stats.nutrientGoalsMet.water || 0}%
                                </Text>
                              </View>
                              <View style={[styles.goalsMetProgressBar, { backgroundColor: Colors.info + '15' }]}>
                                <View style={[styles.goalsMetProgressFill, { width: `${stats.nutrientGoalsMet.water || 0}%`, backgroundColor: (stats.nutrientGoalsMet.water || 0) >= 70 ? Colors.success : Colors.info }]} />
                              </View>
                            </View>
                          </View>
                        </View>
                      </>
                    );
                  })()}
                </View>
              )}
            </View>
            )
          )}

          {fridgeItems.length > 0 && activeTab === 'meals' && (
            !isPremium ? (
              <View style={styles.mealsPaywallSection}>
                <View style={styles.mealsPaywallCard}>
                  <View style={styles.mealsPaywallIcon}>
                    <ChefHat color={Colors.primary} size={48} />
                  </View>
                  <Text style={styles.mealsPaywallTitle}>Unlock Meal Ideas</Text>
                  <Text style={styles.mealsPaywallDescription}>
                    Get AI-powered meal suggestions and recipes based on your fridge contents with NutriScan Premium
                  </Text>
                  <View style={styles.mealsPaywallFeatures}>
                    <View style={styles.mealsPaywallFeature}>
                      <View style={styles.mealsPaywallFeatureDot} />
                      <Text style={styles.mealsPaywallFeatureText}>Personalized meal ideas</Text>
                    </View>
                    <View style={styles.mealsPaywallFeature}>
                      <View style={styles.mealsPaywallFeatureDot} />
                      <Text style={styles.mealsPaywallFeatureText}>Full recipes with instructions</Text>
                    </View>
                    <View style={styles.mealsPaywallFeature}>
                      <View style={styles.mealsPaywallFeatureDot} />
                      <Text style={styles.mealsPaywallFeatureText}>Cooking times and difficulty levels</Text>
                    </View>
                    <View style={styles.mealsPaywallFeature}>
                      <View style={styles.mealsPaywallFeatureDot} />
                      <Text style={styles.mealsPaywallFeatureText}>Health score for each meal</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.mealsPaywallButton}
                    onPress={() => router.push('/paywall' as any)}
                    activeOpacity={0.8}
                  >
                    <Sparkles color="#FFFFFF" size={20} />
                    <Text style={styles.mealsPaywallButtonText}>Upgrade to Premium</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
            <View style={styles.mealsSection}>
              {isGeneratingMeals ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={Colors.primary} />
                  <Text style={styles.loadingText}>Generating meal ideas...</Text>
                  <Text style={styles.loadingSubtext}>
                    Creating personalized recipes from your fridge
                  </Text>
                </View>
              ) : mealIdeas.length > 0 ? (
                <>
                  <View style={styles.mealsBars}>
                    {mealIdeas.map((meal, index) => {
                    const hasAllIngredients = meal.missingIngredients.length === 0;
                    const mealHealthScore = meal.healthScore || 75;
                    const scoreColor = getScoreColor(mealHealthScore);
                    return (
                      <TouchableOpacity
                        key={index}
                        style={styles.mealBar}
                        onPress={() => setSelectedMeal(meal)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.mealBarLeft}>
                          <CircularProgress
                            size={56}
                            strokeWidth={4}
                            progress={mealHealthScore}
                            color={scoreColor}
                            backgroundColor={scoreColor + '20'}
                          >
                            <Text style={[styles.mealHealthScore, { color: scoreColor }]}>{mealHealthScore}</Text>
                          </CircularProgress>
                        </View>
                        <View style={styles.mealBarContent}>
                          <Text style={styles.mealBarName} numberOfLines={2}>{meal.name}</Text>
                          <Text style={styles.mealBarDescription} numberOfLines={1}>{meal.description}</Text>
                          <View style={styles.mealBarMeta}>
                            <View style={styles.mealMetaItem}>
                              <Clock color={Colors.textSecondary} size={12} />
                              <Text style={styles.mealMetaText}>{meal.cookTime}</Text>
                            </View>
                            <Text style={styles.mealBarDivider}>•</Text>
                            <Text style={styles.mealMetaText}>{meal.difficulty}</Text>
                            <Text style={styles.mealBarDivider}>•</Text>
                            <Text style={[styles.mealMetaText, { color: hasAllIngredients ? Colors.success : Colors.warning }]}>
                              {hasAllIngredients ? 'Ready to cook' : `${meal.missingIngredients.length} missing`}
                            </Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                    })}
                  </View>
                  <TouchableOpacity
                    style={styles.regenerateMealsButton}
                    onPress={() => {
                      setMealIdeas([]);
                      setIsGeneratingMeals(true);
                    }}
                    activeOpacity={0.7}
                  >
                    <RefreshCw color={Colors.primary} size={18} />
                    <Text style={styles.regenerateMealsButtonText}>Regenerate Meal Ideas</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <View style={styles.emptyMealsState}>
                  <ChefHat color={Colors.textMuted} size={48} />
                  <Text style={styles.emptyMealsTitle}>No Meal Ideas Yet</Text>
                  <Text style={styles.emptyMealsText}>
                    Add more items to your fridge to get personalized meal suggestions
                  </Text>
                </View>
              )}
            </View>
            )
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
            <View style={styles.mealModalContainer}>
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
                  <View style={styles.mealDetailContent}>
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

                    <View style={styles.readyBanner}>
                      <Sparkles color={Colors.primary} size={20} />
                      <Text style={styles.readyBannerText}>
                        {selectedMeal.missingIngredients.length === 0 
                          ? 'You have everything you need!'
                          : `Just ${selectedMeal.missingIngredients.length} ingredient${selectedMeal.missingIngredients.length === 1 ? '' : 's'} away!`}
                      </Text>
                    </View>

                    {!generatedRecipe ? (
                      <TouchableOpacity
                        style={styles.generateRecipeButton}
                        onPress={async () => {
                          if (isGeneratingRecipe) return;
                          
                          setIsGeneratingRecipe(true);
                          try {
                            console.log('[Recipe] Generating recipe for', selectedMeal.name);
                            
                            const prompt = `Create a detailed recipe for "${selectedMeal.name}".

Available ingredients from fridge: ${selectedMeal.ingredients.join(', ')}
Additional ingredients needed: ${selectedMeal.missingIngredients.join(', ') || 'none'}

Provide:
- Number of servings
- Prep time
- Cook time
- Detailed ingredients list with exact amounts
- Step-by-step cooking instructions (numbered)
- Optional cooking tips

Format as JSON:
{
  "mealName": "${selectedMeal.name}",
  "servings": 4,
  "prepTime": "15 minutes",
  "cookTime": "30 minutes",
  "ingredients": [
    { "item": "ingredient name", "amount": "2 cups" }
  ],
  "instructions": [
    "Step 1 instruction",
    "Step 2 instruction"
  ],
  "tips": ["tip 1", "tip 2"]
}

Only return the JSON, no additional text.`;

                            const response = await generateText({ messages: [{ role: 'user', content: prompt }] });
                            
                            console.log('[Recipe] AI Response:', response);
                            
                            const cleanedResponse = response.trim().replace(/```json\n?/g, '').replace(/```\n?/g, '');
                            const recipe = JSON.parse(cleanedResponse) as Recipe;
                            
                            setGeneratedRecipe(recipe);
                            console.log('[Recipe] Generated recipe successfully');
                          } catch (error) {
                            console.error('[Recipe] Failed to generate recipe:', error);
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
                            <Text style={styles.generateRecipeButtonText}>Generating Recipe...</Text>
                          </>
                        ) : (
                          <>
                            <ChefHat color="#FFFFFF" size={20} />
                            <Text style={styles.generateRecipeButtonText}>Generate Full Recipe</Text>
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

        <Modal
          visible={modalData !== null}
          animationType="slide"
          transparent
          onRequestClose={() => setModalData(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{modalData?.title}</Text>
                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={() => setModalData(null)}
                >
                  <X color={Colors.textSecondary} size={24} />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.modalScrollView}
                showsVerticalScrollIndicator={false}
              >
                {modalData?.type === 'avgScore' && (
                  <View style={styles.modalSection}>
                    <View style={styles.scoreHeroSection}>
                      <View style={[styles.scoreCircle, { borderColor: getScoreColor(modalData.stats.avgScore) }]}>
                        <Text style={[styles.scoreCircleValue, { color: getScoreColor(modalData.stats.avgScore) }]}>
                          {modalData.stats.avgScore}
                        </Text>
                        <Text style={styles.scoreCircleLabel}>out of 100</Text>
                      </View>
                      <Text style={styles.scoreDescription}>
                        {getScoreMessage(modalData.stats.avgScore)}
                      </Text>
                    </View>

                    <View style={styles.statsGrid}>
                      <View style={styles.statCard}>
                        <Award color={Colors.success} size={24} />
                        <Text style={styles.statValue}>{modalData.stats.highScoreCount}</Text>
                        <Text style={styles.statLabel}>Healthy Items</Text>
                      </View>
                      <View style={styles.statCard}>
                        <Leaf color={Colors.secondary} size={24} />
                        <Text style={styles.statValue}>{modalData.stats.organicCount}</Text>
                        <Text style={styles.statLabel}>Organic</Text>
                      </View>
                      <View style={styles.statCard}>
                        <ShieldAlert color={Colors.warning} size={24} />
                        <Text style={styles.statValue}>{modalData.stats.totalAdditives}</Text>
                        <Text style={styles.statLabel}>Total Additives</Text>
                      </View>
                      <View style={styles.statCard}>
                        <AlertCircle color={Colors.danger} size={24} />
                        <Text style={styles.statValue}>{modalData.stats.lowScoreCount}</Text>
                        <Text style={styles.statLabel}>Need Attention</Text>
                      </View>
                    </View>

                    <View style={styles.recommendationBox}>
                      <Info color={Colors.primary} size={20} />
                      <View style={styles.recommendationContent}>
                        <Text style={styles.recommendationTitle}>Tips to Improve</Text>
                        <Text style={styles.recommendationText}>
                          {getRecommendations(modalData.stats)}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}

                {modalData && modalData.type === 'nutritionalNeeds' && (
                  <View style={styles.modalSection}>
                    <View style={styles.nutritionalNeedsContainer}>
                      <Text style={styles.nutritionalNeedsTitle}>Food Pyramid Overview</Text>
                      <Text style={styles.nutritionalNeedsSubtitle}>Based on your fridge items</Text>

                      <View style={styles.foodGroupsList}>
                        <FoodGroupItem 
                          category="Fruits & Vegetables"
                          items={modalData.items.filter(item => 
                            item.category.toLowerCase().includes('fruit') || 
                            item.category.toLowerCase().includes('vegetable') ||
                            item.category.toLowerCase().includes('produce')
                          )}
                          recommended="5-9 servings/day"
                        />
                        <FoodGroupItem 
                          category="Grains & Cereals"
                          items={modalData.items.filter(item => 
                            item.category.toLowerCase().includes('grain') || 
                            item.category.toLowerCase().includes('bread') ||
                            item.category.toLowerCase().includes('cereal') ||
                            item.category.toLowerCase().includes('pasta')
                          )}
                          recommended="6-8 servings/day"
                        />
                        <FoodGroupItem 
                          category="Protein Foods"
                          items={modalData.items.filter(item => 
                            item.category.toLowerCase().includes('meat') || 
                            item.category.toLowerCase().includes('fish') ||
                            item.category.toLowerCase().includes('poultry') ||
                            item.category.toLowerCase().includes('eggs') ||
                            item.category.toLowerCase().includes('beans')
                          )}
                          recommended="2-3 servings/day"
                        />
                        <FoodGroupItem 
                          category="Dairy"
                          items={modalData.items.filter(item => 
                            item.category.toLowerCase().includes('dairy') || 
                            item.category.toLowerCase().includes('milk') ||
                            item.category.toLowerCase().includes('cheese') ||
                            item.category.toLowerCase().includes('yogurt')
                          )}
                          recommended="2-3 servings/day"
                        />
                        <FoodGroupItem 
                          category="Fats & Oils"
                          items={modalData.items.filter(item => 
                            item.category.toLowerCase().includes('oil') || 
                            item.category.toLowerCase().includes('fat') ||
                            item.category.toLowerCase().includes('butter')
                          )}
                          recommended="Use sparingly"
                        />
                      </View>
                    </View>
                  </View>
                )}

                {modalData && modalData.type !== 'avgScore' && modalData.type !== 'nutritionalNeeds' && (
                  <View style={styles.modalSection}>
                    {modalData.items.length === 0 ? (
                      <View style={styles.emptyModalState}>
                        <Text style={styles.emptyModalText}>No items in this category</Text>
                      </View>
                    ) : (
                      <>
                        <View style={styles.modalSummary}>
                          <Text style={styles.modalSummaryText}>
                            {modalData.items.length} {modalData.items.length === 1 ? 'item' : 'items'} found
                          </Text>
                        </View>
                        {modalData.items.map((item, index) => (
                          <View key={index} style={styles.modalItemCard}>
                            <Image source={{ uri: item.imageUrl }} style={styles.modalItemImage} />
                            <View style={styles.modalItemInfo}>
                              <Text style={styles.modalItemName}>{item.name}</Text>
                              <Text style={styles.modalItemBrand}>{item.brand}</Text>
                              <View style={styles.modalItemMeta}>
                                <View style={[styles.modalItemBadge, { backgroundColor: getScoreColor(item.healthScore) + '20' }]}>
                                  <Text style={[styles.modalItemBadgeText, { color: getScoreColor(item.healthScore) }]}>
                                    Score: {item.healthScore}
                                  </Text>
                                </View>
                                {item.isOrganic && (
                                  <View style={[styles.modalItemBadge, { backgroundColor: Colors.secondaryLight }]}>
                                    <Leaf color={Colors.secondary} size={12} />
                                    <Text style={[styles.modalItemBadgeText, { color: Colors.secondary }]}>Organic</Text>
                                  </View>
                                )}
                                {item.additives.length > 0 && (
                                  <View style={[styles.modalItemBadge, { backgroundColor: Colors.warningLight }]}>
                                    <Text style={[styles.modalItemBadgeText, { color: Colors.warning }]}>
                                      {item.additives.length} additives
                                    </Text>
                                  </View>
                                )}
                              </View>
                              {modalData.type === 'additives' && item.additives.length > 0 && (
                                <View style={styles.additivesList}>
                                  <Text style={styles.additivesListTitle}>Additives:</Text>
                                  {item.additives.slice(0, 3).map((additive, idx) => (
                                    <Text key={idx} style={styles.additiveItem}>• {additive}</Text>
                                  ))}
                                  {item.additives.length > 3 && (
                                    <Text style={styles.additivesMore}>+{item.additives.length - 3} more</Text>
                                  )}
                                </View>
                              )}
                            </View>
                          </View>
                        ))}
                      </>
                    )}
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>

        <Modal
          visible={showAddMealModal}
          animationType="slide"
          transparent
          onRequestClose={() => setShowAddMealModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.addMealModalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add to {selectedMealType.charAt(0).toUpperCase() + selectedMealType.slice(1)}</Text>
                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={() => setShowAddMealModal(false)}
                >
                  <X color={Colors.textSecondary} size={24} />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.modalScrollView}
                contentContainerStyle={styles.addMealModalContent}
                showsVerticalScrollIndicator={false}
              >
                <TouchableOpacity
                  style={styles.scanNewItemButton}
                  onPress={() => {
                    setShowAddMealModal(false);
                    router.push({
                      pathname: '/scanner',
                      params: {
                        fromMealTracker: 'true',
                        mealType: selectedMealType,
                        date: selectedDate,
                      },
                    });
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.scanNewItemIcon}>
                    <ScanLine color="#FFFFFF" size={24} />
                  </View>
                  <View style={styles.scanNewItemContent}>
                    <Text style={styles.scanNewItemTitle}>Scan New Item</Text>
                    <Text style={styles.scanNewItemSubtitle}>Add a product to your tracker</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.manualEntryButton}
                  onPress={() => {
                    setShowAddMealModal(false);
                    setShowManualEntryModal(true);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.manualEntryIcon}>
                    <Type color={Colors.primary} size={24} />
                  </View>
                  <View style={styles.manualEntryContent}>
                    <Text style={styles.manualEntryTitle}>Type What You Ate</Text>
                    <Text style={styles.manualEntrySubtitle}>AI will estimate nutrition facts</Text>
                  </View>
                </TouchableOpacity>

                {fridgeItems.length > 0 ? (
                  fridgeItems.map((product) => (
                    <TouchableOpacity
                      key={product.barcode}
                      style={styles.addMealProductItem}
                      onPress={() => {
                        addMeal(selectedDate, selectedMealType, product);
                        setShowAddMealModal(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <Image source={{ uri: product.imageUrl }} style={styles.addMealProductImage} />
                      <View style={styles.addMealProductInfo}>
                        <Text style={styles.addMealProductName} numberOfLines={1}>{product.name}</Text>
                        <Text style={styles.addMealProductBrand} numberOfLines={1}>{product.brand}</Text>
                        <View style={styles.addMealProductMeta}>
                          <View style={[styles.addMealProductBadge, { backgroundColor: getScoreColor(product.healthScore) + '20' }]}>
                            <Text style={[styles.addMealProductBadgeText, { color: getScoreColor(product.healthScore) }]}>
                              Score: {product.healthScore}
                            </Text>
                          </View>
                          {product.isOrganic && (
                            <View style={[styles.addMealProductBadge, { backgroundColor: Colors.successLight }]}>
                              <Leaf color={Colors.success} size={12} />
                              <Text style={[styles.addMealProductBadgeText, { color: Colors.success }]}>Organic</Text>
                            </View>
                          )}
                        </View>
                      </View>
                      <Plus color={Colors.primary} size={20} />
                    </TouchableOpacity>
                  ))
                ) : (
                  <View style={styles.emptyFridgeInModal}>
                    <Refrigerator color={Colors.textMuted} size={48} />
                    <Text style={styles.emptyFridgeInModalText}>No items in your fridge</Text>
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>

        <Modal
          visible={showGroceryListModal}
          animationType="slide"
          transparent
          onRequestClose={() => setShowGroceryListModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.groceryListModalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Grocery List</Text>
                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={() => setShowGroceryListModal(false)}
                >
                  <X color={Colors.textSecondary} size={24} />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.modalScrollView}
                contentContainerStyle={styles.groceryListModalContent}
                showsVerticalScrollIndicator={false}
              >
                {groceryList.length === 0 ? (
                  <View style={styles.emptyGroceryList}>
                    <View style={styles.emptyIconContainer}>
                      <ShoppingCart color={Colors.textMuted} size={48} />
                    </View>
                    <Text style={styles.emptyTitle}>Your Grocery List is Empty</Text>
                    <Text style={styles.emptyText}>
                      Add items from your fridge to create a shopping list
                    </Text>
                  </View>
                ) : (
                  <>
                    <View style={styles.groceryListHeader}>
                      <Text style={styles.groceryListCount}>{groceryList.length} {groceryList.length === 1 ? 'item' : 'items'}</Text>
                    </View>
                    {groceryList.map((item) => {
                      const imageUrl = item.webImageUrl && item.webImageUrl.startsWith('http') 
                        ? item.webImageUrl 
                        : item.imageUrl;
                      return (
                        <View key={item.barcode} style={styles.groceryListItem}>
                          <Image source={{ uri: imageUrl }} style={styles.groceryListItemImage} />
                          <View style={styles.groceryListItemInfo}>
                            <Text style={styles.groceryListItemName} numberOfLines={1}>
                              {item.name}
                            </Text>
                            <Text style={styles.groceryListItemBrand}>{item.brand}</Text>
                            <View style={styles.groceryListItemMeta}>
                              <View style={[styles.groceryListItemBadge, { backgroundColor: getScoreColor(item.healthScore) + '20' }]}>
                                <Text style={[styles.groceryListItemBadgeText, { color: getScoreColor(item.healthScore) }]}>Score: {item.healthScore}</Text>
                              </View>
                              {item.isOrganic && (
                                <View style={[styles.groceryListItemBadge, { backgroundColor: Colors.successLight }]}>
                                  <Leaf color={Colors.success} size={10} />
                                  <Text style={[styles.groceryListItemBadgeText, { color: Colors.success }]}>Organic</Text>
                                </View>
                              )}
                            </View>
                          </View>
                          <TouchableOpacity
                            style={styles.removeFromGroceryButton}
                            onPress={() => removeFromGroceryList(item.barcode)}
                          >
                            <X color={Colors.danger} size={20} />
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>

        <Modal
          visible={showManualEntryModal}
          animationType="fade"
          transparent
          onRequestClose={() => {
            setShowManualEntryModal(false);
            setManualEntryText('');
          }}
        >
          <TouchableOpacity 
            style={styles.manualEntryModalOverlay}
            activeOpacity={1}
            onPress={() => {
              setShowManualEntryModal(false);
              setManualEntryText('');
            }}
          >
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.manualEntryKeyboardAvoid}
              keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
            >
              <TouchableOpacity 
                style={styles.manualEntryModalContainerTop}
                activeOpacity={1}
                onPress={(e) => e.stopPropagation()}
              >
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>What Did You Eat?</Text>
                  <TouchableOpacity
                    style={styles.modalCloseButton}
                    onPress={() => {
                      setShowManualEntryModal(false);
                      setManualEntryText('');
                    }}
                  >
                    <X color={Colors.textSecondary} size={24} />
                  </TouchableOpacity>
                </View>

                <View style={styles.manualEntryContent}>
                  <Text style={styles.manualEntryInstructions}>
                    Describe what you ate and AI will estimate the nutrition facts.
                    Be as specific as possible for better accuracy.
                  </Text>
                  
                  <TextInput
                    style={styles.manualEntryInput}
                    placeholder="e.g., 2 scrambled eggs with cheese and toast"
                    placeholderTextColor={Colors.textMuted}
                    value={manualEntryText}
                    onChangeText={setManualEntryText}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    autoFocus
                  />

                  <TouchableOpacity
                    style={[
                      styles.processManualEntryButton,
                      (!manualEntryText.trim() || isProcessingManualEntry) && styles.processManualEntryButtonDisabled
                    ]}
                    onPress={async () => {
                    if (!manualEntryText.trim() || isProcessingManualEntry) return;
                    
                    setIsProcessingManualEntry(true);
                    try {
                      console.log('[ManualEntry] Processing:', manualEntryText);
                      
                      const prompt = `Analyze this food description and provide nutrition information: "${manualEntryText}"

Estimate the nutritional values based on typical serving sizes. Return ONLY a JSON object with this structure:
{
  "name": "Brief name for this meal",
  "brand": "Homemade" or "Restaurant" or specific brand if mentioned,
  "calories": number (estimated calories),
  "protein": number (grams),
  "carbohydrates": number (grams),
  "fat": number (grams),
  "fiber": number (grams),
  "sugar": number (grams),
  "sodium": number (mg),
  "healthScore": number (0-100, based on nutritional quality)
}

Only return the JSON, no additional text.`;

                      const response = await generateText({ messages: [{ role: 'user', content: prompt }] });
                      
                      console.log('[ManualEntry] AI Response:', response);
                      
                      const cleanedResponse = response.trim().replace(/```json\n?/g, '').replace(/```\n?/g, '');
                      const nutritionData = JSON.parse(cleanedResponse);
                      
                      const manualProduct: Product = {
                        id: `manual_${Date.now()}`,
                        barcode: `manual_${Date.now()}`,
                        name: nutritionData.name,
                        brand: nutritionData.brand || 'Manual Entry',
                        category: 'Manual Entry',
                        imageUrl: 'https://via.placeholder.com/150/8B5CF6/FFFFFF?text=Manual',
                        webImageUrl: 'https://via.placeholder.com/150/8B5CF6/FFFFFF?text=Manual',
                        healthScore: nutritionData.healthScore,
                        isOrganic: false,
                        isVegan: false,
                        isGlutenFree: false,
                        ingredients: [manualEntryText],
                        allergens: [],
                        additives: [],
                        nutrition: {
                          calories: nutritionData.calories,
                          protein: nutritionData.protein,
                          carbohydrates: nutritionData.carbohydrates,
                          fat: nutritionData.fat,
                          saturatedFat: nutritionData.saturatedFat || Math.round(nutritionData.fat * 0.3),
                          fiber: nutritionData.fiber || 0,
                          sugar: nutritionData.sugar || 0,
                          sodium: nutritionData.sodium || 0,
                          servingSize: '1 serving',
                        },
                      };
                      
                      addMeal(selectedDate, selectedMealType, manualProduct);
                      setShowManualEntryModal(false);
                      setManualEntryText('');
                      
                      console.log('[ManualEntry] Added manual entry successfully');
                    } catch (error) {
                      console.error('[ManualEntry] Failed to process:', error);
                      Alert.alert(
                        'Error',
                        'Failed to process your entry. Please try again with a more detailed description.'
                      );
                    } finally {
                      setIsProcessingManualEntry(false);
                    }
                  }}
                  activeOpacity={0.7}
                  disabled={!manualEntryText.trim() || isProcessingManualEntry}
                >
                  {isProcessingManualEntry ? (
                    <>
                      <ActivityIndicator size="small" color="#FFFFFF" />
                      <Text style={styles.processManualEntryButtonText}>Processing...</Text>
                    </>
                  ) : (
                    <>
                      <Sparkles color="#FFFFFF" size={20} />
                      <Text style={styles.processManualEntryButtonText}>Add to Tracker</Text>
                    </>
                  )}
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            </KeyboardAvoidingView>
          </TouchableOpacity>
        </Modal>
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
    height: 300,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  groceryListButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primaryLight,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  groceryListButtonText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  groceryListBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: Colors.danger,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  groceryListBadgeText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  fridgeSection: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  countBadge: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  fridgeList: {
    paddingBottom: 16,
    gap: 12,
  },
  fridgeItemCard: {
    width: 140,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  fridgeItemImage: {
    width: '100%',
    height: 80,
    borderRadius: 8,
    backgroundColor: Colors.surfaceSecondary,
    marginBottom: 8,
  },
  fridgeItemInfo: {
    marginBottom: 8,
  },
  fridgeItemName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 2,
  },
  fridgeItemBrand: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  fridgeItemActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  addToGroceryButton: {
    padding: 6,
    backgroundColor: Colors.primaryLight,
    borderRadius: 8,
  },
  removeButton: {
    padding: 6,
  },
  generateButton: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  generateButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  tabSection: {
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
  },
  tabActive: {
    backgroundColor: Colors.primaryLight,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: Colors.primary,
  },
  insightsSection: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  mealsSection: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  mealsBars: {
    gap: 12,
  },
  mealBar: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  mealBarLeft: {
    marginRight: 12,
  },

  mealHealthScore: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  mealBarContent: {
    flex: 1,
  },
  mealBarName: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 4,
    lineHeight: 22,
  },
  mealBarDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 8,
    lineHeight: 18,
  },
  mealBarMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  mealBarDivider: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  mealMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  mealMetaText: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  ingredientBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  ingredientBadgeText: {
    fontSize: 10,
    fontWeight: '600' as const,
  },
  emptyMealsState: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptyMealsTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  emptyMealsText: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  trackerSection: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  trackerViewToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  trackerViewButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  trackerViewButtonActive: {
    backgroundColor: Colors.primaryLight,
  },
  trackerViewButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  trackerViewButtonTextActive: {
    color: Colors.primary,
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  dateSelectorButton: {
    padding: 8,
  },
  dateSelectorArrow: {
    fontSize: 20,
    color: Colors.primary,
    fontWeight: '600' as const,
  },
  dateSelectorCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateSelectorText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  mealTypesList: {
    gap: 16,
    marginBottom: 20,
    marginTop: 12,
  },
  collapsibleSection: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
  },
  collapsibleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  collapsibleHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  collapsibleIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  collapsibleTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  mealTypeSection: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
  },
  mealTypeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  mealTypeHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  mealTypeIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mealTypeTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  mealTypeCount: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  mealTypeCountText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  addMealButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mealsList: {
    gap: 8,
  },
  trackedMealItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 12,
    padding: 10,
  },
  trackedMealImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: Colors.background,
    marginRight: 12,
  },
  trackedMealInfo: {
    flex: 1,
  },
  trackedMealName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  trackedMealMeta: {
    flexDirection: 'row',
    gap: 6,
  },
  trackedMealBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  trackedMealBadgeText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  removeMealButton: {
    padding: 6,
  },
  noMealsText: {
    fontSize: 13,
    color: Colors.textMuted,
    fontStyle: 'italic' as const,
  },
  waterTrackerCard: {
    padding: 20,
    paddingTop: 8,
    marginBottom: 20,
  },
  waterTrackerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  waterTrackerHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  waterTrackerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  waterTrackerTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  waterTrackerSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  waterTrackerContent: {
    gap: 16,
  },
  waterCupsDisplay: {
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: Colors.infoLight,
    borderRadius: 12,
  },
  waterCupsValue: {
    fontSize: 48,
    fontWeight: '700' as const,
    color: Colors.info,
  },
  waterCupsLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  waterButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  waterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.info,
    paddingVertical: 14,
    borderRadius: 12,
  },
  waterButtonRemove: {
    borderColor: Colors.danger,
    opacity: 1,
  },
  waterButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.info,
  },
  scanNewItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  scanNewItemIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  scanNewItemContent: {
    flex: 1,
  },
  scanNewItemTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  scanNewItemSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  dayStatsCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    marginTop: 8,
  },
  dayStatsTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 16,
  },
  dayStatsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  dayStatItem: {
    alignItems: 'center',
  },
  dayStatValue: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  dayStatLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  periodStatsContainer: {
    gap: 20,
  },
  emptyPeriodStats: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptyPeriodStatsTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  emptyPeriodStatsText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  periodStatsHeader: {
    marginBottom: 8,
  },
  periodStatsTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  periodStatsSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  periodStatsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  periodStatCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  periodStatValue: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  periodStatLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  mostTrackedSection: {
    marginTop: 8,
  },
  mostTrackedTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 12,
  },
  mostTrackedCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  mostTrackedText: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  topProductsSection: {
    marginTop: 8,
  },
  topProductsTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 12,
  },
  topProductItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  topProductRank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  topProductRankText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.primary,
  },
  topProductImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: Colors.surfaceSecondary,
    marginRight: 12,
  },
  topProductInfo: {
    flex: 1,
  },
  topProductName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 2,
  },
  topProductCount: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  topProductScore: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  topProductScoreText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  addMealModalContainer: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  addMealModalContent: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  addMealProductItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  addMealProductImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: Colors.surfaceSecondary,
    marginRight: 12,
  },
  addMealProductInfo: {
    flex: 1,
  },
  addMealProductName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 2,
  },
  addMealProductBrand: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  addMealProductMeta: {
    flexDirection: 'row',
    gap: 6,
  },
  addMealProductBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  addMealProductBadgeText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  emptyFridgeInModal: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptyFridgeInModalText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  mealModalContainer: {
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
  mealDetailContent: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  mealDetailMeta: {
    flexDirection: 'row',
    gap: 16,
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
  readyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryLight,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 10,
    marginTop: 8,
  },
  readyBannerText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.primary,
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
  insightsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  insightCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  insightIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  insightValue: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  insightLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
  },

  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  loadingSubtext: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 0,
  },
  regenerateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.primaryLight,
    borderRadius: 12,
  },
  regenerateButtonText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.primary,
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
    maxHeight: '85%',
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
  modalSection: {
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  scoreHeroSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  scoreCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: Colors.surface,
  },
  scoreCircleValue: {
    fontSize: 48,
    fontWeight: '700' as const,
  },
  scoreCircleLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  scoreDescription: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 32,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 24,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  recommendationBox: {
    flexDirection: 'row',
    backgroundColor: Colors.primaryLight,
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
    gap: 12,
  },
  recommendationContent: {
    flex: 1,
  },
  recommendationTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.primary,
    marginBottom: 4,
  },
  recommendationText: {
    fontSize: 13,
    color: Colors.text,
    lineHeight: 20,
  },
  modalSummary: {
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    marginBottom: 16,
  },
  modalSummaryText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  modalItemCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  modalItemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: Colors.surfaceSecondary,
  },
  modalItemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  modalItemName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 2,
  },
  modalItemBrand: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  modalItemMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  modalItemBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  modalItemBadgeText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  additivesList: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  additivesListTitle: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  additiveItem: {
    fontSize: 11,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  additivesMore: {
    fontSize: 11,
    color: Colors.warning,
    fontWeight: '500' as const,
    marginTop: 2,
  },
  emptyModalState: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyModalText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  nutritionalNeedsContainer: {
    paddingVertical: 8,
  },
  nutritionalNeedsTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  nutritionalNeedsSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 20,
  },
  foodGroupsList: {
    gap: 12,
  },
  foodGroupItem: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  foodGroupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  foodGroupCategory: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  foodGroupStatus: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  foodGroupStatusText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  foodGroupRecommended: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  foodGroupMissing: {
    fontSize: 12,
    color: Colors.danger,
    fontStyle: 'italic' as const,
    marginTop: 4,
  },
  servingSizeControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  servingSizeButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  servingSizeText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600' as const,
  },
  nutrientTrackersCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  nutrientTrackersTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 16,
  },
  nutrientTrackersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'space-around',
  },
  nutrientTrackerItem: {
    alignItems: 'center',
    gap: 8,
  },
  nutrientTrackerValue: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
    marginTop: 8,
  },
  nutrientTrackerGoal: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  nutrientTrackerLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600' as const,
  },
  regenerateMealsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primaryLight,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 12,
  },
  regenerateMealsButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  groceryListModalContainer: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  groceryListModalContent: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  groceryListHeader: {
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    marginBottom: 16,
  },
  groceryListCount: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  groceryListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  groceryListItemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: Colors.surfaceSecondary,
    marginRight: 12,
  },
  groceryListItemInfo: {
    flex: 1,
  },
  groceryListItemName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 2,
  },
  groceryListItemBrand: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  groceryListItemMeta: {
    flexDirection: 'row',
    gap: 6,
  },
  groceryListItemBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  groceryListItemBadgeText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  removeFromGroceryButton: {
    padding: 8,
  },
  emptyGroceryList: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  manualEntryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  manualEntryIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  manualEntryTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  manualEntrySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  manualEntryModalContainer: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  manualEntryModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  manualEntryKeyboardAvoid: {
    width: '100%',
  },
  manualEntryModalContainerTop: {
    backgroundColor: Colors.background,
    borderRadius: 24,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  manualEntryContent: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 24,
  },
  manualEntryInstructions: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: 16,
    textAlign: 'center',
  },
  manualEntryInput: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 18,
    fontSize: 16,
    color: Colors.text,
    minHeight: 140,
    maxHeight: 200,
    borderWidth: 2,
    borderColor: Colors.primary,
    marginBottom: 20,
  },
  processManualEntryButton: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 16,
    gap: 10,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  processManualEntryButtonDisabled: {
    backgroundColor: Colors.textMuted,
    shadowOpacity: 0,
    elevation: 0,
  },
  processManualEntryButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  periodNutritionSection: {
    marginTop: 8,
  },
  periodNutritionTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 16,
  },
  periodNutritionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  periodNutritionCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  periodNutritionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  periodNutritionValue: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  periodNutritionLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  periodNutritionGoal: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  goalsMetSection: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    marginTop: 20,
  },
  goalsMetTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  goalsMetSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  goalsMetList: {
    gap: 12,
  },
  goalsMetItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  goalsMetItemWithBar: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  goalsMetItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  goalsMetProgressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  goalsMetProgressFill: {
    height: '100%',
    borderRadius: 4,
    minWidth: 2,
  },
  goalsMetItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  goalsMetItemLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  goalsMetItemValue: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  trackerPaywallSection: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  trackerPaywallCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  trackerPaywallIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  trackerPaywallTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  trackerPaywallDescription: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  trackerPaywallFeatures: {
    width: '100%',
    marginBottom: 28,
    gap: 12,
  },
  trackerPaywallFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  trackerPaywallFeatureDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  trackerPaywallFeatureText: {
    fontSize: 15,
    color: Colors.text,
    flex: 1,
  },
  trackerPaywallButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    gap: 10,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
    width: '100%',
  },
  trackerPaywallButtonText: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  insightsPaywallSection: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  insightsPaywallCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  insightsPaywallIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  insightsPaywallTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  insightsPaywallDescription: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  insightsPaywallFeatures: {
    width: '100%',
    marginBottom: 28,
    gap: 12,
  },
  insightsPaywallFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  insightsPaywallFeatureDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  insightsPaywallFeatureText: {
    fontSize: 15,
    color: Colors.text,
    flex: 1,
  },
  insightsPaywallButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    gap: 10,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
    width: '100%',
  },
  insightsPaywallButtonText: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  mealsPaywallSection: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  mealsPaywallCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  mealsPaywallIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  mealsPaywallTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  mealsPaywallDescription: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  mealsPaywallFeatures: {
    width: '100%',
    marginBottom: 28,
    gap: 12,
  },
  mealsPaywallFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  mealsPaywallFeatureDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  mealsPaywallFeatureText: {
    fontSize: 15,
    color: Colors.text,
    flex: 1,
  },
  mealsPaywallButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    gap: 10,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
    width: '100%',
  },
  mealsPaywallButtonText: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
});

function getScoreColor(score: number): string {
  if (score >= 80) return Colors.success;
  if (score >= 60) return Colors.warning;
  return Colors.danger;
}

function getScoreMessage(score: number): string {
  if (score >= 85) return 'Excellent! Your fridge is stocked with very healthy items.';
  if (score >= 75) return 'Great job! Your fridge has mostly healthy options.';
  if (score >= 65) return 'Good! There\'s room for improvement with some healthier choices.';
  if (score >= 50) return 'Fair. Consider adding more whole, unprocessed foods.';
  return 'Time to upgrade! Focus on organic, additive-free products.';
}

function getRecommendations(stats: { avgScore: number; organicCount: number; totalAdditives: number; lowScoreCount: number }): string {
  const tips: string[] = [];
  
  if (stats.totalAdditives > 10) {
    tips.push('Try to reduce products with additives and preservatives');
  }
  
  if (stats.organicCount < stats.lowScoreCount) {
    tips.push('Consider choosing more organic products for better nutrition');
  }
  
  if (stats.lowScoreCount > 3) {
    tips.push('Replace low-scoring items with whole, unprocessed alternatives');
  }
  
  if (tips.length === 0) {
    return 'Keep up the great work! Your fridge has a healthy selection.';
  }
  
  return tips.join('. ') + '.';
}
