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

type SessionRevokedListener = (reason: string) => void;
const revokedListeners = new Set<SessionRevokedListener>();

const DEFAULT_REVOKED_MSG =
  'A tua sessão foi encerrada automaticamente porque iniciaste sessão noutro dispositivo.';

export function subscribeSessionRevoked(listener: SessionRevokedListener): () => void {
  revokedListeners.add(listener);
  return () => {
    revokedListeners.delete(listener);
  };
}

function notifySessionRevoked(reason = DEFAULT_REVOKED_MSG): void {
  setStoredToken(null);
  for (const listener of revokedListeners) {
    listener(reason);
  }
}

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

function isTimeoutError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const name = (err as { name?: string }).name || '';
  const msg = (err as { message?: string }).message || '';
  return name === 'TimeoutError' || name === 'AbortError' || /timed?\s*out/i.test(msg);
}

/**
 * Resilient fetch optimized for slower mobile/3G/4G links & CockroachDB cold starts:
 * generous timeout, optional silent retry on GET reads, and clean Portuguese error messages.
 */
async function resilientFetch(
  input: string,
  init: RequestInit,
  timeoutMs: number,
  retries = 0
): Promise<Response> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fetch(input, {
        ...init,
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (err) {
      lastErr = err;
      if (attempt < retries && isTimeoutError(err)) {
        await new Promise((r) => setTimeout(r, 450));
        continue;
      }
      break;
    }
  }

  if (isTimeoutError(lastErr)) {
    throw new Error(
      'A ligação demorou mais do que o esperado (rede lenta). Tenta novamente.'
    );
  }
  throw new Error('Sem ligação ao servidor neste momento. Verifica a internet e tenta novamente.');
}

export function humanizeHttpStatusMessage(status: number): string {
  switch (status) {
    case 400:
      return 'Dados do pedido inválidos ou incompletos (400).';
    case 401:
      return 'E-mail ou senha incorretos.';
    case 403:
      return 'Acesso não autorizado para esta conta (403).';
    case 404:
      return 'Serviço ou recurso não encontrado (404).';
    case 409:
      return 'Já existe uma conta com este e-mail.';
    case 429:
      return 'Muitos pedidos seguidos. Aguarda alguns segundos antes de tentar novamente.';
    case 500:
      return 'O servidor encontrou um problema interno temporário (500). Tenta novamente dentro de instantes.';
    case 502:
      return 'Serviço temporariamente indisponível (502). Tenta novamente em alguns instantes.';
    case 503:
      return 'Base de dados ou servidor indisponível (503). O serviço pode estar a inicializar; tenta novamente.';
    case 504:
      return 'O servidor demorou a responder (504 Timeout). Verifica a tua ligação e tenta novamente.';
    default:
      return `Não foi possível comunicar com o servidor (${status}). Tenta novamente.`;
  }
}

async function parseJsonSafe<T>(res: Response): Promise<T & { error?: string; code?: string }> {
  try {
    const data = (await res.json()) as T & { error?: string; code?: string };
    if (!res.ok && !data.error) {
      data.error = humanizeHttpStatusMessage(res.status);
    }
    return data;
  } catch {
    return { error: humanizeHttpStatusMessage(res.status) } as T & { error?: string; code?: string };
  }
}

function inspectForRevocation(res: Response, hadToken: boolean, serverError?: string): boolean {
  if (!hadToken) return false;
  if (res.headers.get('X-Session-Revoked') === '1' || res.status === 401) {
    notifySessionRevoked(serverError || DEFAULT_REVOKED_MSG);
    return true;
  }
  return false;
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
  cycle: SchoolCycle,
  topicId?: string | null
): Promise<{ topics: TopicSearchItem[]; totalCurricula: number }> {
  const params = new URLSearchParams();
  if (query.trim()) params.set('q', query.trim());
  if (cycle !== 'all') params.set('cycle', cycle);
  if (topicId?.trim()) params.set('topicId', topicId.trim());

  const hadToken = Boolean(getStoredToken());
  const res = await resilientFetch(
    `/api/topics?${params.toString()}`,
    { headers: authHeaders() },
    25000,
    1
  );
  inspectForRevocation(res, hadToken);
  const data = await parseJsonSafe<{ topics?: TopicSearchItem[]; totalCurricula?: number }>(res);
  if (!res.ok) throw new Error(data.error || 'Não foi possível pesquisar matérias.');
  return {
    topics: data.topics ?? [],
    totalCurricula: data.totalCurricula ?? 0,
  };
}

export async function fetchCurriculumPreview(curriculumId: string): Promise<PreviewCurriculumInfo | null> {
  try {
    const res = await resilientFetch(
      `/api/curricula/${encodeURIComponent(curriculumId)}/preview`,
      {},
      18000,
      1
    );
    if (!res.ok) return null;
    const data = await parseJsonSafe<{ curriculum?: PreviewCurriculumInfo }>(res);
    return data.curriculum ?? null;
  } catch {
    return null;
  }
}

// ============================================================================
// NATIVE AUTHENTICATION (CockroachDB + Bcrypt + Strict 1-Device Session)
// ============================================================================
export async function registerAccount(email: string, password: string): Promise<AuthSessionState> {
  const res = await resilientFetch(
    '/api/auth/register',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    },
    25000
  );
  const data = await parseJsonSafe<AuthSessionState>(res);
  if (!res.ok || !data.token) {
    throw new Error(data.error || 'Não foi possível criar a conta.');
  }
  setStoredToken(data.token);
  return data;
}

export async function loginAccount(email: string, password: string): Promise<AuthSessionState> {
  const res = await resilientFetch(
    '/api/auth/login',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    },
    25000
  );
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
    const res = await resilientFetch('/api/auth/me', { headers: authHeaders() }, 20000, 1);
    const data = await parseJsonSafe<Omit<AuthSessionState, 'token'>>(res);
    if (res.status === 401) {
      notifySessionRevoked(data.error || DEFAULT_REVOKED_MSG);
      return null;
    }
    if (!res.ok || !data.user) return null;
    return { ...data, token };
  } catch {
    return null;
  }
}

/**
 * Lightweight heartbeat check used while online/visible to auto-logout a previous
 * device the moment the account logs in elsewhere. Never logs out when offline.
 */
export async function verifyActiveSession(): Promise<'valid' | 'revoked' | 'offline'> {
  const token = getStoredToken();
  if (!token) return 'revoked';
  if (typeof navigator !== 'undefined' && !navigator.onLine) return 'offline';
  try {
    const res = await fetch('/api/auth/me', {
      headers: authHeaders(),
      signal: AbortSignal.timeout(12000),
    });
    if (res.status === 401) {
      const data = await parseJsonSafe<Record<string, unknown>>(res);
      notifySessionRevoked(data.error || DEFAULT_REVOKED_MSG);
      return 'revoked';
    }
    return res.ok ? 'valid' : 'offline';
  } catch {
    return 'offline';
  }
}

export async function logoutAccount(): Promise<void> {
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: authHeaders(),
      signal: AbortSignal.timeout(5000),
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
  const hadToken = Boolean(getStoredToken());
  const res = await resilientFetch(
    '/api/unlocks',
    {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ curriculumId, provider, phone }),
    },
    25000
  );
  const data = await parseJsonSafe<{ receipt?: UnlockReceipt; alreadyUnlocked?: boolean }>(res);
  inspectForRevocation(res, hadToken, data.error);
  if (!res.ok || !data.receipt) {
    throw new Error(data.error || 'Não foi possível concluir o pagamento.');
  }
  return { receipt: data.receipt, alreadyUnlocked: data.alreadyUnlocked };
}

export async function fetchMySubjects(): Promise<MySubjectOverview[]> {
  const hadToken = Boolean(getStoredToken());
  const res = await resilientFetch('/api/my-subjects', { headers: authHeaders() }, 25000, 1);
  const data = await parseJsonSafe<{ subjects?: MySubjectOverview[] }>(res);
  inspectForRevocation(res, hadToken, data.error);
  if (!res.ok) {
    throw new Error(data.error || 'Não foi possível carregar as tuas matérias.');
  }
  return data.subjects ?? [];
}

export async function fetchProtectedCurriculumContent(
  curriculumId: string
): Promise<UnlockedCurriculum> {
  const hadToken = Boolean(getStoredToken());
  const res = await resilientFetch(
    `/api/curricula/${encodeURIComponent(curriculumId)}/content`,
    { headers: authHeaders() },
    30000,
    1
  );
  const data = await parseJsonSafe<{ curriculum?: UnlockedCurriculum }>(res);
  inspectForRevocation(res, hadToken, data.error);
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
  const hadToken = Boolean(getStoredToken());
  const res = await resilientFetch('/api/admin/curricula', { headers: authHeaders() }, 28000, 1);
  const data = await parseJsonSafe<{
    curricula?: AdminCurriculumOverview[];
    stats?: AdminDashboardStats;
  }>(res);
  inspectForRevocation(res, hadToken, data.error);
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
  const hadToken = Boolean(getStoredToken());
  const res = await resilientFetch(
    '/api/admin/curricula',
    {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload),
    },
    180000
  );
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
  inspectForRevocation(res, hadToken, data.error);
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
  const hadToken = Boolean(getStoredToken());
  const res = await resilientFetch(
    `/api/admin/curricula/${encodeURIComponent(curriculumId)}/enrich`,
    {
      method: 'POST',
      headers: authHeaders(),
    },
    180000
  );
  const data = await parseJsonSafe<{
    enrichedCount: number;
    totalCount: number;
    modelUsed?: string | null;
  }>(res);
  inspectForRevocation(res, hadToken, data.error);
  if (!res.ok) {
    throw new Error(data.error || 'Erro ao reprocessar resumos com Groq.');
  }
  return data;
}

export async function deleteAdminCurriculum(curriculumId: string): Promise<void> {
  const hadToken = Boolean(getStoredToken());
  const res = await resilientFetch(
    `/api/admin/curricula/${encodeURIComponent(curriculumId)}`,
    {
      method: 'DELETE',
      headers: authHeaders(),
    },
    20000
  );
  if (!res.ok) {
    const data = await parseJsonSafe<Record<string, unknown>>(res);
    inspectForRevocation(res, hadToken, data.error);
    throw new Error(data.error || 'Erro ao remover matéria.');
  }
}
