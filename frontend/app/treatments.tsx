import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Alert, StatusBar, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format } from 'date-fns';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

interface Treatment {
  id: string;
  productName: string;
  frequency: string;
  startDate: string;
  endDate?: string;
  notes: string;
  reminderEnabled: boolean;
  reminderTime?: string;
}

// Check if notifications are available (not in Expo Go)
const isExpoGo = Constants.appOwnership === 'expo';
let notificationsAvailable = !isExpoGo;

// Configure notifications only if available (not in Expo Go)
if (notificationsAvailable) {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  } catch (error) {
    console.warn('Failed to configure notifications:', error);
    notificationsAvailable = false;
  }
} else {
  console.log('Notifications not available in Expo Go - treatment reminders will be disabled');
}

export default function TreatmentsScreen() {
  const router = useRouter();
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeProfile, setActiveProfile] = useState<any>(null);
  
  // Form fields
  const [productName, setProductName] = useState('');
  const [frequency, setFrequency] = useState('Once Daily');
  const [notes, setNotes] = useState('');
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState('09:00');

  useEffect(() => {
    loadData();
    requestNotificationPermissions();
  }, []);

  const requestNotificationPermissions = async () => {
    if (!notificationsAvailable) {
      // Notifications not available in Expo Go
      return;
    }
    
    if (Platform.OS === 'android' || Platform.OS === 'ios') {
      try {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Enable notifications to receive treatment reminders.');
        }
      } catch (error) {
        console.warn('Failed to request notification permissions:', error);
      }
    }
  };

  const loadData = async () => {
    try {
      const profileData = await AsyncStorage.getItem('active_profile');
      if (profileData) {
        const profile = JSON.parse(profileData);
        setActiveProfile(profile);
        
        const treatmentsData = await AsyncStorage.getItem(`treatments_${profile.id}`);
        if (treatmentsData) {
          setTreatments(JSON.parse(treatmentsData));
        }
      }
    } catch (error) {
      console.error('Error loading treatments:', error);
    } finally {
      setLoading(false);
    }
  };

  const scheduleNotification = async (treatment: Treatment) => {
    if (!notificationsAvailable) {
      console.log('Notifications not available - reminder not scheduled');
      return;
    }
    
    if (!treatment.reminderEnabled || !treatment.reminderTime) return;

    try {
      const [hours, minutes] = treatment.reminderTime.split(':');
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Treatment Reminder',
          body: `Time to apply ${treatment.productName}`,
          data: { treatmentId: treatment.id },
        },
        trigger: {
          hour: parseInt(hours),
          minute: parseInt(minutes),
          repeats: true,
        },
      });
      
      console.log('Notification scheduled for', treatment.productName);
    } catch (error) {
      console.error('Error scheduling notification:', error);
    }
  };

  const addTreatment = async () => {
    if (!productName.trim()) {
      Alert.alert('Error', 'Please enter a product name');
      return;
    }

    if (!activeProfile) return;

    const newTreatment: Treatment = {
      id: Date.now().toString(),
      productName: productName.trim(),
      frequency,
      startDate: new Date().toISOString(),
      notes: notes.trim(),
      reminderEnabled,
      reminderTime: reminderEnabled ? reminderTime : undefined,
    };

    const updatedTreatments = [newTreatment, ...treatments];
    await AsyncStorage.setItem(`treatments_${activeProfile.id}`, JSON.stringify(updatedTreatments));
    setTreatments(updatedTreatments);

    // Schedule notification if enabled
    if (reminderEnabled) {
      if (notificationsAvailable) {
        await scheduleNotification(newTreatment);
        Alert.alert('Success', 'Treatment added and reminder scheduled!');
      } else {
        Alert.alert('Success', 'Treatment added! (Reminders not available in Expo Go)');
      }
    } else {
      Alert.alert('Success', 'Treatment added successfully!');
    }

    // Reset form
    setProductName('');
    setFrequency('Once Daily');
    setNotes('');
    setReminderEnabled(false);
    setReminderTime('09:00');
    setShowAddModal(false);
  };

  const deleteTreatment = async (treatmentId: string) => {
    Alert.alert(
      'Delete Treatment',
      'Are you sure you want to delete this treatment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!activeProfile) return;
            
            const updatedTreatments = treatments.filter(t => t.id !== treatmentId);
            await AsyncStorage.setItem(`treatments_${activeProfile.id}`, JSON.stringify(updatedTreatments));
            setTreatments(updatedTreatments);
            
            // Cancel notification
            if (notificationsAvailable) {
              try {
                const notifications = await Notifications.getAllScheduledNotificationsAsync();
                for (const notification of notifications) {
                  if (notification.content.data?.treatmentId === treatmentId) {
                    await Notifications.cancelScheduledNotificationAsync(notification.identifier);
                  }
                }
              } catch (error) {
                console.warn('Failed to cancel notification:', error);
              }
            }
          },
        },
      ]
    );
  };

  const endTreatment = async (treatmentId: string) => {
    if (!activeProfile) return;
    
    const updatedTreatments = treatments.map(t => 
      t.id === treatmentId ? { ...t, endDate: new Date().toISOString() } : t
    );
    await AsyncStorage.setItem(`treatments_${activeProfile.id}`, JSON.stringify(updatedTreatments));
    setTreatments(updatedTreatments);
    Alert.alert('Success', 'Treatment marked as ended');
  };

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
        <Text style={styles.headerTitle}>Treatments</Text>
        <TouchableOpacity style={styles.addHeaderButton} onPress={() => setShowAddModal(true)}>
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </LinearGradient>

      {/* Add Treatment Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Treatment</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Product Name (required)"
              placeholderTextColor="#95A5A6"
              value={productName}
              onChangeText={setProductName}
            />

            <Text style={styles.label}>Frequency</Text>
            <View style={styles.frequencyButtons}>
              {['Once Daily', 'Twice Daily', 'As Needed'].map((freq) => (
                <TouchableOpacity
                  key={freq}
                  style={[
                    styles.frequencyButton,
                    frequency === freq && styles.frequencyButtonActive,
                  ]}
                  onPress={() => setFrequency(freq)}
                >
                  <Text
                    style={[
                      styles.frequencyButtonText,
                      frequency === freq && styles.frequencyButtonTextActive,
                    ]}
                  >
                    {freq}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Notes (optional)"
              placeholderTextColor="#95A5A6"
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
            />

            <View style={styles.reminderSection}>
              <View style={styles.reminderHeader}>
                <Ionicons name="notifications" size={20} color="#00B894" />
                <Text style={styles.reminderLabel}>Daily Reminder</Text>
                <TouchableOpacity
                  style={[
                    styles.toggle,
                    reminderEnabled && styles.toggleActive,
                  ]}
                  onPress={() => setReminderEnabled(!reminderEnabled)}
                >
                  <View style={[
                    styles.toggleCircle,
                    reminderEnabled && styles.toggleCircleActive,
                  ]} />
                </TouchableOpacity>
              </View>
              
              {reminderEnabled && (
                <TextInput
                  style={styles.timeInput}
                  placeholder="Time (HH:MM)"
                  placeholderTextColor="#95A5A6"
                  value={reminderTime}
                  onChangeText={setReminderTime}
                />
              )}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={addTreatment}>
                <Text style={styles.saveButtonText}>Add Treatment</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Treatments List */}
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {treatments.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="medkit-outline" size={80} color="#E0E0E0" />
            <Text style={styles.emptyTitle}>No Treatments Yet</Text>
            <Text style={styles.emptyText}>Add your first treatment to start tracking</Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => setShowAddModal(true)}
            >
              <Ionicons name="add-circle" size={24} color="#FFFFFF" />
              <Text style={styles.emptyButtonText}>Add Treatment</Text>
            </TouchableOpacity>
          </View>
        ) : (
          treatments.map((treatment) => (
            <View
              key={treatment.id}
              style={[
                styles.treatmentCard,
                treatment.endDate && styles.treatmentCardEnded,
              ]}
            >
              <View style={styles.treatmentHeader}>
                <View style={styles.treatmentTitleRow}>
                  <Ionicons name="medical" size={20} color="#00B894" />
                  <Text style={styles.treatmentName}>{treatment.productName}</Text>
                </View>
                {treatment.reminderEnabled && (
                  <Ionicons name="notifications" size={18} color="#00CEC9" />
                )}
              </View>

              <View style={styles.treatmentDetails}>
                <View style={styles.detailRow}>
                  <Ionicons name="calendar" size={16} color="#636E72" />
                  <Text style={styles.detailText}>
                    Started: {format(new Date(treatment.startDate), 'MMM dd, yyyy')}
                  </Text>
                </View>
                {treatment.endDate && (
                  <View style={styles.detailRow}>
                    <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                    <Text style={styles.detailText}>
                      Ended: {format(new Date(treatment.endDate), 'MMM dd, yyyy')}
                    </Text>
                  </View>
                )}
                <View style={styles.detailRow}>
                  <Ionicons name="repeat" size={16} color="#636E72" />
                  <Text style={styles.detailText}>{treatment.frequency}</Text>
                </View>
              </View>

              {treatment.notes && (
                <Text style={styles.treatmentNotes}>{treatment.notes}</Text>
              )}

              {!treatment.endDate && (
                <View style={styles.treatmentActions}>
                  <TouchableOpacity
                    style={styles.endButton}
                    onPress={() => endTreatment(treatment.id)}
                  >
                    <Ionicons name="checkmark" size={16} color="#4CAF50" />
                    <Text style={styles.endButtonText}>Mark as Ended</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => deleteTreatment(treatment.id)}
                  >
                    <Ionicons name="trash" size={16} color="#FF6B6B" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))
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
  addHeaderButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 22,
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
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#00B894',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  treatmentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#00B894',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  treatmentCardEnded: {
    opacity: 0.6,
  },
  treatmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  treatmentTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  treatmentName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D3436',
  },
  treatmentDetails: {
    gap: 8,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#636E72',
  },
  treatmentNotes: {
    fontSize: 14,
    color: '#2D3436',
    lineHeight: 20,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  treatmentActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  endButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#E8F5E9',
    paddingVertical: 10,
    borderRadius: 8,
  },
  endButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
  },
  deleteButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2D3436',
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D3436',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F7FFFE',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#2D3436',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E8F8F5',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  frequencyButtons: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  frequencyButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F7FFFE',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8F8F5',
  },
  frequencyButtonActive: {
    backgroundColor: '#00B894',
    borderColor: '#00B894',
  },
  frequencyButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#636E72',
  },
  frequencyButtonTextActive: {
    color: '#FFFFFF',
  },
  reminderSection: {
    backgroundColor: '#F7FFFE',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  reminderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reminderLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#2D3436',
  },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    padding: 2,
  },
  toggleActive: {
    backgroundColor: '#00B894',
  },
  toggleCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  toggleCircleActive: {
    alignSelf: 'flex-end',
  },
  timeInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#2D3436',
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E8F8F5',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F7FFFE',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8F8F5',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#636E72',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#00B894',
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});