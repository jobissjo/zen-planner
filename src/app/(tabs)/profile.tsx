import { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  TouchableOpacity,
  TextInput,
  Switch,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User, Bell, Lock, LogOut, BadgeCheck, Shield, Palette, Sun, Moon, Monitor, Sparkles, Clock, MessageSquare, ChevronRight, X, Circle } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/api';
import { Spacing } from '@/constants/theme';
import { useThemeMode } from '@/context/theme-context';
import { GlassCard } from '@/components/glass-card';
import type { Task, FeedbackType } from '@/types';

export default function ProfileScreen() {
  const { session, logout } = useAuth();
  const theme = useTheme();
  const { themeMode, setThemeMode } = useThemeMode();

  // State
  const [profileLoading, setProfileLoading] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [reminders, setReminders] = useState(true);

  // Auth settings states
  const [googleId, setGoogleId] = useState<string | null>(null);
  const [allowPasswordLogin, setAllowPasswordLogin] = useState(true);
  const [hasPassword, setHasPassword] = useState(false);
  const [settingsBusy, setSettingsBusy] = useState(false);

  // Set Password Form state for Google users
  const [showSetPasswordForm, setShowSetPasswordForm] = useState(false);
  const [setNewPass, setSetNewPass] = useState('');
  const [setConfirmPass, setSetConfirmPass] = useState('');
  const [setPassBusy, setSetPassBusy] = useState(false);

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordBusy, setPasswordBusy] = useState(false);

  // Pending Tasks State
  const [pendingTasks, setPendingTasks] = useState<Task[]>([]);
  const [fetchingPending, setFetchingPending] = useState(false);
  const [pendingModalOpen, setPendingModalOpen] = useState(false);

  // Feedback Form State
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('feedback');
  const [feedbackTitle, setFeedbackTitle] = useState('');
  const [feedbackContent, setFeedbackContent] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  const fetchPendingTasks = useCallback(async () => {
    try {
      const allTasks = await api.listTasks();
      const pending = allTasks.filter((t) => t.status === 'pending');
      setPendingTasks(pending);
    } catch (e) {
      console.error('Failed to fetch pending tasks', e);
    }
  }, []);

  async function handleCompletePendingTask(t: Task) {
    try {
      const todayStr = new Date().toISOString().slice(0, 10);
      await api.updateTask(t.id, { status: 'completed', completedDate: todayStr });
      setPendingTasks((prev) => prev.filter((item) => item.id !== t.id));
      Alert.alert('Success', `Task "${t.title}" marked as completed!`);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to complete task');
    }
  }

  async function handleSkipPendingTask(t: Task) {
    try {
      await api.updateTask(t.id, { status: 'skipped' });
      setPendingTasks((prev) => prev.filter((item) => item.id !== t.id));
      Alert.alert('Success', `Task "${t.title}" skipped!`);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to skip task');
    }
  }

  async function handleSubmitFeedback() {
    if (!feedbackTitle.trim() || !feedbackContent.trim()) {
      Alert.alert('Error', 'Please fill in both Subject and Details.');
      return;
    }
    setSubmittingFeedback(true);
    try {
      await api.submitFeedback(feedbackType, feedbackTitle, feedbackContent);
      Alert.alert('Success', 'Feedback submitted! Thank you for helping us improve Zen Planner. 🧘');
      setFeedbackTitle('');
      setFeedbackContent('');
      setFeedbackType('feedback');
      setFeedbackModalOpen(false);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to submit feedback');
    } finally {
      setSubmittingFeedback(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPendingTasks();
  }, [fetchPendingTasks]);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const userProfile = await api.getUserProfile();
        if (userProfile) {
          setGoogleId(userProfile.google_id || null);
          setAllowPasswordLogin(userProfile.allow_password_login ?? true);
          setHasPassword(userProfile.has_password ?? false);
          if (userProfile.profile) {
            setEmailNotifications(userProfile.profile.email_notifications ?? true);
            setReminders(userProfile.profile.reminders ?? true);
          }
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

  async function handleToggleAllowPassword(checked: boolean) {
    if (checked) {
      if (!hasPassword) {
        // If no password set, expand/show set password form
        setShowSetPasswordForm(true);
      } else {
        // Already has password, just update settings in backend
        setSettingsBusy(true);
        try {
          await api.updateAuthSettings(true);
          setAllowPasswordLogin(true);
          Alert.alert('Success', 'Email/password sign-in has been enabled.');
        } catch (e: any) {
          Alert.alert('Error', e.message || 'Failed to update authentication settings');
        } finally {
          setSettingsBusy(false);
        }
      }
    } else {
      // Toggle off password login
      setSettingsBusy(true);
      try {
        await api.updateAuthSettings(false);
        setAllowPasswordLogin(false);
        Alert.alert('Success', 'Email/password sign-in has been disabled. You can only login with Google.');
      } catch (e: any) {
        Alert.alert('Error', e.message || 'Failed to update authentication settings');
      } finally {
        setSettingsBusy(false);
      }
    }
  }

  async function handleSetPasswordSubmit() {
    if (!setNewPass || !setConfirmPass) {
      Alert.alert('Error', 'All fields are required.');
      return;
    }

    if (setNewPass !== setConfirmPass) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (setNewPass.length < 4) {
      Alert.alert('Error', 'Password must be at least 4 characters long');
      return;
    }

    setSetPassBusy(true);
    try {
      // Empty current password as user does not have one
      await api.changePassword('', setNewPass);
      Alert.alert('Success', 'Password configured successfully! You can now log in using either Google or your email and password.');
      setHasPassword(true);
      setAllowPasswordLogin(true);
      setShowSetPasswordForm(false);
      setSetNewPass('');
      setSetConfirmPass('');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to set password');
    } finally {
      setSetPassBusy(false);
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
          <GlassCard style={styles.profileCard}>
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
          </GlassCard>

          {/* Notifications Card */}
          <GlassCard style={styles.settingsCard}>
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
          </GlassCard>

          {/* Theme Preference Card */}
          <GlassCard style={styles.settingsCard}>
            <View style={styles.cardHeader}>
              <Palette size={20} color="#3c87f7" style={{ marginRight: 8 }} />
              <ThemedText type="smallBold">Theme Preferences</ThemedText>
            </View>
            <View style={styles.cardBody}>
              <View style={styles.themeSelectorRow}>
                {(['system', 'light', 'dark'] as const).map((mode) => {
                  const isActive = themeMode === mode;
                  const IconComponent = mode === 'system' ? Monitor : mode === 'light' ? Sun : Moon;
                  return (
                    <TouchableOpacity
                      key={mode}
                      style={[
                        styles.themeButton,
                        isActive && {
                          backgroundColor: '#3c87f7',
                          borderColor: '#3c87f7',
                        },
                        !isActive && {
                          backgroundColor: theme.backgroundSelected,
                          borderColor: theme.backgroundSelected,
                        }
                      ]}
                      onPress={() => setThemeMode(mode)}
                    >
                      <IconComponent size={16} color={isActive ? '#fff' : theme.text} style={{ marginRight: 6 }} />
                      <ThemedText
                        style={[
                          styles.themeButtonText,
                          { color: isActive ? '#fff' : theme.text }
                        ]}
                        type="smallBold"
                      >
                        {mode.charAt(0).toUpperCase() + mode.slice(1)}
                      </ThemedText>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </GlassCard>

          {/* Utilities & Feedback Card */}
          <GlassCard style={styles.settingsCard}>
            <View style={styles.cardHeader}>
              <Sparkles size={20} color="#3c87f7" style={{ marginRight: 8 }} />
              <ThemedText type="smallBold">App Utilities</ThemedText>
            </View>
            <View style={styles.cardBody}>
              {/* Pending Tasks button */}
              <TouchableOpacity
                style={[styles.menuRow, { borderColor: theme.backgroundSelected }]}
                onPress={async () => {
                  setFetchingPending(true);
                  setPendingModalOpen(true);
                  try {
                    await fetchPendingTasks();
                  } finally {
                    setFetchingPending(false);
                  }
                }}
              >
                <View style={styles.menuRowLeft}>
                  <Clock size={18} color={theme.textSecondary} style={{ marginRight: 10 }} />
                  <ThemedText style={styles.menuRowText}>Pending Tasks</ThemedText>
                </View>
                {/* Arrow or badge */}
                <View style={styles.menuRowRight}>
                  {pendingTasks.length > 0 && (
                    <View style={styles.badge}>
                      <ThemedText style={styles.badgeText}>{pendingTasks.length}</ThemedText>
                    </View>
                  )}
                  <ChevronRight size={16} color={theme.textSecondary} />
                </View>
              </TouchableOpacity>

              {/* Feedback button */}
              <TouchableOpacity
                style={[styles.menuRow, { borderBottomWidth: 0 }]}
                onPress={() => setFeedbackModalOpen(true)}
              >
                <View style={styles.menuRowLeft}>
                  <MessageSquare size={18} color={theme.textSecondary} style={{ marginRight: 10 }} />
                  <ThemedText style={styles.menuRowText}>Send Feedback & Suggestions</ThemedText>
                </View>
                <View style={styles.menuRowRight}>
                  <ChevronRight size={16} color={theme.textSecondary} />
                </View>
              </TouchableOpacity>
            </View>
          </GlassCard>

          {/* Security Settings Card (Only for Google accounts) */}
          {googleId && (
            <GlassCard style={styles.settingsCard}>
              <View style={styles.cardHeader}>
                <Shield size={20} color="#f59e0b" style={{ marginRight: 8 }} />
                <ThemedText type="smallBold">Security Settings</ThemedText>
              </View>
              <View style={styles.cardBody}>
                <View style={[styles.switchRow, { borderBottomWidth: 0 }]}>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={styles.switchTitle} type="smallBold">Allow Password Sign-In</ThemedText>
                    <ThemedText style={styles.switchDesc} themeColor="textSecondary">
                      Enable logging in with both Google and your email/password.
                    </ThemedText>
                  </View>
                  {settingsBusy ? (
                    <ActivityIndicator size="small" color="#f59e0b" />
                  ) : (
                    <Switch value={allowPasswordLogin} onValueChange={handleToggleAllowPassword} />
                  )}
                </View>

                {/* Inline Set Password Form if they toggle on but don't have password yet */}
                {showSetPasswordForm && !hasPassword && (
                  <View style={{ marginTop: Spacing.two, gap: Spacing.two }}>
                    <ThemedText type="small" style={{ color: '#f59e0b', fontWeight: 'bold' }}>
                      Please set a password to enable email & password sign-in:
                    </ThemedText>
                    
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
                        value={setNewPass}
                        onChangeText={setSetNewPass}
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
                        value={setConfirmPass}
                        onChangeText={setSetConfirmPass}
                        secureTextEntry
                        placeholder="Repeat password"
                        placeholderTextColor={theme.textSecondary}
                      />
                    </View>

                    <View style={{ flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.one }}>
                      <TouchableOpacity
                        style={[styles.passwordButton, { flex: 1, backgroundColor: '#3c87f7', marginTop: 0 }, setPassBusy && { opacity: 0.7 }]}
                        onPress={handleSetPasswordSubmit}
                        disabled={setPassBusy}>
                        {setPassBusy ? (
                          <ActivityIndicator color="#fff" />
                        ) : (
                          <ThemedText style={{ color: '#fff', fontWeight: 'bold', textAlign: 'center' }}>Set & Enable</ThemedText>
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.passwordButton, { flex: 1, backgroundColor: '#ef4444', marginTop: 0 }]}
                        onPress={() => {
                          setShowSetPasswordForm(false);
                          setSetNewPass('');
                          setSetConfirmPass('');
                        }}
                        disabled={setPassBusy}>
                        <ThemedText style={{ color: '#fff', fontWeight: 'bold', textAlign: 'center' }}>Cancel</ThemedText>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            </GlassCard>
          )}

          {/* Password Card (Only if they registered via email/password or have enabled password for Google) */}
          {(!googleId || hasPassword) && (
            <GlassCard style={styles.settingsCard}>
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
            </GlassCard>
          )}

          {/* Logout Button */}
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <LogOut size={18} color="#fff" style={{ marginRight: Spacing.two }} />
            <ThemedText style={{ color: '#fff', fontWeight: 'bold' }}>Sign Out</ThemedText>
          </TouchableOpacity>
        </ScrollView>

        {/* Pending Tasks Modal */}
        <Modal visible={pendingModalOpen} animationType="slide" transparent>
          <ThemedView style={styles.modalBg}>
            <SafeAreaView style={styles.modalSafeArea}>
              <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
                <View style={styles.modalHeader}>
                  <ThemedText type="subtitle">Pending Tasks</ThemedText>
                  <TouchableOpacity onPress={() => setPendingModalOpen(false)}>
                    <X size={24} color={theme.text} />
                  </TouchableOpacity>
                </View>

                {fetchingPending ? (
                  <ActivityIndicator style={{ flex: 1 }} color="#3c87f7" size="large" />
                ) : pendingTasks.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <ThemedText themeColor="textSecondary" style={styles.emptyText}>
                      All caught up! No pending tasks. 🧘
                    </ThemedText>
                  </View>
                ) : (
                  <ScrollView contentContainerStyle={styles.modalFormScroll} showsVerticalScrollIndicator={false}>
                    {pendingTasks.map((t) => (
                      <View key={t.id} style={[styles.taskItem, { borderColor: theme.backgroundSelected }]}>
                        <View style={styles.taskLeft}>
                          {/* Complete Checkbox */}
                          <TouchableOpacity onPress={() => handleCompletePendingTask(t)} style={styles.checkbox}>
                            <Circle size={18} color={theme.textSecondary} />
                          </TouchableOpacity>

                          <View style={{ flex: 1 }}>
                            <ThemedText style={styles.taskTitle}>{t.title}</ThemedText>
                            <View style={styles.taskMetaRow}>
                              <Clock size={11} color={theme.textSecondary} style={{ marginRight: 3 }} />
                              <ThemedText type="code" style={styles.taskMetaText}>
                                {t.date} · {t.startTime}–{t.endTime}
                              </ThemedText>
                            </View>
                            
                            <TouchableOpacity style={styles.skipButton} onPress={() => handleSkipPendingTask(t)}>
                              <ThemedText type="code" style={styles.skipButtonText} themeColor="textSecondary">
                                Skip Task
                              </ThemedText>
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    ))}
                  </ScrollView>
                )}
              </View>
            </SafeAreaView>
          </ThemedView>
        </Modal>

        {/* Feedback Modal */}
        <Modal visible={feedbackModalOpen} animationType="slide" transparent>
          <ThemedView style={styles.modalBg}>
            <SafeAreaView style={styles.modalSafeArea}>
              <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
                <View style={styles.modalHeader}>
                  <ThemedText type="subtitle">Send Feedback</ThemedText>
                  <TouchableOpacity onPress={() => setFeedbackModalOpen(false)}>
                    <X size={24} color={theme.text} />
                  </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={styles.modalFormScroll} showsVerticalScrollIndicator={false}>
                  {/* Category Selection */}
                  <View style={styles.inputGroup}>
                    <ThemedText type="smallBold" style={styles.label}>Feedback Category</ThemedText>
                    <View style={styles.categoryContainer}>
                      {(['feedback', 'suggestion', 'report', 'appreciation'] as const).map((cat) => {
                        const isActive = feedbackType === cat;
                        return (
                          <TouchableOpacity
                            key={cat}
                            style={[
                              styles.categoryBtn,
                              { borderColor: theme.backgroundSelected },
                              isActive && { backgroundColor: '#3c87f7', borderColor: '#3c87f7' }
                            ]}
                            onPress={() => setFeedbackType(cat)}
                          >
                            <ThemedText
                              style={[
                                styles.categoryBtnText,
                                { color: isActive ? '#fff' : theme.text }
                              ]}
                            >
                              {cat}
                            </ThemedText>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  {/* Subject */}
                  <View style={styles.inputGroup}>
                    <ThemedText type="smallBold" style={styles.label}>Subject</ThemedText>
                    <TextInput
                      style={[
                        styles.textInput,
                        {
                          borderColor: theme.backgroundSelected,
                          color: theme.text,
                          backgroundColor: theme.backgroundElement,
                        },
                      ]}
                      value={feedbackTitle}
                      onChangeText={setFeedbackTitle}
                      placeholder="Brief summary..."
                      placeholderTextColor={theme.textSecondary}
                    />
                  </View>

                  {/* Details */}
                  <View style={styles.inputGroup}>
                    <ThemedText type="smallBold" style={styles.label}>Details</ThemedText>
                    <TextInput
                      style={[
                        styles.textInput,
                        styles.textArea,
                        {
                          borderColor: theme.backgroundSelected,
                          color: theme.text,
                          backgroundColor: theme.backgroundElement,
                        },
                      ]}
                      value={feedbackContent}
                      onChangeText={setFeedbackContent}
                      multiline
                      numberOfLines={4}
                      placeholder="Describe your request, issue, or feedback..."
                      placeholderTextColor={theme.textSecondary}
                    />
                  </View>

                  <TouchableOpacity
                    style={styles.saveButton}
                    onPress={handleSubmitFeedback}
                    disabled={submittingFeedback}
                  >
                    {submittingFeedback ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <ThemedText style={styles.saveButtonText}>Send Feedback</ThemedText>
                    )}
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </SafeAreaView>
          </ThemedView>
        </Modal>
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
  themeSelectorRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.one,
    justifyContent: 'space-between',
  },
  themeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
    borderRadius: Spacing.one,
    borderWidth: 1,
  },
  themeButtonText: {
    fontSize: 13,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
  },
  menuRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  menuRowText: {
    fontSize: 14,
    fontWeight: '500',
  },
  badge: {
    backgroundColor: '#ef4444',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  categoryBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  categoryBtnText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  modalBg: {
    flex: 1,
    backgroundColor: '#00000060',
  },
  modalSafeArea: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    height: '80%',
    borderTopLeftRadius: Spacing.three,
    borderTopRightRadius: Spacing.three,
    padding: Spacing.four,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: '#00000010',
    paddingBottom: Spacing.three,
    marginBottom: Spacing.two,
  },
  modalFormScroll: {
    paddingBottom: Spacing.six,
    gap: Spacing.three,
  },
  textArea: {
    height: 100,
    paddingTop: Spacing.two,
    textAlignVertical: 'top',
  },
  saveButton: {
    height: 50,
    backgroundColor: '#3c87f7',
    borderRadius: Spacing.one,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.three,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.four,
  },
  emptyText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    paddingVertical: Spacing.three,
    gap: Spacing.two,
  },
  taskLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    gap: Spacing.two,
  },
  checkbox: {
    marginTop: 2,
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  taskMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.half,
    gap: Spacing.one,
  },
  taskMetaText: {
    fontSize: 11,
  },
  skipButton: {
    marginTop: Spacing.one,
    alignSelf: 'flex-start',
  },
  skipButtonText: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: 'bold',
  },
});
