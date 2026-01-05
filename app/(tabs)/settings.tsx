import React, { useState } from 'react';
import { useRouter, Href } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
  Alert,
  Modal,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Info,
  Shield,
  MessageCircle,
  Star,
  ChevronRight,
  Heart,
  Leaf,
  Trash2,
  Crown,
  Sliders,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useScanHistory } from '@/providers/ScanHistoryProvider';
import { useFridge } from '@/providers/FridgeProvider';
import { useSubscription } from '@/providers/SubscriptionProvider';
import { useSettings, ScoringWeights } from '@/providers/SettingsProvider';
import { useLeafBuddy } from '@/providers/LeafBuddyProvider';

interface SettingsItemProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  onPress: () => void;
  showChevron?: boolean;
}

function SettingsItem({ icon, title, subtitle, onPress, showChevron = true }: SettingsItemProps) {
  return (
    <TouchableOpacity style={styles.settingsItem} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.settingsItemIcon}>{icon}</View>
      <View style={styles.settingsItemContent}>
        <Text style={styles.settingsItemTitle}>{title}</Text>
        {subtitle && <Text style={styles.settingsItemSubtitle}>{subtitle}</Text>}
      </View>
      {showChevron && <ChevronRight color={Colors.textMuted} size={20} />}
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const { clearHistory, history, removeFromHistory } = useScanHistory();
  const { fridgeItems } = useFridge();
  const { isPremium } = useSubscription();
  const { scoringWeights, bodyweight, fitnessGoal, leafBuddyEnabled, updateScoringWeights, updateBodyweight, updateFitnessGoal, updateLeafBuddyEnabled, resetToDefaults } = useSettings();
  const { clearAllChats, chatSessions } = useLeafBuddy();
  const [showScoringModal, setShowScoringModal] = useState(false);
  const [tempWeights, setTempWeights] = useState<ScoringWeights>(scoringWeights);
  const [tempBodyweight, setTempBodyweight] = useState<number>(bodyweight);
  const [tempFitnessGoal, setTempFitnessGoal] = useState<string>(fitnessGoal);

  const handleClearHistory = () => {
    Alert.alert(
      'Clear All History',
      'Are you sure you want to clear all scan history?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear All', style: 'destructive', onPress: clearHistory },
      ]
    );
  };

  const handleClearHistoryExceptFridge = () => {
    const fridgeBarcodes = fridgeItems.map(item => item.barcode);
    const itemsToRemove = history.filter(item => !fridgeBarcodes.includes(item.barcode));
    
    Alert.alert(
      'Clear History',
      `This will remove ${itemsToRemove.length} items from your history, keeping ${fridgeItems.length} items in your fridge.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear', 
          style: 'destructive', 
          onPress: () => {
            itemsToRemove.forEach(item => removeFromHistory(item.barcode));
          }
        },
      ]
    );
  };

  const handleManageSubscription = () => {
    if (isPremium) {
      Alert.alert(
        'Manage Subscription',
        'To manage your subscription, please visit your App Store or Play Store settings.',
        [{ text: 'OK' }]
      );
    } else {
      router.push('/paywall' as Href);
    }
  };

  const handleRateApp = () => {
    Alert.alert('Rate NutriScan', 'Thank you for using NutriScan! Rating functionality would open the app store in a production app.');
  };

  const handleFeedback = () => {
    Linking.openURL('mailto:support@nutriscan.app?subject=NutriScan Feedback');
  };

  const handlePrivacy = () => {
    Alert.alert('Privacy Policy', 'This would open the privacy policy page in a production app.');
  };

  const handleAbout = () => {
    Alert.alert(
      'About NutriScan',
      'NutriScan v1.0.0\n\nScan food products to get instant health insights, nutritional information, and ingredient analysis.\n\nMade with ❤️ for healthier choices.',
      [{ text: 'OK' }]
    );
  };

  const handleToggleLeafBuddy = async () => {
    await updateLeafBuddyEnabled(!leafBuddyEnabled);
  };

  const handleClearLeafBuddyChats = () => {
    Alert.alert(
      'Clear All Chats',
      `This will delete all ${chatSessions.length} chat${chatSessions.length === 1 ? '' : 's'} with LeafBuddy. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear All', 
          style: 'destructive',
          onPress: async () => {
            await clearAllChats();
            Alert.alert('Done!', 'All LeafBuddy chats have been cleared.');
          }
        },
      ]
    );
  };

  const handleOpenScoringModal = () => {
    setTempWeights(scoringWeights);
    setTempBodyweight(bodyweight);
    setTempFitnessGoal(fitnessGoal);
    setShowScoringModal(true);
  };

  const handleSaveWeights = async () => {
    await updateScoringWeights(tempWeights);
    await updateBodyweight(tempBodyweight);
    await updateFitnessGoal(tempFitnessGoal as any);
    setShowScoringModal(false);
    Alert.alert('All Set! 🎉', 'Your food scoring is now personalized just for you!');
  };

  const handleResetWeights = () => {
    Alert.alert(
      'Start Over?',
      'This will reset everything back to normal. Is that okay?',
      [
        { text: 'Nevermind', style: 'cancel' },
        { 
          text: 'Yes, Reset', 
          style: 'destructive',
          onPress: async () => {
            await resetToDefaults();
            setTempWeights(scoringWeights);
            Alert.alert('Done! ✨', 'Everything is back to normal!');
          }
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[Colors.primaryLight, Colors.background]}
        style={styles.headerGradient}
      />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.appInfo}>
            <View style={styles.appIconContainer}>
              <Leaf color="#FFFFFF" size={32} />
            </View>
            <Text style={styles.appName}>NutriScan</Text>
            <Text style={styles.appTagline}>Your food health companion</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Subscription</Text>
            <View style={styles.sectionContent}>
              <SettingsItem
                icon={<Crown color={isPremium ? Colors.warning : Colors.textSecondary} size={22} />}
                title={isPremium ? 'Premium Active' : 'Upgrade to Premium'}
                subtitle={isPremium ? 'Manage your subscription' : 'Unlock unlimited scans'}
                onPress={handleManageSubscription}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Scoring</Text>
            <View style={styles.sectionContent}>
              <SettingsItem
                icon={<Sliders color={Colors.primary} size={22} />}
                title="Customize My Scores"
                subtitle="Choose what matters most to you"
                onPress={handleOpenScoringModal}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>LeafBuddy</Text>
            <View style={styles.sectionContent}>
              <TouchableOpacity style={styles.settingsItem} onPress={handleToggleLeafBuddy} activeOpacity={0.7}>
                <View style={styles.settingsItemIcon}>
                  <Leaf color={leafBuddyEnabled ? Colors.primary : Colors.textMuted} size={22} />
                </View>
                <View style={styles.settingsItemContent}>
                  <Text style={styles.settingsItemTitle}>Enable LeafBuddy</Text>
                  <Text style={styles.settingsItemSubtitle}>{leafBuddyEnabled ? 'LeafBuddy is active' : 'LeafBuddy is disabled'}</Text>
                </View>
                <View style={[styles.toggle, leafBuddyEnabled && styles.toggleActive]}>
                  <View style={[styles.toggleThumb, leafBuddyEnabled && styles.toggleThumbActive]} />
                </View>
              </TouchableOpacity>
              {leafBuddyEnabled && chatSessions.length > 0 && (
                <SettingsItem
                  icon={<Trash2 color={Colors.warning} size={22} />}
                  title="Clear Chat History"
                  subtitle={`${chatSessions.length} chat${chatSessions.length === 1 ? '' : 's'} saved`}
                  onPress={handleClearLeafBuddyChats}
                />
              )}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>App</Text>
            <View style={styles.sectionContent}>
              <SettingsItem
                icon={<Star color={Colors.warning} size={22} />}
                title="Rate NutriScan"
                subtitle="Help us improve with your feedback"
                onPress={handleRateApp}
              />
              <SettingsItem
                icon={<MessageCircle color={Colors.secondary} size={22} />}
                title="Send Feedback"
                subtitle="We&apos;d love to hear from you"
                onPress={handleFeedback}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Data</Text>
            <View style={styles.sectionContent}>
              <SettingsItem
                icon={<Trash2 color={Colors.danger} size={22} />}
                title="Clear All History"
                subtitle={history.length > 0 ? `Delete all ${history.length} ${history.length === 1 ? 'item' : 'items'}` : 'No items'}
                onPress={handleClearHistory}
              />
              {fridgeItems.length > 0 && (
                <SettingsItem
                  icon={<Trash2 color={Colors.warning} size={22} />}
                  title="Clear History (Keep Fridge)"
                  subtitle={`Keep ${fridgeItems.length} fridge ${fridgeItems.length === 1 ? 'item' : 'items'}`}
                  onPress={handleClearHistoryExceptFridge}
                />
              )}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Legal</Text>
            <View style={styles.sectionContent}>
              <SettingsItem
                icon={<Shield color={Colors.primary} size={22} />}
                title="Privacy Policy"
                onPress={handlePrivacy}
              />
              <SettingsItem
                icon={<Info color={Colors.textSecondary} size={22} />}
                title="About"
                subtitle="Version 1.0.0"
                onPress={handleAbout}
              />
            </View>
          </View>

          <View style={styles.footer}>
            <View style={styles.footerContent}>
              <Heart color={Colors.danger} size={16} />
              <Text style={styles.footerText}>Made for healthier choices</Text>
            </View>
          </View>
        </ScrollView>

        <Modal
          visible={showScoringModal}
          animationType="slide"
          transparent
          onRequestClose={() => setShowScoringModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.scoringModalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>My Food Scores</Text>
                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={() => setShowScoringModal(false)}
                >
                  <Text style={styles.modalCloseText}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                <View style={styles.scoringInfo}>
                  <Text style={styles.scoringInfoTitle}>What matters most to you?</Text>
                  <Text style={styles.scoringInfoSubtext}>
                    Pick what you care about when choosing food. Higher numbers mean it matters more!
                  </Text>
                </View>

                <View style={styles.bodyweightSection}>
                  <View style={styles.bodyweightHeader}>
                    <Text style={styles.bodyweightEmoji}>⚖️</Text>
                    <View style={styles.weightLabelContainer}>
                      <Text style={styles.weightLabel}>My Weight</Text>
                      <Text style={styles.weightSubLabel}>Used to calculate your daily nutrition goals</Text>
                    </View>
                  </View>
                  <View style={styles.bodyweightInputContainer}>
                    <TouchableOpacity
                      style={styles.bodyweightButton}
                      onPress={() => setTempBodyweight(Math.max(50, tempBodyweight - 5))}
                    >
                      <Text style={styles.bodyweightButtonText}>-</Text>
                    </TouchableOpacity>
                    <View style={styles.bodyweightDisplay}>
                      <Text style={styles.bodyweightValue}>{tempBodyweight}</Text>
                      <Text style={styles.bodyweightUnit}>lbs</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.bodyweightButton}
                      onPress={() => setTempBodyweight(Math.min(500, tempBodyweight + 5))}
                    >
                      <Text style={styles.bodyweightButtonText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.fitnessGoalSection}>
                  <View style={styles.bodyweightHeader}>
                    <Text style={styles.bodyweightEmoji}>🎯</Text>
                    <View style={styles.weightLabelContainer}>
                      <Text style={styles.weightLabel}>My Goal</Text>
                      <Text style={styles.weightSubLabel}>Choose what you want to achieve</Text>
                    </View>
                  </View>
                  <View style={styles.goalOptionsContainer}>
                    <TouchableOpacity
                      style={[styles.goalOption, tempFitnessGoal === 'maintenance' && styles.goalOptionActive]}
                      onPress={() => setTempFitnessGoal('maintenance')}
                    >
                      <Text style={[styles.goalOptionEmoji, tempFitnessGoal === 'maintenance' && styles.goalOptionEmojiActive]}>😊</Text>
                      <Text style={[styles.goalOptionText, tempFitnessGoal === 'maintenance' && styles.goalOptionTextActive]}>Stay Healthy</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.goalOption, tempFitnessGoal === 'muscle_gain' && styles.goalOptionActive]}
                      onPress={() => setTempFitnessGoal('muscle_gain')}
                    >
                      <Text style={[styles.goalOptionEmoji, tempFitnessGoal === 'muscle_gain' && styles.goalOptionEmojiActive]}>💪</Text>
                      <Text style={[styles.goalOptionText, tempFitnessGoal === 'muscle_gain' && styles.goalOptionTextActive]}>Build Muscle</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.goalOption, tempFitnessGoal === 'fat_loss' && styles.goalOptionActive]}
                      onPress={() => setTempFitnessGoal('fat_loss')}
                    >
                      <Text style={[styles.goalOptionEmoji, tempFitnessGoal === 'fat_loss' && styles.goalOptionEmojiActive]}>🔥</Text>
                      <Text style={[styles.goalOptionText, tempFitnessGoal === 'fat_loss' && styles.goalOptionTextActive]}>Lose Weight</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.goalOption, tempFitnessGoal === 'athletic' && styles.goalOptionActive]}
                      onPress={() => setTempFitnessGoal('athletic')}
                    >
                      <Text style={[styles.goalOptionEmoji, tempFitnessGoal === 'athletic' && styles.goalOptionEmojiActive]}>⚡</Text>
                      <Text style={[styles.goalOptionText, tempFitnessGoal === 'athletic' && styles.goalOptionTextActive]}>Athletic</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.weightItem}>
                  <View style={styles.weightHeader}>
                    <Text style={styles.weightEmoji}>🚫</Text>
                    <View style={styles.weightLabelContainer}>
                      <Text style={styles.weightLabel}>No Fake Stuff</Text>
                      <Text style={styles.weightSubLabel}>Avoid artificial ingredients</Text>
                    </View>
                  </View>
                  <Slider
                    style={styles.slider}
                    minimumValue={0}
                    maximumValue={10}
                    step={1}
                    value={tempWeights.additives}
                    onValueChange={(value) => setTempWeights({ ...tempWeights, additives: value })}
                    minimumTrackTintColor={Colors.primary}
                    maximumTrackTintColor={Colors.border}
                    thumbTintColor={Colors.primary}
                  />
                  <View style={styles.sliderLabels}>
                    <Text style={styles.sliderLabelText}>Not Important</Text>
                    <Text style={[styles.sliderLabelText, styles.sliderValueText]}>{tempWeights.additives}</Text>
                    <Text style={styles.sliderLabelText}>Very Important</Text>
                  </View>
                </View>

                <View style={styles.weightItem}>
                  <View style={styles.weightHeader}>
                    <Text style={styles.weightEmoji}>🌱</Text>
                    <View style={styles.weightLabelContainer}>
                      <Text style={styles.weightLabel}>Real Food</Text>
                      <Text style={styles.weightSubLabel}>Natural & organic ingredients</Text>
                    </View>
                  </View>
                  <Slider
                    style={styles.slider}
                    minimumValue={0}
                    maximumValue={10}
                    step={1}
                    value={tempWeights.ingredientQuality}
                    onValueChange={(value) => setTempWeights({ ...tempWeights, ingredientQuality: value })}
                    minimumTrackTintColor={Colors.primary}
                    maximumTrackTintColor={Colors.border}
                    thumbTintColor={Colors.primary}
                  />
                  <View style={styles.sliderLabels}>
                    <Text style={styles.sliderLabelText}>Not Important</Text>
                    <Text style={[styles.sliderLabelText, styles.sliderValueText]}>{tempWeights.ingredientQuality}</Text>
                    <Text style={styles.sliderLabelText}>Very Important</Text>
                  </View>
                </View>

                <View style={styles.weightItem}>
                  <View style={styles.weightHeader}>
                    <Text style={styles.weightEmoji}>🍬</Text>
                    <View style={styles.weightLabelContainer}>
                      <Text style={styles.weightLabel}>Less Sugar</Text>
                      <Text style={styles.weightSubLabel}>Avoid too much sweetness</Text>
                    </View>
                  </View>
                  <Slider
                    style={styles.slider}
                    minimumValue={0}
                    maximumValue={10}
                    step={1}
                    value={tempWeights.sugar}
                    onValueChange={(value) => setTempWeights({ ...tempWeights, sugar: value })}
                    minimumTrackTintColor={Colors.primary}
                    maximumTrackTintColor={Colors.border}
                    thumbTintColor={Colors.primary}
                  />
                  <View style={styles.sliderLabels}>
                    <Text style={styles.sliderLabelText}>Not Important</Text>
                    <Text style={[styles.sliderLabelText, styles.sliderValueText]}>{tempWeights.sugar}</Text>
                    <Text style={styles.sliderLabelText}>Very Important</Text>
                  </View>
                </View>

                <View style={styles.weightItem}>
                  <View style={styles.weightHeader}>
                    <Text style={styles.weightEmoji}>🧂</Text>
                    <View style={styles.weightLabelContainer}>
                      <Text style={styles.weightLabel}>Less Salt</Text>
                      <Text style={styles.weightSubLabel}>Keep sodium low</Text>
                    </View>
                  </View>
                  <Slider
                    style={styles.slider}
                    minimumValue={0}
                    maximumValue={10}
                    step={1}
                    value={tempWeights.sodium}
                    onValueChange={(value) => setTempWeights({ ...tempWeights, sodium: value })}
                    minimumTrackTintColor={Colors.primary}
                    maximumTrackTintColor={Colors.border}
                    thumbTintColor={Colors.primary}
                  />
                  <View style={styles.sliderLabels}>
                    <Text style={styles.sliderLabelText}>Not Important</Text>
                    <Text style={[styles.sliderLabelText, styles.sliderValueText]}>{tempWeights.sodium}</Text>
                    <Text style={styles.sliderLabelText}>Very Important</Text>
                  </View>
                </View>

                <View style={styles.weightItem}>
                  <View style={styles.weightHeader}>
                    <Text style={styles.weightEmoji}>🥑</Text>
                    <View style={styles.weightLabelContainer}>
                      <Text style={styles.weightLabel}>Healthy Fats</Text>
                      <Text style={styles.weightSubLabel}>Watch out for bad fats</Text>
                    </View>
                  </View>
                  <Slider
                    style={styles.slider}
                    minimumValue={0}
                    maximumValue={10}
                    step={1}
                    value={tempWeights.saturatedFat}
                    onValueChange={(value) => setTempWeights({ ...tempWeights, saturatedFat: value })}
                    minimumTrackTintColor={Colors.primary}
                    maximumTrackTintColor={Colors.border}
                    thumbTintColor={Colors.primary}
                  />
                  <View style={styles.sliderLabels}>
                    <Text style={styles.sliderLabelText}>Not Important</Text>
                    <Text style={[styles.sliderLabelText, styles.sliderValueText]}>{tempWeights.saturatedFat}</Text>
                    <Text style={styles.sliderLabelText}>Very Important</Text>
                  </View>
                </View>

                <View style={styles.weightItem}>
                  <View style={styles.weightHeader}>
                    <Text style={styles.weightEmoji}>💪</Text>
                    <View style={styles.weightLabelContainer}>
                      <Text style={styles.weightLabel}>Good Nutrition</Text>
                      <Text style={styles.weightSubLabel}>Protein, fiber & vitamins</Text>
                    </View>
                  </View>
                  <Slider
                    style={styles.slider}
                    minimumValue={0}
                    maximumValue={10}
                    step={1}
                    value={tempWeights.nutritionalValue}
                    onValueChange={(value) => setTempWeights({ ...tempWeights, nutritionalValue: value })}
                    minimumTrackTintColor={Colors.primary}
                    maximumTrackTintColor={Colors.border}
                    thumbTintColor={Colors.primary}
                  />
                  <View style={styles.sliderLabels}>
                    <Text style={styles.sliderLabelText}>Not Important</Text>
                    <Text style={[styles.sliderLabelText, styles.sliderValueText]}>{tempWeights.nutritionalValue}</Text>
                    <Text style={styles.sliderLabelText}>Very Important</Text>
                  </View>
                </View>

                <View style={styles.scoringTip}>
                  <Text style={styles.scoringTipText}>💡 Tip: Give higher numbers to things that matter most to you!</Text>
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.resetButton}
                    onPress={handleResetWeights}
                  >
                    <Text style={styles.resetButtonText}>Start Over</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.saveButton}
                    onPress={handleSaveWeights}
                  >
                    <Text style={styles.saveButtonText}>Save My Choices</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 300,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  appInfo: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  appIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  appName: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  appTagline: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  sectionContent: {
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  settingsItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  settingsItemContent: {
    flex: 1,
  },
  settingsItemTitle: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: Colors.text,
  },
  settingsItemSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  footer: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  footerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerText: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  scoringModalContainer: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  modalCloseText: {
    fontSize: 24,
    color: Colors.textSecondary,
  },
  scoringInfo: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    alignItems: 'center',
  },
  scoringInfoTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  scoringInfoSubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    textAlign: 'center',
  },
  totalBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  totalBadgeText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  weightItem: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  weightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  weightEmoji: {
    fontSize: 32,
  },
  weightLabelContainer: {
    flex: 1,
  },
  weightLabel: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 2,
  },
  weightSubLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  sliderLabelText: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  sliderValueText: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.primary,
  },
  weightInput: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
    width: 70,
    textAlign: 'center',
  },
  weightDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  scoringTip: {
    backgroundColor: Colors.successLight,
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    marginBottom: 16,
  },
  scoringTipText: {
    fontSize: 14,
    color: Colors.text,
    textAlign: 'center',
    lineHeight: 20,
  },
  modalActions: {
    marginTop: 24,
    gap: 12,
    paddingBottom: 24,
  },
  resetButton: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalScroll: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  presetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    marginBottom: 12,
  },
  presetInfo: {
    flex: 1,
    marginRight: 12,
  },
  presetName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  presetDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  bodyweightSection: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  bodyweightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  bodyweightEmoji: {
    fontSize: 32,
  },
  bodyweightInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  bodyweightButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bodyweightButtonText: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.primary,
  },
  bodyweightDisplay: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  bodyweightValue: {
    fontSize: 48,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  bodyweightUnit: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  fitnessGoalSection: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  goalOptionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  goalOption: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.border,
  },
  goalOptionActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  goalOptionEmoji: {
    fontSize: 32,
    marginBottom: 8,
    opacity: 0.5,
  },
  goalOptionEmojiActive: {
    opacity: 1,
  },
  goalOptionText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  goalOptionTextActive: {
    color: Colors.primary,
  },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.border,
    padding: 3,
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: Colors.primary,
  },
  toggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#fff',
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
});
