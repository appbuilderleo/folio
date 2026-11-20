import cors from 'cors';
import dotenv from 'dotenv';
import express, { Router } from 'express';
import { ensureSchema, pool } from './db';
import {
  enrichManualWithGroq,
  getPreferredGroqModel,
  isGroqConfigured,
} from './groqService';
import type { Manual, ManualChapter } from '../src/types/folio';

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
        schemaInitPromise = null; // allow retry on next request
      }
      return status;
    });
  }
  const res = await schemaInitPromise;
  return res.connected;
}

function mapRowsToManuals(
  manualRows: Array<Record<string, unknown>>,
  chapterRows: Array<Record<string, unknown>>
): Manual[] {
  const byManual = new Map<string, ManualChapter[]>();

  for (const row of chapterRows) {
    const manualId = String(row.manual_id);
    const list = byManual.get(manualId) ?? [];
    list.push({
      id: String(row.id),
      manualId,
      unitLabel: row.unit_label ? String(row.unit_label) : undefined,
      title: String(row.title),
      pageStart: Number(row.page_start),
      pageEnd: Number(row.page_end),
      summary: String(row.summary),
      keyTakeaways: Array.isArray(row.key_takeaways) ? (row.key_takeaways as string[]) : [],
      keywords: Array.isArray(row.keywords) ? (row.keywords as string[]) : [],
      previewParagraphs: Array.isArray(row.preview_paragraphs)
        ? (row.preview_paragraphs as string[])
        : [],
      paragraphs: Array.isArray(row.paragraphs) ? (row.paragraphs as string[]) : [],
      pages: Array.isArray(row.pages) ? (row.pages as ManualChapter['pages']) : undefined,
      readingMinutes: Number(row.reading_minutes || 3),
      summarySource: row.summary_source === 'groq' ? 'groq' : 'local',
    });
    byManual.set(manualId, list);
  }

  return manualRows.map((m) => ({
    id: String(m.id),
    title: String(m.title),
    subject: String(m.subject),
    grade: String(m.grade),
    gradeNumber: Number(m.grade_number),
    cycle: String(m.cycle) as Manual['cycle'],
    publisher: String(m.publisher),
    year: m.year ? String(m.year) : undefined,
    totalPages: Number(m.total_pages),
    priceMt: Number(m.price_mt),
    sourceType: (m.source_type === 'catalog' ? 'catalog' : 'pdf_upload') as Manual['sourceType'],
    fileName: m.file_name ? String(m.file_name) : undefined,
    fileSizeBytes: m.file_size_bytes ? Number(m.file_size_bytes) : undefined,
    defaultUnlocked: Boolean(m.default_unlocked),
    aiEnriched: Boolean(m.ai_enriched),
    aiModel: m.ai_model ? String(m.ai_model) : undefined,
    createdAt: new Date(String(m.created_at)).toISOString(),
    chapters: byManual.get(String(m.id)) ?? [],
  }));
}

async function persistManualToDb(manual: Manual): Promise<void> {
  const ready = await ensureDbReady();
  if (!pool || !ready) {
    throw new Error(dbError || 'Base de dados indisponível');
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      `
      INSERT INTO folio_manuals (
        id, title, subject, grade, grade_number, cycle, publisher, year,
        total_pages, price_mt, source_type, file_name, file_size_bytes,
        default_unlocked, ai_enriched, ai_model, created_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        subject = EXCLUDED.subject,
        grade = EXCLUDED.grade,
        grade_number = EXCLUDED.grade_number,
        cycle = EXCLUDED.cycle,
        total_pages = EXCLUDED.total_pages,
        price_mt = EXCLUDED.price_mt,
        default_unlocked = EXCLUDED.default_unlocked,
        ai_enriched = EXCLUDED.ai_enriched,
        ai_model = EXCLUDED.ai_model
      `,
      [
        manual.id,
        manual.title,
        manual.subject,
        manual.grade,
        manual.gradeNumber,
        manual.cycle,
        manual.publisher,
        manual.year || null,
        manual.totalPages,
        manual.priceMt,
        manual.sourceType,
        manual.fileName || null,
        manual.fileSizeBytes || null,
        Boolean(manual.defaultUnlocked),
        Boolean(manual.aiEnriched),
        manual.aiModel || null,
        manual.createdAt || new Date().toISOString(),
      ]
    );

    await client.query('DELETE FROM folio_chapters WHERE manual_id = $1', [manual.id]);

    for (let i = 0; i < manual.chapters.length; i++) {
      const ch = manual.chapters[i];
      const searchText = [
        manual.subject,
        manual.grade,
        ch.title,
        ch.summary,
        ...(ch.keywords || []),
        ...(ch.keyTakeaways || []),
        ...(ch.paragraphs || []).slice(0, 8),
      ].join(' ');

      await client.query(
        `
        INSERT INTO folio_chapters (
          id, manual_id, chapter_order, unit_label, title, page_start, page_end,
          summary, key_takeaways, keywords, preview_paragraphs, paragraphs, pages,
          reading_minutes, summary_source, search_text
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10::jsonb,$11::jsonb,$12::jsonb,$13::jsonb,$14,$15,$16)
        `,
        [
          ch.id,
          manual.id,
          i,
          ch.unitLabel || null,
          ch.title,
          ch.pageStart,
          ch.pageEnd,
          ch.summary,
          JSON.stringify(ch.keyTakeaways || []),
          JSON.stringify(ch.keywords || []),
          JSON.stringify(ch.previewParagraphs || []),
          JSON.stringify(ch.paragraphs || []),
          ch.pages ? JSON.stringify(ch.pages) : null,
          ch.readingMinutes || 3,
          ch.summarySource === 'groq' ? 'groq' : 'local',
          searchText,
        ]
      );
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

const apiRouter = Router();

apiRouter.get('/health', async (_req, res) => {
  const groqEnabled = isGroqConfigured();
  const groqModel = groqEnabled ? getPreferredGroqModel() : undefined;

  if (!pool) {
    return res.json({
      ok: true,
      dbConnected: false,
      groqEnabled,
      groqModel,
      error: 'DATABASE_URL não configurada',
    });
  }
  try {
    const ready = await ensureDbReady();
    if (!ready) {
      return res.json({ ok: true, dbConnected: false, groqEnabled, groqModel, error: dbError });
    }
    await pool.query('SELECT 1');
    return res.json({
      ok: true,
      dbConnected: true,
      engine: 'CockroachDB',
      groqEnabled,
      groqModel,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.json({ ok: true, dbConnected: false, groqEnabled, groqModel, error: msg });
  }
});

apiRouter.post('/ai/enrich-manual', async (req, res) => {
  const manual = req.body as Manual;
  if (!manual || !manual.id || !Array.isArray(manual.chapters)) {
    return res.status(400).json({ error: 'Payload de manual inválido para enriquecimento IA' });
  }

  if (!isGroqConfigured()) {
    return res.status(503).json({
      error: 'GROQ_API_KEY não configurada no servidor',
      manual,
      enrichedChapters: 0,
      totalChapters: manual.chapters.length,
    });
  }

  try {
    const result = await enrichManualWithGroq(manual);
    return res.json(result);
  } catch (err) {
    console.error('[POST /api/ai/enrich-manual]', err);
    const msg = err instanceof Error ? err.message : 'Erro ao enriquecer com Groq';
    return res.status(502).json({
      error: msg,
      manual,
      enrichedChapters: 0,
      totalChapters: manual.chapters.length,
    });
  }
});

apiRouter.get('/manuals', async (_req, res) => {
  const ready = await ensureDbReady();
  if (!pool || !ready) {
    return res.status(503).json({ error: 'Base de dados indisponível', manuals: [] });
  }
  try {
    const mRes = await pool.query(
      'SELECT * FROM folio_manuals ORDER BY created_at DESC LIMIT 100'
    );
    const cRes = await pool.query(
      'SELECT * FROM folio_chapters ORDER BY manual_id, chapter_order ASC'
    );
    const manuals = mapRowsToManuals(mRes.rows, cRes.rows);
    return res.json({ manuals });
  } catch (err) {
    console.error('[GET /api/manuals]', err);
    return res.status(500).json({ error: 'Erro ao carregar manuais do CockroachDB' });
  }
});

apiRouter.get('/search', async (req, res) => {
  const ready = await ensureDbReady();
  if (!pool || !ready) {
    return res.status(503).json({ error: 'Base de dados indisponível', results: [] });
  }
  const q = String(req.query.q || '').trim();
  const cycle = String(req.query.cycle || 'all').trim();

  try {
    const params: unknown[] = [];
    const conditions: string[] = [];

    if (cycle !== 'all') {
      params.push(cycle);
      conditions.push(`m.cycle = $${params.length}`);
    }
    if (q.length > 0) {
      params.push(`%${q}%`);
      conditions.push(
        `(c.search_text ILIKE $${params.length} OR c.title ILIKE $${params.length} OR m.title ILIKE $${params.length})`
      );
    }

    const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await pool.query(
      `
      SELECT
        c.id AS chapter_id,
        c.manual_id,
        c.title AS chapter_title,
        c.page_start,
        c.page_end,
        c.summary,
        c.summary_source,
        c.keywords,
        m.title AS manual_title,
        m.subject,
        m.grade,
        m.cycle,
        m.price_mt
      FROM folio_chapters c
      JOIN folio_manuals m ON m.id = c.manual_id
      ${whereSql}
      ORDER BY m.created_at DESC, c.chapter_order ASC
      LIMIT 40
      `,
      params
    );

    return res.json({ results: result.rows });
  } catch (err) {
    console.error('[GET /api/search]', err);
    return res.status(500).json({ error: 'Erro na pesquisa CockroachDB' });
  }
});

apiRouter.post('/manuals', async (req, res) => {
  const manual = req.body as Manual;
  if (!manual || !manual.id || !manual.title || !Array.isArray(manual.chapters)) {
    return res.status(400).json({ error: 'Payload de manual inválido' });
  }

  try {
    await persistManualToDb(manual);
    return res.status(201).json({ saved: true, id: manual.id, aiEnriched: Boolean(manual.aiEnriched) });
  } catch (err) {
    console.error('[POST /api/manuals]', err);
    return res.status(500).json({ error: 'Erro ao gravar manual no CockroachDB' });
  }
});

apiRouter.post('/manuals/:id/enrich', async (req, res) => {
  const ready = await ensureDbReady();
  if (!pool || !ready) {
    return res.status(503).json({ error: 'Base de dados indisponível' });
  }
  if (!isGroqConfigured()) {
    return res.status(503).json({ error: 'GROQ_API_KEY não configurada no servidor' });
  }

  try {
    const mRes = await pool.query('SELECT * FROM folio_manuals WHERE id = $1', [req.params.id]);
    if (!mRes.rows.length) {
      return res.status(404).json({ error: 'Manual não encontrado no CockroachDB' });
    }
    const cRes = await pool.query(
      'SELECT * FROM folio_chapters WHERE manual_id = $1 ORDER BY chapter_order ASC',
      [req.params.id]
    );
    const [manual] = mapRowsToManuals(mRes.rows, cRes.rows);
    const result = await enrichManualWithGroq(manual);
    await persistManualToDb(result.manual);
    return res.json(result);
  } catch (err) {
    console.error('[POST /api/manuals/:id/enrich]', err);
    return res.status(500).json({ error: 'Erro ao enriquecer manual com Groq IA' });
  }
});

apiRouter.delete('/manuals/:id', async (req, res) => {
  const ready = await ensureDbReady();
  if (!pool || !ready) {
    return res.status(503).json({ error: 'Base de dados indisponível' });
  }
  try {
    await pool.query('DELETE FROM folio_manuals WHERE id = $1', [req.params.id]);
    return res.json({ deleted: true });
  } catch (err) {
    console.error('[DELETE /api/manuals/:id]', err);
    return res.status(500).json({ error: 'Erro ao remover manual' });
  }
});

apiRouter.post('/unlocks', async (req, res) => {
  const ready = await ensureDbReady();
  if (!pool || !ready) {
    return res.status(503).json({ error: 'Base de dados indisponível' });
  }
  const { manualId, operator, phone, amountMt, reference } = req.body as {
    manualId?: string;
    operator?: string;
    phone?: string;
    amountMt?: number;
    reference?: string;
  };

  if (!manualId || !operator || !phone || !reference) {
    return res.status(400).json({ error: 'Dados de desbloqueio incompletos' });
  }

  const masked = phone.length >= 9 ? `${phone.slice(0, 2)}••••${phone.slice(-3)}` : '•••';

  try {
    const id = `ul-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const exists = await pool.query('SELECT id FROM folio_manuals WHERE id = $1', [manualId]);
    if (exists.rowCount && exists.rowCount > 0) {
      await pool.query(
        `
        INSERT INTO folio_unlocks (id, manual_id, operator, phone_masked, amount_mt, reference)
        VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [id, manualId, operator, masked, amountMt ?? 17, reference]
      );
    }
    return res.status(201).json({ recorded: true, reference });
  } catch (err) {
    console.error('[POST /api/unlocks]', err);
    return res.status(500).json({ error: 'Erro ao registar sincronização' });
  }
});

// Mount under both /api and / so local Express AND Vercel serverless rewrites work seamlessly
app.use('/api', apiRouter);
app.use('/', apiRouter);

export default app;
