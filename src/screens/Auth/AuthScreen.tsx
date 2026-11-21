import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { useAuth } from '../../state/AuthContext';

/** Login/signup. Google sign-in slots in here once OAuth client IDs are configured. */
export const AuthScreen: React.FC = () => {
  const navigation = useNavigation();
  const { login, signup } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = useCallback(async () => {
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      if (mode === 'login') {
        await login(username, password);
      } else {
        await signup(username, password, displayName || undefined);
      }
      navigation.goBack();
    } catch (e: any) {
      setError(e?.message ?? 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }, [busy, mode, username, password, displayName, login, signup, navigation]);

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => navigation.goBack()} style={styles.back} accessibilityLabel="Back">
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Velora</Text>
        <Text style={styles.subtitle}>
          Track what you watch, rate titles, and see what friends are watching.
        </Text>

        <View style={styles.switchRow}>
          {(['login', 'signup'] as const).map((m) => (
            <Pressable key={m} onPress={() => setMode(m)} style={[styles.switchTab, mode === m && styles.switchTabActive]}>
              <Text style={[styles.switchText, mode === m && styles.switchTextActive]}>
                {m === 'login' ? 'Log in' : 'Sign up'}
              </Text>
            </Pressable>
          ))}
        </View>

        {mode === 'signup' && (
          <TextInput
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Display name"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            autoCapitalize="words"
          />
        )}
        <TextInput
          value={username}
          onChangeText={setUsername}
          placeholder="Username"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          secureTextEntry
        />
        {error && <Text style={styles.error}>{error}</Text>}
        <Pressable onPress={submit} style={[styles.submit, busy && { opacity: 0.6 }]} disabled={busy}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>{mode === 'login' ? 'Log in' : 'Create account'}</Text>}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 24, paddingTop: 72, gap: 14 },
  back: {
    position: 'absolute',
    top: 52,
    left: 20,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  title: { fontSize: 34, fontWeight: '900', color: colors.primary, textAlign: 'center', letterSpacing: 1 },
  subtitle: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginBottom: 10 },
  switchRow: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 12, padding: 4 },
  switchTab: { flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: 'center' },
  switchTabActive: { backgroundColor: colors.primary },
  switchText: { fontSize: 13, fontWeight: '700', color: colors.textTertiary },
  switchTextActive: { color: '#fff' },
  input: {
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.textPrimary,
    fontSize: 14,
  },
  error: { color: colors.error, fontSize: 13, textAlign: 'center' },
  submit: { marginTop: 6, borderRadius: 12, backgroundColor: colors.primary, paddingVertical: 14, alignItems: 'center' },
  submitText: { fontSize: 15, fontWeight: '800', color: '#fff' },
});
