import React from 'react';
import { View, StyleSheet } from 'react-native';
import Colors from '@/constants/colors';
import TrackerPage from '@/components/pages/TrackerPage';

export default function TrackerTab() {
  return (
    <View style={styles.container}>
      <TrackerPage />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
});
