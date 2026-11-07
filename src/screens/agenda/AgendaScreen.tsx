import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
  AgendaEvent,
  EventDraft,
  createEvent,
  dateKey,
  eventsForDate,
} from '../../features/agenda/model';
import { createAgendaRepository } from '../../features/agenda/storage';
import {
  capitalize,
  formatAgendaDate,
  MonthCalendar,
} from '../../features/agenda/MonthCalendar';
import { EventForm } from '../../features/agenda/EventForm';
import { subscribeAgenda, syncAgenda } from '../../services/agendaService';

type Editor = {
  draft: EventDraft;
  event?: AgendaEvent;
};

type Notice = {
  message: string;
  restore?: AgendaEvent;
  error?: boolean;
};

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
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const desktop = width >= 1000;
  const narrow = width < 500;
  const repository = useMemo(
    () => createAgendaRepository(AsyncStorage, userId),
    [userId],
  );
  const activeRepository = useRef(repository);
  activeRepository.current = repository;

  // Estado del calendario y de los eventos.
  const [today, setToday] = useState(() => dateKey(new Date()));
  const [selectedDate, setSelectedDate] = useState(today);
  const [month, setMonth] = useState(today);
  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const writing = useRef(false);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState('');
  const [hasSynced, setHasSynced] = useState(false);

  // Sincronización y carga de los eventos guardados en el dispositivo.
  const syncNow = useCallback(async () => {
    if (userId === 'local-development') return;
    setSyncing(true);
    try {
      const items = await syncAgenda(userId);
      if (activeRepository.current !== repository) return;
      if (items) {
        setEvents(items);
        setHasSynced(true);
        setSyncError('');
      } else {
        setSyncError('Inicia sesión para sincronizar tu agenda.');
      }
    } catch (error: any) {
      if (activeRepository.current !== repository) return;
      setSyncError(
        error.response?.status === 401
          ? 'Inicia sesión para sincronizar tu agenda.'
          : 'No se pudo sincronizar. Tus cambios siguen guardados aquí.',
      );
    } finally {
      setSyncing(false);
    }
  }, [repository, userId]);

  useEffect(() => {
    const timer = setInterval(() => setToday(dateKey(new Date())), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let current = true;
    setEvents([]);
    setReady(false);
    setLoadError('');
    setEditor(null);
    setNotice(null);
    const unsubscribe = subscribeAgenda(userId, items => {
      if (current) {
        setEvents(items);
        setHasSynced(true);
        setSyncError('');
      }
    });
    repository.load().then(items => {
      if (current) {
        setEvents(items);
        setReady(true);
        void syncNow();
      }
    }).catch(error => {
      if (current) setLoadError(error.message || 'No se pudo abrir tu agenda.');
    });
    return () => {
      current = false;
      unsubscribe();
    };
  }, [repository, syncNow, userId]);

  const retry = async () => {
    setLoadError('');
    const currentRepository = repository;
    try {
      const items = await currentRepository.load();
      if (activeRepository.current !== currentRepository) return;
      setEvents(items);
      setReady(true);
      void syncNow();
    } catch (error) {
      if (activeRepository.current === currentRepository) {
        setLoadError(error instanceof Error ? error.message : 'No se pudo abrir tu agenda.');
      }
    }
  };

  const dayEvents = useMemo(
    () => eventsForDate(events, selectedDate),
    [events, selectedDate],
  );
  const monthCount = events.filter(
    event => !event.deleted && event.date.slice(0, 7) === month.slice(0, 7),
  ).length;
  const selectedIsToday = selectedDate === today;
  const pendingCount = events.filter(event => event.synced !== true).length;

  // Selección de fechas y acciones del formulario.
  const selectDate = (date: string) => {
    setSelectedDate(date);
    setMonth(date);
  };

  const openNew = () => {
    if (!ready || saving) return;
    setEditor({
      draft: {
        title: '',
        description: '',
        date: selectedDate,
        time: '',
      },
    });
  };

  const openEvent = (event: AgendaEvent) => {
    if (saving) return;
    setEditor({
      event,
      draft: {
        title: event.title,
        description: event.description,
        date: event.date,
        time: event.time,
      },
    });
  };

  const saveEvent = async (draft: EventDraft) => {
    if (writing.current) return;
    writing.current = true;
    setSaving(true);
    const currentRepository = repository;
    try {
      const event = createEvent(draft, userId, editor?.event);
      const items = await currentRepository.upsert(event);
      if (activeRepository.current !== currentRepository) return;
      setEvents(items);
      selectDate(event.date);
      setEditor(null);
      setNotice({
        message: editor?.event ? 'Cambios guardados.' : 'Evento guardado en tu agenda.',
      });
      void syncNow();
    } finally {
      writing.current = false;
      setSaving(false);
    }
  };

  const deleteEvent = async () => {
    const event = editor?.event;
    if (!event || writing.current) return;
    writing.current = true;
    setSaving(true);
    const currentRepository = repository;
    try {
      const items = await currentRepository.remove(event.id);
      if (activeRepository.current !== currentRepository) return;
      setEvents(items);
      setEditor(null);
      setNotice({
        message: 'Evento eliminado.',
        restore: event,
      });
      void syncNow();
    } finally {
      writing.current = false;
      setSaving(false);
    }
  };

  const undoDelete = async () => {
    if (!notice?.restore || writing.current) return;
    writing.current = true;
    setSaving(true);
    const currentRepository = repository;
    try {
      const items = await currentRepository.upsert({
        ...notice.restore,
        deleted: false,
        updatedAt: new Date().toISOString(),
      });
      if (activeRepository.current !== currentRepository) return;
      setEvents(items);
      setNotice({
        message: 'Evento restaurado.',
      });
      void syncNow();
    } catch (error) {
      if (activeRepository.current === currentRepository) {
        setNotice(current => ({
          ...current!,
          error: true,
          message: error instanceof Error ? error.message : 'No se pudo restaurar el evento.',
        }));
      }
    } finally {
      writing.current = false;
      setSaving(false);
    }
  };

  return (
    <View
      style={[
        styles.screen,
        {
          backgroundColor: colors.background,
          paddingTop: insets.top,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
      ]}
    >
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Volver al menú"
          onPress={() => router.canGoBack() ? router.back() : router.replace('/menu')}
          style={styles.backButton}
        >
          <Feather name="arrow-left" size={20} color={colors.textSecondary} />
          {!narrow && (
            <Text style={[styles.backText, { color: colors.textSecondary }]}>
              Menú
            </Text>
          )}
        </TouchableOpacity>

        <View style={styles.headerBrand}>
          <Feather name="calendar" size={17} color={colors.primary} />
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Mi agenda
          </Text>
        </View>

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Crear nuevo evento"
          disabled={!ready || saving}
          onPress={openNew}
          style={[
            styles.addButton,
            { backgroundColor: colors.primary },
            (!ready || saving) && styles.disabled,
          ]}
        >
          <Feather name="plus" size={17} color="#FFF" />
          <Text style={styles.addText}>
            {narrow ? 'Evento' : 'Nuevo evento'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.page,
          {
            paddingHorizontal: narrow ? 16 : 30,
            paddingBottom: Math.max(insets.bottom, 24) + (notice ? 80 : 0),
          },
        ]}
      >
        <View style={styles.intro}>
          <Text
            accessibilityRole="header"
            style={[styles.pageTitle, { color: colors.text }]}
          >
            Mi calendario
          </Text>
        </View>

        {!ready && !loadError ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Abriendo tu agenda…
            </Text>
          </View>
        ) : loadError ? (
          <View
            style={[
              styles.errorCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Feather name="alert-circle" size={28} color={colors.error} />
            <Text style={[styles.errorTitle, { color: colors.text }]}>
              No pudimos abrir tu agenda
            </Text>
            <Text
              accessibilityRole="alert"
              style={[styles.errorMessage, { color: colors.textSecondary }]}
            >
              {loadError}
            </Text>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={retry}
              style={[
                styles.softButton,
                { backgroundColor: colors.primaryLight },
              ]}
            >
              <Text style={[styles.softButtonText, { color: colors.primaryDark }]}>
                Volver a intentar
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.workspace, desktop && styles.desktopWorkspace]}>
            <View
              style={[
                styles.calendarPanel,
                desktop && { flex: 1.5 },
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <MonthCalendar
                selectedDate={selectedDate}
                month={month}
                events={events}
                compact={!desktop}
                onSelect={selectDate}
                onMonthChange={selectDate}
                onToday={() => selectDate(today)}
              />

              <View
                style={[
                  styles.calendarFooter,
                  { borderTopColor: colors.border },
                ]}
              >
                <View style={styles.legend}>
                  <View
                    style={[
                      styles.legendDot,
                      { backgroundColor: colors.primary },
                    ]}
                  />
                  <Text style={[styles.calendarHint, { color: colors.textSecondary }]}>
                    Días con eventos
                  </Text>
                </View>
                <Text style={[styles.calendarHint, { color: colors.textSecondary }]}>
                  {monthCount} {monthCount === 1 ? 'evento este mes' : 'eventos este mes'}
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.dayPanel,
                desktop && { flex: 1 },
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={[styles.dayHeading, { borderBottomColor: colors.border }]}>
                <View
                  style={[
                    styles.dateTile,
                    { backgroundColor: colors.primaryLight },
                  ]}
                >
                  <Text style={[styles.tileWeekday, { color: colors.primaryDark }]}>
                    {formatAgendaDate(selectedDate, { weekday: 'short' }).replace('.', '').toUpperCase()}
                  </Text>
                  <Text style={[styles.tileDay, { color: colors.primaryDark }]}>
                    {formatAgendaDate(selectedDate, { day: 'numeric' })}
                  </Text>
                </View>

                <View style={{ flex: 1 }}>
                  <Text
                    accessibilityRole="header"
                    style={[styles.dayTitle, { color: colors.text }]}
                  >
                    {selectedIsToday ? 'Mis eventos de hoy' : 'Mis eventos del día'}
                  </Text>
                  <Text style={[styles.daySubtitle, { color: colors.textSecondary }]}>
                    {capitalize(formatAgendaDate(selectedDate, {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    }))}
                  </Text>
                </View>

                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Agregar evento al día seleccionado"
                  disabled={saving}
                  onPress={openNew}
                  style={[styles.dayAdd, { borderColor: colors.border }]}
                >
                  <Feather name="plus" size={19} color={colors.primary} />
                </TouchableOpacity>
              </View>

              {dayEvents.length === 0 ? (
                <View style={[styles.empty, !desktop && { paddingVertical: 32 }]}>
                  <View
                    style={[
                      styles.emptyIcon,
                      { backgroundColor: colors.surfaceSecondary },
                    ]}
                  >
                    <Feather name="sun" size={28} color={colors.textSecondary} />
                  </View>
                  <Text style={[styles.emptyTitle, { color: colors.text }]}>
                    Sin eventos programados
                  </Text>
                  <TouchableOpacity
                    accessibilityRole="button"
                    disabled={saving}
                    onPress={openNew}
                    style={[
                      styles.softButton,
                      { backgroundColor: colors.primaryLight },
                    ]}
                  >
                    <Feather name="plus" size={15} color={colors.primaryDark} />
                    <Text style={[styles.softButtonText, { color: colors.primaryDark }]}>
                      Agregar evento
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.eventList}>
                  {dayEvents.map(event => (
                    <TouchableOpacity
                      key={event.id}
                      accessibilityRole="button"
                      accessibilityLabel={`Editar ${event.title}, ${event.time || 'todo el día'}`}
                      disabled={saving}
                      onPress={() => openEvent(event)}
                      style={[
                        styles.eventCard,
                        {
                          backgroundColor: colors.background,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.eventAccent,
                          { backgroundColor: colors.primary },
                        ]}
                      />
                      <View style={styles.eventBody}>
                        <View style={styles.eventTimeRow}>
                          <Feather
                            name={event.time ? 'clock' : 'sun'}
                            size={12}
                            color={colors.textSecondary}
                          />
                          <Text style={[styles.eventTime, { color: colors.textSecondary }]}>
                            {event.time || 'Todo el día'}
                          </Text>
                        </View>
                        <Text style={[styles.eventTitle, { color: colors.text }]}>
                          {event.title}
                        </Text>
                        {!!event.description && (
                          <Text
                            numberOfLines={3}
                            style={[
                              styles.eventDescription,
                              { color: colors.textSecondary },
                            ]}
                          >
                            {event.description}
                          </Text>
                        )}
                        {!event.synced && (
                          <Text style={[styles.syncBadge, { backgroundColor: colors.warning, color: colors.onWarning }]}>Sin sincronizar</Text>
                        )}
                      </View>
                      <Feather name="chevron-right" size={17} color={colors.textTertiary} />
                    </TouchableOpacity>
                  ))}
                  <Text style={[styles.editHint, { color: colors.textSecondary }]}>
                    Selecciona un evento para editarlo o eliminarlo.
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        <View style={styles.localInfo}>
          <Feather name="hard-drive" size={13} color={colors.textSecondary} />
          <Text style={[styles.localInfoText, { color: colors.textSecondary }]}>
            {userId === 'local-development'
              ? 'Tus eventos se guardan en este dispositivo, incluso sin conexión.'
              : syncing
                ? 'Sincronizando mi agenda…'
                : syncError || (pendingCount > 0
                  ? `${pendingCount} ${pendingCount === 1 ? 'cambio pendiente' : 'cambios pendientes'} de sincronizar.`
                  : hasSynced
                    ? 'Mi agenda está sincronizada.'
                    : 'Eventos guardados en este dispositivo.')}
          </Text>
          {userId !== 'local-development' && ready && (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Sincronizar mi agenda"
              disabled={syncing || saving}
              onPress={syncNow}
              style={styles.syncButton}
            >
              <Feather name="refresh-cw" size={14} color={colors.primary} />
              <Text style={[styles.syncButtonText, { color: colors.primary }]}>
                Sincronizar
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {editor && (
        <EventForm
          initialDraft={editor.draft}
          editing={!!editor.event}
          busy={saving}
          onSave={saveEvent}
          onDelete={deleteEvent}
          onClose={() => setEditor(null)}
        />
      )}

      {notice && (
        <View
          accessibilityLiveRegion="polite"
          style={[
            styles.notice,
            {
              bottom: Math.max(insets.bottom, 16),
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Feather
            name={notice.error ? 'alert-circle' : 'check-circle'}
            size={17}
            color={notice.error ? colors.error : colors.success}
          />
          <Text style={[styles.noticeText, { color: colors.text }]}>
            {notice.message}
          </Text>
          {!!notice.restore && (
            <TouchableOpacity
              accessibilityRole="button"
              disabled={saving}
              onPress={undoDelete}
              style={styles.undoButton}
            >
              <Text style={[styles.undoText, { color: colors.primary }]}>
                {saving ? 'Restaurando…' : 'Deshacer'}
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Cerrar aviso"
            disabled={saving}
            onPress={() => setNotice(null)}
            style={styles.dismissNotice}
          >
            <Feather name="x" size={17} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      )}
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
  dateTile: {
    width: 51,
    height: 59,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 3,
  },
  tileWeekday: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.7,
  },
  tileDay: {
    fontSize: 24,
    fontWeight: '700',
  },
  dayTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 6,
  },
  daySubtitle: {
    fontSize: 11,
    lineHeight: 17,
  },
  dayAdd: {
    width: 37,
    height: 44,
    borderWidth: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 55,
    paddingHorizontal: 20,
    gap: 13,
  },
  emptyIcon: {
    width: 61,
    height: 61,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 21,
  },
  softButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: 9,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 6,
  },
  softButtonText: {
    fontSize: 12,
    fontWeight: '600',
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
    gap: 12,
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
  eventTime: {
    fontSize: 10,
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
  syncBadge: {
    alignSelf: 'flex-start',
    fontSize: 10,
    fontWeight: '600',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  editHint: {
    fontSize: 10,
    textAlign: 'center',
    marginVertical: 6,
    lineHeight: 17,
  },
  localInfo: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 7,
    marginTop: 22,
  },
  localInfoText: {
    fontSize: 10,
    lineHeight: 17,
    flexShrink: 1,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
    paddingHorizontal: 8,
  },
  syncButtonText: {
    fontSize: 11,
    fontWeight: '600',
  },
  loading: {
    minHeight: 350,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 15,
  },
  loadingText: {
    fontSize: 12,
  },
  errorCard: {
    borderWidth: 1,
    borderRadius: 16,
    minHeight: 290,
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 15,
  },
  errorTitle: {
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 420,
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
    borderRadius: 12,
    paddingLeft: 15,
    paddingRight: 5,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 5,
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  undoButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  undoText: {
    fontSize: 12,
    fontWeight: '600',
  },
  dismissNotice: {
    width: 35,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
