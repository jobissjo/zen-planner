import { useState, useEffect } from 'react';
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
import { Calendar } from 'lucide-react-native';
import { FontAwesome } from '@expo/vector-icons';
let GoogleSignin: any = null;
let statusCodes: any = {};

try {
  const GoogleSigninModule = require('@react-native-google-signin/google-signin');
  GoogleSignin = GoogleSigninModule.GoogleSignin;
  statusCodes = GoogleSigninModule.statusCodes;
} catch (e) {
  console.warn('Google Sign-In is not supported in this environment (e.g., Expo Go).');
}

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';

export default function LoginScreen() {
  const { login, loginWithGoogle } = useAuth();
  const router = useRouter();
  const theme = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [busyGoogle, setBusyGoogle] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (GoogleSignin) {
      GoogleSignin.configure({
        // Replace with your OAuth 2.0 Web Client ID from Google Cloud Console
        webClientId: 'YOUR_GOOGLE_WEB_CLIENT_ID.apps.googleusercontent.com',
        offlineAccess: true,
      });
    }
  }, []);

  async function handleGoogleLogin() {
    if (!GoogleSignin) {
      setErrorMsg('Google Sign-In is not supported in Expo Go. Please use a development build.');
      return;
    }
    setBusyGoogle(true);
    setErrorMsg('');
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const response = await GoogleSignin.signIn();
      
      let idToken: string | null = null;
      if (response && 'data' in response && response.data) {
        idToken = response.data.idToken;
      } else if (response && 'idToken' in response) {
        idToken = (response as any).idToken;
      }

      if (!idToken) {
        throw new Error('Google Sign-In did not return an ID token.');
      }

      await loginWithGoogle(idToken);
    } catch (err: any) {
      if (err.code === statusCodes.SIGN_IN_CANCELLED) {
        // User cancelled the flow, do nothing
      } else if (err.code === statusCodes.IN_PROGRESS) {
        setErrorMsg('Sign-in is already in progress');
      } else if (err.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        setErrorMsg('Google Play Services are not available on this device');
      } else {
        setErrorMsg(err.message || 'Google Sign-In failed');
      }
    } finally {
      setBusyGoogle(false);
    }
  }

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
                disabled={busy || busyGoogle}>
                {busy ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <ThemedText style={styles.loginButtonText}>Sign In</ThemedText>
                )}
              </TouchableOpacity>

              <View style={styles.dividerContainer}>
                <View style={[styles.dividerLine, { backgroundColor: theme.backgroundSelected }]} />
                <ThemedText themeColor="textSecondary" style={styles.dividerText}>or</ThemedText>
                <View style={[styles.dividerLine, { backgroundColor: theme.backgroundSelected }]} />
              </View>

              <TouchableOpacity
                style={[
                  styles.googleButton,
                  {
                    borderColor: theme.backgroundSelected,
                    backgroundColor: theme.backgroundElement,
                  },
                  (busy || busyGoogle) && styles.buttonDisabled,
                ]}
                onPress={handleGoogleLogin}
                disabled={busy || busyGoogle}>
                {busyGoogle ? (
                  <ActivityIndicator color={theme.text} />
                ) : (
                  <View style={styles.googleButtonContent}>
                    <FontAwesome name="google" size={18} color="#EA4335" style={styles.googleIcon} />
                    <ThemedText style={[styles.googleButtonText, { color: theme.text }]}>
                      Continue with Google
                    </ThemedText>
                  </View>
                )}
              </TouchableOpacity>
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
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.two,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: Spacing.two,
    fontSize: 14,
    fontWeight: '500',
  },
  googleButton: {
    height: 52,
    borderWidth: 1,
    borderRadius: Spacing.two,
    justifyContent: 'center',
    alignItems: 'center',
  },
  googleButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  googleIcon: {
    marginRight: Spacing.two,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});
