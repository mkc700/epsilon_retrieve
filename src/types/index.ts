export interface User {
  id: string;
  username: string;
  email: string;
  createdAt: string;
}

export interface AuthResponse {
  success: boolean;
  token: string;
  user: User;
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

export interface TodoItem {
  id: string;
  userId: string;
  title: string;
  description?: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
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
