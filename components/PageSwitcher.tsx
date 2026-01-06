import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import Colors from '@/constants/colors';

type PageType = 'scanner' | 'fridge' | 'tracker';

interface PageSwitcherProps {
  currentPage: PageType;
}

export default function PageSwitcher({ currentPage }: PageSwitcherProps) {
  const router = useRouter();

  const pages: { type: PageType; label: string; route: string }[] = [
    { type: 'scanner', label: 'Scanner', route: '/' },
    { type: 'fridge', label: 'My Fridge', route: '/fridge' },
    { type: 'tracker', label: 'Tracker', route: '/tracker' },
  ];

  const handlePageChange = (route: string) => {
    router.push(route as any);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        scrollEnabled={false}
      >
        {pages.map((page) => {
          const isActive = page.type === currentPage;
          return (
            <TouchableOpacity
              key={page.type}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => handlePageChange(page.route)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {page.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 12,
  },
  scrollContent: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  tab: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  tabActive: {
    backgroundColor: Colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  tabTextActive: {
    color: Colors.text,
    fontWeight: '700' as const,
  },
});
