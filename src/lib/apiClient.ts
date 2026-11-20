import type { Manual, PaymentOperator } from '../types/folio';

export interface BackendHealth {
  online: boolean;
  dbConnected: boolean;
  engine?: string;
  groqEnabled?: boolean;
  groqModel?: string;
}

export interface CloudEnrichResponse {
  manual: Manual;
  enrichedChapters: number;
  totalChapters: number;
  modelUsed: string | null;
  warnings?: string[];
}

export async function checkBackendHealth(): Promise<BackendHealth> {
  try {
    const res = await fetch('/api/health', { signal: AbortSignal.timeout(3500) });
    if (!res.ok) return { online: false, dbConnected: false, groqEnabled: false };
    const data = (await res.json()) as {
      dbConnected?: boolean;
      engine?: string;
      groqEnabled?: boolean;
      groqModel?: string;
    };
    return {
      online: true,
      dbConnected: Boolean(data.dbConnected),
      engine: data.engine,
      groqEnabled: Boolean(data.groqEnabled),
      groqModel: data.groqModel,
    };
  } catch {
    return { online: false, dbConnected: false, groqEnabled: false };
  }
}

export async function enrichManualWithCloudAI(manual: Manual): Promise<CloudEnrichResponse | null> {
  try {
    const res = await fetch('/api/ai/enrich-manual', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(manual),
      signal: AbortSignal.timeout(90000),
    });
    if (!res.ok) return null;
    return (await res.json()) as CloudEnrichResponse;
  } catch {
    return null;
  }
}

export async function reEnrichManualInCloud(manualId: string): Promise<CloudEnrichResponse | null> {
  try {
    const res = await fetch(`/api/manuals/${encodeURIComponent(manualId)}/enrich`, {
      method: 'POST',
      signal: AbortSignal.timeout(90000),
    });
    if (!res.ok) return null;
    return (await res.json()) as CloudEnrichResponse;
  } catch {
    return null;
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
