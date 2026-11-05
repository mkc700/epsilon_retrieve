import { AgendaEvent, validateEventDraft } from './model';

export interface AgendaStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

export interface AgendaRepository {
  load(): Promise<AgendaEvent[]>;
  upsert(event: AgendaEvent): Promise<AgendaEvent[]>;
  remove(id: string): Promise<AgendaEvent[]>;
  acknowledge(snapshot: AgendaEvent, remote?: AgendaEvent): Promise<AgendaEvent[]>;
  mergeRemote(events: AgendaEvent[]): Promise<AgendaEvent[]>;
}

export class AgendaStorageError extends Error {
  constructor(message: string, public readonly code: 'read' | 'corrupt' | 'write') {
    super(message);
    this.name = 'AgendaStorageError';
  }
}

const queues = new WeakMap<AgendaStorage, Map<string, Promise<unknown>>>();

function validEvent(value: unknown, userId: string): value is AgendaEvent {
  if (!value || typeof value !== 'object') return false;
  const event = value as AgendaEvent;
  return typeof event.id === 'string' && event.id.length > 0 && event.userId === userId
    && typeof event.createdAt === 'string' && Number.isFinite(Date.parse(event.createdAt))
    && typeof event.updatedAt === 'string' && Number.isFinite(Date.parse(event.updatedAt))
    && typeof event.deleted === 'boolean'
    && (event.synced === undefined || typeof event.synced === 'boolean')
    && validateEventDraft(event) === null;
}

function sameRevision(current: AgendaEvent, snapshot: AgendaEvent): boolean {
  const fields: (keyof AgendaEvent)[] = ['id', 'userId', 'title', 'description', 'date', 'time', 'deleted', 'updatedAt'];
  return fields.every(field => current[field] === snapshot[field]);
}

/** Account-scoped local storage. Every mutation reads successfully before writing. */
export function createAgendaRepository(storage: AgendaStorage, userId: string): AgendaRepository {
  if (!userId) throw new Error('La agenda necesita una cuenta válida.');
  const key = `epsilon:agenda:v1:${encodeURIComponent(userId)}`;
  let accountQueues = queues.get(storage);
  if (!accountQueues) { accountQueues = new Map(); queues.set(storage, accountQueues); }
  const sharedQueues = accountQueues;
  function serialize<T>(operation: () => Promise<T>): Promise<T> {
    const next = (sharedQueues.get(key) ?? Promise.resolve()).then(operation, operation);
    sharedQueues.set(key, next.then(() => undefined, () => undefined));
    return next;
  }

  async function read(): Promise<AgendaEvent[]> {
    let raw: string | null;
    try { raw = await storage.getItem(key); } catch {
      throw new AgendaStorageError('No se pudo leer tu agenda. No se ha guardado ningún cambio.', 'read');
    }
    if (raw === null) return [];
    try {
      const data = JSON.parse(raw);
      if (!data || data.version !== 1 || !Array.isArray(data.events)
        || !data.events.every((event: unknown) => validEvent(event, userId))) throw new Error('Invalid agenda');
      const events = data.events as AgendaEvent[];
      if (new Set(events.map(event => event.id)).size !== events.length) throw new Error('Duplicate event');
      return events;
    } catch {
      throw new AgendaStorageError('No se pudieron leer los datos de tu agenda. Los datos guardados se han conservado.', 'corrupt');
    }
  }

  async function write(events: AgendaEvent[]): Promise<AgendaEvent[]> {
    try { await storage.setItem(key, JSON.stringify({ version: 1, events })); } catch {
      throw new AgendaStorageError('No se pudo guardar el cambio. Vuelve a intentarlo.', 'write');
    }
    return events.map(event => ({ ...event }));
  }

  return {
    load: () => serialize(read),
    upsert: event => {
      const snapshot = { ...event, synced: false };
      return serialize(async () => {
        if (!validEvent(snapshot, userId)) throw new Error('El evento o la cuenta de la agenda no es válido.');
        const events = await read();
        const index = events.findIndex(item => item.id === snapshot.id);
        if (index === -1) events.push(snapshot); else events[index] = snapshot;
        return write(events);
      });
    },
    remove: id => serialize(async () => {
      const events = await read();
      const index = events.findIndex(event => event.id === id);
      if (index === -1 || events[index].deleted) return events;
      events[index] = { ...events[index], deleted: true, synced: false, updatedAt: new Date().toISOString() };
      return write(events);
    }),
    acknowledge: (snapshot, remote) => serialize(async () => {
      if (!validEvent(snapshot, userId)
        || (remote && (!validEvent(remote, userId) || remote.id !== snapshot.id))) {
        throw new Error('La respuesta de sincronización no corresponde a este evento.');
      }
      const events = await read();
      const index = events.findIndex(event => event.id === snapshot.id);
      // A user may edit, delete or restore the event while its request is in flight.
      if (index === -1 || !sameRevision(events[index], snapshot)) return events;
      events[index] = { ...(remote || snapshot), synced: true };
      return write(events);
    }),
    mergeRemote: remoteEvents => serialize(async () => {
      if (!Array.isArray(remoteEvents) || !remoteEvents.every(event => validEvent(event, userId))
        || new Set(remoteEvents.map(event => event.id)).size !== remoteEvents.length) {
        throw new Error('El servidor devolvió datos de agenda no válidos. Tus eventos locales se han conservado.');
      }
      const events = await read();
      const byId = new Map(events.map(event => [event.id, event]));
      for (const remote of remoteEvents) {
        const local = byId.get(remote.id);
        if (local && local.synced !== true) continue;
        byId.set(remote.id, { ...remote, synced: true });
      }
      // Missing events are retained: deletion is represented by an explicit tombstone.
      return write(Array.from(byId.values()));
    }),
  };
}
