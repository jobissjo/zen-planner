import { useState, useEffect } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  TouchableOpacity,
  TextInput,
  Switch,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User, Bell, Lock, LogOut, BadgeCheck } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/api';
import { Spacing } from '@/constants/theme';

export default function ProfileScreen() {
  const { session, logout } = useAuth();
  const theme = useTheme();

  // State
  const [profileLoading, setProfileLoading] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [reminders, setReminders] = useState(true);

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordBusy, setPasswordBusy] = useState(false);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const userProfile = await api.getUserProfile();
        if (userProfile && userProfile.profile) {
          setEmailNotifications(userProfile.profile.email_notifications ?? true);
          setReminders(userProfile.profile.reminders ?? true);
        }
      } catch (e) {
        console.error('Failed to fetch user profile', e);
      } finally {
        setProfileLoading(false);
      }
    }
    fetchProfile();
  }, []);

  async function handleToggleEmail(checked: boolean) {
    setEmailNotifications(checked);
    try {
      await api.updateNotificationPreferences(checked, reminders);
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to update preferences');
    }
  }

  async function handleToggleReminders(checked: boolean) {
    setReminders(checked);
    try {
      await api.updateNotificationPreferences(emailNotifications, checked);
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to update preferences');
    }
  }

  async function handlePasswordChange() {
    if (!oldPassword || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'All password fields are required.');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }

    setPasswordBusy(true);
    try {
      await api.changePassword(oldPassword, newPassword);
      Alert.alert('Success', 'Password updated successfully');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update password');
    } finally {
      setPasswordBusy(false);
    }
  }

  function handleLogout() {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: () => {
          logout();
        },
      },
    ]);
  }

  const initials = session?.user
    ? `${session.user.first_name[0] || ''}${session.user.last_name[0] || ''}`.toUpperCase()
    : 'U';

  const fullName = session?.user
    ? `${session.user.first_name} ${session.user.last_name}`
    : 'User Profile';

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <ThemedText type="subtitle" style={styles.headerTitle}>
            Profile & Settings
          </ThemedText>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* User Info Card */}
          <View style={[styles.profileCard, { backgroundColor: theme.backgroundElement }]}>
            <View style={styles.avatarRow}>
              <View style={[styles.avatar, { backgroundColor: '#3c87f7' }]}>
                <ThemedText style={styles.avatarText}>{initials}</ThemedText>
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText type="smallBold" style={styles.nameText}>
                  {fullName}
                </ThemedText>
                <ThemedText themeColor="textSecondary" style={styles.emailText}>
                  {session?.user?.email}
                </ThemedText>
                <View style={[styles.roleBadge, { backgroundColor: '#3c87f715' }]}>
                  <BadgeCheck size={12} color="#3c87f7" style={{ marginRight: 4 }} />
                  <ThemedText style={{ color: '#3c87f7', fontSize: 10, fontWeight: 'bold', textTransform: 'capitalize' }}>
                    {session?.role || 'user'}
                  </ThemedText>
                </View>
              </View>
            </View>
          </View>

          {/* Notifications Card */}
          <View style={[styles.settingsCard, { backgroundColor: theme.backgroundElement }]}>
            <View style={styles.cardHeader}>
              <Bell size={20} color="#3c87f7" style={{ marginRight: 8 }} />
              <ThemedText type="smallBold">Notification Preferences</ThemedText>
            </View>
            
            {profileLoading ? (
              <ActivityIndicator style={{ paddingVertical: Spacing.two }} color="#3c87f7" />
            ) : (
              <View style={styles.cardBody}>
                <View style={[styles.switchRow, { borderColor: theme.backgroundSelected }]}>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={styles.switchTitle} type="smallBold">Email Notifications</ThemedText>
                    <ThemedText style={styles.switchDesc} themeColor="textSecondary">Daily summaries and updates.</ThemedText>
                  </View>
                  <Switch value={emailNotifications} onValueChange={handleToggleEmail} />
                </View>

                <View style={[styles.switchRow, { borderBottomWidth: 0 }]}>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={styles.switchTitle} type="smallBold">Task Reminders</ThemedText>
                    <ThemedText style={styles.switchDesc} themeColor="textSecondary">Alerts for tasks scheduled for today.</ThemedText>
                  </View>
                  <Switch value={reminders} onValueChange={handleToggleReminders} />
                </View>
              </View>
            )}
          </View>

          {/* Password Card */}
          <View style={[styles.settingsCard, { backgroundColor: theme.backgroundElement }]}>
            <View style={styles.cardHeader}>
              <Lock size={20} color="#10b981" style={{ marginRight: 8 }} />
              <ThemedText type="smallBold">Change Password</ThemedText>
            </View>
            <View style={[styles.cardBody, { gap: Spacing.two }]}>
              <View style={styles.inputGroup}>
                <ThemedText type="smallBold" style={styles.label}>Current Password</ThemedText>
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      borderColor: theme.backgroundSelected,
                      color: theme.text,
                      backgroundColor: theme.backgroundElement,
                    },
                  ]}
                  value={oldPassword}
                  onChangeText={setOldPassword}
                  secureTextEntry
                  placeholder="Enter current password"
                  placeholderTextColor={theme.textSecondary}
                />
              </View>

              <View style={styles.inputGroup}>
                <ThemedText type="smallBold" style={styles.label}>New Password</ThemedText>
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      borderColor: theme.backgroundSelected,
                      color: theme.text,
                      backgroundColor: theme.backgroundElement,
                    },
                  ]}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                  placeholder="Minimum 4 characters"
                  placeholderTextColor={theme.textSecondary}
                />
              </View>

              <View style={styles.inputGroup}>
                <ThemedText type="smallBold" style={styles.label}>Confirm New Password</ThemedText>
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      borderColor: theme.backgroundSelected,
                      color: theme.text,
                      backgroundColor: theme.backgroundElement,
                    },
                  ]}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  placeholder="Repeat new password"
                  placeholderTextColor={theme.textSecondary}
                />
              </View>

              <TouchableOpacity
                style={[styles.passwordButton, passwordBusy && { opacity: 0.7 }]}
                onPress={handlePasswordChange}
                disabled={passwordBusy}>
                {passwordBusy ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <ThemedText style={{ color: '#fff', fontWeight: 'bold' }}>Update Password</ThemedText>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Logout Button */}
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <LogOut size={18} color="#fff" style={{ marginRight: Spacing.two }} />
            <ThemedText style={{ color: '#fff', fontWeight: 'bold' }}>Sign Out</ThemedText>
          </TouchableOpacity>
        </ScrollView>
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
  header: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  headerTitle: {
    fontWeight: 'bold',
  },
  scrollContent: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.five,
    gap: Spacing.three,
  },
  profileCard: {
    borderRadius: Spacing.two,
    padding: Spacing.three,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  nameText: {
    fontSize: 16,
  },
  emailText: {
    fontSize: 13,
    marginTop: 2,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Spacing.four,
    marginTop: Spacing.one,
  },
  settingsCard: {
    borderRadius: Spacing.two,
    padding: Spacing.three,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  cardBody: {},
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
  },
  switchTitle: {
    fontSize: 14,
  },
  switchDesc: {
    fontSize: 11,
    marginTop: 2,
  },
  inputGroup: {
    gap: Spacing.half,
  },
  label: {
    fontSize: 12,
  },
  textInput: {
    height: 46,
    borderWidth: 1,
    borderRadius: Spacing.one,
    paddingHorizontal: Spacing.three,
    fontSize: 14,
  },
  passwordButton: {
    height: 46,
    backgroundColor: '#10b981',
    borderRadius: Spacing.one,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.one,
  },
  logoutButton: {
    height: 48,
    backgroundColor: '#ef4444',
    borderRadius: Spacing.two,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.two,
  },
});
