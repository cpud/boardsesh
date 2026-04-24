/**
 * Per-worker database helper.
 *
 * When vitest runs test files in parallel, each file lands in a worker process
 * identified by VITEST_POOL_ID. Each worker gets its own database cloned from
 * the template `boardsesh_backend_test` built in globalSetup. That way TRUNCATE
 * in one file can't stomp on data another file is mid-way through inserting.
 */

import postgres from 'postgres';
import { schemaSQL } from './schema-sql';

const PG_PORT = 5433;
const TEMPLATE_DB = 'boardsesh_backend_test';

function getBaseConnection(): string {
  const raw = process.env.DATABASE_URL || `postgresql://postgres:postgres@localhost:${PG_PORT}/${TEMPLATE_DB}`;
  return raw.replace(/\/[^/]+$/, '/postgres');
}

export function getWorkerDatabaseName(): string {
  const id = process.env.VITEST_POOL_ID || '0';
  // fileParallelism=false still spawns one worker with id=0; we still get our own DB copy.
  return `${TEMPLATE_DB}_w${id}`;
}

function buildWorkerDatabaseUrl(): string {
  const name = getWorkerDatabaseName();
  const raw = process.env.DATABASE_URL || `postgresql://postgres:postgres@localhost:${PG_PORT}/${TEMPLATE_DB}`;
  return raw.replace(/\/[^/]+$/, `/${name}`);
}

// Module-load side effect: redirect DATABASE_URL to the worker's dedicated DB
// BEFORE any ESM import can materialise `db/client`'s cached connection against
// the template DB. Import worker-db.ts first in setupFiles.
if (!process.env.__BOARDSESH_WORKER_DB_INITIALIZED__) {
  process.env.DATABASE_URL = buildWorkerDatabaseUrl();
  process.env.__BOARDSESH_WORKER_DB_INITIALIZED__ = '1';
}

export function getWorkerDatabaseUrl(): string {
  return buildWorkerDatabaseUrl();
}

let setupPromise: Promise<void> | null = null;

export function setupWorkerDatabase(): Promise<void> {
  if (!setupPromise) {
    setupPromise = doSetup();
  }
  return setupPromise;
}

async function doSetup(): Promise<void> {
  const dbName = getWorkerDatabaseName();
  const admin = postgres(getBaseConnection(), { max: 1, onnotice: () => {} });
  try {
    const [row] = await admin`SELECT 1 FROM pg_database WHERE datname = ${dbName}`;
    if (!row) {
      // Fresh DB: create + apply schema. We don't use CREATE DATABASE ... TEMPLATE
      // because the template can't have any open connections, and running tests
      // may hold one. Applying the DDL directly is cheap (~100–300ms).
      await admin.unsafe(`CREATE DATABASE "${dbName}"`);
    }
  } finally {
    await admin.end().catch(() => {});
  }

  const workerClient = postgres(getWorkerDatabaseUrl(), { max: 1, onnotice: () => {} });
  try {
    await workerClient.unsafe(schemaSQL);
  } finally {
    await workerClient.end().catch(() => {});
  }
}
