export interface EventDraft {
  title: string;
  description: string;
  date: string;
  /** Empty means all day; otherwise a local 24-hour HH:MM time. */
  time: string;
}

export interface AgendaEvent extends EventDraft {
  id: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  deleted: boolean;
  /** Missing on old local records; treated as pending until acknowledged. */
  synced?: boolean;
}

// Event/navigation bounds leave room for adjacent dates in a six-week grid.
export const MIN_AGENDA_DATE = '1900-01-01';
export const MAX_AGENDA_DATE = '2199-12-31';

export function dateKey(date: Date): string {
  const year = date.getFullYear();
  if (Number.isNaN(date.getTime()) || year < 0 || year > 9999) throw new RangeError('Fecha inválida.');
  return `${String(year).padStart(4, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** Local noon preserves civil dates across UTC offsets and midnight DST changes. */
export function parseDate(value: string): Date {
  const match = typeof value === 'string' ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(value) : null;
  if (!match) throw new RangeError('Fecha inválida.');
  const [year, month, day] = match.slice(1).map(Number);
  const result = new Date(2000, month - 1, day, 12);
  result.setFullYear(year);
  if (result.getFullYear() !== year || result.getMonth() !== month - 1 || result.getDate() !== day) {
    throw new RangeError('Fecha inválida.');
  }
  return result;
}

export function addDays(value: string, count: number): string {
  if (!Number.isInteger(count)) throw new RangeError('El número de días debe ser entero.');
  const date = parseDate(value);
  date.setDate(date.getDate() + count);
  return dateKey(date);
}

export function monthCells(value: string): string[] {
  const first = parseDate(value);
  first.setDate(1);
  const monday = addDays(dateKey(first), -((first.getDay() + 6) % 7));
  return Array.from({ length: 42 }, (_, index) => addDays(monday, index));
}

export function shiftMonth(value: string, count: number): string {
  if (!Number.isInteger(count)) throw new RangeError('El número de meses debe ser entero.');
  const original = parseDate(value);
  const index = Math.max(1900 * 12, Math.min(2199 * 12 + 11, original.getFullYear() * 12 + original.getMonth() + count));
  const month = new Date(Math.floor(index / 12), index % 12, 1, 12);
  const last = new Date(month.getFullYear(), month.getMonth() + 1, 0, 12).getDate();
  month.setDate(Math.min(original.getDate(), last));
  return dateKey(month);
}

export function validateEventDraft(draft: EventDraft): string | null {
  if (typeof draft.title !== 'string' || !draft.title.trim()) return 'Escribe un título para tu evento.';
  if (draft.title.trim().length > 120) return 'El título puede tener hasta 120 caracteres.';
  if (typeof draft.description !== 'string' || draft.description.length > 2000) return 'La descripción puede tener hasta 2.000 caracteres.';
  try { parseDate(draft.date); } catch { return 'Elige una fecha válida.'; }
  if (draft.date < MIN_AGENDA_DATE || draft.date > MAX_AGENDA_DATE) return 'Elige una fecha entre 1900 y 2199.';
  if (typeof draft.time !== 'string' || (draft.time !== '' && !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(draft.time))) {
    return 'Usa una hora válida en formato HH:MM o elige todo el día.';
  }
  return null;
}

export function createEvent(draft: EventDraft, userId: string, existing?: AgendaEvent): AgendaEvent {
  const error = validateEventDraft(draft);
  if (error) throw new Error(error);
  if (!userId || (existing && existing.userId !== userId)) throw new Error('La cuenta de la agenda no es válida.');
  const now = new Date().toISOString();
  return {
    id: existing?.id ?? `agenda_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`,
    userId,
    title: draft.title.trim(),
    description: draft.description.trim(),
    date: draft.date,
    time: draft.time,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    deleted: false,
    synced: false,
  };
}

export function eventsForDate(events: readonly AgendaEvent[], date: string): AgendaEvent[] {
  return events.filter(event => !event.deleted && event.date === date).sort((a, b) =>
    a.time.localeCompare(b.time) || a.title.localeCompare(b.title, 'es') || a.id.localeCompare(b.id));
}
