import React, { useState } from 'react';
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
} from 'react-native';
import { AgendaItem } from '../../types';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { CustomModal } from '../../components/CustomModal';

// Mock data - se reemplazará con datos reales de MongoDB y sync
const mockAgenda: AgendaItem[] = [
  {
    id: '1',
    userId: '1',
    title: 'Reunión de trabajo',
    description: 'Discutir el proyecto nuevo',
    date: new Date().toISOString().split('T')[0],
    time: '10:00',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    synced: true,
    deleted: false,
  },
];

type FeedbackModal = {
  visible: boolean;
  title: string;
  message: string;
  type: 'success' | 'error' | 'info';
};

export default function AgendaScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [agenda, setAgenda] = useState<AgendaItem[]>(mockAgenda);
  const [showModal, setShowModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [feedbackModal, setFeedbackModal] = useState<FeedbackModal>({
    visible: false,
    title: '',
    message: '',
    type: 'info',
  });
  const [itemToDelete, setItemToDelete] = useState<AgendaItem | null>(null);

  const showModalMessage = (title: string, message: string, type: FeedbackModal['type'] = 'info') => {
    setFeedbackModal({ visible: true, title, message, type });
  };

  const resetForm = () => {
    setNewTitle('');
    setNewDescription('');
    setNewDate('');
    setNewTime('');
  };

  const handleAddItem = () => {
    if (!newTitle.trim() || !newDate.trim()) {
      showModalMessage('Error', 'El título y la fecha son requeridos', 'error');
      return;
    }
    const newItem: AgendaItem = {
      id: Date.now().toString(),
      userId: '1',
      title: newTitle,
      description: newDescription,
      date: newDate,
      time: newTime,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      synced: false,
      deleted: false,
    };
    setAgenda([newItem, ...agenda]);
    resetForm();
    setShowModal(false);
  };

  const confirmDeleteItem = () => {
    if (!itemToDelete) return;
    setAgenda(agenda.filter(item => item.id !== itemToDelete.id));
    setItemToDelete(null);
  };

  const renderItem = ({ item }: { item: AgendaItem }) => (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.cardHeader}>
        <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>
        <TouchableOpacity
          onPress={() => setItemToDelete(item)}
          accessible={true}
          accessibilityLabel="Eliminar evento"
          accessibilityRole="button"
        >
          <Text style={[styles.deleteText, { color: colors.error }]}>Eliminar</Text>
        </TouchableOpacity>
      </View>
      {item.description ? (
        <Text style={[styles.description, { color: colors.textSecondary }]}>{item.description}</Text>
      ) : null}
      <View style={styles.cardFooter}>
        <View style={styles.dateContainer}>
          <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>Fecha</Text>
          <Text style={[styles.dateText, { color: colors.textSecondary }]}>
            {new Date(item.date).toLocaleDateString()}
          </Text>
        </View>
        {item.time ? (
          <View style={styles.timeContainer}>
            <Text style={[styles.timeLabel, { color: colors.textSecondary }]}>Hora</Text>
            <Text style={[styles.timeText, { color: colors.textSecondary }]}>{item.time}</Text>
          </View>
        ) : null}
      </View>
      {!item.synced && (
        <Text style={[styles.syncBadge, { backgroundColor: colors.warning, color: colors.onWarning }]}>
          Sin sincronizar
        </Text>
      )}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
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
        <Text style={[styles.headerTitle, { color: colors.text }]}>Agenda</Text>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={() => setShowModal(true)}
          accessible={true}
          accessibilityLabel="Crear nuevo evento"
          accessibilityRole="button"
        >
          <Text style={[styles.addButtonText, { color: colors.onPrimary }]}>+ Evento</Text>
        </TouchableOpacity>
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
                <Text style={[styles.modalTitle, { color: colors.text }]}>Nuevo Evento</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                  placeholder="Título"
                  placeholderTextColor={colors.textTertiary}
                  value={newTitle}
                  onChangeText={setNewTitle}
                  accessible={true}
                  accessibilityLabel="Título del evento"
                />
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                  placeholder="Descripción (opcional)"
                  placeholderTextColor={colors.textTertiary}
                  value={newDescription}
                  onChangeText={setNewDescription}
                  accessible={true}
                  accessibilityLabel="Descripción del evento"
                />
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                  placeholder="Fecha (YYYY-MM-DD)"
                  placeholderTextColor={colors.textTertiary}
                  value={newDate}
                  onChangeText={setNewDate}
                  accessible={true}
                  accessibilityLabel="Fecha del evento"
                />
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                  placeholder="Hora (HH:MM)"
                  placeholderTextColor={colors.textTertiary}
                  value={newTime}
                  onChangeText={setNewTime}
                  accessible={true}
                  accessibilityLabel="Hora del evento"
                />
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
                    onPress={handleAddItem}
                    accessible={true}
                    accessibilityLabel="Guardar evento"
                    accessibilityRole="button"
                  >
                    <Text style={[styles.modalButtonText, { color: colors.onPrimary }]}>Guardar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <FlatList
        data={agenda}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No hay eventos</Text>
            <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>
              Agrega tu primer evento a la agenda
            </Text>
          </View>
        }
      />

      <CustomModal
        visible={feedbackModal.visible}
        title={feedbackModal.title}
        message={feedbackModal.message}
        type={feedbackModal.type}
        onClose={() => setFeedbackModal(current => ({ ...current, visible: false }))}
      />

      <CustomModal
        visible={itemToDelete !== null}
        title="Eliminar evento"
        message="¿Estás seguro de eliminar este evento?"
        type="error"
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        destructive
        onClose={() => setItemToDelete(null)}
        onConfirm={confirmDeleteItem}
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
    minHeight: 44,
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  headerTitle: {
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.5,
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
  listContent: {
    padding: 16,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    gap: 16,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    flex: 1,
    letterSpacing: -0.3,
  },
  deleteText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  description: {
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  cardFooter: {
    flexDirection: 'row',
    gap: 16,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
    marginRight: 6,
  },
  dateText: {
    fontSize: 14,
    lineHeight: 20,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
    marginRight: 6,
  },
  timeText: {
    fontSize: 14,
    lineHeight: 20,
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
