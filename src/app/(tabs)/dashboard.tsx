import { useCallback, useState } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Platform,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Flame,
  Snowflake,
  ListChecks,
  Clock,
  Sparkles,
  Star,
  TrendingUp,
  CheckCircle,
  Circle,
  Plus,
  Trash2,
  X,
} from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/hooks/use-theme';
import { api, getWeekRange, ymd } from '@/lib/api';
import { Spacing } from '@/constants/theme';
import type { Task, Reward, StreakDayStatus, UserStreak } from '@/types';

export default function DashboardScreen() {
  const { session } = useAuth();
  const theme = useTheme();

  // State
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [streak, setStreak] = useState<UserStreak | null>(null);
  const [streakHistory, setStreakHistory] = useState<StreakDayStatus[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [motivation, setMotivation] = useState<string | null>(null);
  const [loadingMotivation, setLoadingMotivation] = useState(false);

  // Reward Modal State
  const [rewardModalOpen, setRewardModalOpen] = useState(false);
  const [newRewardTitle, setNewRewardTitle] = useState('');
  const [newRewardDesc, setNewRewardDesc] = useState('');
  const [savingReward, setSavingReward] = useState(false);

  const { start, end, days } = getWeekRange();
  const todayStr = ymd(new Date());

  const fetchDashboardData = useCallback(async () => {
    try {
      const startStr = ymd(start);
      const endStr = ymd(end);

      // 14 weeks ago
      const d = new Date();
      d.setDate(d.getDate() - 14 * 7);
      d.setDate(d.getDate() - d.getDay()); // Sunday
      const fourteenWeeksAgoStr = ymd(d);

      const [tasksRes, streakRes, historyRes, rewardsRes] = await Promise.all([
        api.listTasks(startStr, endStr),
        api.getUserStreak(todayStr),
        api.getStreakHistory(fourteenWeeksAgoStr, todayStr),
        api.listRewards(),
      ]);

      setTasks(tasksRes);
      setStreak(streakRes);
      setStreakHistory(historyRes);
      setRewards(rewardsRes);
    } catch (e) {
      console.error('Failed to fetch dashboard data', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchDashboardData();
    }, [fetchDashboardData])
  );

  // Handlers
  async function handleToggleTask(t: Task) {
    const nextStatus = t.status === 'completed' ? 'pending' : 'completed';
    try {
      await api.updateTask(t.id, { status: nextStatus });
      // Refresh local tasks instantly
      setTasks(tasks.map((task) => (task.id === t.id ? { ...task, status: nextStatus } : task)));
      // Re-fetch statistics in background
      const [streakRes, historyRes] = await Promise.all([
        api.getUserStreak(todayStr),
        api.getStreakHistory(ymd(new Date(Date.now() - 14 * 7 * 86400000)), todayStr),
      ]);
      setStreak(streakRes);
      setStreakHistory(historyRes);
    } catch (e) {
      console.error(e);
    }
  }

  async function handleMotivate() {
    setLoadingMotivation(true);
    try {
      const resp = await api.getRandomMotivation();
      setMotivation(resp.data.content);
    } catch (e) {
      console.error(e);
      setMotivation('Keep showing up. Consistency is key.');
    } finally {
      setLoadingMotivation(false);
    }
  }

  async function handleSelectReward(id: string) {
    try {
      await api.selectFavoriteReward(id);
      const rewardsRes = await api.listRewards();
      setRewards(rewardsRes);
      setRewardModalOpen(false);
    } catch (e) {
      console.error(e);
    }
  }

  async function handleCreateReward() {
    if (!newRewardTitle.trim()) return;
    setSavingReward(true);
    try {
      const newReward = await api.createReward(newRewardTitle, newRewardDesc);
      await api.selectFavoriteReward(newReward.id);
      const rewardsRes = await api.listRewards();
      setRewards(rewardsRes);
      setNewRewardTitle('');
      setNewRewardDesc('');
      setRewardModalOpen(false);
    } catch (e) {
      console.error(e);
    } finally {
      setSavingReward(false);
    }
  }

  async function handleDeleteReward(id: string) {
    try {
      await api.deleteReward(id);
      setRewards(rewards.filter((r) => r.id !== id));
    } catch (e) {
      console.error(e);
    }
  }

  // Memoized values
  const stats = api.computeWeeklyStats(tasks);
  const todays = tasks.filter((t) => t.date === todayStr);
  const priority = tasks.filter((t) => t.priority === 'high' && !t.isOptional);
  const optional = tasks.filter((t) => t.isOptional);
  const favoriteReward = rewards.find((r) => r.is_favorite);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const weekRangeLabel = `${start.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })} – ${end.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;

  const renderHeatmap = () => {
    // Split history into columns of 7 days
    const columns: StreakDayStatus[][] = [];
    for (let i = 0; i < streakHistory.length; i += 7) {
      columns.push(streakHistory.slice(i, i + 7));
    }

    return (
      <View style={styles.heatmapContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.heatmapScroll}>
          <View style={styles.dayLabels}>
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
              <ThemedText key={i} style={styles.dayLabel} themeColor="textSecondary">
                {day}
              </ThemedText>
            ))}
          </View>
          {columns.map((col, colIdx) => (
            <View key={colIdx} style={styles.heatmapColumn}>
              {col.map((day) => {
                let color: string = theme.backgroundSelected; // empty
                let borderCol: string = theme.backgroundSelected;
                if (day.status === 'completed') {
                  color = '#10b981';
                  borderCol = '#10b981';
                } else if (day.status === 'freezed') {
                  color = '#38bdf8';
                  borderCol = '#38bdf8';
                } else if (day.status === 'missed') {
                  color = '#ef444420';
                  borderCol = '#ef444430';
                }

                return (
                  <View
                    key={day.date}
                    style={[
                      styles.heatmapBox,
                      { backgroundColor: color, borderColor: borderCol },
                    ]}
                  />
                );
              })}
            </View>
          ))}
        </ScrollView>
        {/* Legend */}
        <View style={styles.legendContainer}>
          <View style={styles.legendItem}>
            <View style={[styles.legendBox, { backgroundColor: theme.backgroundSelected }]} />
            <ThemedText type="code" style={styles.legendText}>Empty</ThemedText>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendBox, { backgroundColor: '#ef444420', borderColor: '#ef444430', borderWidth: 1 }]} />
            <ThemedText type="code" style={styles.legendText}>Missed</ThemedText>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendBox, { backgroundColor: '#38bdf8' }]} />
            <ThemedText type="code" style={styles.legendText}>Freezed</ThemedText>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendBox, { backgroundColor: '#10b981' }]} />
            <ThemedText type="code" style={styles.legendText}>Completed</ThemedText>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3c87f7" />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Greeting Header */}
          <View style={styles.header}>
            <View>
              <ThemedText type="subtitle" style={styles.greetingText}>
                {greeting()}, {session?.user?.first_name?.split(' ')[0] || 'User'} 👋
              </ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.dateLabel}>
                {new Date().toLocaleDateString(undefined, {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
              </ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.weekLabel}>
                Week of {weekRangeLabel}
              </ThemedText>
            </View>

            <TouchableOpacity style={styles.motivateButton} onPress={handleMotivate} disabled={loadingMotivation}>
              <Sparkles size={16} color="#3c87f7" style={{ marginRight: 6 }} />
              <ThemedText type="smallBold" style={{ color: '#3c87f7' }}>
                {loadingMotivation ? '...' : 'Inspire'}
              </ThemedText>
            </TouchableOpacity>
          </View>

          {/* Motivation Quote */}
          {motivation && (
            <View style={[styles.motivationCard, { backgroundColor: '#3c87f710', borderColor: '#3c87f730' }]}>
              <ThemedText style={styles.motivationText}>{"\""}{motivation}{"\""}</ThemedText>
            </View>
          )}

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <StatCard label="This Week" value={stats.totalTasks} icon={<ListChecks size={18} color={theme.text} />} />
            <StatCard label="Completed" value={stats.completed} icon={<CheckCircle size={18} color="#10b981" />} />
            <StatCard label="Pending" value={stats.pending} icon={<Clock size={18} color="#f59e0b" />} />
            <StatCard label="Streak" value={`${streak?.current_streak ?? 0} days`} icon={<Flame size={18} color="#ef4444" />} />
            <StatCard label="Freezes" value={`${streak?.available_freezes ?? 0}`} icon={<Snowflake size={18} color="#38bdf8" />} />
            <StatCard label="Done %" value={`${stats.completionPct}%`} icon={<TrendingUp size={18} color="#3c87f7" />} />
          </View>

          {/* Heatmap Section */}
          <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
            <View style={styles.cardHeader}>
              <Flame size={20} color="#ef4444" style={{ marginRight: 8 }} />
              <ThemedText type="smallBold">Streak Activity Heatmap</ThemedText>
            </View>
            <View style={styles.cardBody}>{renderHeatmap()}</View>
          </View>

          {/* Progress and Reward Row */}
          <View style={styles.progressRow}>
            {/* Weekly Progress Card */}
            <View style={[styles.card, { flex: 1, backgroundColor: theme.backgroundElement }]}>
              <View style={styles.cardHeader}>
                <TrendingUp size={20} color="#3c87f7" style={{ marginRight: 8 }} />
                <ThemedText type="smallBold">Weekly Progress</ThemedText>
              </View>
              <View style={styles.cardBody}>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: `${stats.completionPct}%`, backgroundColor: '#3c87f7' }]} />
                </View>
                <ThemedText style={styles.progressCountText} type="small">
                  {stats.completed} of {stats.totalTasks} tasks completed ({stats.completionPct}%)
                </ThemedText>
                
                {/* Micro daily progress */}
                <View style={styles.dayProgressRow}>
                  {days.map((d) => {
                    const dayTasks = tasks.filter((t) => t.date === ymd(d));
                    const done = dayTasks.filter((t) => t.status === 'completed').length;
                    const pct = dayTasks.length ? (done / dayTasks.length) * 100 : 0;
                    const isToday = ymd(d) === todayStr;

                    return (
                      <View key={d.toISOString()} style={styles.dayProgressItem}>
                        <ThemedText type="code" style={[styles.dayProgressText, isToday && { color: '#3c87f7', fontWeight: 'bold' }]}>
                          {d.toLocaleDateString(undefined, { weekday: 'narrow' })}
                        </ThemedText>
                        <View style={[styles.miniBarBg, isToday && { borderColor: '#3c87f7', borderWidth: 1 }]}>
                          <View style={[styles.miniBarFill, { height: `${pct}%`, backgroundColor: '#3c87f7' }]} />
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            </View>

            {/* Reward Target Card */}
            <View style={[styles.card, { flex: 1, backgroundColor: theme.backgroundElement }]}>
              <View style={styles.cardHeader}>
                <Star size={20} color="#f59e0b" style={{ marginRight: 8 }} />
                <ThemedText type="smallBold">Weekly Reward</ThemedText>
              </View>
              <View style={styles.cardBody}>
                {favoriteReward ? (
                  <>
                    <ThemedText style={styles.rewardTitle} numberOfLines={1}>
                      {favoriteReward.title}
                    </ThemedText>
                    <ThemedText style={styles.rewardDesc} numberOfLines={2} themeColor="textSecondary">
                      {favoriteReward.description || 'No description provided'}
                    </ThemedText>
                    {stats.completionPct >= 80 ? (
                      <View style={[styles.rewardBadge, { backgroundColor: '#10b98120' }]}>
                        <ThemedText style={{ color: '#10b981', fontSize: 12, fontWeight: 'bold' }}>Unlocked 🎉</ThemedText>
                      </View>
                    ) : (
                      <View style={[styles.rewardBadge, { backgroundColor: '#f59e0b20' }]}>
                        <ThemedText style={{ color: '#f59e0b', fontSize: 12, fontWeight: 'bold' }}>
                          Need {Math.max(0, 80 - stats.completionPct)}% more
                        </ThemedText>
                      </View>
                    )}
                  </>
                ) : (
                  <View style={styles.noRewardContainer}>
                    <ThemedText style={styles.noRewardText} themeColor="textSecondary">
                      No reward set
                    </ThemedText>
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.rewardButton, { backgroundColor: theme.backgroundSelected }]}
                  onPress={() => setRewardModalOpen(true)}>
                  <ThemedText type="smallBold" style={styles.rewardButtonText}>
                    Choose Reward
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Tasks Lists */}
          <TaskList title="Today's Tasks" tasks={todays} onToggle={handleToggleTask} emptyMsg="Nothing scheduled today." theme={theme} />
          <TaskList title="High Priority Tasks" tasks={priority} onToggle={handleToggleTask} emptyMsg="No high priority tasks." theme={theme} />
          <TaskList title="Optional Tasks" tasks={optional} onToggle={handleToggleTask} emptyMsg="No optional tasks." theme={theme} />
        </ScrollView>
      </SafeAreaView>

      {/* Choose Reward Modal */}
      <Modal visible={rewardModalOpen} animationType="slide" transparent>
        <ThemedView style={styles.modalBg}>
          <SafeAreaView style={styles.modalSafeArea}>
            <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
              {/* Header */}
              <View style={styles.modalHeader}>
                <ThemedText type="subtitle">Weekly Reward</ThemedText>
                <TouchableOpacity onPress={() => setRewardModalOpen(false)}>
                  <X size={24} color={theme.text} />
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={styles.modalScroll}>
                {/* Suggestions */}
                <View style={styles.modalSection}>
                  <ThemedText type="smallBold" style={styles.sectionTitle} themeColor="textSecondary">
                    Suggested Rewards
                  </ThemedText>
                  {rewards
                    .filter((r) => r.is_generic)
                    .map((r) => (
                      <TouchableOpacity
                        key={r.id}
                        style={[
                          styles.rewardOptionItem,
                          { borderColor: theme.backgroundSelected, backgroundColor: theme.backgroundElement },
                          r.is_favorite && { borderColor: '#f59e0b' },
                        ]}
                        onPress={() => handleSelectReward(r.id)}>
                        <View style={{ flex: 1 }}>
                          <ThemedText type="smallBold">{r.title}</ThemedText>
                          {r.description && (
                            <ThemedText type="code" themeColor="textSecondary">
                              {r.description}
                            </ThemedText>
                          )}
                        </View>
                        {r.is_favorite ? (
                          <View style={[styles.activeTag, { backgroundColor: '#f59e0b' }]}>
                            <ThemedText style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>Active</ThemedText>
                          </View>
                        ) : null}
                      </TouchableOpacity>
                    ))}
                </View>

                {/* Custom Rewards */}
                {rewards.filter((r) => !r.is_generic).length > 0 && (
                  <View style={styles.modalSection}>
                    <ThemedText type="smallBold" style={styles.sectionTitle} themeColor="textSecondary">
                      Custom Rewards
                    </ThemedText>
                    {rewards
                      .filter((r) => !r.is_generic)
                      .map((r) => (
                        <View
                          key={r.id}
                          style={[
                            styles.rewardOptionItem,
                            { borderColor: theme.backgroundSelected, backgroundColor: theme.backgroundElement },
                            r.is_favorite && { borderColor: '#f59e0b' },
                          ]}>
                          <TouchableOpacity style={{ flex: 1 }} onPress={() => handleSelectReward(r.id)}>
                            <ThemedText type="smallBold">{r.title}</ThemedText>
                            {r.description && (
                              <ThemedText type="code" themeColor="textSecondary">
                                {r.description}
                              </ThemedText>
                            )}
                          </TouchableOpacity>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
                            {r.is_favorite ? (
                              <View style={[styles.activeTag, { backgroundColor: '#f59e0b' }]}>
                                <ThemedText style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>Active</ThemedText>
                              </View>
                            ) : null}
                            <TouchableOpacity onPress={() => handleDeleteReward(r.id)}>
                              <Trash2 size={16} color="#ef4444" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))}
                  </View>
                )}

                {/* Create Custom */}
                <View style={[styles.modalSection, styles.createRewardForm]}>
                  <ThemedText type="smallBold" style={styles.sectionTitle}>
                    Create Custom Reward
                  </ThemedText>

                  <TextInput
                    style={[
                      styles.modalInput,
                      {
                        borderColor: theme.backgroundSelected,
                        color: theme.text,
                        backgroundColor: theme.backgroundElement,
                      },
                    ]}
                    placeholder="Reward Title (e.g. Sushi Feast)"
                    placeholderTextColor={theme.textSecondary}
                    value={newRewardTitle}
                    onChangeText={setNewRewardTitle}
                  />

                  <TextInput
                    style={[
                      styles.modalInput,
                      {
                        borderColor: theme.backgroundSelected,
                        color: theme.text,
                        backgroundColor: theme.backgroundElement,
                      },
                    ]}
                    placeholder="Description (Optional)"
                    placeholderTextColor={theme.textSecondary}
                    value={newRewardDesc}
                    onChangeText={setNewRewardDesc}
                  />

                  <TouchableOpacity
                    style={[styles.modalButton, savingReward && { opacity: 0.7 }]}
                    onPress={handleCreateReward}
                    disabled={savingReward}>
                    {savingReward ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <ThemedText style={{ color: '#fff', fontWeight: 'bold' }}>Add Custom Reward</ThemedText>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </SafeAreaView>
        </ThemedView>
      </Modal>
    </ThemedView>
  );
}

// Subcomponents
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

function TaskList({
  title,
  tasks,
  onToggle,
  emptyMsg,
  theme,
}: {
  title: string;
  tasks: Task[];
  onToggle: (t: Task) => void;
  emptyMsg: string;
  theme: any;
}) {
  const priorityColor = (pri: Task['priority']) => {
    switch (pri) {
      case 'high':
        return '#ef4444';
      case 'medium':
        return '#f59e0b';
      case 'low':
        return '#10b981';
      default:
        return '#6b7280';
    }
  };

  return (
    <View style={[styles.taskListCard, { backgroundColor: theme.backgroundElement }]}>
      <ThemedText type="smallBold" style={styles.taskListTitle}>
        {title}
      </ThemedText>
      <View style={styles.taskListContent}>
        {tasks.length === 0 ? (
          <ThemedText themeColor="textSecondary" style={styles.emptyText}>
            {emptyMsg}
          </ThemedText>
        ) : (
          tasks.map((t) => (
            <View key={t.id} style={[styles.taskItem, { borderColor: theme.backgroundSelected }]}>
              <TouchableOpacity onPress={() => onToggle(t)} style={styles.checkboxContainer}>
                {t.status === 'completed' ? (
                  <CheckCircle size={20} color="#10b981" />
                ) : (
                  <Circle size={20} color={theme.textSecondary} />
                )}
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <ThemedText
                  style={[
                    styles.taskTitle,
                    t.status === 'completed' && styles.taskTitleCompleted,
                  ]}>
                  {t.title}
                </ThemedText>
                <View style={styles.taskMetaRow}>
                  <Clock size={12} color={theme.textSecondary} style={{ marginRight: 4 }} />
                  <ThemedText type="code" style={styles.taskMetaText}>
                    {t.startTime}–{t.endTime}
                  </ThemedText>
                  <View
                    style={[
                      styles.taskPriorityTag,
                      { backgroundColor: `${priorityColor(t.priority)}15` },
                    ]}>
                    <ThemedText style={{ color: priorityColor(t.priority), fontSize: 10, fontWeight: 'bold' }}>
                      {t.priority}
                    </ThemedText>
                  </View>
                  {t.isOptional && (
                    <View style={[styles.taskPriorityTag, { backgroundColor: '#6b728015' }]}>
                      <ThemedText style={{ color: theme.textSecondary, fontSize: 10, fontWeight: 'bold' }}>
                        optional
                      </ThemedText>
                    </View>
                  )}
                </View>
              </View>
            </View>
          ))
        )}
      </View>
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
  scrollContent: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.four,
    gap: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  greetingText: {
    fontWeight: 'bold',
  },
  dateLabel: {
    fontSize: 14,
    marginTop: Spacing.half,
  },
  weekLabel: {
    fontSize: 12,
    marginTop: Spacing.half,
  },
  motivateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.four,
    borderWidth: 1,
    borderColor: '#3c87f7',
  },
  motivationCard: {
    padding: Spacing.three,
    borderRadius: Spacing.two,
    borderWidth: 1,
  },
  motivationText: {
    fontSize: 14,
    fontStyle: 'italic',
    fontWeight: '500',
    textAlign: 'center',
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
    backgroundColor: '#3c87f707',
    borderWidth: 1,
    borderColor: '#3c87f712',
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
  card: {
    borderRadius: Spacing.two,
    padding: Spacing.three,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  cardBody: {},
  heatmapContainer: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  heatmapScroll: {
    flexDirection: 'row',
    paddingVertical: Spacing.one,
  },
  dayLabels: {
    justifyContent: 'space-between',
    marginRight: Spacing.two,
    paddingVertical: Spacing.half,
  },
  dayLabel: {
    fontSize: 9,
    textAlign: 'right',
    height: 12,
  },
  heatmapColumn: {
    gap: 4,
    marginRight: 4,
  },
  heatmapBox: {
    width: 12,
    height: 12,
    borderRadius: 2,
    borderWidth: 1,
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    width: '100%',
    gap: Spacing.three,
    marginTop: Spacing.one,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  legendBox: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  legendText: {
    fontSize: 8,
  },
  progressRow: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00000010',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressCountText: {
    fontSize: 11,
    marginTop: Spacing.one,
    textAlign: 'center',
  },
  dayProgressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.two,
  },
  dayProgressItem: {
    alignItems: 'center',
    gap: Spacing.half,
  },
  dayProgressText: {
    fontSize: 9,
  },
  miniBarBg: {
    width: 8,
    height: 36,
    borderRadius: 4,
    backgroundColor: '#00000010',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  miniBarFill: {
    width: '100%',
    borderRadius: 4,
  },
  rewardTitle: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  rewardDesc: {
    fontSize: 12,
    marginTop: Spacing.half,
    height: 32,
  },
  rewardBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Spacing.one,
    marginTop: Spacing.one,
  },
  noRewardContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    height: 48,
  },
  noRewardText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  rewardButton: {
    height: 32,
    borderRadius: Spacing.one,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  rewardButtonText: {
    fontSize: 12,
  },
  taskListCard: {
    padding: Spacing.three,
    borderRadius: Spacing.two,
  },
  taskListTitle: {
    fontSize: 15,
    marginBottom: Spacing.two,
  },
  taskListContent: {
    gap: Spacing.two,
  },
  emptyText: {
    fontSize: 13,
    fontStyle: 'italic',
    paddingVertical: Spacing.one,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    paddingVertical: Spacing.two,
    gap: Spacing.two,
  },
  checkboxContainer: {
    marginTop: Spacing.half,
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  taskMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.half,
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  taskMetaText: {
    fontSize: 10,
  },
  taskPriorityTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
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
    height: '75%',
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
  modalScroll: {
    paddingBottom: Spacing.five,
  },
  modalSection: {
    marginBottom: Spacing.four,
  },
  sectionTitle: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.two,
  },
  rewardOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: Spacing.two,
    borderWidth: 1,
    marginBottom: Spacing.two,
  },
  activeTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  createRewardForm: {
    borderTopWidth: 1,
    borderColor: '#00000010',
    paddingTop: Spacing.four,
    gap: Spacing.two,
  },
  modalInput: {
    height: 48,
    borderWidth: 1,
    borderRadius: Spacing.one,
    paddingHorizontal: Spacing.three,
    fontSize: 14,
  },
  modalButton: {
    height: 48,
    backgroundColor: '#3c87f7',
    borderRadius: Spacing.one,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.one,
  },
});
