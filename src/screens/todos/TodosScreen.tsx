import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
} from 'react-native';
import { TodoItem } from '../../types';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';

// Mock data - estilo Microsoft To Do
const mockTodos: TodoItem[] = [
  {
    id: '1',
    userId: '1',
    title: 'Comprar groceries',
    description: 'Leche, huevos, pan',
    completed: false,
    priority: 'high',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    synced: true,
    deleted: false,
  },
  {
    id: '2',
    userId: '1',
    title: 'Llamar al doctor',
    completed: true,
    priority: 'medium',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    synced: true,
    deleted: false,
  },
];

export default function TodosScreen() {
  const [todos, setTodos] = useState<TodoItem[]>(mockTodos);
  const [showModal, setShowModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const { colors } = useTheme();
  const router = useRouter();

  const handleAddTodo = () => {
    if (!newTitle.trim()) {
      Alert.alert('Error', 'El título es requerido');
      return;
    }
    const newTodo: TodoItem = {
      id: Date.now().toString(),
      userId: '1',
      title: newTitle,
      description: newDescription,
      completed: false,
      priority: newPriority,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      synced: false,
      deleted: false,
    };
    setTodos([newTodo, ...todos]);
    setNewTitle('');
    setNewDescription('');
    setNewPriority('medium');
    setShowModal(false);
  };

  const handleToggleComplete = (id: string) => {
    setTodos(
      todos.map(todo =>
        todo.id === id ? { ...todo, completed: !todo.completed, synced: false } : todo
      )
    );
  };

  const handleDeleteTodo = (id: string) => {
    Alert.alert(
      'Eliminar tarea',
      '¿Estás seguro de eliminar esta tarea?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            setTodos(todos.filter(todo => todo.id !== id));
          },
        },
      ]
    );
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return colors.error;
      case 'medium':
        return colors.warning;
      case 'low':
        return colors.success;
      default:
        return colors.textTertiary;
    }
  };

  const filteredTodos = todos.filter(todo => {
    if (filter === 'active') return !todo.completed;
    if (filter === 'completed') return todo.completed;
    return true;
  });

  const renderTodo = ({ item }: { item: TodoItem }) => (
    <View style={[styles.todoCard, item.completed && styles.completedCard]}>
      <TouchableOpacity
        style={styles.todoContent}
        onPress={() => handleToggleComplete(item.id)}
      >
        <View style={[styles.checkbox, item.completed && styles.checkboxChecked]}>
          {item.completed && <Text style={styles.checkmark}>✓</Text>}
        </View>
        <View style={styles.todoTextContainer}>
          <Text style={[styles.todoTitle, item.completed && styles.completedText]}>
            {item.title}
          </Text>
          {item.description && (
            <Text style={[styles.todoDescription, item.completed && styles.completedText]}>
              {item.description}
            </Text>
          )}
        </View>
      </TouchableOpacity>
      <View style={styles.todoFooter}>
        <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(item.priority) + '20' }]}>
          <Text style={[styles.priorityText, { color: getPriorityColor(item.priority) }]}>
            {item.priority.toUpperCase()}
          </Text>
        </View>
        <TouchableOpacity onPress={() => handleDeleteTodo(item.id)}>
          <Text style={styles.deleteText}>Eliminar</Text>
        </TouchableOpacity>
      </View>
      {!item.synced && <Text style={styles.syncBadge}>Sin sincronizar</Text>}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} accessible={true} accessibilityLabel="Volver" accessibilityRole="button">
          <Text style={[styles.backButtonText, { color: colors.primary }]}>← Volver</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Mis Tareas</Text>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={() => setShowModal(true)}
          accessible={true}
          accessibilityLabel="Crear nueva tarea"
          accessibilityRole="button"
        >
          <Text style={styles.addButtonText}>+ Nueva Tarea</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.filterContainer, { backgroundColor: colors.surface }]}>
        <TouchableOpacity
          style={[styles.filterButton, { backgroundColor: colors.surfaceSecondary }, filter === 'all' && { backgroundColor: colors.primary }]}
          onPress={() => setFilter('all')}
          accessible={true}
          accessibilityLabel="Filtrar todas las tareas"
          accessibilityRole="button"
          accessibilityState={{ selected: filter === 'all' }}
        >
          <Text style={[styles.filterText, { color: colors.textSecondary }, filter === 'all' && { color: '#fff' }]}>
            Todas
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, { backgroundColor: colors.surfaceSecondary }, filter === 'active' && { backgroundColor: colors.primary }]}
          onPress={() => setFilter('active')}
          accessible={true}
          accessibilityLabel="Filtrar tareas activas"
          accessibilityRole="button"
          accessibilityState={{ selected: filter === 'active' }}
        >
          <Text style={[styles.filterText, { color: colors.textSecondary }, filter === 'active' && { color: '#fff' }]}>
            Activas
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, { backgroundColor: colors.surfaceSecondary }, filter === 'completed' && { backgroundColor: colors.primary }]}
          onPress={() => setFilter('completed')}
          accessible={true}
          accessibilityLabel="Filtrar tareas completadas"
          accessibilityRole="button"
          accessibilityState={{ selected: filter === 'completed' }}
        >
          <Text style={[styles.filterText, { color: colors.textSecondary }, filter === 'completed' && { color: '#fff' }]}>
            Completadas
          </Text>
        </TouchableOpacity>
      </View>

      {showModal && (
        <View style={styles.modal}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Nueva Tarea</Text>
            <TextInput
              style={styles.input}
              placeholder="Título"
              value={newTitle}
              onChangeText={setNewTitle}
            />
            <TextInput
              style={styles.input}
              placeholder="Descripción (opcional)"
              value={newDescription}
              onChangeText={setNewDescription}
            />
            <Text style={styles.label}>Prioridad:</Text>
            <View style={styles.prioritySelector}>
              {(['low', 'medium', 'high'] as const).map(priority => (
                <TouchableOpacity
                  key={priority}
                  style={[
                    styles.priorityOption,
                    newPriority === priority && styles.priorityOptionSelected,
                    { borderColor: getPriorityColor(priority) },
                  ]}
                  onPress={() => setNewPriority(priority)}
                >
                  <Text style={styles.priorityOptionText}>{priority.toUpperCase()}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowModal(false);
                  setNewTitle('');
                  setNewDescription('');
                  setNewPriority('medium');
                }}
              >
                <Text style={styles.modalButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleAddTodo}
              >
                <Text style={styles.modalButtonText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      <FlatList
        data={filteredTodos}
        renderItem={renderTodo}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No hay tareas</Text>
            <Text style={styles.emptySubtext}>
              Crea tu primera tarea para comenzar
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  backButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  addButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: 'center',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
  },
  todoCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  completedCard: {
    opacity: 0.6,
  },
  todoContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxChecked: {
    borderWidth: 0,
  },
  checkmark: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  todoTextContainer: {
    flex: 1,
  },
  todoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  todoDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  completedText: {
    textDecorationLine: 'line-through',
  },
  todoFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '600',
  },
  deleteText: {
    fontSize: 12,
    fontWeight: '500',
  },
  syncBadge: {
    fontSize: 11,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    marginBottom: 8,
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: 14,
  },
  modal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    borderRadius: 12,
    padding: 24,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
    marginBottom: 16,
    fontSize: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  prioritySelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  priorityOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  priorityOptionSelected: {
    borderWidth: 0,
  },
  priorityOptionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 6,
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});
