const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const AgendaEvent = require('../models/AgendaEvent');
const { validDate } = require('../validation/agenda');

// Real Express routes/JWT/validation, with an in-memory model adapter instead of a live database.
const records = new Map();
const copy = value => value ? { ...value } : null;
const matches = (event, filter) => Object.entries(filter).every(([key, value]) => {
  if (key === 'date' && value && typeof value === 'object') {
    return (!value.$gte || event.date >= value.$gte) && (!value.$lte || event.date <= value.$lte);
  }
  return event[key] === value;
});
const keyOf = event => `${event.userId}:${event.eventId}`;
const methods = { find: AgendaEvent.find, findOne: AgendaEvent.findOne, create: AgendaEvent.create, findOneAndUpdate: AgendaEvent.findOneAndUpdate };
AgendaEvent.find = filter => ({
  async sort() { return Array.from(records.values()).filter(event => matches(event, filter)).sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time)).map(copy); },
});
AgendaEvent.findOne = async filter => copy(Array.from(records.values()).find(event => matches(event, filter)));
AgendaEvent.create = async fields => {
  if (records.has(keyOf(fields))) throw Object.assign(new Error('duplicate'), { code: 11000 });
  const event = { description: '', time: '', deleted: false, ...fields, createdAt: new Date(), updatedAt: new Date() };
  records.set(keyOf(event), event);
  return copy(event);
};
AgendaEvent.findOneAndUpdate = async (filter, update, options = {}) => {
  let event = Array.from(records.values()).find(item => matches(item, filter));
  if (!event && !options.upsert) return null;
  event = { description: '', time: '', deleted: false, ...filter, ...event, ...update.$set, createdAt: event?.createdAt || new Date(), updatedAt: new Date() };
  records.set(keyOf(event), event);
  return copy(event);
};

const ALICE = '111111111111111111111111';
const BOB = '222222222222222222222222';
const secret = 'agenda-test-only-secret-never-used-by-the-running-server';
let server;
let base;
const body = changes => ({ id: 'agenda_sample', title: 'Reunión de equipo', description: 'Preparar avances', date: '2026-11-04', time: '09:00', ...changes });
async function request(method, path = '', payload, userId = ALICE) {
  const headers = {};
  if (userId) headers.Authorization = `Bearer ${jwt.sign({ userId }, secret)}`;
  if (payload !== undefined) headers['Content-Type'] = 'application/json';
  const response = await fetch(`${base}/api/agenda${path}`, { method, headers, body: payload === undefined ? undefined : JSON.stringify(payload) });
  return { status: response.status, data: response.status === 204 ? null : await response.json() };
}

before(async () => {
  process.env.JWT_SECRET = secret;
  const app = require('../app');
  server = await new Promise((resolve, reject) => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
    listener.on('error', reject);
  });
  base = `http://127.0.0.1:${server.address().port}`;
});
beforeEach(() => records.clear());
after(async () => {
  Object.assign(AgendaEvent, methods);
  if (server) await new Promise(resolve => server.close(resolve));
});

test('agenda routes require a valid JWT', async () => {
  for (const [method, path] of [['GET', ''], ['GET', '/agenda_sample'], ['POST', ''], ['PUT', '/agenda_sample'], ['DELETE', '/agenda_sample']]) {
    assert.equal((await request(method, path, method === 'POST' || method === 'PUT' ? body() : undefined, null)).status, 401);
  }
  const response = await fetch(`${base}/api/agenda`, { headers: { Authorization: 'Bearer invalid' } });
  assert.equal(response.status, 401);
});

test('create/list/read use token ownership and ignore client-supplied ownership or sync metadata', async () => {
  const created = await request('POST', '', body({ userId: BOB, deleted: true, synced: true, createdAt: '1900-01-01' }));
  assert.equal(created.status, 201);
  assert.equal(created.data.userId, ALICE);
  assert.equal(created.data.id, 'agenda_sample');
  assert.equal(created.data.deleted, false);
  assert.equal(created.data.synced, true);
  assert.equal((await request('GET')).data.length, 1);
  assert.equal((await request('GET', '/agenda_sample')).data.title, 'Reunión de equipo');
  assert.deepEqual((await request('GET', '', undefined, BOB)).data, []);
  assert.equal((await request('GET', '/agenda_sample', undefined, BOB)).status, 404);
});

test('server can assign a stable ID and POST retries do not duplicate or overwrite newer content', async () => {
  const fields = body();
  delete fields.id;
  const created = await request('POST', '', fields);
  assert.equal(created.status, 201);
  assert.match(created.data.id, /^agenda_/);
  const retry = await request('POST', '', body({ id: created.data.id, title: 'Retry distinto' }));
  assert.equal(retry.status, 200);
  assert.equal(retry.data.title, fields.title);
  assert.equal(records.size, 1);
});

test('PUT creates on first sync, updates the same ID and preserves other accounts', async () => {
  assert.equal((await request('PUT', '/agenda_stable', body())).status, 200);
  await request('PUT', '/agenda_stable', body({ title: 'Actualizado', date: '2026-11-05', time: '' }));
  assert.equal(records.size, 1);
  assert.equal((await request('GET', '/agenda_stable')).data.title, 'Actualizado');
  await request('PUT', '/agenda_stable', body({ title: 'Evento de Bob' }), BOB);
  assert.equal(records.size, 2);
  assert.equal((await request('GET', '/agenda_stable')).data.title, 'Actualizado');
  assert.equal((await request('GET', '/agenda_stable', undefined, BOB)).data.title, 'Evento de Bob');
});

test('delete is idempotent, scoped to the JWT, and exposes tombstones only when requested', async () => {
  await request('POST', '', body());
  await request('DELETE', '/agenda_sample', undefined, BOB);
  assert.equal((await request('GET')).data.length, 1);
  assert.equal((await request('DELETE', '/agenda_sample')).status, 204);
  assert.equal((await request('DELETE', '/agenda_sample')).status, 204);
  assert.deepEqual((await request('GET')).data, []);
  assert.equal((await request('GET', '/agenda_sample')).status, 404);
  const tombstones = await request('GET', '?includeDeleted=true');
  assert.equal(tombstones.data.length, 1);
  assert.equal(tombstones.data[0].deleted, true);
  assert.equal((await request('GET', '?includeDeleted=true', undefined, BOB)).data.length, 0);
  await request('PUT', '/agenda_sample', body());
  assert.equal((await request('GET')).data.length, 1);
  assert.equal(records.size, 1);
});

test('date filtering is inclusive and invalid query parameters fail with 400', async () => {
  await request('POST', '', body({ id: 'day_one', date: '2026-11-04' }));
  await request('POST', '', body({ id: 'day_two', date: '2026-11-05' }));
  const result = await request('GET', '?from=2026-11-05&to=2026-11-05');
  assert.deepEqual(result.data.map(event => event.id), ['day_two']);
  for (const query of ['?from=2026-02-30', '?from=2026-11-06&to=2026-11-01', '?includeDeleted=invalid', '?to[$ne]=x']) {
    assert.equal((await request('GET', query)).status, 400, query);
  }
});

test('invalid bodies, impossible dates, times, lengths and IDs return 400 without writes', async () => {
  for (const changes of [
    { title: '' }, { title: 'x'.repeat(121) }, { description: 'x'.repeat(2001) },
    { date: '2026-02-30' }, { date: '1899-12-31' }, { date: '2200-01-01' },
    { time: '24:00' }, { time: '9:00' }, { time: null }, { id: '../bad' },
  ]) assert.equal((await request('POST', '', body(changes))).status, 400, JSON.stringify(changes));
  assert.equal((await request('POST', '', null)).status, 400);
  assert.equal((await request('PUT', '/bad%20id', body())).status, 400);
  assert.equal((await request('DELETE', '/bad%20id')).status, 400);
  assert.equal(records.size, 0);
});

test('real Mongoose schema validates fields and declares account-scoped uniqueness', async () => {
  const valid = new AgendaEvent({ ...body(), eventId: 'agenda_schema', userId: ALICE });
  await valid.validate();
  for (const changes of [{ date: '2026-02-30' }, { time: '25:00' }, { title: '' }]) {
    await assert.rejects(new AgendaEvent({ ...body(changes), eventId: 'agenda_schema', userId: ALICE }).validate());
  }
  assert.ok(AgendaEvent.schema.indexes().some(([fields, options]) => fields.userId === 1 && fields.eventId === 1 && options.unique));
  assert.equal(validDate('2024-02-29'), true);
  assert.equal(validDate('2026-02-29'), false);
});
