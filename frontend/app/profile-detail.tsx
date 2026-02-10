import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, StatusBar, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format } from 'date-fns';
import { LineChart } from 'react-native-gifted-charts';

const { width } = Dimensions.get('window');

interface Profile {
  id: string;
  name: string;
  age?: number;
  gender?: string;
}

interface Scan {
  timestamp: string;
  analysisType: string;
  acne?: any;
  pigmentation?: any;
  wrinkles?: any;
}

interface Treatment {
  id: string;
  productName: string;
  startDate: string;
  notes: string;
}

export default function ProfileDetailScreen() {
  const router = useRouter();
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null);
  const [scans, setScans] = useState<Scan[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'history' | 'treatments' | 'progress'>('overview');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    try {
      const profileData = await AsyncStorage.getItem('active_profile');
      if (profileData) {
        const profile = JSON.parse(profileData);
        setActiveProfile(profile);
        
        // Load profile-specific scans
        const scansData = await AsyncStorage.getItem(`skin_scans_${profile.id}`);
        if (scansData) {
          setScans(JSON.parse(scansData));
        }
        
        // Load treatments
        const treatmentsData = await AsyncStorage.getItem(`treatments_${profile.id}`);
        if (treatmentsData) {
          setTreatments(JSON.parse(treatmentsData));
        }
      }
    } catch (error) {
      console.error('Error loading profile data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Mild': return '#4CAF50';
      case 'Moderate': return '#FFA726';
      case 'Severe': return '#FF6B6B';
      default: return '#95A5A6';
    }
  };

  const getChartData = () => {
    if (scans.length === 0) return [];
    
    return scans.slice(0, 10).reverse().map((scan, index) => ({
      value: scan.acne?.metrics?.totalCount || 0,
      label: format(new Date(scan.timestamp), 'MM/dd'),
      dataPointText: String(scan.acne?.metrics?.totalCount || 0),
    }));
  };

  const renderOverview = () => (
    <View style={styles.tabContent}>
      {/* Stats Cards */}
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { backgroundColor: '#E8F8F5' }]}>
          <Ionicons name="scan" size={24} color="#00B894" />
          <Text style={styles.statValue}>{scans.length}</Text>
          <Text style={styles.statLabel}>Total Scans</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#FFF4E5' }]}>
          <Ionicons name="medkit" size={24} color="#FFA726" />
          <Text style={styles.statValue}>{treatments.length}</Text>
          <Text style={styles.statLabel}>Treatments</Text>
        </View>
      </View>

      {/* Latest Scan */}
      {scans.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Latest Scan</Text>
          <View style={styles.latestScanCard}>
            <Text style={styles.scanDate}>
              {format(new Date(scans[0].timestamp), 'MMMM dd, yyyy')}
            </Text>
            {scans[0].acne && (
              <View style={styles.severityRow}>
                <Text style={styles.label}>Acne:</Text>
                <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(scans[0].acne.severity) }]}>
                  <Text style={styles.severityBadgeText}>{scans[0].acne.severity}</Text>
                </View>
              </View>
            )}
            {scans[0].pigmentation && (
              <View style={styles.severityRow}>
                <Text style={styles.label}>Pigmentation:</Text>
                <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(scans[0].pigmentation.severity) }]}>
                  <Text style={styles.severityBadgeText}>{scans[0].pigmentation.severity}</Text>
                </View>
              </View>
            )}
            {scans[0].wrinkles && (
              <View style={styles.severityRow}>
                <Text style={styles.label}>Wrinkles:</Text>
                <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(scans[0].wrinkles.severity) }]}>
                  <Text style={styles.severityBadgeText}>{scans[0].wrinkles.severity}</Text>
                </View>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push('/camera?type=acne')}
        >
          <Ionicons name="camera" size={20} color="#00B894" />
          <Text style={styles.actionButtonText}>New Scan</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => setSelectedTab('treatments')}
        >
          <Ionicons name="add-circle" size={20} color="#00CEC9" />
          <Text style={styles.actionButtonText}>Add Treatment</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderHistory = () => (
    <View style={styles.tabContent}>
      {scans.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="document-text-outline" size={64} color="#E0E0E0" />
          <Text style={styles.emptyTitle}>No Scans Yet</Text>
          <Text style={styles.emptyText}>Start by taking your first scan</Text>
        </View>
      ) : (
        scans.map((scan, index) => (
          <View key={index} style={styles.historyCard}>
            <View style={styles.historyHeader}>
              <Text style={styles.historyDate}>
                {format(new Date(scan.timestamp), 'MMM dd, yyyy')}
              </Text>
              <Text style={styles.historyType}>{scan.analysisType}</Text>
            </View>
            <View style={styles.historyMetrics}>
              {scan.acne && (
                <View style={styles.metricChip}>
                  <Text style={styles.metricChipText}>A: {scan.acne.severity}</Text>
                </View>
              )}
              {scan.pigmentation && (
                <View style={styles.metricChip}>
                  <Text style={styles.metricChipText}>P: {scan.pigmentation.severity}</Text>
                </View>
              )}
              {scan.wrinkles && (
                <View style={styles.metricChip}>
                  <Text style={styles.metricChipText}>W: {scan.wrinkles.severity}</Text>
                </View>
              )}
            </View>
          </View>
        ))
      )}
    </View>
  );

  const renderTreatments = () => (
    <View style={styles.tabContent}>
      {treatments.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="medkit-outline" size={64} color="#E0E0E0" />
          <Text style={styles.emptyTitle}>No Treatments</Text>
          <Text style={styles.emptyText}>Add your first treatment to track progress</Text>
        </View>
      ) : (
        treatments.map((treatment) => (
          <View key={treatment.id} style={styles.treatmentCard}>
            <View style={styles.treatmentHeader}>
              <Ionicons name="medical" size={20} color="#00B894" />
              <Text style={styles.treatmentName}>{treatment.productName}</Text>
            </View>
            <Text style={styles.treatmentDate}>
              Started: {format(new Date(treatment.startDate), 'MMM dd, yyyy')}
            </Text>
            {treatment.notes && (
              <Text style={styles.treatmentNotes}>{treatment.notes}</Text>
            )}
          </View>
        ))
      )}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => router.push('/treatments')}
      >
        <Ionicons name="add-circle" size={24} color="#FFFFFF" />
        <Text style={styles.addButtonText}>Add Treatment</Text>
      </TouchableOpacity>
    </View>
  );

  const renderProgress = () => (
    <View style={styles.tabContent}>
      {scans.length < 2 ? (
        <View style={styles.emptyState}>
          <Ionicons name="analytics-outline" size={64} color="#E0E0E0" />
          <Text style={styles.emptyTitle}>Not Enough Data</Text>
          <Text style={styles.emptyText}>Take at least 2 scans to see progress</Text>
        </View>
      ) : (
        <View>
          <Text style={styles.sectionTitle}>Acne Progress</Text>
          <View style={styles.chartContainer}>
            <LineChart
              data={getChartData()}
              width={width - 64}
              height={220}
              color="#00B894"
              thickness={3}
              dataPointsColor="#00B894"
              dataPointsRadius={6}
              textColor="#636E72"
              textFontSize={12}
              showVerticalLines
              verticalLinesColor="#E8F8F5"
              xAxisColor="#E8F8F5"
              yAxisColor="#E8F8F5"
              yAxisTextStyle={{ color: '#636E72' }}
              hideRules
            />
          </View>
          <Text style={styles.chartLabel}>Total Lesion Count Over Time</Text>
        </View>
      )}
    </View>
  );

  const renderContent = () => {
    switch (selectedTab) {
      case 'overview': return renderOverview();
      case 'history': return renderHistory();
      case 'treatments': return renderTreatments();
      case 'progress': return renderProgress();
      default: return renderOverview();
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#00B894" />
      </View>
    );
  }

  if (!activeProfile) {
    return null;
  }

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
        <View style={styles.headerContent}>
          <View style={styles.profileAvatar}>
            <Ionicons name="person" size={32} color="#FFFFFF" />
          </View>
          <Text style={styles.profileName}>{activeProfile.name}</Text>
          {activeProfile.age && (
            <Text style={styles.profileInfo}>
              {activeProfile.age} years {activeProfile.gender && `• ${activeProfile.gender}`}
            </Text>
          )}
        </View>
      </LinearGradient>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'overview' && styles.tabActive]}
          onPress={() => setSelectedTab('overview')}
        >
          <Ionicons name="home" size={20} color={selectedTab === 'overview' ? '#00B894' : '#636E72'} />
          <Text style={[styles.tabText, selectedTab === 'overview' && styles.tabTextActive]}>Overview</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'history' && styles.tabActive]}
          onPress={() => setSelectedTab('history')}
        >
          <Ionicons name="time" size={20} color={selectedTab === 'history' ? '#00B894' : '#636E72'} />
          <Text style={[styles.tabText, selectedTab === 'history' && styles.tabTextActive]}>History</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'treatments' && styles.tabActive]}
          onPress={() => setSelectedTab('treatments')}
        >
          <Ionicons name="medkit" size={20} color={selectedTab === 'treatments' ? '#00B894' : '#636E72'} />
          <Text style={[styles.tabText, selectedTab === 'treatments' && styles.tabTextActive]}>Treatments</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'progress' && styles.tabActive]}
          onPress={() => setSelectedTab('progress')}
        >
          <Ionicons name="analytics" size={20} color={selectedTab === 'progress' ? '#00B894' : '#636E72'} />
          <Text style={[styles.tabText, selectedTab === 'progress' && styles.tabTextActive]}>Progress</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {renderContent()}
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
    paddingTop: 50,
    paddingBottom: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 22,
  },
  headerContent: {
    alignItems: 'center',
    marginTop: 20,
  },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  profileName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  profileInfo: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  tab: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 12,
    gap: 4,
  },
  tabActive: {
    backgroundColor: '#E8F8F5',
  },
  tabText: {
    fontSize: 11,
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
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#2D3436',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#636E72',
    marginTop: 4,
    fontWeight: '500',
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D3436',
  },
  latestScanCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    gap: 12,
  },
  scanDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3436',
  },
  severityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 14,
    color: '#636E72',
  },
  severityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  severityBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3436',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2D3436',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#636E72',
    marginTop: 8,
  },
  historyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  historyDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D3436',
  },
  historyType: {
    fontSize: 12,
    color: '#636E72',
    textTransform: 'capitalize',
  },
  historyMetrics: {
    flexDirection: 'row',
    gap: 8,
  },
  metricChip: {
    backgroundColor: '#E8F8F5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  metricChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#00B894',
  },
  treatmentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  treatmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  treatmentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3436',
  },
  treatmentDate: {
    fontSize: 12,
    color: '#636E72',
    marginBottom: 8,
  },
  treatmentNotes: {
    fontSize: 14,
    color: '#2D3436',
    lineHeight: 20,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#00B894',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  chartContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
  },
  chartLabel: {
    fontSize: 12,
    color: '#636E72',
    textAlign: 'center',
    marginTop: 12,
  },
});