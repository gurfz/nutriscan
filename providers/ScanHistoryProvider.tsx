import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ScannedProduct, Product } from '@/types/product';

const STORAGE_KEY = 'scan_history';
const PRODUCTS_STORAGE_KEY = 'products_data';
const FAVORITES_STORAGE_KEY = 'favorites';

export const [ScanHistoryProvider, useScanHistory] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [history, setHistory] = useState<ScannedProduct[]>([]);
  const [productsData, setProductsData] = useState<Record<string, Product>>({});
  const [favorites, setFavorites] = useState<string[]>([]);
  const removeFromFridgeRef = useRef<((barcode: string) => void) | null>(null);

  const historyQuery = useQuery({
    queryKey: ['scanHistory'],
    queryFn: async () => {
      console.log('[ScanHistory] Loading history from storage...');
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      const data = stored ? JSON.parse(stored) : [];
      console.log('[ScanHistory] Loaded', data.length, 'items');
      return data as ScannedProduct[];
    },
  });

  const productsQuery = useQuery({
    queryKey: ['productsData'],
    queryFn: async () => {
      console.log('[ScanHistory] Loading products data from storage...');
      const stored = await AsyncStorage.getItem(PRODUCTS_STORAGE_KEY);
      const data = stored ? JSON.parse(stored) : {};
      console.log('[ScanHistory] Loaded', Object.keys(data).length, 'products');
      return data as Record<string, Product>;
    },
  });

  const favoritesQuery = useQuery({
    queryKey: ['favorites'],
    queryFn: async () => {
      console.log('[ScanHistory] Loading favorites from storage...');
      const stored = await AsyncStorage.getItem(FAVORITES_STORAGE_KEY);
      const data = stored ? JSON.parse(stored) : [];
      console.log('[ScanHistory] Loaded', data.length, 'favorites');
      return data as string[];
    },
  });

  useEffect(() => {
    if (historyQuery.data) {
      setHistory(historyQuery.data);
    }
  }, [historyQuery.data]);

  useEffect(() => {
    if (productsQuery.data) {
      setProductsData(productsQuery.data);
    }
  }, [productsQuery.data]);

  useEffect(() => {
    if (favoritesQuery.data) {
      setFavorites(favoritesQuery.data);
    }
  }, [favoritesQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async (newHistory: ScannedProduct[]) => {
      console.log('[ScanHistory] Saving history...', newHistory.length, 'items');
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
      return newHistory;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scanHistory'] });
    },
  });

  const saveProductsMutation = useMutation({
    mutationFn: async (newProductsData: Record<string, Product>) => {
      console.log('[ScanHistory] Saving products data...', Object.keys(newProductsData).length, 'items');
      await AsyncStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(newProductsData));
      return newProductsData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productsData'] });
    },
  });

  const saveFavoritesMutation = useMutation({
    mutationFn: async (newFavorites: string[]) => {
      console.log('[ScanHistory] Saving favorites...', newFavorites.length, 'items');
      await AsyncStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(newFavorites));
      return newFavorites;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
  });

  const { mutate: saveHistory } = saveMutation;
  const { mutate: saveProductsData } = saveProductsMutation;
  const { mutate: saveFavorites } = saveFavoritesMutation;

  const addScan = useCallback((product: Product) => {
    console.log('[ScanHistory] Adding scan:', product.name);
    const scannedProduct: ScannedProduct = {
      ...product,
      scannedAt: new Date().toISOString(),
    };
    setHistory(prev => {
      const newHistory = [scannedProduct, ...prev.filter(p => p.barcode !== product.barcode)];
      saveHistory(newHistory);
      return newHistory;
    });
    setProductsData(prev => {
      const newProductsData = { ...prev, [product.barcode]: product };
      saveProductsData(newProductsData);
      return newProductsData;
    });
  }, [saveHistory, saveProductsData]);

  const clearHistory = useCallback(() => {
    console.log('[ScanHistory] Clearing history');
    setHistory([]);
    saveHistory([]);
  }, [saveHistory]);

  const removeFromHistory = useCallback((barcode: string) => {
    console.log('[ScanHistory] Removing item:', barcode);
    setHistory(prev => {
      const newHistory = prev.filter(p => p.barcode !== barcode);
      saveHistory(newHistory);
      return newHistory;
    });
    
    if (removeFromFridgeRef.current) {
      console.log('[ScanHistory] Also removing from fridge:', barcode);
      removeFromFridgeRef.current(barcode);
    }
  }, [saveHistory]);

  const setFridgeRemover = useCallback((remover: (barcode: string) => void) => {
    removeFromFridgeRef.current = remover;
  }, []);

  const getProduct = useCallback((barcode: string): Product | undefined => {
    return productsData[barcode];
  }, [productsData]);

  const toggleFavorite = useCallback((barcode: string) => {
    console.log('[ScanHistory] Toggling favorite:', barcode);
    setFavorites(prev => {
      const newFavorites = prev.includes(barcode)
        ? prev.filter(b => b !== barcode)
        : [...prev, barcode];
      saveFavorites(newFavorites);
      return newFavorites;
    });
  }, [saveFavorites]);

  const isFavorite = useCallback((barcode: string): boolean => {
    return favorites.includes(barcode);
  }, [favorites]);

  const recentScans = useMemo(() => history.slice(0, 5), [history]);
  const favoriteProducts = useMemo(() => 
    history.filter(p => favorites.includes(p.barcode)),
    [history, favorites]
  );

  return {
    history,
    recentScans,
    favoriteProducts,
    addScan,
    clearHistory,
    removeFromHistory,
    setFridgeRemover,
    getProduct,
    toggleFavorite,
    isFavorite,
    isLoading: historyQuery.isLoading || productsQuery.isLoading || favoritesQuery.isLoading,
  };
});
