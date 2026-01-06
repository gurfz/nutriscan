import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  Animated,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import ScannerPage from '@/components/pages/ScannerPage';
import MyFridgePage from '@/components/pages/MyFridgePage';
import TrackerPage from '@/components/pages/TrackerPage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type PageType = 'scanner' | 'fridge' | 'tracker';

export default function HomeScreen() {
  const scrollViewRef = useRef<ScrollView>(null);
  const [activePage, setActivePage] = useState<PageType>('scanner');
  const scrollX = useRef(new Animated.Value(0)).current;

  const handlePagePress = (page: PageType, index: number) => {
    setActivePage(page);
    scrollViewRef.current?.scrollTo({ x: index * SCREEN_WIDTH, animated: true });
  };

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    {
      useNativeDriver: false,
      listener: (event: any) => {
        const offsetX = event.nativeEvent.contentOffset.x;
        const pageIndex = Math.round(offsetX / SCREEN_WIDTH);
        const pages: PageType[] = ['scanner', 'fridge', 'tracker'];
        if (pages[pageIndex] && pages[pageIndex] !== activePage) {
          setActivePage(pages[pageIndex]);
        }
      },
    }
  );

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.tabBar}>
          <TouchableOpacity 
            style={styles.tabItem}
            onPress={() => handlePagePress('scanner', 0)}
          >
            <Text style={[styles.tabText, activePage === 'scanner' && styles.tabTextActive]}>
              Scanner
            </Text>
            {activePage === 'scanner' && <View style={styles.tabIndicator} />}
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.tabItem}
            onPress={() => handlePagePress('fridge', 1)}
          >
            <Text style={[styles.tabText, activePage === 'fridge' && styles.tabTextActive]}>
              My Fridge
            </Text>
            {activePage === 'fridge' && <View style={styles.tabIndicator} />}
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.tabItem}
            onPress={() => handlePagePress('tracker', 2)}
          >
            <Text style={[styles.tabText, activePage === 'tracker' && styles.tabTextActive]}>
              Tracker
            </Text>
            {activePage === 'tracker' && <View style={styles.tabIndicator} />}
          </TouchableOpacity>
        </View>

        <Animated.ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          bounces={false}
        >
          <View style={styles.page}>
            <ScannerPage />
          </View>
          <View style={styles.page}>
            <MyFridgePage />
          </View>
          <View style={styles.page}>
            <TrackerPage />
          </View>
        </Animated.ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  safeArea: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.textMuted,
  },
  tabTextActive: {
    color: Colors.primary,
    fontWeight: '700' as const,
  },
  tabIndicator: {
    marginTop: 6,
    width: 40,
    height: 3,
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  page: {
    width: SCREEN_WIDTH,
    flex: 1,
  },
});
