import { createIndexedDBStore } from './idb-helper';
import type { TickStatus } from '@/app/hooks/use-logbook';

const STORE_NAME = 'tick-drafts';

export interface TickDraft {
  climbUuid: string;
  quality: number | null;
  difficulty: number | undefined;
  attemptCount: number;
  comment: string;
  status: TickStatus;
}

const getDB = createIndexedDBStore('boardsesh-tick-drafts', STORE_NAME);

export async function saveTickDraft(draft: TickDraft): Promise<void> {
  try {
    const db = await getDB();
    if (!db) return;
    await db.put(STORE_NAME, draft, draft.climbUuid);
  } catch {
    // Best-effort — don't block the UI
  }
}

export async function loadTickDraft(climbUuid: string): Promise<TickDraft | null> {
  try {
    const db = await getDB();
    if (!db) return null;
    const data = (await db.get(STORE_NAME, climbUuid)) as TickDraft | undefined;
    return data ?? null;
  } catch {
    return null;
  }
}

export async function clearTickDraft(climbUuid: string): Promise<void> {
  try {
    const db = await getDB();
    if (!db) return;
    await db.delete(STORE_NAME, climbUuid);
  } catch {
    // Silently ignore
  }
}
