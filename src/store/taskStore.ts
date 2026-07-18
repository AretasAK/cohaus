import { create } from 'zustand';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { getNextOccurrence } from '../lib/rrule';

export interface HomeTask {
  id: string;
  group_id: string;
  title: string;
  assignee_id: string | null;
  rrule: string | null;
  assignment_mode: 'rotating' | 'fixed';
  due_at: string | null;
  last_done_at: string | null;
  created_at: string;
  assignee_name?: string;
}

const reminderKey = (taskId: string) => `task-reminder-${taskId}`;

async function cancelTaskReminder(taskId: string) {
  const stored = await AsyncStorage.getItem(reminderKey(taskId));
  if (stored) {
    await Notifications.cancelScheduledNotificationAsync(stored).catch(() => {});
    await AsyncStorage.removeItem(reminderKey(taskId));
  }
}

async function scheduleTaskReminder(task: HomeTask, currentUserId: string | null) {
  await cancelTaskReminder(task.id);
  if (!task.due_at || task.assignee_id !== currentUserId) return;
  const dueDate = new Date(task.due_at);
  if (dueDate.getTime() <= Date.now()) return;
  const notificationId = await Notifications.scheduleNotificationAsync({
    content: { title: 'Tarea pendiente', body: task.title },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: dueDate },
  });
  await AsyncStorage.setItem(reminderKey(task.id), notificationId);
}

interface TaskState {
  tasksByGroup: Record<string, HomeTask[]>;
  loading: boolean;
  fetchTasks: (groupId: string, currentUserId?: string | null) => Promise<void>;
  createTask: (
    groupId: string,
    title: string,
    assigneeId: string | null,
    dueAt: string | null,
    assignmentMode: 'rotating' | 'fixed',
    rrule: string | null
  ) => Promise<void>;
  completeTask: (task: HomeTask, groupId: string, userId: string, memberOrder: string[]) => Promise<void>;
  deleteTask: (taskId: string, groupId: string) => Promise<void>;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasksByGroup: {},
  loading: false,

  fetchTasks: async (groupId: string, currentUserId: string | null = null) => {
    set({ loading: true });
    const { data } = await supabase
      .from('tasks')
      .select('*, profiles(display_name, email)')
      .eq('group_id', groupId)
      .order('created_at', { ascending: true });

    if (data) {
      const tasks: HomeTask[] = data.map((row: any) => ({
        id: row.id,
        group_id: row.group_id,
        title: row.title,
        assignee_id: row.assignee_id,
        rrule: row.rrule,
        assignment_mode: row.assignment_mode ?? 'rotating',
        due_at: row.due_at,
        last_done_at: row.last_done_at,
        created_at: row.created_at,
        assignee_name: row.profiles?.display_name ?? row.profiles?.email,
      }));
      set((state) => ({ tasksByGroup: { ...state.tasksByGroup, [groupId]: tasks } }));
      await Promise.all(tasks.map((t) => scheduleTaskReminder(t, currentUserId)));
    }
    set({ loading: false });
  },

  createTask: async (groupId, title, assigneeId, dueAt, assignmentMode, rrule) => {
    await supabase
      .from('tasks')
      .insert({ group_id: groupId, title, assignee_id: assigneeId, due_at: dueAt, assignment_mode: assignmentMode, rrule });
    await get().fetchTasks(groupId, assigneeId);
  },

  completeTask: async (task, groupId, userId, memberOrder) => {
    await supabase.from('task_log').insert({ task_id: task.id, done_by: userId });
    await cancelTaskReminder(task.id);

    let nextAssignee = task.assignee_id;
    if (task.assignment_mode === 'rotating' && memberOrder.length > 0) {
      const currentIndex = task.assignee_id ? memberOrder.indexOf(task.assignee_id) : -1;
      nextAssignee = memberOrder[(currentIndex + 1 + memberOrder.length) % memberOrder.length];
    }

    const nextDueAt = task.rrule
      ? getNextOccurrence(task.due_at ? new Date(task.due_at) : new Date(), task.rrule).toISOString()
      : null;

    await supabase
      .from('tasks')
      .update({ assignee_id: nextAssignee, last_done_at: new Date().toISOString(), due_at: nextDueAt })
      .eq('id', task.id);

    await get().fetchTasks(groupId, userId);
  },

  deleteTask: async (taskId: string, groupId: string) => {
    await cancelTaskReminder(taskId);
    await supabase.from('tasks').delete().eq('id', taskId);
    await get().fetchTasks(groupId);
  },
}));
