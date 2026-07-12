import { useCallback, useState } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  Switch,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Shield, Users, ListChecks, CheckCircle, Flame, LogOut, Megaphone, MessageSquare, Plus, Trash2, X, ChevronRight, Sparkles } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/api';
import { Spacing } from '@/constants/theme';
import type { Task, User as AppUser, Announcement, Feedback, FeedbackStatus } from '@/types';
import { GlassCard } from '@/components/glass-card';

export default function AdminOverviewScreen() {
  const { logout } = useAuth();
  const theme = useTheme();
  const router = useRouter();

  // State
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  // Announcements State
  const [announcementsModalOpen, setAnnouncementsModalOpen] = useState(false);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [fetchingAnnouncements, setFetchingAnnouncements] = useState(false);
  const [isCreatingAnn, setIsCreatingAnn] = useState(false);
  const [newAnnTitle, setNewAnnTitle] = useState('');
  const [newAnnDesc, setNewAnnDesc] = useState('');
  const [newAnnBanner, setNewAnnBanner] = useState('');
  const [savingAnn, setSavingAnn] = useState(false);

  // Feedback State
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [fetchingFeedback, setFetchingFeedback] = useState(false);

  // Streak Rules and Motivations counts
  const [rulesCount, setRulesCount] = useState({ total: 0, active: 0, inactive: 0 });
  const [motivationsCount, setMotivationsCount] = useState({ total: 0, active: 0, inactive: 0 });

  const fetchAdminData = useCallback(async () => {
    try {
      const [usersRes, tasksRes, rulesRes, motivationsRes, feedbackRes, announcementsRes] = await Promise.all([
        api.listUsers(),
        api.listAllTasks(),
        api.adminListStreakRules(),
        api.adminListMotivations(),
        api.adminListFeedback(),
        api.adminListAnnouncements(),
      ]);
      setUsers(usersRes);
      setTasks(tasksRes);

      const totalRules = rulesRes.length;
      const activeRules = rulesRes.filter((r) => r.is_active).length;
      setRulesCount({
        total: totalRules,
        active: activeRules,
        inactive: totalRules - activeRules,
      });

      const totalMots = motivationsRes.length;
      const activeMots = motivationsRes.filter((m) => m.is_active).length;
      setMotivationsCount({
        total: totalMots,
        active: activeMots,
        inactive: totalMots - activeMots,
      });

      setFeedbacks(feedbackRes);
      setAnnouncements(announcementsRes);
    } catch (e) {
      console.error('Failed to fetch admin overview data', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAnnouncements = async () => {
    setFetchingAnnouncements(true);
    try {
      const data = await api.adminListAnnouncements();
      setAnnouncements(data);
    } catch (e) {
      console.error('Failed to fetch admin announcements', e);
    } finally {
      setFetchingAnnouncements(false);
    }
  };

  const fetchFeedbackList = async () => {
    setFetchingFeedback(true);
    try {
      const data = await api.adminListFeedback();
      setFeedbacks(data);
    } catch (e) {
      console.error('Failed to fetch admin feedback', e);
    } finally {
      setFetchingFeedback(false);
    }
  };

  async function handleToggleAnnActive(ann: Announcement) {
    try {
      const nextActive = !ann.isActive;
      await api.adminUpdateAnnouncement(ann.id, { isActive: nextActive });
      setAnnouncements((prev) =>
        prev.map((item) => (item.id === ann.id ? { ...item, isActive: nextActive } : item))
      );
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update announcement');
    }
  }

  async function handleDeleteAnn(annId: string) {
    Alert.alert('Delete Announcement', 'Are you sure you want to delete this announcement?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.adminDeleteAnnouncement(annId);
            setAnnouncements((prev) => prev.filter((item) => item.id !== annId));
          } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to delete announcement');
          }
        },
      },
    ]);
  }

  async function handleCreateAnnouncement() {
    if (!newAnnTitle.trim() || !newAnnDesc.trim()) {
      Alert.alert('Error', 'Please fill in Title and Description.');
      return;
    }
    setSavingAnn(true);
    try {
      const created = await api.adminCreateAnnouncement({
        title: newAnnTitle,
        description: newAnnDesc,
        bannerUrl: newAnnBanner.trim() || undefined,
        isActive: true,
      });
      setAnnouncements((prev) => [created, ...prev]);
      setNewAnnTitle('');
      setNewAnnDesc('');
      setNewAnnBanner('');
      setIsCreatingAnn(false);
      Alert.alert('Success', 'Announcement created!');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to create announcement');
    } finally {
      setSavingAnn(false);
    }
  }

  async function handleUpdateFeedbackStatus(fbId: string, status: FeedbackStatus) {
    try {
      const updated = await api.adminUpdateFeedbackStatus(fbId, status);
      setFeedbacks((prev) => prev.map((item) => (item.id === fbId ? updated : item)));
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update feedback status');
    }
  }

  async function handleDeleteFeedback(fbId: string) {
    Alert.alert('Delete Feedback', 'Are you sure you want to delete this feedback item?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.adminDeleteFeedback(fbId);
            setFeedbacks((prev) => prev.filter((item) => item.id !== fbId));
          } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to delete feedback');
          }
        },
      },
    ]);
  }

  useFocusEffect(
    useCallback(() => {
      fetchAdminData();
    }, [fetchAdminData])
  );

  // Computations
  const totalUsers = users.filter((u) => u.role === 'user').length;
  const totalTasks = tasks.length;
  const completedTasksCount = tasks.filter((t) => t.status === 'completed').length;
  const avgStreak =
    totalUsers === 0
      ? 0
      : Math.round(
          users
            .filter((u) => u.role === 'user')
            .reduce((sum, u) => sum + (u.streakCount ?? 0), 0) / totalUsers
        );

  const recentTasks = tasks.slice(-8).reverse();

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10b981" />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.one }}>
            <Shield size={22} color="#10b981" />
            <View>
              <ThemedText type="subtitle" style={styles.headerTitle}>
                Admin Portal
              </ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.headerSub}>
                System Overview Dashboard
              </ThemedText>
            </View>
          </View>
          <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
            <LogOut size={16} color="#fff" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Metrics Grid */}
          <View style={styles.statsGrid}>
            <StatCard label="Total Users" value={totalUsers} icon={<Users size={16} color="#3c87f7" />} />
            <StatCard label="Total Tasks" value={totalTasks} icon={<ListChecks size={16} color="#10b981" />} />
            <StatCard label="Completed" value={completedTasksCount} icon={<CheckCircle size={16} color="#10b981" />} />
            <StatCard label="Avg Streak" value={`${avgStreak} d`} icon={<Flame size={16} color="#ef4444" />} />
          </View>

          {/* User Management Card */}
          <GlassCard style={styles.actionCard}>
            <View style={styles.actionCardHeader}>
              <View style={styles.actionCardTitleRow}>
                <View style={[styles.actionIconBg, { backgroundColor: '#3c87f715' }]}>
                  <Users size={18} color="#3c87f7" />
                </View>
                <ThemedText type="smallBold" style={styles.actionTitle}>User Management</ThemedText>
              </View>
              <View style={styles.countBadge}>
                <ThemedText style={styles.countBadgeText}>{users.length} Accounts</ThemedText>
              </View>
            </View>
            <ThemedText themeColor="textSecondary" style={styles.actionDesc}>
              Monitor registered user accounts, streaks, and streak freezes.
            </ThemedText>
            <View style={styles.bulletContainer}>
              <ThemedText themeColor="textSecondary" style={styles.bulletText}>
                · Users: <ThemedText type="smallBold">{users.filter((u) => u.role === 'user').length}</ThemedText>
              </ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.bulletText}>
                · Administrators: <ThemedText type="smallBold">{users.filter((u) => u.role === 'admin').length}</ThemedText>
              </ThemedText>
            </View>
            <TouchableOpacity style={[styles.cardActionBtn, { borderColor: theme.backgroundSelected }]} onPress={() => router.push('/admin/users')}>
              <ThemedText style={[styles.cardActionBtnText, { color: theme.text }]}>Manage Users →</ThemedText>
            </TouchableOpacity>
          </GlassCard>

          {/* Streak Rules Card */}
          <GlassCard style={styles.actionCard}>
            <View style={styles.actionCardHeader}>
              <View style={styles.actionCardTitleRow}>
                <View style={[styles.actionIconBg, { backgroundColor: '#ef444415' }]}>
                  <Flame size={18} color="#ef4444" />
                </View>
                <ThemedText type="smallBold" style={styles.actionTitle}>Streak Rules</ThemedText>
              </View>
              <View style={styles.countBadge}>
                <ThemedText style={styles.countBadgeText}>{rulesCount.total} Rules</ThemedText>
              </View>
            </View>
            <ThemedText themeColor="textSecondary" style={styles.actionDesc}>
              Configure milestone rules that grant streak freezes to users.
            </ThemedText>
            <View style={styles.bulletContainer}>
              <ThemedText themeColor="textSecondary" style={styles.bulletText}>
                · Active Milestones: <ThemedText type="smallBold">{rulesCount.active}</ThemedText>
              </ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.bulletText}>
                · Inactive Milestones: <ThemedText type="smallBold">{rulesCount.inactive}</ThemedText>
              </ThemedText>
            </View>
            <TouchableOpacity style={[styles.cardActionBtn, { borderColor: theme.backgroundSelected }]} onPress={() => router.push('/admin/rewards')}>
              <ThemedText style={[styles.cardActionBtnText, { color: theme.text }]}>Manage Rules →</ThemedText>
            </TouchableOpacity>
          </GlassCard>

          {/* Motivation Quotes Card */}
          <GlassCard style={styles.actionCard}>
            <View style={styles.actionCardHeader}>
              <View style={styles.actionCardTitleRow}>
                <View style={[styles.actionIconBg, { backgroundColor: '#f59e0b15' }]}>
                  <Sparkles size={18} color="#f59e0b" />
                </View>
                <ThemedText type="smallBold" style={styles.actionTitle}>Motivation Quotes</ThemedText>
              </View>
              <View style={styles.countBadge}>
                <ThemedText style={styles.countBadgeText}>{motivationsCount.total} Quotes</ThemedText>
              </View>
            </View>
            <ThemedText themeColor="textSecondary" style={styles.actionDesc}>
              Manage motivational quotes shown on user dashboards to inspire completion.
            </ThemedText>
            <View style={styles.bulletContainer}>
              <ThemedText themeColor="textSecondary" style={styles.bulletText}>
                · Active Quotes: <ThemedText type="smallBold">{motivationsCount.active}</ThemedText>
              </ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.bulletText}>
                · Inactive Quotes: <ThemedText type="smallBold">{motivationsCount.inactive}</ThemedText>
              </ThemedText>
            </View>
            <TouchableOpacity style={[styles.cardActionBtn, { borderColor: theme.backgroundSelected }]} onPress={() => router.push('/admin/motivations')}>
              <ThemedText style={[styles.cardActionBtnText, { color: theme.text }]}>Manage Quotes →</ThemedText>
            </TouchableOpacity>
          </GlassCard>

          {/* User Feedback Card */}
          <GlassCard style={styles.actionCard}>
            <View style={styles.actionCardHeader}>
              <View style={styles.actionCardTitleRow}>
                <View style={[styles.actionIconBg, { backgroundColor: '#ec489915' }]}>
                  <MessageSquare size={18} color="#ec4899" />
                </View>
                <ThemedText type="smallBold" style={styles.actionTitle}>User Feedback</ThemedText>
              </View>
              <View style={styles.countBadge}>
                <ThemedText style={styles.countBadgeText}>{feedbacks.length} Items</ThemedText>
              </View>
            </View>
            <ThemedText themeColor="textSecondary" style={styles.actionDesc}>
              Review bug reports, feature requests, appreciation, and support messages.
            </ThemedText>
            <View style={styles.bulletContainer}>
              <ThemedText themeColor="textSecondary" style={styles.bulletText}>
                · Pending Actions: <ThemedText type="smallBold">{feedbacks.filter(f => f.status === 'pending').length}</ThemedText>
              </ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.bulletText}>
                · Total Feedback: <ThemedText type="smallBold">{feedbacks.length}</ThemedText>
              </ThemedText>
            </View>
            <TouchableOpacity
              style={[styles.cardActionBtn, { borderColor: theme.backgroundSelected }]}
              onPress={() => {
                fetchFeedbackList();
                setFeedbackModalOpen(true);
              }}
            >
              <ThemedText style={[styles.cardActionBtnText, { color: theme.text }]}>View Feedback →</ThemedText>
            </TouchableOpacity>
          </GlassCard>

          {/* Announcements Card */}
          <GlassCard style={styles.actionCard}>
            <View style={styles.actionCardHeader}>
              <View style={styles.actionCardTitleRow}>
                <View style={[styles.actionIconBg, { backgroundColor: '#10b98115' }]}>
                  <Megaphone size={18} color="#10b981" />
                </View>
                <ThemedText type="smallBold" style={styles.actionTitle}>Announcements</ThemedText>
              </View>
              <View style={styles.countBadge}>
                <ThemedText style={styles.countBadgeText}>{announcements.length} Total</ThemedText>
              </View>
            </View>
            <ThemedText themeColor="textSecondary" style={styles.actionDesc}>
              Broadcast alerts, system updates, banner notices, and announcements to users.
            </ThemedText>
            <View style={styles.bulletContainer}>
              <ThemedText themeColor="textSecondary" style={styles.bulletText}>
                · Active Notices: <ThemedText type="smallBold">{announcements.filter(a => a.isActive).length}</ThemedText>
              </ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.bulletText}>
                · Inactive Notices: <ThemedText type="smallBold">{announcements.filter(a => !a.isActive).length}</ThemedText>
              </ThemedText>
            </View>
            <TouchableOpacity
              style={[styles.cardActionBtn, { borderColor: theme.backgroundSelected }]}
              onPress={() => {
                fetchAnnouncements();
                setAnnouncementsModalOpen(true);
              }}
            >
              <ThemedText style={[styles.cardActionBtnText, { color: theme.text }]}>Manage Announcements →</ThemedText>
            </TouchableOpacity>
          </GlassCard>
        </ScrollView>

        {/* Manage Announcements Modal */}
        <Modal visible={announcementsModalOpen} animationType="slide" transparent>
          <ThemedView style={styles.modalBg}>
            <SafeAreaView style={styles.modalSafeArea}>
              <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
                <View style={styles.modalHeader}>
                  <ThemedText type="subtitle">Manage Announcements</ThemedText>
                  <TouchableOpacity onPress={() => setAnnouncementsModalOpen(false)}>
                    <X size={24} color={theme.text} />
                  </TouchableOpacity>
                </View>

                {/* Sub-form to Create Announcement */}
                {isCreatingAnn ? (
                  <View style={[styles.createForm, { borderColor: theme.backgroundSelected }]}>
                    <ThemedText type="smallBold" style={styles.formTitle}>New Announcement</ThemedText>
                    <TextInput
                      style={[styles.modalInput, { borderColor: theme.backgroundSelected, color: theme.text, backgroundColor: theme.backgroundElement }]}
                      placeholder="Title..."
                      placeholderTextColor={theme.textSecondary}
                      value={newAnnTitle}
                      onChangeText={setNewAnnTitle}
                    />
                    <TextInput
                      style={[styles.modalInput, styles.textAreaInput, { borderColor: theme.backgroundSelected, color: theme.text, backgroundColor: theme.backgroundElement }]}
                      placeholder="Description..."
                      placeholderTextColor={theme.textSecondary}
                      value={newAnnDesc}
                      onChangeText={setNewAnnDesc}
                      multiline
                      numberOfLines={3}
                    />
                    <TextInput
                      style={[styles.modalInput, { borderColor: theme.backgroundSelected, color: theme.text, backgroundColor: theme.backgroundElement }]}
                      placeholder="Banner Image URL (optional)..."
                      placeholderTextColor={theme.textSecondary}
                      value={newAnnBanner}
                      onChangeText={setNewAnnBanner}
                    />
                    <View style={styles.formButtons}>
                      <TouchableOpacity style={[styles.formBtn, styles.cancelBtn]} onPress={() => setIsCreatingAnn(false)}>
                        <ThemedText style={{ color: theme.text }}>Cancel</ThemedText>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.formBtn, styles.submitBtn]} onPress={handleCreateAnnouncement} disabled={savingAnn}>
                        {savingAnn ? <ActivityIndicator color="#fff" /> : <ThemedText style={{ color: '#fff', fontWeight: 'bold' }}>Create</ThemedText>}
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => setIsCreatingAnn(true)}
                  >
                    <Plus size={16} color="#fff" style={{ marginRight: 6 }} />
                    <ThemedText style={styles.addButtonText}>Add Announcement</ThemedText>
                  </TouchableOpacity>
                )}

                {fetchingAnnouncements ? (
                  <ActivityIndicator style={{ flex: 1 }} color="#10b981" size="large" />
                ) : announcements.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <ThemedText themeColor="textSecondary" style={styles.emptyText}>
                      No announcements posted.
                    </ThemedText>
                  </View>
                ) : (
                  <ScrollView contentContainerStyle={styles.modalFormScroll} showsVerticalScrollIndicator={false}>
                    {announcements.map((ann) => (
                      <View key={ann.id} style={[styles.announcementItem, { borderColor: theme.backgroundSelected }]}>
                        <View style={{ flex: 1 }}>
                          <ThemedText type="smallBold" style={styles.itemTitle}>{ann.title}</ThemedText>
                          <ThemedText themeColor="textSecondary" style={styles.itemDesc}>{ann.description}</ThemedText>
                        </View>
                        
                        <View style={styles.itemActions}>
                          <Switch
                            value={ann.isActive}
                            onValueChange={() => handleToggleAnnActive(ann)}
                          />
                          <TouchableOpacity onPress={() => handleDeleteAnn(ann.id)} style={styles.deleteBtn}>
                            <Trash2 size={16} color="#ef4444" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </ScrollView>
                )}
              </View>
            </SafeAreaView>
          </ThemedView>
        </Modal>

        {/* View User Feedback Modal */}
        <Modal visible={feedbackModalOpen} animationType="slide" transparent>
          <ThemedView style={styles.modalBg}>
            <SafeAreaView style={styles.modalSafeArea}>
              <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
                <View style={styles.modalHeader}>
                  <ThemedText type="subtitle">User Feedback Portal</ThemedText>
                  <TouchableOpacity onPress={() => setFeedbackModalOpen(false)}>
                    <X size={24} color={theme.text} />
                  </TouchableOpacity>
                </View>

                {fetchingFeedback ? (
                  <ActivityIndicator style={{ flex: 1 }} color="#10b981" size="large" />
                ) : feedbacks.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <ThemedText themeColor="textSecondary" style={styles.emptyText}>
                      No user feedback received.
                    </ThemedText>
                  </View>
                ) : (
                  <ScrollView contentContainerStyle={styles.modalFormScroll} showsVerticalScrollIndicator={false}>
                    {feedbacks.map((fb) => (
                      <View key={fb.id} style={[styles.feedbackItem, { borderColor: theme.backgroundSelected }]}>
                        <View style={styles.feedbackItemHeader}>
                          <View style={[styles.tag, { backgroundColor: fb.status === 'resolved' ? '#10b98120' : fb.status === 'in_progress' ? '#3c87f720' : '#f59e0b20' }]}>
                            <ThemedText style={{ color: fb.status === 'resolved' ? '#10b981' : fb.status === 'in_progress' ? '#3c87f7' : '#f59e0b', fontSize: 10, fontWeight: 'bold', textTransform: 'capitalize' }}>
                              {fb.status.replace('_', ' ')}
                            </ThemedText>
                          </View>
                          <ThemedText type="code" style={styles.feedbackCatText}>
                            {fb.type}
                          </ThemedText>
                        </View>

                        <ThemedText type="smallBold" style={styles.feedbackTitle}>{fb.title}</ThemedText>
                        <ThemedText themeColor="textSecondary" style={styles.feedbackContentText}>{fb.content}</ThemedText>
                        
                        <ThemedText themeColor="textSecondary" style={styles.feedbackMeta}>
                          From: {fb.userName} ({fb.userEmail})
                        </ThemedText>

                        {/* Status update buttons */}
                        <View style={styles.feedbackActions}>
                          {fb.status === 'pending' && (
                            <TouchableOpacity
                              style={[styles.actionBtn, { borderColor: '#3c87f7' }]}
                              onPress={() => handleUpdateFeedbackStatus(fb.id, 'in_progress')}
                            >
                              <ThemedText style={{ color: '#3c87f7', fontSize: 11, fontWeight: '600' }}>In Progress</ThemedText>
                            </TouchableOpacity>
                          )}
                          {fb.status !== 'resolved' && (
                            <TouchableOpacity
                              style={[styles.actionBtn, { borderColor: '#10b981' }]}
                              onPress={() => handleUpdateFeedbackStatus(fb.id, 'resolved')}
                            >
                              <ThemedText style={{ color: '#10b981', fontSize: 11, fontWeight: '600' }}>Resolve</ThemedText>
                            </TouchableOpacity>
                          )}
                          <TouchableOpacity
                            style={[styles.actionBtn, { borderColor: '#ef4444' }]}
                            onPress={() => handleDeleteFeedback(fb.id)}
                          >
                            <Trash2 size={14} color="#ef4444" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </ScrollView>
                )}
              </View>
            </SafeAreaView>
          </ThemedView>
        </Modal>
      </SafeAreaView>
    </ThemedView>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string | number; icon: any }) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statHeader}>
        <ThemedText style={styles.statLabel} themeColor="textSecondary">
          {label}
        </ThemedText>
        {icon}
      </View>
      <ThemedText style={styles.statVal}>{value}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  headerTitle: {
    fontWeight: 'bold',
  },
  headerSub: {
    fontSize: 12,
    marginTop: 2,
  },
  logoutBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.four,
    gap: Spacing.three,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  statCard: {
    width: '48%',
    flexGrow: 1,
    padding: Spacing.three,
    borderRadius: Spacing.two,
    backgroundColor: '#10b98108',
    borderWidth: 1,
    borderColor: '#10b98115',
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statVal: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: Spacing.two,
  },
  emptyText: {
    fontSize: 13,
    fontStyle: 'italic',
    paddingVertical: Spacing.two,
  },
  tag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  actionCard: {
    borderRadius: Spacing.two,
    padding: Spacing.three,
    marginBottom: Spacing.two,
  },
  actionCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  actionCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  actionIconBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTitle: {
    fontSize: 15,
  },
  countBadge: {
    backgroundColor: '#10b98115',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  countBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#10b981',
  },
  actionDesc: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: Spacing.two,
  },
  bulletContainer: {
    gap: Spacing.half,
    marginBottom: Spacing.three,
  },
  bulletText: {
    fontSize: 12,
  },
  cardActionBtn: {
    height: 38,
    borderRadius: Spacing.one,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardActionBtnText: {
    fontSize: 13,
    fontWeight: '600',
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
    height: '85%',
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
  addButton: {
    height: 44,
    backgroundColor: '#10b981',
    borderRadius: Spacing.one,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  createForm: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    padding: Spacing.three,
    gap: Spacing.two,
    marginBottom: Spacing.three,
  },
  formTitle: {
    fontSize: 14,
    marginBottom: Spacing.one,
  },
  modalInput: {
    height: 40,
    borderWidth: 1,
    borderRadius: Spacing.one,
    paddingHorizontal: Spacing.two,
    fontSize: 13,
  },
  textAreaInput: {
    height: 60,
    textAlignVertical: 'top',
    paddingTop: Spacing.one,
  },
  formButtons: {
    flexDirection: 'row',
    gap: Spacing.two,
    justifyContent: 'flex-end',
    marginTop: Spacing.one,
  },
  formBtn: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.one,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: 'transparent',
  },
  submitBtn: {
    backgroundColor: '#10b981',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.four,
  },
  announcementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    paddingVertical: Spacing.three,
    gap: Spacing.two,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  itemDesc: {
    fontSize: 12,
    marginTop: Spacing.half,
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  deleteBtn: {
    padding: Spacing.one,
  },
  feedbackItem: {
    borderBottomWidth: 1,
    paddingVertical: Spacing.three,
    gap: Spacing.one,
  },
  feedbackItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  feedbackCatText: {
    fontSize: 9,
    textTransform: 'uppercase',
    fontWeight: 'bold',
  },
  feedbackTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: Spacing.one,
  },
  feedbackContentText: {
    fontSize: 12,
    marginTop: Spacing.half,
  },
  feedbackMeta: {
    fontSize: 10,
    marginTop: Spacing.one,
  },
  feedbackActions: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  actionBtn: {
    borderWidth: 1,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.one,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
