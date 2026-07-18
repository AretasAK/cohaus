import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { Card } from '../../components/Card';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { Avatar } from '../../components/Avatar';
import { EmptyState } from '../../components/EmptyState';
import { BottomSheet } from '../../components/BottomSheet';
import { SwipeableRow } from '../../components/SwipeableRow';
import { useTheme } from '../../theme/ThemeProvider';
import { useGroupStore } from '../../store/groupStore';
import { useAuthStore } from '../../store/authStore';
import { useTaskStore } from '../../store/taskStore';
import { useNotificationStore } from '../../store/notificationStore';
import { buildRrule, parseRrule, RecurrenceFreq } from '../../lib/rrule';

export function TasksSection({ groupId }: { groupId: string }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const members = useGroupStore((s) => s.members);
  const currentUserId = useAuthStore((s) => s.session?.user.id);
  const displayName = useAuthStore((s) => s.profile?.display_name ?? s.profile?.email ?? t('common.someone'));
  const notifyGroup = useNotificationStore((s) => s.notifyGroup);
  const { tasksByGroup, fetchTasks, createTask, completeTask, deleteTask } = useTaskStore();

  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskAssignee, setTaskAssignee] = useState<string | null>(null);
  const [assignmentMode, setAssignmentMode] = useState<'rotating' | 'fixed'>('rotating');
  const [dueAt, setDueAt] = useState<Date | null>(null);
  const [pickerMode, setPickerMode] = useState<'date' | 'time' | null>(null);
  const [savingTask, setSavingTask] = useState(false);
  const [recurrenceFreq, setRecurrenceFreq] = useState<RecurrenceFreq | 'none'>('none');
  const [recurrenceInterval, setRecurrenceInterval] = useState(1);

  const groupMembers = members[groupId] ?? [];
  const tasks = tasksByGroup[groupId] ?? [];
  const memberOrder = groupMembers.map((m) => m.user_id);

  useEffect(() => {
    fetchTasks(groupId, currentUserId ?? null);
  }, [groupId, currentUserId]);

  const memberName = (userId: string | null) => {
    if (!userId) return t('tasks.unassigned');
    const m = groupMembers.find((mm) => mm.user_id === userId);
    return m ? (m.display_name ?? m.email) : '?';
  };

  const memberAvatar = (userId: string | null) => {
    if (!userId) return null;
    return groupMembers.find((mm) => mm.user_id === userId)?.avatar_url ?? null;
  };

  const openAddTask = () => {
    setTaskTitle('');
    setTaskAssignee(currentUserId ?? groupMembers[0]?.user_id ?? null);
    setAssignmentMode('rotating');
    setDueAt(null);
    setRecurrenceFreq('none');
    setRecurrenceInterval(1);
    setAddTaskOpen(true);
  };

  const handleCreateTask = async () => {
    if (!taskTitle.trim()) return;
    setSavingTask(true);
    const rrule = recurrenceFreq === 'none' ? null : buildRrule(recurrenceFreq, recurrenceInterval);
    await createTask(groupId, taskTitle.trim(), taskAssignee, dueAt ? dueAt.toISOString() : null, assignmentMode, rrule);
    setSavingTask(false);
    setAddTaskOpen(false);
  };

  const recurrenceLabel = (rrule: string | null) => {
    const recurrence = parseRrule(rrule);
    if (!recurrence) return null;
    const key =
      recurrence.freq === 'DAILY' ? 'tasks.recurrenceLabelDaily' : recurrence.freq === 'WEEKLY' ? 'tasks.recurrenceLabelWeekly' : 'tasks.recurrenceLabelMonthly';
    return t(key, { count: recurrence.interval });
  };

  const onPickerChange = (_event: any, selected?: Date) => {
    const mode = pickerMode;
    setPickerMode(null);
    if (!selected) return;
    setDueAt((prev) => {
      const base = prev ? new Date(prev) : new Date();
      if (mode === 'date') {
        base.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
      } else {
        base.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
      }
      return base;
    });
  };

  const formatDueAt = (iso: string | null) => {
    if (!iso) return null;
    const d = new Date(iso);
    return `${d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })} · ${d.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    })}`;
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 12 }}>
        <Pressable onPress={openAddTask} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Ionicons name="add-circle" size={18} color={theme.primary} />
          <Text style={{ color: theme.primary, fontWeight: '700', fontSize: 14 }}>{t('tasks.add')}</Text>
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        {tasks.length === 0 ? (
          <EmptyState
            icon="repeat-outline"
            title={t('tasks.emptyTitle')}
            subtitle={t('tasks.emptySubtitle')}
          />
        ) : (
          tasks.map((task) => (
            <Animated.View
              key={task.id}
              entering={FadeIn.duration(200)}
              exiting={FadeOut.duration(150)}
              layout={LinearTransition.springify().damping(18).stiffness(200)}
              style={{ marginBottom: 8 }}
            >
              <SwipeableRow onDelete={() => deleteTask(task.id, groupId)}>
                <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Pressable
                    onPress={() => {
                      if (!currentUserId) return;
                      completeTask(task, groupId, currentUserId, memberOrder);
                      notifyGroup({
                        groupId,
                        actorId: currentUserId,
                        type: 'task_done',
                        data: { actorName: displayName, taskTitle: task.title },
                      }).catch(() => {});
                    }}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      borderWidth: 2,
                      borderColor: theme.success,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons name="checkmark" size={16} color={theme.success} />
                  </Pressable>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.text, fontWeight: '600', fontSize: 15 }}>{task.title}</Text>
                    <Text style={{ color: theme.textMuted, fontSize: 12, marginTop: 1 }}>
                      {t('tasks.assignedTo')} <Text style={{ fontWeight: '700' }}>{memberName(task.assignee_id)}</Text>
                    </Text>
                    {task.due_at || task.rrule ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                        {task.due_at ? (
                          <Text style={{ color: theme.accent, fontSize: 12, fontWeight: '600' }}>
                            {formatDueAt(task.due_at)}
                          </Text>
                        ) : null}
                        {task.rrule ? (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                            <Ionicons name="repeat" size={12} color={theme.textMuted} />
                            <Text style={{ color: theme.textMuted, fontSize: 12, fontWeight: '600' }}>
                              {recurrenceLabel(task.rrule)}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    ) : null}
                  </View>
                  <Avatar name={memberName(task.assignee_id)} url={memberAvatar(task.assignee_id)} size={32} />
                </Card>
              </SwipeableRow>
            </Animated.View>
          ))
        )}
      </ScrollView>

      <BottomSheet visible={addTaskOpen} onClose={() => setAddTaskOpen(false)}>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Text style={{ fontSize: 20, fontWeight: '800', color: theme.text, marginBottom: 16 }}>{t('tasks.newTask')}</Text>
          <Input placeholder={t('tasks.titlePlaceholder')} value={taskTitle} onChangeText={setTaskTitle} autoFocus />

          <Text style={{ color: theme.textMuted, fontSize: 12, fontWeight: '700', marginBottom: 8 }}>
            {t('tasks.startAssignedTo')}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            {groupMembers.map((m) => {
              const selected = taskAssignee === m.user_id;
              return (
                <Pressable
                  key={m.user_id}
                  onPress={() => setTaskAssignee(m.user_id)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    borderRadius: 20,
                    backgroundColor: selected ? theme.primarySoft : theme.inputBg,
                    borderWidth: selected ? 1.5 : 0,
                    borderColor: theme.primary,
                  }}
                >
                  <Avatar name={m.display_name ?? m.email} url={m.avatar_url} size={22} />
                  <Text style={{ color: selected ? theme.primary : theme.text, fontWeight: '600', fontSize: 13 }}>
                    {m.display_name ?? m.email}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={{ color: theme.textMuted, fontSize: 12, fontWeight: '700', marginBottom: 8 }}>
            {t('tasks.assignmentHeader')}
          </Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
            {(
              [
                { key: 'rotating', label: t('tasks.rotating') },
                { key: 'fixed', label: t('tasks.fixed') },
              ] as const
            ).map((opt) => {
              const selected = assignmentMode === opt.key;
              return (
                <Pressable
                  key={opt.key}
                  onPress={() => setAssignmentMode(opt.key)}
                  style={{
                    paddingVertical: 8,
                    paddingHorizontal: 14,
                    borderRadius: 20,
                    backgroundColor: selected ? theme.primarySoft : theme.inputBg,
                    borderWidth: selected ? 1.5 : 0,
                    borderColor: theme.primary,
                  }}
                >
                  <Text style={{ color: selected ? theme.primary : theme.text, fontWeight: '600', fontSize: 13 }}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={{ color: theme.textMuted, fontSize: 12, marginBottom: 16 }}>
            {assignmentMode === 'rotating' ? t('tasks.rotatingHint') : t('tasks.fixedHint')}
          </Text>

          <Text style={{ color: theme.textMuted, fontSize: 12, fontWeight: '700', marginBottom: 8 }}>
            {t('tasks.recurrenceHeader')}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: recurrenceFreq === 'none' ? 16 : 10 }}>
            {(
              [
                { key: 'none' as const, label: t('tasks.recurrenceNone') },
                { key: 'DAILY' as const, label: t('tasks.recurrenceDaily') },
                { key: 'WEEKLY' as const, label: t('tasks.recurrenceWeekly') },
                { key: 'MONTHLY' as const, label: t('tasks.recurrenceMonthly') },
              ]
            ).map((opt) => {
              const selected = recurrenceFreq === opt.key;
              return (
                <Pressable
                  key={opt.key}
                  onPress={() => {
                    setRecurrenceFreq(opt.key);
                    setRecurrenceInterval(1);
                  }}
                  style={{
                    paddingVertical: 8,
                    paddingHorizontal: 14,
                    borderRadius: 12,
                    backgroundColor: selected ? theme.primarySoft : theme.inputBg,
                    borderWidth: selected ? 1.5 : 0,
                    borderColor: theme.primary,
                  }}
                >
                  <Text style={{ color: selected ? theme.primary : theme.text, fontWeight: '600', fontSize: 13 }}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {recurrenceFreq !== 'none' ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <Text style={{ color: theme.textMuted, fontSize: 13, fontWeight: '600' }}>{t('tasks.recurrenceEvery')}</Text>
              <Pressable
                onPress={() => setRecurrenceInterval((n) => Math.max(1, n - 1))}
                style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: theme.inputBg, alignItems: 'center', justifyContent: 'center' }}
              >
                <Ionicons name="remove" size={16} color={theme.text} />
              </Pressable>
              <Text style={{ color: theme.text, fontWeight: '700', fontSize: 15, minWidth: 20, textAlign: 'center' }}>
                {recurrenceInterval}
              </Text>
              <Pressable
                onPress={() => setRecurrenceInterval((n) => Math.min(30, n + 1))}
                style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: theme.inputBg, alignItems: 'center', justifyContent: 'center' }}
              >
                <Ionicons name="add" size={16} color={theme.text} />
              </Pressable>
              <Text style={{ color: theme.textMuted, fontSize: 13 }}>
                {recurrenceFreq === 'DAILY' ? t('tasks.recurrenceDaily') : recurrenceFreq === 'WEEKLY' ? t('tasks.recurrenceWeekly') : t('tasks.recurrenceMonthly')}
              </Text>
            </View>
          ) : null}

          <Text style={{ color: theme.textMuted, fontSize: 12, fontWeight: '700', marginBottom: 8 }}>
            {t('tasks.dateTimeHeader')}
          </Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
            <Pressable
              onPress={() => setPickerMode('date')}
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingVertical: 12,
                paddingHorizontal: 14,
                borderRadius: 14,
                backgroundColor: theme.inputBg,
              }}
            >
              <Ionicons name="calendar-outline" size={16} color={theme.textMuted} />
              <Text style={{ color: theme.text, fontSize: 13, fontWeight: '600' }}>
                {dueAt ? dueAt.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : t('tasks.pickDate')}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setPickerMode('time')}
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingVertical: 12,
                paddingHorizontal: 14,
                borderRadius: 14,
                backgroundColor: theme.inputBg,
              }}
            >
              <Ionicons name="time-outline" size={16} color={theme.textMuted} />
              <Text style={{ color: theme.text, fontSize: 13, fontWeight: '600' }}>
                {dueAt ? dueAt.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : t('tasks.pickTime')}
              </Text>
            </Pressable>
            {dueAt ? (
              <Pressable
                onPress={() => setDueAt(null)}
                hitSlop={10}
                style={{ alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}
              >
                <Ionicons name="close-circle" size={20} color={theme.textMuted} />
              </Pressable>
            ) : null}
          </View>
          {pickerMode ? (
            <DateTimePicker
              value={dueAt ?? new Date()}
              mode={pickerMode}
              is24Hour
              onChange={onPickerChange}
            />
          ) : null}

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button label={t('common.cancel')} variant="secondary" onPress={() => setAddTaskOpen(false)} style={{ flex: 1 }} />
            <Button label={t('common.create')} onPress={handleCreateTask} loading={savingTask} style={{ flex: 1 }} />
          </View>
        </ScrollView>
      </BottomSheet>
    </View>
  );
}
