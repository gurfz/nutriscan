import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Dimensions,
  Image,
} from 'react-native';
import { useRouter, useLocalSearchParams, Href } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Flashlight, FlashlightOff, Camera, Scan } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useScanHistory } from '@/providers/ScanHistoryProvider';
import { useSubscription } from '@/providers/SubscriptionProvider';
import { useMealTracker, MealType } from '@/providers/MealTrackerProvider';
import { generateObject } from '@rork-ai/toolkit-sdk';
import { z } from 'zod';
import type { Product } from '@/types/product';

const { width, height } = Dimensions.get('window');

export default function ScannerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ fromMealTracker?: string; mealType?: string; date?: string }>();
  const { addScan } = useScanHistory();
  const { canScan, incrementScanCount, isPremium, scansRemaining } = useSubscription();
  const { addMeal } = useMealTracker();
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);

  const removeBackground = useCallback(async (photoBase64: string): Promise<string> => {
    try {
      console.log('[Scanner] Calling image edit API to remove background');
      const response = await fetch('https://toolkit.rork.com/images/edit/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: 'Remove the background from this image, keep only the food product in the center. Make the background transparent or white.',
          images: [{ type: 'image', image: photoBase64 }],
          aspectRatio: '1:1',
        }),
      });

      if (!response.ok) {
        console.error('[Scanner] Background removal failed, using original image');
        return photoBase64;
      }

      const data = await response.json();
      console.log('[Scanner] Background removed successfully');
      return data.image.base64Data;
    } catch (error) {
      console.error('[Scanner] Background removal error:', error);
      return photoBase64;
    }
  }, []);

  const identifyProductFromPhoto = useCallback(async (photoBase64: string) => {
    try {
      console.log('[Scanner] Identifying product from photo with AI');
      
      const productSchema = z.object({
        name: z.string().describe('Exact product name as shown on the package'),
        brand: z.string().describe('Brand name'),
        category: z.string().describe('Product category (e.g., Snacks, Beverages, Dairy, etc.)'),
        healthScore: z.number().min(0).max(100).describe('Health score from 0-100 calculated based on the scoring criteria provided'),
        nutrition: z.object({
          calories: z.number().describe('Calories per serving'),
          fat: z.number().describe('Total fat in grams'),
          saturatedFat: z.number().describe('Saturated fat in grams'),
          carbohydrates: z.number().describe('Total carbohydrates in grams'),
          sugar: z.number().describe('Sugar in grams'),
          fiber: z.number().describe('Dietary fiber in grams'),
          protein: z.number().describe('Protein in grams'),
          sodium: z.number().describe('Sodium in milligrams'),
          servingSize: z.string().describe('Serving size (e.g., "100g", "1 cup")'),
        }),
        ingredients: z.array(z.string()).describe('COMPLETE and ACCURATE list of ALL ingredients in exact order as shown on package. Do not skip any ingredients. Include every single ingredient listed.'),
        allergens: z.array(z.string()).describe('Common allergens present (milk, eggs, nuts, soy, wheat, etc.). NOTE: Allergens are informational only and do NOT reduce health score.'),
        additives: z.array(z.string()).describe('ALL food additives, preservatives, artificial colors, flavors, and E-numbers present. Include codes like E150, E621, etc.'),
        isOrganic: z.boolean().describe('Whether the product is certified organic'),
        isVegan: z.boolean().describe('Whether the product is vegan'),
        isGlutenFree: z.boolean().describe('Whether the product is gluten-free'),
      });

      const result = await generateObject({
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image' as const,
                image: photoBase64,
              },
              {
                type: 'text' as const,
                text: `Analyze this food product image and identify the exact product. Provide complete and accurate information including:

1. EXACT product name and brand as shown on the package
2. COMPLETE nutritional information per serving (read ALL values from the nutrition facts panel)
3. COMPLETE ingredients list - Read EVERY SINGLE ingredient from the ingredients list on the package. Do not skip or summarize. List them all in exact order.
4. ALL allergens mentioned
5. ALL additives, preservatives, artificial colors/flavors, and E-numbers (like E150, E621, etc.)
6. Dietary attributes (organic, vegan, gluten-free)

HEALTH SCORE CALCULATION (0-100):
Calculate a comprehensive health score based on these factors. IMPORTANT: Allergens do NOT affect the health score - they are informational only.

FOR WATER PRODUCTS (use this specialized scoring):
1. CONTAMINANTS (40 points):
   - No contaminants detected = 40 points
   - Trace contaminants within EPA limits = 30 points
   - Trace microplastics detected = 25 points
   - Multiple trace contaminants = 20 points
   - Elevated contaminant levels = 10 points
   - Unsafe levels = 0 points

2. BENEFICIAL MINERALS (25 points):
   - Rich mineral content (calcium, magnesium, potassium) = 25 points
   - Moderate mineral content = 15 points
   - Electrolyte enhanced = 10 points
   - Minimal minerals/purified = 5 points

3. SOURCE & PURITY (20 points):
   - Natural spring/glacier source = 20 points
   - Protected aquifer = 15 points
   - Filtered municipal = 10 points
   - Unknown/unverified source = 5 points

4. PACKAGING (10 points):
   - Glass or rPET (recycled) = 10 points
   - BPA-free plastic = 7 points
   - Standard plastic = 3 points
   - Non-recyclable = 0 points

5. PROCESSING (5 points):
   - Natural/no processing = 5 points
   - Filtered only = 4 points
   - Enhanced with minerals = 3 points
   - Heavily processed/flavored = 0 points

FOR ALL OTHER PRODUCTS (use this scoring):
1. ADDITIVES & PRESERVATIVES (35 points): 
   - 0 additives = 35 points
   - 1-2 additives = 25 points
   - 3-5 additives = 12 points
   - 6+ additives = 0 points

2. INGREDIENT QUALITY (25 points):
   - Organic certified = +10 points
   - Fewer total ingredients (<8) = +10 points
   - Recognizable, whole food ingredients = +5 points

3. SUGAR CONTENT (15 points):
   - <5g per serving = 15 points
   - 5-10g = 10 points
   - 10-20g = 5 points
   - >20g = 0 points

4. SODIUM CONTENT (10 points):
   - <200mg = 10 points
   - 200-400mg = 7 points
   - 400-800mg = 3 points
   - >800mg = 0 points

5. SATURATED FAT (10 points):
   - <2g = 10 points
   - 2-5g = 7 points
   - 5-10g = 3 points
   - >10g = 0 points

6. NUTRITIONAL VALUE (5 points):
   - High protein (>10g) OR high fiber (>5g) = 5 points
   - Moderate amounts = 3 points
   - Low amounts = 0 points

IMPORTANT SCORING NOTES:
- Water with trace contaminants should score 70-85, not 100. Pure water = 95-100.
- Whole milk with no additives should score 75-85+ (natural ingredients, no preservatives)
- Natural allergens like milk, eggs, nuts do NOT reduce score
- Only penalize artificial additives, preservatives, and excessive sugar/sodium/fat
- Products with fewer, cleaner ingredients and no preservatives should score highest
- Highly processed foods with many additives should score lowest

Be extremely thorough and accurate. Read every word on the package.`,
              },
            ],
          },
        ],
        schema: productSchema,
      });

      const productId = `photo-${Date.now()}`;
      const product: Product = {
        id: productId,
        barcode: productId,
        imageUrl: `data:image/jpeg;base64,${photoBase64}`,
        ...result,
      };

      console.log('[Scanner] AI identified product:', product.name);
      return product;
    } catch (error) {
      console.error('[Scanner] AI identification failed:', error);
      return null;
    }
  }, []);

  const handleTakePhoto = useCallback(async () => {
    if (!cameraRef.current || isIdentifying) return;
    
    if (!canScan) {
      console.log('[Scanner] Scan limit reached, showing paywall');
      router.push({ pathname: '/paywall', params: { returnTo: 'scanner' } } as any);
      return;
    }
    
    try {
      console.log('[Scanner] Taking photo...');
      setIsIdentifying(true);

      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: true,
      });

      if (!photo || !photo.base64) {
        console.error('[Scanner] Failed to capture photo');
        setIsIdentifying(false);
        return;
      }

      const imageUri = `data:image/jpeg;base64,${photo.base64}`;
      setCapturedImage(imageUri);

      console.log('[Scanner] Removing background from photo...');
      const processedImageBase64 = await removeBackground(photo.base64);

      console.log('[Scanner] Photo processed, identifying product...');
      const product = await identifyProductFromPhoto(processedImageBase64);
      
      if (!product) {
        console.error('[Scanner] Failed to identify product');
        setIsIdentifying(false);
        setCapturedImage(null);
        return;
      }

      const productWithProcessedImage = {
        ...product,
        imageUrl: `data:image/jpeg;base64,${processedImageBase64}`,
      };

      addScan(productWithProcessedImage);
      await incrementScanCount();
      
      if (params.fromMealTracker === 'true' && params.mealType && params.date) {
        console.log('[Scanner] Adding to meal tracker:', params.mealType, params.date);
        addMeal(params.date, params.mealType as MealType, productWithProcessedImage);
        setIsIdentifying(false);
        setCapturedImage(null);
        router.replace('/(tabs)/meals' as Href);
      } else {
        setIsIdentifying(false);
        setCapturedImage(null);
        router.replace({ pathname: '/product/[barcode]', params: { barcode: productWithProcessedImage.barcode } } as Href);
      }
    } catch (error) {
      console.error('[Scanner] Error taking photo:', error);
      setIsIdentifying(false);
      setCapturedImage(null);
    }
  }, [isIdentifying, addScan, router, identifyProductFromPhoto, canScan, incrementScanCount, removeBackground, addMeal, params.date, params.fromMealTracker, params.mealType]);

  const handleDemoScan = useCallback(async () => {
    if (isIdentifying) return;
    setIsIdentifying(true);
    
    const demoProduct: Product = {
      id: 'demo-' + Date.now(),
      barcode: 'demo-' + Date.now(),
      name: 'Sample Granola Bar',
      brand: 'Nature Valley',
      category: 'Snacks',
      imageUrl: 'https://images.unsplash.com/photo-1604085792782-8d92ff2393ce?w=400',
      healthScore: 72,
      nutrition: {
        calories: 190,
        fat: 7,
        saturatedFat: 1,
        carbohydrates: 29,
        sugar: 12,
        fiber: 3,
        protein: 4,
        sodium: 160,
        servingSize: '2 bars (42g)',
      },
      ingredients: ['Whole grain oats', 'Sugar', 'Canola oil', 'Rice flour', 'Honey', 'Salt', 'Soy lecithin', 'Baking soda', 'Natural flavor'],
      allergens: ['Soy', 'May contain traces of nuts'],
      additives: [],
      isOrganic: false,
      isVegan: false,
      isGlutenFree: false,
    };

    console.log('[Scanner] Demo product created');
    addScan(demoProduct);
    setIsIdentifying(false);
    router.replace({ pathname: '/product/[barcode]', params: { barcode: demoProduct.barcode } } as Href);
  }, [isIdentifying, addScan, router]);



  if (!permission) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading camera...</Text>
        </View>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.permissionContainer}>
          <View style={styles.permissionContent}>
            <View style={styles.permissionIconContainer}>
              <Scan color={Colors.primary} size={48} />
            </View>
            <Text style={styles.permissionTitle}>Camera Access Needed</Text>
            <Text style={styles.permissionText}>
              NutriScan needs camera access to take photos and analyze food products
            </Text>
            <TouchableOpacity
              style={styles.permissionButton}
              onPress={requestPermission}
            >
              <Text style={styles.permissionButtonText}>Grant Access</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => router.back()}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {capturedImage ? (
        <Image
          source={{ uri: capturedImage }}
          style={StyleSheet.absoluteFillObject}
          resizeMode="cover"
        />
      ) : Platform.OS !== 'web' ? (
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFillObject}
          facing="back"
          enableTorch={torch}
        />
      ) : (
        <View style={[StyleSheet.absoluteFillObject, styles.webCameraPlaceholder]}>
          <Text style={styles.webCameraText}>Camera preview not available on web</Text>
          <Text style={styles.webCameraSubtext}>Use the demo button below</Text>
        </View>
      )}

      <View style={styles.overlay}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Take Photo</Text>
          </View>

          <View style={styles.centerContainer}>
            <View style={styles.controlButtons}>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => router.back()}
                testID="close-scanner"
              >
                <X color="#FFFFFF" size={24} />
              </TouchableOpacity>
              {Platform.OS !== 'web' && (
                <TouchableOpacity
                  style={styles.torchButton}
                  onPress={() => setTorch(!torch)}
                  testID="toggle-torch"
                >
                  {torch ? (
                    <FlashlightOff color="#FFFFFF" size={24} />
                  ) : (
                    <Flashlight color="#FFFFFF" size={24} />
                  )}
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.targetFrame}>
              <View style={[styles.corner, styles.cornerTopLeft]} />
              <View style={[styles.corner, styles.cornerTopRight]} />
              <View style={[styles.corner, styles.cornerBottomLeft]} />
              <View style={[styles.corner, styles.cornerBottomRight]} />
            </View>
            <Text style={styles.hintText}>
              {isIdentifying ? 'Analyzing product...' : 'Position the product within the frame'}
            </Text>
            {!isPremium && (
              <View style={styles.scanCountBadge}>
                <Text style={styles.scanCountText}>
                  {scansRemaining} free {scansRemaining === 1 ? 'scan' : 'scans'} remaining today
                </Text>
              </View>
            )}
          </View>

          <View style={styles.footer}>
            {Platform.OS !== 'web' && (
              <TouchableOpacity
                style={[styles.captureButton, isIdentifying && styles.captureButtonDisabled]}
                onPress={handleTakePhoto}
                disabled={isIdentifying}
                testID="capture-button"
              >
                {isIdentifying ? (
                  <ActivityIndicator color="#FFFFFF" size="large" />
                ) : (
                  <Camera color="#FFFFFF" size={32} />
                )}
              </TouchableOpacity>
            )}
            {Platform.OS === 'web' && (
              <TouchableOpacity
                style={styles.demoButton}
                onPress={handleDemoScan}
                disabled={isIdentifying}
                testID="demo-button"
              >
                <Text style={styles.demoButtonText}>Try Demo</Text>
              </TouchableOpacity>
            )}
          </View>
        </SafeAreaView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  permissionContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  permissionIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  permissionButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 16,
    marginBottom: 16,
  },
  permissionButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  webCameraPlaceholder: {
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  webCameraText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600' as const,
    marginBottom: 8,
  },
  webCameraSubtext: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 16,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  torchButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholder: {
    width: 44,
    height: 44,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingHorizontal: 24,
    width: '100%',
  },
  targetFrame: {
    width: width * 0.8,
    height: height * 0.5,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: '#FFFFFF',
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 5,
    borderLeftWidth: 5,
    borderTopLeftRadius: 12,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 5,
    borderRightWidth: 5,
    borderTopRightRadius: 12,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 5,
    borderLeftWidth: 5,
    borderBottomLeftRadius: 12,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 5,
    borderRightWidth: 5,
    borderBottomRightRadius: 12,
  },
  hintText: {
    marginTop: 32,
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    fontWeight: '600' as const,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  scanCountBadge: {
    marginTop: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  scanCountText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    alignItems: 'center',
    gap: 16,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  captureButtonDisabled: {
    opacity: 0.6,
  },
  demoButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 24,
    alignItems: 'center',
  },
  demoButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  cancelButton: {
    paddingVertical: 12,
  },
  cancelButtonText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
});
