import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

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

export default function AgendaScreen() {
  const { user } = useAuth();
  const userId = user?.id || 'local-development';

  return (
    <AgendaContent key={userId} userId={userId} />
  );
}

function AgendaContent({ userId }: { userId: string }) {
  const router = useRouter();
  const { colors } = useTheme();
  const [agenda, setAgenda] = useState<AgendaItem[]>(mockAgenda);
  const [showModal, setShowModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');

  const handleAddItem = () => {
    if (!newTitle.trim() || !newDate.trim()) {
      Alert.alert('Error', 'El título y la fecha son requeridos');
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
    setNewTitle('');
    setNewDescription('');
    setNewDate('');
    setNewTime('');
    setShowModal(false);
  };

  const handleDeleteItem = (id: string) => {
    Alert.alert(
      'Eliminar evento',
      '¿Estás seguro de eliminar este evento?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            setAgenda(agenda.filter(item => item.id !== id));
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: AgendaItem }) => (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.cardHeader}>
        <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>
        <TouchableOpacity onPress={() => handleDeleteItem(item.id)} accessible={true} accessibilityLabel="Eliminar evento" accessibilityRole="button">
          <Text style={[styles.deleteText, { color: colors.error }]}>Eliminar</Text>
        </TouchableOpacity>
      </View>
      {item.description && (
        <Text style={[styles.description, { color: colors.textSecondary }]}>{item.description}</Text>
      )}
      <View style={styles.cardFooter}>
        <View style={styles.dateContainer}>
          <Text style={styles.dateLabel}>📅</Text>
          <Text style={[styles.dateText, { color: colors.textSecondary }]}>
            {new Date(item.date).toLocaleDateString()}
          </Text>
        </View>
        {item.time && (
          <View style={styles.timeContainer}>
            <Text style={styles.timeLabel}>⏰</Text>
            <Text style={[styles.timeText, { color: colors.textSecondary }]}>{item.time}</Text>
          </View>
        )}
      </View>
      {!item.synced && <Text style={[styles.syncBadge, { backgroundColor: colors.warning, color: colors.text }]}>Sin sincronizar</Text>}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} accessible={true} accessibilityLabel="Volver" accessibilityRole="button">
          <Text style={[styles.backButtonText, { color: colors.primary }]}>← Volver</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Agenda</Text>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Crear nuevo evento"
          accessibilityRole="button"
        >
          <Text style={styles.addButtonText}>+ Evento</Text>
        </TouchableOpacity>
      </View>

      {showModal && (
        <View style={styles.modal}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Nuevo Evento</Text>
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
            <TextInput
              style={styles.input}
              placeholder="Fecha (YYYY-MM-DD)"
              value={newDate}
              onChangeText={setNewDate}
            />
            <TextInput
              style={styles.input}
              placeholder="Hora (HH:MM)"
              value={newTime}
              onChangeText={setNewTime}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowModal(false);
                  setNewTitle('');
                  setNewDescription('');
                  setNewDate('');
                  setNewTime('');
                }}
              >
                <Text style={styles.modalButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleAddItem}
              >
                <Text style={styles.modalButtonText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      <FlatList
        data={agenda}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No hay eventos</Text>
            <Text style={styles.emptySubtext}>
              Agrega tu primer evento a la agenda
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    minHeight: 76,
    borderBottomWidth: 1,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  backButton: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    minHeight: 44,
    paddingRight: 8,
  },
  backText: {
    fontSize: 13,
  },
  headerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  addText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.5,
  },
  page: {
    width: '100%',
    maxWidth: 1220,
    alignSelf: 'center',
    paddingTop: 30,
  },
  intro: {
    marginBottom: 25,
    gap: 8,
  },
  pageTitle: {
    fontSize: 27,
    fontWeight: '700',
    letterSpacing: -0.8,
    lineHeight: 34,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 20,
  },
  workspace: {
    gap: 20,
    alignItems: 'stretch',
  },
  desktopWorkspace: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  calendarPanel: {
    borderWidth: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  calendarFooter: {
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  legendDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  calendarHint: {
    fontSize: 10,
  },
  dayPanel: {
    borderWidth: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  dayHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    padding: 19,
    borderBottomWidth: 1,
  },
  backButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  tileWeekday: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.7,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
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
  eventList: {
    padding: 16,
    gap: 12,
  },
  eventCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  eventAccent: {
    width: 3,
    alignSelf: 'stretch',
    minHeight: 41,
    borderRadius: 2,
  },
  eventBody: {
    flex: 1,
    gap: 7,
  },
  eventTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  deleteText: {
    fontSize: 12,
    fontWeight: '500',
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 21,
  },
  eventDescription: {
    fontSize: 12,
    lineHeight: 20,
  },
  cardFooter: {
    flexDirection: 'row',
    gap: 15,
  },
  localInfo: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateLabel: {
    fontSize: 16,
    marginRight: 5,
  },
  dateText: {
    fontSize: 14,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeLabel: {
    fontSize: 16,
    marginRight: 5,
  },
  timeText: {
    fontSize: 14,
  },
  syncButtonText: {
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
    gap: 15,
  },
  loadingText: {
    fontSize: 12,
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
    gap: 15,
  },
  errorTitle: {
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
  },
  modalContent: {
    borderRadius: 12,
    padding: 24,
    width: '90%',
    maxHeight: '80%',
  },
  notice: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    maxWidth: 650,
    alignSelf: 'center',
    marginHorizontal: 'auto',
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
    marginBottom: 16,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  noticeText: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 6,
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  dismissNotice: {
    width: 35,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
