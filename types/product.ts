export interface NutritionFacts {
  calories: number;
  fat: number;
  saturatedFat: number;
  carbohydrates: number;
  sugar: number;
  fiber: number;
  protein: number;
  sodium: number;
  servingSize: string;
}

export interface Contaminants {
  microplastics?: string;
  heavyMetals?: string[];
  pesticides?: string[];
  bacteria?: string;
}

export interface BeneficialMinerals {
  calcium?: number;
  magnesium?: number;
  potassium?: number;
  sulfate?: number;
  bicarbonate?: number;
}

export interface PackagingInfo {
  material: string;
  recyclable: boolean;
  bpaFree: boolean;
  sustainabilityScore: number;
}

export interface SourceInfo {
  origin: string;
  farm?: string;
  sustainable: boolean;
  certifications: string[];
}

export interface TestingInfo {
  verifiedTesting: boolean;
  lastTested?: string;
  certifiedBy?: string[];
  testResults?: string;
}

export interface Product {
  id: string;
  barcode: string;
  name: string;
  brand: string;
  category: string;
  imageUrl: string;
  webImageUrl?: string;
  healthScore: number;
  nutrition: NutritionFacts;
  ingredients: string[];
  allergens: string[];
  additives: string[];
  isOrganic: boolean;
  isVegan: boolean;
  isGlutenFree: boolean;
  contaminants?: Contaminants;
  beneficialMinerals?: BeneficialMinerals;
  packaging?: PackagingInfo;
  source?: SourceInfo;
  testing?: TestingInfo;
}

export interface ScannedProduct extends Product {
  scannedAt: string;
}

export type HealthScoreLevel = 'excellent' | 'good' | 'moderate' | 'poor';

export function getHealthScoreLevel(score: number): HealthScoreLevel {
  if (score >= 80) return 'excellent';
  if (score >= 60) return 'good';
  if (score >= 40) return 'moderate';
  return 'poor';
}

export function getHealthScoreColor(score: number): string {
  const level = getHealthScoreLevel(score);
  const colors: Record<HealthScoreLevel, string> = {
    excellent: '#10B981',
    good: '#84CC16',
    moderate: '#F59E0B',
    poor: '#EF4444',
  };
  return colors[level];
}

export function getHealthScoreLabel(score: number): string {
  const level = getHealthScoreLevel(score);
  const labels: Record<HealthScoreLevel, string> = {
    excellent: 'Excellent',
    good: 'Good',
    moderate: 'Moderate',
    poor: 'Poor',
  };
  return labels[level];
}
