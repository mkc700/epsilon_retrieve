import { AgendaEvent } from './model';
import { AgendaRepository } from './storage';

export interface AgendaTransport {
  list(): Promise<AgendaEvent[]>;
  put(event: AgendaEvent): Promise<AgendaEvent>;
  remove(id: string): Promise<void>;
}

/** Pending state lives on each account's event, so repeated edits collapse safely. */
export function createAgendaSynchronizer(repository: AgendaRepository, transport: AgendaTransport) {
  let inFlight: Promise<AgendaEvent[]> | null = null;
  async function run(): Promise<AgendaEvent[]> {
    const events = await repository.load();
    for (const snapshot of events.filter(event => event.synced !== true)) {
      if (snapshot.deleted) {
        await transport.remove(snapshot.id);
        await repository.acknowledge(snapshot);
      } else {
        const remote = await transport.put(snapshot);
        await repository.acknowledge(snapshot, remote);
      }
    }
    return repository.mergeRemote(await transport.list());
  }
  return {
    sync(): Promise<AgendaEvent[]> {
      if (!inFlight) inFlight = run().finally(() => { inFlight = null; });
      return inFlight;
    },
  };
}
