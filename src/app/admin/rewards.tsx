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
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Flame, Plus, Pencil, Trash2, Check, X } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/api';
import { Spacing } from '@/constants/theme';
import type { StreakRule } from '@/types';

export default function AdminRewardsScreen() {
  const theme = useTheme();

  // State
  const [loading, setLoading] = useState(true);
  const [streakRules, setStreakRules] = useState<StreakRule[]>([]);
  
  // Dialog State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<StreakRule | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [requiredDays, setRequiredDays] = useState('3');
  const [freezesToGrant, setFreezesToGrant] = useState('1');
  const [maxFreezesAllowed, setMaxFreezesAllowed] = useState('2');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchStreakRules = useCallback(async () => {
    try {
      const data = await api.adminListStreakRules();
      setStreakRules(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchStreakRules();
    }, [fetchStreakRules])
  );

  // Form Handlers
  function openCreateRule() {
    setEditingRule(null);
    setName('');
    setRequiredDays('3');
    setFreezesToGrant('1');
    setMaxFreezesAllowed('2');
    setIsActive(true);
    setDialogOpen(true);
  }

  function openEditRule(rule: StreakRule) {
    setEditingRule(rule);
    setName(rule.name);
    setRequiredDays(rule.required_consecutive_days.toString());
    setFreezesToGrant(rule.freezes_to_grant.toString());
    setMaxFreezesAllowed(rule.max_freezes_allowed.toString());
    setIsActive(rule.is_active);
    setDialogOpen(true);
  }

  async function handleSaveRule() {
    if (!name.trim() || !requiredDays.trim() || !freezesToGrant.trim() || !maxFreezesAllowed.trim()) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }

    setSaving(true);
    const ruleValues = {
      name,
      required_consecutive_days: parseInt(requiredDays) || 3,
      freezes_to_grant: parseInt(freezesToGrant) || 1,
      max_freezes_allowed: parseInt(maxFreezesAllowed) || 2,
      is_active: isActive,
    };

    try {
      if (editingRule) {
        await api.adminUpdateStreakRule(editingRule.id, ruleValues);
      } else {
        await api.adminCreateStreakRule(ruleValues);
      }
      fetchStreakRules();
      setDialogOpen(false);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save rule');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleStatus(rule: StreakRule) {
    try {
      await api.adminUpdateStreakRule(rule.id, { is_active: !rule.is_active });
      setStreakRules(
        streakRules.map((r) => (r.id === rule.id ? { ...r, is_active: !r.is_active } : r))
      );
    } catch (e) {
      console.error(e);
    }
  }

  function handleDeleteRule(rule: StreakRule) {
    Alert.alert(
      'Delete Rule',
      `Are you sure you want to permanently delete "${rule.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.adminDeleteStreakRule(rule.id);
              setStreakRules(streakRules.filter((r) => r.id !== rule.id));
            } catch (e) {
              console.error(e);
            }
          },
        },
      ]
    );
  }

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
            <Flame size={22} color="#10b981" />
            <View>
              <ThemedText type="subtitle" style={styles.headerTitle}>
                Streak Rules
              </ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.headerSub}>
                Milestone rules for granting freezes
              </ThemedText>
            </View>
          </View>
          <TouchableOpacity style={styles.newButton} onPress={openCreateRule}>
            <Plus size={16} color="#fff" style={{ marginRight: 4 }} />
            <ThemedText type="smallBold" style={{ color: '#fff' }}>
              Create
            </ThemedText>
          </TouchableOpacity>
        </View>

        {/* Rules Cards List */}
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {streakRules.length === 0 ? (
            <ThemedText themeColor="textSecondary" style={styles.emptyText}>
              No streak rules configured. Click Create to add one.
            </ThemedText>
          ) : (
            streakRules.map((rule) => (
              <View key={rule.id} style={[styles.ruleCard, { backgroundColor: theme.backgroundElement }]}>
                <View style={styles.ruleCardHeader}>
                  <View style={{ flex: 1 }}>
                    <ThemedText type="smallBold" style={styles.ruleName}>
                      {rule.name}
                    </ThemedText>
                    <View style={[styles.statusBadge, { backgroundColor: rule.is_active ? '#10b98120' : '#6b728020' }]}>
                      <ThemedText style={{ color: rule.is_active ? '#10b981' : theme.textSecondary, fontSize: 10, fontWeight: 'bold' }}>
                        {rule.is_active ? 'Active' : 'Inactive'}
                      </ThemedText>
                    </View>
                  </View>
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      onPress={() => handleToggleStatus(rule)}
                      style={[styles.statusToggleBtn, { borderColor: theme.backgroundSelected }]}>
                      <ThemedText type="code" style={{ fontSize: 10 }}>
                        {rule.is_active ? 'Deactivate' : 'Activate'}
                      </ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => openEditRule(rule)} style={styles.iconBtn}>
                      <Pencil size={14} color={theme.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteRule(rule)} style={styles.iconBtn}>
                      <Trash2 size={14} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Details grid */}
                <View style={[styles.ruleDetails, { borderColor: theme.backgroundSelected }]}>
                  <View style={styles.detailBlock}>
                    <ThemedText themeColor="textSecondary" style={styles.detailLabel}>Req. Days</ThemedText>
                    <ThemedText type="smallBold">{rule.required_consecutive_days} days</ThemedText>
                  </View>

                  <View style={styles.detailBlock}>
                    <ThemedText themeColor="textSecondary" style={styles.detailLabel}>Grants Freezes</ThemedText>
                    <ThemedText type="smallBold">+{rule.freezes_to_grant}</ThemedText>
                  </View>

                  <View style={styles.detailBlock}>
                    <ThemedText themeColor="textSecondary" style={styles.detailLabel}>Max Cap</ThemedText>
                    <ThemedText type="smallBold">{rule.max_freezes_allowed}</ThemedText>
                  </View>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </SafeAreaView>

      {/* Streak Rule Modal Form */}
      <Modal visible={dialogOpen} animationType="slide" transparent>
        <ThemedView style={styles.modalBg}>
          <SafeAreaView style={styles.modalSafeArea}>
            <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
              {/* Header */}
              <View style={styles.modalHeader}>
                <ThemedText type="subtitle">{editingRule ? 'Edit Rule' : 'Create Rule'}</ThemedText>
                <TouchableOpacity onPress={() => setDialogOpen(false)}>
                  <X size={24} color={theme.text} />
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={styles.modalFormScroll}>
                <View style={styles.inputGroup}>
                  <ThemedText type="smallBold" style={styles.label}>Rule Name</ThemedText>
                  <TextInput
                    style={[
                      styles.textInput,
                      {
                        borderColor: theme.backgroundSelected,
                        color: theme.text,
                        backgroundColor: theme.backgroundElement,
                      },
                    ]}
                    value={name}
                    onChangeText={setName}
                    placeholder="e.g. Weekly Streak Reward"
                    placeholderTextColor={theme.textSecondary}
                  />
                </View>

                <View style={styles.row}>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <ThemedText type="smallBold" style={styles.label}>Req. Days</ThemedText>
                    <TextInput
                      style={[
                        styles.textInput,
                        {
                          borderColor: theme.backgroundSelected,
                          color: theme.text,
                          backgroundColor: theme.backgroundElement,
                        },
                      ]}
                      value={requiredDays}
                      onChangeText={setRequiredDays}
                      keyboardType="numeric"
                      placeholder="3"
                      placeholderTextColor={theme.textSecondary}
                    />
                  </View>

                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <ThemedText type="smallBold" style={styles.label}>Grant Freezes</ThemedText>
                    <TextInput
                      style={[
                        styles.textInput,
                        {
                          borderColor: theme.backgroundSelected,
                          color: theme.text,
                          backgroundColor: theme.backgroundElement,
                        },
                      ]}
                      value={freezesToGrant}
                      onChangeText={setFreezesToGrant}
                      keyboardType="numeric"
                      placeholder="1"
                      placeholderTextColor={theme.textSecondary}
                    />
                  </View>

                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <ThemedText type="smallBold" style={styles.label}>Max Allowed Cap</ThemedText>
                    <TextInput
                      style={[
                        styles.textInput,
                        {
                          borderColor: theme.backgroundSelected,
                          color: theme.text,
                          backgroundColor: theme.backgroundElement,
                        },
                      ]}
                      value={maxFreezesAllowed}
                      onChangeText={setMaxFreezesAllowed}
                      keyboardType="numeric"
                      placeholder="2"
                      placeholderTextColor={theme.textSecondary}
                    />
                  </View>
                </View>

                {/* Is Active Toggle */}
                <View style={styles.toggleGroup}>
                  <ThemedText type="smallBold">Make Rule Active</ThemedText>
                  <TouchableOpacity
                    style={[styles.toggleBtn, { backgroundColor: isActive ? '#10b981' : theme.backgroundSelected }]}
                    onPress={() => setIsActive(!isActive)}>
                    <ThemedText style={{ color: '#fff', fontSize: 13, fontWeight: 'bold' }}>
                      {isActive ? 'Active' : 'Inactive'}
                    </ThemedText>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[styles.saveButton, saving && { opacity: 0.7 }]}
                  onPress={handleSaveRule}
                  disabled={saving}>
                  {saving ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <ThemedText style={styles.saveButtonText}>{editingRule ? 'Save Rule' : 'Create Rule'}</ThemedText>
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
  headerSub: {
    fontSize: 12,
    marginTop: 2,
  },
  newButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10b981',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + 2,
    borderRadius: Spacing.four,
  },
  scrollContent: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.five,
    gap: Spacing.two,
  },
  emptyText: {
    fontSize: 13,
    fontStyle: 'italic',
    paddingVertical: Spacing.three,
  },
  ruleCard: {
    borderRadius: Spacing.two,
    padding: Spacing.three,
  },
  ruleCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  ruleName: {
    fontSize: 15,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 4,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  statusToggleBtn: {
    borderWidth: 1,
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
    borderRadius: Spacing.one,
  },
  iconBtn: {
    padding: 4,
  },
  ruleDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.three,
    borderTopWidth: 1,
    paddingTop: Spacing.two,
  },
  detailBlock: {
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 10,
    marginBottom: 2,
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
    height: '70%',
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
    paddingBottom: Spacing.five,
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
    fontSize: 14,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  toggleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderColor: '#00000008',
    paddingTop: Spacing.three,
    marginTop: Spacing.one,
  },
  toggleBtn: {
    height: 36,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.one,
    justifyContent: 'center',
  },
  saveButton: {
    height: 50,
    backgroundColor: '#10b981',
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
});
