import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import {
  View,
  Animated,
  TouchableOpacity,
  StyleSheet,
  Easing,
  Platform,
  Dimensions,
  TextInput,
  ScrollView,
  Text,
  Pressable,
  PanResponder,
  Keyboard,
  Alert,
} from 'react-native';
import { Leaf, X, Send, Trash2, Plus } from 'lucide-react-native';
import Colors from '@/constants/colors';
import * as Haptics from 'expo-haptics';
import { useLeafBuddy } from '@/providers/LeafBuddyProvider';
import { useFridge } from '@/providers/FridgeProvider';
import { useMealTracker } from '@/providers/MealTrackerProvider';
import { useSettings } from '@/providers/SettingsProvider';
import { useSubscription } from '@/providers/SubscriptionProvider';
import { useRorkAgent } from '@rork-ai/toolkit-sdk';
import { useRouter } from 'expo-router';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const MESSAGE_RATE_LIMIT = 25;

type LeafState = 'idle' | 'crawling' | 'happy' | 'excited' | 'sleeping' | 'talking';

export default function GlobalLeafBuddy() {
  const router = useRouter();
  const { position, updatePosition, isChatOpen, openChat, closeChat, positionRef, chatSessions, currentChatId, createNewChat, loadChat, updateCurrentChat, getCurrentChat, deleteChat, canSendMessage, recordMessage } = useLeafBuddy();
  const { fridgeItems } = useFridge();
  const { trackedMeals, getDayStats } = useMealTracker();
  const { leafBuddyEnabled } = useSettings();
  const { isPremium } = useSubscription();

  const [state, setState] = useState<LeafState>('idle');
  const [inputText, setInputText] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [showChatList, setShowChatList] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const homePosition = useRef({ x: 0, y: 0 });
  const scrollViewRef = useRef<ScrollView>(null);

  const positionX = useRef(new Animated.Value(position.x)).current;
  const positionY = useRef(new Animated.Value(position.y)).current;
  const rotation = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const bounce = useRef(new Animated.Value(0)).current;
  const eyeScale = useRef(new Animated.Value(1)).current;
  const chatScale = useRef(new Animated.Value(0)).current;
  const chatOpacity = useRef(new Animated.Value(0)).current;

  const clampPosition = useCallback((x: number, y: number) => {
    const LEAF_SIZE = 60;
    const SAFE_MARGIN = 80;
    
    const maxX = SCREEN_WIDTH / 2 - LEAF_SIZE - SAFE_MARGIN;
    const minX = -SCREEN_WIDTH / 2 + SAFE_MARGIN;
    const maxY = SCREEN_HEIGHT / 2 - LEAF_SIZE - SAFE_MARGIN - 100;
    const minY = -SCREEN_HEIGHT / 2 + SAFE_MARGIN + 100;

    return {
      x: Math.max(minX, Math.min(maxX, x)),
      y: Math.max(minY, Math.min(maxY, y)),
    };
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt, gestureState) => {
        setIsDragging(true);
        dragStartPos.current = { x: positionRef.current.x, y: positionRef.current.y };
        if (Platform.OS !== 'web') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
        Animated.spring(scale, {
          toValue: 1.15,
          friction: 5,
          useNativeDriver: true,
        }).start();
      },
      onPanResponderMove: (evt, gestureState) => {
        const newX = dragStartPos.current.x + gestureState.dx;
        const newY = dragStartPos.current.y + gestureState.dy;

        const clamped = clampPosition(newX, newY);

        positionX.setValue(clamped.x);
        positionY.setValue(clamped.y);
        updatePosition(clamped.x, clamped.y);
      },
      onPanResponderRelease: (evt, gestureState) => {
        setIsDragging(false);
        Animated.spring(scale, {
          toValue: 1,
          friction: 5,
          useNativeDriver: true,
        }).start();

        const currentX = positionRef.current.x;
        const currentY = positionRef.current.y;
        
        const clamped = clampPosition(currentX, currentY);
        let targetX = clamped.x;
        let targetY = clamped.y;

        if (Math.abs(currentX) > 80 || Math.abs(currentY) > 80) {
          const nudgeAmount = 40;
          if (currentX < -50) {
            targetX = Math.max(targetX - nudgeAmount, -80);
          } else if (currentX > 50) {
            targetX = Math.min(targetX + nudgeAmount, 80);
          }
          
          if (currentY < -50) {
            targetY = Math.max(targetY - nudgeAmount, -80);
          } else if (currentY > 50) {
            targetY = Math.min(targetY + nudgeAmount, 80);
          }
        } else {
          targetX = homePosition.current.x;
          targetY = homePosition.current.y;
        }

        const finalTarget = clampPosition(targetX, targetY);

        const returnDuration = 6000;
        Animated.parallel([
          Animated.timing(positionX, {
            toValue: finalTarget.x,
            duration: returnDuration,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1),
            useNativeDriver: true,
          }),
          Animated.timing(positionY, {
            toValue: finalTarget.y,
            duration: returnDuration,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1),
            useNativeDriver: true,
          }),
        ]).start(() => {
          updatePosition(finalTarget.x, finalTarget.y);
        });
      },
    })
  ).current;

  const today = new Date().toISOString().split('T')[0];
  const todayStats = getDayStats(today);

  const greetingMessages = useMemo(() => [
    "Hi! I'm LeafBuddy 🌱\n\nAsk me about nutrition, recipes, or your health goals!",
    "Hey there! 👋\n\nI can help with meal ideas, nutrition advice, and more!",
    "Hello! 🍃\n\nReady to chat about your diet and wellness?",
    "Hi friend! 💚\n\nWhat would you like to know about nutrition today?",
  ], []);

  const systemContext = useMemo(() => {
    const fridgeList = fridgeItems.map(p => `- ${p.name}: Health score ${p.healthScore}/100, ${p.nutrition.calories} cal, ${p.nutrition.protein}g protein`).join('\n');
    const mealHistory = trackedMeals.slice(0, 10).map(m => `- ${m.product.name} (${m.mealType}) on ${m.date}`).join('\n');
    
    return `You are LeafBuddy, a friendly and encouraging nutrition assistant. You help users with their diet, nutrition goals, and healthy eating.

Current user data:
- Fridge items: ${fridgeItems.length} products (${fridgeItems.map(p => p.name).join(', ')})
- Today's stats: ${todayStats.totalItems} meals tracked, ${todayStats.totalCalories} calories, ${todayStats.totalProtein}g protein, ${todayStats.waterIntake} cups of water

Available fridge items for recipes:
${fridgeList}

Recent meal history:
${mealHistory}

Be supportive, enthusiastic, and helpful. Keep responses concise and friendly. Suggest healthy recipes based on fridge items when asked.`;
  }, [fridgeItems, trackedMeals, todayStats]);

  const { messages, sendMessage, setMessages } = useRorkAgent({
    tools: {},
  });

  useEffect(() => {
    if (currentChatId) {
      const currentChat = getCurrentChat();
      if (currentChat) {
        setMessages(currentChat.messages);
      }
    }
  }, [currentChatId, getCurrentChat, setMessages]);

  useEffect(() => {
    if (currentChatId && messages.length > 0) {
      updateCurrentChat(messages);
    }
  }, [messages, currentChatId, updateCurrentChat]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounce, {
          toValue: -6,
          duration: 1200,
          easing: Easing.bezier(0.45, 0.05, 0.55, 0.95),
          useNativeDriver: true,
        }),
        Animated.timing(bounce, {
          toValue: 0,
          duration: 1200,
          easing: Easing.bezier(0.45, 0.05, 0.55, 0.95),
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(rotation, {
          toValue: -6,
          duration: 2500,
          easing: Easing.bezier(0.4, 0.0, 0.6, 1),
          useNativeDriver: true,
        }),
        Animated.timing(rotation, {
          toValue: 6,
          duration: 2500,
          easing: Easing.bezier(0.4, 0.0, 0.6, 1),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [bounce, rotation]);

  useEffect(() => {
    const crawlInterval = setInterval(() => {
      if (Math.random() > 0.5 && !isChatOpen && !isDragging) {
        setState('crawling');
        const maxMoveX = 100;
        const maxMoveY = 80;
        let targetX = (Math.random() - 0.5) * maxMoveX;
        let targetY = (Math.random() - 0.5) * maxMoveY;

        const avoidanceMargin = 70;
        if (Math.abs(targetX) < 40 && Math.abs(targetY) < 40) {
          targetX = targetX > 0 ? avoidanceMargin : -avoidanceMargin;
        }

        const clamped = clampPosition(targetX, targetY);

        Animated.parallel([
          Animated.timing(positionX, {
            toValue: clamped.x,
            duration: 3500,
            easing: Easing.bezier(0.4, 0.0, 0.6, 1),
            useNativeDriver: true,
          }),
          Animated.timing(positionY, {
            toValue: clamped.y,
            duration: 3500,
            easing: Easing.bezier(0.4, 0.0, 0.6, 1),
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(rotation, {
              toValue: clamped.x > 0 ? 20 : -20,
              duration: 1750,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(rotation, {
              toValue: 0,
              duration: 1750,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
          ]),
        ]).start(() => {
          setState('idle');
          updatePosition(clamped.x, clamped.y);
        });
      }
    }, 6000);

    return () => clearInterval(crawlInterval);
  }, [positionX, positionY, rotation, isChatOpen, updatePosition, isDragging, clampPosition]);

  useEffect(() => {
    const blinkInterval = setInterval(() => {
      if (Math.random() > 0.6) {
        Animated.sequence([
          Animated.timing(eyeScale, {
            toValue: 0.1,
            duration: 80,
            useNativeDriver: true,
          }),
          Animated.timing(eyeScale, {
            toValue: 1,
            duration: 80,
            useNativeDriver: true,
          }),
        ]).start();
      }
    }, 2500);

    return () => clearInterval(blinkInterval);
  }, [eyeScale]);

  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
      }
    );
    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);

  useEffect(() => {
    if (isChatOpen) {
      setState('talking');
      chatScale.setValue(1);
      chatOpacity.setValue(1);

      if (!currentChatId) {
        setShowChatList(true);
      } else {
        setShowChatList(false);
        const currentChat = getCurrentChat();
        if (currentChat && currentChat.messages.length === 0) {
          const greeting = greetingMessages[Math.floor(Math.random() * greetingMessages.length)];
          setMessages([
            {
              id: 'system',
              role: 'system',
              parts: [{ type: 'text' as const, text: systemContext }],
            },
            {
              id: 'greeting',
              role: 'assistant',
              parts: [{ type: 'text' as const, text: greeting }],
            },
          ]);
        }
      }
    } else {
      Animated.parallel([
        Animated.timing(chatScale, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(chatOpacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setState('idle');
        setShowChatList(false);
      });
      setKeyboardHeight(0);
    }
  }, [isChatOpen, chatScale, chatOpacity, currentChatId, getCurrentChat, greetingMessages, setMessages, systemContext]);

  const handleLeafTap = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    const moveDistance = 30;
    const randomAngle = Math.random() * Math.PI * 2;
    let targetX = positionRef.current.x + Math.cos(randomAngle) * moveDistance;
    let targetY = positionRef.current.y + Math.sin(randomAngle) * moveDistance;

    const clamped = clampPosition(targetX, targetY);

    Animated.sequence([
      Animated.parallel([
        Animated.timing(scale, {
          toValue: 0.85,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.spring(positionX, {
          toValue: clamped.x,
          friction: 5,
          tension: 120,
          useNativeDriver: true,
        }),
        Animated.spring(positionY, {
          toValue: clamped.y,
          friction: 5,
          tension: 120,
          useNativeDriver: true,
        }),
      ]),
      Animated.spring(scale, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }),
    ]).start(() => {
      updatePosition(clamped.x, clamped.y);
    });
  };

  const handleLongPress = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }

    if (isChatOpen) {
      closeChat();
      return;
    }

    if (!isPremium) {
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
      router.push({ pathname: '/paywall', params: { returnTo: 'stay' } } as any);
      return;
    }

    openChat();
    setState('happy');

    Animated.sequence([
      Animated.timing(scale, {
        toValue: 1.2,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 4,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  };



  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const handleStartNewChat = () => {
    createNewChat();
    setShowChatList(false);
    const greeting = greetingMessages[Math.floor(Math.random() * greetingMessages.length)];
    setMessages([
      {
        id: 'system',
        role: 'system',
        parts: [{ type: 'text' as const, text: systemContext }],
      },
      {
        id: 'greeting',
        role: 'assistant',
        parts: [{ type: 'text' as const, text: greeting }],
      },
    ]);
  };

  const handleSelectChat = (chatId: string) => {
    loadChat(chatId);
    setShowChatList(false);
  };

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;
    
    if (!canSendMessage()) {
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      Alert.alert(
        'Daily Limit Reached',
        `You've reached your daily message limit of ${MESSAGE_RATE_LIMIT} messages. Please try again tomorrow.`,
        [{ text: 'OK' }]
      );
      return;
    }
    
    if (!currentChatId) {
      handleStartNewChat();
      return;
    }
    
    const message = inputText.trim();
    setInputText('');
    setState('talking');
    
    recordMessage();
    await sendMessage(message);
    
    setState('idle');
  };

  const leafColor = 
    state === 'talking' ? '#00D9FF' :
    '#4CAF50';

  if (!leafBuddyEnabled) {
    return null;
  }

  return (
    <>
      <View style={styles.container} pointerEvents="box-none">
        <View
          style={styles.topArea}
          pointerEvents="none"
        />
        <View style={styles.middleRow} pointerEvents="box-none">
          <View
            style={styles.leftArea}
            pointerEvents="none"
          />
          <Animated.View
            style={[
              styles.leafContainer,
              {
                transform: [
                  { translateX: positionX },
                  { translateY: isDragging ? positionY : Animated.add(positionY, bounce) },
                  { scale },
                  {
                    rotate: rotation.interpolate({
                      inputRange: [0, 360],
                      outputRange: ['0deg', '360deg'],
                    }),
                  },
                ],
              },
            ]}
            pointerEvents="auto"
            {...panResponder.panHandlers}
          >
            <Pressable
              onPress={handleLeafTap}
              onLongPress={handleLongPress}
              delayLongPress={500}
              style={styles.leafTouchable}
              disabled={isDragging}
            >
              <View style={styles.leafWrapper}>
                <View style={[styles.glowCircle, { backgroundColor: `${leafColor}25` }]} />
                <Leaf color={leafColor} size={40} fill={leafColor} strokeWidth={2.5} />
                <View style={styles.faceContainer}>
                  <Animated.View style={[styles.eyeContainer, { transform: [{ scaleY: eyeScale }] }]}>
                    <View style={styles.eye} />
                    <View style={styles.eye} />
                  </Animated.View>
                </View>
              </View>
            </Pressable>
          </Animated.View>
          <View
            style={styles.rightArea}
            pointerEvents="none"
          />
        </View>
        <View
          style={styles.bottomArea}
          pointerEvents="none"
        />
      </View>

      {isChatOpen && (
        <Animated.View
          style={[
            styles.chatContainer,
            {
              bottom: keyboardHeight + 100,
            },
          ]}
        >
          <Animated.View
            style={[
              styles.chatBox,
              {
                transform: [{ scale: chatScale }],
                opacity: chatOpacity,
              },
            ]}
          >
            <View style={styles.chatHeader}>
              <View style={styles.chatHeaderLeft}>
                <Leaf color={Colors.primary} size={18} fill={Colors.primary} />
                <View>
                  <Text style={styles.chatTitle}>LeafBuddy</Text>
                  <Text style={styles.chatSubtitle}>Your nutrition assistant</Text>
                </View>
              </View>
              <Pressable 
                onPress={(e) => {
                  e.stopPropagation();
                  console.log('[LeafBuddy] Close button pressed');
                  if (Platform.OS !== 'web') {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                  closeChat();
                }}
                style={styles.closeButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X color="#666" size={18} />
              </Pressable>
            </View>

            {showChatList ? (
              <View style={styles.chatListContainer}>
                {chatSessions.length === 0 ? (
                  <View style={styles.emptyChatList}>
                    <Text style={styles.emptyChatText}>No chats yet!{'\n'}Start a new conversation below</Text>
                  </View>
                ) : (
                  <ScrollView showsVerticalScrollIndicator={false}>
                    {chatSessions.map((chat) => (
                      <Pressable
                        key={chat.id}
                        style={styles.chatListItem}
                        onPress={() => handleSelectChat(chat.id)}
                      >
                        <View style={styles.chatListItemContent}>
                          <Text style={styles.chatListTitle} numberOfLines={1}>
                            {chat.title}
                          </Text>
                          <Text style={styles.chatListTime}>
                            {new Date(chat.updatedAt).toLocaleDateString()}
                          </Text>
                        </View>
                        <Pressable
                          style={styles.deleteButton}
                          onPress={(e) => {
                            e.stopPropagation();
                            deleteChat(chat.id);
                          }}
                        >
                          <Trash2 color="#999" size={16} />
                        </Pressable>
                      </Pressable>
                    ))}
                  </ScrollView>
                )}
                <TouchableOpacity style={styles.newChatButton} onPress={handleStartNewChat}>
                  <Plus color="#fff" size={18} />
                  <Text style={styles.newChatButtonText}>Start New Chat</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <ScrollView
                  ref={scrollViewRef}
                  style={styles.messagesContainer}
                  contentContainerStyle={styles.messagesContent}
                  showsVerticalScrollIndicator={false}
                  onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
                >
                  {messages.filter(m => m.role !== 'system').map((m) => (
                    <View key={m.id} style={m.role === 'user' ? styles.userMessageWrapper : styles.assistantMessageWrapper}>
                      {m.parts.map((part, i) => {
                        if (part.type === 'text') {
                          return (
                            <View
                              key={`${m.id}-${i}`}
                              style={m.role === 'user' ? styles.userMessage : styles.assistantMessage}
                            >
                              <Text style={m.role === 'user' ? styles.userMessageText : styles.assistantMessageText}>
                                {part.text}
                              </Text>
                            </View>
                          );
                        }
                        return null;
                      })}
                    </View>
                  ))}
                </ScrollView>

                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    value={inputText}
                    onChangeText={setInputText}
                    placeholder={currentChatId ? "Ask me anything..." : "Type to start new chat..."}
                    placeholderTextColor="#999"
                    multiline
                    maxLength={500}
                    returnKeyType="send"
                    enablesReturnKeyAutomatically
                    blurOnSubmit={false}
                    onSubmitEditing={handleSendMessage}
                  />
                  <TouchableOpacity
                    onPress={handleSendMessage}
                    style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
                    disabled={!inputText.trim()}
                  >
                    <Send color={inputText.trim() ? Colors.primary : '#ccc'} size={18} />
                  </TouchableOpacity>
                </View>
              </>
            )}
          </Animated.View>
        </Animated.View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  topArea: {
    width: 120,
    height: 30,
  },
  middleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 60,
  },
  leftArea: {
    width: 30,
    height: 60,
  },
  rightArea: {
    width: 30,
    height: 60,
  },
  bottomArea: {
    width: 120,
    height: 30,
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
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  glowCircle: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    opacity: 0.6,
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
    gap: 8,
    marginTop: 10,
  },
  eye: {
    width: 3.5,
    height: 3.5,
    borderRadius: 2,
    backgroundColor: '#1a1a1a',
  },
  chatContainer: {
    position: 'absolute',
    top: '25%',
    right: 16,
    left: 16,
    maxWidth: 340,
    height: '30%',
    alignSelf: 'center',
    zIndex: 9998,
  },
  chatBox: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
    pointerEvents: 'auto',
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fafafa',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  chatHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  chatTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  chatSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    color: '#666',
    marginTop: 2,
  },
  closeButton: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: '#e8e8e8',
  },
  chatListContainer: {
    flex: 1,
    padding: 12,
  },
  chatListItem: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chatListItemContent: {
    flex: 1,
  },
  chatListTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  chatListTime: {
    fontSize: 11,
    color: '#999',
  },
  deleteButton: {
    padding: 8,
  },
  newChatButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  newChatButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  emptyChatList: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyChatText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 16,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 12,
    gap: 10,
  },
  userMessageWrapper: {
    alignItems: 'flex-end',
  },
  assistantMessageWrapper: {
    alignItems: 'flex-start',
  },
  userMessage: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    borderBottomRightRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 9,
    maxWidth: '80%',
  },
  assistantMessage: {
    backgroundColor: '#f0f0f0',
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 9,
    maxWidth: '80%',
  },
  userMessageText: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 19,
  },
  assistantMessageText: {
    color: '#1a1a1a',
    fontSize: 14,
    lineHeight: 19,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: '#fafafa',
    gap: 10,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  input: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 9,
    fontSize: 14,
    maxHeight: 80,
    color: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#e8f5e9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
