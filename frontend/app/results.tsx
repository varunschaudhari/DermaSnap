import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions, StatusBar, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getRecommendations } from '../utils/imageAnalysis';
import { BACKEND_URL } from '../config/api';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';

interface ScanData {
  _id?: string;
  imageUri: string;
  imageBase64?: string;
  skinTone: string;
  timestamp: string;
  analysisType: string;
  acne?: any;
  pigmentation?: any;
  wrinkles?: any;
  profileId?: string;
}

const { width } = Dimensions.get('window');

export default function ResultsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<string>('acne');

  // Normalize params (useLocalSearchParams can return string | string[])
  const scanId = Array.isArray(params.scanId) ? params.scanId[0] : params.scanId;
  const resultsData = Array.isArray(params.resultsData) ? params.resultsData[0] : params.resultsData;

  useEffect(() => {
    loadResults();
  }, [scanId, resultsData]);

  const loadResults = async () => {
    try {
      // If scanId provided, fetch full data from database (includes image)
      if (scanId && BACKEND_URL) {
        try {
          const response = await fetch(`${BACKEND_URL}/api/scans/${scanId}`);
          if (response.ok) {
            const fullScan = await response.json() as ScanData;
            setResults(fullScan);
            
            if (fullScan.analysisType === 'full') {
              setSelectedTab('acne');
            } else {
              setSelectedTab(fullScan.analysisType);
            }
            setLoading(false);
            return;
          }
        } catch (dbError) {
          console.warn('Failed to load from database:', dbError);
        }
      }
      
      // Try resultsData from params (legacy)
      if (resultsData) {
        try {
          const data = JSON.parse(resultsData);
          setResults(data);
          if (data.analysisType === 'full') {
            setSelectedTab('acne');
          } else {
            setSelectedTab(data.analysisType);
          }
          setLoading(false);
          return;
        } catch (error) {
          console.warn('Failed to parse resultsData:', error);
        }
      }
      
      // Fallback: try latest scan from local storage (should have databaseId)
      const latestScan = await AsyncStorage.getItem('latest_scan_result');
      if (latestScan) {
        const data = JSON.parse(latestScan);
        
        // If we have a databaseId, try to fetch full data from backend
        if (data.databaseId && BACKEND_URL) {
          try {
            const response = await fetch(`${BACKEND_URL}/api/scans/${data.databaseId}`);
            if (response.ok) {
              const fullScan = await response.json() as ScanData;
              setResults(fullScan);
              if (fullScan.analysisType === 'full') {
                setSelectedTab('acne');
              } else {
                setSelectedTab(fullScan.analysisType);
              }
              setLoading(false);
              return;
            }
          } catch (dbError) {
            console.warn('Failed to fetch from database using databaseId:', dbError);
          }
        }
        
        // Use local data as last resort (without image)
        setResults(data);
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
    const { metrics, severity, lesionAnalysis } = results.acne;
    const recommendations = getRecommendations(severity, 'acne');

    // Use lesion-based metrics if available, otherwise fall back to legacy metrics
    const lesionMetrics = lesionAnalysis?.metrics || metrics;
    const hasLesionAnalysis = !!lesionAnalysis;

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
          {hasLesionAnalysis && (
            <View style={styles.methodBadge}>
              <Text style={styles.methodText}>Lesion-Based Analysis</Text>
            </View>
          )}
        </LinearGradient>

        {/* Lesion Summary */}
        {hasLesionAnalysis && lesionAnalysis.lesions && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Lesion Summary</Text>
            <Text style={styles.summaryText}>
              {lesionMetrics.totalCount} total lesions detected
              {lesionMetrics.comedones > 0 && ` • ${lesionMetrics.comedones} comedones`}
              {lesionMetrics.whiteheads > 0 && ` • ${lesionMetrics.whiteheads} whiteheads`}
              {lesionMetrics.blackheads > 0 && ` • ${lesionMetrics.blackheads} blackheads`}
              {lesionMetrics.papules > 0 && ` • ${lesionMetrics.papules} papules`}
              {lesionMetrics.pustules > 0 && ` • ${lesionMetrics.pustules} pustules`}
              {lesionMetrics.nodules > 0 && ` • ${lesionMetrics.nodules} nodules`}
            </Text>
            <Text style={styles.summarySubtext}>
              {lesionMetrics.inflammatoryPercent}% inflammatory • {lesionMetrics.averageDensity} lesions/cm²
            </Text>
          </View>
        )}

        {/* Metrics Grid */}
        <View style={styles.metricsGrid}>
          {renderMetricCard('Total Lesions', lesionMetrics.totalCount || metrics.totalCount)}
          {renderMetricCard('Density', hasLesionAnalysis ? lesionMetrics.averageDensity : metrics.density, '/cm²')}
          {renderMetricCard('Comedones', lesionMetrics.comedones || metrics.comedones)}
          {hasLesionAnalysis && renderMetricCard('Whiteheads', lesionMetrics.whiteheads || 0)}
          {hasLesionAnalysis && renderMetricCard('Blackheads', lesionMetrics.blackheads || 0)}
          {renderMetricCard('Pustules', lesionMetrics.pustules || metrics.pustules)}
          {renderMetricCard('Papules', lesionMetrics.papules || metrics.papules)}
          {renderMetricCard('Nodules', lesionMetrics.nodules || metrics.nodules)}
          {renderMetricCard('Inflammation', hasLesionAnalysis ? lesionMetrics.inflammatoryPercent : metrics.inflammatoryPercent, '%')}
          {renderMetricCard('Redness', hasLesionAnalysis ? lesionMetrics.averageRednessPercent : metrics.rednessPercent, '%')}
        </View>

        {/* ROI Density Information */}
        {hasLesionAnalysis && lesionAnalysis.rois && lesionAnalysis.rois.length > 0 && (
          <View style={styles.roiCard}>
            <Text style={styles.roiTitle}>Density by Region</Text>
            {lesionAnalysis.rois.map((roi: { name: string; lesions: unknown[]; density: number }, index: number) => (
              <View key={index} style={styles.roiItem}>
                <Text style={styles.roiLabel}>
                  {roi.name.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </Text>
                <Text style={styles.roiValue}>
                  {roi.lesions.length} lesions • {roi.density.toFixed(1)}/cm²
                </Text>
              </View>
            ))}
          </View>
        )}

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

      {/* Captured Image with Lesion Map Overlay */}
      {results.imageBase64 && (
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: `data:image/jpeg;base64,${results.imageBase64}` }}
            style={styles.image}
            resizeMode="contain"
          />
          {/* Lesion Map Overlay */}
          {results.acne?.lesionAnalysis?.visualMap && (() => {
            const imageWidth = results.acne.lesionAnalysis.visualMap.imageWidth;
            const imageHeight = results.acne.lesionAnalysis.visualMap.imageHeight;
            const displayWidth = width;
            const displayHeight = 200; // Match imageContainer height
            
            // Calculate scaling to maintain aspect ratio
            const imageAspect = imageWidth / imageHeight;
            const displayAspect = displayWidth / displayHeight;
            
            let scaledWidth = displayWidth;
            let scaledHeight = displayHeight;
            let offsetX = 0;
            let offsetY = 0;
            
            if (imageAspect > displayAspect) {
              // Image is wider - fit to width
              scaledHeight = displayWidth / imageAspect;
              offsetY = (displayHeight - scaledHeight) / 2;
            } else {
              // Image is taller - fit to height
              scaledWidth = displayHeight * imageAspect;
              offsetX = (displayWidth - scaledWidth) / 2;
            }
            
            const scaleX = scaledWidth / imageWidth;
            const scaleY = scaledHeight / imageHeight;
            
            return (
              <View style={styles.lesionOverlay} pointerEvents="none">
                <Svg width={displayWidth} height={displayHeight}>
                  {results.acne.lesionAnalysis.visualMap.lesions.map((lesion: any) => {
                    const x = lesion.x * scaleX + offsetX;
                    const y = lesion.y * scaleY + offsetY;
                    
                    return (
                      <Circle
                        key={lesion.id}
                        cx={x}
                        cy={y}
                        r={5}
                        fill={lesion.color}
                        stroke="#FFFFFF"
                        strokeWidth={1.5}
                        opacity={0.85}
                      />
                    );
                  })}
                </Svg>
              </View>
            );
          })()}
          {/* Legend */}
          {results.acne?.lesionAnalysis?.visualMap && (
            <View style={styles.legend}>
              <Text style={styles.legendTitle}>Lesion Types</Text>
              <View style={styles.legendItems}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#E74C3C' }]} />
                  <Text style={styles.legendText}>Pustule</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#E67E22' }]} />
                  <Text style={styles.legendText}>Papule</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#8E44AD' }]} />
                  <Text style={styles.legendText}>Nodule</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#95A5A6' }]} />
                  <Text style={styles.legendText}>Comedone</Text>
                </View>
              </View>
            </View>
          )}
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
  methodBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 8,
  },
  methodText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: '#00B894',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2D3436',
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 14,
    color: '#636E72',
    lineHeight: 20,
    marginBottom: 4,
  },
  summarySubtext: {
    fontSize: 12,
    color: '#95A5A6',
    fontWeight: '500',
  },
  roiCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: '#00B894',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  roiTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2D3436',
    marginBottom: 12,
  },
  roiItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E8F8F5',
  },
  roiLabel: {
    fontSize: 14,
    color: '#636E72',
    fontWeight: '500',
    flex: 1,
  },
  roiValue: {
    fontSize: 14,
    color: '#00B894',
    fontWeight: '600',
  },
  lesionOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  legend: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    padding: 12,
    maxWidth: 150,
  },
  legendTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2D3436',
    marginBottom: 8,
  },
  legendItems: {
    gap: 6,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 11,
    color: '#636E72',
    fontWeight: '500',
  },
});