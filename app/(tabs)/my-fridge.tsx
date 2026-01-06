import React from 'react';
import { View, StyleSheet } from 'react-native';
import Colors from '@/constants/colors';
import MyFridgePage from '@/components/pages/MyFridgePage';

export default function MyFridgeTab() {
  return (
    <View style={styles.container}>
      <MyFridgePage />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
});
