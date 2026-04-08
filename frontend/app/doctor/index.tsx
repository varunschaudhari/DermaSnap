import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl, Alert, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { authService } from '../../services/auth';
import { BACKEND_URL } from '../../config/api';

type Patient = {
  id: string;
  full_name?: string;
  email?: string;
};

export default function DoctorHomeScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const title = useMemo(() => {
    const name = user?.full_name?.trim() || 'Doctor';
    return `Welcome, ${name}`;
  }, [user?.full_name]);

  const fetchPatients = useCallback(async () => {
    const res = await authService.authenticatedFetch(`${BACKEND_URL}/api/relationships/patients`, {
      method: 'GET',
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Failed to load patients (${res.status}): ${txt}`);
    }
    const data = (await res.json()) as Patient[];
    setPatients(Array.isArray(data) ? data : []);
  }, []);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      await fetchPatients();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to load patients');
    } finally {
      setLoading(false);
    }
  }, [fetchPatients]);

  useEffect(() => {
    if (!user) {
      router.replace('/auth/login');
      return;
    }
    if (user.role !== 'doctor') {
      // Safety: redirect other roles away.
      router.replace('/');
      return;
    }
    load();
  }, [user, load]);

  const onRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      await fetchPatients();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to refresh');
    } finally {
      setRefreshing(false);
    }
  }, [fetchPatients]);

  const renderItem = ({ item }: { item: Patient }) => (
    <View style={styles.card}>
      <View style={styles.avatar}>
        <Ionicons name="person" size={22} color="#00B894" />
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle}>{item.full_name || 'Patient'}</Text>
        <Text style={styles.cardSubtitle}>{item.email || item.id}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <LinearGradient colors={['#00B894', '#00CEC9']} style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Doctor Dashboard</Text>
          <TouchableOpacity
            style={styles.headerIcon}
            onPress={() =>
              Alert.alert('Logout', 'Do you want to logout?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Logout', style: 'destructive', onPress: () => logout() },
              ])
            }
          >
            <Ionicons name="log-out-outline" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        <Text style={styles.headerSubtitle}>{title}</Text>
        <Text style={styles.headerMeta}>Patients</Text>
      </LinearGradient>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#00B894" />
        </View>
      ) : (
        <FlatList
          data={patients}
          keyExtractor={(p) => p.id}
          contentContainerStyle={styles.listContent}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={40} color="#95A5A6" />
              <Text style={styles.emptyTitle}>No patients yet</Text>
              <Text style={styles.emptyText}>Patients will appear here after they’re assigned to you.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7FFFE' },
  header: {
    paddingTop: 56,
    paddingBottom: 22,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '800' },
  headerIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  headerSubtitle: { color: '#FFFFFF', opacity: 0.95, marginTop: 10, fontWeight: '700' },
  headerMeta: { color: '#FFFFFF', opacity: 0.85, marginTop: 10, fontWeight: '600' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { padding: 18, paddingBottom: 30 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#00B894',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E8F8F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: { flex: 1, marginLeft: 12 },
  cardTitle: { color: '#2D3436', fontSize: 16, fontWeight: '800' },
  cardSubtitle: { color: '#636E72', marginTop: 4, fontWeight: '600' },
  empty: { alignItems: 'center', padding: 30 },
  emptyTitle: { marginTop: 10, color: '#2D3436', fontSize: 16, fontWeight: '800' },
  emptyText: { marginTop: 6, color: '#636E72', textAlign: 'center', fontWeight: '500' },
});

