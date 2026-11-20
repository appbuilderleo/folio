import dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config();

const connectionString = process.env.DATABASE_URL;

export const pool = connectionString
  ? new Pool({
      connectionString,
      max: 8,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    })
  : null;

export async function ensureSchema(): Promise<{ connected: boolean; error?: string }> {
  if (!pool) {
    return { connected: false, error: 'DATABASE_URL não configurada' };
  }

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS folio_manuals (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        subject TEXT NOT NULL,
        grade TEXT NOT NULL,
        grade_number INT NOT NULL,
        cycle TEXT NOT NULL,
        publisher TEXT NOT NULL,
        year TEXT,
        total_pages INT NOT NULL DEFAULT 1,
        price_mt INT NOT NULL DEFAULT 17,
        source_type TEXT NOT NULL DEFAULT 'pdf_upload',
        file_name TEXT,
        file_size_bytes BIGINT,
        default_unlocked BOOLEAN NOT NULL DEFAULT FALSE,
        ai_enriched BOOLEAN NOT NULL DEFAULT FALSE,
        ai_model TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    await pool.query(`
      ALTER TABLE folio_manuals ADD COLUMN IF NOT EXISTS ai_enriched BOOLEAN NOT NULL DEFAULT FALSE;
    `);
    await pool.query(`
      ALTER TABLE folio_manuals ADD COLUMN IF NOT EXISTS ai_model TEXT;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS folio_chapters (
        id TEXT PRIMARY KEY,
        manual_id TEXT NOT NULL REFERENCES folio_manuals(id) ON DELETE CASCADE,
        chapter_order INT NOT NULL DEFAULT 0,
        unit_label TEXT,
        title TEXT NOT NULL,
        page_start INT NOT NULL,
        page_end INT NOT NULL,
        summary TEXT NOT NULL,
        key_takeaways JSONB NOT NULL DEFAULT '[]'::jsonb,
        keywords JSONB NOT NULL DEFAULT '[]'::jsonb,
        preview_paragraphs JSONB NOT NULL DEFAULT '[]'::jsonb,
        paragraphs JSONB NOT NULL DEFAULT '[]'::jsonb,
        pages JSONB,
        reading_minutes INT NOT NULL DEFAULT 3,
        summary_source TEXT NOT NULL DEFAULT 'local',
        search_text TEXT NOT NULL DEFAULT ''
      );
    `);

    await pool.query(`
      ALTER TABLE folio_chapters ADD COLUMN IF NOT EXISTS summary_source TEXT NOT NULL DEFAULT 'local';
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_folio_chapters_manual_id
      ON folio_chapters (manual_id, chapter_order);
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS folio_unlocks (
        id TEXT PRIMARY KEY,
        manual_id TEXT NOT NULL REFERENCES folio_manuals(id) ON DELETE CASCADE,
        operator TEXT NOT NULL,
        phone_masked TEXT NOT NULL,
        amount_mt INT NOT NULL DEFAULT 17,
        reference TEXT NOT NULL,
        unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    return { connected: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { connected: false, error: message };
  }
}
