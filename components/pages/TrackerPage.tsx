import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Modal,
  Platform,
} from 'react-native';
import { useRouter, Href } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Calendar, ChevronLeft, ChevronRight, Plus, X, Droplets, Coffee, Utensils, Moon, Apple, Minus } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useMealTracker, MealType } from '@/providers/MealTrackerProvider';
import { useFridge } from '@/providers/FridgeProvider';
import { useSettings } from '@/providers/SettingsProvider';
import { useSubscription } from '@/providers/SubscriptionProvider';
import { getHealthScoreColor } from '@/types/product';
import NutrientProgressBar from '@/components/NutrientProgressBar';
import * as Haptics from 'expo-haptics';

function getLocalDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const MEAL_ICONS = {
  breakfast: Coffee,
  lunch: Utensils,
  dinner: Moon,
  snack: Apple,
};

const MEAL_LABELS = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};

export default function TrackerPage() {
  const router = useRouter();
  const { fridgeItems } = useFridge();
  const { bodyweight, fitnessGoal } = useSettings();
  const { isPremium } = useSubscription();
  const {
    addMeal,
    removeMeal,
    getMealsForDateAndType,
    getDayStats,
    addWater,
    removeWater,
    getWaterForDate,
    calculateNutrientGoals,
  } = useMealTracker();

  const [selectedDate, setSelectedDate] = useState<string>(getLocalDateString());
  const [calendarView, setCalendarView] = useState<'day' | 'week' | 'month'>('day');
  const [showAddMealModal, setShowAddMealModal] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState<MealType>('breakfast');

  const dayStats = useMemo(() => getDayStats(selectedDate), [selectedDate, getDayStats]);
  const nutrientGoals = useMemo(() => calculateNutrientGoals(bodyweight, fitnessGoal), [bodyweight, fitnessGoal, calculateNutrientGoals]);
  const waterIntake = useMemo(() => getWaterForDate(selectedDate), [selectedDate, getWaterForDate]);

  const handleDateChange = (direction: 'prev' | 'next') => {
    const date = new Date(selectedDate);
    if (calendarView === 'day') {
      date.setDate(date.getDate() + (direction === 'next' ? 1 : -1));
    } else if (calendarView === 'week') {
      date.setDate(date.getDate() + (direction === 'next' ? 7 : -7));
    } else {
      date.setMonth(date.getMonth() + (direction === 'next' ? 1 : -1));
    }
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  const handleToday = () => {
    setSelectedDate(getLocalDateString());
  };

  const handleAddMeal = (mealType: MealType) => {
    setSelectedMealType(mealType);
    setShowAddMealModal(true);
  };

  const handleSelectProduct = (product: typeof fridgeItems[0]) => {
    addMeal(selectedDate, selectedMealType, product);
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setShowAddMealModal(false);
  };

  const handleAddWater = () => {
    addWater(selectedDate, 1);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleRemoveWater = () => {
    if (waterIntake > 0) {
      removeWater(selectedDate, 1);
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }
  };

  const handlePaywallPress = () => {
    router.push('/paywall' as Href);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

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
            <View style={styles.calendarIcon}>
              <LinearGradient
                colors={[Colors.primary, Colors.primaryDark]}
                style={styles.calendarIconGradient}
              >
                <Calendar color="#FFFFFF" size={64} />
              </LinearGradient>
            </View>

            <Text style={styles.paywallTitle}>Unlock Meal Tracker</Text>
            <Text style={styles.paywallDescription}>
              Track your meals, monitor nutrition, and achieve your health goals with NutriScan Premium
            </Text>

            <View style={styles.paywallFeatures}>
              <View style={styles.paywallFeature}>
                <View style={styles.paywallFeatureDot} />
                <Text style={styles.paywallFeatureText}>Daily meal logging</Text>
              </View>
              <View style={styles.paywallFeature}>
                <View style={styles.paywallFeatureDot} />
                <Text style={styles.paywallFeatureText}>Nutrition tracking & goals</Text>
              </View>
              <View style={styles.paywallFeature}>
                <View style={styles.paywallFeatureDot} />
                <Text style={styles.paywallFeatureText}>Water intake monitoring</Text>
              </View>
              <View style={styles.paywallFeature}>
                <View style={styles.paywallFeatureDot} />
                <Text style={styles.paywallFeatureText}>Calendar views (day/week/month)</Text>
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
          <Text style={styles.title}>Meal Tracker</Text>
        </View>

        <View style={styles.calendarControls}>
          <View style={styles.viewToggle}>
            <TouchableOpacity
              style={[styles.viewButton, calendarView === 'day' && styles.viewButtonActive]}
              onPress={() => setCalendarView('day')}
            >
              <Text style={[styles.viewButtonText, calendarView === 'day' && styles.viewButtonTextActive]}>
                Day
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.viewButton, calendarView === 'week' && styles.viewButtonActive]}
              onPress={() => setCalendarView('week')}
            >
              <Text style={[styles.viewButtonText, calendarView === 'week' && styles.viewButtonTextActive]}>
                Week
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.viewButton, calendarView === 'month' && styles.viewButtonActive]}
              onPress={() => setCalendarView('month')}
            >
              <Text style={[styles.viewButtonText, calendarView === 'month' && styles.viewButtonTextActive]}>
                Month
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.dateNavigation}>
            <TouchableOpacity style={styles.navButton} onPress={() => handleDateChange('prev')}>
              <ChevronLeft color={Colors.primary} size={24} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.dateDisplay} onPress={handleToday}>
              <Text style={styles.dateText}>{formatDate(selectedDate)}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.navButton} onPress={() => handleDateChange('next')}>
              <ChevronRight color={Colors.primary} size={24} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.statsSection}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Calories</Text>
            <Text style={[styles.statValue, { color: getHealthScoreColor(75) }]}>
              {dayStats.totalCalories}
            </Text>
            <Text style={styles.statGoal}>/ {nutrientGoals.calories}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Protein</Text>
            <Text style={[styles.statValue, { color: Colors.primary }]}>
              {dayStats.totalProtein}g
            </Text>
            <Text style={styles.statGoal}>/ {nutrientGoals.protein}g</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Meals</Text>
            <Text style={[styles.statValue, { color: Colors.success }]}>
              {dayStats.totalItems}
            </Text>
          </View>
        </View>

        <View style={styles.nutrientsSection}>
          <Text style={styles.sectionTitle}>Daily Nutrition</Text>
          <NutrientProgressBar
            label="Calories"
            current={dayStats.totalCalories}
            goal={nutrientGoals.calories}
            unit="kcal"
            color={Colors.primary}
            icon={<Apple color={Colors.primary} size={16} />}
          />
          <NutrientProgressBar
            label="Protein"
            current={dayStats.totalProtein}
            goal={nutrientGoals.protein}
            unit="g"
            color={Colors.success}
            icon={<Coffee color={Colors.success} size={16} />}
          />
          <NutrientProgressBar
            label="Carbs"
            current={dayStats.totalCarbs}
            goal={nutrientGoals.carbs}
            unit="g"
            color={Colors.warning}
            icon={<Utensils color={Colors.warning} size={16} />}
          />
          <NutrientProgressBar
            label="Fat"
            current={dayStats.totalFat}
            goal={nutrientGoals.fat}
            unit="g"
            color={Colors.secondary}
            icon={<Moon color={Colors.secondary} size={16} />}
          />
        </View>

        <View style={styles.waterSection}>
          <View style={styles.waterHeader}>
            <Droplets color={Colors.secondary} size={24} />
            <Text style={styles.sectionTitle}>Water Intake</Text>
          </View>
          <View style={styles.waterControls}>
            <TouchableOpacity
              style={styles.waterButton}
              onPress={handleRemoveWater}
              disabled={waterIntake === 0}
            >
              <Minus color={waterIntake === 0 ? Colors.textMuted : Colors.primary} size={20} />
            </TouchableOpacity>
            <View style={styles.waterDisplay}>
              <Text style={styles.waterValue}>{waterIntake}</Text>
              <Text style={styles.waterGoal}>/ {nutrientGoals.water} cups</Text>
            </View>
            <TouchableOpacity style={styles.waterButton} onPress={handleAddWater}>
              <Plus color={Colors.primary} size={20} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.mealsSection}>
          <Text style={styles.sectionTitle}>Meals</Text>
          {(['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map((mealType) => {
            const meals = getMealsForDateAndType(selectedDate, mealType);
            const MealIcon = MEAL_ICONS[mealType];
            
            return (
              <View key={mealType} style={styles.mealTypeSection}>
                <View style={styles.mealTypeHeader}>
                  <View style={styles.mealTypeLabel}>
                    <MealIcon color={Colors.primary} size={20} />
                    <Text style={styles.mealTypeName}>{MEAL_LABELS[mealType]}</Text>
                    {meals.length > 0 && (
                      <View style={styles.mealCount}>
                        <Text style={styles.mealCountText}>{meals.length}</Text>
                      </View>
                    )}
                  </View>
                  <TouchableOpacity
                    style={styles.addMealButton}
                    onPress={() => handleAddMeal(mealType)}
                  >
                    <Plus color={Colors.primary} size={20} />
                  </TouchableOpacity>
                </View>

                {meals.map((meal) => (
                  <View key={meal.id} style={styles.mealCard}>
                    <Image source={{ uri: meal.product.imageUrl }} style={styles.mealImage} />
                    <View style={styles.mealInfo}>
                      <Text style={styles.mealName} numberOfLines={1}>
                        {meal.product.name}
                      </Text>
                      <Text style={styles.mealBrand}>{meal.product.brand}</Text>
                      <Text style={styles.mealCalories}>
                        {Math.round(meal.product.nutrition.calories * meal.servings)} cal
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.removeMealButton}
                      onPress={() => removeMeal(meal.id)}
                    >
                      <X color={Colors.danger} size={18} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            );
          })}
        </View>
      </ScrollView>

      <Modal
        visible={showAddMealModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAddMealModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add to {MEAL_LABELS[selectedMealType]}</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowAddMealModal(false)}
              >
                <X color={Colors.textSecondary} size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {fridgeItems.length === 0 ? (
                <View style={styles.emptyFridgeModal}>
                  <Text style={styles.emptyFridgeText}>
                    No items in your fridge. Add items by scanning products.
                  </Text>
                </View>
              ) : (
                fridgeItems.map((product) => (
                  <TouchableOpacity
                    key={product.barcode}
                    style={styles.productOption}
                    onPress={() => handleSelectProduct(product)}
                  >
                    <Image source={{ uri: product.imageUrl }} style={styles.productOptionImage} />
                    <View style={styles.productOptionInfo}>
                      <Text style={styles.productOptionName} numberOfLines={1}>
                        {product.name}
                      </Text>
                      <Text style={styles.productOptionBrand}>{product.brand}</Text>
                      <Text style={styles.productOptionCalories}>
                        {product.nutrition.calories} cal
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))
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
    paddingTop: 16,
    paddingBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  calendarControls: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  viewButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  viewButtonActive: {
    backgroundColor: Colors.primaryLight,
  },
  viewButtonText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
  },
  viewButtonTextActive: {
    color: Colors.primary,
    fontWeight: '700' as const,
  },
  dateNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateDisplay: {
    flex: 1,
    marginHorizontal: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    alignItems: 'center',
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  statsSection: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginBottom: 24,
    gap: 12,
  },
  statCard: {
    flex: 1,
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
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700' as const,
    marginBottom: 2,
  },
  statGoal: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  nutrientsSection: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 16,
  },
  waterSection: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  waterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  waterControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    gap: 24,
  },
  waterButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  waterDisplay: {
    alignItems: 'center',
  },
  waterValue: {
    fontSize: 36,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  waterGoal: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  mealsSection: {
    paddingHorizontal: 24,
  },
  mealTypeSection: {
    marginBottom: 24,
  },
  mealTypeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  mealTypeLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mealTypeName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  mealCount: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  mealCountText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  addMealButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mealCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    alignItems: 'center',
  },
  mealImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: Colors.surfaceSecondary,
  },
  mealInfo: {
    flex: 1,
    marginLeft: 12,
  },
  mealName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 2,
  },
  mealBrand: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  mealCalories: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '500' as const,
  },
  removeMealButton: {
    padding: 8,
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
    maxHeight: '80%',
    paddingBottom: 32,
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
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalScroll: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  productOption: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  productOptionImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: Colors.surfaceSecondary,
  },
  productOptionInfo: {
    flex: 1,
    marginLeft: 12,
  },
  productOptionName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 2,
  },
  productOptionBrand: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  productOptionCalories: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '500' as const,
  },
  emptyFridgeModal: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyFridgeText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  paywallContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 60,
  },
  calendarIcon: {
    marginBottom: 32,
  },
  calendarIconGradient: {
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
