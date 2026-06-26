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
import { ArrowLeft, CheckCircle } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/api';
import { Spacing } from '@/constants/theme';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const theme = useTheme();

  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  async function handleReset() {
    if (!email.trim()) {
      setErrorMsg('Please enter your email address');
      return;
    }

    setBusy(true);
    setErrorMsg('');
    try {
      await api.forgotPassword(email);
      setSent(true);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to send password reset email');
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
            {/* Back Button */}
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <ArrowLeft size={24} color={theme.text} />
            </TouchableOpacity>

            {!sent ? (
              /* Request Form */
              <>
                <View style={styles.header}>
                  <ThemedText type="subtitle" style={styles.title}>
                    Forgot Password
                  </ThemedText>
                  <ThemedText themeColor="textSecondary" style={styles.subtitle}>
                    Enter your email to receive a password reset link.
                  </ThemedText>
                </View>

                {errorMsg ? (
                  <View style={[styles.errorContainer, { backgroundColor: '#ef444415' }]}>
                    <ThemedText style={styles.errorText}>{errorMsg}</ThemedText>
                  </View>
                ) : null}

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
                      placeholder="name@domain.com"
                      placeholderTextColor={theme.textSecondary}
                    />
                  </View>

                  <TouchableOpacity
                    style={[styles.button, busy && styles.buttonDisabled]}
                    onPress={handleReset}
                    disabled={busy}>
                    {busy ? (
                      <ActivityIndicator color="#ffffff" />
                    ) : (
                      <ThemedText style={styles.buttonText}>Send Reset Link</ThemedText>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              /* Confirmation Screen */
              <View style={styles.successContainer}>
                <CheckCircle size={60} color="#10b981" style={{ marginBottom: Spacing.two }} />
                <ThemedText type="subtitle" style={styles.title}>
                  Reset Link Sent
                </ThemedText>
                <ThemedText themeColor="textSecondary" style={styles.successSubtitle}>
                  Please check your inbox at {email} for instructions to reset your password.
                </ThemedText>

                <TouchableOpacity
                  style={[styles.button, { width: '100%', marginTop: Spacing.four }]}
                  onPress={() => {
                    setSent(false);
                    setEmail('');
                  }}>
                  <ThemedText style={styles.buttonText}>Try Another Email</ThemedText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.backToLogin}
                  onPress={() => router.push('/login')}>
                  <ThemedText type="linkPrimary">Back to Sign In</ThemedText>
                </TouchableOpacity>
              </View>
            )}
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
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  header: {
    alignItems: 'flex-start',
    marginBottom: Spacing.three,
    gap: Spacing.one,
  },
  title: {
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
    marginTop: Spacing.one,
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
  button: {
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
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.four,
  },
  successSubtitle: {
    textAlign: 'center',
    marginTop: Spacing.two,
    fontSize: 15,
  },
  backToLogin: {
    marginTop: Spacing.three,
  },
});
