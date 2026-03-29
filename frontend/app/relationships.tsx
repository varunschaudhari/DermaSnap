/**
 * Doctor-Patient relationship management screen
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  StatusBar,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/auth';
import { BACKEND_URL } from '../config/api';

export default function RelationshipsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (user?.role === 'patient') {
      loadDoctors();
    }
  }, [user]);

  const loadDoctors = async () => {
    try {
      const response = await authService.authenticatedFetch(
        `${BACKEND_URL}/api/relationships/doctors`
      );
      if (response.ok) {
        const data = await response.json();
        setDoctors(data);
      }
    } catch (error) {
      console.error('Error loading doctors:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateInviteCode = async () => {
    if (user?.role !== 'doctor') {
      Alert.alert('Error', 'Only doctors can generate invite codes');
      return;
    }

    try {
      const response = await authService.authenticatedFetch(
        `${BACKEND_URL}/api/relationships/invite`,
        {
          method: 'POST',
        }
      );
      if (response.ok) {
        const data = await response.json();
        setInviteCode(data.invite_code);
        setShowInviteModal(true);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to generate invite code');
    }
  };

  const joinWithInviteCode = async () => {
    if (!inviteCode.trim()) {
      Alert.alert('Error', 'Please enter an invite code');
      return;
    }

    try {
      const response = await authService.authenticatedFetch(
        `${BACKEND_URL}/api/relationships/join`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ invite_code: inviteCode }),
        }
      );
      if (response.ok) {
        Alert.alert('Success', 'Successfully joined doctor!');
        setShowJoinModal(false);
        setInviteCode('');
        loadDoctors();
      } else {
        const error = await response.json();
        Alert.alert('Error', error.detail || 'Failed to join doctor');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to join doctor');
    }
  };

  const searchDoctors = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const response = await authService.authenticatedFetch(
        `${BACKEND_URL}/api/relationships/doctors/search?query=${encodeURIComponent(searchQuery)}`
      );
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data);
      }
    } catch (error) {
      console.error('Error searching doctors:', error);
    } finally {
      setSearching(false);
    }
  };

  const requestConnection = async (doctorId: string) => {
    try {
      const response = await authService.authenticatedFetch(
        `${BACKEND_URL}/api/relationships/request`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ doctor_id: doctorId }),
        }
      );
      if (response.ok) {
        Alert.alert('Success', 'Connection request sent!');
        setSearchQuery('');
        setSearchResults([]);
      } else {
        const error = await response.json();
        Alert.alert('Error', error.detail || 'Failed to send request');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send request');
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#00B894" />
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
        <Text style={styles.headerTitle}>
          {user?.role === 'doctor' ? 'Patient Connections' : 'My Doctors'}
        </Text>
        <View style={styles.backButton} />
      </LinearGradient>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {user?.role === 'doctor' && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={generateInviteCode}
          >
            <Ionicons name="link" size={20} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Generate Invite Code</Text>
          </TouchableOpacity>
        )}

        {user?.role === 'patient' && (
          <>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setShowJoinModal(true)}
            >
              <Ionicons name="key" size={20} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Join with Invite Code</Text>
            </TouchableOpacity>

            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="#636E72" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search for doctors..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={searchDoctors}
                returnKeyType="search"
              />
              {searching && <ActivityIndicator size="small" color="#00B894" />}
            </View>

            {searchResults.length > 0 && (
              <View style={styles.searchResults}>
                <Text style={styles.sectionTitle}>Search Results</Text>
                {searchResults.map((doctor) => (
                  <TouchableOpacity
                    key={doctor.id}
                    style={styles.doctorCard}
                    onPress={() => requestConnection(doctor.id)}
                  >
                    <View style={styles.doctorInfo}>
                      <Text style={styles.doctorName}>{doctor.full_name}</Text>
                      <Text style={styles.doctorEmail}>{doctor.email}</Text>
                    </View>
                    <Ionicons name="add-circle" size={24} color="#00B894" />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {user?.role === 'doctor' ? 'Connected Patients' : 'Connected Doctors'}
          </Text>
          {doctors.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={64} color="#E0E0E0" />
              <Text style={styles.emptyText}>
                {user?.role === 'doctor'
                  ? 'No patients connected yet'
                  : 'No doctors connected yet'}
              </Text>
            </View>
          ) : (
            doctors.map((doctor) => (
              <View key={doctor.id} style={styles.doctorCard}>
                <View style={styles.doctorInfo}>
                  <Text style={styles.doctorName}>{doctor.full_name}</Text>
                  <Text style={styles.doctorEmail}>{doctor.email}</Text>
                </View>
                <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Invite Code Modal */}
      <Modal
        visible={showInviteModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowInviteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Invite Code</Text>
            <Text style={styles.inviteCode}>{inviteCode}</Text>
            <Text style={styles.modalText}>
              Share this code with your patients to allow them to connect with you.
            </Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setShowInviteModal(false)}
            >
              <Text style={styles.modalButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Join Modal */}
      <Modal
        visible={showJoinModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowJoinModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Join with Invite Code</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter invite code"
              value={inviteCode}
              onChangeText={setInviteCode}
              autoCapitalize="characters"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={() => {
                  setShowJoinModal(false);
                  setInviteCode('');
                }}
              >
                <Text style={styles.modalButtonTextSecondary}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={joinWithInviteCode}
              >
                <Text style={styles.modalButtonText}>Join</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#00B894',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 20,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#2D3436',
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D3436',
    marginBottom: 16,
  },
  searchResults: {
    marginBottom: 20,
  },
  doctorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  doctorInfo: {
    flex: 1,
  },
  doctorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3436',
    marginBottom: 4,
  },
  doctorEmail: {
    fontSize: 14,
    color: '#636E72',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#636E72',
    marginTop: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2D3436',
    marginBottom: 16,
    textAlign: 'center',
  },
  inviteCode: {
    fontSize: 32,
    fontWeight: '700',
    color: '#00B894',
    textAlign: 'center',
    letterSpacing: 4,
    marginBottom: 16,
    fontFamily: 'monospace',
  },
  modalText: {
    fontSize: 14,
    color: '#636E72',
    textAlign: 'center',
    marginBottom: 24,
  },
  modalInput: {
    backgroundColor: '#F7FFFE',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 24,
    textAlign: 'center',
    letterSpacing: 2,
    fontFamily: 'monospace',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    backgroundColor: '#00B894',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  modalButtonSecondary: {
    backgroundColor: '#E8F8F5',
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonTextSecondary: {
    color: '#00B894',
    fontSize: 16,
    fontWeight: '600',
  },
});
