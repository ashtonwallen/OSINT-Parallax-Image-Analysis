import type { ChatMessage } from './conversation';
import type { Analysis, Evidence, Point, ShadowResult } from './schema';
export type InvestigationRecord = {
  chat?: ChatMessage[];
  id: string;
  updatedAt: number;
  evidence: Omit<Evidence, 'url'>;
  analysis: Analysis | null;
  analysisSource: 'demo' | 'ai' | null;
  shadow: ShadowResult | null;
  points: Point[];
  notes: string;
  searches: string[];
};
export type HistoryEntry = { id: string; name: string; updatedAt: number; observations: number };
function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('parallax-investigations', 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore('investigations', { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function transaction<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('investigations', mode);
    const request = operation(tx.objectStore('investigations'));
    tx.oncomplete = () => {
      db.close();
      resolve(request.result);
    };
    tx.onerror = tx.onabort = () => {
      db.close();
      reject(tx.error || request.error);
    };
  });
}
export const saveInvestigation = (record: InvestigationRecord) =>
  transaction('readwrite', (store) => store.put(record));
export const readInvestigation = (id: string): Promise<InvestigationRecord | undefined> =>
  transaction('readonly', (store) => store.get(id));
export const removeInvestigation = (id: string) =>
  transaction('readwrite', (store) => store.delete(id));
export async function listInvestigations(): Promise<HistoryEntry[]> {
  const records: InvestigationRecord[] = await transaction('readonly', (store) => store.getAll());
  return records
    .map((record) => ({
      id: record.id,
      name: record.evidence.name,
      updatedAt: record.updatedAt,
      observations: record.analysis?.clues.length || 0,
    }))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}
