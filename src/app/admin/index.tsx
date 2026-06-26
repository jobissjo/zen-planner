import { useCallback, useState } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Shield, Users, ListChecks, CheckCircle, Flame, LogOut } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/api';
import { Spacing } from '@/constants/theme';
import type { Task, User as AppUser } from '@/types';

export default function AdminOverviewScreen() {
  const { logout } = useAuth();
  const theme = useTheme();
  const router = useRouter();

  // State
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  const fetchAdminData = useCallback(async () => {
    try {
      const [usersRes, tasksRes] = await Promise.all([
        api.listUsers(),
        api.listAllTasks(),
      ]);
      setUsers(usersRes);
      setTasks(tasksRes);
    } catch (e) {
      console.error('Failed to fetch admin overview data', e);
    } finally {
      setLoading(false);
    }
  }, []);

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

          {/* Activity Logs Card */}
          <View style={[styles.logsCard, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="smallBold" style={styles.logsCardTitle}>
              Recent Activity Logs
            </ThemedText>

            <View style={styles.logsList}>
              {recentTasks.length === 0 ? (
                <ThemedText themeColor="textSecondary" style={styles.emptyText}>
                  No user tasks found.
                </ThemedText>
              ) : (
                recentTasks.map((t) => {
                  const owner = users.find((u) => u.id === t.userId);
                  return (
                    <View key={t.id} style={[styles.logRow, { borderColor: theme.backgroundSelected }]}>
                      <View style={{ flex: 1 }}>
                        <ThemedText type="smallBold" numberOfLines={1}>
                          {t.title}
                        </ThemedText>
                        <ThemedText themeColor="textSecondary" style={styles.logOwner}>
                          By: {owner?.name || 'Unknown User'} ({t.date})
                        </ThemedText>
                      </View>
                      <View style={{ alignItems: 'flex-end', gap: Spacing.half }}>
                        <View style={[styles.tag, { backgroundColor: t.status === 'completed' ? '#10b98120' : '#6b728020' }]}>
                          <ThemedText style={{ color: t.status === 'completed' ? '#10b981' : theme.textSecondary, fontSize: 9, fontWeight: 'bold' }}>
                            {t.status}
                          </ThemedText>
                        </View>
                        <ThemedText type="code" style={styles.priorityText}>
                          {t.priority}
                        </ThemedText>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </View>
        </ScrollView>
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
  logsCard: {
    borderRadius: Spacing.two,
    padding: Spacing.three,
  },
  logsCardTitle: {
    fontSize: 15,
    marginBottom: Spacing.two,
  },
  logsList: {
    gap: Spacing.one,
  },
  emptyText: {
    fontSize: 13,
    fontStyle: 'italic',
    paddingVertical: Spacing.two,
  },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
  },
  logOwner: {
    fontSize: 11,
    marginTop: 2,
  },
  tag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  priorityText: {
    fontSize: 8,
    textTransform: 'uppercase',
  },
});
