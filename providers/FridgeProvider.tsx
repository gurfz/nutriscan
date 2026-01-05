import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback } from 'react';
import { Product } from '@/types/product';

const FRIDGE_STORAGE_KEY = 'fridge_items';
const GROCERY_LIST_STORAGE_KEY = 'grocery_list_items';

export const [FridgeProvider, useFridge] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [fridgeItems, setFridgeItems] = useState<Product[]>([]);
  const [groceryList, setGroceryList] = useState<Product[]>([]);

  const fridgeQuery = useQuery({
    queryKey: ['fridge'],
    queryFn: async () => {
      console.log('[Fridge] Loading fridge items from storage...');
      const stored = await AsyncStorage.getItem(FRIDGE_STORAGE_KEY);
      const data = stored ? JSON.parse(stored) : [];
      console.log('[Fridge] Loaded', data.length, 'items');
      return data as Product[];
    },
  });

  const groceryListQuery = useQuery({
    queryKey: ['groceryList'],
    queryFn: async () => {
      console.log('[GroceryList] Loading grocery list from storage...');
      const stored = await AsyncStorage.getItem(GROCERY_LIST_STORAGE_KEY);
      const data = stored ? JSON.parse(stored) : [];
      console.log('[GroceryList] Loaded', data.length, 'items');
      return data as Product[];
    },
  });

  useEffect(() => {
    if (fridgeQuery.data) {
      setFridgeItems(fridgeQuery.data);
    }
  }, [fridgeQuery.data]);

  useEffect(() => {
    if (groceryListQuery.data) {
      setGroceryList(groceryListQuery.data);
    }
  }, [groceryListQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async (newFridgeItems: Product[]) => {
      console.log('[Fridge] Saving fridge items...', newFridgeItems.length, 'items');
      await AsyncStorage.setItem(FRIDGE_STORAGE_KEY, JSON.stringify(newFridgeItems));
      return newFridgeItems;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fridge'] });
    },
  });

  const saveGroceryListMutation = useMutation({
    mutationFn: async (newGroceryList: Product[]) => {
      console.log('[GroceryList] Saving grocery list...', newGroceryList.length, 'items');
      await AsyncStorage.setItem(GROCERY_LIST_STORAGE_KEY, JSON.stringify(newGroceryList));
      return newGroceryList;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groceryList'] });
    },
  });

  const { mutate: saveFridge } = saveMutation;
  const { mutate: saveGroceryList } = saveGroceryListMutation;

  const addToFridge = useCallback((product: Product) => {
    console.log('[Fridge] Adding to fridge:', product.name);
    setFridgeItems(prev => {
      const exists = prev.find(p => p.barcode === product.barcode);
      if (exists) {
        return prev;
      }
      const newFridge = [...prev, product];
      saveFridge(newFridge);
      return newFridge;
    });
  }, [saveFridge]);

  const removeFromFridge = useCallback((barcode: string) => {
    console.log('[Fridge] Removing from fridge:', barcode);
    setFridgeItems(prev => {
      const newFridge = prev.filter(p => p.barcode !== barcode);
      saveFridge(newFridge);
      return newFridge;
    });
  }, [saveFridge]);

  const isInFridge = useCallback((barcode: string): boolean => {
    return fridgeItems.some(p => p.barcode === barcode);
  }, [fridgeItems]);

  const toggleFridge = useCallback((product: Product) => {
    if (isInFridge(product.barcode)) {
      removeFromFridge(product.barcode);
    } else {
      addToFridge(product);
    }
  }, [isInFridge, addToFridge, removeFromFridge]);

  const addToGroceryList = useCallback((product: Product) => {
    console.log('[GroceryList] Adding to grocery list:', product.name);
    setGroceryList(prev => {
      const exists = prev.find(p => p.barcode === product.barcode);
      if (exists) {
        return prev;
      }
      const newList = [...prev, product];
      saveGroceryList(newList);
      return newList;
    });
  }, [saveGroceryList]);

  const removeFromGroceryList = useCallback((barcode: string) => {
    console.log('[GroceryList] Removing from grocery list:', barcode);
    setGroceryList(prev => {
      const newList = prev.filter(p => p.barcode !== barcode);
      saveGroceryList(newList);
      return newList;
    });
  }, [saveGroceryList]);

  const isInGroceryList = useCallback((barcode: string): boolean => {
    return groceryList.some(p => p.barcode === barcode);
  }, [groceryList]);

  return {
    fridgeItems,
    addToFridge,
    removeFromFridge,
    isInFridge,
    toggleFridge,
    isLoading: fridgeQuery.isLoading,
    groceryList,
    addToGroceryList,
    removeFromGroceryList,
    isInGroceryList,
  };
});
