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
  type: 'register' | 'login' | 'logout' | 'update';
  data: any;
  timestamp: string;
  retryCount: number;
}

// AsyncStorage-based database for React Native compatibility
export const db = {
  users: {
    put: async (user: OfflineUser) => {
      await AsyncStorage.setItem('offline_user', JSON.stringify(user));
    },
    where: (field: string) => ({
      equals: (value: string) => ({
        modify: async (updates: Partial<OfflineUser>) => {
          const user = await AsyncStorage.getItem('offline_user');
          if (user) {
            const parsed = JSON.parse(user);
            if (parsed[field] === value) {
              await AsyncStorage.setItem('offline_user', JSON.stringify({ ...parsed, ...updates }));
            }
          }
        }
      })
    }),
    toCollection: () => ({
      first: async () => {
        const user = await AsyncStorage.getItem('offline_user');
        return user ? JSON.parse(user) : undefined;
      }
    }),
    clear: async () => {
      await AsyncStorage.removeItem('offline_user');
    }
  },
  pendingActions: {
    add: async (action: PendingAction) => {
      const actions = await db.pendingActions.toArray();
      action.id = Date.now().toString();
      actions.push(action);
      await AsyncStorage.setItem('pending_actions', JSON.stringify(actions));
    },
    toArray: async () => {
      const actions = await AsyncStorage.getItem('pending_actions');
      return actions ? JSON.parse(actions) : [];
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
  }
};
