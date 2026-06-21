/**
 * IndexedDB cache for offline reads. Fire-and-forget writes after successful
 * GET responses; reads are used when the network is unavailable.
 */
import { openDB } from 'idb';

const DB_NAME = 'aura-offline';
const STORE = 'cache';
const MAX_ENTRIES = 8;
const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const ALLOWED_KEYS = new Set([
  'user',
  'partner',
  'memories',
  'albums',
  'settings',
  'events',
  'unreadCount',
  'chatMessages',
]);

let _dbPromise;

function getDb() {
  if (!_dbPromise) {
    _dbPromise = openDB(DB_NAME, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE);
        }
      },
    });
  }
  return _dbPromise;
}

export function isAppOffline() {
  if (typeof window !== 'undefined' && typeof window.auraIsOnline === 'function') {
    return !window.auraIsOnline();
  }
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

/** @param {string} key @param {unknown} value */
export function putCache(key, value) {
  if (!ALLOWED_KEYS.has(key)) return;
  void (async () => {
    try {
      const db = await getDb();
      await db.put(STORE, { value, savedAt: Date.now() }, key);
      await _evictIfNeeded(db);
    } catch (e) {
      console.warn('[offlineCache] put failed', key, e);
    }
  })();
}

/** @param {string} key */
export async function getCache(key) {
  if (!ALLOWED_KEYS.has(key)) return undefined;
  try {
    const db = await getDb();
    const row = await db.get(STORE, key);
    if (!row) return undefined;
    if (Date.now() - row.savedAt > TTL_MS) {
      await db.delete(STORE, key);
      return undefined;
    }
    return row.value;
  } catch (e) {
    console.warn('[offlineCache] get failed', key, e);
    return undefined;
  }
}

async function _evictIfNeeded(db) {
  const keys = await db.getAllKeys(STORE);
  if (keys.length <= MAX_ENTRIES) return;
  const entries = await Promise.all(
    keys.map(async (k) => ({ key: k, row: await db.get(STORE, k) })),
  );
  entries.sort((a, b) => (a.row?.savedAt ?? 0) - (b.row?.savedAt ?? 0));
  const toRemove = entries.length - MAX_ENTRIES;
  for (let i = 0; i < toRemove; i++) {
    await db.delete(STORE, entries[i].key);
  }
}

export default { putCache, getCache, isAppOffline };
