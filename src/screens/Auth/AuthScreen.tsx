import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../../components/common/AppButton';
import { AppLoader } from '../../components/common/AppLoader';
import { AppTextField } from '../../components/common/AppTextField';
import { useAuth } from '../../state/AuthContext';
import { AppColors, useAppTheme, useThemedStyles } from '../../theme/ThemeContext';
import { ui } from '../../theme/ui';

/** Login/signup. Google sign-in slots in here once OAuth client IDs are configured. */
export const AuthScreen: React.FC = () => {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const navigation = useNavigation();
  const { login, signup, loginWithGoogle } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

  const google = useCallback(async () => {
    if (googleBusy) return;
    setError(null);
    setGoogleBusy(true);
    try {
      const result = await loginWithGoogle();
      if (result === 'ok') navigation.goBack();
    } catch (e: any) {
      setError(e?.message ?? 'Google sign-in failed');
    } finally {
      setGoogleBusy(false);
    }
  }, [googleBusy, loginWithGoogle, navigation]);

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
          <AppTextField
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Display name"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            autoCapitalize="words"
          />
        )}
        <AppTextField
          value={username}
          onChangeText={setUsername}
          placeholder="Username"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <AppTextField
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          secureTextEntry
        />
        {error && <Text style={styles.error}>{error}</Text>}
        <AppButton title={mode === 'login' ? 'Log in' : 'Create account'} onPress={submit} loading={busy} />

        <View style={styles.dividerRow}>
          <View style={styles.divider} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.divider} />
        </View>
        <Pressable onPress={google} style={[styles.googleBtn, googleBusy && { opacity: 0.6 }]} disabled={googleBusy}>
          {googleBusy ? (
            <AppLoader />
          ) : (
            <>
              <Ionicons name="logo-google" size={18} color={colors.textPrimary} />
              <Text style={styles.googleText}>Continue with Google</Text>
            </>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const createStyles = (colors: AppColors) => StyleSheet.create({
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
  switchRow: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: ui.radius.button, padding: 4 },
  switchTab: { flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: 'center' },
  switchTabActive: { backgroundColor: colors.primary },
  switchText: { fontSize: 13, fontWeight: '700', color: colors.textTertiary },
  switchTextActive: { color: '#fff' },
  input: {
    borderRadius: ui.radius.button,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.textPrimary,
    fontSize: 14,
  },
  error: { color: colors.error, fontSize: 13, textAlign: 'center' },
  submit: { marginTop: 6, borderRadius: ui.radius.button, backgroundColor: colors.primary, paddingVertical: 14, alignItems: 'center' },
  submitText: { fontSize: 15, fontWeight: '800', color: '#fff' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 4 },
  divider: { flex: 1, height: 1, backgroundColor: colors.surfaceBorder },
  dividerText: { fontSize: 12, color: colors.textMuted },
  googleBtn: {
    flexDirection: 'row',
    gap: 10,
    borderRadius: ui.radius.button,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    backgroundColor: colors.surface,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleText: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
});
