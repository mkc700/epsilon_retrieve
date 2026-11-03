import { db, OfflineNote } from '../db';
import { Note } from '../types/index';
import { notesAPI } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const createLocalId = () => `local-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

class NotesService {
  isServerId(id: string): boolean {
    return /^[0-9a-fA-F]{24}$/.test(id);
  }

  // Obtener todas las notas
  async getNotes(): Promise<Note[]> {
    const offlineNotes = await db.notes.toArray();
    return offlineNotes
      .filter((n: OfflineNote) => !n.deleted)
      .sort((a: OfflineNote, b: OfflineNote) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  // Crear una nueva nota
  async createNote(title: string, content: string, userId: string): Promise<Note> {
    const now = new Date().toISOString();
    const newNote: OfflineNote = {
      id: createLocalId(),
      userId,
      title: title.trim(),
      content: content ?? '',
      createdAt: now,
      updatedAt: now,
      synced: false,
      deleted: false,
    };

    await db.notes.add(newNote);

    // Agregar acción pendiente para sincronización
    await db.pendingActions.add({
      type: 'create_note',
      data: newNote,
      timestamp: now,
      retryCount: 0,
    });

    return newNote;
  }

  // Actualizar una nota existente
  async updateNote(id: string, title: string, content: string): Promise<void> {
    const existing = await db.notes.get(id);

    if (!existing) {
      throw new Error('Nota no encontrada');
    }

    const updates: Partial<OfflineNote> = {
      title: title.trim(),
      content: content ?? '',
      updatedAt: new Date().toISOString(),
      synced: false,
    };

    await db.notes.update(id, updates);
    const updatedNote = { ...existing, ...updates } as OfflineNote;

    if (!existing.synced || !this.isServerId(id)) {
      // La nota aún no existe en el servidor: actualizar la acción create_note pendiente
      await this.replacePendingCreate(updatedNote);
      return;
    }

    // Agregar acción pendiente para sincronización
    await db.pendingActions.add({
      type: 'update_note',
      data: { id, title: updates.title, content: updates.content, updatedAt: updates.updatedAt },
      timestamp: new Date().toISOString(),
      retryCount: 0,
    });
  }

  // Eliminar una nota (soft delete para notas del servidor, borrado local para notas pendientes)
  async deleteNote(id: string): Promise<void> {
    const existing = await db.notes.get(id);

    if (!existing) {
      return;
    }

    if (!existing.synced || !this.isServerId(id)) {
      // Nunca llegó al servidor: borrar localmente y limpiar acciones pendientes relacionadas
      await db.notes.delete(id);
      await this.removeActionsForNote(id);
      return;
    }

    await db.notes.update(id, {
      deleted: true,
      synced: false,
      updatedAt: new Date().toISOString(),
    });

    // Agregar acción pendiente para sincronización
    await db.pendingActions.add({
      type: 'delete_note',
      data: { id },
      timestamp: new Date().toISOString(),
      retryCount: 0,
    });
  }

  private async replacePendingCreate(note: OfflineNote): Promise<void> {
    const actions = await db.pendingActions.toArray();
    const pendingCreate = actions.find(
      (action) => action.type === 'create_note' && action.data?.id === note.id
    );

    if (pendingCreate) {
      await db.pendingActions.update(pendingCreate.id, {
        data: {
          ...pendingCreate.data,
          title: note.title,
          content: note.content,
          updatedAt: note.updatedAt,
        },
        timestamp: new Date().toISOString(),
        retryCount: 0,
      });
      return;
    }

    // Re-encolar como creación si no hay una acción pendiente para esta nota local
    await db.pendingActions.add({
      type: 'create_note',
      data: note,
      timestamp: new Date().toISOString(),
      retryCount: 0,
    });
  }

  private async removeActionsForNote(id: string): Promise<void> {
    const actions = await db.pendingActions.toArray();
    const relatedActions = actions.filter(
      (action) =>
        ['create_note', 'update_note', 'delete_note'].includes(action.type) &&
        action.data?.id === id
    );

    for (const action of relatedActions) {
      await db.pendingActions.delete(action.id);
    }
  }

  // Sincronizar notas con el servidor
  async syncNotes(): Promise<void> {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        console.log('No token found, skipping note sync');
        return;
      }

      const serverNotes = await notesAPI.getNotes();
      const safeServerNotes = Array.isArray(serverNotes) ? serverNotes : [];

      // Obtener notas locales
      const localNotes = await db.notes.toArray();
      const serverIds = new Set(safeServerNotes.map((note: Note) => note.id));

      // Actualizar notas locales con las del servidor
      for (const serverNote of safeServerNotes) {
        const localNote = localNotes.find((n: OfflineNote) => n.id === serverNote.id);

        if (localNote?.deleted) {
          // Hay un borrado local pendiente; no resucitar la nota desde el servidor
          continue;
        }

        if (localNote && !localNote.synced) {
          // Cambios locales pendientes ganan hasta que se suban al servidor
          continue;
        }

        if (!localNote) {
          // Nueva nota del servidor
          await db.notes.add({
            ...serverNote,
            synced: true,
            deleted: false,
          });
          continue;
        }

        if (new Date(serverNote.updatedAt) > new Date(localNote.updatedAt)) {
          // Actualizar nota local si la del servidor es más reciente
          await db.notes.update(serverNote.id, {
            ...serverNote,
            synced: true,
            deleted: false,
          });
        }
      }

      // Eliminar localmente notas sincronizadas que ya no existen en el servidor
      for (const localNote of localNotes) {
        if (localNote.deleted || !localNote.synced || !this.isServerId(localNote.id)) {
          continue;
        }
        if (!serverIds.has(localNote.id)) {
          await db.notes.delete(localNote.id);
        }
      }
    } catch (error: any) {
      console.error('Error syncing notes:', error);
      // Si es error 401 o 404, probablemente no hay autenticación o endpoint no disponible
      // No interrumpir la app, solo loggear el error
      if (error.response?.status === 401 || error.response?.status === 404) {
        console.log('Skipping note sync due to auth or endpoint error');
      }
    }
  }

  // Marcar nota como sincronizada
  async markNoteSynced(noteId: string): Promise<void> {
    await db.notes.update(noteId, { synced: true });
  }
}

export const notesService = new NotesService();
