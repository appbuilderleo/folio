import cors from 'cors';
import dotenv from 'dotenv';
import express, { Router } from 'express';
import {
  attachOptionalAuth,
  createSessionWithDeviceLimit,
  hashPassword,
  MAX_CONCURRENT_SESSIONS,
  normalizeEmail,
  requireAdmin,
  requireAuth,
  resolveUserFromRequest,
  revokeSessionByToken,
  validateEmailFormat,
  verifyPassword,
  type AuthenticatedRequest,
} from './authService';
import { ensureSchema, normalizeSearchText, pool } from './db';
import {
  clampHalfParagraph,
  enrichTopicsWithGroq,
  getPreferredGroqModel,
  isGroqConfigured,
} from './groqService';
import { processMobilePayment } from './paymentService';
import type {
  AdminCurriculumOverview,
  AdminTopicDraft,
  PaymentOperator,
  PreviewCurriculumInfo,
  SchoolCycle,
  TopicPage,
  TopicSearchItem,
  UnlockedCurriculum,
} from '../src/types/folio';

dotenv.config();

export const app = express();

app.use(cors());
app.use(express.json({ limit: '45mb' }));

let schemaInitPromise: Promise<{ connected: boolean; error?: string }> | null = null;
let dbReady = false;
let dbError: string | undefined;

export async function ensureDbReady(): Promise<boolean> {
  if (dbReady) return true;
  if (!schemaInitPromise) {
    schemaInitPromise = ensureSchema().then((status) => {
      dbReady = status.connected;
      dbError = status.error;
      if (!status.connected) {
        schemaInitPromise = null;
      }
      return status;
    });
  }
  const res = await schemaInitPromise;
  return res.connected;
}

function gradeNumberToLabel(gradeNumber: number): string {
  const clamped = Math.max(1, Math.min(12, Math.round(gradeNumber)));
  return `${clamped}.ª Classe`;
}

function gradeNumberToCycle(gradeNumber: number): Exclude<SchoolCycle, 'all'> {
  if (gradeNumber <= 6) return '1-6';
  if (gradeNumber <= 9) return '7-9';
  return '10-12';
}

/**
 * Trigram similarity + typo tolerance score for Mozambican student queries
 * (e.g., "fotosintese" -> "Fotossíntese", "equasoes" -> "Equações").
 */
function buildTrigrams(str: string): Set<string> {
  const padded = `  ${str} `;
  const set = new Set<string>();
  for (let i = 0; i <= padded.length - 3; i++) {
    set.add(padded.slice(i, i + 3));
  }
  return set;
}

function trigramOverlap(queryToken: string, targetWords: string[]): number {
  if (queryToken.length < 3) return 0;
  const qTri = buildTrigrams(queryToken);
  let best = 0;
  for (const w of targetWords) {
    if (w.length < 3) continue;
    if (w.includes(queryToken) || queryToken.includes(w)) return 1;
    const wTri = buildTrigrams(w);
    let common = 0;
    for (const g of qTri) {
      if (wTri.has(g)) common += 1;
    }
    const sim = (2 * common) / (qTri.size + wTri.size);
    if (sim > best) best = sim;
  }
  return best;
}

function scoreTopicQuery(
  queryNorm: string,
  titleNorm: string,
  subjectGradeNorm: string,
  summaryNorm: string,
  searchNorm: string
): number {
  if (!queryNorm) return 10;

  let score = 0;
  if (titleNorm.includes(queryNorm)) score += 75;
  if (subjectGradeNorm.includes(queryNorm)) score += 35;
  if (summaryNorm.includes(queryNorm)) score += 32;
  if (searchNorm.includes(queryNorm)) score += 22;

  const qTokens = queryNorm.split(' ').filter((t) => t.length >= 2);
  const titleWords = titleNorm.split(' ');
  const corpusWords = Array.from(new Set(searchNorm.split(' '))).slice(0, 140);

  let matchedTokens = 0;
  for (const tok of qTokens) {
    if (titleNorm.includes(tok)) {
      score += 22;
      matchedTokens += 1;
    } else if (searchNorm.includes(tok)) {
      score += 10;
      matchedTokens += 1;
    } else {
      // Fuzzy / typo tolerance (e.g. "fotosintese" vs "fotossintese", "equasao" vs "equacao")
      const titleSim = trigramOverlap(tok, titleWords);
      if (titleSim >= 0.48) {
        score += Math.round(titleSim * 24);
        matchedTokens += 1;
      } else {
        const bodySim = trigramOverlap(tok, corpusWords);
        if (bodySim >= 0.54) {
          score += Math.round(bodySim * 14);
          matchedTokens += 1;
        }
      }
    }
  }

  if (qTokens.length > 1 && matchedTokens === qTokens.length) {
    score += 25;
  }

  return score;
}

function getDeviceLabel(req: express.Request): string {
  const ua = String(req.headers['user-agent'] || '');
  if (/iphone/i.test(ua)) return 'iPhone';
  if (/ipad/i.test(ua)) return 'iPad';
  if (/android/i.test(ua)) return 'Android';
  if (/windows/i.test(ua)) return 'Windows';
  if (/macintosh/i.test(ua)) return 'Mac';
  return 'Navegador Web';
}

const apiRouter = Router();

// ============================================================================
// 1. HEALTH CHECK (Minimal public metadata)
// ============================================================================
apiRouter.get('/health', async (_req, res) => {
  const ready = await ensureDbReady();
  return res.json({
    ok: true,
    dbConnected: ready,
  });
});

// ============================================================================
// 2. PUBLIC LIGHTWEIGHT DISCOVERY (3G/4G optimized — ZERO full_text leaked!)
// ============================================================================
apiRouter.get('/topics', attachOptionalAuth, async (req: AuthenticatedRequest, res) => {
  const ready = await ensureDbReady();
  if (!pool || !ready) {
    return res.status(503).json({ error: 'Serviço temporariamente indisponível', topics: [] });
  }

  const rawQ = String(req.query.q || '').trim();
  const cycle = String(req.query.cycle || 'all').trim();
  const queryNorm = normalizeSearchText(rawQ);

  try {
    const params: unknown[] = [];
    const conditions: string[] = [`c.status = 'published'`];

    if (cycle !== 'all' && ['1-6', '7-9', '10-12'].includes(cycle)) {
      params.push(cycle);
      conditions.push(`c.cycle = $${params.length}`);
    }

    // Fetch lightweight metadata only (NEVER selects full_text or pages!)
    const rowsRes = await pool.query(
      `
      SELECT
        t.id,
        t.curriculum_id,
        t.unit_label,
        t.title,
        t.page_number,
        t.page_end,
        t.summary_half_paragraph,
        t.preview_paragraphs,
        t.key_takeaways,
        t.reading_minutes,
        t.search_normalized,
        c.subject,
        c.grade,
        c.grade_number,
        c.cycle,
        c.total_pages,
        c.price_mt,
        (SELECT COUNT(*)::int FROM topics t2 WHERE t2.curriculum_id = c.id) AS curriculum_topics_count
      FROM topics t
      JOIN curricula c ON c.id = t.curriculum_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY c.created_at DESC, t.topic_order ASC
      LIMIT 300
      `,
      params
    );

    // Determine unlocked curricula for authenticated student (if signed in)
    const unlockedIds = new Set<string>();
    if (req.authUser) {
      if (req.authUser.role === 'admin') {
        for (const r of rowsRes.rows) unlockedIds.add(String(r.curriculum_id));
      } else {
        const uRes = await pool.query(
          `SELECT curriculum_id FROM user_unlocks WHERE user_id = $1`,
          [req.authUser.id]
        );
        for (const u of uRes.rows) unlockedIds.add(String(u.curriculum_id));
      }
    }

    const scored: Array<{ score: number; item: TopicSearchItem }> = [];

    for (const r of rowsRes.rows) {
      const titleNorm = normalizeSearchText(String(r.title));
      const subjGradeNorm = normalizeSearchText(`${r.subject} ${r.grade}`);
      const summaryNorm = normalizeSearchText(String(r.summary_half_paragraph));
      const searchNorm = String(r.search_normalized || '');

      const score = scoreTopicQuery(queryNorm, titleNorm, subjGradeNorm, summaryNorm, searchNorm);
      if (queryNorm && score < 8) continue;

      const takeaways = Array.isArray(r.key_takeaways) ? (r.key_takeaways as string[]) : [];
      const previews = Array.isArray(r.preview_paragraphs)
        ? (r.preview_paragraphs as string[]).slice(0, 2)
        : [];

      scored.push({
        score,
        item: {
          id: String(r.id),
          curriculumId: String(r.curriculum_id),
          subject: String(r.subject),
          grade: String(r.grade),
          gradeNumber: Number(r.grade_number),
          cycle: String(r.cycle) as TopicSearchItem['cycle'],
          unitLabel: r.unit_label ? String(r.unit_label) : undefined,
          title: String(r.title),
          pageNumber: Number(r.page_number),
          pageEnd: Number(r.page_end || r.page_number),
          summaryHalfParagraph: clampHalfParagraph(String(r.summary_half_paragraph)),
          previewParagraphs: previews,
          keyTakeawaysPreview: takeaways.slice(0, 2),
          readingMinutes: Number(r.reading_minutes || 3),
          priceMt: Number(r.price_mt || 17),
          curriculumTopicsCount: Number(r.curriculum_topics_count || 1),
          totalPages: Number(r.total_pages || 1),
          unlocked: unlockedIds.has(String(r.curriculum_id)),
        },
      });
    }

    scored.sort((a, b) => b.score - a.score || a.item.pageNumber - b.item.pageNumber);

    return res.json({
      topics: scored.slice(0, 50).map((s) => s.item),
      totalCurricula: new Set(rowsRes.rows.map((r) => String(r.curriculum_id))).size,
    });
  } catch (err) {
    console.error('[GET /api/topics]', err);
    return res.status(500).json({ error: 'Erro ao pesquisar matérias', topics: [] });
  }
});

/**
 * Lightweight curriculum outline for Editorial Preview (shows topic titles + page numbers only).
 */
apiRouter.get('/curricula/:id/preview', async (req, res) => {
  const ready = await ensureDbReady();
  if (!pool || !ready) {
    return res.status(503).json({ error: 'Base de dados indisponível' });
  }
  try {
    const cRes = await pool.query(
      `SELECT id, subject, grade, grade_number, cycle, total_pages, price_mt FROM curricula WHERE id = $1 AND status = 'published'`,
      [req.params.id]
    );
    if (cRes.rows.length === 0) {
      return res.status(404).json({ error: 'Matéria não encontrada' });
    }
    const tRes = await pool.query(
      `SELECT id, title, unit_label, page_number, page_end, reading_minutes FROM topics WHERE curriculum_id = $1 ORDER BY topic_order ASC`,
      [req.params.id]
    );

    const c = cRes.rows[0];
    const preview: PreviewCurriculumInfo = {
      id: String(c.id),
      subject: String(c.subject),
      grade: String(c.grade),
      gradeNumber: Number(c.grade_number),
      cycle: String(c.cycle) as PreviewCurriculumInfo['cycle'],
      totalPages: Number(c.total_pages),
      priceMt: Number(c.price_mt || 17),
      topics: tRes.rows.map((t) => ({
        id: String(t.id),
        title: String(t.title),
        unitLabel: t.unit_label ? String(t.unit_label) : undefined,
        pageNumber: Number(t.page_number),
        pageEnd: Number(t.page_end || t.page_number),
        readingMinutes: Number(t.reading_minutes || 3),
      })),
    };

    return res.json({ curriculum: preview });
  } catch (err) {
    console.error('[GET /api/curricula/:id/preview]', err);
    return res.status(500).json({ error: 'Erro ao carregar pré-visualização' });
  }
});

// ============================================================================
// 3. NATIVE AUTHENTICATION ON COCKROACHDB (Email + Bcrypt + Max 2 Sessions)
// ============================================================================
apiRouter.post('/auth/register', async (req, res) => {
  const ready = await ensureDbReady();
  if (!pool || !ready) {
    return res.status(503).json({ error: 'Base de dados indisponível' });
  }

  const email = normalizeEmail(String(req.body?.email || ''));
  const password = String(req.body?.password || '');

  if (!validateEmailFormat(email)) {
    return res.status(400).json({ error: 'Introduz um endereço de e-mail válido.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres.' });
  }

  try {
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Já existe uma conta com este e-mail. Inicia sessão.' });
    }

    const passwordHash = await hashPassword(password);
    const created = await pool.query(
      `INSERT INTO users (email, password_hash, role) VALUES ($1, $2, 'student') RETURNING id, email, role, created_at`,
      [email, passwordHash]
    );

    const userRow = created.rows[0];
    const session = await createSessionWithDeviceLimit(String(userRow.id), getDeviceLabel(req));

    return res.status(201).json({
      user: {
        id: String(userRow.id),
        email: String(userRow.email),
        role: 'student',
        createdAt: new Date(String(userRow.created_at)).toISOString(),
      },
      token: session.token,
      activeSessions: session.activeSessions,
      maxSessions: MAX_CONCURRENT_SESSIONS,
      evictedOldSession: session.evictedOldSession,
      unlockedCurriculumIds: [],
    });
  } catch (err) {
    console.error('[POST /api/auth/register]', err);
    return res.status(500).json({ error: 'Não foi possível criar a conta agora.' });
  }
});

apiRouter.post('/auth/login', async (req, res) => {
  const ready = await ensureDbReady();
  if (!pool || !ready) {
    return res.status(503).json({ error: 'Base de dados indisponível' });
  }

  const email = normalizeEmail(String(req.body?.email || ''));
  const password = String(req.body?.password || '');

  if (!email || !password) {
    return res.status(400).json({ error: 'Preenche o e-mail e a senha.' });
  }

  try {
    const uRes = await pool.query(
      `SELECT id, email, password_hash, role, created_at FROM users WHERE email = $1 LIMIT 1`,
      [email]
    );
    if (uRes.rows.length === 0) {
      return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
    }

    const row = uRes.rows[0];
    const valid = await verifyPassword(password, String(row.password_hash));
    if (!valid) {
      return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
    }

    const session = await createSessionWithDeviceLimit(String(row.id), getDeviceLabel(req));
    const unlockRes = await pool.query(
      `SELECT curriculum_id FROM user_unlocks WHERE user_id = $1`,
      [row.id]
    );

    return res.json({
      user: {
        id: String(row.id),
        email: String(row.email),
        role: row.role === 'admin' ? 'admin' : 'student',
        createdAt: new Date(String(row.created_at)).toISOString(),
      },
      token: session.token,
      activeSessions: session.activeSessions,
      maxSessions: MAX_CONCURRENT_SESSIONS,
      evictedOldSession: session.evictedOldSession,
      unlockedCurriculumIds: unlockRes.rows.map((r) => String(r.curriculum_id)),
    });
  } catch (err) {
    console.error('[POST /api/auth/login]', err);
    return res.status(500).json({ error: 'Erro ao iniciar sessão.' });
  }
});

apiRouter.get('/auth/me', async (req, res) => {
  const ready = await ensureDbReady();
  if (!pool || !ready) {
    return res.status(503).json({ error: 'Base de dados indisponível' });
  }

  try {
    const resolved = await resolveUserFromRequest(req);
    if (!resolved) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    const unlockRes = await pool.query(
      `SELECT curriculum_id FROM user_unlocks WHERE user_id = $1`,
      [resolved.user.id]
    );

    return res.json({
      user: resolved.user,
      activeSessions: resolved.activeSessions,
      maxSessions: MAX_CONCURRENT_SESSIONS,
      unlockedCurriculumIds: unlockRes.rows.map((r) => String(r.curriculum_id)),
    });
  } catch (err) {
    console.error('[GET /api/auth/me]', err);
    return res.status(500).json({ error: 'Erro ao verificar sessão' });
  }
});

apiRouter.post('/auth/logout', async (req, res) => {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    await revokeSessionByToken(header.slice(7).trim());
  }
  return res.json({ ok: true });
});

// ============================================================================
// 4. PROTECTED STUDENT ROUTES (Unlock 17 MT, Minhas Matérias & Protected Content)
// ============================================================================
apiRouter.post('/unlocks', requireAuth, async (req: AuthenticatedRequest, res) => {
  const ready = await ensureDbReady();
  if (!pool || !ready) {
    return res.status(503).json({ error: 'Base de dados indisponível' });
  }

  const curriculumId = String(req.body?.curriculumId || '').trim();
  const provider = String(req.body?.provider || '') as PaymentOperator;
  const phone = String(req.body?.phone || '').trim();

  if (!curriculumId || !['mpesa', 'emola'].includes(provider)) {
    return res.status(400).json({ error: 'Seleciona uma matéria e carteira móvel válida.' });
  }

  try {
    const cRes = await pool.query(
      `SELECT id, price_mt, subject, grade FROM curricula WHERE id = $1 AND status = 'published'`,
      [curriculumId]
    );
    if (cRes.rows.length === 0) {
      return res.status(404).json({ error: 'Matéria curricular não encontrada.' });
    }

    const curriculum = cRes.rows[0];
    const amountMt = Number(curriculum.price_mt || 17);

    // Check if already unlocked for this account (never charge twice!)
    const existing = await pool.query(
      `SELECT payment_provider, phone_masked, amount_mt, transaction_ref, unlocked_at FROM user_unlocks WHERE user_id = $1 AND curriculum_id = $2`,
      [req.authUser!.id, curriculumId]
    );
    if (existing.rows.length > 0) {
      const ex = existing.rows[0];
      return res.json({
        receipt: {
          curriculumId,
          provider: ex.payment_provider as PaymentOperator,
          phoneMasked: String(ex.phone_masked),
          amountMt: Number(ex.amount_mt),
          transactionRef: String(ex.transaction_ref),
          unlockedAt: new Date(String(ex.unlocked_at)).toISOString(),
        },
        alreadyUnlocked: true,
      });
    }

    const payment = await processMobilePayment({
      provider,
      phone,
      amountMt,
      curriculumId,
      userId: req.authUser!.id,
    });

    if (!payment.approved) {
      return res.status(400).json({ error: payment.error || 'Pagamento não autorizado.' });
    }

    const inserted = await pool.query(
      `
      INSERT INTO user_unlocks (user_id, curriculum_id, payment_provider, phone_masked, amount_mt, transaction_ref)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (user_id, curriculum_id) DO NOTHING
      RETURNING unlocked_at
      `,
      [
        req.authUser!.id,
        curriculumId,
        payment.provider,
        payment.phoneMasked,
        payment.amountMt,
        payment.transactionRef,
      ]
    );

    const unlockedAt = inserted.rows[0]?.unlocked_at
      ? new Date(String(inserted.rows[0].unlocked_at)).toISOString()
      : new Date().toISOString();

    return res.status(201).json({
      receipt: {
        curriculumId,
        provider: payment.provider,
        phoneMasked: payment.phoneMasked,
        amountMt: payment.amountMt,
        transactionRef: payment.transactionRef,
        unlockedAt,
      },
      mode: payment.mode,
    });
  } catch (err) {
    console.error('[POST /api/unlocks]', err);
    return res.status(500).json({ error: 'Erro ao confirmar desbloqueio.' });
  }
});

apiRouter.get('/my-subjects', requireAuth, async (req: AuthenticatedRequest, res) => {
  const ready = await ensureDbReady();
  if (!pool || !ready) {
    return res.status(503).json({ error: 'Base de dados indisponível' });
  }

  try {
    const cRes = await pool.query(
      `
      SELECT
        c.id,
        c.subject,
        c.grade,
        c.grade_number,
        c.cycle,
        c.total_pages,
        c.price_mt,
        u.payment_provider,
        u.transaction_ref,
        u.unlocked_at
      FROM user_unlocks u
      JOIN curricula c ON c.id = u.curriculum_id
      WHERE u.user_id = $1 AND c.status = 'published'
      ORDER BY u.unlocked_at DESC
      `,
      [req.authUser!.id]
    );

    const ids = cRes.rows.map((r) => String(r.id));
    const topicsByCurr = new Map<string, Array<{ id: string; title: string; pageNumber: number }>>();

    if (ids.length > 0) {
      const tRes = await pool.query(
        `
        SELECT id, curriculum_id, title, page_number
        FROM topics
        WHERE curriculum_id = ANY($1::uuid[])
        ORDER BY topic_order ASC
        `,
        [ids]
      );
      for (const t of tRes.rows) {
        const cid = String(t.curriculum_id);
        const list = topicsByCurr.get(cid) ?? [];
        list.push({
          id: String(t.id),
          title: String(t.title),
          pageNumber: Number(t.page_number),
        });
        topicsByCurr.set(cid, list);
      }
    }

    return res.json({
      subjects: cRes.rows.map((r) => ({
        id: String(r.id),
        subject: String(r.subject),
        grade: String(r.grade),
        gradeNumber: Number(r.grade_number),
        cycle: String(r.cycle),
        totalPages: Number(r.total_pages),
        priceMt: Number(r.price_mt || 17),
        paymentProvider: String(r.payment_provider) as PaymentOperator,
        transactionRef: String(r.transaction_ref),
        unlockedAt: new Date(String(r.unlocked_at)).toISOString(),
        topics: topicsByCurr.get(String(r.id)) ?? [],
      })),
    });
  } catch (err) {
    console.error('[GET /api/my-subjects]', err);
    return res.status(500).json({ error: 'Erro ao carregar as tuas matérias.' });
  }
});

/**
 * STRICTLY PROTECTED FULL CONTENT ENDPOINT:
 * Only delivers full_text and pages AFTER validating user_unlocks in CockroachDB (or admin role).
 */
apiRouter.get('/curricula/:id/content', requireAuth, async (req: AuthenticatedRequest, res) => {
  const ready = await ensureDbReady();
  if (!pool || !ready) {
    return res.status(503).json({ error: 'Base de dados indisponível' });
  }

  const curriculumId = String(req.params.id);

  try {
    let unlockRow: Record<string, unknown> | null = null;
    if (req.authUser!.role !== 'admin') {
      const uRes = await pool.query(
        `SELECT payment_provider, transaction_ref, unlocked_at FROM user_unlocks WHERE user_id = $1 AND curriculum_id = $2`,
        [req.authUser!.id, curriculumId]
      );
      if (uRes.rows.length === 0) {
        return res.status(403).json({
          error: 'Matéria ainda não desbloqueada nesta conta. Efetua a taxa de 17 MT para aceder.',
          code: 'UNLOCK_REQUIRED',
        });
      }
      unlockRow = uRes.rows[0];
    }

    const cRes = await pool.query(
      `SELECT id, subject, grade, grade_number, cycle, total_pages, price_mt FROM curricula WHERE id = $1`,
      [curriculumId]
    );
    if (cRes.rows.length === 0) {
      return res.status(404).json({ error: 'Matéria não encontrada' });
    }

    const tRes = await pool.query(
      `
      SELECT
        id, unit_label, title, page_number, page_end, summary_half_paragraph,
        key_takeaways, keywords, full_text, pages, reading_minutes
      FROM topics
      WHERE curriculum_id = $1
      ORDER BY topic_order ASC
      `,
      [curriculumId]
    );

    const c = cRes.rows[0];
    const curriculum: UnlockedCurriculum = {
      id: String(c.id),
      subject: String(c.subject),
      grade: String(c.grade),
      gradeNumber: Number(c.grade_number),
      cycle: String(c.cycle) as UnlockedCurriculum['cycle'],
      totalPages: Number(c.total_pages),
      priceMt: Number(c.price_mt || 17),
      paymentProvider: unlockRow ? (String(unlockRow.payment_provider) as PaymentOperator) : undefined,
      transactionRef: unlockRow ? String(unlockRow.transaction_ref) : undefined,
      unlockedAt: unlockRow ? new Date(String(unlockRow.unlocked_at)).toISOString() : undefined,
      topics: tRes.rows.map((t) => ({
        id: String(t.id),
        curriculumId: String(c.id),
        unitLabel: t.unit_label ? String(t.unit_label) : undefined,
        title: String(t.title),
        pageNumber: Number(t.page_number),
        pageEnd: Number(t.page_end || t.page_number),
        summaryHalfParagraph: clampHalfParagraph(String(t.summary_half_paragraph)),
        keyTakeaways: Array.isArray(t.key_takeaways) ? (t.key_takeaways as string[]) : [],
        keywords: Array.isArray(t.keywords) ? (t.keywords as string[]) : [],
        paragraphs: String(t.full_text || '')
          .split(/\n{2,}/)
          .map((p) => p.trim())
          .filter(Boolean),
        pages: Array.isArray(t.pages) ? (t.pages as TopicPage[]) : undefined,
        readingMinutes: Number(t.reading_minutes || 3),
      })),
    };

    return res.json({ curriculum });
  } catch (err) {
    console.error('[GET /api/curricula/:id/content]', err);
    return res.status(500).json({ error: 'Erro ao transferir conteúdo da matéria.' });
  }
});

// ============================================================================
// 5. ISOLATED ADMIN PANEL ROUTES (Server-enforced role === 'admin')
// ============================================================================
apiRouter.get('/admin/curricula', requireAdmin, async (_req, res) => {
  const ready = await ensureDbReady();
  if (!pool || !ready) {
    return res.status(503).json({ error: 'Base de dados indisponível' });
  }

  try {
    const [currRes, topicsRes, statsRes] = await Promise.all([
      pool.query(
        `
        SELECT
          c.id, c.subject, c.grade, c.grade_number, c.cycle, c.total_pages,
          c.price_mt, c.status, c.created_at,
          (SELECT COUNT(*)::int FROM topics t WHERE t.curriculum_id = c.id) AS topics_count,
          (SELECT COUNT(*)::int FROM user_unlocks u WHERE u.curriculum_id = c.id) AS unlocks_count
        FROM curricula c
        ORDER BY c.created_at DESC
        `
      ),
      pool.query(
        `
        SELECT id, curriculum_id, title, page_number, summary_half_paragraph
        FROM topics
        ORDER BY curriculum_id, topic_order ASC
        `
      ),
      pool.query(
        `
        SELECT
          (SELECT COUNT(*)::int FROM curricula) AS total_curricula,
          (SELECT COUNT(*)::int FROM topics) AS total_topics,
          (SELECT COUNT(*)::int FROM users WHERE role = 'student') AS total_students,
          (SELECT COUNT(*)::int FROM user_unlocks) AS total_unlocks,
          (SELECT COALESCE(SUM(amount_mt), 0)::float8 FROM user_unlocks) AS revenue_mt
        `
      ),
    ]);

    const previewsByCurr = new Map<
      string,
      Array<{ id: string; title: string; pageNumber: number; summaryHalfParagraph: string }>
    >();

    for (const t of topicsRes.rows) {
      const cid = String(t.curriculum_id);
      const list = previewsByCurr.get(cid) ?? [];
      list.push({
        id: String(t.id),
        title: String(t.title),
        pageNumber: Number(t.page_number),
        summaryHalfParagraph: String(t.summary_half_paragraph),
      });
      previewsByCurr.set(cid, list);
    }

    const curricula: AdminCurriculumOverview[] = currRes.rows.map((c) => ({
      id: String(c.id),
      subject: String(c.subject),
      grade: String(c.grade),
      gradeNumber: Number(c.grade_number),
      cycle: String(c.cycle) as AdminCurriculumOverview['cycle'],
      totalPages: Number(c.total_pages),
      priceMt: Number(c.price_mt || 17),
      status: (c.status === 'processing' ? 'processing' : 'published') as 'processing' | 'published',
      topicsCount: Number(c.topics_count || 0),
      unlocksCount: Number(c.unlocks_count || 0),
      createdAt: new Date(String(c.created_at)).toISOString(),
      topicsPreview: previewsByCurr.get(String(c.id)) ?? [],
    }));

    const st = statsRes.rows[0] ?? {};
    return res.json({
      curricula,
      stats: {
        totalCurricula: Number(st.total_curricula || 0),
        totalTopics: Number(st.total_topics || 0),
        totalStudents: Number(st.total_students || 0),
        totalUnlocks: Number(st.total_unlocks || 0),
        revenueMt: Number(st.revenue_mt || 0),
        groqEnabled: isGroqConfigured(),
        groqModel: isGroqConfigured() ? getPreferredGroqModel() : undefined,
      },
    });
  } catch (err) {
    console.error('[GET /api/admin/curricula]', err);
    return res.status(500).json({ error: 'Erro ao carregar painel administrativo.' });
  }
});

/**
 * Admin publishes new curriculum content (Grade + Subject + parsed PDF topics):
 * 1. Inserts curricula with status = 'processing'
 * 2. Runs Groq batch ½-paragraph (≤220 chars) summarization automatically
 * 3. Stores topics with normalized accent-free search text in CockroachDB
 * 4. Marks curricula status = 'published'
 */
apiRouter.post('/admin/curricula', requireAdmin, async (req, res) => {
  const ready = await ensureDbReady();
  if (!pool || !ready) {
    return res.status(503).json({ error: 'Base de dados indisponível' });
  }

  const gradeNumber = Number(req.body?.gradeNumber);
  const subject = String(req.body?.subject || '').trim();
  const totalPages = Math.max(1, Number(req.body?.totalPages || 1));
  const rawTopics = req.body?.topics as AdminTopicDraft[] | undefined;

  if (!gradeNumber || gradeNumber < 1 || gradeNumber > 12 || !subject || !Array.isArray(rawTopics) || rawTopics.length === 0) {
    return res.status(400).json({ error: 'Seleciona Classe (1–12), Disciplina e anexa um PDF com texto.' });
  }

  // Reject watermark-only garbage (e.g. CamScanner without OCR) so corrupted topics never enter the catalog
  const meaningfulChars = rawTopics
    .map((t) => (t.paragraphs || []).join(' '))
    .join(' ')
    .replace(/\b(scanned\s+(by|with)\s+\w+|camscanner|digitalizado\s+com\s+\w+)\b/gi, '')
    .trim().length;

  if (meaningfulChars < 40) {
    return res.status(400).json({
      error: 'O PDF não contém texto didático válido (apenas marcas de scanner). Ativa o OCR automático antes de publicar.',
    });
  }

  const grade = gradeNumberToLabel(gradeNumber);
  const cycle = gradeNumberToCycle(gradeNumber);

  try {
    // Step 1: Create curricula record in 'processing' status
    const currInsert = await pool.query(
      `
      INSERT INTO curricula (grade, grade_number, cycle, subject, total_pages, price_mt, status)
      VALUES ($1, $2, $3, $4, $5, 17.00, 'processing')
      RETURNING id, created_at
      `,
      [grade, gradeNumber, cycle, subject, totalPages]
    );
    const curriculumId = String(currInsert.rows[0].id);

    // Step 2: Generate strict ½-paragraph summaries automatically via Groq
    const aiResult = await enrichTopicsWithGroq({ subject, grade }, rawTopics);

    // Step 3: Insert all indexed topics atomically & set status = 'published'
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      for (let i = 0; i < aiResult.topics.length; i++) {
        const t = aiResult.topics[i];
        const fullText = (t.paragraphs || []).join('\n\n');
        const preview = (t.previewParagraphs?.length ? t.previewParagraphs : t.paragraphs || []).slice(0, 2);
        const summary = clampHalfParagraph(t.summaryHalfParagraph);
        const searchNorm = normalizeSearchText(
          [
            subject,
            grade,
            t.unitLabel || '',
            t.title,
            summary,
            ...(t.keywords || []),
            ...(t.keyTakeaways || []),
            fullText.slice(0, 1800),
          ].join(' ')
        );

        await client.query(
          `
          INSERT INTO topics (
            curriculum_id, topic_order, unit_label, title, page_number, page_end,
            summary_half_paragraph, preview_paragraphs, key_takeaways, keywords,
            full_text, pages, reading_minutes, search_normalized
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10::jsonb,$11,$12::jsonb,$13,$14)
          `,
          [
            curriculumId,
            i,
            t.unitLabel || null,
            t.title,
            t.pageNumber,
            t.pageEnd || t.pageNumber,
            summary,
            JSON.stringify(preview),
            JSON.stringify(t.keyTakeaways || []),
            JSON.stringify(t.keywords || []),
            fullText,
            t.pages ? JSON.stringify(t.pages) : null,
            t.readingMinutes || 3,
            searchNorm,
          ]
        );
      }

      await client.query(`UPDATE curricula SET status = 'published' WHERE id = $1`, [curriculumId]);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      await pool.query(`DELETE FROM curricula WHERE id = $1`, [curriculumId]);
      throw err;
    } finally {
      client.release();
    }

    return res.status(201).json({
      published: true,
      curriculumId,
      subject,
      grade,
      topicsCount: aiResult.topics.length,
      groqEnrichedCount: aiResult.enrichedCount,
      groqModel: aiResult.modelUsed,
      warnings: aiResult.warnings,
    });
  } catch (err) {
    console.error('[POST /api/admin/curricula]', err);
    return res.status(500).json({ error: 'Erro ao processar e publicar matéria curricular.' });
  }
});

apiRouter.post('/admin/curricula/:id/enrich', requireAdmin, async (req, res) => {
  const ready = await ensureDbReady();
  if (!pool || !ready) {
    return res.status(503).json({ error: 'Base de dados indisponível' });
  }

  try {
    const cRes = await pool.query(`SELECT id, subject, grade FROM curricula WHERE id = $1`, [req.params.id]);
    if (cRes.rows.length === 0) return res.status(404).json({ error: 'Matéria não encontrada' });
    const curr = cRes.rows[0];

    const tRes = await pool.query(
      `SELECT * FROM topics WHERE curriculum_id = $1 ORDER BY topic_order ASC`,
      [curr.id]
    );

    const drafts: AdminTopicDraft[] = tRes.rows.map((t) => ({
      unitLabel: t.unit_label ? String(t.unit_label) : undefined,
      title: String(t.title),
      pageNumber: Number(t.page_number),
      pageEnd: Number(t.page_end || t.page_number),
      summaryHalfParagraph: String(t.summary_half_paragraph),
      previewParagraphs: Array.isArray(t.preview_paragraphs) ? (t.preview_paragraphs as string[]) : [],
      keyTakeaways: Array.isArray(t.key_takeaways) ? (t.key_takeaways as string[]) : [],
      keywords: Array.isArray(t.keywords) ? (t.keywords as string[]) : [],
      paragraphs: String(t.full_text || '').split(/\n{2,}/).filter(Boolean),
      pages: Array.isArray(t.pages) ? (t.pages as TopicPage[]) : undefined,
      readingMinutes: Number(t.reading_minutes || 3),
    }));

    const aiResult = await enrichTopicsWithGroq(
      { subject: String(curr.subject), grade: String(curr.grade) },
      drafts
    );

    for (let i = 0; i < tRes.rows.length; i++) {
      const origId = String(tRes.rows[i].id);
      const updated = aiResult.topics[i];
      const searchNorm = normalizeSearchText(
        [
          curr.subject,
          curr.grade,
          updated.unitLabel || '',
          updated.title,
          updated.summaryHalfParagraph,
          ...updated.keywords,
          ...updated.keyTakeaways,
          updated.paragraphs.join(' ').slice(0, 1800),
        ].join(' ')
      );

      await pool.query(
        `
        UPDATE topics
        SET title = $1,
            summary_half_paragraph = $2,
            key_takeaways = $3::jsonb,
            keywords = $4::jsonb,
            search_normalized = $5
        WHERE id = $6
        `,
        [
          updated.title,
          updated.summaryHalfParagraph,
          JSON.stringify(updated.keyTakeaways),
          JSON.stringify(updated.keywords),
          searchNorm,
          origId,
        ]
      );
    }

    return res.json({
      enrichedCount: aiResult.enrichedCount,
      totalCount: aiResult.totalCount,
      modelUsed: aiResult.modelUsed,
      warnings: aiResult.warnings,
    });
  } catch (err) {
    console.error('[POST /api/admin/curricula/:id/enrich]', err);
    return res.status(500).json({ error: 'Erro ao reprocessar resumos com Groq.' });
  }
});

apiRouter.delete('/admin/curricula/:id', requireAdmin, async (req, res) => {
  const ready = await ensureDbReady();
  if (!pool || !ready) {
    return res.status(503).json({ error: 'Base de dados indisponível' });
  }
  try {
    await pool.query(`DELETE FROM curricula WHERE id = $1`, [req.params.id]);
    return res.json({ deleted: true });
  } catch (err) {
    console.error('[DELETE /api/admin/curricula/:id]', err);
    return res.status(500).json({ error: 'Erro ao remover matéria curricular.' });
  }
});

// Mount under both /api and / so local Express AND Vercel serverless rewrites both work seamlessly
app.use('/api', apiRouter);
app.use('/', apiRouter);

export default app;
