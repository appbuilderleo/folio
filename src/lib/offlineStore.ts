import type { BookmarkEntry, ReaderTheme, UnlockedCurriculum } from '../types/folio';

const DB_NAME = 'folio_offline_vault_v2';
const STORE_CURRICULA = 'encrypted_curricula';
const LS_BOOKMARKS = 'folio_bookmarks_v2';
const LS_READER_PREFS = 'folio_reader_prefs_v1';
const LS_DEVICE_KEY = 'folio_sandbox_key_v2';

export interface ReaderPreferences {
  theme: ReaderTheme;
  fontSizeStep: number; // 0..3 -> 16, 18, 20, 22
}

interface EncryptedRecord {
  vaultKey: string; // `${userId}:${curriculumId}`
  userId: string;
  curriculumId: string;
  iv?: number[];
  cipher?: number[];
  plain?: string;
  savedAt: string;
}

function openVaultDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_CURRICULA)) {
        db.createObjectStore(STORE_CURRICULA, { keyPath: 'vaultKey' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getOrCreateSandboxKey(): Promise<CryptoKey | null> {
  if (typeof crypto === 'undefined' || !crypto.subtle) return null;
  try {
    let rawHex = localStorage.getItem(LS_DEVICE_KEY);
    let rawBytes: Uint8Array;
    if (!rawHex) {
      rawBytes = crypto.getRandomValues(new Uint8Array(32));
      rawHex = Array.from(rawBytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
      localStorage.setItem(LS_DEVICE_KEY, rawHex);
    } else {
      rawBytes = new Uint8Array(
        rawHex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
      );
    }
    return await crypto.subtle.importKey(
      'raw',
      rawBytes.buffer as ArrayBuffer,
      { name: 'AES-GCM' },
      false,
      ['encrypt', 'decrypt']
    );
  } catch {
    return null;
  }
}

export async function saveCurriculumToOfflineVault(
  userId: string,
  curriculum: UnlockedCurriculum
): Promise<void> {
  try {
    const db = await openVaultDb();
    const payload = JSON.stringify(curriculum);
    const key = await getOrCreateSandboxKey();
    const vaultKey = `${userId}:${curriculum.id}`;

    let record: EncryptedRecord;
    if (key) {
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encoded = new TextEncoder().encode(payload);
      const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
      record = {
        vaultKey,
        userId,
        curriculumId: curriculum.id,
        iv: Array.from(iv),
        cipher: Array.from(new Uint8Array(encrypted)),
        savedAt: new Date().toISOString(),
      };
    } else {
      record = {
        vaultKey,
        userId,
        curriculumId: curriculum.id,
        plain: payload,
        savedAt: new Date().toISOString(),
      };
    }

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_CURRICULA, 'readwrite');
      tx.objectStore(STORE_CURRICULA).put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // ignore IndexedDB quota/private-mode errors gracefully
  }
}

export async function loadCurriculumFromOfflineVault(
  userId: string,
  curriculumId: string
): Promise<UnlockedCurriculum | null> {
  try {
    const db = await openVaultDb();
    const key = await getOrCreateSandboxKey();
    const vaultKey = `${userId}:${curriculumId}`;

    const row = await new Promise<EncryptedRecord | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE_CURRICULA, 'readonly');
      const req = tx.objectStore(STORE_CURRICULA).get(vaultKey);
      req.onsuccess = () => resolve(req.result as EncryptedRecord | undefined);
      req.onerror = () => reject(req.error);
    });

    if (!row) return null;
    if (typeof row.plain === 'string') {
      return JSON.parse(row.plain) as UnlockedCurriculum;
    }
    if (key && Array.isArray(row.iv) && Array.isArray(row.cipher)) {
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: new Uint8Array(row.iv) },
        key,
        new Uint8Array(row.cipher)
      );
      return JSON.parse(new TextDecoder().decode(decrypted)) as UnlockedCurriculum;
    }
    return null;
  } catch {
    return null;
  }
}

export async function loadAllOfflineCurriculaForUser(
  userId: string
): Promise<UnlockedCurriculum[]> {
  try {
    const db = await openVaultDb();
    const key = await getOrCreateSandboxKey();

    const rows = await new Promise<EncryptedRecord[]>((resolve, reject) => {
      const tx = db.transaction(STORE_CURRICULA, 'readonly');
      const req = tx.objectStore(STORE_CURRICULA).getAll();
      req.onsuccess = () => resolve((req.result as EncryptedRecord[]) || []);
      req.onerror = () => reject(req.error);
    });

    const out: UnlockedCurriculum[] = [];
    for (const row of rows) {
      if (row.userId !== userId) continue;
      try {
        if (typeof row.plain === 'string') {
          out.push(JSON.parse(row.plain) as UnlockedCurriculum);
        } else if (key && Array.isArray(row.iv) && Array.isArray(row.cipher)) {
          const decrypted = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: new Uint8Array(row.iv) },
            key,
            new Uint8Array(row.cipher)
          );
          out.push(JSON.parse(new TextDecoder().decode(decrypted)) as UnlockedCurriculum);
        }
      } catch {
        // skip corrupted item
      }
    }
    return out;
  } catch {
    return [];
  }
}

export async function clearOfflineVaultForUser(userId: string): Promise<void> {
  try {
    const db = await openVaultDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_CURRICULA, 'readwrite');
      const store = tx.objectStore(STORE_CURRICULA);
      const req = store.getAll();
      req.onsuccess = () => {
        const rows = (req.result as EncryptedRecord[]) || [];
        for (const row of rows) {
          if (row.userId === userId) {
            store.delete(row.vaultKey);
          }
        }
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // ignore cleanup errors
  }
}

export function loadBookmarks(): BookmarkEntry[] {
  try {
    const raw = localStorage.getItem(LS_BOOKMARKS);
    return raw ? (JSON.parse(raw) as BookmarkEntry[]) : [];
  } catch {
    return [];
  }
}

export function toggleBookmarkEntry(entry: BookmarkEntry): BookmarkEntry[] {
  const current = loadBookmarks();
  const exists = current.some(
    (b) => b.curriculumId === entry.curriculumId && b.topicId === entry.topicId
  );
  const next = exists
    ? current.filter((b) => !(b.curriculumId === entry.curriculumId && b.topicId === entry.topicId))
    : [entry, ...current];
  localStorage.setItem(LS_BOOKMARKS, JSON.stringify(next));
  return next;
}

export function loadReaderPreferences(): ReaderPreferences {
  try {
    const raw = localStorage.getItem(LS_READER_PREFS);
    if (raw) return JSON.parse(raw) as ReaderPreferences;
  } catch {
    // ignore
  }
  return { theme: 'paper', fontSizeStep: 1 };
}

export function saveReaderPreferences(prefs: ReaderPreferences): void {
  try {
    localStorage.setItem(LS_READER_PREFS, JSON.stringify(prefs));
  } catch {
    // ignore
  }
}
