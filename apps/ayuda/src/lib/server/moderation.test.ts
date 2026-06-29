import { test } from 'node:test';
import assert from 'node:assert/strict';
import { moderate, type ModerationStore, type ModerationLogInput } from './moderation.ts';

// Adaptador en memoria: el segundo adaptador que vuelve REAL el seam ModerationStore. Las
// pruebas cruzan la misma interfaz que producción —sin mockear el cliente de PocketBase.
type Records = Record<string, Record<string, Record<string, unknown>>>;

function inMemoryStore(seed: Records = {}) {
  const records: Records = structuredClone(seed);
  const logs: ModerationLogInput[] = [];
  const fail = { update: new Set<string>(), gone: new Set<string>(), log: false };

  const store: ModerationStore = {
    async getOne(collection, id) {
      const rec = records[collection]?.[id];
      if (!rec) throw new Error(`not found: ${collection}/${id}`);
      return rec;
    },
    async update(collection, id, fields) {
      const key = `${collection}/${id}`;
      if (fail.gone.has(key)) {
        // Simula un destino borrado: PocketBase responde 404 (ClientResponseError con status).
        const e: Error & { status?: number } = new Error('not found');
        e.status = 404;
        throw e;
      }
      if (fail.update.has(key)) throw new Error('simulated update failure');
      records[collection] ??= {};
      records[collection][id] = { ...(records[collection][id] ?? {}), ...fields };
    },
    async log(entry) {
      if (fail.log) throw new Error('simulated log failure');
      logs.push(entry);
    }
  };

  return {
    store,
    records,
    logs,
    failUpdate: (collection: string, id: string) => fail.update.add(`${collection}/${id}`),
    failUpdateGone: (collection: string, id: string) => fail.gone.add(`${collection}/${id}`),
    failLog: () => {
      fail.log = true;
    }
  };
}

test('resolve-only flips status and audits (pacientes approve)', async () => {
  const s = inMemoryStore({ patients_public: { p1: { status: 'pending' } } });
  const result = await moderate(s.store, {
    resolve: { collection: 'patients_public', id: 'p1', status: 'verified' },
    audit: { action: 'approve', moderator: 'mod@x', collection: 'patients_public', record: 'p1' }
  });
  assert.equal(result.ok, true);
  assert.equal(s.records.patients_public.p1.status, 'verified');
  assert.equal(s.logs.length, 1);
  assert.equal(s.logs[0].action, 'approve');
  assert.equal(s.logs[0].moderator, 'mod@x');
});

test('apply + resolve patches the target and closes the queue (cambios accept)', async () => {
  const s = inMemoryStore({
    patients_public: { p1: { status: 'verified', patient_name: 'old' } },
    updates_queue: { q1: { status: 'pending' } }
  });
  const result = await moderate(s.store, {
    apply: { collection: 'patients_public', id: 'p1', fields: { patient_name: 'new' }, required: true },
    resolve: { collection: 'updates_queue', id: 'q1', status: 'accepted' },
    audit: { action: 'update', moderator: 'mod@x', collection: 'patients_public', record: 'p1' }
  });
  assert.equal(result.ok, true);
  assert.equal(s.records.patients_public.p1.patient_name, 'new');
  assert.equal(s.records.updates_queue.q1.status, 'accepted');
});

test('required apply failure aborts before resolve and is not logged', async () => {
  const s = inMemoryStore({
    patients_public: { p1: { status: 'verified' } },
    updates_queue: { q1: { status: 'pending' } }
  });
  s.failUpdate('patients_public', 'p1');
  const result = await moderate(s.store, {
    apply: { collection: 'patients_public', id: 'p1', fields: { patient_name: 'new' }, required: true },
    resolve: { collection: 'updates_queue', id: 'q1', status: 'accepted' },
    audit: { action: 'update', moderator: 'mod@x', collection: 'patients_public', record: 'p1' }
  });
  assert.equal(result.ok, false);
  assert.match(result.error ?? '', /simulated update failure/);
  // El estado NO se tocó y no se auditó una transición que no ocurrió.
  assert.equal(s.records.updates_queue.q1.status, 'pending');
  assert.equal(s.logs.length, 0);
});

test('best-effort apply: a 404 (target gone) still resolves and is noted (retiros)', async () => {
  const s = inMemoryStore({
    patients_public: { p1: { status: 'verified' } },
    removal_requests: { r1: { status: 'pending' } }
  });
  s.failUpdateGone('patients_public', 'p1');
  const result = await moderate(s.store, {
    apply: { collection: 'patients_public', id: 'p1', fields: { status: 'archived' }, required: false },
    resolve: { collection: 'removal_requests', id: 'r1', status: 'accepted' },
    audit: { action: 'archive', moderator: 'mod@x', collection: 'patients_public', record: 'p1' }
  });
  assert.equal(result.ok, true);
  assert.match(result.note ?? '', /ya no existía/);
  // La solicitud igual se cerró y la decisión quedó auditada (con la nota del 404).
  assert.equal(s.records.removal_requests.r1.status, 'accepted');
  assert.equal(s.logs.length, 1);
  assert.match(s.logs[0].notes ?? '', /ya no existía/);
});

test('a non-404 apply failure surfaces even when not required (no silent close)', async () => {
  const s = inMemoryStore({
    patients_public: { p1: { status: 'verified' } },
    removal_requests: { r1: { status: 'pending' } }
  });
  s.failUpdate('patients_public', 'p1'); // error genérico (transitorio / regla), no 404
  const result = await moderate(s.store, {
    apply: { collection: 'patients_public', id: 'p1', fields: { status: 'archived' }, required: false },
    resolve: { collection: 'removal_requests', id: 'r1', status: 'accepted' },
    audit: { action: 'archive', moderator: 'mod@x', collection: 'patients_public', record: 'p1' }
  });
  assert.equal(result.ok, false);
  // La solicitud NO se cierra: el registro seguiría público, hay que reintentar.
  assert.equal(s.records.removal_requests.r1.status, 'pending');
  assert.equal(s.logs.length, 0);
});

test('resolve failure after a successful apply still audits the applied change', async () => {
  const s = inMemoryStore({
    patients_public: { p1: { status: 'verified', patient_name: 'old' } },
    updates_queue: { q1: { status: 'pending' } }
  });
  s.failUpdate('updates_queue', 'q1'); // el parche se aplica, pero cerrar la cola falla
  const result = await moderate(s.store, {
    apply: { collection: 'patients_public', id: 'p1', fields: { patient_name: 'new' }, required: true },
    resolve: { collection: 'updates_queue', id: 'q1', status: 'accepted' },
    audit: { action: 'update', moderator: 'mod@x', collection: 'patients_public', record: 'p1' }
  });
  assert.equal(result.ok, false);
  assert.equal(s.records.patients_public.p1.patient_name, 'new'); // el cambio sí se aplicó
  assert.equal(s.logs.length, 1); // y quedó auditado pese al fallo de cierre
});

test('resolve-only failure surfaces an error and writes no audit (nothing applied)', async () => {
  const s = inMemoryStore({ removal_requests: { r1: { status: 'pending' } } });
  s.failUpdate('removal_requests', 'r1');
  const result = await moderate(s.store, {
    resolve: { collection: 'removal_requests', id: 'r1', status: 'rejected' },
    audit: { action: 'reject', moderator: 'mod@x', collection: 'removal_requests', record: 'r1' }
  });
  assert.equal(result.ok, false);
  assert.equal(s.logs.length, 0);
});

test('audit is best-effort: a failing log never reverts an applied decision', async () => {
  const s = inMemoryStore({ patients_public: { p1: { status: 'pending' } } });
  s.failLog();
  const result = await moderate(s.store, {
    resolve: { collection: 'patients_public', id: 'p1', status: 'archived' },
    audit: { action: 'archive', moderator: 'mod@x', collection: 'patients_public', record: 'p1' }
  });
  assert.equal(result.ok, true);
  assert.equal(s.records.patients_public.p1.status, 'archived');
});
