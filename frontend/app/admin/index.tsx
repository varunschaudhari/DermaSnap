import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  RefreshControl,
  StatusBar,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { authService } from '../../services/auth';
import { BACKEND_URL } from '../../config/api';
import { Picker } from '@react-native-picker/picker';

type AdminUser = {
  id: string;
  email?: string;
  full_name?: string;
  role?: string;
  is_active?: boolean;
  created_at?: string;
};

export default function AdminHomeScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newRole, setNewRole] = useState<'doctor' | 'admin'>('doctor');
  const [newPassword, setNewPassword] = useState('');
  const [creating, setCreating] = useState(false);

  const title = useMemo(() => {
    const name = user?.full_name?.trim() || 'Admin';
    return `Welcome, ${name}`;
  }, [user?.full_name]);

  const fetchUsers = useCallback(async () => {
    const res = await authService.authenticatedFetch(`${BACKEND_URL}/api/admin/users?limit=100&skip=0`, {
      method: 'GET',
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Failed to load users (${res.status}): ${txt}`);
    }
    const data = (await res.json()) as AdminUser[];
    setUsers(Array.isArray(data) ? data : []);
  }, []);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      await fetchUsers();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [fetchUsers]);

  useEffect(() => {
    if (!user) {
      router.replace('/auth/login');
      return;
    }
    if (user.role !== 'admin') {
      router.replace('/');
      return;
    }
    load();
  }, [user, load]);

  const onRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      await fetchUsers();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to refresh');
    } finally {
      setRefreshing(false);
    }
  }, [fetchUsers]);

  const toggleActive = async (u: AdminUser) => {
    try {
      const next = !(u.is_active ?? true);
      const res = await authService.authenticatedFetch(
        `${BACKEND_URL}/api/admin/users/${u.id}?is_active=${encodeURIComponent(String(next))}`,
        { method: 'PUT' }
      );
      if (!res.ok) throw new Error(await res.text());
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, is_active: next } : x)));
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to update user');
    }
  };

  const softDelete = async (u: AdminUser) => {
    Alert.alert('Delete user', `Delete ${u.email || u.full_name || 'this user'}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const res = await authService.authenticatedFetch(`${BACKEND_URL}/api/admin/users/${u.id}`, {
              method: 'DELETE',
            });
            if (!res.ok) throw new Error(await res.text());
            setUsers((prev) => prev.filter((x) => x.id !== u.id));
          } catch (e: any) {
            Alert.alert('Error', e?.message || 'Failed to delete user');
          }
        },
      },
    ]);
  };

  const createUser = async () => {
    if (!newEmail.trim() || !newFullName.trim() || !newRole) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }
    if (newPassword.trim().length > 0 && newPassword.trim().length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters (or leave empty)');
      return;
    }

    try {
      setCreating(true);
      const payload: any = {
        email: newEmail.trim(),
        full_name: newFullName.trim(),
        role: newRole,
      };
      if (newPassword.trim()) payload.password = newPassword.trim();

      const res = await authService.authenticatedFetch(`${BACKEND_URL}/api/admin/users`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt);
      }
      const created = (await res.json()) as AdminUser;
      setUsers((prev) => [created, ...prev]);
      setShowCreate(false);
      setNewEmail('');
      setNewFullName('');
      setNewRole('doctor');
      setNewPassword('');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to create user');
    } finally {
      setCreating(false);
    }
  };

  const renderItem = ({ item }: { item: AdminUser }) => {
    const active = item.is_active ?? true;
    return (
      <View style={styles.card}>
        <View style={styles.avatar}>
          <Ionicons name={item.role === 'admin' ? 'shield-checkmark' : 'medkit'} size={20} color="#00B894" />
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle}>{item.full_name || 'User'}</Text>
          <Text style={styles.cardSubtitle}>
            {item.email || item.id} • {(item.role || 'user').toUpperCase()} • {active ? 'ACTIVE' : 'INACTIVE'}
          </Text>
        </View>
        <TouchableOpacity style={styles.actionBtn} onPress={() => toggleActive(item)}>
          <Ionicons name={active ? 'pause-circle-outline' : 'play-circle-outline'} size={22} color={active ? '#FFA726' : '#00B894'} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => softDelete(item)}>
          <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <LinearGradient colors={['#00B894', '#00CEC9']} style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Admin Dashboard</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerIcon} onPress={() => setShowCreate(true)}>
              <Ionicons name="person-add-outline" size={22} color="#FFFFFF" />
            </TouchableOpacity>
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
        </View>
        <Text style={styles.headerSubtitle}>{title}</Text>
        <Text style={styles.headerMeta}>User Management</Text>
      </LinearGradient>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#00B894" />
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(u) => u.id}
          contentContainerStyle={styles.listContent}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={40} color="#95A5A6" />
              <Text style={styles.emptyTitle}>No users</Text>
              <Text style={styles.emptyText}>Create doctor/admin users from the + button.</Text>
            </View>
          }
        />
      )}

      <Modal visible={showCreate} animationType="slide" transparent onRequestClose={() => setShowCreate(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Create Account</Text>
            <Text style={styles.modalSubtitle}>Doctor/Admin accounts are created here (patients self-register).</Text>

            <TextInput
              style={styles.input}
              placeholder="Full name"
              placeholderTextColor="#95A5A6"
              value={newFullName}
              onChangeText={setNewFullName}
            />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#95A5A6"
              value={newEmail}
              onChangeText={setNewEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <View style={styles.pickerWrap}>
              <Picker selectedValue={newRole} onValueChange={(v) => setNewRole(v)} style={styles.picker} dropdownIconColor="#636E72">
                <Picker.Item label="Doctor" value="doctor" />
                <Picker.Item label="Admin" value="admin" />
              </Picker>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Password (optional)"
              placeholderTextColor="#95A5A6"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              autoCapitalize="none"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.btnSecondary} onPress={() => setShowCreate(false)} disabled={creating}>
                <Text style={styles.btnSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnPrimary} onPress={createUser} disabled={creating}>
                {creating ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.btnPrimaryText}>Create</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '800' },
  headerActions: { flexDirection: 'row', gap: 10 },
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
  cardSubtitle: { color: '#636E72', marginTop: 4, fontWeight: '700' },
  actionBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', padding: 30 },
  emptyTitle: { marginTop: 10, color: '#2D3436', fontSize: 16, fontWeight: '800' },
  emptyText: { marginTop: 6, color: '#636E72', textAlign: 'center', fontWeight: '600' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 18 },
  modalCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 18 },
  modalTitle: { fontSize: 18, fontWeight: '900', color: '#2D3436', textAlign: 'center' },
  modalSubtitle: { fontSize: 12, color: '#636E72', textAlign: 'center', marginTop: 6, marginBottom: 14, fontWeight: '600' },
  input: {
    backgroundColor: '#F7FFFE',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    borderWidth: 1,
    borderColor: '#E8F8F5',
    color: '#2D3436',
    marginBottom: 10,
    fontWeight: '600',
  },
  pickerWrap: {
    backgroundColor: '#F7FFFE',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8F8F5',
    marginBottom: 10,
    overflow: 'hidden',
  },
  picker: { width: '100%', color: '#2D3436' },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 6 },
  btnSecondary: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8F8F5',
    backgroundColor: '#FFFFFF',
  },
  btnSecondaryText: { color: '#636E72', fontWeight: '800' },
  btnPrimary: { flex: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center', backgroundColor: '#00B894' },
  btnPrimaryText: { color: '#FFFFFF', fontWeight: '900' },
});

