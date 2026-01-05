import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter, Href } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  AlertTriangle,
  Check,
  X,
  Flame,
  Droplet,
  Wheat,
  Dumbbell,
  Refrigerator,
  Trash2,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { mockProducts } from '@/mocks/products';
import { getHealthScoreColor, getHealthScoreLabel, Product } from '@/types/product';
import { useScanHistory } from '@/providers/ScanHistoryProvider';
import { useFridge } from '@/providers/FridgeProvider';
import * as Haptics from 'expo-haptics';
import CircularProgress from '@/components/CircularProgress';

const { width } = Dimensions.get('window');

interface NutrientRowProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  percentage?: number;
  color: string;
}

function NutrientRow({ icon, label, value, percentage, color }: NutrientRowProps) {
  return (
    <View style={styles.nutrientRow}>
      <View style={[styles.nutrientIcon, { backgroundColor: color + '20' }]}>
        {icon}
      </View>
      <View style={styles.nutrientInfo}>
        <Text style={styles.nutrientLabel}>{label}</Text>
        <Text style={styles.nutrientValue}>{value}</Text>
      </View>
      {percentage !== undefined && (
        <View style={styles.nutrientPercentage}>
          <View style={styles.percentageBar}>
            <View
              style={[
                styles.percentageFill,
                { width: `${Math.min(percentage, 100)}%`, backgroundColor: color },
              ]}
            />
          </View>
          <Text style={[styles.percentageText, { color }]}>{percentage}%</Text>
        </View>
      )}
    </View>
  );
}

interface BadgeProps {
  label: string;
  isPositive: boolean;
}

function Badge({ label, isPositive }: BadgeProps) {
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: isPositive ? Colors.primaryLight : Colors.dangerLight },
      ]}
    >
      {isPositive ? (
        <Check color={Colors.primary} size={14} />
      ) : (
        <X color={Colors.danger} size={14} />
      )}
      <Text
        style={[
          styles.badgeText,
          { color: isPositive ? Colors.primary : Colors.danger },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

export default function ProductDetailScreen() {
  const { barcode } = useLocalSearchParams<{ barcode: string }>();
  const router = useRouter();
  const { getProduct, removeFromHistory } = useScanHistory();
  const { toggleFridge, isInFridge } = useFridge();
  
  const product: Product | undefined = barcode ? (getProduct(barcode) || mockProducts[barcode]) : undefined;
  const isProductInFridge = product && barcode ? isInFridge(barcode) : false;
  const displayImageUrl = product?.imageUrl;

  const handleToggleFridge = () => {
    if (product) {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      toggleFridge(product);
    }
  };

  const handleDelete = () => {
    if (!barcode) return;
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
    removeFromHistory(barcode);
    router.back();
  };

  if (!product) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.notFoundContainer}>
          <Text style={styles.notFoundText}>Product not found</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    );
  }

  const healthScoreColor = getHealthScoreColor(product.healthScore);
  const healthScoreLabel = getHealthScoreLabel(product.healthScore);

  const calculatePercentage = (value: number, dailyValue: number) => {
    return Math.round((value / dailyValue) * 100);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.imageContainer}>
          <Image source={{ uri: displayImageUrl }} style={styles.productImage} />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.6)']}
            style={styles.imageGradient}
          />
        </View>

        <SafeAreaView style={styles.headerOverlay} edges={['top']}>
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={styles.headerBackButton}
              onPress={() => router.back()}
              testID="back-button"
            >
              <ArrowLeft color="#FFFFFF" size={24} />
            </TouchableOpacity>
            <View style={styles.headerRightButtons}>
              {barcode && (
                <TouchableOpacity
                  style={styles.headerActionButton}
                  onPress={handleToggleFridge}
                  testID="fridge-button"
                >
                  <Refrigerator
                    color="#FFFFFF"
                    size={24}
                    fill={isProductInFridge ? '#FFFFFF' : 'transparent'}
                  />
                </TouchableOpacity>
              )}
              {barcode && (
                <TouchableOpacity
                  style={styles.headerActionButton}
                  onPress={handleDelete}
                  testID="delete-button"
                >
                  <Trash2 color="#FFFFFF" size={24} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </SafeAreaView>

        <View style={styles.content}>
          <View style={styles.productHeader}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{product.category}</Text>
            </View>
            <Text style={styles.productName}>{product.name}</Text>
            <Text style={styles.brandName}>{product.brand}</Text>
          </View>

          <View style={styles.scoreCard}>
            <View style={styles.scoreCircleContainer}>
              <CircularProgress
                size={80}
                strokeWidth={6}
                progress={product.healthScore}
                color={healthScoreColor}
                backgroundColor={healthScoreColor + '30'}
              >
                <Text style={[styles.scoreNumber, { color: healthScoreColor }]}>
                  {product.healthScore}
                </Text>
              </CircularProgress>
            </View>
            <View style={styles.scoreInfo}>
              <Text style={styles.scoreLabel}>Health Score</Text>
              <Text style={[styles.scoreRating, { color: healthScoreColor }]}>
                {healthScoreLabel}
              </Text>
              <Text style={styles.scoreDescription}>
                Based on nutritional content and ingredients
              </Text>
            </View>
          </View>

          <View style={styles.badgesContainer}>
            {product.isOrganic && <Badge label="Organic" isPositive />}
            {product.isVegan && <Badge label="Vegan" isPositive />}
            {product.isGlutenFree && <Badge label="Gluten Free" isPositive />}
            {product.additives.length > 0 && (
              <Badge label={`${product.additives.length} Additives`} isPositive={false} />
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Nutrition Facts</Text>
            <Text style={styles.servingSize}>
              Per serving ({product.nutrition.servingSize})
            </Text>
            
            <View style={styles.nutrientsCard}>
              <NutrientRow
                icon={<Flame color={Colors.warning} size={18} />}
                label="Calories"
                value={`${product.nutrition.calories} kcal`}
                percentage={calculatePercentage(product.nutrition.calories, 2000)}
                color={Colors.warning}
              />
              <NutrientRow
                icon={<Droplet color={Colors.danger} size={18} />}
                label="Fat"
                value={`${product.nutrition.fat}g`}
                percentage={calculatePercentage(product.nutrition.fat, 65)}
                color={Colors.danger}
              />
              <NutrientRow
                icon={<Wheat color={Colors.secondary} size={18} />}
                label="Carbs"
                value={`${product.nutrition.carbohydrates}g`}
                percentage={calculatePercentage(product.nutrition.carbohydrates, 300)}
                color={Colors.secondary}
              />
              <NutrientRow
                icon={<Dumbbell color={Colors.primary} size={18} />}
                label="Protein"
                value={`${product.nutrition.protein}g`}
                percentage={calculatePercentage(product.nutrition.protein, 50)}
                color={Colors.primary}
              />
            </View>

            <View style={styles.nutritionGrid}>
              <View style={styles.nutritionGridItem}>
                <Text style={styles.nutritionGridValue}>{product.nutrition.sugar}g</Text>
                <Text style={styles.nutritionGridLabel}>Sugar</Text>
              </View>
              <View style={styles.nutritionGridItem}>
                <Text style={styles.nutritionGridValue}>{product.nutrition.fiber}g</Text>
                <Text style={styles.nutritionGridLabel}>Fiber</Text>
              </View>
              <View style={styles.nutritionGridItem}>
                <Text style={styles.nutritionGridValue}>{product.nutrition.sodium}mg</Text>
                <Text style={styles.nutritionGridLabel}>Sodium</Text>
              </View>
              <View style={styles.nutritionGridItem}>
                <Text style={styles.nutritionGridValue}>{product.nutrition.saturatedFat}g</Text>
                <Text style={styles.nutritionGridLabel}>Sat. Fat</Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ingredients</Text>
            <View style={styles.ingredientsCard}>
              <Text style={styles.ingredientsText}>
                {product.ingredients.join(', ')}
              </Text>
            </View>
          </View>

          {product.allergens.length > 0 && (
            <View style={styles.section}>
              <View style={styles.warningHeader}>
                <AlertTriangle color={Colors.warning} size={20} />
                <Text style={styles.warningTitle}>Allergens</Text>
              </View>
              <View style={styles.allergensContainer}>
                {product.allergens.map((allergen, index) => (
                  <View key={index} style={styles.allergenBadge}>
                    <Text style={styles.allergenText}>{allergen}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {product.additives.length > 0 && (
            <View style={styles.section}>
              <View style={styles.warningHeader}>
                <AlertTriangle color={Colors.danger} size={20} />
                <Text style={styles.warningTitle}>Additives</Text>
              </View>
              <View style={styles.additivesContainer}>
                {product.additives.map((additive, index) => (
                  <View key={index} style={styles.additiveBadge}>
                    <Text style={styles.additiveText}>{additive}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      <SafeAreaView style={styles.bottomBar} edges={['bottom']}>
        <TouchableOpacity
          style={styles.scanAnotherButton}
          onPress={() => router.push('/scanner' as Href)}
        >
          <Text style={styles.scanAnotherText}>Scan Another Product</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  notFoundContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notFoundText: {
    fontSize: 18,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  backButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: Colors.primary,
    borderRadius: 12,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontWeight: '600' as const,
  },
  imageContainer: {
    width: width,
    height: 280,
    backgroundColor: Colors.surfaceSecondary,
  },
  productImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imageGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
  },
  headerButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  headerBackButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerRightButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  headerActionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    marginTop: -40,
    backgroundColor: Colors.background,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 28,
    paddingHorizontal: 24,
  },
  productHeader: {
    marginBottom: 24,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 12,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  productName: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  brandName: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  scoreCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  scoreCircleContainer: {
    marginRight: 20,
  },
  scoreNumber: {
    fontSize: 28,
    fontWeight: '700' as const,
  },
  scoreInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  scoreLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  scoreRating: {
    fontSize: 22,
    fontWeight: '700' as const,
    marginBottom: 4,
  },
  scoreDescription: {
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 16,
  },
  badgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 28,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  servingSize: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  nutrientsCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    gap: 16,
    marginBottom: 16,
  },
  nutrientRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nutrientIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  nutrientInfo: {
    width: 80,
  },
  nutrientLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  nutrientValue: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  nutrientPercentage: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  percentageBar: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 3,
    overflow: 'hidden',
  },
  percentageFill: {
    height: '100%',
    borderRadius: 3,
  },
  percentageText: {
    fontSize: 12,
    fontWeight: '600' as const,
    width: 36,
    textAlign: 'right',
  },
  nutritionGrid: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
  },
  nutritionGridItem: {
    flex: 1,
    alignItems: 'center',
  },
  nutritionGridValue: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  nutritionGridLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  ingredientsCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
  },
  ingredientsText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 22,
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  warningTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  allergensContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  allergenBadge: {
    backgroundColor: Colors.warningLight,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  allergenText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.warning,
  },
  additivesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  additiveBadge: {
    backgroundColor: Colors.dangerLight,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  additiveText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.danger,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  scanAnotherButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  scanAnotherText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
});
