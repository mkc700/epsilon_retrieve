import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
  ScrollView,
  Pressable,
} from 'react-native';
import { Note } from '../../types/index';
import { useFocusEffect, useRouter } from 'expo-router';
import { notesService } from '../../services/notesService';
import { syncService } from '../../services/syncService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../context/ThemeContext';

export default function NotesScreen() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [showEditNameModal, setShowEditNameModal] = useState(false);
  const [contextMenuNote, setContextMenuNote] = useState<Note | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [editNameValue, setEditNameValue] = useState('');
  const [userId, setUserId] = useState<string>('');
  const { colors } = useTheme();
  const router = useRouter();

  const loadUserData = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        // Decodificar el token JWT para obtener el userId
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        const decoded = JSON.parse(jsonPayload);
        setUserId(decoded.userId || '1');
        return;
      }
      setUserId('1');
    } catch (error) {
      console.error('Error decoding token:', error);
      setUserId('1');
    }
  };

  const loadNotes = async () => {
    try {
      const loadedNotes = await notesService.getNotes();
      setNotes(loadedNotes);
    } catch (error) {
      console.error('Error loading notes:', error);
    }
  };

  const refreshNotes = useCallback(async () => {
    // Mostrar primero el contenido local para que la nota "Sin sincronizar" no desaparezca
    await loadNotes();

    try {
      await syncService.syncPendingActions();
      await loadNotes();
    } catch (error) {
      console.error('Error syncing notes screen:', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadUserData();
      refreshNotes();

      // Refrescar la lista local periódicamente para reflejar sincronizaciones en segundo plano
      const refreshInterval = setInterval(() => {
        loadNotes();
      }, 5000);

      // Sincronizar al salir de Notas hacia cualquier otra sección, incluido el menú
      return () => {
        clearInterval(refreshInterval);
        syncService.syncPendingActions().catch(error =>
          console.error('Error syncing on leaving notes:', error)
        );
      };
    }, [refreshNotes])
  );

  const handleAddNote = async () => {
    if (!newTitle.trim()) {
      Alert.alert('Error', 'El título es requerido');
      return;
    }
    try {
      await notesService.createNote(newTitle, newContent, userId || '1');
      await loadNotes();
      setNewTitle('');
      setNewContent('');
      setShowModal(false);
      // Sincronizar en segundo plano y refrescar al terminar
      syncService.syncPendingActions()
        .then(loadNotes)
        .catch(syncError => console.error('Error syncing new note:', syncError));
    } catch (error) {
      Alert.alert('Error', 'No se pudo crear la nota');
      console.error('Error creating note:', error);
    }
  };

  const handleDeleteNote = async (id: string) => {
    try {
      await notesService.deleteNote(id);
      await loadNotes();
      setShowContextMenu(false);
      setContextMenuNote(null);
      syncService.syncPendingActions()
        .then(loadNotes)
        .catch(syncError => console.error('Error syncing deleted note:', syncError));
    } catch (error) {
      Alert.alert('Error', 'No se pudo eliminar la nota');
      console.error('Error deleting note:', error);
    }
  };

  const handleNotePress = (note: Note) => {
    router.push(`/notes/${note.id}`);
  };

  const handleNoteLongPress = (note: Note) => {
    setContextMenuNote(note);
    setShowContextMenu(true);
  };

  const handleQuickEdit = () => {
    if (contextMenuNote) {
      setEditNameValue(contextMenuNote.title);
      setShowEditNameModal(true);
      setShowContextMenu(false);
    }
  };

  const handleSaveNameEdit = async () => {
    if (contextMenuNote && editNameValue.trim()) {
      try {
        await notesService.updateNote(contextMenuNote.id, editNameValue, contextMenuNote.content);
        await loadNotes();
        setShowEditNameModal(false);
        setContextMenuNote(null);
        syncService.syncPendingActions()
          .then(loadNotes)
          .catch(syncError => console.error('Error syncing renamed note:', syncError));
      } catch (error) {
        Alert.alert('Error', 'No se pudo actualizar la nota');
        console.error('Error updating note:', error);
      }
    }
  };

  const renderNote = ({ item }: { item: Note }) => (
    <Pressable
      style={[styles.noteCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={() => handleNotePress(item)}
      onLongPress={() => handleNoteLongPress(item)}
      accessible={true}
      accessibilityLabel={`Nota: ${item.title}`}
      accessibilityRole="button"
      accessibilityHint="Toca para ver, mantén presionado para opciones"
    >
      <View style={styles.noteHeader}>
        <Text style={[styles.noteTitle, { color: colors.text }]}>{item.title}</Text>
        <Text style={[styles.hintText, { color: colors.textTertiary }]}>Toque para ver • Mantenga para opciones</Text>
      </View>
      <Text style={[styles.noteContent, { color: colors.textSecondary }]} numberOfLines={2}>
        {item.content}
      </Text>
      <View style={styles.noteFooter}>
        <Text style={[styles.noteDate, { color: colors.textTertiary }]}>
          {new Date(item.updatedAt).toLocaleDateString()}
        </Text>
        {!item.synced && <Text style={[styles.syncBadge, { backgroundColor: colors.warning, color: '#1a1a1a' }]}>Sin sincronizar</Text>}
      </View>
    </Pressable>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} accessible={true} accessibilityLabel="Volver" accessibilityRole="button">
          <Text style={[styles.backButtonText, { color: colors.primary }]}>← Volver</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Mis Notas</Text>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={() => setShowModal(true)}
          accessible={true}
          accessibilityLabel="Crear nueva nota"
          accessibilityRole="button"
        >
          <Text style={styles.addButtonText}>+ Nueva Nota</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={showModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <View style={styles.modal}>
            <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Nueva Nota</Text>
              <ScrollView keyboardShouldPersistTaps="handled">
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                  placeholder="Título"
                  placeholderTextColor={colors.textTertiary}
                  value={newTitle}
                  onChangeText={setNewTitle}
                  autoFocus
                  editable={true}
                  accessible={true}
                  accessibilityLabel="Título de la nota"
                />
                <TextInput
                  style={[styles.input, styles.textArea, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                  placeholder="Contenido"
                  placeholderTextColor={colors.textTertiary}
                  value={newContent}
                  onChangeText={setNewContent}
                  multiline
                  numberOfLines={4}
                  editable={true}
                  accessible={true}
                  accessibilityLabel="Contenido de la nota"
                />
              </ScrollView>
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: colors.border }]}
                  onPress={() => {
                    setShowModal(false);
                    setNewTitle('');
                    setNewContent('');
                  }}
                  accessible={true}
                  accessibilityLabel="Cancelar"
                  accessibilityRole="button"
                >
                  <Text style={[styles.modalButtonText, { color: colors.text }]}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: colors.primary }]}
                  onPress={handleAddNote}
                  accessible={true}
                  accessibilityLabel="Guardar nota"
                  accessibilityRole="button"
                >
                  <Text style={styles.modalButtonText}>Guardar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {showEditNameModal && (
        <Modal
          visible={showEditNameModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowEditNameModal(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContainer}
          >
            <View style={styles.modal}>
              <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Editar Nombre</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                  placeholder="Nuevo nombre"
                  placeholderTextColor={colors.textTertiary}
                  value={editNameValue}
                  onChangeText={setEditNameValue}
                  autoFocus
                  editable={true}
                  accessible={true}
                  accessibilityLabel="Nuevo nombre de la nota"
                />
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, { backgroundColor: colors.border }]}
                    onPress={() => {
                      setShowEditNameModal(false);
                      setEditNameValue('');
                      setContextMenuNote(null);
                    }}
                    accessible={true}
                    accessibilityLabel="Cancelar"
                    accessibilityRole="button"
                  >
                    <Text style={[styles.modalButtonText, { color: colors.text }]}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, { backgroundColor: colors.primary }]}
                    onPress={handleSaveNameEdit}
                    accessible={true}
                    accessibilityLabel="Guardar cambios"
                    accessibilityRole="button"
                  >
                    <Text style={styles.modalButtonText}>Guardar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      )}

      {showContextMenu && contextMenuNote && (
        <Modal
          visible={showContextMenu}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowContextMenu(false)}
        >
          <TouchableOpacity
            style={styles.contextMenuOverlay}
            activeOpacity={1}
            onPress={() => setShowContextMenu(false)}
          >
            <View style={[styles.contextMenu, { backgroundColor: colors.surface }]}>
              <Text style={[styles.contextMenuTitle, { color: colors.text }]}>Opciones</Text>
              <TouchableOpacity
                style={[styles.contextMenuItem, { borderBottomColor: colors.border }]}
                onPress={handleQuickEdit}
                accessible={true}
                accessibilityLabel="Editar nombre"
                accessibilityRole="button"
              >
                <Text style={[styles.contextMenuItemText, { color: colors.text }]}>✏️ Editar nombre</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.contextMenuItem}
                onPress={() => handleDeleteNote(contextMenuNote.id)}
                accessible={true}
                accessibilityLabel="Eliminar nota"
                accessibilityRole="button"
              >
                <Text style={[styles.contextMenuItemText, { color: colors.error }]}>🗑️ Eliminar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.contextMenuItem, styles.cancelMenuItem, { backgroundColor: colors.surfaceSecondary }]}
                onPress={() => setShowContextMenu(false)}
                accessible={true}
                accessibilityLabel="Cancelar"
                accessibilityRole="button"
              >
                <Text style={[styles.contextMenuItemText, { color: colors.text }]}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      <FlatList
        data={notes}
        renderItem={renderNote}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No hay notas aún</Text>
            <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>
              Crea tu primera nota para comenzar
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
  listContent: {
    padding: 16,
  },
  noteCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  noteTitle: {
    fontSize: 17,
    fontWeight: '600',
    flex: 1,
    letterSpacing: -0.3,
  },
  hintText: {
    fontSize: 11,
    marginLeft: 12,
  },
  noteContent: {
    fontSize: 15,
    marginBottom: 8,
    lineHeight: 22,
  },
  noteFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  noteDate: {
    fontSize: 12,
  },
  syncBadge: {
    fontSize: 11,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
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
  modalContainer: {
    flex: 1,
  },
  modal: {
    flex: 1,
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
  textArea: {
    height: 120,
    textAlignVertical: 'top',
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
  contextMenuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contextMenu: {
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxWidth: 300,
  },
  contextMenuTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  contextMenuItem: {
    padding: 16,
    borderBottomWidth: 1,
  },
  contextMenuItemText: {
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  cancelMenuItem: {
    marginTop: 12,
    borderRadius: 8,
  },
});
