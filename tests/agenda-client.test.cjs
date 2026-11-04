const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const compile = source => ts.transpileModule(source, { compilerOptions: {
  target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, esModuleInterop: true,
} }).outputText;
function loadService(filename, stubs, globals = {}) {
  const moduleObject = { exports: {} };
  vm.runInNewContext(compile(fs.readFileSync(path.join(__dirname, '../src/services', filename), 'utf8')), {
    module: moduleObject, exports: moduleObject.exports,
    require(name) { if (!(name in stubs)) throw new Error(`Unexpected dependency ${name}`); return stubs[name]; },
    console, ...globals,
  });
  return moduleObject.exports;
}

function apiFixture(platform, url) {
  let interceptor;
  let options;
  const calls = [];
  const request = async (method, url, data, config = {}) => {
    const headers = { ...config.headers };
    const final = await interceptor({ ...config, headers });
    calls.push({ method, url, data, ...final });
    return { data: { ok: true } };
  };
  const client = {
    interceptors: { request: { use(handler) { interceptor = handler; } } },
    get: (url, config) => request('get', url, undefined, config),
    put: (url, data, config) => request('put', url, data, config),
    delete: (url, config) => request('delete', url, undefined, config),
    post: (url, data, config) => request('post', url, data, config),
  };
  const api = loadService('api.ts', {
    axios: { create(value) { options = value; return client; } },
    '@react-native-async-storage/async-storage': { getItem: async () => 'token-of-new-account' },
    'react-native': { Platform: { OS: platform } },
  }, { process: { env: { EXPO_PUBLIC_API_URL: url } } });
  return { api, calls, options };
}

test('backend URL configuration takes precedence on web, Android and iOS', () => {
  for (const platform of ['web', 'android', 'ios']) {
    const fixture = apiFixture(platform, 'https://configured-backend.test/api');
    assert.equal(fixture.options.baseURL, 'https://configured-backend.test/api');
    assert.equal(fixture.options.timeout, 10000);
  }
});

test('agenda requests keep the captured token even when AsyncStorage belongs to a new account', async () => {
  const { api, calls } = apiFixture('web');
  await api.authAPI.getMe('token-of-original-account');
  await api.agendaAPI.put('agenda_sample', { title: 'Evento', description: '', date: '2026-11-04', time: '' }, 'token-of-original-account');
  await api.agendaAPI.remove('agenda_sample', 'token-of-original-account');
  await api.agendaAPI.list('token-of-original-account');
  for (const call of calls) assert.equal(call.headers.Authorization, 'Bearer token-of-original-account');
  assert.equal(calls[3].params.includeDeleted, true);
  await api.notesAPI.getNotes();
  assert.equal(calls[4].headers.Authorization, 'Bearer token-of-new-account');
});

const output = fs.mkdtempSync(path.join(os.tmpdir(), 'epsilon-agenda-client-'));
for (const name of ['model', 'storage', 'sync']) {
  fs.writeFileSync(path.join(output, `${name}.js`), compile(fs.readFileSync(path.join(__dirname, '../src/features/agenda', `${name}.ts`), 'utf8')));
}
after(() => fs.rmSync(output, { recursive: true, force: true }));
const model = require(path.join(output, 'model.js'));
const storageModule = require(path.join(output, 'storage.js'));
const syncModule = require(path.join(output, 'sync.js'));

test('switching sessions during sync keeps writes, notifications and local events in their original accounts', async () => {
  const values = new Map([['token', 'token-alice']]);
  const storage = {
    async getItem(key) { return values.get(key) ?? null; },
    async setItem(key, value) { values.set(key, value); },
  };
  const draft = title => ({ title, description: '', date: '2026-11-04', time: '' });
  const alice = storageModule.createAgendaRepository(storage, 'alice');
  const bob = storageModule.createAgendaRepository(storage, 'bob');
  await alice.upsert(model.createEvent(draft('De Alice'), 'alice'));
  await bob.upsert(model.createEvent(draft('De Bob'), 'bob'));
  const records = new Map();
  const calls = [];
  let releaseAlice;
  let aliceStarted;
  const ready = new Promise(resolve => { aliceStarted = resolve; });
  const userFor = token => token === 'token-alice' ? 'alice' : 'bob';
  const service = loadService('agendaService.ts', {
    '@react-native-async-storage/async-storage': storage,
    '../features/agenda/storage': storageModule,
    '../features/agenda/sync': syncModule,
    './api': {
      authAPI: { async getMe(token) { return { user: { id: userFor(token) } }; } },
      agendaAPI: {
        async list(token) { return Array.from(records.values()).filter(event => event.userId === userFor(token)); },
        async put(id, fields, token) {
          calls.push({ id, token });
          if (token === 'token-alice') {
            aliceStarted();
            await new Promise(resolve => { releaseAlice = resolve; });
          }
          const event = { ...fields, id, userId: userFor(token), deleted: false, synced: true,
            createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
          records.set(`${event.userId}:${id}`, event);
          return event;
        },
        async remove() { throw new Error('Unexpected deletion'); },
      },
    },
  });
  const bobNotifications = [];
  const unsubscribe = service.subscribeAgenda('bob', events => bobNotifications.push(events));
  const pendingAlice = service.syncAgenda('alice');
  await ready;
  values.set('token', 'token-bob');
  await service.syncAgenda('bob');
  releaseAlice();
  await pendingAlice;
  unsubscribe();
  assert.equal(calls[0].token, 'token-alice');
  assert.equal(calls[1].token, 'token-bob');
  assert.equal(bobNotifications.length, 1);
  assert.ok(bobNotifications[0].every(event => event.userId === 'bob'));
  assert.deepEqual((await alice.load()).map(event => event.title), ['De Alice']);
  assert.deepEqual((await bob.load()).map(event => event.title), ['De Bob']);
});

test('development without a session does not upload local events', async () => {
  let requests = 0;
  const service = loadService('agendaService.ts', {
    '@react-native-async-storage/async-storage': { async getItem() { return null; } },
    '../features/agenda/storage': storageModule,
    '../features/agenda/sync': syncModule,
    './api': { authAPI: { async getMe() { requests++; } }, agendaAPI: {} },
  });
  assert.equal(await service.syncAgenda('local-development'), null);
  assert.equal(await service.syncAgenda(), null);
  assert.equal(requests, 0);
});
