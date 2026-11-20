import type {
  AdminCurriculumOverview,
  AdminDashboardStats,
  AdminTopicDraft,
  AuthSessionState,
  PaymentOperator,
  PreviewCurriculumInfo,
  SchoolCycle,
  TopicSearchItem,
  UnlockedCurriculum,
  UnlockReceipt,
} from '../types/folio';

const LS_TOKEN = 'folio_session_token_v1';

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(LS_TOKEN);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(LS_TOKEN, token);
    else localStorage.removeItem(LS_TOKEN);
  } catch {
    // ignore storage errors
  }
}

function authHeaders(extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = { ...(extra || {}) };
  const token = getStoredToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

async function parseJsonSafe<T>(res: Response): Promise<T & { error?: string; code?: string }> {
  try {
    return (await res.json()) as T & { error?: string; code?: string };
  } catch {
    return { error: `Erro de comunicação (${res.status})` } as T & { error?: string; code?: string };
  }
}

export interface MySubjectOverview {
  id: string;
  subject: string;
  grade: string;
  gradeNumber: number;
  cycle: Exclude<SchoolCycle, 'all'>;
  totalPages: number;
  priceMt: number;
  paymentProvider: PaymentOperator;
  transactionRef: string;
  unlockedAt: string;
  topics: Array<{ id: string; title: string; pageNumber: number }>;
}

// ============================================================================
// PUBLIC DISCOVERY (Lightweight 3G/4G endpoints — NO login required)
// ============================================================================
export async function fetchTopics(
  query: string,
  cycle: SchoolCycle
): Promise<{ topics: TopicSearchItem[]; totalCurricula: number }> {
  const params = new URLSearchParams();
  if (query.trim()) params.set('q', query.trim());
  if (cycle !== 'all') params.set('cycle', cycle);

  const res = await fetch(`/api/topics?${params.toString()}`, {
    headers: authHeaders(),
    signal: AbortSignal.timeout(8000),
  });
  const data = await parseJsonSafe<{ topics?: TopicSearchItem[]; totalCurricula?: number }>(res);
  if (!res.ok) throw new Error(data.error || 'Não foi possível pesquisar matérias.');
  return {
    topics: data.topics ?? [],
    totalCurricula: data.totalCurricula ?? 0,
  };
}

export async function fetchCurriculumPreview(curriculumId: string): Promise<PreviewCurriculumInfo | null> {
  try {
    const res = await fetch(`/api/curricula/${encodeURIComponent(curriculumId)}/preview`, {
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    const data = await parseJsonSafe<{ curriculum?: PreviewCurriculumInfo }>(res);
    return data.curriculum ?? null;
  } catch {
    return null;
  }
}

// ============================================================================
// NATIVE AUTHENTICATION (CockroachDB + Bcrypt + 2-Device Limit)
// ============================================================================
export async function registerAccount(email: string, password: string): Promise<AuthSessionState> {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    signal: AbortSignal.timeout(10000),
  });
  const data = await parseJsonSafe<AuthSessionState>(res);
  if (!res.ok || !data.token) {
    throw new Error(data.error || 'Não foi possível criar a conta.');
  }
  setStoredToken(data.token);
  return data;
}

export async function loginAccount(email: string, password: string): Promise<AuthSessionState> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    signal: AbortSignal.timeout(10000),
  });
  const data = await parseJsonSafe<AuthSessionState>(res);
  if (!res.ok || !data.token) {
    throw new Error(data.error || 'E-mail ou senha incorretos.');
  }
  setStoredToken(data.token);
  return data;
}

export async function fetchCurrentSession(): Promise<AuthSessionState | null> {
  const token = getStoredToken();
  if (!token) return null;
  try {
    const res = await fetch('/api/auth/me', {
      headers: authHeaders(),
      signal: AbortSignal.timeout(6000),
    });
    if (res.status === 401) {
      setStoredToken(null);
      return null;
    }
    if (!res.ok) return null;
    const data = await parseJsonSafe<Omit<AuthSessionState, 'token'>>(res);
    if (!data.user) return null;
    return { ...data, token };
  } catch {
    return null;
  }
}

export async function logoutAccount(): Promise<void> {
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: authHeaders(),
      signal: AbortSignal.timeout(4000),
    });
  } catch {
    // ignore network error on logout
  } finally {
    setStoredToken(null);
  }
}

// ============================================================================
// STUDENT UNLOCK & PROTECTED FULL CONTENT
// ============================================================================
export async function unlockCurriculum(
  curriculumId: string,
  provider: PaymentOperator,
  phone: string
): Promise<{ receipt: UnlockReceipt; alreadyUnlocked?: boolean }> {
  const res = await fetch('/api/unlocks', {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ curriculumId, provider, phone }),
    signal: AbortSignal.timeout(12000),
  });
  const data = await parseJsonSafe<{ receipt?: UnlockReceipt; alreadyUnlocked?: boolean }>(res);
  if (!res.ok || !data.receipt) {
    throw new Error(data.error || 'Não foi possível concluir o pagamento.');
  }
  return { receipt: data.receipt, alreadyUnlocked: data.alreadyUnlocked };
}

export async function fetchMySubjects(): Promise<MySubjectOverview[]> {
  const res = await fetch('/api/my-subjects', {
    headers: authHeaders(),
    signal: AbortSignal.timeout(8000),
  });
  const data = await parseJsonSafe<{ subjects?: MySubjectOverview[] }>(res);
  if (!res.ok) {
    throw new Error(data.error || 'Não foi possível carregar as tuas matérias.');
  }
  return data.subjects ?? [];
}

export async function fetchProtectedCurriculumContent(
  curriculumId: string
): Promise<UnlockedCurriculum> {
  const res = await fetch(`/api/curricula/${encodeURIComponent(curriculumId)}/content`, {
    headers: authHeaders(),
    signal: AbortSignal.timeout(12000),
  });
  const data = await parseJsonSafe<{ curriculum?: UnlockedCurriculum }>(res);
  if (!res.ok || !data.curriculum) {
    throw new Error(data.error || 'Sem acesso a este conteúdo curricular.');
  }
  return data.curriculum;
}

// ============================================================================
// ADMIN PANEL ENDPOINTS (Server validates role === 'admin')
// ============================================================================
export async function fetchAdminDashboard(): Promise<{
  curricula: AdminCurriculumOverview[];
  stats: AdminDashboardStats;
}> {
  const res = await fetch('/api/admin/curricula', {
    headers: authHeaders(),
    signal: AbortSignal.timeout(10000),
  });
  const data = await parseJsonSafe<{
    curricula?: AdminCurriculumOverview[];
    stats?: AdminDashboardStats;
  }>(res);
  if (!res.ok || !data.stats) {
    throw new Error(data.error || 'Acesso administrativo negado.');
  }
  return {
    curricula: data.curricula ?? [],
    stats: data.stats,
  };
}

export async function publishAdminCurriculum(payload: {
  gradeNumber: number;
  subject: string;
  totalPages: number;
  topics: AdminTopicDraft[];
}): Promise<{
  published: boolean;
  curriculumId: string;
  subject: string;
  grade: string;
  topicsCount: number;
  groqEnrichedCount: number;
  groqModel?: string | null;
  warnings?: string[];
}> {
  const res = await fetch('/api/admin/curricula', {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(90000),
  });
  const data = await parseJsonSafe<{
    published: boolean;
    curriculumId: string;
    subject: string;
    grade: string;
    topicsCount: number;
    groqEnrichedCount: number;
    groqModel?: string | null;
    warnings?: string[];
  }>(res);
  if (!res.ok || !data.published) {
    throw new Error(data.error || 'Erro ao publicar matéria curricular.');
  }
  return data;
}

export async function reEnrichAdminCurriculum(curriculumId: string): Promise<{
  enrichedCount: number;
  totalCount: number;
  modelUsed?: string | null;
}> {
  const res = await fetch(`/api/admin/curricula/${encodeURIComponent(curriculumId)}/enrich`, {
    method: 'POST',
    headers: authHeaders(),
    signal: AbortSignal.timeout(90000),
  });
  const data = await parseJsonSafe<{
    enrichedCount: number;
    totalCount: number;
    modelUsed?: string | null;
  }>(res);
  if (!res.ok) {
    throw new Error(data.error || 'Erro ao reprocessar resumos com Groq.');
  }
  return data;
}

export async function deleteAdminCurriculum(curriculumId: string): Promise<void> {
  const res = await fetch(`/api/admin/curricula/${encodeURIComponent(curriculumId)}`, {
    method: 'DELETE',
    headers: authHeaders(),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) {
    const data = await parseJsonSafe<Record<string, unknown>>(res);
    throw new Error(data.error || 'Erro ao remover matéria.');
  }
}
