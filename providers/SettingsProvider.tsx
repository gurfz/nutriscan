import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ScoringWeights {
  additives: number;
  ingredientQuality: number;
  sugar: number;
  sodium: number;
  saturatedFat: number;
  nutritionalValue: number;
}

export type FitnessGoal = 'maintenance' | 'muscle_gain' | 'fat_loss' | 'athletic';

const DEFAULT_WEIGHTS: ScoringWeights = {
  additives: 5,
  ingredientQuality: 5,
  sugar: 5,
  sodium: 5,
  saturatedFat: 5,
  nutritionalValue: 5,
};

const DEFAULT_BODYWEIGHT = 150;
const DEFAULT_FITNESS_GOAL: FitnessGoal = 'maintenance';
const DEFAULT_LEAFBUDDY_ENABLED = true;

export const [SettingsProvider, useSettings] = createContextHook(() => {
  const [scoringWeights, setScoringWeights] = useState<ScoringWeights>(DEFAULT_WEIGHTS);
  const [bodyweight, setBodyweight] = useState<number>(DEFAULT_BODYWEIGHT);
  const [fitnessGoal, setFitnessGoal] = useState<FitnessGoal>(DEFAULT_FITNESS_GOAL);
  const [leafBuddyEnabled, setLeafBuddyEnabled] = useState<boolean>(DEFAULT_LEAFBUDDY_ENABLED);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const storedWeights = await AsyncStorage.getItem('scoring-weights');
      if (storedWeights) {
        setScoringWeights(JSON.parse(storedWeights));
      }
      
      const storedBodyweight = await AsyncStorage.getItem('bodyweight');
      if (storedBodyweight) {
        setBodyweight(JSON.parse(storedBodyweight));
      }
      
      const storedGoal = await AsyncStorage.getItem('fitness-goal');
      if (storedGoal) {
        setFitnessGoal(JSON.parse(storedGoal));
      }
      
      const storedLeafBuddy = await AsyncStorage.getItem('leafbuddy-enabled');
      if (storedLeafBuddy !== null) {
        setLeafBuddyEnabled(JSON.parse(storedLeafBuddy));
      }
    } catch (error) {
      console.error('[Settings] Failed to load settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateScoringWeights = async (weights: ScoringWeights) => {
    try {
      await AsyncStorage.setItem('scoring-weights', JSON.stringify(weights));
      setScoringWeights(weights);
      console.log('[Settings] Scoring weights updated:', weights);
    } catch (error) {
      console.error('[Settings] Failed to save scoring weights:', error);
    }
  };

  const updateBodyweight = async (weight: number) => {
    try {
      await AsyncStorage.setItem('bodyweight', JSON.stringify(weight));
      setBodyweight(weight);
      console.log('[Settings] Bodyweight updated:', weight);
    } catch (error) {
      console.error('[Settings] Failed to save bodyweight:', error);
    }
  };

  const updateFitnessGoal = async (goal: FitnessGoal) => {
    try {
      await AsyncStorage.setItem('fitness-goal', JSON.stringify(goal));
      setFitnessGoal(goal);
      console.log('[Settings] Fitness goal updated:', goal);
    } catch (error) {
      console.error('[Settings] Failed to save fitness goal:', error);
    }
  };

  const updateLeafBuddyEnabled = async (enabled: boolean) => {
    try {
      await AsyncStorage.setItem('leafbuddy-enabled', JSON.stringify(enabled));
      setLeafBuddyEnabled(enabled);
      console.log('[Settings] LeafBuddy enabled updated:', enabled);
    } catch (error) {
      console.error('[Settings] Failed to save LeafBuddy setting:', error);
    }
  };

  const resetToDefaults = async () => {
    await updateScoringWeights(DEFAULT_WEIGHTS);
    await updateBodyweight(DEFAULT_BODYWEIGHT);
    await updateFitnessGoal(DEFAULT_FITNESS_GOAL);
    await updateLeafBuddyEnabled(DEFAULT_LEAFBUDDY_ENABLED);
  };

  return {
    isLoading,
    scoringWeights,
    bodyweight,
    fitnessGoal,
    leafBuddyEnabled,
    updateScoringWeights,
    updateBodyweight,
    updateFitnessGoal,
    updateLeafBuddyEnabled,
    resetToDefaults,
  };
});
