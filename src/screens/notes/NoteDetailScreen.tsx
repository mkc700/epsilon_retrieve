import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import type { TextStyle, TextInputInstance } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { notesService } from '../../services/notesService';
import { Note } from '../../types/index';
import { useTheme } from '../../context/ThemeContext';
import { CustomModal } from '../../components/CustomModal';

const inputOutlineReset = Platform.OS === 'web'
  ? ({ outlineStyle: 'none' } as unknown as TextStyle)
  : undefined;

type FeedbackModal = {
  visible: boolean;
  title: string;
  message: string;
  type: 'success' | 'error' | 'info';
};

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export default function NoteDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { colors } = useTheme();
  const [note, setNote] = useState<Note | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [feedbackModal, setFeedbackModal] = useState<FeedbackModal>({
    visible: false,
    title: '',
    message: '',
    type: 'info',
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const contentInputRef = useRef<TextInputInstance>(null);

  // Refs para autoguardado: siempre apuntan al valor más reciente,
  // incluso dentro de callbacks diferidos o del cleanup de desmontaje.
  const noteRef = useRef<Note | null>(null);
  const titleRef = useRef('');
  const contentRef = useRef('');
  const lastSavedRef = useRef({ title: '', content: '' });
  const savingRef = useRef(false);
  const pendingRef = useRef(false);
  const deletedRef = useRef(false);

  useEffect(() => {
    loadNote();
  }, [id]);

  const showModalMessage = (modalTitle: string, message: string, type: FeedbackModal['type'] = 'info') => {
    setFeedbackModal({ visible: true, title: modalTitle, message, type });
  };

  const loadNote = async (retryCount = 0) => {
    try {
      const notes = await notesService.getNotes();
      const foundNote = notes.find((n: Note) => n.id === id);
      if (foundNote) {
        setNote(foundNote);
        noteRef.current = foundNote;
        setTitle(foundNote.title);
        titleRef.current = foundNote.title;
        setContent(foundNote.content);
        contentRef.current = foundNote.content;
        lastSavedRef.current = { title: foundNote.title.trim(), content: foundNote.content };
      } else if (retryCount < 5) {
        console.log(`Nota no encontrada, reintentando (${retryCount + 1}/5)...`);
        // Intentar cargar nuevamente después de un breve delay
        setTimeout(() => {
          loadNote(retryCount + 1);
        }, 200);
      } else {
        console.error('Nota no encontrada después de 5 intentos');
        showModalMessage('Error', 'No se pudo cargar la nota', 'error');
      }
    } catch (error) {
      console.error('Error loading note:', error);
      showModalMessage('Error', 'No se pudo cargar la nota', 'error');
    }
  };

  const persistNote = useCallback(async () => {
    if (deletedRef.current) return;
    const current = noteRef.current;
    if (!current) return;

    const trimmedTitle = titleRef.current.trim();
    const trimmedContent = contentRef.current;

    if (trimmedTitle === lastSavedRef.current.title && trimmedContent === lastSavedRef.current.content) {
      return;
    }

    // Si hay un guardado en curso, marcar que hay cambios pendientes
    if (savingRef.current) {
      pendingRef.current = true;
      return;
    }

    savingRef.current = true;
    setSaveState('saving');
    try {
      await notesService.updateNote(current.id, trimmedTitle, trimmedContent);
      lastSavedRef.current = { title: trimmedTitle, content: trimmedContent };
      const updatedAt = new Date().toISOString();
      const updated: Note = { ...current, title: trimmedTitle, content: trimmedContent, synced: false, updatedAt };
      noteRef.current = updated;
      setNote(updated);
      setSaveState('saved');
    } catch (error) {
      console.error('Error autosaving note:', error);
      setSaveState('error');
    } finally {
      savingRef.current = false;
      if (pendingRef.current) {
        pendingRef.current = false;
        void persistNote();
      }
    }
  }, []);

  // Guardado de último recurso al desmontar (p. ej. gesto de retroceso del sistema)
  useEffect(() => {
    return () => {
      if (deletedRef.current) return;
      const current = noteRef.current;
      if (!current) return;
      const trimmedTitle = titleRef.current.trim();
      const trimmedContent = contentRef.current;
      if (trimmedTitle === lastSavedRef.current.title && trimmedContent === lastSavedRef.current.content) {
        return;
      }
      notesService.updateNote(current.id, trimmedTitle, trimmedContent).catch(error =>
        console.error('Error saving note on unmount:', error)
      );
    };
  }, []);

  const handleTitleChange = (value: string) => {
    setTitle(value);
    titleRef.current = value;
    if (saveState !== 'idle') setSaveState('idle');
  };

  const handleContentChange = (value: string) => {
    setContent(value);
    contentRef.current = value;
    if (saveState !== 'idle') setSaveState('idle');
  };

  const handleBack = async () => {
    await persistNote();
    router.back();
  };

  const confirmDelete = async () => {
    if (!note) return;

    try {
      deletedRef.current = true;
      await notesService.deleteNote(note.id);
      setShowDeleteConfirm(false);
      router.back();
    } catch (error) {
      deletedRef.current = false;
      setShowDeleteConfirm(false);
      showModalMessage('Error', 'No se pudo eliminar la nota', 'error');
      console.error('Error deleting note:', error);
    }
  };

  const statusLabel =
    saveState === 'saving' ? 'Guardando…'
    : saveState === 'saved' ? 'Guardado'
    : saveState === 'error' ? 'No se pudo guardar · Reintentar'
    : '';

  if (!note) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Cargando...</Text>
        <CustomModal
          visible={feedbackModal.visible}
          title={feedbackModal.title}
          message={feedbackModal.message}
          type={feedbackModal.type}
          onClose={() => setFeedbackModal(current => ({ ...current, visible: false }))}
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View
        style={[
          styles.header,
          { backgroundColor: colors.surface, borderBottomColor: colors.border },
        ]}
      >
        <TouchableOpacity
          onPress={handleBack}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Guardar y volver"
        >
          <Text style={[styles.backButtonText, { color: colors.primary }]}>← Volver</Text>
        </TouchableOpacity>

        {saveState === 'error' ? (
          <TouchableOpacity
            onPress={() => void persistNote()}
            style={styles.statusButton}
            accessibilityRole="button"
            accessibilityLabel="Reintentar guardado"
          >
            <Text style={[styles.statusText, styles.statusErrorText, { color: colors.error }]} numberOfLines={1}>
              {statusLabel}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.statusButton} accessibilityLiveRegion="polite">
            <Text style={[styles.statusText, { color: colors.textTertiary }]} numberOfLines={1}>
              {statusLabel}
            </Text>
          </View>
        )}

        <TouchableOpacity
          onPress={() => setShowDeleteConfirm(true)}
          style={styles.iconButton}
          accessibilityRole="button"
          accessibilityLabel="Eliminar nota"
        >
          <Text style={[styles.iconButtonText, { color: colors.error }]}>Eliminar</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.page}>
        <TextInput
          style={[styles.titleInput, inputOutlineReset, { color: colors.text }]}
          value={title}
          onChangeText={handleTitleChange}
          onBlur={() => void persistNote()}
          placeholder="Título"
          placeholderTextColor={colors.textTertiary}
          autoFocus
          returnKeyType="next"
          blurOnSubmit={false}
          onSubmitEditing={() => contentInputRef.current?.focus()}
          selectionColor={colors.primary}
          cursorColor={colors.primary}
          accessible={true}
          accessibilityLabel="Título de la nota"
        />

        <View style={styles.metaRow}>
          <Text style={[styles.metaText, { color: colors.textTertiary }]} numberOfLines={1}>
            Actualizada: {new Date(note.updatedAt).toLocaleDateString()}
          </Text>
          {!note.synced && (
            <Text style={[styles.syncBadge, { backgroundColor: colors.warning, color: colors.onWarning }]}>
              Sin sincronizar
            </Text>
          )}
        </View>

        <TextInput
          ref={contentInputRef}
          style={[styles.contentInput, inputOutlineReset, { color: colors.text }]}
          value={content}
          onChangeText={handleContentChange}
          onBlur={() => void persistNote()}
          placeholder="Contenido"
          placeholderTextColor={colors.textTertiary}
          multiline
          textAlignVertical="top"
          selectionColor={colors.primary}
          cursorColor={colors.primary}
          accessible={true}
          accessibilityLabel="Contenido de la nota"
        />
      </View>

      <CustomModal
        visible={feedbackModal.visible}
        title={feedbackModal.title}
        message={feedbackModal.message}
        type={feedbackModal.type}
        onClose={() => setFeedbackModal(current => ({ ...current, visible: false }))}
      />

      <CustomModal
        visible={showDeleteConfirm}
        title="Eliminar nota"
        message="¿Estás seguro de eliminar esta nota?"
        type="error"
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        destructive
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDelete}
      />
    </KeyboardAvoidingView>
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
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    minHeight: 44,
    paddingHorizontal: 8,
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  statusButton: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  statusErrorText: {
    textDecorationLine: 'underline',
  },
  iconButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  loadingText: {
    fontSize: 18,
    textAlign: 'center',
    marginTop: 50,
  },
  page: {
    flex: 1,
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  titleInput: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 30,
    letterSpacing: -0.5,
    paddingVertical: 8,
    paddingHorizontal: 0,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 2,
    marginBottom: 16,
  },
  metaText: {
    fontSize: 12,
    lineHeight: 16,
    flexShrink: 1,
  },
  syncBadge: {
    fontSize: 11,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    overflow: 'hidden',
  },
  contentInput: {
    flex: 1,
    minHeight: 0,
    fontSize: 16,
    lineHeight: 24,
    paddingTop: 8,
    paddingBottom: 40,
    paddingHorizontal: 0,
    textAlignVertical: 'top',
  },
});
