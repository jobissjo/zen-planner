import { useCallback, useState } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Switch,
  Alert,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Plus,
  Clock,
  CheckCircle,
  Circle,
  Pencil,
  Trash2,
  SkipForward,
  X,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { api, getWeekRange, ymd } from '@/lib/api';
import { Spacing } from '@/constants/theme';
import type { Task } from '@/types';
import { GlassCard } from '@/components/glass-card';

export default function PlannerScreen() {
  "use no memo";
  const theme = useTheme();

  // State
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  
  // Dialog State
  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [defaultDate, setDefaultDate] = useState<string>('');

  // Form Fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [taskDate, setTaskDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [priority, setPriority] = useState<Task['priority']>('medium');
  const [isOptional, setIsOptional] = useState(false);
  const [saving, setSaving] = useState(false);

  const { start, end, days } = getWeekRange(currentDate);
  const startStr = ymd(start);
  const endStr = ymd(end);

  const isCurrentWeek = (() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today >= start && today <= new Date(end.getTime() + 86400000);
  })();

  const prevWeek = () => {
    setCurrentDate((d) => {
      const next = new Date(d);
      next.setDate(next.getDate() - 7);
      return next;
    });
  };

  const nextWeek = () => {
    setCurrentDate((d) => {
      const next = new Date(d);
      next.setDate(next.getDate() + 7);
      return next;
    });
  };

  const thisWeek = () => {
    setCurrentDate(new Date());
  };

  /* eslint-disable react-hooks/preserve-manual-memoization */
  const fetchTasks = useCallback(async () => {
    try {
      const data = await api.listTasks(startStr, endStr);
      setTasks(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [startStr, endStr]);
  /* eslint-enable react-hooks/preserve-manual-memoization */

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchTasks();
    }, [fetchTasks])
  );

  // Form Handlers
  function openNewTask(dateStr: string) {
    setEditingTask(null);
    setDefaultDate(dateStr);
    setTitle('');
    setDescription('');
    setTaskDate(dateStr);
    setStartTime('09:00');
    setEndTime('10:00');
    setPriority('medium');
    setIsOptional(false);
    setFormOpen(true);
  }

  function openEditTask(t: Task) {
    setEditingTask(t);
    setTitle(t.title);
    setDescription(t.description || '');
    setTaskDate(t.date);
    setStartTime(t.startTime);
    setEndTime(t.endTime);
    setPriority(t.priority);
    setIsOptional(t.isOptional);
    setFormOpen(true);
  }

  async function handleSaveTask() {
    if (!title.trim() || !taskDate.trim() || !startTime.trim() || !endTime.trim()) {
      Alert.alert('Error', 'Please fill in Title, Date, Start Time and End Time.');
      return;
    }

    setSaving(true);
    const taskValues = {
      title,
      description,
      date: taskDate,
      startTime,
      endTime,
      priority,
      isOptional,
    };

    try {
      if (editingTask) {
        await api.updateTask(editingTask.id, taskValues);
      } else {
        await api.createTask({
          ...taskValues,
          status: 'pending',
        });
      }
      fetchTasks();
      setFormOpen(false);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save task');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleStatus(t: Task) {
    const nextStatus = t.status === 'completed' ? 'pending' : 'completed';
    try {
      await api.updateTask(t.id, { status: nextStatus });
      setTasks(tasks.map((task) => (task.id === t.id ? { ...task, status: nextStatus } : task)));
    } catch (e) {
      console.error(e);
    }
  }

  async function handleSkipTask(t: Task) {
    try {
      await api.updateTask(t.id, { status: 'skipped' });
      setTasks(tasks.map((task) => (task.id === t.id ? { ...task, status: 'skipped' } : task)));
    } catch (e) {
      console.error(e);
    }
  }

  async function handleDeleteTask(t: Task) {
    Alert.alert(
      'Delete Task',
      `Are you sure you want to permanently delete "${t.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteTask(t.id);
              setTasks(tasks.filter((task) => task.id !== t.id));
            } catch (e) {
              console.error(e);
            }
          },
        },
      ]
    );
  }

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
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1, marginRight: Spacing.two }}>
            <ThemedText type="subtitle" style={styles.headerTitle}>
              Weekly Planner
            </ThemedText>
            <View style={styles.rangeContainer}>
              <TouchableOpacity
                onPress={prevWeek}
                style={[styles.navBtn, { backgroundColor: theme.backgroundSelected }]}
                activeOpacity={0.7}
              >
                <ChevronLeft size={12} color={theme.text} />
              </TouchableOpacity>
              <ThemedText themeColor="textSecondary" style={[styles.headerRange, { marginTop: 0 }]}>
                {start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – {end.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </ThemedText>
              <TouchableOpacity
                onPress={nextWeek}
                style={[styles.navBtn, { backgroundColor: theme.backgroundSelected }]}
                activeOpacity={0.7}
              >
                <ChevronRight size={12} color={theme.text} />
              </TouchableOpacity>
              
              {!isCurrentWeek && (
                <TouchableOpacity
                  onPress={thisWeek}
                  style={styles.todayBtn}
                  activeOpacity={0.7}
                >
                  <ThemedText style={styles.todayBtnText}>Today</ThemedText>
                </TouchableOpacity>
              )}
            </View>
          </View>
          <TouchableOpacity style={styles.newButton} onPress={() => openNewTask(ymd(currentDate))}>
            <Plus size={16} color="#fff" style={{ marginRight: 4 }} />
            <ThemedText type="smallBold" style={{ color: '#fff' }}>
              New Task
            </ThemedText>
          </TouchableOpacity>
        </View>

        {/* Days List */}
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {days.map((d) => {
            const dayStr = ymd(d);
            const list = tasks
              .filter((t) => t.date === dayStr)
              .sort((a, b) => a.startTime.localeCompare(b.startTime));
            const isToday = dayStr === ymd(new Date());

            return (
              <GlassCard
                key={dayStr}
                style={[
                  styles.dayCard,
                  isToday && { borderColor: '#3c87f7', borderWidth: 1.5 },
                ]}>
                {/* Day Header */}
                <View style={styles.dayHeader}>
                  <View>
                    <ThemedText type="smallBold" style={[isToday && { color: '#3c87f7' }]}>
                      {d.toLocaleDateString(undefined, { weekday: 'long' })}
                    </ThemedText>
                    <ThemedText themeColor="textSecondary" style={styles.daySub}>
                      {d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </ThemedText>
                  </View>
                  <TouchableOpacity onPress={() => openNewTask(dayStr)} style={styles.addIcon}>
                    <Plus size={20} color={theme.text} />
                  </TouchableOpacity>
                </View>

                {/* Day Tasks List */}
                <View style={styles.taskList}>
                  {list.length === 0 ? (
                    <ThemedText themeColor="textSecondary" style={styles.emptyText}>
                      No tasks scheduled.
                    </ThemedText>
                  ) : (
                    list.map((t) => (
                      <View key={t.id} style={[styles.taskItem, { borderColor: theme.backgroundSelected }]}>
                        <View style={styles.taskLeft}>
                          {/* Toggle Status Checkbox */}
                          <TouchableOpacity onPress={() => handleToggleStatus(t)} style={styles.checkbox}>
                            {t.status === 'completed' ? (
                              <CheckCircle size={18} color="#10b981" />
                            ) : t.status === 'skipped' ? (
                              <SkipForward size={18} color={theme.textSecondary} />
                            ) : (
                              <Circle size={18} color={theme.textSecondary} />
                            )}
                          </TouchableOpacity>
                          
                          {/* Details */}
                          <View style={{ flex: 1 }}>
                            <ThemedText
                              style={[
                                styles.taskTitle,
                                t.status === 'completed' && styles.taskTitleCompleted,
                                t.status === 'skipped' && styles.taskTitleSkipped,
                              ]}>
                              {t.title}
                            </ThemedText>
                            <View style={styles.taskMetaRow}>
                              <Clock size={11} color={theme.textSecondary} style={{ marginRight: 3 }} />
                              <ThemedText type="code" style={styles.taskMetaText}>
                                {t.startTime}–{t.endTime}
                              </ThemedText>
                              <View style={[styles.tag, { backgroundColor: `${priorityColor(t.priority)}15` }]}>
                                <ThemedText style={{ color: priorityColor(t.priority), fontSize: 9, fontWeight: 'bold' }}>
                                  {t.priority}
                                </ThemedText>
                              </View>
                              {t.isOptional && (
                                <View style={[styles.tag, { backgroundColor: '#6b728015' }]}>
                                  <ThemedText style={{ color: theme.textSecondary, fontSize: 9, fontWeight: 'bold' }}>
                                    optional
                                  </ThemedText>
                                </View>
                              )}
                            </View>
                            
                            {t.status !== 'skipped' && t.status !== 'completed' && (
                              <TouchableOpacity style={styles.skipButton} onPress={() => handleSkipTask(t)}>
                                <ThemedText type="code" style={styles.skipButtonText} themeColor="textSecondary">
                                  Skip Task
                                </ThemedText>
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>

                        {/* Task Edit/Delete Actions */}
                        <View style={styles.taskActions}>
                          <TouchableOpacity onPress={() => openEditTask(t)} style={styles.actionBtn}>
                            <Pencil size={14} color={theme.textSecondary} />
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => handleDeleteTask(t)} style={styles.actionBtn}>
                            <Trash2 size={14} color="#ef4444" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))
                  )}
                </View>
              </GlassCard>
            );
          })}
        </ScrollView>
      </SafeAreaView>

      {/* Task Form Modal */}
      <Modal visible={formOpen} animationType="slide" transparent>
        <ThemedView style={styles.modalBg}>
          <SafeAreaView style={styles.modalSafeArea}>
            <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <ThemedText type="subtitle">{editingTask ? 'Edit Task' : 'New Task'}</ThemedText>
                <TouchableOpacity onPress={() => setFormOpen(false)}>
                  <X size={24} color={theme.text} />
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={styles.modalFormScroll}>
                {/* Form Fields */}
                <View style={styles.inputGroup}>
                  <ThemedText type="smallBold" style={styles.label}>Title</ThemedText>
                  <TextInput
                    style={[
                      styles.textInput,
                      {
                        borderColor: theme.backgroundSelected,
                        color: theme.text,
                        backgroundColor: theme.backgroundElement,
                      },
                    ]}
                    value={title}
                    onChangeText={setTitle}
                    placeholder="Task Title (e.g. Meditate)"
                    placeholderTextColor={theme.textSecondary}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <ThemedText type="smallBold" style={styles.label}>Description</ThemedText>
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
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    numberOfLines={3}
                    placeholder="Add details..."
                    placeholderTextColor={theme.textSecondary}
                  />
                </View>

                <View style={styles.row}>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <ThemedText type="smallBold" style={styles.label}>Date</ThemedText>
                    <TextInput
                      style={[
                        styles.textInput,
                        {
                          borderColor: theme.backgroundSelected,
                          color: theme.text,
                          backgroundColor: theme.backgroundElement,
                        },
                      ]}
                      value={taskDate}
                      onChangeText={setTaskDate}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={theme.textSecondary}
                    />
                  </View>
                </View>

                <View style={styles.row}>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <ThemedText type="smallBold" style={styles.label}>Start Time</ThemedText>
                    <TextInput
                      style={[
                        styles.textInput,
                        {
                          borderColor: theme.backgroundSelected,
                          color: theme.text,
                          backgroundColor: theme.backgroundElement,
                        },
                      ]}
                      value={startTime}
                      onChangeText={setStartTime}
                      placeholder="HH:MM"
                      placeholderTextColor={theme.textSecondary}
                    />
                  </View>

                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <ThemedText type="smallBold" style={styles.label}>End Time</ThemedText>
                    <TextInput
                      style={[
                        styles.textInput,
                        {
                          borderColor: theme.backgroundSelected,
                          color: theme.text,
                          backgroundColor: theme.backgroundElement,
                        },
                      ]}
                      value={endTime}
                      onChangeText={setEndTime}
                      placeholder="HH:MM"
                      placeholderTextColor={theme.textSecondary}
                    />
                  </View>
                </View>

                {/* Priority Selection */}
                <View style={styles.inputGroup}>
                  <ThemedText type="smallBold" style={styles.label}>Priority</ThemedText>
                  <View style={styles.prioritySelector}>
                    {(['high', 'medium', 'low'] as Task['priority'][]).map((p) => (
                      <TouchableOpacity
                        key={p}
                        style={[
                          styles.priorityBtn,
                          { borderColor: theme.backgroundSelected },
                          priority === p && { backgroundColor: `${priorityColor(p)}20`, borderColor: priorityColor(p) },
                        ]}
                        onPress={() => setPriority(p)}>
                        <ThemedText style={[{ fontSize: 13, textTransform: 'capitalize' }, priority === p && { color: priorityColor(p), fontWeight: 'bold' }]}>
                          {p}
                        </ThemedText>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Optional Toggle */}
                <View style={styles.switchGroup}>
                  <View style={{ flex: 1 }}>
                    <ThemedText type="smallBold">Optional Task</ThemedText>
                    <ThemedText themeColor="textSecondary" style={{ fontSize: 12 }}>
                      Does not affect streaks or weekly progress completion.
                    </ThemedText>
                  </View>
                  <Switch value={isOptional} onValueChange={setIsOptional} />
                </View>

                <TouchableOpacity
                  style={[styles.saveButton, saving && { opacity: 0.7 }]}
                  onPress={handleSaveTask}
                  disabled={saving}>
                  {saving ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <ThemedText style={styles.saveButtonText}>Save Task</ThemedText>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </SafeAreaView>
        </ThemedView>
      </Modal>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  headerTitle: {
    fontWeight: 'bold',
  },
  headerRange: {
    fontSize: 13,
    marginTop: Spacing.half,
  },
  newButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3c87f7',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + 2,
    borderRadius: Spacing.four,
  },
  scrollContent: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.five,
    gap: Spacing.two + 4,
  },
  dayCard: {
    borderRadius: Spacing.two,
    padding: Spacing.three,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#00000008',
    paddingBottom: Spacing.two,
  },
  daySub: {
    fontSize: 12,
    marginTop: Spacing.half,
  },
  addIcon: {
    padding: Spacing.one,
  },
  taskList: {
    marginTop: Spacing.two,
    gap: Spacing.two,
  },
  emptyText: {
    fontSize: 12,
    fontStyle: 'italic',
    paddingVertical: Spacing.one,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    paddingVertical: Spacing.two,
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
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    opacity: 0.5,
  },
  taskTitleSkipped: {
    textDecorationLine: 'line-through',
    opacity: 0.5,
    fontStyle: 'italic',
  },
  taskMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.half,
    gap: Spacing.one,
    flexWrap: 'wrap',
  },
  taskMetaText: {
    fontSize: 10,
  },
  tag: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
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
  taskActions: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: 2,
  },
  actionBtn: {
    padding: 4,
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
  inputGroup: {
    gap: Spacing.one,
  },
  label: {
    fontSize: 13,
  },
  textInput: {
    height: 48,
    borderWidth: 1,
    borderRadius: Spacing.one,
    paddingHorizontal: Spacing.three,
    fontSize: 15,
  },
  textArea: {
    height: 80,
    paddingTop: Spacing.two,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  prioritySelector: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  priorityBtn: {
    flex: 1,
    height: 42,
    borderWidth: 1,
    borderRadius: Spacing.one,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  switchGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: '#00000008',
    paddingTop: Spacing.three,
    marginTop: Spacing.one,
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
  rangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.half,
    gap: Spacing.two,
  },
  navBtn: {
    padding: 6,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  todayBtn: {
    marginLeft: Spacing.one,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3c87f7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  todayBtnText: {
    fontSize: 10,
    color: '#3c87f7',
    fontWeight: 'bold',
  },
});
