/**
 * Registration screen
 */
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../contexts/AuthContext';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'patient' | 'doctor' | 'admin'>('patient');
  const [mobile, setMobile] = useState('');
  const [dob, setDob] = useState(''); // YYYY-MM-DD
  const [gender, setGender] = useState<'male' | 'female' | 'other' | 'prefer_not_to_say' | ''>('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showDobPicker, setShowDobPicker] = useState(false);

  const dobDate = useMemo(() => {
    if (!dob) return undefined;
    const d = new Date(dob);
    return Number.isNaN(d.getTime()) ? undefined : d;
  }, [dob]);

  const formatDateYmd = (date: Date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const onDobChange = (event: DateTimePickerEvent, selected?: Date) => {
    // Android fires 'dismissed' when user cancels; iOS keeps it open unless we hide it ourselves.
    if (Platform.OS === 'android') setShowDobPicker(false);
    if (event.type !== 'set' || !selected) return;
    setDob(formatDateYmd(selected));
  };

  const handleRegister = async () => {
    if (!email || !password || !fullName) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      await register(email, password, fullName, role, { mobile, dob, gender });
      router.replace('/');
    } catch (error: any) {
      Alert.alert('Registration Failed', error.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['#00B894', '#00CEC9']}
        style={styles.gradient}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join DermaSnap today</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color="#636E72" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Full Name"
                placeholderTextColor="#95A5A6"
                value={fullName}
                onChangeText={setFullName}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color="#636E72" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#95A5A6"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="call-outline" size={20} color="#636E72" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Mobile (+country code)"
                placeholderTextColor="#95A5A6"
                value={mobile}
                onChangeText={setMobile}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#636E72" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Password (min 8 characters)"
                placeholderTextColor="#95A5A6"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}
              >
                <Ionicons
                  name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                  size={20}
                  color="#636E72"
                />
              </TouchableOpacity>
            </View>

            <View style={styles.row}>
              <View style={[styles.inputContainer, styles.half]}>
                <Ionicons name="calendar-outline" size={20} color="#636E72" style={styles.inputIcon} />
                <TouchableOpacity
                  style={styles.pressableInput}
                  onPress={() => setShowDobPicker(true)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.pressableText, !dob && styles.pressablePlaceholder]}>
                    {dob || 'Date of Birth'}
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={[styles.inputContainer, styles.half]}>
                <Ionicons name="male-female-outline" size={20} color="#636E72" style={styles.inputIcon} />
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={gender}
                    onValueChange={(value) => setGender(value)}
                    style={styles.picker}
                    dropdownIconColor="#636E72"
                  >
                    <Picker.Item label="Gender" value="" color="#95A5A6" />
                    <Picker.Item label="Male" value="male" />
                    <Picker.Item label="Female" value="female" />
                    <Picker.Item label="Other" value="other" />
                    <Picker.Item label="Prefer not to say" value="prefer_not_to_say" />
                  </Picker>
                </View>
              </View>
            </View>

            {showDobPicker && (
              <DateTimePicker
                value={dobDate ?? new Date(2000, 0, 1)}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={onDobChange}
                maximumDate={new Date()}
              />
            )}

            {/* Keep role to patient for mobile by default; can expose toggles later if needed */}

            <TouchableOpacity
              style={[styles.registerButton, loading && styles.registerButtonDisabled]}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.registerButtonText}>Register</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.loginLink}
              onPress={() => router.push('/auth/login')}
            >
              <Text style={styles.loginLinkText}>
                Already have an account? <Text style={styles.loginLinkBold}>Login</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  backButton: {
    position: 'absolute',
    left: 0,
    top: 0,
    padding: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 16,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.9,
    marginTop: 8,
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#2D3436',
  },
  pressableInput: {
    flex: 1,
    justifyContent: 'center',
    height: '100%',
  },
  pressableText: {
    fontSize: 16,
    color: '#2D3436',
  },
  pressablePlaceholder: {
    color: '#95A5A6',
  },
  pickerContainer: {
    flex: 1,
    justifyContent: 'center',
    height: '100%',
  },
  picker: {
    flex: 1,
    color: '#2D3436',
  },
  eyeIcon: {
    padding: 4,
  },
  roleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 8,
    marginBottom: 12,
  },
  roleContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  roleButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  roleButtonActive: {
    backgroundColor: '#FFFFFF',
  },
  roleButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  roleButtonTextActive: {
    color: '#00B894',
  },
  registerButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  registerButtonDisabled: {
    opacity: 0.6,
  },
  registerButtonText: {
    color: '#00B894',
    fontSize: 18,
    fontWeight: '700',
  },
  loginLink: {
    marginTop: 24,
    alignItems: 'center',
  },
  loginLinkText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  loginLinkBold: {
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  half: {
    flex: 1,
  },
});
