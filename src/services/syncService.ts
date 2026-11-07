import { db, OfflineUser, PendingAction } from '../db';
import { authAPI, notesAPI } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { notesService } from './notesService';
import { syncAgenda } from './agendaService';

const SYNC_INTERVAL_MS = 30 * 1000;

class SyncService {
  private isOnline: boolean = true;
  private syncInFlight: Promise<void> | null = null;
  private periodicSyncId: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.setupNetworkListener();
    this.startPeriodicSync();

    // Sincronización inicial poco después de montar la app
    setTimeout(() => {
      this.syncPendingActions().catch(error =>
        console.error('Initial sync failed:', error)
      );
    }, 1500);
  }

  startPeriodicSync(intervalMs: number = SYNC_INTERVAL_MS): void {
    if (this.periodicSyncId) {
      return;
    }

    this.periodicSyncId = setInterval(() => {
      this.syncPendingActions().catch(error =>
        console.error('Periodic sync failed:', error)
      );
    }, intervalMs);
  }

  stopPeriodicSync(): void {
    if (this.periodicSyncId) {
      clearInterval(this.periodicSyncId);
      this.periodicSyncId = null;
    }
  }

  private setupNetworkListener() {
    NetInfo.addEventListener(state => {
      this.isOnline = state.isConnected ?? false;
      if (this.isOnline) {
        // Retrasar la sincronización para dar tiempo a que se inicialice la app
        setTimeout(() => {
          this.syncPendingActions().catch(error =>
            console.error('Network-triggered sync failed:', error)
          );
        }, 1000);
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
    if (this.syncInFlight) {
      return this.syncInFlight;
    }

    this.syncInFlight = Promise.all([
      this.runSync(),
      syncAgenda().catch(error => console.error('Agenda sync failed:', error.message)),
    ]).then(() => undefined).finally(() => {
      this.syncInFlight = null;
    });

    return this.syncInFlight;
  }

  private async runSync(): Promise<void> {
    if (!this.isOnline) return;

    const token = await AsyncStorage.getItem('token');
    if (!token) {
      console.log('No token found, skipping sync');
      return;
    }

    // Normalizar acciones antiguas/inconsistentes antes de subir cambios
    await this.reconcileLocalNoteActions();

    // Subir cambios locales primero para obtener IDs del servidor antes de descargar
    const pendingActions = await db.pendingActions.toArray();

    for (const action of pendingActions) {
      try {
        if (this.isLocalNoteAction(action) && !notesService.isServerId(action.data?.id)) {
          // La reconciliación anterior debió resolver estas; como fallback, limpiar ids locales
          if (action.type === 'delete_note') {
            await db.notes.delete(action.data.id);
          }
          await db.pendingActions.delete(action.id);
          continue;
        }

        await this.processAction(action);
        await db.pendingActions.delete(action.id);
      } catch (error: any) {
        console.error('Error syncing action:', error);

        if (error.response?.status === 401) {
          // Mantener las acciones pendientes; no borrar datos por una sesión inválida
          console.log('Auth error, keeping pending actions');
          break;
        }

        await db.pendingActions.update(action.id, {
          retryCount: action.retryCount + 1,
        });
      }
    }

    // Descargar el estado actual del servidor y reconciliarlo con lo local
    await notesService.syncNotes();
  }

  private isLocalNoteAction(action: PendingAction): boolean {
    return ['create_note', 'update_note', 'delete_note'].includes(action.type);
  }

  private async reconcileLocalNoteActions(): Promise<void> {
    const actions = await db.pendingActions.toArray();
    const createsByNoteId = new Map<string, PendingAction>();

    for (const action of actions) {
      if (action.type === 'create_note' && action.data?.id) {
        createsByNoteId.set(action.data.id, action);
      }
    }

    for (const action of actions) {
      const noteId = action.data?.id;

      if (!noteId || notesService.isServerId(noteId)) {
        continue;
      }

      if (action.type === 'update_note') {
        const pendingCreate = createsByNoteId.get(noteId);

        if (pendingCreate) {
          // Consolidar la edición dentro del create_note pendiente
          await db.pendingActions.update(pendingCreate.id, {
            data: {
              ...pendingCreate.data,
              title: action.data.title ?? pendingCreate.data.title,
              content: action.data.content ?? pendingCreate.data.content,
              updatedAt: action.data.updatedAt ?? new Date().toISOString(),
            },
            timestamp: new Date().toISOString(),
            retryCount: 0,
          });
          await db.pendingActions.delete(action.id);
          continue;
        }

        const localNote = await db.notes.get(noteId);
        if (localNote) {
          // Un id local nunca existe en el servidor: encolar una creación con el estado actual
          const pendingCreate = await db.pendingActions.add({
            type: 'create_note',
            data: {
              ...localNote,
              title: action.data.title ?? localNote.title,
              content: action.data.content ?? localNote.content,
              updatedAt: action.data.updatedAt ?? localNote.updatedAt,
              synced: false,
            },
            timestamp: new Date().toISOString(),
            retryCount: 0,
          });
          createsByNoteId.set(noteId, pendingCreate);
          await db.pendingActions.delete(action.id);
        } else {
          // La nota ya no existe localmente: la actualización pendiente no aplica
          await db.pendingActions.delete(action.id);
        }
      }

      if (action.type === 'delete_note') {
        // Nota local nunca subida: eliminar localmente y descartar acciones relacionadas
        await db.notes.delete(noteId);
        const relatedActions = (await db.pendingActions.toArray()).filter(
          (candidate) => candidate.data?.id === noteId && this.isLocalNoteAction(candidate)
        );

        for (const relatedAction of relatedActions) {
          await db.pendingActions.delete(relatedAction.id);
        }
      }
    }
  }

  private async remapNoteId(oldId: string, newId: string): Promise<void> {
    const actions = await db.pendingActions.toArray();
    const actionsToRemap = actions.filter(
      (action) =>
        ['update_note', 'delete_note'].includes(action.type) &&
        action.data?.id === oldId
    );

    for (const action of actionsToRemap) {
      await db.pendingActions.update(action.id, {
        data: { ...action.data, id: newId },
      });
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
      case 'create_note':
        const createdNote = await notesAPI.createNote(
          action.data.title,
          action.data.content ?? ''
        );
        // Actualizar ID local con el ID del servidor
        await db.notes.delete(action.data.id);
        await db.notes.delete(createdNote.id);
        await db.notes.add({
          ...action.data,
          id: createdNote.id,
          synced: true,
          deleted: false,
        });
        // Reasignar acciones pendientes que referenciaban el ID local
        await this.remapNoteId(action.data.id, createdNote.id);
        // Permitir que pantallas abiertas con el id local sigan guardando
        await notesService.registerNoteIdAlias(action.data.id, createdNote.id);
        break;
      case 'update_note':
        await notesAPI.updateNote(
          action.data.id,
          action.data.title,
          action.data.content ?? ''
        );
        await notesService.markNoteSynced(action.data.id);
        break;
      case 'delete_note':
        try {
          await notesAPI.deleteNote(action.data.id);
        } catch (error: any) {
          // Si el servidor ya no la tiene, el borrado se considera completado
          if (error.response?.status !== 404) {
            throw error;
          }
        }
        await db.notes.delete(action.data.id);
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

  // Limpiar/normalizar acciones pendientes con IDs locales
  async cleanupInvalidPendingActions(): Promise<void> {
    await this.reconcileLocalNoteActions();
  }
}

export const syncService = new SyncService();
