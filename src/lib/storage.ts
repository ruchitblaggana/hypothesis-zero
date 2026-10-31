// IndexedDB persistence for Hypothesis Zero
// Stores datasets, investigations, claims, counterexamples, and settings

import type { DatasetRecord, InvestigationRecord, ClaimRecord, CounterexampleRecord } from './types';
import { buildBuiltinDatasets, buildGuidedInvestigations } from './datasets';

const DB_NAME = 'hypothesis-zero';
const DB_VERSION = 1;

const STORES = {
  datasets: 'datasets',
  investigations: 'investigations',
  claims: 'claims',
  counterexamples: 'counterexamples',
  settings: 'settings',
} as const;

let dbInstance: IDBDatabase | null = null;
let initPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);
  if (initPromise) return initPromise;

  initPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available in this browser.'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORES.datasets)) {
        db.createObjectStore(STORES.datasets, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.investigations)) {
        db.createObjectStore(STORES.investigations, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.claims)) {
        db.createObjectStore(STORES.claims, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.counterexamples)) {
        db.createObjectStore(STORES.counterexamples, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.settings)) {
        db.createObjectStore(STORES.settings, { keyPath: 'key' });
      }
    };
    req.onsuccess = () => {
      dbInstance = req.result;
      resolve(dbInstance);
    };
    req.onerror = () => reject(req.error);
  });
  return initPromise;
}

function tx<T>(
  store: string,
  mode: IDBTransactionMode,
  fn: (s: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return openDB().then(db => new Promise<T>((resolve, reject) => {
    const t = db.transaction(store, mode);
    const s = t.objectStore(store);
    const req = fn(s);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }));
}

// ── Datasets ──────────────────────────────────────────────────────────────

export async function getAllDatasets(): Promise<DatasetRecord[]> {
  const all = await tx<DatasetRecord[]>(STORES.datasets, 'readonly', s => s.getAll());
  // Always include builtins
  const builtins = buildBuiltinDatasets();
  const builtinIds = new Set(builtins.map(b => b.id));
  const userDatasets = all.filter(d => !builtinIds.has(d.id));
  return [...builtins, ...userDatasets];
}

export async function getDataset(id: string): Promise<DatasetRecord | undefined> {
  const builtins = buildBuiltinDatasets();
  const builtin = builtins.find(b => b.id === id);
  if (builtin) return builtin;
  return tx<DatasetRecord | undefined>(STORES.datasets, 'readonly', s => s.get(id));
}

export async function saveDataset(ds: DatasetRecord): Promise<void> {
  await tx(STORES.datasets, 'readwrite', s => s.put(ds));
}

export async function deleteDataset(id: string): Promise<void> {
  // Don't delete builtins
  const builtins = buildBuiltinDatasets();
  if (builtins.some(b => b.id === id)) return;
  await tx(STORES.datasets, 'readwrite', s => s.delete(id));
}

// ── Investigations ────────────────────────────────────────────────────────

export async function getAllInvestigations(): Promise<InvestigationRecord[]> {
  const stored = await tx<InvestigationRecord[]>(STORES.investigations, 'readonly', s => s.getAll());
  // Include guided if not already saved/customized
  const guided = buildGuidedInvestigations();
  const guidedIds = new Set(guided.map(g => g.id));
  const userInvestigations = stored.filter(i => !guidedIds.has(i.id));
  // For guided investigations, use stored version if it exists (user may have edited it)
  const storedGuided = stored.filter(i => guidedIds.has(i.id));
  const guidedMap = new Map(storedGuided.map(g => [g.id, g]));
  const mergedGuided = guided.map(g => guidedMap.get(g.id) || g);
  return [...mergedGuided, ...userInvestigations];
}

export async function getInvestigation(id: string): Promise<InvestigationRecord | undefined> {
  const guided = buildGuidedInvestigations();
  const g = guided.find(g => g.id === id);
  const stored = await tx<InvestigationRecord | undefined>(STORES.investigations, 'readonly', s => s.get(id));
  return stored || g;
}

export async function saveInvestigation(inv: InvestigationRecord): Promise<void> {
  await tx(STORES.investigations, 'readwrite', s => s.put(inv));
}

export async function deleteInvestigation(id: string): Promise<void> {
  const guided = buildGuidedInvestigations();
  if (guided.some(g => g.id === id)) {
    // Reset guided investigation by deleting stored version
    await tx(STORES.investigations, 'readwrite', s => s.delete(id));
  } else {
    await tx(STORES.investigations, 'readwrite', s => s.delete(id));
  }
}

// ── Claims ────────────────────────────────────────────────────────────────

export async function getAllClaims(): Promise<ClaimRecord[]> {
  return tx<ClaimRecord[]>(STORES.claims, 'readonly', s => s.getAll());
}

export async function saveClaim(c: ClaimRecord): Promise<void> {
  await tx(STORES.claims, 'readwrite', s => s.put(c));
}

export async function deleteClaim(id: string): Promise<void> {
  await tx(STORES.claims, 'readwrite', s => s.delete(id));
}

// ── Counterexamples ───────────────────────────────────────────────────────

export async function getAllCounterexamples(): Promise<CounterexampleRecord[]> {
  return tx<CounterexampleRecord[]>(STORES.counterexamples, 'readonly', s => s.getAll());
}

export async function saveCounterexample(c: CounterexampleRecord): Promise<void> {
  await tx(STORES.counterexamples, 'readwrite', s => s.put(c));
}

export async function deleteCounterexample(id: string): Promise<void> {
  await tx(STORES.counterexamples, 'readwrite', s => s.delete(id));
}

// ── Settings ──────────────────────────────────────────────────────────────

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const result = await tx<{ key: string; value: T } | undefined>(STORES.settings, 'readonly', s => s.get(key));
  return result?.value ?? fallback;
}

export async function setSetting<T>(key: string, value: T): Promise<void> {
  await tx(STORES.settings, 'readwrite', s => s.put({ key, value }));
}

// ── Reset ─────────────────────────────────────────────────────────────────

export async function resetAllData(): Promise<void> {
  const db = await openDB();
  for (const storeName of Object.values(STORES)) {
    await new Promise<void>((resolve, reject) => {
      const t = db.transaction(storeName, 'readwrite');
      t.objectStore(storeName).clear();
      t.oncomplete = () => resolve();
      t.onerror = () => reject(t.error);
    });
  }
}

// ── ID generation ─────────────────────────────────────────────────────────

export function genId(prefix = ''): string {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// ── Availability check ────────────────────────────────────────────────────

export function isIndexedDBAvailable(): boolean {
  return typeof indexedDB !== 'undefined';
}
