import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  Platform,
} from 'react-native';
import { useRouter, Href } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronRight, Clock, Package, Refrigerator } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useScanHistory } from '@/providers/ScanHistoryProvider';
import { useFridge } from '@/providers/FridgeProvider';
import * as Haptics from 'expo-haptics';
import { ScannedProduct, getHealthScoreColor } from '@/types/product';
import CircularProgress from '@/components/CircularProgress';

export default function HistoryScreen() {
  const router = useRouter();
  const { history, isLoading } = useScanHistory();
  const { toggleFridge, isInFridge } = useFridge();

  const handleProductPress = (barcode: string) => {
    router.push({ pathname: '/product/[barcode]', params: { barcode } } as Href);
  };

  const handleToggleFridge = (product: typeof history[0]) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    toggleFridge(product);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const renderItem = ({ item }: { item: ScannedProduct }) => {
    const inFridge = isInFridge(item.barcode);
    const imageUrl = item.webImageUrl && item.webImageUrl.startsWith('http') 
      ? item.webImageUrl 
      : item.imageUrl;
    return (
    <View style={styles.itemContainer}>
      <TouchableOpacity
        style={styles.productCard}
        onPress={() => handleProductPress(item.barcode)}
        activeOpacity={0.7}
        testID={`history-item-${item.barcode}`}
      >
            <Image source={{ uri: imageUrl }} style={styles.productImage} />
            <View style={styles.productInfo}>
              <Text style={styles.productName} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.productBrand}>{item.brand}</Text>
              <View style={styles.metaRow}>
                <CircularProgress
                  size={32}
                  strokeWidth={3}
                  progress={item.healthScore}
                  color={getHealthScoreColor(item.healthScore)}
                  backgroundColor={getHealthScoreColor(item.healthScore) + '30'}
                >
                  <Text
                    style={[
                      styles.scoreTextCircle,
                      { color: getHealthScoreColor(item.healthScore) },
                    ]}
                  >
                    {item.healthScore}
                  </Text>
                </CircularProgress>
                <View style={styles.dateContainer}>
                  <Clock color={Colors.textMuted} size={12} />
                  <Text style={styles.dateText}>{formatDate(item.scannedAt)}</Text>
                </View>
              </View>
            </View>
            <TouchableOpacity
              style={styles.fridgeIconButton}
              onPress={(e) => {
                e.stopPropagation();
                handleToggleFridge(item);
              }}
            >
              <Refrigerator
                color={inFridge ? Colors.primary : Colors.textMuted}
                size={20}
                fill={inFridge ? Colors.primary : 'none'}
              />
            </TouchableOpacity>
        <ChevronRight color={Colors.textMuted} size={20} />
      </TouchableOpacity>
    </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconContainer}>
        <Package color={Colors.textMuted} size={48} />
      </View>
      <Text style={styles.emptyTitle}>No scan history</Text>
      <Text style={styles.emptyText}>
        Products you scan will appear here for quick access
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
          <Text style={styles.title}>Scan History</Text>
        </View>

        {history.length > 0 && (
          <Text style={styles.countText}>
            {history.length} {history.length === 1 ? 'product' : 'products'} scanned
          </Text>
        )}

        <FlatList
          data={history}
          renderItem={renderItem}
          keyExtractor={(item) => item.barcode}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={!isLoading ? renderEmptyState : null}
        />
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
  },
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  countText: {
    fontSize: 14,
    color: Colors.textSecondary,
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    flexGrow: 1,
  },
  itemContainer: {
    marginBottom: 12,
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
    width: 56,
    height: 56,
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
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  scoreTextCircle: {
    fontSize: 11,
    fontWeight: '700' as const,
  },
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  scoreDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  scoreText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 48,
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
