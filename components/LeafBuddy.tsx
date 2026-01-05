import React, { useEffect, useRef, useState } from 'react';
import { View, Animated, TouchableOpacity, StyleSheet, Easing, Platform } from 'react-native';
import { Leaf } from 'lucide-react-native';
import Colors from '@/constants/colors';
import * as Haptics from 'expo-haptics';

type LeafState = 'idle' | 'crawling' | 'happy' | 'excited' | 'sleeping';

export default function LeafBuddy() {
  const [state, setState] = useState<LeafState>('idle');
  const positionX = useRef(new Animated.Value(0)).current;
  const positionY = useRef(new Animated.Value(0)).current;
  const rotation = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const bounce = useRef(new Animated.Value(0)).current;
  const eyeScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounce, {
          toValue: -3,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(bounce, {
          toValue: 0,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(rotation, {
          toValue: -5,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(rotation, {
          toValue: 5,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [bounce, rotation]);

  useEffect(() => {
    const crawlInterval = setInterval(() => {
      if (Math.random() > 0.7) {
        setState('crawling');
        const newX = (Math.random() - 0.5) * 40;
        const newY = (Math.random() - 0.5) * 20;

        Animated.parallel([
          Animated.timing(positionX, {
            toValue: newX,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(positionY, {
            toValue: newY,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(rotation, {
              toValue: newX > 0 ? 20 : -20,
              duration: 750,
              useNativeDriver: true,
            }),
            Animated.timing(rotation, {
              toValue: 0,
              duration: 750,
              useNativeDriver: true,
            }),
          ]),
        ]).start(() => {
          setState('idle');
        });
      }
    }, 3000);

    return () => clearInterval(crawlInterval);
  }, [positionX, positionY, rotation]);

  useEffect(() => {
    const blinkInterval = setInterval(() => {
      if (Math.random() > 0.7) {
        Animated.sequence([
          Animated.timing(eyeScale, {
            toValue: 0.1,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(eyeScale, {
            toValue: 1,
            duration: 100,
            useNativeDriver: true,
          }),
        ]).start();
      }
    }, 2000);

    return () => clearInterval(blinkInterval);
  }, [eyeScale]);

  const handleLeafTap = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setState('happy');

    Animated.sequence([
      Animated.parallel([
        Animated.timing(scale, {
          toValue: 1.3,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(rotation, {
          toValue: 360,
          duration: 500,
          easing: Easing.out(Easing.back(2)),
          useNativeDriver: true,
        }),
      ]),
      Animated.spring(scale, {
        toValue: 1,
        friction: 3,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setState('idle');
      rotation.setValue(0);
    });
  };

  const handleNearTap = (side: 'left' | 'right' | 'top' | 'bottom') => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setState('excited');

    const moveAmount = 30;
    let targetX = 0;
    let targetY = 0;

    switch (side) {
      case 'left':
        targetX = moveAmount;
        break;
      case 'right':
        targetX = -moveAmount;
        break;
      case 'top':
        targetY = moveAmount;
        break;
      case 'bottom':
        targetY = -moveAmount;
        break;
    }

    Animated.sequence([
      Animated.parallel([
        Animated.spring(positionX, {
          toValue: targetX,
          friction: 4,
          tension: 80,
          useNativeDriver: true,
        }),
        Animated.spring(positionY, {
          toValue: targetY,
          friction: 4,
          tension: 80,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 0.8,
          duration: 100,
          useNativeDriver: true,
        }),
      ]),
      Animated.spring(scale, {
        toValue: 1,
        friction: 3,
        useNativeDriver: true,
      }),
      Animated.spring(positionX, {
        toValue: 0,
        friction: 5,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.spring(positionY, {
        toValue: 0,
        friction: 5,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setState('idle');
    });
  };

  const leafColor = state === 'happy' ? Colors.primary : state === 'excited' ? '#FFB800' : '#4CAF50';

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.topArea}
        onPress={() => handleNearTap('top')}
        activeOpacity={1}
      />
      <View style={styles.middleRow}>
        <TouchableOpacity
          style={styles.leftArea}
          onPress={() => handleNearTap('left')}
          activeOpacity={1}
        />
        <Animated.View
          style={[
            styles.leafContainer,
            {
              transform: [
                { translateX: positionX },
                { translateY: Animated.add(positionY, bounce) },
                { scale },
                { rotate: rotation.interpolate({
                  inputRange: [0, 360],
                  outputRange: ['0deg', '360deg'],
                }) },
              ],
            },
          ]}
        >
          <TouchableOpacity
            onPress={handleLeafTap}
            activeOpacity={0.8}
            style={styles.leafTouchable}
          >
            <View style={styles.leafWrapper}>
              <Leaf color={leafColor} size={32} fill={leafColor} />
              <View style={styles.faceContainer}>
                <Animated.View style={[styles.eyeContainer, { transform: [{ scaleY: eyeScale }] }]}>
                  <View style={styles.eye} />
                  <View style={styles.eye} />
                </Animated.View>
                {(state === 'happy' || state === 'excited') && (
                  <View style={styles.smile} />
                )}
              </View>
            </View>
          </TouchableOpacity>
        </Animated.View>
        <TouchableOpacity
          style={styles.rightArea}
          onPress={() => handleNearTap('right')}
          activeOpacity={1}
        />
      </View>
      <TouchableOpacity
        style={styles.bottomArea}
        onPress={() => handleNearTap('bottom')}
        activeOpacity={1}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topArea: {
    width: 100,
    height: 20,
  },
  middleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 60,
  },
  leftArea: {
    width: 20,
    height: 60,
  },
  rightArea: {
    width: 20,
    height: 60,
  },
  bottomArea: {
    width: 100,
    height: 20,
  },
  leafContainer: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  leafTouchable: {
    padding: 10,
  },
  leafWrapper: {
    position: 'relative',
    width: 32,
    height: 32,
  },
  faceContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eyeContainer: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
  },
  eye: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#1a1a1a',
  },
  smile: {
    width: 8,
    height: 4,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
    borderColor: '#1a1a1a',
    borderBottomWidth: 1.5,
    borderLeftWidth: 1.5,
    borderRightWidth: 1.5,
    marginTop: 1,
  },
});
