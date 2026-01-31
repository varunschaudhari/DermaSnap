import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, StatusBar, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format } from 'date-fns';
import { LineChart, BarChart } from 'react-native-gifted-charts';

const { width } = Dimensions.get('window');

export default function ProgressScreen() {
  const router = useRouter();
  const [scans, setScans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeProfile, setActiveProfile] = useState<any>(null);
  const [selectedMetric, setSelectedMetric] = useState<'acne' | 'pigmentation' | 'wrinkles'>('acne');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const profileData = await AsyncStorage.getItem('active_profile');
      if (profileData) {
        const profile = JSON.parse(profileData);
        setActiveProfile(profile);
        
        const scansData = await AsyncStorage.getItem(`skin_scans_${profile.id}`);
        if (scansData) {
          setScans(JSON.parse(scansData));
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getChartData = () => {
    if (scans.length === 0) return [];
    
    const data = scans.slice(0, 10).reverse();
    
    switch (selectedMetric) {
      case 'acne':
        return data.map((scan, index) => ({
          value: scan.acne?.metrics?.totalCount || 0,
          label: format(new Date(scan.timestamp), 'MM/dd'),
          frontColor: '#00B894',
        }));
      case 'pigmentation':
        return data.map((scan, index) => ({
          value: parseFloat(scan.pigmentation?.metrics?.pigmentedPercent || '0'),
          label: format(new Date(scan.timestamp), 'MM/dd'),
          frontColor: '#FFA726',
        }));
      case 'wrinkles':
        return data.map((scan, index) => ({
          value: scan.wrinkles?.metrics?.count || 0,
          label: format(new Date(scan.timestamp), 'MM/dd'),
          frontColor: '#4A90E2',
        }));
      default:
        return [];
    }
  };

  const getImprovementPercentage = () => {
    if (scans.length < 2) return null;
    
    const latest = scans[0];
    const oldest = scans[scans.length - 1];
    
    let latestValue = 0;
    let oldestValue = 0;
    
    switch (selectedMetric) {
      case 'acne':
        latestValue = latest.acne?.metrics?.totalCount || 0;
        oldestValue = oldest.acne?.metrics?.totalCount || 0;
        break;
      case 'pigmentation':
        latestValue = parseFloat(latest.pigmentation?.metrics?.pigmentedPercent || '0');
        oldestValue = parseFloat(oldest.pigmentation?.metrics?.pigmentedPercent || '0');
        break;
      case 'wrinkles':
        latestValue = latest.wrinkles?.metrics?.count || 0;
        oldestValue = oldest.wrinkles?.metrics?.count || 0;
        break;
    }
    
    if (oldestValue === 0) return null;
    
    const change = ((oldestValue - latestValue) / oldestValue) * 100;
    return Math.round(change);
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#00B894" />
      </View>
    );
  }

  const improvement = getImprovementPercentage();

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
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Progress Tracking</Text>
        <View style={styles.backButton} />
      </LinearGradient>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {scans.length < 2 ? (
          <View style={styles.emptyState}>
            <Ionicons name="analytics-outline" size={80} color="#E0E0E0" />
            <Text style={styles.emptyTitle}>Not Enough Data</Text>
            <Text style={styles.emptyText}>Take at least 2 scans to track your progress</Text>
            <TouchableOpacity
              style={styles.scanButton}
              onPress={() => router.push('/camera?type=full')}
            >
              <Ionicons name="camera" size={20} color="#FFFFFF" />
              <Text style={styles.scanButtonText}>Take a Scan</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            {/* Improvement Card */}
            {improvement !== null && (
              <View style={styles.improvementCard}>
                <Text style={styles.improvementTitle}>Overall Progress</Text>
                <View style={styles.improvementValueContainer}>
                  <Ionicons 
                    name={improvement > 0 ? 'trending-down' : 'trending-up'} 
                    size={32} 
                    color={improvement > 0 ? '#4CAF50' : '#FF6B6B'} 
                  />
                  <Text style={[
                    styles.improvementValue,
                    { color: improvement > 0 ? '#4CAF50' : '#FF6B6B' }
                  ]}>
                    {Math.abs(improvement)}%
                  </Text>
                </View>
                <Text style={styles.improvementLabel}>
                  {improvement > 0 ? 'Improvement' : 'Change'} since first scan
                </Text>
              </View>
            )}

            {/* Metric Selector */}
            <View style={styles.metricSelector}>
              <TouchableOpacity
                style={[
                  styles.metricButton,
                  selectedMetric === 'acne' && styles.metricButtonActive,
                ]}
                onPress={() => setSelectedMetric('acne')}
              >
                <Ionicons 
                  name="water" 
                  size={20} 
                  color={selectedMetric === 'acne' ? '#FFFFFF' : '#636E72'} 
                />
                <Text style={[
                  styles.metricButtonText,
                  selectedMetric === 'acne' && styles.metricButtonTextActive,
                ]}>
                  Acne
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.metricButton,
                  selectedMetric === 'pigmentation' && styles.metricButtonActive,
                ]}
                onPress={() => setSelectedMetric('pigmentation')}
              >
                <Ionicons 
                  name="color-palette" 
                  size={20} 
                  color={selectedMetric === 'pigmentation' ? '#FFFFFF' : '#636E72'} 
                />
                <Text style={[
                  styles.metricButtonText,
                  selectedMetric === 'pigmentation' && styles.metricButtonTextActive,
                ]}>
                  Pigmentation
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.metricButton,
                  selectedMetric === 'wrinkles' && styles.metricButtonActive,
                ]}
                onPress={() => setSelectedMetric('wrinkles')}
              >
                <Ionicons 
                  name="layers" 
                  size={20} 
                  color={selectedMetric === 'wrinkles' ? '#FFFFFF' : '#636E72'} 
                />
                <Text style={[
                  styles.metricButtonText,
                  selectedMetric === 'wrinkles' && styles.metricButtonTextActive,
                ]}>
                  Wrinkles
                </Text>
              </TouchableOpacity>
            </View>

            {/* Chart */}
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>
                {selectedMetric === 'acne' && 'Acne Lesion Count'}
                {selectedMetric === 'pigmentation' && 'Pigmentation Coverage (%)'}
                {selectedMetric === 'wrinkles' && 'Wrinkle Count'}
              </Text>
              <View style={styles.chartContainer}>
                <BarChart
                  data={getChartData()}
                  width={width - 80}
                  height={220}
                  barWidth={28}
                  spacing={24}
                  roundedTop
                  roundedBottom
                  xAxisThickness={0}
                  yAxisThickness={0}
                  yAxisTextStyle={{ color: '#636E72', fontSize: 12 }}
                  noOfSections={5}
                  maxValue={selectedMetric === 'pigmentation' ? 100 : undefined}
                />
              </View>
            </View>

            {/* Stats Summary */}
            <View style={styles.statsCard}>
              <Text style={styles.statsTitle}>Statistics</Text>
              <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Total Scans</Text>
                  <Text style={styles.statValue}>{scans.length}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>First Scan</Text>
                  <Text style={styles.statValue}>
                    {format(new Date(scans[scans.length - 1].timestamp), 'MMM dd')}
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Latest Scan</Text>
                  <Text style={styles.statValue}>
                    {format(new Date(scans[0].timestamp), 'MMM dd')}
                  </Text>
                </View>
              </View>
            </View>

            {/* Compare Button */}
            {scans.length >= 2 && (
              <TouchableOpacity
                style={styles.compareButton}
                onPress={() => router.push('/compare')}
              >
                <Ionicons name="git-compare" size={20} color="#FFFFFF" />
                <Text style={styles.compareButtonText}>Compare Scans</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2D3436',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#636E72',
    marginTop: 8,
    marginBottom: 24,
    textAlign: 'center',
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#00B894',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  scanButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  improvementCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#00B894',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  improvementTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#636E72',
    marginBottom: 12,
  },
  improvementValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  improvementValue: {
    fontSize: 48,
    fontWeight: '700',
  },
  improvementLabel: {
    fontSize: 14,
    color: '#636E72',
    marginTop: 8,
  },
  metricSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  metricButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8F8F5',
  },
  metricButtonActive: {
    backgroundColor: '#00B894',
    borderColor: '#00B894',
  },
  metricButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#636E72',
  },
  metricButtonTextActive: {
    color: '#FFFFFF',
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#00B894',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2D3436',
    marginBottom: 16,
  },
  chartContainer: {
    alignItems: 'center',
  },
  statsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#00B894',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2D3436',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#636E72',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D3436',
  },
  compareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#00B894',
    paddingVertical: 16,
    borderRadius: 12,
  },
  compareButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});