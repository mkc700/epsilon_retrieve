import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Modal,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TodoItem } from '../../types';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { CustomModal } from '../../components/CustomModal';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { todoApi } from '../../api/todoApi';
import { useAuth } from '../../context/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type FeedbackModal = {
  visible: boolean;
  title: string;
  message: string;
  type: 'success' | 'error' | 'info';
};

export default function TodosScreen() {
  const [showModal, setShowModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [feedbackModal, setFeedbackModal] = useState<FeedbackModal>({
    visible: false,
    title: '',
    message: '',
    type: 'info',
  });
  const [todoToDelete, setTodoToDelete] = useState<TodoItem | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    AsyncStorage.getItem('token').then(setToken);
  }, [user]);

  const { data: todos = [], isLoading, isError, error } = useQuery({
    queryKey: ['todos'],
    queryFn: () => todoApi.getTodos(token as string),
    enabled: !!token,
    retry: 1,
  });

  const createMutation = useMutation({
    mutationFn: (newTodo: Partial<TodoItem>) => todoApi.createTodo({ ...newTodo, synced: false }, token as string),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] });
      resetForm();
      setShowModal(false);
    },
    onError: () => showModalMessage('Error', 'No se pudo crear la tarea', 'error'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<TodoItem> }) =>
      todoApi.updateTodo(id, updates, token as string),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['todos'] }),
    onError: () => showModalMessage('Error', 'No se pudo actualizar la tarea', 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => todoApi.deleteTodo(id, token as string),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['todos'] }),
    onError: () => showModalMessage('Error', 'No se pudo eliminar la tarea', 'error'),
  });

  const showModalMessage = (title: string, message: string, type: FeedbackModal['type'] = 'info') => {
    setFeedbackModal({ visible: true, title, message, type });
  };

  const resetForm = () => {
    setNewTitle('');
    setNewDescription('');
    setNewPriority('medium');
  };

  const handleAddTodo = () => {
    if (!newTitle.trim()) {
      showModalMessage('Error', 'El título es requerido', 'error');
      return;
    }
    createMutation.mutate({
      title: newTitle,
      description: newDescription,
      priority: newPriority,
      completed: false,
    });
  };

  const handleToggleComplete = (item: TodoItem) => {
    updateMutation.mutate({ id: item.id, updates: { completed: !item.completed } });
  };

  const confirmDeleteTodo = () => {
    if (!todoToDelete) return;
    deleteMutation.mutate(todoToDelete.id);
    setTodoToDelete(null);
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

  const filteredTodos = todos.filter((todo: TodoItem) => {
    if (filter === 'active') return !todo.completed;
    if (filter === 'completed') return todo.completed;
    return true;
  });

  const renderTodo = ({ item }: { item: TodoItem }) => {
    const priorityColor = getPriorityColor(item.priority);

    return (
      <View
        style={[
          styles.todoCard,
          { backgroundColor: colors.surface, borderColor: colors.border },
          item.completed && styles.completedCard,
        ]}
      >
        <TouchableOpacity
          style={styles.todoContent}
          onPress={() => handleToggleComplete(item)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: item.completed }}
          accessibilityLabel={`${item.completed ? 'Marcar como pendiente' : 'Completar'}: ${item.title}`}
        >
          <View
            style={[
              styles.checkbox,
              { borderColor: colors.primary },
              item.completed && { backgroundColor: colors.primary, borderColor: colors.primary },
            ]}
          >
            {item.completed && <Text style={[styles.checkmark, { color: colors.onPrimary }]}>—</Text>}
          </View>
          <View style={styles.todoTextContainer}>
            <Text
              style={[
                styles.todoTitle,
                { color: colors.text },
                item.completed && styles.completedText,
              ]}
            >
              {item.title}
            </Text>
            {item.description ? (
              <Text
                style={[
                  styles.todoDescription,
                  { color: colors.textSecondary },
                  item.completed && styles.completedText,
                ]}
              >
                {item.description}
              </Text>
            ) : null}
          </View>
        </TouchableOpacity>
        <View style={styles.todoFooter}>
          <View style={[styles.priorityBadge, { backgroundColor: `${priorityColor}20` }]}>
            <Text
              style={[
                styles.priorityText,
                { color: item.priority === 'medium' ? colors.onWarning : priorityColor },
              ]}
            >
              {item.priority ? item.priority.toUpperCase() : 'MEDIUM'}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setTodoToDelete(item)}
            accessible={true}
            accessibilityLabel="Eliminar tarea"
            accessibilityRole="button"
          >
            <Text style={[styles.deleteText, { color: colors.error }]}>Eliminar</Text>
          </TouchableOpacity>
        </View>
        {!item.synced && (
          <Text style={[styles.syncBadge, { backgroundColor: colors.warning, color: colors.onWarning }]}>
            Sin sincronizar
          </Text>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View
        style={[
          styles.header,
          { backgroundColor: colors.surface, borderBottomColor: colors.border },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          accessible={true}
          accessibilityLabel="Volver"
          accessibilityRole="button"
        >
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
          <Text style={[styles.addButtonText, { color: colors.onPrimary }]}>+ Nueva Tarea</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.filterContainer, { backgroundColor: colors.surface }]}>
        {([
          { id: 'all', label: 'Todas', accessibilityLabel: 'Filtrar todas las tareas' },
          { id: 'active', label: 'Activas', accessibilityLabel: 'Filtrar tareas activas' },
          { id: 'completed', label: 'Completadas', accessibilityLabel: 'Filtrar tareas completadas' },
        ] as const).map(item => (
          <TouchableOpacity
            key={item.id}
            style={[
              styles.filterButton,
              { backgroundColor: colors.surfaceSecondary },
              filter === item.id && { backgroundColor: colors.primary },
            ]}
            onPress={() => setFilter(item.id)}
            accessible={true}
            accessibilityLabel={item.accessibilityLabel}
            accessibilityRole="button"
            accessibilityState={{ selected: filter === item.id }}
          >
            <Text
              style={[
                styles.filterText,
                { color: colors.textSecondary },
                filter === item.id && { color: colors.onPrimary },
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Modal
        visible={showModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowModal(false);
          resetForm();
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <View style={styles.modal}>
            <ScrollView keyboardShouldPersistTaps="handled" style={styles.modalScroll}>
              <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Nueva Tarea</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                  placeholder="Título"
                  placeholderTextColor={colors.textTertiary}
                  value={newTitle}
                  onChangeText={setNewTitle}
                  accessible={true}
                  accessibilityLabel="Título de la tarea"
                />
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                  placeholder="Descripción (opcional)"
                  placeholderTextColor={colors.textTertiary}
                  value={newDescription}
                  onChangeText={setNewDescription}
                  accessible={true}
                  accessibilityLabel="Descripción de la tarea"
                />
                <Text style={[styles.label, { color: colors.text }]}>Prioridad:</Text>
                <View style={styles.prioritySelector}>
                  {(['low', 'medium', 'high'] as const).map(priority => {
                    const selected = newPriority === priority;
                    const priorityColor = getPriorityColor(priority);

                    return (
                      <TouchableOpacity
                        key={priority}
                        style={[
                          styles.priorityOption,
                          { borderColor: priorityColor },
                          selected && { backgroundColor: `${priorityColor}20` },
                        ]}
                        onPress={() => setNewPriority(priority)}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        accessibilityLabel={`Prioridad ${priority.toUpperCase()}`}
                      >
                        <Text style={[styles.priorityOptionText, { color: colors.text }]}>
                          {priority.toUpperCase()}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, { backgroundColor: colors.surfaceSecondary }]}
                    onPress={() => {
                      setShowModal(false);
                      resetForm();
                    }}
                    accessible={true}
                    accessibilityLabel="Cancelar"
                    accessibilityRole="button"
                  >
                    <Text style={[styles.modalButtonText, { color: colors.text }]}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, { backgroundColor: colors.primary }]}
                    onPress={handleAddTodo}
                    disabled={createMutation.isPending}
                    accessible={true}
                    accessibilityLabel="Guardar tarea"
                    accessibilityRole="button"
                  >
                    <Text style={[styles.modalButtonText, { color: colors.onPrimary }]}>
                      {createMutation.isPending ? 'Guardando...' : 'Guardar'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {isLoading ? (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary, marginTop: 10 }]}>
            Cargando tareas...
          </Text>
        </View>
      ) : isError ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Error al cargar las tareas.
          </Text>
          <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>
            {error instanceof Error ? error.message : 'Error desconocido'}
          </Text>
          <TouchableOpacity
            style={[styles.modalButton, { backgroundColor: colors.primary, marginTop: 16, paddingHorizontal: 24 }]}
            onPress={() => queryClient.invalidateQueries({ queryKey: ['todos'] })}
            accessible={true}
            accessibilityLabel="Reintentar cargar tareas"
            accessibilityRole="button"
          >
            <Text style={[styles.modalButtonText, { color: colors.onPrimary }]}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredTodos}
          renderItem={renderTodo}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No hay tareas</Text>
              <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>
                Crea tu primera tarea para comenzar
              </Text>
            </View>
          }
        />
      )}

      <CustomModal
        visible={feedbackModal.visible}
        title={feedbackModal.title}
        message={feedbackModal.message}
        type={feedbackModal.type}
        onClose={() => setFeedbackModal(current => ({ ...current, visible: false }))}
      />

      <CustomModal
        visible={todoToDelete !== null}
        title="Eliminar tarea"
        message="¿Estás seguro de eliminar esta tarea?"
        type="error"
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        destructive
        onClose={() => setTodoToDelete(null)}
        onConfirm={confirmDeleteTodo}
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
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  backButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    minHeight: 44,
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  addButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minHeight: 44,
    justifyContent: 'center',
  },
  addButtonText: {
    fontWeight: '600',
    fontSize: 14,
    letterSpacing: 0.2,
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
    minHeight: 44,
    justifyContent: 'center',
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
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkmark: {
    fontWeight: '700',
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
    gap: 16,
  },
  priorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  deleteText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  syncBadge: {
    fontSize: 11,
    fontWeight: '600',
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
    lineHeight: 20,
  },
  modalContainer: {
    flex: 1,
  },
  modal: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalScroll: {
    width: '100%',
  },
  modalContent: {
    borderRadius: 12,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    alignSelf: 'center',
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
    lineHeight: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  prioritySelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 20,
  },
  priorityOption: {
    flex: 1,
    minHeight: 44,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priorityOptionText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonText: {
    fontWeight: '600',
    fontSize: 16,
  },
});
