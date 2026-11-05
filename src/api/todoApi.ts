// src/api/todoApi.ts
import { TodoItem } from '../types';

// Usa localhost:5000 para Web, o 10.0.2.2:5000 si usas Emulador de Android
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';

export const todoApi = {
  getTodos: async (token: string): Promise<TodoItem[]> => {
    const response = await fetch(`${API_URL}/todos`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Error al cargar tareas');
    return response.json();
  },

  createTodo: async (todoData: Partial<TodoItem>, token: string): Promise<TodoItem> => {
    const response = await fetch(`${API_URL}/todos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(todoData),
    });
    if (!response.ok) throw new Error('Error al crear tarea');
    return response.json();
  },

  updateTodo: async (id: string, updates: Partial<TodoItem>, token: string): Promise<TodoItem> => {
    const response = await fetch(`${API_URL}/todos/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(updates),
    });
    if (!response.ok) throw new Error('Error al actualizar tarea');
    return response.json();
  },

  deleteTodo: async (id: string, token: string): Promise<void> => {
    const response = await fetch(`${API_URL}/todos/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Error al eliminar tarea');
  },
};