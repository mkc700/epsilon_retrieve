import AsyncStorage from '@react-native-async-storage/async-storage';

export interface OfflineUser {
  userId: string;
  username: string;
  email: string;
  createdAt: string;
  synced: boolean;
  lastSyncedAt?: string;
}

export interface PendingAction {
  id: string;
  type: 'register' | 'login' | 'logout' | 'update' | 'create_note' | 'update_note' | 'delete_note';
  data: any;
  timestamp: string;
  retryCount: number;
}

export interface OfflineNote {
  id: string;
  userId: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  synced: boolean;
  deleted: boolean;
}

// AsyncStorage-based database for React Native compatibility
const createId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const readJson = async <T,>(key: string, fallback: T): Promise<T> => {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch (error) {
    console.error(`Error reading ${key} from storage:`, error);
    return fallback;
  }
};

export const db = {
  users: {
    put: async (user: OfflineUser) => {
      await AsyncStorage.setItem('offline_user', JSON.stringify(user));
    },
    where: (field: keyof OfflineUser) => ({
      equals: (value: string) => ({
        modify: async (updates: Partial<OfflineUser>) => {
          const parsed = await readJson<OfflineUser | null>('offline_user', null);
          if (parsed && parsed[field] === value) {
            await AsyncStorage.setItem('offline_user', JSON.stringify({ ...parsed, ...updates }));
          }
        }
      })
    }),
    toCollection: () => ({
      first: async () => {
        return readJson<OfflineUser | undefined>('offline_user', undefined);
      }
    }),
    clear: async () => {
      await AsyncStorage.removeItem('offline_user');
    }
  },
  pendingActions: {
    add: async (action: Omit<PendingAction, 'id'>) => {
      const actions = await db.pendingActions.toArray();
      const created = { ...action, id: createId() };
      actions.push(created);
      await AsyncStorage.setItem('pending_actions', JSON.stringify(actions));
      return created;
    },
    toArray: async () => {
      return readJson<PendingAction[]>('pending_actions', []);
    },
    delete: async (id: string) => {
      const actions = await db.pendingActions.toArray();
      const filtered = actions.filter((a: PendingAction) => a.id !== id);
      await AsyncStorage.setItem('pending_actions', JSON.stringify(filtered));
    },
    update: async (id: string, updates: Partial<PendingAction>) => {
      const actions = await db.pendingActions.toArray();
      const index = actions.findIndex((a: PendingAction) => a.id === id);
      if (index !== -1) {
        actions[index] = { ...actions[index], ...updates };
        await AsyncStorage.setItem('pending_actions', JSON.stringify(actions));
      }
    },
    clear: async () => {
      await AsyncStorage.removeItem('pending_actions');
    }
  },
  notes: {
    add: async (note: OfflineNote) => {
      const notes = await db.notes.toArray();
      notes.push(note);
      await AsyncStorage.setItem('notes', JSON.stringify(notes));
    },
    get: async (id: string) => {
      const notes = await db.notes.toArray();
      return notes.find((n: OfflineNote) => n.id === id);
    },
    toArray: async () => {
      return readJson<OfflineNote[]>('notes', []);
    },
    delete: async (id: string) => {
      const notes = await db.notes.toArray();
      const filtered = notes.filter((n: OfflineNote) => n.id !== id);
      await AsyncStorage.setItem('notes', JSON.stringify(filtered));
    },
    update: async (id: string, updates: Partial<OfflineNote>) => {
      const notes = await db.notes.toArray();
      const index = notes.findIndex((n: OfflineNote) => n.id === id);
      if (index !== -1) {
        notes[index] = { ...notes[index], ...updates };
        await AsyncStorage.setItem('notes', JSON.stringify(notes));
      }
    },
    where: (field: keyof OfflineNote) => ({
      equals: (value: string) => ({
        modify: async (updates: Partial<OfflineNote>) => {
          const notes = await db.notes.toArray();
          const updated = notes.map((n: OfflineNote) => 
            n[field] === value ? { ...n, ...updates } : n
          );
          await AsyncStorage.setItem('notes', JSON.stringify(updated));
        }
      })
    }),
    clear: async () => {
      await AsyncStorage.removeItem('notes');
    }
  }
};
