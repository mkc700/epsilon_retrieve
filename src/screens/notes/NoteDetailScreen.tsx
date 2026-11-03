import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { notesService } from '../../services/notesService';
import { Note } from '../../types/index';
import { useTheme } from '../../context/ThemeContext';

export default function NoteDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { colors } = useTheme();
  const [note, setNote] = useState<Note | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  useEffect(() => {
    loadNote();
  }, [id]);

  const loadNote = async () => {
    try {
      const notes = await notesService.getNotes();
      const foundNote = notes.find((n: Note) => n.id === id);
      if (foundNote) {
        setNote(foundNote);
        setTitle(foundNote.title);
        setContent(foundNote.content);
      }
    } catch (error) {
      console.error('Error loading note:', error);
      Alert.alert('Error', 'No se pudo cargar la nota');
    }
  };

  const handleSave = async () => {
    if (!note || !title.trim()) {
      Alert.alert('Error', 'El título es requerido');
      return;
    }
    try {
      await notesService.updateNote(note.id, title, content);
      await loadNote();
      setIsEditing(false);
      Alert.alert('Éxito', 'Nota actualizada');
    } catch (error) {
      Alert.alert('Error', 'No se pudo actualizar la nota');
      console.error('Error updating note:', error);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Eliminar nota',
      '¿Estás seguro de eliminar esta nota?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              if (note) {
                await notesService.deleteNote(note.id);
                router.back();
              }
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar la nota');
              console.error('Error deleting note:', error);
            }
          },
        },
      ]
    );
  };

  if (!note) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Cargando...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} accessibilityRole="button" accessibilityLabel="Volver">
          <Text style={[styles.backButtonText, { color: colors.primary }]}>← Volver</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Detalle de Nota</Text>
        <View style={styles.headerActions}>
          {!isEditing && (
            <>
              <TouchableOpacity onPress={() => setIsEditing(true)} style={styles.iconButton} accessibilityRole="button" accessibilityLabel="Editar nota">
                <Text style={styles.iconButtonText}>✏️</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDelete} style={styles.iconButton} accessibilityRole="button" accessibilityLabel="Eliminar nota">
                <Text style={styles.iconButtonText}>🗑️</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      <ScrollView style={styles.content}>
        {isEditing ? (
          <View style={styles.editContainer}>
            <TextInput
              style={[styles.titleInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              value={title}
              onChangeText={setTitle}
              placeholder="Título"
              placeholderTextColor={colors.textTertiary}
              autoFocus
            />
            <TextInput
              style={[styles.contentInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              value={content}
              onChangeText={setContent}
              placeholder="Contenido"
              placeholderTextColor={colors.textTertiary}
              multiline
              textAlignVertical="top"
            />
            <View style={styles.editButtons}>
              <TouchableOpacity
                style={[styles.editButton, { backgroundColor: colors.surfaceSecondary }]}
                onPress={() => {
                  setIsEditing(false);
                  setTitle(note.title);
                  setContent(note.content);
                }}
              >
                <Text style={[styles.editButtonText, { color: colors.text }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.editButton, { backgroundColor: colors.primary }]}
                onPress={handleSave}
              >
                <Text style={[styles.editButtonText, { color: '#fff' }]}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.viewContainer}>
            <Text style={[styles.title, { color: colors.text }]}>{note.title}</Text>
            <Text style={[styles.date, { color: colors.textTertiary }]}>
              Creada: {new Date(note.createdAt).toLocaleString()}
            </Text>
            <Text style={[styles.date, { color: colors.textTertiary }]}>
              Actualizada: {new Date(note.updatedAt).toLocaleString()}
            </Text>
            <View style={[styles.contentContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.contentText, { color: colors.text }]}>{note.content}</Text>
            </View>
            {!note.synced && (
              <View style={styles.syncStatus}>
                <Text style={[styles.syncBadge, { backgroundColor: colors.warning, color: '#1a1a1a' }]}>Sin sincronizar</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
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
    paddingVertical: 16,
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
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 4,
  },
  iconButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonText: {
    fontSize: 20,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  loadingText: {
    fontSize: 18,
    textAlign: 'center',
    marginTop: 50,
  },
  viewContainer: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 10,
    letterSpacing: -0.5,
  },
  date: {
    fontSize: 12,
    marginBottom: 5,
  },
  contentContainer: {
    marginTop: 20,
    padding: 16,
    borderRadius: 12,
    minHeight: 200,
    borderWidth: 1,
  },
  contentText: {
    fontSize: 16,
    lineHeight: 24,
  },
  syncStatus: {
    marginTop: 20,
    alignItems: 'center',
  },
  syncBadge: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  editContainer: {
    flex: 1,
  },
  titleInput: {
    fontSize: 28,
    fontWeight: '700',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    letterSpacing: -0.5,
  },
  contentInput: {
    flex: 1,
    fontSize: 16,
    padding: 15,
    borderRadius: 12,
    minHeight: 300,
    textAlignVertical: 'top',
    borderWidth: 1,
    lineHeight: 24,
  },
  editButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 10,
  },
  editButton: {
    flex: 1,
    minHeight: 48,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButtonText: {
    fontWeight: '600',
    fontSize: 16,
  },
});
