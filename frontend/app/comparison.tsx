/**
 * Before/After comparison screen
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  StatusBar,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { authService } from '../services/auth';
import { BACKEND_URL } from '../config/api';

const { width } = Dimensions.get('window');

export default function ComparisonScreen() {
  const router = useRouter();
  const { scanId1, scanId2 } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [comparison, setComparison] = useState<any>(null);
  const [selectedMetric, setSelectedMetric] = useState<'acne' | 'pigmentation' | 'wrinkles'>('acne');

  useEffect(() => {
    if (scanId1 && scanId2) {
      loadComparison(scanId1 as string, scanId2 as string);
    }
  }, [scanId1, scanId2]);

  const loadComparison = async (id1: string, id2: string) => {
    try {
      const token = await authService.getAccessToken();
      const response = await authService.authenticatedFetch(
        `${BACKEND_URL}/api/comparison/compare?scan_id_1=${id1}&scan_id_2=${id2}`
      );

      if (response.ok) {
        const data = await response.json();
        setComparison(data);
      } else {
        throw new Error('Failed to load comparison');
      }
    } catch (error) {
      console.error('Comparison error:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderMetricComparison = () => {
    if (!comparison?.comparisons) return null;

    const metricData = comparison.comparisons[selectedMetric];
    if (!metricData) return null;

    const getChangeColor = (change: number) => {
      if (change < 0) return '#4CAF50'; // Green for improvement
      if (change > 0) return '#FF6B6B'; // Red for worsening
      return '#636E72'; // Gray for no change
    };

    const getChangeIcon = (change: number) => {
      if (change < 0) return 'trending-down';
      if (change > 0) return 'trending-up';
      return 'remove';
    };

    return (
      <View style={styles.metricCard}>
        <Text style={styles.metricTitle}>
          {selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)} Comparison
        </Text>

        {selectedMetric === 'acne' && metricData.totalCount && (
          <View style={styles.comparisonRow}>
            <View style={styles.comparisonItem}>
              <Text style={styles.comparisonLabel}>Before</Text>
              <Text style={styles.comparisonValue}>{metricData.totalCount.before}</Text>
            </View>
            <View style={styles.comparisonItem}>
              <Text style={styles.comparisonLabel}>After</Text>
              <Text style={styles.comparisonValue}>{metricData.totalCount.after}</Text>
            </View>
            <View style={styles.comparisonItem}>
              <Text style={styles.comparisonLabel}>Change</Text>
              <View style={styles.changeContainer}>
                <Ionicons
                  name={getChangeIcon(metricData.totalCount.change)}
                  size={20}
                  color={getChangeColor(metricData.totalCount.change)}
                />
                <Text
                  style={[
                    styles.changeValue,
                    { color: getChangeColor(metricData.totalCount.change) },
                  ]}
                >
                  {metricData.totalCount.change > 0 ? '+' : ''}
                  {metricData.totalCount.change} (
                  {metricData.totalCount.changePercent.toFixed(1)}%)
                </Text>
              </View>
            </View>
          </View>
        )}

        {selectedMetric === 'pigmentation' && metricData.pigmentedPercent && (
          <View style={styles.comparisonRow}>
            <View style={styles.comparisonItem}>
              <Text style={styles.comparisonLabel}>Before</Text>
              <Text style={styles.comparisonValue}>
                {metricData.pigmentedPercent.before.toFixed(1)}%
              </Text>
            </View>
            <View style={styles.comparisonItem}>
              <Text style={styles.comparisonLabel}>After</Text>
              <Text style={styles.comparisonValue}>
                {metricData.pigmentedPercent.after.toFixed(1)}%
              </Text>
            </View>
          </View>
        )}

        {selectedMetric === 'wrinkles' && metricData.count && (
          <View style={styles.comparisonRow}>
            <View style={styles.comparisonItem}>
              <Text style={styles.comparisonLabel}>Before</Text>
              <Text style={styles.comparisonValue}>{metricData.count.before}</Text>
            </View>
            <View style={styles.comparisonItem}>
              <Text style={styles.comparisonLabel}>After</Text>
              <Text style={styles.comparisonValue}>{metricData.count.after}</Text>
            </View>
            <View style={styles.comparisonItem}>
              <Text style={styles.comparisonLabel}>Change</Text>
              <View style={styles.changeContainer}>
                <Ionicons
                  name={getChangeIcon(metricData.count.change)}
                  size={20}
                  color={getChangeColor(metricData.count.change)}
                />
                <Text
                  style={[
                    styles.changeValue,
                    { color: getChangeColor(metricData.count.change) },
                  ]}
                >
                  {metricData.count.change > 0 ? '+' : ''}
                  {metricData.count.change} (
                  {metricData.count.changePercent.toFixed(1)}%)
                </Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.severityContainer}>
          <View style={styles.severityItem}>
            <Text style={styles.severityLabel}>Before Severity</Text>
            <Text style={styles.severityValue}>{metricData.severity?.before || 'N/A'}</Text>
          </View>
          <View style={styles.severityItem}>
            <Text style={styles.severityLabel}>After Severity</Text>
            <Text style={styles.severityValue}>{metricData.severity?.after || 'N/A'}</Text>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#00B894" />
      </View>
    );
  }

  if (!comparison) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <LinearGradient
          colors={['#00B894', '#00CEC9']}
          style={styles.header}
        >
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Comparison</Text>
          <View style={styles.backButton} />
        </LinearGradient>
        <View style={[styles.centerContent, { flex: 1 }]}>
          <Text style={styles.errorText}>Failed to load comparison</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['#00B894', '#00CEC9']}
        style={styles.header}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Before & After</Text>
        <View style={styles.backButton} />
      </LinearGradient>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Images */}
        <View style={styles.imagesContainer}>
          <View style={styles.imageWrapper}>
            <Text style={styles.imageLabel}>Before</Text>
            <Image
              source={{ uri: `${BACKEND_URL}${comparison.scan1.imageUri}` }}
              style={styles.image}
              resizeMode="cover"
            />
          </View>
          <View style={styles.imageWrapper}>
            <Text style={styles.imageLabel}>After</Text>
            <Image
              source={{ uri: `${BACKEND_URL}${comparison.scan2.imageUri}` }}
              style={styles.image}
              resizeMode="cover"
            />
          </View>
        </View>

        {/* Metric Selector */}
        <View style={styles.metricSelector}>
          {(['acne', 'pigmentation', 'wrinkles'] as const).map((metric) => (
            <TouchableOpacity
              key={metric}
              style={[
                styles.metricButton,
                selectedMetric === metric && styles.metricButtonActive,
              ]}
              onPress={() => setSelectedMetric(metric)}
            >
              <Text
                style={[
                  styles.metricButtonText,
                  selectedMetric === metric && styles.metricButtonTextActive,
                ]}
              >
                {metric.charAt(0).toUpperCase() + metric.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Comparison Results */}
        {renderMetricComparison()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FFFE',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
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
  imagesContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  imageWrapper: {
    flex: 1,
  },
  imageLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D3436',
    marginBottom: 8,
    textAlign: 'center',
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: '#E0E0E0',
  },
  metricSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  metricButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8F8F5',
  },
  metricButtonActive: {
    backgroundColor: '#00B894',
    borderColor: '#00B894',
  },
  metricButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#636E72',
  },
  metricButtonTextActive: {
    color: '#FFFFFF',
  },
  metricCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  metricTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D3436',
    marginBottom: 16,
  },
  comparisonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  comparisonItem: {
    alignItems: 'center',
  },
  comparisonLabel: {
    fontSize: 12,
    color: '#636E72',
    marginBottom: 8,
  },
  comparisonValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2D3436',
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  changeValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  severityContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E8F8F5',
  },
  severityItem: {
    alignItems: 'center',
  },
  severityLabel: {
    fontSize: 12,
    color: '#636E72',
    marginBottom: 4,
  },
  severityValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3436',
  },
  errorText: {
    fontSize: 16,
    color: '#636E72',
  },
});
