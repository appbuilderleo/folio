import type { Manual, PaymentOperator } from '../types/folio';

export interface BackendHealth {
  online: boolean;
  dbConnected: boolean;
  engine?: string;
}

export async function checkBackendHealth(): Promise<BackendHealth> {
  try {
    const res = await fetch('/api/health', { signal: AbortSignal.timeout(3500) });
    if (!res.ok) return { online: false, dbConnected: false };
    const data = (await res.json()) as { dbConnected?: boolean; engine?: string };
    return {
      online: true,
      dbConnected: Boolean(data.dbConnected),
      engine: data.engine,
    };
  } catch {
    return { online: false, dbConnected: false };
  }
}

export async function fetchManualsFromCloud(): Promise<Manual[] | null> {
  try {
    const res = await fetch('/api/manuals', { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const data = (await res.json()) as { manuals?: Manual[] };
    return Array.isArray(data.manuals) ? data.manuals : null;
  } catch {
    return null;
  }
}

export async function saveManualToCloud(manual: Manual): Promise<boolean> {
  try {
    const res = await fetch('/api/manuals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(manual),
      signal: AbortSignal.timeout(12000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function deleteManualFromCloud(manualId: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/manuals/${encodeURIComponent(manualId)}`, {
      method: 'DELETE',
      signal: AbortSignal.timeout(6000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function recordUnlockInCloud(payload: {
  manualId: string;
  operator: PaymentOperator;
  phone: string;
  amountMt: number;
  reference: string;
}): Promise<boolean> {
  try {
    const res = await fetch('/api/unlocks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
