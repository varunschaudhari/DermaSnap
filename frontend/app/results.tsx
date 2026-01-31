import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions, StatusBar, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getRecommendations } from '../utils/imageAnalysis';

const { width } = Dimensions.get('window');

export default function ResultsScreen() {
  const router = useRouter();
  const { resultsId } = useLocalSearchParams();
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<string>('acne');

  useEffect(() => {
    loadResults();
  }, []);

  const loadResults = async () => {
    try {
      // First try to get from latest scan storage
      const latestScan = await AsyncStorage.getItem('latest_scan_result');
      if (latestScan) {
        const data = JSON.parse(latestScan);
        setResults(data);
        
        // Set initial tab based on analysis type
        if (data.analysisType === 'full') {
          setSelectedTab('acne');
        } else {
          setSelectedTab(data.analysisType);
        }
      } else {
        console.error('No scan results found');
        router.back();
      }
    } catch (error) {
      console.error('Error loading results:', error);
      router.back();
    } finally {
      setLoading(false);
    }
  };

  if (loading || !results) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00B894" />
        <Text style={styles.loadingText}>Loading results...</Text>
      </View>
    );
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Mild': return '#4CAF50';
      case 'Moderate': return '#FFA726';
      case 'Severe': return '#FF6B6B';
      default: return '#95A5A6';
    }
  };

  const renderMetricCard = (label: string, value: string | number, unit?: string) => (
    <View style={styles.metricCard}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>
        {value}
        {unit && <Text style={styles.metricUnit}> {unit}</Text>}
      </Text>
    </View>
  );

  const renderAcneResults = () => {
    if (!results.acne) return null;
    const { metrics, severity } = results.acne;
    const recommendations = getRecommendations(severity, 'acne');

    return (
      <View style={styles.tabContent}>
        {/* Severity Badge */}
        <LinearGradient
          colors={[getSeverityColor(severity), getSeverityColor(severity) + 'DD']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.severityBadge}
        >
          <Ionicons name="medical" size={24} color="#FFFFFF" />
          <Text style={styles.severityText}>{severity} Acne</Text>
        </LinearGradient>

        {/* Metrics Grid */}
        <View style={styles.metricsGrid}>
          {renderMetricCard('Total Lesions', metrics.totalCount)}
          {renderMetricCard('Density', metrics.density, '/cm²')}
          {renderMetricCard('Comedones', metrics.comedones)}
          {renderMetricCard('Pustules', metrics.pustules)}
          {renderMetricCard('Papules', metrics.papules)}
          {renderMetricCard('Nodules', metrics.nodules)}
          {renderMetricCard('Inflammation', metrics.inflammatoryPercent, '%')}
          {renderMetricCard('Redness', metrics.rednessPercent, '%')}
        </View>

        {/* Recommendations */}
        <View style={styles.recommendationsCard}>
          <Text style={styles.recommendationsTitle}>Treatment Plan</Text>
          <View style={styles.durationBadge}>
            <Ionicons name="time-outline" size={16} color="#00B894" />
            <Text style={styles.durationText}>{recommendations.duration}</Text>
          </View>
          {recommendations.treatments.map((treatment: string, index: number) => (
            <View key={index} style={styles.treatmentItem}>
              <Ionicons name="checkmark-circle" size={20} color="#00B894" />
              <Text style={styles.treatmentText}>{treatment}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderPigmentationResults = () => {
    if (!results.pigmentation) return null;
    const { metrics, severity } = results.pigmentation;
    const recommendations = getRecommendations(severity, 'pigmentation');

    return (
      <View style={styles.tabContent}>
        <LinearGradient
          colors={[getSeverityColor(severity), getSeverityColor(severity) + 'DD']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.severityBadge}
        >
          <Ionicons name="color-palette" size={24} color="#FFFFFF" />
          <Text style={styles.severityText}>{severity} Pigmentation</Text>
        </LinearGradient>

        <View style={styles.metricsGrid}>
          {renderMetricCard('Coverage', metrics.pigmentedPercent, '%')}
          {renderMetricCard('Intensity Δ', metrics.avgIntensityDiff)}
          {renderMetricCard('SHI Score', metrics.shi)}
          {renderMetricCard('Spot Count', metrics.spotCount)}
          {renderMetricCard('Spot Density', metrics.spotDensity, '/cm²')}
        </View>

        <View style={styles.recommendationsCard}>
          <Text style={styles.recommendationsTitle}>Treatment Plan</Text>
          <View style={styles.durationBadge}>
            <Ionicons name="time-outline" size={16} color="#00B894" />
            <Text style={styles.durationText}>{recommendations.duration}</Text>
          </View>
          {recommendations.treatments.map((treatment: string, index: number) => (
            <View key={index} style={styles.treatmentItem}>
              <Ionicons name="checkmark-circle" size={20} color="#00B894" />
              <Text style={styles.treatmentText}>{treatment}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderWrinklesResults = () => {
    if (!results.wrinkles) return null;
    const { metrics, severity } = results.wrinkles;
    const recommendations = getRecommendations(severity, 'wrinkles');

    return (
      <View style={styles.tabContent}>
        <LinearGradient
          colors={[getSeverityColor(severity), getSeverityColor(severity) + 'DD']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.severityBadge}
        >
          <Ionicons name="layers" size={24} color="#FFFFFF" />
          <Text style={styles.severityText}>{severity} Wrinkles</Text>
        </LinearGradient>

        <View style={styles.metricsGrid}>
          {renderMetricCard('Line Count', metrics.count)}
          {renderMetricCard('Count/cm²', metrics.countPerCm)}
          {renderMetricCard('Avg Length', metrics.avgLength, 'mm')}
          {renderMetricCard('Avg Depth', metrics.avgDepth)}
          {renderMetricCard('Density', metrics.densityPercent, '%')}
        </View>

        <View style={styles.recommendationsCard}>
          <Text style={styles.recommendationsTitle}>Treatment Plan</Text>
          <View style={styles.durationBadge}>
            <Ionicons name="time-outline" size={16} color="#00B894" />
            <Text style={styles.durationText}>{recommendations.duration}</Text>
          </View>
          {recommendations.treatments.map((treatment: string, index: number) => (
            <View key={index} style={styles.treatmentItem}>
              <Ionicons name="checkmark-circle" size={20} color="#00B894" />
              <Text style={styles.treatmentText}>{treatment}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderContent = () => {
    switch (selectedTab) {
      case 'acne': return renderAcneResults();
      case 'pigmentation': return renderPigmentationResults();
      case 'wrinkles': return renderWrinklesResults();
      default: return null;
    }
  };

  const availableTabs = [];
  if (results.acne) availableTabs.push({ key: 'acne', label: 'Acne', icon: 'water' });
  if (results.pigmentation) availableTabs.push({ key: 'pigmentation', label: 'Pigmentation', icon: 'color-palette' });
  if (results.wrinkles) availableTabs.push({ key: 'wrinkles', label: 'Wrinkles', icon: 'layers' });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <LinearGradient
        colors={['#00B894', '#00CEC9']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity style={styles.headerButton} onPress={() => router.push('/')}>
          <View style={styles.headerButtonCircle}>
            <Ionicons name="close" size={24} color="#00B894" />
          </View>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Analysis Results</Text>
        <TouchableOpacity style={styles.headerButton} onPress={() => router.push('/history')}>
          <View style={styles.headerButtonCircle}>
            <Ionicons name="time" size={24} color="#00B894" />
          </View>
        </TouchableOpacity>
      </LinearGradient>

      {/* Captured Image */}
      {results.imageBase64 && (
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: `data:image/jpeg;base64,${results.imageBase64}` }}
            style={styles.image}
          />
        </View>
      )}

      {/* Tabs */}
      {availableTabs.length > 1 && (
        <View style={styles.tabsContainer}>
          {availableTabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tab,
                selectedTab === tab.key && styles.tabActive,
              ]}
              onPress={() => setSelectedTab(tab.key)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={tab.icon as any}
                size={20}
                color={selectedTab === tab.key ? '#00B894' : '#636E72'}
              />
              <Text
                style={[
                  styles.tabText,
                  selectedTab === tab.key && styles.tabTextActive,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Results Content */}
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {renderContent()}

        {/* Disclaimer */}
        <View style={styles.disclaimerCard}>
          <Ionicons name="information-circle-outline" size={20} color="#FF6B6B" />
          <Text style={styles.disclaimerText}>
            This analysis is informational only. Always consult a dermatologist for professional medical advice.
          </Text>
        </View>

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
  loadingContainer: {
    flex: 1,
    backgroundColor: '#F7FFFE',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#636E72',
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerButtonCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  imageContainer: {
    backgroundColor: '#000000',
    height: 200,
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    marginHorizontal: 4,
  },
  tabActive: {
    backgroundColor: '#E8F8F5',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#636E72',
  },
  tabTextActive: {
    color: '#00B894',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  tabContent: {
    gap: 20,
  },
  severityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
  },
  severityText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCard: {
    width: (width - 52) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: '#00B894',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  metricLabel: {
    fontSize: 12,
    color: '#636E72',
    marginBottom: 6,
    fontWeight: '500',
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2D3436',
  },
  metricUnit: {
    fontSize: 14,
    color: '#95A5A6',
    fontWeight: '600',
  },
  recommendationsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    elevation: 2,
    shadowColor: '#00B894',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  recommendationsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D3436',
    marginBottom: 12,
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E8F8F5',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  durationText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#00B894',
  },
  treatmentItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 12,
  },
  treatmentText: {
    flex: 1,
    fontSize: 14,
    color: '#636E72',
    lineHeight: 20,
    fontWeight: '400',
  },
  disclaimerCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#FFF3E0',
    borderRadius: 16,
    padding: 16,
    marginTop: 20,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 13,
    color: '#E65100',
    lineHeight: 18,
    fontWeight: '500',
  },
});