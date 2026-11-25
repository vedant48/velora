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
        <View style={styles.logoTile}>
          <Text style={styles.logoLetter}>V</Text>
        </View>
        <Text style={styles.title}>Welcome to Velora</Text>
        <Text style={styles.subtitle}>
          Track movies and TV series, reviews and episode progress.
        </Text>

        <Pressable onPress={google} style={[styles.googleBtn, googleBusy && { opacity: 0.6 }]} disabled={googleBusy}>
          {googleBusy ? (
            <AppLoader />
          ) : (
            <>
              <Ionicons name="logo-google" size={18} color="#111111" />
              <Text style={styles.googleText}>Continue with Google</Text>
            </>
          )}
        </Pressable>

        <View style={styles.dividerRow}>
          <View style={styles.divider} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.divider} />
        </View>

        {mode === 'signup' && (
          <AppTextField
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Display name"
            placeholderTextColor={colors.appleText3}
            style={styles.input}
            autoCapitalize="words"
          />
        )}
        <AppTextField
          value={username}
          onChangeText={setUsername}
          placeholder="Username"
          placeholderTextColor={colors.appleText3}
          style={styles.input}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <AppTextField
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          placeholderTextColor={colors.appleText3}
          style={styles.input}
          secureTextEntry
        />
        {error && <Text style={styles.error}>{error}</Text>}
        <AppButton title={mode === 'login' ? 'Sign in' : 'Create account'} onPress={submit} loading={busy} />

        <Pressable onPress={() => setMode(mode === 'login' ? 'signup' : 'login')} style={styles.footerToggle} accessibilityRole="button">
          <Text style={styles.footerText}>
            {mode === 'login' ? 'New here? ' : 'Already have an account? '}
            <Text style={styles.footerLink}>{mode === 'login' ? 'Create an account' : 'Sign in'}</Text>
          </Text>
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
  title: { fontSize: 28, fontWeight: '700', color: colors.textPrimary, textAlign: 'center', letterSpacing: -0.3 },
  logoTile: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    shadowColor: colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  logoLetter: { color: '#FFF', fontSize: 32, fontWeight: '800' },
  subtitle: { fontSize: 14, color: colors.appleText2, textAlign: 'center', marginBottom: 10 },
  switchRow: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: ui.radius.button, padding: 4 },
  switchTab: { flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: 'center' },
  switchTabActive: { backgroundColor: colors.primary },
  switchText: { fontSize: 13, fontWeight: '700', color: colors.textTertiary },
  switchTextActive: { color: '#fff' },
  input: {
    borderRadius: 12,
    backgroundColor: colors.appleFill,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: colors.textPrimary,
    fontSize: 15,
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
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleText: { fontSize: 15, fontWeight: '600', color: '#111111' },
  footerToggle: { alignItems: 'center', paddingVertical: 6 },
  footerText: { fontSize: 13, color: colors.appleText2 },
  footerLink: { color: colors.primary, fontWeight: '700' },
});
