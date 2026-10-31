import { db, OfflineUser, PendingAction } from '../db';
import { authAPI } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

class SyncService {
  private isOnline: boolean = true;

  constructor() {
    this.setupNetworkListener();
  }

  private setupNetworkListener() {
    NetInfo.addEventListener(state => {
      this.isOnline = state.isConnected ?? false;
      if (this.isOnline) {
        this.syncPendingActions();
      }
    });
  }

  // Guardar usuario offline
  async saveUserOffline(user: any): Promise<void> {
    await db.users.put({
      userId: user.id,
      username: user.username,
      email: user.email,
      createdAt: user.createdAt,
      synced: false,
    });
  }

  // Marcar usuario como sincronizado
  async markUserSynced(userId: string): Promise<void> {
    await db.users
      .where('userId')
      .equals(userId)
      .modify({ 
        synced: true, 
        lastSyncedAt: new Date().toISOString() 
      });
  }

  // Obtener usuario offline
  async getUserOffline(): Promise<OfflineUser | undefined> {
    const user = await db.users.toCollection().first();
    return user;
  }

  // Agregar acción pendiente
  async addPendingAction(type: PendingAction['type'], data: any): Promise<void> {
    await db.pendingActions.add({
      type,
      data,
      timestamp: new Date().toISOString(),
      retryCount: 0,
    });
  }

  // Procesar acciones pendientes cuando hay conexión
  async syncPendingActions(): Promise<void> {
    if (!this.isOnline) return;

    const pendingActions = await db.pendingActions.toArray();
    
    for (const action of pendingActions) {
      try {
        await this.processAction(action);
        await db.pendingActions.delete(action.id);
      } catch (error) {
        console.error('Error syncing action:', error);
        await db.pendingActions.update(action.id, { 
          retryCount: action.retryCount + 1 
        });
      }
    }
  }

  private async processAction(action: PendingAction): Promise<void> {
    switch (action.type) {
      case 'register':
        await authAPI.register(
          action.data.username,
          action.data.email,
          action.data.password
        );
        break;
      case 'login':
        const response = await authAPI.login(
          action.data.email,
          action.data.password
        );
        await AsyncStorage.setItem('token', response.token);
        await this.markUserSynced(response.user.id);
        break;
      default:
        console.warn('Unknown action type:', action.type);
    }
  }

  // Sincronizar usuario actual con el servidor
  async syncUser(): Promise<void> {
    if (!this.isOnline) return;

    try {
      const response = await authAPI.getMe();
      await db.users.put({
        userId: response.user.id,
        username: response.user.username,
        email: response.user.email,
        createdAt: response.user.createdAt,
        synced: true,
        lastSyncedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error syncing user:', error);
    }
  }

  // Limpiar datos locales
  async clearLocalData(): Promise<void> {
    await db.users.clear();
    await db.pendingActions.clear();
  }
}

export const syncService = new SyncService();
