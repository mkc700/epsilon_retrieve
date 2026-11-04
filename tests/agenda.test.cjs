const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const ts = require('typescript');

// Exercise the pure data layer without requiring an Expo runtime or new dependency.
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'epsilon-agenda-'));
for (const name of ['model', 'storage', 'sync']) {
  const source = fs.readFileSync(path.join(__dirname, '../src/features/agenda', `${name}.ts`), 'utf8');
  fs.writeFileSync(path.join(output, `${name}.js`), ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
  }).outputText);
}
after(() => fs.rmSync(output, { recursive: true, force: true }));
const model = require(path.join(output, 'model.js'));
const { createAgendaRepository } = require(path.join(output, 'storage.js'));
const { createAgendaSynchronizer } = require(path.join(output, 'sync.js'));
const draft = (changes = {}) => ({ title: 'Consulta', description: '', date: '2026-11-04', time: '09:00', ...changes });
const event = (changes = {}, userId = 'alice') => model.createEvent(draft(changes), userId);
const memoryStorage = () => {
  const values = new Map();
  return { values, async getItem(key) { return values.get(key) ?? null; }, async setItem(key, value) { values.set(key, value); } };
};

test('strict civil dates reject rollover and handle leap/year changes', () => {
  assert.equal(model.dateKey(model.parseDate('2024-02-29')), '2024-02-29');
  for (const invalid of ['2026-02-29', '2026-02-30', '2026-04-31', '2026-13-01', '2026-1-04', '']) {
    assert.throws(() => model.parseDate(invalid), RangeError);
  }
  assert.equal(model.addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(model.addDays('2024-03-01', -1), '2024-02-29');
});

test('civil dates stay local across UTC offsets and DST transitions', () => {
  for (const timezone of ['America/Mexico_City', 'America/New_York', 'Pacific/Auckland', 'Pacific/Honolulu']) {
    const result = JSON.parse(execFileSync(process.execPath, ['-e', `
      const m = require(${JSON.stringify(path.join(output, 'model.js'))});
      const date = m.parseDate('2026-11-04');
      process.stdout.write(JSON.stringify([
        m.dateKey(date), date.getHours(), m.addDays('2026-03-07', 1), m.addDays('2026-11-01', 1)
      ]));
    `], { env: { ...process.env, TZ: timezone }, encoding: 'utf8' }));
    assert.deepEqual(result, ['2026-11-04', 12, '2026-03-08', '2026-11-02'], timezone);
  }
});

test('monthly calendars have 42 consecutive dates starting on Monday', () => {
  const cells = model.monthCells('2026-11-04');
  assert.equal(cells.length, 42);
  assert.equal(cells[0], '2026-10-26');
  assert.equal(cells[41], '2026-12-06');
  assert.equal(model.parseDate(cells[0]).getDay(), 1);
  for (let index = 1; index < cells.length; index++) assert.equal(cells[index], model.addDays(cells[index - 1], 1));
  for (const bound of [model.MIN_AGENDA_DATE, model.MAX_AGENDA_DATE]) assert.equal(model.monthCells(bound).length, 42);
});

test('month navigation clamps short months, year transitions and supported bounds', () => {
  assert.equal(model.shiftMonth('2026-01-31', 1), '2026-02-28');
  assert.equal(model.shiftMonth('2024-01-31', 1), '2024-02-29');
  assert.equal(model.shiftMonth('2026-03-31', -1), '2026-02-28');
  assert.equal(model.shiftMonth('2026-12-31', 2), '2027-02-28');
  assert.equal(model.shiftMonth(model.MIN_AGENDA_DATE, -1), model.MIN_AGENDA_DATE);
  assert.equal(model.shiftMonth(model.MAX_AGENDA_DATE, 1), model.MAX_AGENDA_DATE);
});

test('validation supports all-day events and rejects invalid input', () => {
  assert.equal(model.validateEventDraft(draft()), null);
  assert.equal(model.validateEventDraft(draft({ time: '' })), null);
  assert.equal(model.validateEventDraft(draft({ time: '00:00' })), null);
  assert.equal(model.validateEventDraft(draft({ time: '23:59' })), null);
  for (const changes of [
    { title: '  ' }, { title: 'x'.repeat(121) }, { description: 'x'.repeat(2001) },
    { date: '2026-02-30' }, { date: '1899-12-31' }, { date: '2200-01-01' },
    { time: '9:00' }, { time: '24:00' }, { time: '12:60' }, { time: null },
  ]) assert.equal(typeof model.validateEventDraft(draft(changes)), 'string', JSON.stringify(changes));
});

test('editing preserves identity and ownership while trimming text', () => {
  const original = event({ title: '  Consulta ', description: ' Contexto ' });
  const edited = model.createEvent(draft({ title: 'Cambio' }), 'alice', original);
  assert.equal(original.title, 'Consulta');
  assert.equal(original.description, 'Contexto');
  assert.equal(edited.id, original.id);
  assert.equal(edited.createdAt, original.createdAt);
  assert.equal(edited.title, 'Cambio');
  assert.throws(() => model.createEvent(draft(), 'bob', original));
});

test('daily list excludes deleted/other dates and sorts all-day then clock time', () => {
  const events = [event({ title: 'Tarde', time: '16:00' }), event({ title: 'Mañana' }),
    event({ title: 'Todo el día', time: '' }), event({ title: 'Otro día', date: '2026-11-05' }),
    { ...event({ title: 'Eliminado' }), deleted: true }];
  const before = events.slice();
  assert.deepEqual(model.eventsForDate(events, '2026-11-04').map(item => item.title), ['Todo el día', 'Mañana', 'Tarde']);
  assert.deepEqual(events, before);
});

test('empty first launch, reload, soft deletion and undo retain event identity', async () => {
  const storage = memoryStorage();
  const first = createAgendaRepository(storage, 'alice');
  assert.deepEqual(await first.load(), []);
  const original = event();
  await first.upsert(original);
  const second = createAgendaRepository(storage, 'alice');
  assert.deepEqual(await second.load(), [original]);
  const removed = await second.remove(original.id);
  assert.equal(removed[0].deleted, true);
  assert.deepEqual(model.eventsForDate(removed, original.date), []);
  await second.upsert({ ...original, updatedAt: new Date().toISOString() });
  assert.deepEqual(model.eventsForDate(await first.load(), original.date).map(item => item.id), [original.id]);
});

test('accounts use distinct namespaced keys and reject cross-account writes', async () => {
  const storage = memoryStorage();
  const alice = createAgendaRepository(storage, 'alice/a');
  const bob = createAgendaRepository(storage, 'bob');
  const original = event({}, 'alice/a');
  await alice.upsert(original);
  assert.equal(storage.values.has('epsilon:agenda:v1:alice%2Fa'), true);
  assert.deepEqual(await bob.load(), []);
  await assert.rejects(bob.upsert(original));
  await bob.upsert(event({ title: 'De Bob' }, 'bob'));
  assert.deepEqual(await alice.load(), [original]);
  assert.equal((await bob.load())[0].title, 'De Bob');
});

test('corrupt, unsupported, duplicate or mismatched data is never overwritten', async () => {
  const original = event();
  for (const raw of ['{broken', 'null', '[]', JSON.stringify({ version: 2, events: [] }),
    JSON.stringify({ version: 1, events: [event({}, 'bob')] }),
    JSON.stringify({ version: 1, events: [{ ...original, date: '2026-02-30' }] }),
    JSON.stringify({ version: 1, events: [original, original] })]) {
    let writes = 0;
    const repository = createAgendaRepository({ async getItem() { return raw; }, async setItem() { writes++; } }, 'alice');
    await assert.rejects(repository.load(), error => error.code === 'corrupt');
    await assert.rejects(repository.upsert(event()), error => error.code === 'corrupt');
    await assert.rejects(repository.remove(original.id), error => error.code === 'corrupt');
    assert.equal(writes, 0);
  }
});

test('read/write failures preserve saved data and the queue recovers', async () => {
  const memory = memoryStorage();
  let failRead = false;
  let failWrite = false;
  let writes = 0;
  const storage = {
    async getItem(key) { if (failRead) throw new Error('unavailable'); return memory.getItem(key); },
    async setItem(key, value) { if (failWrite) throw new Error('disk full'); writes++; return memory.setItem(key, value); },
  };
  const repository = createAgendaRepository(storage, 'alice');
  const original = event();
  await repository.upsert(original);
  failRead = true;
  await assert.rejects(repository.upsert(event({ title: 'Intento' })), error => error.code === 'read');
  assert.equal(writes, 1);
  failRead = false;
  failWrite = true;
  await assert.rejects(repository.remove(original.id), error => error.code === 'write');
  assert.deepEqual(await repository.load(), [original]);
  failWrite = false;
  await repository.remove(original.id);
  assert.equal((await repository.load())[0].deleted, true);
});

test('concurrent repositories serialize mutations and snapshot queued events', async () => {
  const memory = memoryStorage();
  let active = 0;
  let maximum = 0;
  const storage = {
    getItem: key => memory.getItem(key),
    async setItem(key, value) {
      active++; maximum = Math.max(maximum, active);
      await new Promise(resolve => setTimeout(resolve, 2));
      await memory.setItem(key, value);
      active--;
    },
  };
  const first = createAgendaRepository(storage, 'alice');
  const second = createAgendaRepository(storage, 'alice');
  const events = Array.from({ length: 10 }, (_, index) => event({ title: `Evento ${index}` }));
  const writes = events.map((item, index) => (index % 2 ? first : second).upsert(item));
  events[9].title = 'Mutado después de encolar';
  await Promise.all(writes);
  const saved = await first.load();
  assert.equal(saved.length, 10);
  assert.equal(saved[9].title, 'Evento 9');
  assert.equal(maximum, 1);
  await Promise.all([first.upsert(model.createEvent(draft({ title: 'Editado' }), 'alice', saved[0])), second.remove(saved[1].id)]);
  const final = await first.load();
  assert.equal(final[0].title, 'Editado');
  assert.equal(final[1].deleted, true);
  assert.equal(final.length, 10);
});

function fakeServer(initial = []) {
  const events = new Map(initial.map(item => [item.id, { ...item, synced: true }]));
  const calls = [];
  return {
    events, calls,
    async list() { return Array.from(events.values(), item => ({ ...item })); },
    async put(item) {
      calls.push(['put', item.id]);
      const remote = { ...item, synced: true, deleted: false, updatedAt: new Date().toISOString() };
      events.set(item.id, remote);
      return { ...remote };
    },
    async remove(id) {
      calls.push(['remove', id]);
      if (events.has(id)) events.set(id, { ...events.get(id), deleted: true, synced: true });
    },
  };
}

test('sync uploads old local records, pulls remote events and keeps a durable synced state', async () => {
  const storage = memoryStorage();
  const repo = createAgendaRepository(storage, 'alice');
  const legacy = event();
  delete legacy.synced;
  storage.values.set('epsilon:agenda:v1:alice', JSON.stringify({ version: 1, events: [legacy] }));
  const remote = event({ title: 'Desde otro dispositivo' });
  const server = fakeServer([remote]);
  const sync = createAgendaSynchronizer(repo, server);
  const result = await sync.sync();
  assert.equal(result.length, 2);
  assert.ok(result.every(item => item.synced === true));
  assert.deepEqual(server.calls, [['put', legacy.id]]);
  await sync.sync();
  assert.equal(server.calls.length, 1);
  assert.equal((await createAgendaRepository(storage, 'alice').load()).length, 2);
});

test('network failure after server save retries the same ID without duplicates', async () => {
  const repo = createAgendaRepository(memoryStorage(), 'alice');
  const original = event();
  await repo.upsert(original);
  const server = fakeServer();
  const put = server.put;
  let failOnce = true;
  server.put = async item => {
    const saved = await put(item);
    if (failOnce) { failOnce = false; throw new Error('response lost'); }
    return saved;
  };
  const sync = createAgendaSynchronizer(repo, server);
  await assert.rejects(sync.sync(), /response lost/);
  assert.equal((await repo.load())[0].synced, false);
  await sync.sync();
  assert.equal(server.events.size, 1);
  assert.equal((await repo.load())[0].id, original.id);
  assert.equal((await repo.load())[0].synced, true);
});

test('multiple edits before upload replace one server event; delete after an edit removes it', async () => {
  const repo = createAgendaRepository(memoryStorage(), 'alice');
  const original = event();
  const server = fakeServer([original]);
  await repo.mergeRemote(await server.list());
  await repo.upsert(model.createEvent(draft({ title: 'Primera edición' }), 'alice', original));
  await repo.upsert(model.createEvent(draft({ title: 'Segunda edición' }), 'alice', original));
  const sync = createAgendaSynchronizer(repo, server);
  await sync.sync();
  assert.equal(server.events.size, 1);
  assert.equal(server.events.get(original.id).title, 'Segunda edición');
  await repo.upsert(model.createEvent(draft({ title: 'Cambio pendiente' }), 'alice', original));
  await repo.remove(original.id);
  await sync.sync();
  assert.equal(server.events.get(original.id).deleted, true);
  assert.deepEqual(model.eventsForDate(await repo.load(), original.date), []);
  assert.deepEqual(server.calls, [['put', original.id], ['remove', original.id]]);
});

test('edit during an in-flight upload stays pending and is not overwritten by acknowledgement or pull', async () => {
  const repo = createAgendaRepository(memoryStorage(), 'alice');
  const original = event();
  await repo.upsert(original);
  const server = fakeServer();
  const put = server.put;
  let release;
  let started;
  const ready = new Promise(resolve => { started = resolve; });
  server.put = async item => {
    const remote = await put(item);
    started();
    await new Promise(resolve => { release = resolve; });
    return remote;
  };
  const sync = createAgendaSynchronizer(repo, server);
  const pending = sync.sync();
  assert.equal(sync.sync(), pending);
  await ready;
  await repo.upsert(model.createEvent(draft({ title: 'Edición durante envío' }), 'alice', original));
  release();
  const result = await pending;
  assert.equal(result[0].title, 'Edición durante envío');
  assert.equal(result[0].synced, false);
  server.put = put;
  await sync.sync();
  assert.equal(server.events.get(original.id).title, 'Edición durante envío');
  assert.equal((await repo.load())[0].synced, true);
});

test('undo during a deletion request remains pending and restores the same remote event', async () => {
  const repo = createAgendaRepository(memoryStorage(), 'alice');
  const original = event();
  const server = fakeServer([original]);
  await repo.mergeRemote(await server.list());
  await repo.remove(original.id);
  const remove = server.remove;
  let release;
  let started;
  const ready = new Promise(resolve => { started = resolve; });
  server.remove = async id => {
    await remove(id);
    started();
    await new Promise(resolve => { release = resolve; });
  };
  const sync = createAgendaSynchronizer(repo, server);
  const pending = sync.sync();
  await ready;
  await repo.upsert({ ...original, deleted: false });
  release();
  await pending;
  assert.equal((await repo.load())[0].deleted, false);
  assert.equal((await repo.load())[0].synced, false);
  await sync.sync();
  assert.equal(server.events.size, 1);
  assert.equal(server.events.get(original.id).deleted, false);
});

test('remote edits and tombstones reach synced events while pending local changes win', async () => {
  const repo = createAgendaRepository(memoryStorage(), 'alice');
  const original = event();
  await repo.mergeRemote([{ ...original, synced: true }]);
  await repo.mergeRemote([{ ...original, title: 'Remoto', synced: true }]);
  assert.equal((await repo.load())[0].title, 'Remoto');
  await repo.mergeRemote([{ ...original, deleted: true, synced: true }]);
  assert.equal((await repo.load())[0].deleted, true);
  await repo.upsert(model.createEvent(draft({ title: 'Restauración local' }), 'alice', original));
  await repo.mergeRemote([{ ...original, deleted: true, synced: true }]);
  assert.equal((await repo.load())[0].deleted, false);
  assert.equal((await repo.load())[0].title, 'Restauración local');
});

test('malformed or foreign sync responses cannot replace local events or acknowledge a different ID', async () => {
  const repo = createAgendaRepository(memoryStorage(), 'alice');
  const original = event();
  await repo.upsert(original);
  await assert.rejects(repo.mergeRemote([event({}, 'bob')]));
  await assert.rejects(repo.mergeRemote([{ ...original, date: '2026-02-30' }]));
  await assert.rejects(repo.acknowledge(original, event()));
  await assert.rejects(repo.acknowledge(original, { ...original, userId: 'bob' }));
  assert.deepEqual(await repo.load(), [original]);
});

test('a failed download does not discard local events or duplicate already acknowledged uploads', async () => {
  const repo = createAgendaRepository(memoryStorage(), 'alice');
  const original = event();
  await repo.upsert(original);
  const server = fakeServer();
  const list = server.list;
  server.list = async () => { throw new Error('offline'); };
  const sync = createAgendaSynchronizer(repo, server);
  await assert.rejects(sync.sync(), /offline/);
  assert.equal((await repo.load())[0].synced, true);
  server.list = list;
  await sync.sync();
  assert.equal(server.calls.length, 1);
  assert.equal((await repo.load())[0].title, original.title);
});
