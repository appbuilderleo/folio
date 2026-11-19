import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { ensureSchema, pool } from './db';
import type { Manual, ManualChapter } from '../src/types/folio';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3001);

app.use(cors());
app.use(express.json({ limit: '45mb' }));

let dbReady = false;
let dbError: string | undefined;

async function init() {
  const status = await ensureSchema();
  dbReady = status.connected;
  dbError = status.error;
  if (dbReady) {
    console.log('[Fólio API] CockroachDB conectado e esquema verificado.');
  } else {
    console.warn('[Fólio API] CockroachDB indisponível:', dbError);
  }
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
    createdAt: new Date(String(m.created_at)).toISOString(),
    chapters: byManual.get(String(m.id)) ?? [],
  }));
}

app.get('/api/health', async (_req, res) => {
  if (!pool) {
    return res.json({ ok: true, dbConnected: false, error: 'DATABASE_URL não configurada' });
  }
  try {
    await pool.query('SELECT 1');
    dbReady = true;
    dbError = undefined;
    return res.json({ ok: true, dbConnected: true, engine: 'CockroachDB' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.json({ ok: true, dbConnected: false, error: msg });
  }
});

app.get('/api/manuals', async (_req, res) => {
  if (!pool || !dbReady) {
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

app.post('/api/manuals', async (req, res) => {
  if (!pool || !dbReady) {
    return res.status(503).json({ error: 'Base de dados indisponível' });
  }

  const manual = req.body as Manual;
  if (!manual || !manual.id || !manual.title || !Array.isArray(manual.chapters)) {
    return res.status(400).json({ error: 'Payload de manual inválido' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      `
      INSERT INTO folio_manuals (
        id, title, subject, grade, grade_number, cycle, publisher, year,
        total_pages, price_mt, source_type, file_name, file_size_bytes, default_unlocked, created_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        subject = EXCLUDED.subject,
        grade = EXCLUDED.grade,
        grade_number = EXCLUDED.grade_number,
        cycle = EXCLUDED.cycle,
        total_pages = EXCLUDED.total_pages,
        price_mt = EXCLUDED.price_mt,
        default_unlocked = EXCLUDED.default_unlocked
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
        manual.createdAt || new Date().toISOString(),
      ]
    );

    await client.query('DELETE FROM folio_chapters WHERE manual_id = $1', [manual.id]);

    for (let i = 0; i < manual.chapters.length; i++) {
      const ch = manual.chapters[i];
      const searchText = [
        ch.title,
        ch.summary,
        ...(ch.keywords || []),
        ...(ch.paragraphs || []).slice(0, 8),
      ].join(' ');

      await client.query(
        `
        INSERT INTO folio_chapters (
          id, manual_id, chapter_order, unit_label, title, page_start, page_end,
          summary, key_takeaways, keywords, preview_paragraphs, paragraphs, pages,
          reading_minutes, search_text
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10::jsonb,$11::jsonb,$12::jsonb,$13::jsonb,$14,$15)
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
          searchText,
        ]
      );
    }

    await client.query('COMMIT');
    return res.status(201).json({ saved: true, id: manual.id });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[POST /api/manuals]', err);
    return res.status(500).json({ error: 'Erro ao gravar manual no CockroachDB' });
  } finally {
    client.release();
  }
});

app.delete('/api/manuals/:id', async (req, res) => {
  if (!pool || !dbReady) {
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

app.post('/api/unlocks', async (req, res) => {
  if (!pool || !dbReady) {
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
    // Ensure referenced manual exists in DB before inserting receipt (seed manuals may only be client-side)
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

init().then(() => {
  app.listen(PORT, () => {
    console.log(`[Fólio API] Servidor ativo em http://localhost:${PORT}`);
  });
});
