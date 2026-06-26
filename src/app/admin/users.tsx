import { useCallback, useState } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Users, BadgeCheck, Flame, Snowflake, ListTodo } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/api';
import { Spacing } from '@/constants/theme';
import type { Task, User as AppUser } from '@/types';

export default function AdminUsersScreen() {
  const theme = useTheme();

  // State
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  const fetchUsersAndTasks = useCallback(async () => {
    try {
      const [usersRes, tasksRes] = await Promise.all([
        api.listUsers(),
        api.listAllTasks(),
      ]);
      setUsers(usersRes);
      setTasks(tasksRes);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchUsersAndTasks();
    }, [fetchUsersAndTasks])
  );

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
            <Users size={22} color="#10b981" />
            <View>
              <ThemedText type="subtitle" style={styles.headerTitle}>
                User Management
              </ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.headerSub}>
                Monitor registered users and engagement
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Users List */}
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {users.map((u) => {
            const userTasks = tasks.filter((t) => t.userId === u.id);
            const completedCount = userTasks.filter((t) => t.status === 'completed').length;

            return (
              <View key={u.id} style={[styles.userCard, { backgroundColor: theme.backgroundElement }]}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <ThemedText type="smallBold" style={styles.nameText}>
                      {u.name}
                    </ThemedText>
                    <ThemedText themeColor="textSecondary" style={styles.emailText}>
                      {u.email}
                    </ThemedText>
                  </View>
                  <View style={[styles.roleBadge, { backgroundColor: u.role === 'admin' ? '#10b98115' : '#6b728015' }]}>
                    <BadgeCheck size={12} color={u.role === 'admin' ? '#10b981' : theme.textSecondary} style={{ marginRight: 4 }} />
                    <ThemedText style={{ color: u.role === 'admin' ? '#10b981' : theme.textSecondary, fontSize: 9, fontWeight: 'bold', textTransform: 'capitalize' }}>
                      {u.role}
                    </ThemedText>
                  </View>
                </View>

                {/* Metrics */}
                {u.role === 'user' && (
                  <View style={[styles.cardBody, { borderColor: theme.backgroundSelected }]}>
                    <View style={styles.metricItem}>
                      <ListTodo size={14} color={theme.textSecondary} />
                      <ThemedText style={styles.metricVal} type="smallBold">
                        {userTasks.length} <ThemedText type="code" style={{ fontSize: 9 }} themeColor="textSecondary">Created</ThemedText>
                      </ThemedText>
                    </View>

                    <View style={styles.metricItem}>
                      <BadgeCheck size={14} color="#10b981" />
                      <ThemedText style={styles.metricVal} type="smallBold">
                        {completedCount} <ThemedText type="code" style={{ fontSize: 9 }} themeColor="textSecondary">Done</ThemedText>
                      </ThemedText>
                    </View>

                    <View style={styles.metricItem}>
                      <Flame size={14} color="#ef4444" />
                      <ThemedText style={[styles.metricVal, { color: '#ef4444' }]} type="smallBold">
                        {u.streakCount ?? 0} <ThemedText type="code" style={{ fontSize: 9, color: '#ef444480' }}>Streak</ThemedText>
                      </ThemedText>
                    </View>

                    <View style={styles.metricItem}>
                      <Snowflake size={14} color="#38bdf8" />
                      <ThemedText style={[styles.metricVal, { color: '#38bdf8' }]} type="smallBold">
                        {u.streakFreezes ?? 0} <ThemedText type="code" style={{ fontSize: 9, color: '#38bdf880' }}>Freezes</ThemedText>
                      </ThemedText>
                    </View>
                  </View>
                )}
              </View>
            );
          })}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
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
  scrollContent: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.five,
    gap: Spacing.two,
  },
  userCard: {
    borderRadius: Spacing.two,
    padding: Spacing.three,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  nameText: {
    fontSize: 15,
  },
  emailText: {
    fontSize: 12,
    marginTop: 2,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  cardBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.three,
    borderTopWidth: 1,
    paddingTop: Spacing.two,
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metricVal: {
    fontSize: 13,
  },
});
