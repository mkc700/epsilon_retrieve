import React, { useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Modal, Platform, ScrollView,
  StyleSheet, Switch, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { EventDraft, dateKey, validateEventDraft } from './model';
import { capitalize, formatAgendaDate, MonthCalendar } from './MonthCalendar';

interface Props {
  initialDraft: EventDraft;
  editing: boolean;
  busy: boolean;
  onSave: (draft: EventDraft) => Promise<void>;
  onDelete: () => Promise<void>;
  onClose: () => void;
}

export function EventForm({ initialDraft, editing, busy, onSave, onDelete, onClose }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState(initialDraft);
  const [allDay, setAllDay] = useState(!initialDraft.time);
  const [time, setTime] = useState(initialDraft.time || '09:00');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerMonth, setPickerMonth] = useState(initialDraft.date);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    if (busy) return;
    if (!allDay && !time.trim()) {
      setError('Escribe la hora del evento o activa «Todo el día».');
      return;
    }
    const next = { ...draft, time: allDay ? '' : time.trim() };
    const validation = validateEventDraft(next);
    if (validation) { setError(validation); return; }
    try { await onSave(next); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'No se pudo guardar. Inténtalo de nuevo.'); }
  };

  const remove = async () => {
    if (busy) return;
    try { await onDelete(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'No se pudo eliminar el evento.'); }
  };

  const selectDate = (date: string) => {
    setDraft(current => ({ ...current, date }));
    setPickerMonth(date);
    setPickerOpen(false);
    setError('');
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => { if (!busy) onClose(); }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[styles.backdrop, {
          paddingTop: Math.max(insets.top, 18), paddingBottom: Math.max(insets.bottom, 18),
        }]}>
        <View style={[styles.dialog, { backgroundColor: colors.background }]} accessibilityViewIsModal>
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={[styles.headerIcon, { backgroundColor: colors.primaryLight }]}>
              <Feather name="calendar" size={21} color={colors.primaryDark} />
            </View>
            <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>
              {editing ? 'Editar evento' : 'Nuevo evento'}
            </Text>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Cerrar formulario"
              disabled={busy} onPress={onClose} style={styles.close}>
              <Feather name="x" size={21} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.form}
            pointerEvents={busy ? 'none' : 'auto'}>
            <Text style={[styles.label, { color: colors.text }]}>Título</Text>
            <TextInput autoFocus accessibilityLabel="Título del evento" maxLength={120}
              placeholder="Ej. Reunión de equipo" placeholderTextColor={colors.textTertiary}
              value={draft.title} editable={!busy}
              onChangeText={title => { setDraft(current => ({ ...current, title })); setError(''); }}
              style={[styles.input, styles.titleInput, {
                color: colors.text, backgroundColor: colors.surface, borderColor: colors.border,
              }]} />

            <Text style={[styles.label, { color: colors.text }]}>Fecha</Text>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Cambiar fecha del evento"
              accessibilityState={{ expanded: pickerOpen }} disabled={busy}
              onPress={() => setPickerOpen(current => !current)}
              style={[styles.dateButton, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              <Feather name="calendar" size={17} color={colors.primary} />
              <Text style={[styles.dateText, { color: colors.text }]}>
                {capitalize(formatAgendaDate(draft.date, { day: 'numeric', month: 'long', year: 'numeric' }))}
              </Text>
              <Feather name={pickerOpen ? 'chevron-up' : 'chevron-down'} size={17} color={colors.textSecondary} />
            </TouchableOpacity>
            {pickerOpen && (
              <View style={[styles.datePicker, { borderColor: colors.border }]}>
                <MonthCalendar picker selectedDate={draft.date} month={pickerMonth} events={[]}
                  onMonthChange={setPickerMonth} onSelect={selectDate}
                  onToday={() => selectDate(dateKey(new Date()))} />
              </View>
            )}

            <View style={styles.allDayRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.allDayTitle, { color: colors.text }]}>Todo el día</Text>
                <Text style={[styles.help, { color: colors.textSecondary }]}>Sin una hora específica</Text>
              </View>
              <Switch accessibilityLabel="Todo el día" value={allDay} disabled={busy}
                onValueChange={setAllDay} trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#FFF" />
            </View>
            {!allDay && (
              <View>
                <Text style={[styles.label, { color: colors.text }]}>Hora</Text>
                <TextInput accessibilityLabel="Hora del evento" value={time} maxLength={5}
                  placeholder="09:00" placeholderTextColor={colors.textTertiary}
                  keyboardType="numbers-and-punctuation" editable={!busy}
                  onChangeText={value => { setTime(value); setError(''); }}
                  style={[styles.input, {
                    color: colors.text, backgroundColor: colors.surface, borderColor: colors.border,
                  }]} />
                <Text style={[styles.timeHint, { color: colors.textSecondary }]}>Formato de 24 horas, por ejemplo 16:30.</Text>
              </View>
            )}

            <Text style={[styles.label, { color: colors.text }]}>
              Detalles <Text style={[styles.optional, { color: colors.textSecondary }]}>(opcional)</Text>
            </Text>
            <TextInput accessibilityLabel="Detalles del evento" value={draft.description}
              placeholder="Lo que necesito preparar o recordar" placeholderTextColor={colors.textTertiary}
              multiline textAlignVertical="top" maxLength={2000} editable={!busy}
              onChangeText={description => setDraft(current => ({ ...current, description }))}
              style={[styles.input, styles.description, {
                color: colors.text, backgroundColor: colors.surface, borderColor: colors.border,
              }]} />

            {editing && !confirmDelete && (
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Eliminar evento" disabled={busy}
                onPress={() => setConfirmDelete(true)} style={styles.deleteButton}>
                <Feather name="trash-2" size={15} color={colors.error} />
                <Text style={[styles.deleteText, { color: colors.error }]}>Eliminar evento</Text>
              </TouchableOpacity>
            )}
            {confirmDelete && (
              <View style={[styles.confirmDelete, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                <Text style={[styles.confirmTitle, { color: colors.text }]}>¿Eliminar este evento?</Text>
                <View style={styles.confirmActions}>
                  <TouchableOpacity accessibilityRole="button" disabled={busy} onPress={() => setConfirmDelete(false)} style={styles.cancel}>
                    <Text style={[styles.buttonText, { color: colors.textSecondary }]}>Conservar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity accessibilityRole="button" accessibilityLabel="Confirmar eliminación" disabled={busy}
                    onPress={remove} style={[styles.confirmButton, { backgroundColor: colors.error }]}>
                    <Text style={[styles.buttonText, { color: '#FFF' }]}>{busy ? 'Eliminando…' : 'Sí, eliminar'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            {!!error && <Text accessibilityRole="alert" style={[styles.error, { color: colors.error }]}>{error}</Text>}
          </ScrollView>

          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <TouchableOpacity accessibilityRole="button" onPress={onClose} disabled={busy} style={styles.cancel}>
              <Text style={[styles.buttonText, { color: colors.textSecondary }]}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Guardar evento" disabled={busy}
              onPress={save} style={[styles.save, { backgroundColor: colors.primary }, busy && { opacity: 0.6 }]}>
              {busy ? <ActivityIndicator size="small" color="#FFF" /> : <Feather name="check" size={17} color="#FFF" />}
              <Text style={[styles.buttonText, { color: '#FFF' }]}>{busy ? 'Guardando…' : 'Guardar evento'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16 },
  dialog: { width: '100%', maxWidth: 480, maxHeight: '100%', borderRadius: 20, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1, gap: 12 },
  headerIcon: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 13 },
  title: { flex: 1, fontSize: 21, fontWeight: '700', letterSpacing: -0.5 },
  close: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center' },
  form: { padding: 22 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 9 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 13, paddingVertical: 13, fontSize: 14, marginBottom: 21 },
  titleInput: { fontSize: 16 },
  dateButton: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 13, minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  dateText: { flex: 1, fontSize: 13 },
  datePicker: { borderWidth: 1, borderRadius: 12, marginBottom: 20, overflow: 'hidden' },
  allDayRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 24 },
  allDayTitle: { fontSize: 13, fontWeight: '500', marginBottom: 5 },
  help: { fontSize: 11 },
  timeHint: { fontSize: 11, marginTop: -12, marginBottom: 22 },
  optional: { fontWeight: '400' },
  description: { minHeight: 85, lineHeight: 21, marginBottom: 8 },
  deleteButton: { flexDirection: 'row', gap: 8, alignItems: 'center', paddingVertical: 14, marginTop: 4 },
  deleteText: { fontSize: 12, fontWeight: '500' },
  confirmDelete: { borderWidth: 1, padding: 15, borderRadius: 10, marginTop: 16 },
  confirmTitle: { fontSize: 13, fontWeight: '600' },
  confirmActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 10, marginTop: 14 },
  confirmButton: { paddingHorizontal: 13, paddingVertical: 12, borderRadius: 8 },
  error: { fontSize: 12, lineHeight: 19, marginTop: 17 },
  footer: { padding: 18, borderTopWidth: 1, flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  cancel: { paddingVertical: 13, paddingHorizontal: 13 },
  save: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', paddingVertical: 13, paddingHorizontal: 17, borderRadius: 10 },
  buttonText: { fontSize: 13, fontWeight: '600' },
});
