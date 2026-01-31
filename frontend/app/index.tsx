import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
      {/* Disclaimer Modal */}
      <Modal
        visible={showDisclaimer}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons name="warning" size={60} color="#FF6B6B" style={styles.modalIcon} />
            <Text style={styles.modalTitle}>Medical Disclaimer</Text>
            <ScrollView style={styles.disclaimerScroll}>
              <Text style={styles.disclaimerText}>
                This application provides informational analysis only and is NOT a substitute for professional medical advice, diagnosis, or treatment.
                {"\n\n"}
                The AI-powered skin analysis is for educational purposes and should not be used for medical decision-making.
                {"\n\n"}
                Always consult a qualified dermatologist or healthcare provider for:
                {"\n"}
                • Professional diagnosis
                {"\n"}
                • Treatment recommendations
                {"\n"}
                • Medical concerns
                {"\n\n"}
                By continuing, you acknowledge that:
                {"\n"}
                1. This is not a medical diagnostic tool
                {"\n"}
                2. Results are approximate and may vary
                {"\n"}
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

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Ionicons name="analytics" size={40} color="#4A90E2" />
          <Text style={styles.appTitle}>SkinQuant AI</Text>
        </View>
        <Text style={styles.appSubtitle}>AI-Powered Skin Analysis</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Quick Scan Button */}
        <TouchableOpacity
          style={styles.quickScanButton}
          onPress={() => navigateToAnalysis('full')}
        >
          <View style={styles.quickScanContent}>
            <Ionicons name="scan" size={32} color="#FFFFFF" />
            <View style={styles.quickScanTextContainer}>
              <Text style={styles.quickScanTitle}>Full Scan</Text>
              <Text style={styles.quickScanSubtitle}>Analyze all skin conditions</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#FFFFFF" />
          </View>
        </TouchableOpacity>

        {/* Condition Cards */}
        <Text style={styles.sectionTitle}>Select Condition</Text>

        <View style={styles.cardsGrid}>
          {/* Acne Analysis */}
          <TouchableOpacity
            style={[styles.card, { backgroundColor: '#FFE5E5' }]}
            onPress={() => navigateToAnalysis('acne')}
          >
            <View style={[styles.iconCircle, { backgroundColor: '#FF6B6B' }]}>
              <Ionicons name="water" size={32} color="#FFFFFF" />
            </View>
            <Text style={styles.cardTitle}>Acne Analysis</Text>
            <Text style={styles.cardDescription}>
              Detect and classify lesions, measure inflammation
            </Text>
            <View style={styles.cardMetrics}>
              <Text style={styles.metricText}>• Lesion count & type</Text>
              <Text style={styles.metricText}>• Inflammation %</Text>
              <Text style={styles.metricText}>• Pore analysis</Text>
            </View>
          </TouchableOpacity>

          {/* Pigmentation Analysis */}
          <TouchableOpacity
            style={[styles.card, { backgroundColor: '#FFF4E5' }]}
            onPress={() => navigateToAnalysis('pigmentation')}
          >
            <View style={[styles.iconCircle, { backgroundColor: '#FFA726' }]}>
              <Ionicons name="color-palette" size={32} color="#FFFFFF" />
            </View>
            <Text style={styles.cardTitle}>Pigmentation</Text>
            <Text style={styles.cardDescription}>
              Analyze dark spots and patches
            </Text>
            <View style={styles.cardMetrics}>
              <Text style={styles.metricText}>• Area coverage</Text>
              <Text style={styles.metricText}>• Intensity levels</Text>
              <Text style={styles.metricText}>• Spot density</Text>
            </View>
          </TouchableOpacity>

          {/* Wrinkles Analysis */}
          <TouchableOpacity
            style={[styles.card, { backgroundColor: '#E5F4FF' }]}
            onPress={() => navigateToAnalysis('wrinkles')}
          >
            <View style={[styles.iconCircle, { backgroundColor: '#4A90E2' }]}>
              <Ionicons name="layers" size={32} color="#FFFFFF" />
            </View>
            <Text style={styles.cardTitle}>Wrinkles</Text>
            <Text style={styles.cardDescription}>
              Detect and measure fine lines
            </Text>
            <View style={styles.cardMetrics}>
              <Text style={styles.metricText}>• Line count & length</Text>
              <Text style={styles.metricText}>• Depth analysis</Text>
              <Text style={styles.metricText}>• Region-specific</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* History Button */}
        <TouchableOpacity
          style={styles.historyButton}
          onPress={() => router.push('/history')}
        >
          <Ionicons name="time" size={24} color="#4A90E2" />
          <Text style={styles.historyButtonText}>View Scan History</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  appSubtitle: {
    fontSize: 14,
    color: '#7F8C8D',
    marginTop: 4,
    marginLeft: 52,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  quickScanButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  quickScanContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  quickScanTextContainer: {
    flex: 1,
  },
  quickScanTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  quickScanSubtitle: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 16,
  },
  cardsGrid: {
    gap: 16,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 12,
    lineHeight: 20,
  },
  cardMetrics: {
    gap: 4,
  },
  metricText: {
    fontSize: 12,
    color: '#95A5A6',
  },
  historyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 2,
    borderColor: '#4A90E2',
  },
  historyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A90E2',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalIcon: {
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
    textAlign: 'center',
    marginBottom: 16,
  },
  disclaimerScroll: {
    maxHeight: 300,
    marginBottom: 20,
  },
  disclaimerText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 22,
  },
  acceptButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  acceptButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});