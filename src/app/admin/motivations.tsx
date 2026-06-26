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
import { Sparkles, Plus, Pencil, Trash2, X } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/api';
import { Spacing } from '@/constants/theme';
import type { Motivation } from '@/types';

export default function AdminMotivationsScreen() {
  const theme = useTheme();

  // State
  const [loading, setLoading] = useState(true);
  const [motivations, setMotivations] = useState<Motivation[]>([]);
  
  // Dialog State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMotiv, setEditingMotiv] = useState<Motivation | null>(null);

  // Form Fields
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchMotivations = useCallback(async () => {
    try {
      const data = await api.adminListMotivations();
      setMotivations(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchMotivations();
    }, [fetchMotivations])
  );

  // Form Handlers
  function openCreateMotiv() {
    setEditingMotiv(null);
    setTitle('');
    setContent('');
    setIsActive(true);
    setDialogOpen(true);
  }

  function openEditMotiv(m: Motivation) {
    setEditingMotiv(m);
    setTitle(m.title);
    setContent(m.content);
    setIsActive(m.is_active);
    setDialogOpen(true);
  }

  async function handleSaveMotiv() {
    if (!title.trim() || !content.trim()) {
      Alert.alert('Error', 'Please fill in Title and Content.');
      return;
    }

    setSaving(true);
    try {
      if (editingMotiv) {
        await api.adminUpdateMotivation(editingMotiv.id, {
          title,
          content,
          is_active: isActive,
        });
      } else {
        await api.adminCreateMotivation(title, content, isActive);
      }
      fetchMotivations();
      setDialogOpen(false);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save quote');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleStatus(m: Motivation) {
    try {
      await api.adminUpdateMotivation(m.id, { is_active: !m.is_active });
      setMotivations(
        motivations.map((item) => (item.id === m.id ? { ...item, is_active: !item.is_active } : item))
      );
    } catch (e) {
      console.error(e);
    }
  }

  function handleDeleteMotiv(m: Motivation) {
    Alert.alert(
      'Delete Quote',
      `Are you sure you want to permanently delete "${m.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.adminDeleteMotivation(m.id);
              setMotivations(motivations.filter((item) => item.id !== m.id));
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
            <Sparkles size={22} color="#10b981" />
            <View>
              <ThemedText type="subtitle" style={styles.headerTitle}>
                Motivations
              </ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.headerSub}>
                Manage quotes displayed on user dashboards
              </ThemedText>
            </View>
          </View>
          <TouchableOpacity style={styles.newButton} onPress={openCreateMotiv}>
            <Plus size={16} color="#fff" style={{ marginRight: 4 }} />
            <ThemedText type="smallBold" style={{ color: '#fff' }}>
              Create
            </ThemedText>
          </TouchableOpacity>
        </View>

        {/* Quotes Cards List */}
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {motivations.length === 0 ? (
            <ThemedText themeColor="textSecondary" style={styles.emptyText}>
              No motivation quotes found. Click Create to add one.
            </ThemedText>
          ) : (
            motivations.map((m) => (
              <View key={m.id} style={[styles.motivCard, { backgroundColor: theme.backgroundElement }]}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <ThemedText type="smallBold" style={styles.titleText} numberOfLines={1}>
                      {m.title}
                    </ThemedText>
                    <View style={[styles.statusBadge, { backgroundColor: m.is_active ? '#10b98120' : '#6b728020' }]}>
                      <ThemedText style={{ color: m.is_active ? '#10b981' : theme.textSecondary, fontSize: 10, fontWeight: 'bold' }}>
                        {m.is_active ? 'Active' : 'Inactive'}
                      </ThemedText>
                    </View>
                  </View>
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      onPress={() => handleToggleStatus(m)}
                      style={[styles.statusToggleBtn, { borderColor: theme.backgroundSelected }]}>
                      <ThemedText type="code" style={{ fontSize: 10 }}>
                        {m.is_active ? 'Deactivate' : 'Activate'}
                      </ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => openEditMotiv(m)} style={styles.iconBtn}>
                      <Pencil size={14} color={theme.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteMotiv(m)} style={styles.iconBtn}>
                      <Trash2 size={14} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Content */}
                <ThemedText style={styles.contentText} themeColor="textSecondary" numberOfLines={3}>
                  {"\""}{m.content}{"\""}
                </ThemedText>
              </View>
            ))
          )}
        </ScrollView>
      </SafeAreaView>

      {/* Motivation Form Modal */}
      <Modal visible={dialogOpen} animationType="slide" transparent>
        <ThemedView style={styles.modalBg}>
          <SafeAreaView style={styles.modalSafeArea}>
            <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
              {/* Header */}
              <View style={styles.modalHeader}>
                <ThemedText type="subtitle">{editingMotiv ? 'Edit Quote' : 'Create Quote'}</ThemedText>
                <TouchableOpacity onPress={() => setDialogOpen(false)}>
                  <X size={24} color={theme.text} />
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={styles.modalFormScroll}>
                <View style={styles.inputGroup}>
                  <ThemedText type="smallBold" style={styles.label}>Quote Title</ThemedText>
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
                    placeholder="e.g. Focus"
                    placeholderTextColor={theme.textSecondary}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <ThemedText type="smallBold" style={styles.label}>Quote Content</ThemedText>
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
                    value={content}
                    onChangeText={setContent}
                    multiline
                    numberOfLines={4}
                    placeholder="e.g. Small steps every day add up to big results."
                    placeholderTextColor={theme.textSecondary}
                  />
                </View>

                {/* Is Active Toggle */}
                <View style={styles.toggleGroup}>
                  <ThemedText type="smallBold">Make Quote Active</ThemedText>
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
                  onPress={handleSaveMotiv}
                  disabled={saving}>
                  {saving ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <ThemedText style={styles.saveButtonText}>{editingMotiv ? 'Save Quote' : 'Create Quote'}</ThemedText>
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
  motivCard: {
    borderRadius: Spacing.two,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleText: {
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
  contentText: {
    fontSize: 13,
    fontStyle: 'italic',
    lineHeight: 18,
    marginTop: Spacing.one,
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
  textArea: {
    height: 100,
    paddingTop: Spacing.two,
    textAlignVertical: 'top',
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
