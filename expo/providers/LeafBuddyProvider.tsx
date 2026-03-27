import createContextHook from '@nkzw/create-context-hook';
import { useState, useCallback, useRef, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const MESSAGE_RATE_LIMIT = 25;
const RATE_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000;

export interface ChatSession {
  id: string;
  title: string;
  messages: any[];
  createdAt: number;
  updatedAt: number;
}

export interface LeafBuddyState {
  position: { x: number; y: number };
  isChatOpen: boolean;
}

export const [LeafBuddyProvider, useLeafBuddy] = createContextHook(() => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [messageTimestamps, setMessageTimestamps] = useState<number[]>([]);
  const positionRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    loadChatSessions();
  }, []);

  const loadChatSessions = async () => {
    try {
      const stored = await AsyncStorage.getItem('leafbuddy-chats');
      if (stored) {
        const sessions = JSON.parse(stored);
        setChatSessions(sessions);
      }
    } catch (error) {
      console.error('[LeafBuddy] Failed to load chat sessions:', error);
    }
  };

  const saveChatSessions = async (sessions: ChatSession[]) => {
    try {
      await AsyncStorage.setItem('leafbuddy-chats', JSON.stringify(sessions));
      setChatSessions(sessions);
    } catch (error) {
      console.error('[LeafBuddy] Failed to save chat sessions:', error);
    }
  };

  const updatePosition = useCallback((x: number, y: number) => {
    positionRef.current = { x, y };
    setPosition({ x, y });
  }, []);

  const openChat = useCallback(() => {
    console.log('[LeafBuddy] Opening chat');
    setIsChatOpen(true);
  }, []);

  const closeChat = useCallback(() => {
    console.log('[LeafBuddy] Closing chat');
    setIsChatOpen(false);
  }, []);

  const toggleChat = useCallback(() => {
    setIsChatOpen(prev => !prev);
  }, []);

  const createNewChat = useCallback(() => {
    const newChat: ChatSession = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const updatedSessions = [newChat, ...chatSessions];
    saveChatSessions(updatedSessions);
    setCurrentChatId(newChat.id);
    return newChat.id;
  }, [chatSessions]);

  const loadChat = useCallback((chatId: string) => {
    setCurrentChatId(chatId);
  }, []);

  const updateCurrentChat = useCallback((messages: any[]) => {
    if (!currentChatId) return;
    
    const updatedSessions = chatSessions.map(session => {
      if (session.id === currentChatId) {
        const firstUserMessage = messages.find(m => m.role === 'user');
        const firstPart = firstUserMessage?.parts?.[0];
        const title = firstPart?.type === 'text' && firstPart.text
          ? firstPart.text.slice(0, 30)
          : 'New Chat';
        
        return {
          ...session,
          messages,
          title,
          updatedAt: Date.now(),
        };
      }
      return session;
    });
    
    saveChatSessions(updatedSessions);
  }, [currentChatId, chatSessions]);

  const getCurrentChat = useCallback(() => {
    return chatSessions.find(s => s.id === currentChatId);
  }, [chatSessions, currentChatId]);

  const deleteChat = useCallback((chatId: string) => {
    const updatedSessions = chatSessions.filter(s => s.id !== chatId);
    saveChatSessions(updatedSessions);
    if (currentChatId === chatId) {
      setCurrentChatId(null);
    }
  }, [chatSessions, currentChatId]);

  const clearAllChats = useCallback(async () => {
    try {
      await AsyncStorage.removeItem('leafbuddy-chats');
      setChatSessions([]);
      setCurrentChatId(null);
      console.log('[LeafBuddy] All chats cleared');
    } catch (error) {
      console.error('[LeafBuddy] Failed to clear chats:', error);
    }
  }, []);

  const canSendMessage = useCallback(() => {
    const now = Date.now();
    const recentMessages = messageTimestamps.filter(
      timestamp => now - timestamp < RATE_LIMIT_WINDOW_MS
    );
    return recentMessages.length < MESSAGE_RATE_LIMIT;
  }, [messageTimestamps]);

  const recordMessage = useCallback(() => {
    const now = Date.now();
    const recentMessages = messageTimestamps.filter(
      timestamp => now - timestamp < RATE_LIMIT_WINDOW_MS
    );
    setMessageTimestamps([...recentMessages, now]);
  }, [messageTimestamps]);

  const getRemainingMessages = useCallback(() => {
    const now = Date.now();
    const recentMessages = messageTimestamps.filter(
      timestamp => now - timestamp < RATE_LIMIT_WINDOW_MS
    );
    return Math.max(0, MESSAGE_RATE_LIMIT - recentMessages.length);
  }, [messageTimestamps]);

  return {
    position,
    updatePosition,
    isChatOpen,
    openChat,
    closeChat,
    toggleChat,
    positionRef,
    chatSessions,
    currentChatId,
    createNewChat,
    loadChat,
    updateCurrentChat,
    getCurrentChat,
    deleteChat,
    clearAllChats,
    canSendMessage,
    recordMessage,
    getRemainingMessages,
  };
});
