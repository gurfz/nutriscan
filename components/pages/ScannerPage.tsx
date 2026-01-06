import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Platform,
} from 'react-native';
import { useRouter, Href } from 'expo-router';
import { Scan, Refrigerator } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';
import { useScanHistory } from '@/providers/ScanHistoryProvider';
import { useFridge } from '@/providers/FridgeProvider';
import * as Haptics from 'expo-haptics';
import { getHealthScoreColor, getHealthScoreLabel } from '@/types/product';
import CircularProgress from '@/components/CircularProgress';


export default function ScannerPage() {
  const router = useRouter();
  const { recentScans, isLoading } = useScanHistory();
  const { toggleFridge, isInFridge } = useFridge();

  const handleProductPress = (barcode: string) => {
    router.push({ pathname: '/product/[barcode]', params: { barcode } } as Href);
  };

  const handleToggleFridge = (product: typeof recentScans[0]) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    toggleFridge(product);
  };

  const ProductCard = ({ product }: { product: typeof recentScans[0] }) => {
    const inFridge = isInFridge(product.barcode);
    const imageUrl = product.imageUrl;

    return (
      <TouchableOpacity
        key={product.barcode}
        style={styles.productCard}
        onPress={() => handleProductPress(product.barcode)}
        activeOpacity={0.7}
        testID={`product-${product.barcode}`}
      >
        <Image
          source={{ uri: imageUrl }}
          style={styles.productImage}
        />
        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={1}>
            {product.name}
          </Text>
          <Text style={styles.productBrand}>{product.brand}</Text>
          <View style={styles.scoreRow}>
            <CircularProgress
              size={40}
              strokeWidth={4}
              progress={product.healthScore}
              color={getHealthScoreColor(product.healthScore)}
              backgroundColor={getHealthScoreColor(product.healthScore) + '30'}
            >
              <Text
                style={[
                  styles.scoreTextCircle,
                  { color: getHealthScoreColor(product.healthScore) },
                ]}
              >
                {product.healthScore}
              </Text>
            </CircularProgress>
            <View style={styles.scoreTextContainer}>
              <Text style={styles.scoreLabelText}>{getHealthScoreLabel(product.healthScore)}</Text>
            </View>
          </View>
        </View>
        <TouchableOpacity
          style={styles.fridgeIconButton}
          onPress={(e) => {
            e.stopPropagation();
            handleToggleFridge(product);
          }}
        >
          <Refrigerator
            color={inFridge ? Colors.primary : Colors.textMuted}
            size={20}
            fill={inFridge ? Colors.primary : 'none'}
          />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

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
          <Text style={styles.greeting}>Welcome back</Text>
          <Text style={styles.title}>NutriScan</Text>
          <Text style={styles.subtitle}>
            Take a photo of any food product to get instant health insights
          </Text>
        </View>

        {recentScans.length > 0 && (
          <View style={styles.recentSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Scans</Text>
              <TouchableOpacity onPress={() => router.push('/history' as Href)}>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>

            {recentScans.map((product) => (
              <View key={product.barcode} style={styles.productCardContainer}>
                <ProductCard product={product} />
              </View>
            ))}
          </View>
        )}

        {recentScans.length === 0 && !isLoading && (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Scan color={Colors.textMuted} size={48} />
            </View>
            <Text style={styles.emptyTitle}>No scans yet</Text>
            <Text style={styles.emptyText}>
              Start taking photos of products to see their health analysis here
            </Text>
          </View>
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
    paddingTop: 40,
    paddingBottom: 24,
  },
  greeting: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  title: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  scanButtonContainer: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  scanButton: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  scanButtonGradient: {
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  scanIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  scanButtonText: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  scanButtonSubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  recentSection: {
    paddingHorizontal: 24,
  },
  productCardContainer: {
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  productCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: Colors.surfaceSecondary,
  },
  productInfo: {
    flex: 1,
    marginLeft: 16,
    marginRight: 12,
  },
  fridgeIconButton: {
    padding: 8,
    marginRight: 4,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 2,
  },
  productBrand: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scoreTextCircle: {
    fontSize: 12,
    fontWeight: '700' as const,
  },
  scoreTextContainer: {
    flex: 1,
  },
  scoreLabelText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 48,
    paddingTop: 32,
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
});
