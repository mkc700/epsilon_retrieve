import AsyncStorage from '@react-native-async-storage/async-storage';
import { AgendaEvent } from '../features/agenda/model';
import { createAgendaRepository } from '../features/agenda/storage';
import { createAgendaSynchronizer } from '../features/agenda/sync';
import { agendaAPI, authAPI } from './api';

type Listener = (events: AgendaEvent[]) => void;
const listeners = new Map<string, Set<Listener>>();
type SyncResult = { userId: string; events: AgendaEvent[] };
const operations = new Map<string, Promise<SyncResult | null>>();

export function subscribeAgenda(userId: string, listener: Listener) {
  const account = listeners.get(userId) || new Set<Listener>();
  account.add(listener);
  listeners.set(userId, account);
  return () => { account.delete(listener); if (!account.size) listeners.delete(userId); };
}

export async function syncAgenda(expectedUserId?: string): Promise<AgendaEvent[] | null> {
  if (expectedUserId === 'local-development') return null;
  const token = await AsyncStorage.getItem('token');
  if (!token) return null;
  const key = token;
  const pending = operations.get(key);
  if (pending) {
    const result = await pending;
    return result && (!expectedUserId || result.userId === expectedUserId) ? result.events : null;
  }
  const operation = (async () => {
    const session = await authAPI.getMe(token);
    const userId = session.user?.id;
    if (typeof userId !== 'string' || !userId || (expectedUserId && expectedUserId !== userId)) return null;
    const repository = createAgendaRepository(AsyncStorage, userId);
    const synchronizer = createAgendaSynchronizer(repository, {
      list: () => agendaAPI.list(token),
      put: event => agendaAPI.put(event.id, {
        title: event.title, description: event.description, date: event.date, time: event.time,
      }, token),
      remove: id => agendaAPI.remove(id, token),
    });
    const events = await synchronizer.sync();
    for (const listener of listeners.get(userId) || []) listener(events);
    return { userId, events };
  })();
  operations.set(key, operation);
  try {
    const result = await operation;
    return result?.events || null;
  } finally { if (operations.get(key) === operation) operations.delete(key); }
}
