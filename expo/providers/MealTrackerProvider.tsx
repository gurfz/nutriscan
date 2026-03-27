import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Product } from '@/types/product';

const MEAL_TRACKER_STORAGE_KEY = 'meal_tracker';

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface TrackedMeal {
  id: string;
  date: string;
  mealType: MealType;
  product: Product;
  timestamp: number;
  servings: number;
}

export interface WaterEntry {
  id: string;
  date: string;
  cups: number;
  timestamp: number;
}

export interface DayStats {
  totalItems: number;
  avgHealthScore: number;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  mealCounts: Record<MealType, number>;
  waterIntake: number;
}

export interface NutrientGoals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  water: number;
}

export interface PeriodStats {
  avgHealthScore: number;
  totalMeals: number;
  healthyMealsCount: number;
  mostTrackedMeal: MealType;
  topProducts: { product: Product; count: number }[];
  avgNutrients: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    water: number;
  };
  nutrientGoalsMet: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    water: number;
  };
}

const WATER_TRACKER_STORAGE_KEY = 'water_tracker';

export const [MealTrackerProvider, useMealTracker] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [trackedMeals, setTrackedMeals] = useState<TrackedMeal[]>([]);
  const [waterEntries, setWaterEntries] = useState<WaterEntry[]>([]);

  const mealsQuery = useQuery({
    queryKey: ['mealTracker'],
    queryFn: async () => {
      console.log('[MealTracker] Loading tracked meals from storage...');
      const stored = await AsyncStorage.getItem(MEAL_TRACKER_STORAGE_KEY);
      const data = stored ? JSON.parse(stored) : [];
      console.log('[MealTracker] Loaded', data.length, 'tracked meals');
      return data as TrackedMeal[];
    },
  });

  const waterQuery = useQuery({
    queryKey: ['waterTracker'],
    queryFn: async () => {
      console.log('[MealTracker] Loading water entries from storage...');
      const stored = await AsyncStorage.getItem(WATER_TRACKER_STORAGE_KEY);
      const data = stored ? JSON.parse(stored) : [];
      console.log('[MealTracker] Loaded', data.length, 'water entries');
      return data as WaterEntry[];
    },
  });

  useEffect(() => {
    if (mealsQuery.data) {
      setTrackedMeals(mealsQuery.data);
    }
  }, [mealsQuery.data]);

  useEffect(() => {
    if (waterQuery.data) {
      setWaterEntries(waterQuery.data);
    }
  }, [waterQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async (newTrackedMeals: TrackedMeal[]) => {
      console.log('[MealTracker] Saving tracked meals...', newTrackedMeals.length, 'meals');
      await AsyncStorage.setItem(MEAL_TRACKER_STORAGE_KEY, JSON.stringify(newTrackedMeals));
      return newTrackedMeals;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mealTracker'] });
    },
  });

  const saveWaterMutation = useMutation({
    mutationFn: async (newWaterEntries: WaterEntry[]) => {
      console.log('[MealTracker] Saving water entries...', newWaterEntries.length, 'entries');
      await AsyncStorage.setItem(WATER_TRACKER_STORAGE_KEY, JSON.stringify(newWaterEntries));
      return newWaterEntries;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waterTracker'] });
    },
  });

  const { mutate: saveMeals } = saveMutation;
  const { mutate: saveWater } = saveWaterMutation;

  const addMeal = useCallback((date: string, mealType: MealType, product: Product) => {
    console.log('[MealTracker] Adding meal:', { date, mealType, product: product.name });
    setTrackedMeals(prev => {
      const newMeal: TrackedMeal = {
        id: `${date}_${mealType}_${product.barcode}_${Date.now()}`,
        date,
        mealType,
        product,
        timestamp: Date.now(),
        servings: 1,
      };
      const newMeals = [...prev, newMeal];
      saveMeals(newMeals);
      return newMeals;
    });
  }, [saveMeals]);

  const updateMealServings = useCallback((mealId: string, servings: number) => {
    console.log('[MealTracker] Updating meal servings:', { mealId, servings });
    setTrackedMeals(prev => {
      const newMeals = prev.map(m => 
        m.id === mealId ? { ...m, servings: Math.max(0.5, servings) } : m
      );
      saveMeals(newMeals);
      return newMeals;
    });
  }, [saveMeals]);

  const removeMeal = useCallback((mealId: string) => {
    console.log('[MealTracker] Removing meal:', mealId);
    setTrackedMeals(prev => {
      const newMeals = prev.filter(m => m.id !== mealId);
      saveMeals(newMeals);
      return newMeals;
    });
  }, [saveMeals]);

  const getMealsForDate = useCallback((date: string): TrackedMeal[] => {
    return trackedMeals.filter(m => m.date === date);
  }, [trackedMeals]);

  const getMealsForDateAndType = useCallback((date: string, mealType: MealType): TrackedMeal[] => {
    return trackedMeals.filter(m => m.date === date && m.mealType === mealType);
  }, [trackedMeals]);

  const getWaterForDate = useCallback((date: string): number => {
    return waterEntries
      .filter(e => e.date === date)
      .reduce((sum, e) => sum + e.cups, 0);
  }, [waterEntries]);

  const addWater = useCallback((date: string, cups: number) => {
    console.log('[MealTracker] Adding water:', { date, cups });
    setWaterEntries(prev => {
      const newEntry: WaterEntry = {
        id: `${date}_${Date.now()}`,
        date,
        cups,
        timestamp: Date.now(),
      };
      const newEntries = [...prev, newEntry];
      saveWater(newEntries);
      return newEntries;
    });
  }, [saveWater]);

  const removeWater = useCallback((date: string, cups: number) => {
    console.log('[MealTracker] Removing water:', { date, cups });
    const currentWater = getWaterForDate(date);
    if (currentWater - cups < 0) {
      console.log('[MealTracker] Cannot remove more water than available');
      return;
    }
    setWaterEntries(prev => {
      const newEntry: WaterEntry = {
        id: `${date}_${Date.now()}`,
        date,
        cups: -cups,
        timestamp: Date.now(),
      };
      const newEntries = [...prev, newEntry];
      saveWater(newEntries);
      return newEntries;
    });
  }, [saveWater, getWaterForDate]);

  const getDayStats = useCallback((date: string): DayStats => {
    const meals = getMealsForDate(date);
    const waterIntake = getWaterForDate(date);
    
    if (meals.length === 0) {
      return {
        totalItems: 0,
        avgHealthScore: 0,
        totalCalories: 0,
        totalProtein: 0,
        totalCarbs: 0,
        totalFat: 0,
        mealCounts: { breakfast: 0, lunch: 0, dinner: 0, snack: 0 },
        waterIntake,
      };
    }

    const avgHealthScore = Math.round(
      meals.reduce((sum, m) => sum + m.product.healthScore, 0) / meals.length
    );

    const mealCounts = meals.reduce((acc, m) => {
      acc[m.mealType] = (acc[m.mealType] || 0) + 1;
      return acc;
    }, {} as Record<MealType, number>);

    const totalCalories = Math.round(
      meals.reduce((sum, m) => sum + (m.product.nutrition.calories * m.servings), 0)
    );

    const totalProtein = Math.round(
      meals.reduce((sum, m) => sum + (m.product.nutrition.protein * m.servings), 0)
    );

    const totalCarbs = Math.round(
      meals.reduce((sum, m) => sum + (m.product.nutrition.carbohydrates * m.servings), 0)
    );

    const totalFat = Math.round(
      meals.reduce((sum, m) => sum + (m.product.nutrition.fat * m.servings), 0)
    );

    return {
      totalItems: meals.length,
      avgHealthScore,
      totalCalories,
      totalProtein,
      totalCarbs,
      totalFat,
      mealCounts: {
        breakfast: mealCounts.breakfast || 0,
        lunch: mealCounts.lunch || 0,
        dinner: mealCounts.dinner || 0,
        snack: mealCounts.snack || 0,
      },
      waterIntake,
    };
  }, [getMealsForDate, getWaterForDate]);

  const calculateNutrientGoals = useCallback((bodyweight: number, fitnessGoal: string = 'maintenance'): NutrientGoals => {
    console.log('[MealTracker] Calculating nutrition goals for bodyweight:', bodyweight, 'goal:', fitnessGoal);
    const safeBodyweight = bodyweight || 150;
    
    let calorieMultiplier = 15;
    let proteinMultiplier = 0.8;
    let carbsMultiplier = 2;
    let fatMultiplier = 0.4;
    
    switch (fitnessGoal) {
      case 'muscle_gain':
        calorieMultiplier = 18;
        proteinMultiplier = 1.2;
        carbsMultiplier = 2.5;
        fatMultiplier = 0.45;
        break;
      case 'fat_loss':
        calorieMultiplier = 12;
        proteinMultiplier = 1.0;
        carbsMultiplier = 1.5;
        fatMultiplier = 0.35;
        break;
      case 'athletic':
        calorieMultiplier = 20;
        proteinMultiplier = 1.0;
        carbsMultiplier = 3.0;
        fatMultiplier = 0.5;
        break;
      default:
        calorieMultiplier = 15;
        proteinMultiplier = 0.8;
        carbsMultiplier = 2;
        fatMultiplier = 0.4;
    }
    
    const goals = {
      calories: Math.round(safeBodyweight * calorieMultiplier),
      protein: Math.round(safeBodyweight * proteinMultiplier),
      carbs: Math.round(safeBodyweight * carbsMultiplier),
      fat: Math.round(safeBodyweight * fatMultiplier),
      water: Math.max(8, Math.round(safeBodyweight / 2 / 8)),
    };
    
    console.log('[MealTracker] Calculated nutrition goals:', goals);
    return goals;
  }, []);

  const getPeriodStats = useCallback((days: number, bodyweight: number, fitnessGoal: string = 'maintenance'): PeriodStats => {
    const now = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const periodMeals = trackedMeals.filter(m => {
      const mealDate = new Date(m.date);
      return mealDate >= startDate && mealDate <= now;
    });

    const goals = calculateNutrientGoals(bodyweight, fitnessGoal);

    console.log('[MealTracker] Getting period stats for', days, 'days, found', periodMeals.length, 'meals');

    if (periodMeals.length === 0) {
      console.log('[MealTracker] No meals found in period, returning zeros');
      return {
        avgHealthScore: 0,
        totalMeals: 0,
        healthyMealsCount: 0,
        mostTrackedMeal: 'breakfast',
        topProducts: [],
        avgNutrients: {
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
          water: 0,
        },
        nutrientGoalsMet: {
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
          water: 0,
        },
      };
    }

    const avgHealthScore = Math.round(
      periodMeals.reduce((sum, m) => sum + m.product.healthScore, 0) / periodMeals.length
    );

    const healthyMealsCount = periodMeals.filter(m => m.product.healthScore >= 80).length;

    const mealTypeCounts = periodMeals.reduce((acc, m) => {
      acc[m.mealType] = (acc[m.mealType] || 0) + 1;
      return acc;
    }, {} as Record<MealType, number>);

    const mostTrackedMeal = (Object.entries(mealTypeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'breakfast') as MealType;

    const productCounts = periodMeals.reduce((acc, m) => {
      const key = m.product.barcode;
      if (!acc[key]) {
        acc[key] = { product: m.product, count: 0 };
      }
      acc[key].count++;
      return acc;
    }, {} as Record<string, { product: Product; count: number }>);

    const topProducts = Object.values(productCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const uniqueDates = [...new Set(periodMeals.map(m => m.date))];
    const numDaysWithData = uniqueDates.length;

    console.log('[MealTracker] Found', numDaysWithData, 'unique dates with data:', uniqueDates);

    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;
    let totalWater = 0;
    let daysMetCalories = 0;
    let daysMetProtein = 0;
    let daysMetCarbs = 0;
    let daysMetFat = 0;
    let daysMetWater = 0;

    uniqueDates.forEach(date => {
      const dayStats = getDayStats(date);
      console.log('[MealTracker] Day', date, 'stats:', dayStats);
      totalCalories += dayStats.totalCalories;
      totalProtein += dayStats.totalProtein;
      totalCarbs += dayStats.totalCarbs;
      totalFat += dayStats.totalFat;
      totalWater += dayStats.waterIntake;

      if (dayStats.totalCalories >= goals.calories * 0.9) daysMetCalories++;
      if (dayStats.totalProtein >= goals.protein * 0.9) daysMetProtein++;
      if (dayStats.totalCarbs >= goals.carbs * 0.9) daysMetCarbs++;
      if (dayStats.totalFat >= goals.fat * 0.9) daysMetFat++;
      if (dayStats.waterIntake >= goals.water * 0.9) daysMetWater++;
    });

    const avgNutrients = {
      calories: numDaysWithData > 0 ? Math.round(totalCalories / numDaysWithData) : 0,
      protein: numDaysWithData > 0 ? Math.round(totalProtein / numDaysWithData) : 0,
      carbs: numDaysWithData > 0 ? Math.round(totalCarbs / numDaysWithData) : 0,
      fat: numDaysWithData > 0 ? Math.round(totalFat / numDaysWithData) : 0,
      water: numDaysWithData > 0 ? Math.round((totalWater / numDaysWithData) * 10) / 10 : 0,
    };

    const nutrientGoalsMet = {
      calories: numDaysWithData > 0 ? Math.round((daysMetCalories / numDaysWithData) * 100) : 0,
      protein: numDaysWithData > 0 ? Math.round((daysMetProtein / numDaysWithData) * 100) : 0,
      carbs: numDaysWithData > 0 ? Math.round((daysMetCarbs / numDaysWithData) * 100) : 0,
      fat: numDaysWithData > 0 ? Math.round((daysMetFat / numDaysWithData) * 100) : 0,
      water: numDaysWithData > 0 ? Math.round((daysMetWater / numDaysWithData) * 100) : 0,
    };

    console.log('[MealTracker] Period stats calculated:', {
      numDaysWithData,
      avgNutrients,
      nutrientGoalsMet,
      totalCalories,
      totalProtein,
      totalCarbs,
      totalFat,
      totalWater,
    });

    return {
      avgHealthScore,
      totalMeals: periodMeals.length,
      healthyMealsCount,
      mostTrackedMeal,
      topProducts,
      avgNutrients,
      nutrientGoalsMet,
    };
  }, [trackedMeals, getDayStats, calculateNutrientGoals]);

  const hasTrackedMeals = useMemo(() => trackedMeals.length > 0, [trackedMeals.length]);

  return {
    trackedMeals,
    addMeal,
    removeMeal,
    updateMealServings,
    getMealsForDate,
    getMealsForDateAndType,
    getDayStats,
    getPeriodStats,
    hasTrackedMeals,
    addWater,
    removeWater,
    getWaterForDate,
    calculateNutrientGoals,
    isLoading: mealsQuery.isLoading || waterQuery.isLoading,
  };
});
