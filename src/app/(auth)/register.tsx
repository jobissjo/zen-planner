import { useState } from 'react';
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  View,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Mail, Calendar } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/api';
import { Spacing } from '@/constants/theme';

type Step = 'details' | 'otp';

export default function RegisterScreen() {
  const { register } = useAuth();
  const router = useRouter();
  const theme = useTheme();

  const [step, setStep] = useState<Step>('details');
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');

  async function handleSendOtp() {
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password.trim()) {
      setErrorMsg('All fields are required');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match');
      return;
    }

    setBusy(true);
    setErrorMsg('');
    try {
      await api.verifyEmail(email, firstName);
      setStep('otp');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to send verification email');
    } finally {
      setBusy(false);
    }
  }

  async function handleVerifyOtp() {
    if (!otp.trim()) {
      setErrorMsg('Please enter the OTP sent to your email');
      return;
    }

    setBusy(true);
    setErrorMsg('');
    try {
      // First verify OTP
      await api.verifyEmailOtp(email, otp);

      // Complete registration
      await register({
        email,
        password,
        first_name: firstName,
        last_name: lastName,
        otp,
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'OTP verification failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleResendOtp() {
    setBusy(true);
    setErrorMsg('');
    try {
      await api.verifyEmail(email, firstName);
      setErrorMsg('A new OTP has been sent to your email.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to resend OTP');
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
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {/* Back Button */}
            <TouchableOpacity style={styles.backButton} onPress={() => {
              if (step === 'otp') {
                setStep('details');
              } else {
                router.back();
              }
            }}>
              <ArrowLeft size={24} color={theme.text} />
            </TouchableOpacity>

            <View style={styles.header}>
              <View style={[styles.logoContainer, { backgroundColor: '#3c87f715' }]}>
                {step === 'details' ? (
                  <Calendar size={36} color="#3c87f7" />
                ) : (
                  <Mail size={36} color="#3c87f7" />
                )}
              </View>
              <ThemedText type="subtitle" style={styles.title}>
                {step === 'details' ? 'Create Account' : 'Verify Email'}
              </ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.subtitle}>
                {step === 'details'
                  ? 'Join Zen Planner to stay organized.'
                  : `Enter the code sent to ${email}`}
              </ThemedText>
            </View>

            {/* Error / Alert Message */}
            {errorMsg ? (
              <View
                style={[
                  styles.errorContainer,
                  {
                    backgroundColor: errorMsg.includes('sent') ? '#10b98115' : '#ef444415',
                  },
                ]}>
                <ThemedText style={{ color: errorMsg.includes('sent') ? '#10b981' : '#ef4444', textAlign: 'center', fontWeight: '600' }}>
                  {errorMsg}
                </ThemedText>
              </View>
            ) : null}

            {step === 'details' ? (
              /* Details Form */
              <View style={styles.form}>
                <View style={styles.row}>
                  <View style={[styles.inputContainer, { flex: 1 }]}>
                    <ThemedText type="smallBold" style={styles.label}>
                      First Name
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
                      value={firstName}
                      onChangeText={setFirstName}
                      placeholder="Sam"
                      placeholderTextColor={theme.textSecondary}
                    />
                  </View>

                  <View style={[styles.inputContainer, { flex: 1 }]}>
                    <ThemedText type="smallBold" style={styles.label}>
                      Last Name
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
                      value={lastName}
                      onChangeText={setLastName}
                      placeholder="User"
                      placeholderTextColor={theme.textSecondary}
                    />
                  </View>
                </View>

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
                    placeholder="Enter password"
                    placeholderTextColor={theme.textSecondary}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <ThemedText type="smallBold" style={styles.label}>
                    Confirm Password
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
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                    placeholder="Repeat password"
                    placeholderTextColor={theme.textSecondary}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.button, busy && styles.buttonDisabled]}
                  onPress={handleSendOtp}
                  disabled={busy}>
                  {busy ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <ThemedText style={styles.buttonText}>Continue</ThemedText>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              /* OTP Form */
              <View style={styles.form}>
                <View style={styles.inputContainer}>
                  <ThemedText type="smallBold" style={styles.label}>
                    Verification Code (OTP)
                  </ThemedText>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        borderColor: theme.backgroundSelected,
                        color: theme.text,
                        backgroundColor: theme.backgroundElement,
                        textAlign: 'center',
                        fontSize: 24,
                        letterSpacing: 6,
                      },
                    ]}
                    value={otp}
                    onChangeText={setOtp}
                    keyboardType="number-pad"
                    maxLength={6}
                    placeholder="000000"
                    placeholderTextColor={theme.textSecondary}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.button, busy && styles.buttonDisabled]}
                  onPress={handleVerifyOtp}
                  disabled={busy}>
                  {busy ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <ThemedText style={styles.buttonText}>Verify & Create Account</ThemedText>
                  )}
                </TouchableOpacity>

                <View style={styles.otpActions}>
                  <TouchableOpacity onPress={handleResendOtp} disabled={busy}>
                    <ThemedText type="linkPrimary">Resend OTP</ThemedText>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Login Redirect */}
            <View style={styles.footer}>
              <ThemedText themeColor="textSecondary" type="small">
                Already have an account?{' '}
              </ThemedText>
              <TouchableOpacity onPress={() => router.push('/login')}>
                <ThemedText type="linkPrimary" style={styles.footerLink}>
                  Sign In
                </ThemedText>
              </TouchableOpacity>
            </View>
          </ScrollView>
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
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.four,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: Spacing.two,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.three,
    gap: Spacing.one,
  },
  logoContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
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
  form: {
    gap: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
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
  otpActions: {
    alignItems: 'center',
    marginTop: Spacing.one,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.four,
    alignItems: 'center',
  },
  footerLink: {
    fontWeight: 'bold',
    fontSize: 14,
  },
});
