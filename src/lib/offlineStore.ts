import type { BookmarkEntry, Manual, ReaderTheme, UnlockReceipt } from '../types/folio';

const DB_NAME = 'folio_offline_vault_v1';
const STORE_MANUALS = 'encrypted_manuals';
const LS_UNLOCKS = 'folio_unlocks_v1';
const LS_BOOKMARKS = 'folio_bookmarks_v1';
const LS_READER_PREFS = 'folio_reader_prefs_v1';
const LS_DEVICE_KEY = 'folio_sandbox_key_v1';

export interface ReaderPreferences {
  theme: ReaderTheme;
  fontSizeStep: number; // 0..3 -> 16, 18, 20, 22
}

interface EncryptedVaultRecord {
  id: string;
  iv: number[];
  cipher: number[];
  savedAt: string;
}

function openVaultDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_MANUALS)) {
        db.createObjectStore(STORE_MANUALS, { keyPath: 'id' });
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

export async function saveManualToOfflineVault(manual: Manual): Promise<void> {
  const db = await openVaultDb();
  const payload = JSON.stringify(manual);
  const key = await getOrCreateSandboxKey();

  let record: EncryptedVaultRecord | { id: string; plain: string; savedAt: string };

  if (key) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(payload);
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
    record = {
      id: manual.id,
      iv: Array.from(iv),
      cipher: Array.from(new Uint8Array(encrypted)),
      savedAt: new Date().toISOString(),
    };
  } else {
    record = {
      id: manual.id,
      plain: payload,
      savedAt: new Date().toISOString(),
    };
  }

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_MANUALS, 'readwrite');
    tx.objectStore(STORE_MANUALS).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadOfflineVaultManuals(): Promise<Manual[]> {
  try {
    const db = await openVaultDb();
    const key = await getOrCreateSandboxKey();

    const rows = await new Promise<Array<Record<string, unknown>>>((resolve, reject) => {
      const tx = db.transaction(STORE_MANUALS, 'readonly');
      const req = tx.objectStore(STORE_MANUALS).getAll();
      req.onsuccess = () => resolve(req.result as Array<Record<string, unknown>>);
      req.onerror = () => reject(req.error);
    });

    const manuals: Manual[] = [];
    for (const row of rows) {
      try {
        if (typeof row.plain === 'string') {
          manuals.push(JSON.parse(row.plain) as Manual);
        } else if (key && Array.isArray(row.iv) && Array.isArray(row.cipher)) {
          const decrypted = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: new Uint8Array(row.iv as number[]) },
            key,
            new Uint8Array(row.cipher as number[])
          );
          const json = new TextDecoder().decode(decrypted);
          manuals.push(JSON.parse(json) as Manual);
        }
      } catch {
        // skip corrupted or key-mismatched entry
      }
    }
    return manuals;
  } catch {
    return [];
  }
}

export async function deleteManualFromOfflineVault(manualId: string): Promise<void> {
  try {
    const db = await openVaultDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_MANUALS, 'readwrite');
      tx.objectStore(STORE_MANUALS).delete(manualId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // ignore
  }
}

export function loadUnlockReceipts(): Record<string, UnlockReceipt> {
  try {
    const raw = localStorage.getItem(LS_UNLOCKS);
    return raw ? (JSON.parse(raw) as Record<string, UnlockReceipt>) : {};
  } catch {
    return {};
  }
}

export function saveUnlockReceipt(receipt: UnlockReceipt): Record<string, UnlockReceipt> {
  const current = loadUnlockReceipts();
  const next = { ...current, [receipt.manualId]: receipt };
  localStorage.setItem(LS_UNLOCKS, JSON.stringify(next));
  return next;
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
    (b) => b.manualId === entry.manualId && b.chapterId === entry.chapterId
  );
  const next = exists
    ? current.filter((b) => !(b.manualId === entry.manualId && b.chapterId === entry.chapterId))
    : [entry, ...current];
  localStorage.setItem(LS_BOOKMARKS, JSON.stringify(next));
  return next;
}

export function loadReaderPreferences(): ReaderPreferences {
  try {
    const raw = localStorage.getItem(LS_READER_PREFS);
    if (raw) {
      return JSON.parse(raw) as ReaderPreferences;
    }
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
