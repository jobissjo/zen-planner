import { useState } from 'react';
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, Shield } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';

export default function LoginScreen() {
  const { login } = useAuth();
  const router = useRouter();
  const theme = useTheme();

  const [email, setEmail] = useState('user@demo.com');
  const [password, setPassword] = useState('demo');
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      setErrorMsg('Please enter email and password');
      return;
    }

    setBusy(true);
    setErrorMsg('');
    try {
      await login(email, password);
    } catch (err: any) {
      setErrorMsg(err.message || 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}>
          <View style={styles.content}>
            {/* Logo and Brand */}
            <View style={styles.header}>
              <View style={[styles.logoContainer, { backgroundColor: '#3c87f715' }]}>
                <Calendar size={40} color="#3c87f7" />
              </View>
              <ThemedText type="subtitle" style={styles.title}>
                Weekly Zen Planner
              </ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.subtitle}>
                Plan your days, nurture your habits.
              </ThemedText>
            </View>

            {/* Error Message */}
            {errorMsg ? (
              <View style={[styles.errorContainer, { backgroundColor: '#ef444415' }]}>
                <ThemedText style={styles.errorText}>{errorMsg}</ThemedText>
              </View>
            ) : null}

            {/* Input Form */}
            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <ThemedText type="smallBold" style={styles.label}>
                  Email Address
                </ThemedText>
                <TextInput
                  style={[
                    styles.input,
                    {
                      borderColor: theme.backgroundSelected,
                      color: theme.text,
                      backgroundColor: theme.backgroundElement,
                    },
                  ]}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholder="Enter your email"
                  placeholderTextColor={theme.textSecondary}
                />
              </View>

              <View style={styles.inputContainer}>
                <ThemedText type="smallBold" style={styles.label}>
                  Password
                </ThemedText>
                <TextInput
                  style={[
                    styles.input,
                    {
                      borderColor: theme.backgroundSelected,
                      color: theme.text,
                      backgroundColor: theme.backgroundElement,
                    },
                  ]}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  placeholder="Enter your password"
                  placeholderTextColor={theme.textSecondary}
                />
              </View>

              <TouchableOpacity
                style={styles.forgotBtn}
                onPress={() => router.push('/forgot-password')}>
                <ThemedText type="linkPrimary" style={styles.forgotText}>
                  Forgot Password?
                </ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.loginButton, busy && styles.buttonDisabled]}
                onPress={handleLogin}
                disabled={busy}>
                {busy ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <ThemedText style={styles.loginButtonText}>Sign In</ThemedText>
                )}
              </TouchableOpacity>
            </View>

            {/* Quick Demo Accounts */}
            <View style={[styles.demoCard, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="smallBold" style={styles.demoTitle}>
                Quick Demo Roles
              </ThemedText>
              <View style={styles.demoButtons}>
                <TouchableOpacity
                  style={[styles.demoBtn, { borderColor: '#3c87f7' }]}
                  onPress={() => {
                    setEmail('user@demo.com');
                    setPassword('demo');
                  }}>
                  <Calendar size={14} color="#3c87f7" style={{ marginRight: 4 }} />
                  <ThemedText type="small" style={{ color: '#3c87f7' }}>
                    User Demo
                  </ThemedText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.demoBtn, { borderColor: '#10b981' }]}
                  onPress={() => {
                    setEmail('admin@demo.com');
                    setPassword('demo');
                  }}>
                  <Shield size={14} color="#10b981" style={{ marginRight: 4 }} />
                  <ThemedText type="small" style={{ color: '#10b981' }}>
                    Admin Demo
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </View>

            {/* Register Redirect */}
            <View style={styles.footer}>
              <ThemedText themeColor="textSecondary" type="small">
                {"Don't have an account? "}
              </ThemedText>
              <TouchableOpacity onPress={() => router.push('/register')}>
                <ThemedText type="linkPrimary" style={styles.footerLink}>
                  Register Here
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.three,
    gap: Spacing.one,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  title: {
    fontWeight: 'bold',
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    fontSize: 14,
  },
  errorContainer: {
    padding: Spacing.two,
    borderRadius: Spacing.two,
    marginBottom: Spacing.two,
  },
  errorText: {
    color: '#ef4444',
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
  },
  form: {
    gap: Spacing.three,
  },
  inputContainer: {
    gap: Spacing.one,
  },
  label: {
    fontSize: 13,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
  forgotBtn: {
    alignSelf: 'flex-end',
  },
  forgotText: {
    fontSize: 13,
  },
  loginButton: {
    height: 52,
    backgroundColor: '#3c87f7',
    borderRadius: Spacing.two,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  demoCard: {
    borderRadius: Spacing.two,
    padding: Spacing.three,
    marginTop: Spacing.two,
    gap: Spacing.two,
  },
  demoTitle: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  demoButtons: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  demoBtn: {
    flex: 1,
    height: 38,
    borderWidth: 1,
    borderRadius: Spacing.one,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.three,
    alignItems: 'center',
  },
  footerLink: {
    fontWeight: 'bold',
    fontSize: 14,
  },
});
