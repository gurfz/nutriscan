import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';

interface NutrientProgressBarProps {
  label: string;
  current: number;
  goal: number;
  unit: string;
  color: string;
  icon: React.ReactNode;
}

export default function NutrientProgressBar({
  label,
  current,
  goal,
  unit,
  color,
  icon,
}: NutrientProgressBarProps) {
  const safeGoal = goal || 1;
  const safeCurrent = current || 0;
  const progress = Math.min(100, Math.round((safeCurrent / safeGoal) * 100)) || 0;
  const isComplete = safeCurrent >= safeGoal;
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.labelContainer}>
          <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
            {icon}
          </View>
          <Text style={styles.label}>{label}</Text>
        </View>
        <Text style={[styles.percentage, { color: isComplete ? Colors.success : color }]}>
          {progress}%
        </Text>
      </View>
      
      <View style={styles.progressBarContainer}>
        <View style={[styles.progressBarBackground, { backgroundColor: color + '15' }]}>
          <LinearGradient
            colors={isComplete ? [Colors.success, Colors.success] : [color, color + 'DD']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.progressBarFill, { width: `${progress}%` }]}
          />
        </View>
      </View>
      
      <View style={styles.values}>
        <Text style={styles.currentValue}>
          <Text style={[styles.currentValueBold, { color }]}>{safeCurrent}</Text>
          <Text style={styles.currentValueUnit}>{unit}</Text>
        </Text>
        <Text style={styles.goalValue}>Goal: {safeGoal}{unit}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  percentage: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  progressBarContainer: {
    marginBottom: 8,
  },
  progressBarBackground: {
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 6,
  },
  values: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  currentValue: {
    fontSize: 14,
  },
  currentValueBold: {
    fontWeight: '700' as const,
    fontSize: 16,
  },
  currentValueUnit: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  goalValue: {
    fontSize: 12,
    color: Colors.textMuted,
  },
});
