import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, Dimensions, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const router = useRouter();
  const [showDisclaimer, setShowDisclaimer] = useState(true);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);

  useEffect(() => {
    checkDisclaimerStatus();
  }, []);

  const checkDisclaimerStatus = async () => {
    try {
      const accepted = await AsyncStorage.getItem('disclaimer_accepted');
      if (accepted === 'true') {
        setShowDisclaimer(false);
        setDisclaimerAccepted(true);
      }
    } catch (error) {
      console.log('Error checking disclaimer status:', error);
    }
  };

  const acceptDisclaimer = async () => {
    try {
      await AsyncStorage.setItem('disclaimer_accepted', 'true');
      setShowDisclaimer(false);
      setDisclaimerAccepted(true);
    } catch (error) {
      console.log('Error saving disclaimer:', error);
    }
  };

  const navigateToAnalysis = (type: string) => {
    if (!disclaimerAccepted) {
      setShowDisclaimer(true);
      return;
    }
    router.push(`/camera?type=${type}`);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Disclaimer Modal */}
      <Modal
        visible={showDisclaimer}
        animationType="fade"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.warningIcon}>
              <Ionicons name="alert-circle" size={56} color="#FF6B6B" />
            </View>
            <Text style={styles.modalTitle}>Medical Disclaimer</Text>
            <ScrollView style={styles.disclaimerScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.disclaimerText}>
                This application provides <Text style={styles.boldText}>informational analysis only</Text> and is NOT a substitute for professional medical advice, diagnosis, or treatment.
                {"\n\n"}
                The AI-powered skin analysis is for educational purposes and should not be used for medical decision-making.
                {"\n\n"}
                <Text style={styles.boldText}>Always consult a qualified dermatologist or healthcare provider for:</Text>
                {"\n"}
                • Professional diagnosis{"\n"}
                • Treatment recommendations{"\n"}
                • Medical concerns
                {"\n\n"}
                <Text style={styles.boldText}>By continuing, you acknowledge that:</Text>
                {"\n"}
                1. This is not a medical diagnostic tool{"\n"}
                2. Results are approximate and may vary{"\n"}
                3. You will seek professional medical advice for any concerns
              </Text>
            </ScrollView>
            <TouchableOpacity
              style={styles.acceptButton}
              onPress={acceptDisclaimer}
            >
              <Text style={styles.acceptButtonText}>I Understand & Accept</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Header with Gradient */}
      <LinearGradient
        colors={['#00B894', '#00CEC9']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View style={styles.logoContainer}>
            <Ionicons name="medical" size={36} color="#FFFFFF" />
          </View>
          <Text style={styles.appTitle}>SkinQuant AI</Text>
          <Text style={styles.appSubtitle}>Advanced Skin Analysis</Text>
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Quick Scan Button */}
        <TouchableOpacity
          style={styles.quickScanButton}
          onPress={() => navigateToAnalysis('full')}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#00B894', '#00CEC9']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.quickScanGradient}
          >
            <View style={styles.quickScanIcon}>
              <Ionicons name="scan" size={32} color="#FFFFFF" />
            </View>
            <View style={styles.quickScanTextContainer}>
              <Text style={styles.quickScanTitle}>Full Skin Scan</Text>
              <Text style={styles.quickScanSubtitle}>Complete analysis of all conditions</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#FFFFFF" />
          </LinearGradient>
        </TouchableOpacity>

        {/* Section Title */}
        <Text style={styles.sectionTitle}>Individual Analysis</Text>

        {/* Condition Cards */}
        <View style={styles.cardsContainer}>
          {/* Acne Analysis */}
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigateToAnalysis('acne')}
            activeOpacity={0.9}
          >
            <View style={[styles.cardIcon, { backgroundColor: '#E8F8F5' }]}>
              <Ionicons name="water" size={28} color="#00B894" />
            </View>
            <Text style={styles.cardTitle}>Acne</Text>
            <Text style={styles.cardDescription}>Detect lesions & inflammation</Text>
          </TouchableOpacity>

          {/* Pigmentation Analysis */}
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigateToAnalysis('pigmentation')}
            activeOpacity={0.9}
          >
            <View style={[styles.cardIcon, { backgroundColor: '#E8F8F5' }]}>
              <Ionicons name="color-palette" size={28} color="#00CEC9" />
            </View>
            <Text style={styles.cardTitle}>Pigmentation</Text>
            <Text style={styles.cardDescription}>Analyze dark spots</Text>
          </TouchableOpacity>

          {/* Wrinkles Analysis */}
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigateToAnalysis('wrinkles')}
            activeOpacity={0.9}
          >
            <View style={[styles.cardIcon, { backgroundColor: '#E8F8F5' }]}>
              <Ionicons name="layers" size={28} color="#55EFC4" />
            </View>
            <Text style={styles.cardTitle}>Wrinkles</Text>
            <Text style={styles.cardDescription}>Measure fine lines</Text>
          </TouchableOpacity>
        </View>

        {/* History Button */}
        <TouchableOpacity
          style={styles.historyButton}
          onPress={() => router.push('/history')}
          activeOpacity={0.8}
        >
          <Ionicons name="time-outline" size={22} color="#00B894" />
          <Text style={styles.historyButtonText}>View Scan History</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FFFE',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 32,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerContent: {
    alignItems: 'center',
  },
  logoContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  appTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  appSubtitle: {
    fontSize: 15,
    color: '#FFFFFF',
    opacity: 0.95,
    marginTop: 6,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
  },
  quickScanButton: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 32,
    elevation: 4,
    shadowColor: '#00B894',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  quickScanGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
    gap: 16,
  },
  quickScanIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickScanTextContainer: {
    flex: 1,
  },
  quickScanTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  quickScanSubtitle: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.95,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D3436',
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  cardsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 24,
  },
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#00B894',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  cardIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2D3436',
    marginBottom: 6,
  },
  cardDescription: {
    fontSize: 12,
    color: '#636E72',
    textAlign: 'center',
    fontWeight: '500',
  },
  historyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1.5,
    borderColor: '#00B894',
  },
  historyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#00B894',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 28,
    width: '100%',
    maxWidth: 400,
    maxHeight: '85%',
  },
  warningIcon: {
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#2D3436',
    textAlign: 'center',
    marginBottom: 20,
    letterSpacing: -0.5,
  },
  disclaimerScroll: {
    maxHeight: 320,
    marginBottom: 24,
  },
  disclaimerText: {
    fontSize: 14,
    color: '#636E72',
    lineHeight: 22,
    fontWeight: '400',
  },
  boldText: {
    fontWeight: '600',
    color: '#2D3436',
  },
  acceptButton: {
    backgroundColor: '#00B894',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
  },
  acceptButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});