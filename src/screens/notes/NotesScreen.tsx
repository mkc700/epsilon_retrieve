import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
  Modal,
  useWindowDimensions,
  type KeyDownEvent,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Note } from '../../types/index';
import { useFocusEffect, useRouter } from 'expo-router';
import { notesService } from '../../services/notesService';
import { syncService } from '../../services/syncService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../context/ThemeContext';
import { CustomModal } from '../../components/CustomModal';
import { ContextMenu, type ContextMenuAction, type ContextMenuAnchor } from '../../components/ContextMenu';
import { hasFinePointer } from '../../utils/pointer';

type WebContextMenuEvent = {
  preventDefault?: () => void;
  clientX?: number;
  clientY?: number;
  nativeEvent?: { clientX?: number; clientY?: number };
};

export default function NotesScreen() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [showEditNameModal, setShowEditNameModal] = useState(false);
  const [contextMenuNote, setContextMenuNote] = useState<Note | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<ContextMenuAnchor | null>(null);
  const [focusedNoteId, setFocusedNoteId] = useState<string | null>(null);
  const [editNameValue, setEditNameValue] = useState('');
  const [userId, setUserId] = useState<string>('');
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedNotes, setSelectedNotes] = useState<Set<string>>(new Set());
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const narrow = width < 500;
  const router = useRouter();
  const usesFinePointer = hasFinePointer();
  const [modal, setModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'info';
  }>({ visible: false, title: '', message: '', type: 'info' });
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);

  const showModalMessage = (title: string, message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setModal({ visible: true, title, message, type });
  };

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
    try {
      const defaultTitle = 'Sin título';
      const newNote = await notesService.createNote(defaultTitle, '', userId || '1');
      console.log('Nota creada con ID:', newNote.id);
      // Esperar un momento para asegurar que la base de datos se actualice
      await new Promise(resolve => setTimeout(resolve, 100));
      await loadNotes();
      // Navegar directamente a la pantalla de edición
      router.push(`/notes/${newNote.id}`);
      // Sincronizar en segundo plano
      syncService.syncPendingActions()
        .then(loadNotes)
        .catch(syncError => console.error('Error syncing new note:', syncError));
    } catch (error) {
      showModalMessage('Error', 'No se pudo crear la nota', 'error');
      console.error('Error creating note:', error);
    }
  };

  const handleDeleteNote = async (id: string) => {
    try {
      await notesService.deleteNote(id);
      await loadNotes();
      setShowContextMenu(false);
      setMenuAnchor(null);
      setContextMenuNote(null);
      setNoteToDelete(null);
      syncService.syncPendingActions()
        .then(loadNotes)
        .catch(syncError => console.error('Error syncing deleted note:', syncError));
    } catch (error) {
      showModalMessage('Error', 'No se pudo eliminar la nota', 'error');
      console.error('Error deleting note:', error);
    }
  };

  const handleDeleteSelected = async () => {
    try {
      for (const noteId of selectedNotes) {
        await notesService.deleteNote(noteId);
      }
      await loadNotes();
      setSelectedNotes(new Set());
      setSelectionMode(false);
      syncService.syncPendingActions()
        .then(loadNotes)
        .catch(syncError => console.error('Error syncing deleted notes:', syncError));
    } catch (error) {
      showModalMessage('Error', 'No se pudieron eliminar las notas', 'error');
      console.error('Error deleting notes:', error);
    }
  };

  const toggleSelection = (noteId: string) => {
    const newSelection = new Set(selectedNotes);
    if (newSelection.has(noteId)) {
      newSelection.delete(noteId);
    } else {
      newSelection.add(noteId);
    }
    setSelectedNotes(newSelection);
  };

  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    setSelectedNotes(new Set());
  };

  const handleNotePress = (note: Note) => {
    if (selectionMode) {
      toggleSelection(note.id);
    } else {
      router.push(`/notes/${note.id}`);
    }
  };

  const openContextMenu = (note: Note, anchor: ContextMenuAnchor | null = null) => {
    // Evita que el mantener presionado (web) reabra el menú que el clic derecho ya abrió.
    if (showContextMenu) {
      return;
    }
    setContextMenuNote(note);
    setMenuAnchor(anchor);
    setShowContextMenu(true);
  };

  const closeContextMenu = () => {
    setShowContextMenu(false);
    setMenuAnchor(null);
  };

  const handleNoteLongPress = (note: Note) => {
    openContextMenu(note);
  };

  const handleNoteContextMenu = (note: Note, event: WebContextMenuEvent) => {
    event.preventDefault?.();
    const x = event.clientX ?? event.nativeEvent?.clientX ?? 0;
    const y = event.clientY ?? event.nativeEvent?.clientY ?? 0;
    openContextMenu(note, { x, y });
  };

  const handleNoteKeyDown = (note: Note, event: KeyDownEvent) => {
    const { key, shiftKey } = event.nativeEvent;
    // Mayús+F10 y la tecla Menú son el equivalente de teclado al clic derecho.
    if (key === 'ContextMenu' || (shiftKey && key === 'F10')) {
      event.preventDefault();
      openContextMenu(note);
    }
  };

  const handleQuickEdit = () => {
    if (contextMenuNote) {
      setEditNameValue(contextMenuNote.title);
      setShowEditNameModal(true);
    }
  };

  const handleSaveNameEdit = async () => {
    if (contextMenuNote && editNameValue.trim()) {
      try {
        console.log('Actualizando nota:', contextMenuNote.id, 'con nuevo título:', editNameValue);
        // Obtener la nota actual para tener el contenido más reciente
        const currentNotes = await notesService.getNotes();
        const currentNote = currentNotes.find(n => n.id === contextMenuNote.id);
        const content = currentNote?.content ?? contextMenuNote.content;
        await notesService.updateNote(contextMenuNote.id, editNameValue, content);
        await loadNotes();
        setShowEditNameModal(false);
        setEditNameValue('');
        setContextMenuNote(null);
        syncService.syncPendingActions()
          .then(loadNotes)
          .catch(syncError => console.error('Error syncing renamed note:', syncError));
      } catch (error) {
        showModalMessage('Error', 'No se pudo actualizar la nota', 'error');
        console.error('Error updating note:', error);
      }
    }
  };

  const optionsHint = usesFinePointer ? 'Clic derecho para opciones' : 'Mantén para opciones';
  const optionsAccessibilityHint = usesFinePointer
    ? 'Haz clic para abrir la nota. Clic derecho o Mayús+F10 para ver las opciones.'
    : 'Toca para abrir la nota. Mantén presionada la nota para ver las opciones.';

  const menuActions: ContextMenuAction[] = contextMenuNote
    ? [
        {
          key: 'edit',
          label: 'Renombrar',
          accessibilityLabel: 'Editar título de la nota',
          onPress: handleQuickEdit,
        },
        {
          key: 'delete',
          label: 'Eliminar',
          accessibilityLabel: 'Eliminar nota',
          accessibilityHint: 'Pide confirmación antes de eliminar la nota',
          destructive: true,
          onPress: () => setNoteToDelete(contextMenuNote.id),
        },
      ]
    : [];

  const renderNote = ({ item }: { item: Note }) => {
    const isFocused = Platform.OS === 'web' && focusedNoteId === item.id;
    const isSelected = selectedNotes.has(item.id);
    const webContextMenuProps =
      Platform.OS === 'web'
        ? ({
            onContextMenu: (event: WebContextMenuEvent) => handleNoteContextMenu(item, event),
          } as object)
        : {};

    return (
      <Pressable
        style={[
          styles.noteCard,
          {
            backgroundColor: colors.surface,
            borderColor: isSelected ? colors.primary : (isFocused ? colors.focusRing : colors.border),
          },
          Platform.OS === 'web' ? styles.noteCardWeb : null,
          isFocused ? [styles.noteCardFocused, { outlineColor: colors.focusRing }] : null,
          isSelected ? styles.noteCardSelected : null,
        ]}
        onPress={() => handleNotePress(item)}
        onLongPress={() => handleNoteLongPress(item)}
        onFocus={Platform.OS === 'web' ? () => setFocusedNoteId(item.id) : undefined}
        onBlur={
          Platform.OS === 'web'
            ? () => setFocusedNoteId(current => (current === item.id ? null : current))
            : undefined
        }
        onKeyDown={Platform.OS === 'web' ? event => handleNoteKeyDown(item, event) : undefined}
        {...webContextMenuProps}
        accessible={true}
        accessibilityLabel={`Nota: ${item.title?.trim() ? item.title : 'Sin título'}${isSelected ? ', seleccionada' : ''}`}
        accessibilityRole="button"
        accessibilityHint={selectionMode ? 'Toca para seleccionar o deseleccionar' : optionsAccessibilityHint}
        accessibilityState={{ selected: isSelected }}
        accessibilityActions={[{ name: 'options', label: 'Ver opciones de la nota' }]}
        onAccessibilityAction={event => {
          if (event.nativeEvent.actionName === 'options') {
            openContextMenu(item);
          }
        }}
      >
        <View style={styles.noteHeader}>
          <Text style={[styles.noteTitle, { color: colors.text }]}>{item.title?.trim() ? item.title : 'Sin título'}</Text>
          {selectionMode && (
            <View style={[styles.checkbox, { borderColor: colors.primary, backgroundColor: isSelected ? colors.primary : 'transparent' }]}>
              {isSelected && <Text style={[styles.checkmark, { color: colors.onPrimary }]}>—</Text>}
            </View>
          )}
          {!selectionMode && (
            <Text style={[styles.hintText, { color: colors.textTertiary }]} numberOfLines={1}>
              {optionsHint}
            </Text>
          )}
        </View>
        <Text style={[styles.noteContent, { color: colors.textSecondary }]} numberOfLines={2}>
          {item.content}
        </Text>
        <View style={styles.noteFooter}>
          <Text style={[styles.noteDate, { color: colors.textTertiary }]}>
            {new Date(item.updatedAt).toLocaleDateString()}
          </Text>
          {!item.synced && <Text style={[styles.syncBadge, { backgroundColor: colors.warning, color: colors.onWarning }]}>Sin sincronizar</Text>}
        </View>
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {selectionMode ? (
          <>
            <TouchableOpacity
              onPress={toggleSelectionMode}
              style={styles.backButton}
              accessible={true}
              accessibilityLabel="Cancelar selección"
              accessibilityRole="button"
            >
              <Text style={[styles.backButtonText, { color: colors.primary }]}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
              {selectedNotes.size} seleccionadas
            </Text>
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: colors.error }]}
              onPress={() => setNoteToDelete('multiple')}
              disabled={selectedNotes.size === 0}
              accessible={true}
              accessibilityLabel="Eliminar seleccionadas"
              accessibilityRole="button"
              accessibilityState={{ disabled: selectedNotes.size === 0 }}
            >
              <Text style={[styles.addButtonText, { color: colors.onError }]}>Eliminar</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton} accessible={true} accessibilityLabel="Volver" accessibilityRole="button">
              <Text style={[styles.backButtonText, { color: colors.primary }]}>{narrow ? '←' : '← Volver'}</Text>
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>Mis Notas</Text>
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={[styles.iconButton, { backgroundColor: colors.surfaceSecondary }]}
                onPress={toggleSelectionMode}
                accessible={true}
                accessibilityLabel="Seleccionar múltiples"
                accessibilityRole="button"
              >
                {narrow ? (
                  <Feather name="check-square" size={18} color={colors.text} />
                ) : (
                  <Text style={[styles.iconButtonText, { color: colors.text }]}>Seleccionar</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.addButton, { backgroundColor: colors.primary }]}
                onPress={handleAddNote}
                accessible={true}
                accessibilityLabel="Crear nueva nota"
                accessibilityRole="button"
              >
                <Text style={[styles.addButtonText, { color: colors.onPrimary }]}>
                  {narrow ? '+ Nota' : '+ Nueva Nota'}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

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
                <Text style={[styles.modalTitle, { color: colors.text }]}>Editar título</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                  placeholder="Nuevo título"
                  placeholderTextColor={colors.textTertiary}
                  value={editNameValue}
                  onChangeText={setEditNameValue}
                  autoFocus
                  editable={true}
                  accessible={true}
                  accessibilityLabel="Nuevo título de la nota"
                />
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, { backgroundColor: colors.surfaceSecondary }]}
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
                    <Text style={[styles.modalButtonText, { color: colors.onPrimary }]}>Guardar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      )}

      <ContextMenu
        visible={showContextMenu && contextMenuNote !== null}
        title="Opciones"
        actions={menuActions}
        anchor={menuAnchor}
        onClose={closeContextMenu}
      />

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

      <CustomModal
        visible={modal.visible}
        title={modal.title}
        message={modal.message}
        type={modal.type}
        onClose={() => setModal(current => ({ ...current, visible: false }))}
      />

      <CustomModal
        visible={noteToDelete !== null}
        title={noteToDelete === 'multiple' ? 'Eliminar notas' : 'Eliminar nota'}
        message={noteToDelete === 'multiple' ? `¿Estás seguro de eliminar ${selectedNotes.size} notas?` : '¿Estás seguro de eliminar esta nota?'}
        type="error"
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        destructive
        onClose={() => setNoteToDelete(null)}
        onConfirm={() => {
          if (noteToDelete === 'multiple') {
            void handleDeleteSelected();
          } else if (noteToDelete) {
            void handleDeleteNote(noteToDelete);
          }
        }}
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
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    minHeight: 44,
    justifyContent: 'center',
  },
  iconButtonText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
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
  noteCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  noteCardWeb: {
    outlineWidth: 0,
  },
  noteCardFocused: {
    outlineWidth: 2,
    outlineStyle: 'solid',
    outlineOffset: 2,
  },
  noteCardSelected: {
    borderWidth: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    fontWeight: '700',
    fontSize: 14,
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
    fontWeight: '600',
    fontSize: 16,
  },
});
