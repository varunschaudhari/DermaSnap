import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format } from 'date-fns';

export default function HistoryScreen() {
  const router = useRouter();
  const [scans, setScans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadScans();
  }, []);

  const loadScans = async () => {
    try {
      const storedScans = await AsyncStorage.getItem('skin_scans');
      if (storedScans) {
        setScans(JSON.parse(storedScans));
      }
    } catch (error) {
      console.error('Error loading scans:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteScan = async (index: number) => {
    Alert.alert(
      'Delete Scan',
      'Are you sure you want to delete this scan?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const updatedScans = [...scans];
              updatedScans.splice(index, 1);
              await AsyncStorage.setItem('skin_scans', JSON.stringify(updatedScans));
              setScans(updatedScans);
            } catch (error) {
              console.error('Error deleting scan:', error);
            }
          },
        },
      ]
    );
  };

  const viewScan = (scan: any) => {
    router.push({
      pathname: '/results',
      params: {
        resultsData: JSON.stringify(scan),
      },
    });
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Mild': return '#4CAF50';
      case 'Moderate': return '#FFA726';
      case 'Severe': return '#FF6B6B';
      default: return '#95A5A6';
    }
  };

  const getAnalysisTypeLabel = (type: string) => {
    switch (type) {
      case 'acne': return 'Acne';
      case 'pigmentation': return 'Pigmentation';
      case 'wrinkles': return 'Wrinkles';
      case 'full': return 'Full Scan';
      default: return 'Analysis';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scan History</Text>
        <View style={styles.headerButton} />
      </View>

      {scans.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="document-text-outline" size={80} color="#E0E0E0" />
          <Text style={styles.emptyTitle}>No Scan History</Text>
          <Text style={styles.emptyText}>Your skin analysis results will appear here</Text>
          <TouchableOpacity
            style={styles.startButton}
            onPress={() => router.push('/')}
          >
            <Text style={styles.startButtonText}>Start Your First Scan</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <Text style={styles.sectionTitle}>{scans.length} Scans</Text>

          {scans.map((scan, index) => (
            <TouchableOpacity
              key={index}
              style={styles.scanCard}
              onPress={() => viewScan(scan)}
            >
              {/* Placeholder icon instead of image thumbnail */}
              <View style={styles.thumbnailPlaceholder}>
                <Ionicons name="camera" size={32} color="#00B894" />
              </View>

              {/* Scan Info */}
              <View style={styles.scanInfo}>
                <View style={styles.scanHeader}>
                  <Text style={styles.scanType}>
                    {getAnalysisTypeLabel(scan.analysisType)}
                  </Text>
                  <Text style={styles.scanDate}>
                    {format(new Date(scan.timestamp), 'MMM dd, yyyy')}
                  </Text>
                </View>

                {/* Severity Tags */}
                <View style={styles.severityTags}>
                  {scan.acne && (
                    <View style={[styles.severityTag, { backgroundColor: getSeverityColor(scan.acne.severity) }]}>
                      <Text style={styles.severityTagText}>A: {scan.acne.severity}</Text>
                    </View>
                  )}
                  {scan.pigmentation && (
                    <View style={[styles.severityTag, { backgroundColor: getSeverityColor(scan.pigmentation.severity) }]}>
                      <Text style={styles.severityTagText}>P: {scan.pigmentation.severity}</Text>
                    </View>
                  )}
                  {scan.wrinkles && (
                    <View style={[styles.severityTag, { backgroundColor: getSeverityColor(scan.wrinkles.severity) }]}>
                      <Text style={styles.severityTagText}>W: {scan.wrinkles.severity}</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Actions */}
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={(e) => {
                  e.stopPropagation();
                  deleteScan(index);
                }}
              >
                <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
    justifyContent: 'center',
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
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#7F8C8D',
    textAlign: 'center',
    marginBottom: 24,
  },
  startButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 16,
  },
  scanCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  thumbnailPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
  },
  scanHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scanType: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  scanDate: {
    fontSize: 12,
    color: '#95A5A6',
  },
  severityTags: {
    flexDirection: 'row',
    gap: 6,
  },
  severityTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  severityTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  deleteButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});