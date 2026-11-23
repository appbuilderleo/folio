import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import { INITIAL_SNE_CURRICULA } from './seedData';

dotenv.config();

const connectionString = process.env.DATABASE_URL;

export const pool = connectionString
  ? new Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 25000,
    })
  : null;

export function normalizeSearchText(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function ensureSchema(): Promise<{ connected: boolean; error?: string }> {
  if (!pool) {
    return { connected: false, error: 'DATABASE_URL não configurada' };
  }

  try {
    // Fast-path: if schema v3 is already initialized, skip all DDL round-trips (~250ms vs 8000ms!)
    try {
      const fastCheck = await pool.query(
        `SELECT key FROM folio_meta WHERE key = 'schema_ready_v3' LIMIT 1`
      );
      if (fastCheck.rows.length > 0) {
        return { connected: true };
      }
    } catch {
      // folio_meta does not exist yet — proceed with full initialization below
    }

    // 1. Metadata table (tracks idempotent one-time seeds & schema version)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS folio_meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    // 2. users (Native Auth on CockroachDB PostgreSQL)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'student',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    // 3. user_sessions (Strict single-device security: max 1 active session per account)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash TEXT UNIQUE NOT NULL,
        device_label TEXT NOT NULL DEFAULT 'Dispositivo',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        expires_at TIMESTAMPTZ NOT NULL
      );
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id
      ON user_sessions (user_id, last_seen_at DESC);
    `);

    // 4. curricula (Subject + Grade units published by Admin)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS curricula (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        slug TEXT UNIQUE,
        grade TEXT NOT NULL,
        grade_number INT NOT NULL,
        cycle TEXT NOT NULL,
        subject TEXT NOT NULL,
        total_pages INT NOT NULL DEFAULT 1,
        price_mt NUMERIC(10, 2) NOT NULL DEFAULT 17.00,
        status TEXT NOT NULL DEFAULT 'published',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_curricula_status_cycle
      ON curricula (status, cycle, grade_number);
    `);

    // 5. topics (Indexed curriculum topics & pages with ½-paragraph Groq summaries)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS topics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        curriculum_id UUID NOT NULL REFERENCES curricula(id) ON DELETE CASCADE,
        topic_order INT NOT NULL DEFAULT 0,
        unit_label TEXT,
        title TEXT NOT NULL,
        page_number INT NOT NULL,
        page_end INT NOT NULL DEFAULT 1,
        summary_half_paragraph TEXT NOT NULL,
        preview_paragraphs JSONB NOT NULL DEFAULT '[]'::jsonb,
        key_takeaways JSONB NOT NULL DEFAULT '[]'::jsonb,
        keywords JSONB NOT NULL DEFAULT '[]'::jsonb,
        full_text TEXT NOT NULL,
        pages JSONB,
        visuals JSONB NOT NULL DEFAULT '[]'::jsonb,
        visuals_count INT NOT NULL DEFAULT 0,
        reading_minutes INT NOT NULL DEFAULT 3,
        search_normalized TEXT NOT NULL DEFAULT ''
      );
    `);

    await pool.query(`
      ALTER TABLE topics ADD COLUMN IF NOT EXISTS visuals JSONB NOT NULL DEFAULT '[]'::jsonb;
    `);
    await pool.query(`
      ALTER TABLE topics ADD COLUMN IF NOT EXISTS visuals_count INT NOT NULL DEFAULT 0;
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_topics_curriculum_order
      ON topics (curriculum_id, topic_order);
    `);

    // 6. user_unlocks (17 MT M-Pesa / e-Mola unlocks bound to user account)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_unlocks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        curriculum_id UUID NOT NULL REFERENCES curricula(id) ON DELETE CASCADE,
        payment_provider TEXT NOT NULL,
        phone_masked TEXT NOT NULL DEFAULT '•••',
        amount_mt NUMERIC(10, 2) NOT NULL DEFAULT 17.00,
        transaction_ref TEXT NOT NULL,
        unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (user_id, curriculum_id)
      );
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_user_unlocks_user_id
      ON user_unlocks (user_id, unlocked_at DESC);
    `);

    // Bootstrap Admin account from env (idempotent, never downgrades existing admin)
    await bootstrapAdminUser();

    // Seed initial 6 SNE curricula once so public search is immediately rich (editable/deletable in /admin)
    await seedInitialCurriculaOnce();
    // Backfill vector diagrams onto already-seeded SNE base topics if visuals are empty
    await backfillSeedVisualsOnce();
    // Sync precomputed visuals_count so search & admin list queries never scan heavy visuals JSONB
    await pool.query(`
      UPDATE topics
      SET visuals_count = jsonb_array_length(COALESCE(visuals, '[]'::jsonb))::int
      WHERE visuals_count = 0 AND visuals IS NOT NULL AND jsonb_array_length(visuals) > 0
    `);
    await pool.query(
      `INSERT INTO folio_meta (key, value) VALUES ('schema_ready_v3', 'true') ON CONFLICT (key) DO UPDATE SET value = 'true', updated_at = now()`
    );

    return { connected: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { connected: false, error: message };
  }
}

async function bootstrapAdminUser(): Promise<void> {
  if (!pool) return;
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD?.trim();
  if (!adminEmail || !adminPassword || adminPassword.length < 6) return;

  const existing = await pool.query('SELECT id, role FROM users WHERE email = $1', [adminEmail]);
  if (existing.rows.length === 0) {
    const hash = await bcrypt.hash(adminPassword, 10);
    await pool.query(
      `INSERT INTO users (email, password_hash, role) VALUES ($1, $2, 'admin') ON CONFLICT (email) DO NOTHING`,
      [adminEmail, hash]
    );
  } else if (existing.rows[0].role !== 'admin') {
    await pool.query(`UPDATE users SET role = 'admin' WHERE id = $1`, [existing.rows[0].id]);
  }
}

async function seedInitialCurriculaOnce(): Promise<void> {
  if (!pool) return;
  const flag = await pool.query(`SELECT value FROM folio_meta WHERE key = 'initial_sne_seeded_v1'`);
  if (flag.rows.length > 0) return;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const curr of INITIAL_SNE_CURRICULA) {
      const inserted = await client.query(
        `
        INSERT INTO curricula (slug, grade, grade_number, cycle, subject, total_pages, price_mt, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'published')
        ON CONFLICT (slug) DO NOTHING
        RETURNING id
        `,
        [
          curr.slug,
          curr.grade,
          curr.gradeNumber,
          curr.cycle,
          curr.subject,
          curr.totalPages,
          curr.priceMt,
        ]
      );

      const curriculumId = inserted.rows[0]?.id as string | undefined;
      if (!curriculumId) continue;

      for (let i = 0; i < curr.topics.length; i++) {
        const t = curr.topics[i];
        const fullText = t.paragraphs.join('\n\n');
        const searchNorm = normalizeSearchText(
          [
            curr.subject,
            curr.grade,
            t.unitLabel || '',
            t.title,
            t.summaryHalfParagraph,
            ...t.keywords,
            ...t.keyTakeaways,
            fullText.slice(0, 1800),
          ].join(' ')
        );

        await client.query(
          `
          INSERT INTO topics (
            curriculum_id, topic_order, unit_label, title, page_number, page_end,
            summary_half_paragraph, preview_paragraphs, key_takeaways, keywords,
            full_text, pages, visuals, visuals_count, reading_minutes, search_normalized
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10::jsonb,$11,$12::jsonb,$13::jsonb,$14,$15,$16)
          `,
          [
            curriculumId,
            i,
            t.unitLabel || null,
            t.title,
            t.pageNumber,
            t.pageEnd,
            t.summaryHalfParagraph,
            JSON.stringify(t.previewParagraphs),
            JSON.stringify(t.keyTakeaways),
            JSON.stringify(t.keywords),
            fullText,
            t.pages ? JSON.stringify(t.pages) : null,
            JSON.stringify(t.visuals || []),
            (t.visuals || []).length,
            t.readingMinutes,
            searchNorm,
          ]
        );
      }
    }

    await client.query(
      `INSERT INTO folio_meta (key, value) VALUES ('initial_sne_seeded_v1', 'true') ON CONFLICT (key) DO NOTHING`
    );
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function backfillSeedVisualsOnce(): Promise<void> {
  if (!pool) return;
  const flag = await pool.query(`SELECT value FROM folio_meta WHERE key = 'seed_visuals_v1'`);
  if (flag.rows.length > 0) return;

  for (const curr of INITIAL_SNE_CURRICULA) {
    const cRes = await pool.query(`SELECT id FROM curricula WHERE slug = $1`, [curr.slug]);
    if (cRes.rows.length === 0) continue;
    const curriculumId = String(cRes.rows[0].id);

    for (let i = 0; i < curr.topics.length; i++) {
      const t = curr.topics[i];
      if (!t.visuals || t.visuals.length === 0) continue;
      await pool.query(
        `
        UPDATE topics
        SET visuals = $1::jsonb, visuals_count = $4
        WHERE curriculum_id = $2
          AND topic_order = $3
          AND (visuals IS NULL OR jsonb_array_length(visuals) = 0)
        `,
        [JSON.stringify(t.visuals), curriculumId, i, t.visuals.length]
      );
    }
  }

  await pool.query(
    `INSERT INTO folio_meta (key, value) VALUES ('seed_visuals_v1', 'true') ON CONFLICT (key) DO NOTHING`
  );
}
