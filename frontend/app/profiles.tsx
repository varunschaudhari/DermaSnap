import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Profile {
  id: string;
  name: string;
  age?: number;
  gender?: string;
  createdAt: string;
}

export default function ProfileSelectionScreen() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfileAge, setNewProfileAge] = useState('');
  const [newProfileGender, setNewProfileGender] = useState<string>('');

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    try {
      const storedProfiles = await AsyncStorage.getItem('user_profiles');
      if (storedProfiles) {
        setProfiles(JSON.parse(storedProfiles));
      }
    } catch (error) {
      console.error('Error loading profiles:', error);
    }
  };

  const createProfile = async () => {
    if (!newProfileName.trim()) {
      Alert.alert('Error', 'Please enter a name');
      return;
    }

    const newProfile: Profile = {
      id: Date.now().toString(),
      name: newProfileName.trim(),
      age: newProfileAge ? parseInt(newProfileAge) : undefined,
      gender: newProfileGender || undefined,
      createdAt: new Date().toISOString(),
    };

    const updatedProfiles = [...profiles, newProfile];
    await AsyncStorage.setItem('user_profiles', JSON.stringify(updatedProfiles));
    setProfiles(updatedProfiles);
    
    // Reset form
    setNewProfileName('');
    setNewProfileAge('');
    setNewProfileGender('');
    setShowCreateForm(false);
  };

  const selectProfile = async (profile: Profile) => {
    await AsyncStorage.setItem('active_profile', JSON.stringify(profile));
    router.replace('/');
  };

  const deleteProfile = (profileId: string) => {
    Alert.alert(
      'Delete Profile',
      'Are you sure? All scan history for this profile will be deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updatedProfiles = profiles.filter(p => p.id !== profileId);
            await AsyncStorage.setItem('user_profiles', JSON.stringify(updatedProfiles));
            setProfiles(updatedProfiles);
            
            // Also delete scan history for this profile
            await AsyncStorage.removeItem(`skin_scans_${profileId}`);
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <LinearGradient
        colors={['#00B894', '#00CEC9']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Ionicons name="people" size={48} color="#FFFFFF" />
          <Text style={styles.headerTitle}>DermaSnap</Text>
          <Text style={styles.headerSubtitle}>Select or Create Profile</Text>
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Cards */}
        {profiles.map((profile) => (
          <TouchableOpacity
            key={profile.id}
            style={styles.profileCard}
            onPress={() => selectProfile(profile)}
            activeOpacity={0.8}
          >
            <View style={styles.profileAvatar}>
              <Ionicons name="person" size={32} color="#00B894" />
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{profile.name}</Text>
              <Text style={styles.profileDetails}>
                {profile.age && `${profile.age} years`}
                {profile.age && profile.gender && ' • '}
                {profile.gender}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => deleteProfile(profile.id)}
            >
              <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
            </TouchableOpacity>
          </TouchableOpacity>
        ))}

        {/* Create New Profile */}
        {!showCreateForm ? (
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => setShowCreateForm(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="add-circle" size={24} color="#00B894" />
            <Text style={styles.createButtonText}>Create New Profile</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.createForm}>
            <Text style={styles.formTitle}>New Profile</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Name (required)"
              placeholderTextColor="#95A5A6"
              value={newProfileName}
              onChangeText={setNewProfileName}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Age (optional)"
              placeholderTextColor="#95A5A6"
              value={newProfileAge}
              onChangeText={setNewProfileAge}
              keyboardType="number-pad"
            />

            <View style={styles.genderButtons}>
              <TouchableOpacity
                style={[
                  styles.genderButton,
                  newProfileGender === 'Male' && styles.genderButtonActive,
                ]}
                onPress={() => setNewProfileGender('Male')}
              >
                <Text
                  style={[
                    styles.genderButtonText,
                    newProfileGender === 'Male' && styles.genderButtonTextActive,
                  ]}
                >
                  Male
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.genderButton,
                  newProfileGender === 'Female' && styles.genderButtonActive,
                ]}
                onPress={() => setNewProfileGender('Female')}
              >
                <Text
                  style={[
                    styles.genderButtonText,
                    newProfileGender === 'Female' && styles.genderButtonTextActive,
                  ]}
                >
                  Female
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.genderButton,
                  newProfileGender === 'Other' && styles.genderButtonActive,
                ]}
                onPress={() => setNewProfileGender('Other')}
              >
                <Text
                  style={[
                    styles.genderButtonText,
                    newProfileGender === 'Other' && styles.genderButtonTextActive,
                  ]}
                >
                  Other
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.formButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowCreateForm(false);
                  setNewProfileName('');
                  setNewProfileAge('');
                  setNewProfileGender('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={createProfile}
              >
                <Text style={styles.saveButtonText}>Create Profile</Text>
              </TouchableOpacity>
            </View>
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
    paddingTop: 60,
    paddingBottom: 32,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerContent: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 12,
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#FFFFFF',
    opacity: 0.95,
    marginTop: 6,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#00B894',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  profileAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E8F8F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: {
    flex: 1,
    marginLeft: 16,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D3436',
    marginBottom: 4,
  },
  profileDetails: {
    fontSize: 14,
    color: '#636E72',
    fontWeight: '500',
  },
  deleteButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginTop: 8,
    borderWidth: 2,
    borderColor: '#00B894',
    borderStyle: 'dashed',
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#00B894',
  },
  createForm: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    marginTop: 8,
    elevation: 2,
    shadowColor: '#00B894',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2D3436',
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#F7FFFE',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#2D3436',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E8F8F5',
  },
  genderButtons: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  genderButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F7FFFE',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8F8F5',
  },
  genderButtonActive: {
    backgroundColor: '#00B894',
    borderColor: '#00B894',
  },
  genderButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#636E72',
  },
  genderButtonTextActive: {
    color: '#FFFFFF',
  },
  formButtons: {
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