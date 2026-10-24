// Tipos base para la aplicación
// Se expandirá con la implementación de MongoDB y sync

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  lastSync?: string;
}

export interface Note {
  id: string;
  userId: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  synced: boolean;
  deleted: boolean;
}

export interface AgendaItem {
  id: string;
  userId: string;
  title: string;
  description?: string;
  date: string;
  time?: string;
  createdAt: string;
  updatedAt: string;
  synced: boolean;
  deleted: boolean;
}

export interface TodoItem {
  id: string;
  userId: string;
  title: string;
  description?: string;
  completed: boolean;
  dueDate?: string;
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  updatedAt: string;
  synced: boolean;
  deleted: boolean;
}

export interface SyncStatus {
  lastSync: string | null;
  isSyncing: boolean;
  pendingChanges: number;
}
