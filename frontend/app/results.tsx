import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getRecommendations } from '../utils/imageAnalysis';

const { width } = Dimensions.get('window');

export default function ResultsScreen() {
  const router = useRouter();
  const { resultsData } = useLocalSearchParams();
  const [results] = useState(() => JSON.parse(resultsData as string));
  const [selectedTab, setSelectedTab] = useState<string>(
    results.analysisType === 'full' ? 'acne' : results.analysisType
  );

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
        <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(severity) }]}>
          <Ionicons name="medical" size={24} color="#FFFFFF" />
          <Text style={styles.severityText}>{severity} Acne</Text>
        </View>

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
          {renderMetricCard('Pore Count', metrics.poreCount)}
          {renderMetricCard('Pore Density', metrics.poreDensity, '/cm²')}
        </View>

        {/* Recommendations */}
        <View style={styles.recommendationsCard}>
          <Text style={styles.recommendationsTitle}>Recommended Treatment</Text>
          <View style={styles.durationBadge}>
            <Ionicons name="time-outline" size={16} color="#4A90E2" />
            <Text style={styles.durationText}>{recommendations.duration}</Text>
          </View>
          {recommendations.treatments.map((treatment: string, index: number) => (
            <View key={index} style={styles.treatmentItem}>
              <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
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
        {/* Severity Badge */}
        <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(severity) }]}>
          <Ionicons name="color-palette" size={24} color="#FFFFFF" />
          <Text style={styles.severityText}>{severity} Pigmentation</Text>
        </View>

        {/* Metrics Grid */}
        <View style={styles.metricsGrid}>
          {renderMetricCard('Coverage', metrics.pigmentedPercent, '%')}
          {renderMetricCard('Intensity Δ', metrics.avgIntensityDiff)}
          {renderMetricCard('SHI Score', metrics.shi)}
          {renderMetricCard('Spot Count', metrics.spotCount)}
          {renderMetricCard('Spot Density', metrics.spotDensity, '/cm²')}
        </View>

        {/* Recommendations */}
        <View style={styles.recommendationsCard}>
          <Text style={styles.recommendationsTitle}>Recommended Treatment</Text>
          <View style={styles.durationBadge}>
            <Ionicons name="time-outline" size={16} color="#4A90E2" />
            <Text style={styles.durationText}>{recommendations.duration}</Text>
          </View>
          {recommendations.treatments.map((treatment: string, index: number) => (
            <View key={index} style={styles.treatmentItem}>
              <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
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
        {/* Severity Badge */}
        <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(severity) }]}>
          <Ionicons name="layers" size={24} color="#FFFFFF" />
          <Text style={styles.severityText}>{severity} Wrinkles</Text>
        </View>

        {/* Metrics Grid */}
        <View style={styles.metricsGrid}>
          {renderMetricCard('Line Count', metrics.count)}
          {renderMetricCard('Count/cm²', metrics.countPerCm)}
          {renderMetricCard('Avg Length', metrics.avgLength, 'mm')}
          {renderMetricCard('Avg Depth', metrics.avgDepth)}
          {renderMetricCard('Density', metrics.densityPercent, '%')}
        </View>

        {/* Recommendations */}
        <View style={styles.recommendationsCard}>
          <Text style={styles.recommendationsTitle}>Recommended Treatment</Text>
          <View style={styles.durationBadge}>
            <Ionicons name="time-outline" size={16} color="#4A90E2" />
            <Text style={styles.durationText}>{recommendations.duration}</Text>
          </View>
          {recommendations.treatments.map((treatment: string, index: number) => (
            <View key={index} style={styles.treatmentItem}>
              <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => router.push('/')}>
          <Ionicons name="close" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Analysis Results</Text>
        <TouchableOpacity style={styles.headerButton} onPress={() => router.push('/history')}>
          <Ionicons name="time" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Captured Image */}
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: `data:image/jpeg;base64,${results.imageBase64}` }}
          style={styles.image}
        />
      </View>

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
            >
              <Ionicons
                name={tab.icon as any}
                size={20}
                color={selectedTab === tab.key ? '#4A90E2' : '#95A5A6'}
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
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {renderContent()}

        {/* Disclaimer */}
        <View style={styles.disclaimerCard}>
          <Ionicons name="information-circle-outline" size={20} color="#FF6B6B" />
          <Text style={styles.disclaimerText}>
            This analysis is informational only. Always consult a dermatologist for professional medical advice.
          </Text>
        </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: '#4A90E2',
  },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
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
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#4A90E2',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#95A5A6',
  },
  tabTextActive: {
    color: '#4A90E2',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  tabContent: {
    gap: 16,
  },
  severityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  severityText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCard: {
    width: (width - 44) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  metricLabel: {
    fontSize: 12,
    color: '#7F8C8D',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  metricUnit: {
    fontSize: 14,
    color: '#95A5A6',
  },
  recommendationsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  recommendationsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 12,
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E3F2FD',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  durationText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A90E2',
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
    color: '#555',
    lineHeight: 20,
  },
  disclaimerCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 13,
    color: '#E65100',
    lineHeight: 18,
  },
});