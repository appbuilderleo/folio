import { Router, type Request, type Response } from 'express';
import {
  clampSeoDescription,
  clampSeoTitle,
  getSiteUrl,
  OG_IMAGE_ALT,
  OG_IMAGE_HEIGHT,
  OG_IMAGE_PATH,
  OG_IMAGE_WIDTH,
  sanitizePublicSeoCopy,
  SITE_NAME,
  toCanonicalUrl,
} from './seoUtils';
import { pool } from './db';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const INDEXNOW_KEY_RE = /^[A-Za-z0-9-]{8,128}$/;

interface PublicTopicRecord {
  id: string;
  curriculumId: string;
  topicOrder: number;
  unitLabel: string | null;
  title: string;
  pageNumber: number;
  pageEnd: number;
  summaryHalfParagraph: string;
  previewParagraphs: string[];
  keyTakeaways: string[];
  readingMinutes: number;
  visualsCount: number;
  subject: string;
  grade: string;
  gradeNumber: number;
  cycle: '1-6' | '7-9' | '10-12';
  priceMt: number;
  updatedAt: string;
}

interface PublicCurriculumGroup {
  id: string;
  subject: string;
  grade: string;
  gradeNumber: number;
  cycle: '1-6' | '7-9' | '10-12';
  priceMt: number;
  updatedAt: string;
  topics: PublicTopicRecord[];
}

interface SeoSnapshot {
  fetchedAt: number;
  curricula: PublicCurriculumGroup[];
  topicsById: Map<string, PublicTopicRecord>;
  uniqueTitleById: Map<string, string>;
  uniqueDescById: Map<string, string>;
}

const CACHE_TTL_MS = 60_000;
let cachedSnapshot: SeoSnapshot | null = null;
let inflightSnapshot: Promise<SeoSnapshot> | null = null;

export function invalidateSeoCache(): void {
  cachedSnapshot = null;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function safeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

function abbreviateSubject(subject: string): string {
  const map: Record<string, string> = {
    'Língua Portuguesa': 'Português',
    'Ciências Naturais': 'Ciências Nat.',
    'Ciências Sociais': 'Ciências Soc.',
    'Educação Visual': 'Ed. Visual',
    'Agro-Pecuária': 'Agro-Pec.',
  };
  return map[subject] || (subject.length > 14 ? `${subject.slice(0, 12).trim()}.` : subject);
}

/**
 * Strictly caps the public SEO excerpt (<= 2 paragraphs, <= 460 chars total) so
 * single- or two-paragraph topics NEVER expose their complete paid full_text publicly.
 */
function clampPublicPreviewParagraphs(paragraphs: string[], fallbackSummary: string): string[] {
  const source = paragraphs.length > 0 ? paragraphs.slice(0, 2) : [fallbackSummary];
  const MAX_TOTAL_CHARS = 460;
  const result: string[] = [];
  let used = 0;

  for (const raw of source) {
    const clean = raw.replace(/\s+/g, ' ').trim();
    if (!clean) continue;
    const remaining = MAX_TOTAL_CHARS - used;
    if (remaining < 60) break;

    if (clean.length <= remaining) {
      result.push(clean);
      used += clean.length;
    } else {
      let cut = clean.slice(0, remaining - 1);
      const sp = cut.lastIndexOf(' ');
      if (sp > remaining * 0.6) cut = cut.slice(0, sp);
      result.push(`${cut.replace(/[\s,.;:–—-]+$/g, '')}…`);
      break;
    }
  }

  return result.length > 0 ? result : [fallbackSummary];
}

/**
 * Guarantees unique, <= 60-char titles across all published topics
 * (eliminates OpenSEO's title-too-long, title-too-short, and duplicate-title checks).
 */
function buildUniqueTopicTitle(topic: PublicTopicRecord, usedTitles: Set<string>): string {
  const shortSubj = abbreviateSubject(topic.subject);
  const compactSuffix = ` · ${shortSubj} ${topic.gradeNumber}.ª P.${topic.pageNumber}`;
  let candidate = clampSeoTitle(topic.title, compactSuffix);

  if (!usedTitles.has(candidate.toLowerCase())) {
    usedTitles.add(candidate.toLowerCase());
    return candidate;
  }

  // Collision fallback: include topic order to guarantee 100% uniqueness
  const orderSuffix = ` (#${topic.topicOrder + 1}) · ${shortSubj} ${topic.gradeNumber}.ª`;
  candidate = clampSeoTitle(topic.title, orderSuffix);
  if (!usedTitles.has(candidate.toLowerCase())) {
    usedTitles.add(candidate.toLowerCase());
    return candidate;
  }

  const hashSuffix = ` [${topic.id.slice(0, 4)}] · Fólio`;
  candidate = clampSeoTitle(topic.title, hashSuffix);
  usedTitles.add(candidate.toLowerCase());
  return candidate;
}

/**
 * Guarantees unique, 70..160-char meta descriptions across all published topics
 * (eliminates OpenSEO's meta-description-too-short/long and duplicate-meta-description checks).
 */
function buildUniqueTopicDescription(topic: PublicTopicRecord, usedDescs: Set<string>): string {
  const baseLead = `${topic.subject} (${topic.grade}, Pág. ${topic.pageNumber}) — ${topic.title}: ${topic.summaryHalfParagraph}`;
  const tail = `Lê o resumo grátis e estuda ${topic.subject} (${topic.grade}) 100% offline no Fólio.`;
  let candidate = clampSeoDescription(baseLead, tail);

  if (!usedDescs.has(candidate.toLowerCase())) {
    usedDescs.add(candidate.toLowerCase());
    return candidate;
  }

  const disambiguated = `${topic.subject} ${topic.grade}, Pág. ${topic.pageNumber} (Tema ${topic.topicOrder + 1}) — ${topic.title}. ${topic.summaryHalfParagraph}`;
  candidate = clampSeoDescription(disambiguated, tail);
  usedDescs.add(candidate.toLowerCase());
  return candidate;
}

/**
 * Fetches ONLY public, free metadata (NEVER selects full_text, pages, or visuals!).
 */
async function loadPublicSeoSnapshot(ensureDbReady: () => Promise<boolean>): Promise<SeoSnapshot> {
  if (cachedSnapshot && Date.now() - cachedSnapshot.fetchedAt < CACHE_TTL_MS) {
    return cachedSnapshot;
  }
  if (inflightSnapshot) return inflightSnapshot;

  inflightSnapshot = (async () => {
    const empty: SeoSnapshot = {
      fetchedAt: Date.now(),
      curricula: [],
      topicsById: new Map(),
      uniqueTitleById: new Map(),
      uniqueDescById: new Map(),
    };

    const ready = await ensureDbReady();
    if (!pool || !ready) return empty;

    const res = await pool.query(
      `
      SELECT
        t.id,
        t.curriculum_id,
        t.topic_order,
        t.unit_label,
        t.title,
        t.page_number,
        t.page_end,
        t.summary_half_paragraph,
        t.preview_paragraphs,
        t.key_takeaways,
        t.reading_minutes,
        t.visuals_count,
        c.subject,
        c.grade,
        c.grade_number,
        c.cycle,
        c.price_mt,
        c.created_at
      FROM topics t
      JOIN curricula c ON c.id = t.curriculum_id
      WHERE c.status = 'published'
      ORDER BY c.grade_number ASC, c.subject ASC, c.created_at DESC, t.topic_order ASC
      LIMIT 600
      `
    );

    const curriculaMap = new Map<string, PublicCurriculumGroup>();
    const topicsById = new Map<string, PublicTopicRecord>();
    const usedTitles = new Set<string>();
    const usedDescs = new Set<string>();
    const uniqueTitleById = new Map<string, string>();
    const uniqueDescById = new Map<string, string>();

    for (const r of res.rows) {
      const updatedAt = r.created_at
        ? new Date(String(r.created_at)).toISOString()
        : new Date().toISOString();

      const topic: PublicTopicRecord = {
        id: String(r.id),
        curriculumId: String(r.curriculum_id),
        topicOrder: Number(r.topic_order || 0),
        unitLabel: r.unit_label ? String(r.unit_label) : null,
        title: String(r.title || '').trim(),
        pageNumber: Number(r.page_number || 1),
        pageEnd: Number(r.page_end || r.page_number || 1),
        summaryHalfParagraph: String(r.summary_half_paragraph || '').trim(),
        previewParagraphs: Array.isArray(r.preview_paragraphs)
          ? (r.preview_paragraphs as string[]).slice(0, 2)
          : [],
        keyTakeaways: Array.isArray(r.key_takeaways)
          ? (r.key_takeaways as string[]).slice(0, 2)
          : [],
        readingMinutes: Number(r.reading_minutes || 3),
        visualsCount: Number(r.visuals_count || 0),
        subject: String(r.subject),
        grade: String(r.grade),
        gradeNumber: Number(r.grade_number),
        cycle: (['1-6', '7-9', '10-12'].includes(String(r.cycle))
          ? String(r.cycle)
          : '10-12') as PublicTopicRecord['cycle'],
        priceMt: Number(r.price_mt || 17),
        updatedAt,
      };

      topicsById.set(topic.id, topic);
      uniqueTitleById.set(topic.id, buildUniqueTopicTitle(topic, usedTitles));
      uniqueDescById.set(topic.id, buildUniqueTopicDescription(topic, usedDescs));

      let group = curriculaMap.get(topic.curriculumId);
      if (!group) {
        group = {
          id: topic.curriculumId,
          subject: topic.subject,
          grade: topic.grade,
          gradeNumber: topic.gradeNumber,
          cycle: topic.cycle,
          priceMt: topic.priceMt,
          updatedAt,
          topics: [],
        };
        curriculaMap.set(topic.curriculumId, group);
      }
      group.topics.push(topic);
    }

    const snap: SeoSnapshot = {
      fetchedAt: Date.now(),
      curricula: Array.from(curriculaMap.values()),
      topicsById,
      uniqueTitleById,
      uniqueDescById,
    };
    cachedSnapshot = snap;
    return snap;
  })().finally(() => {
    inflightSnapshot = null;
  });

  return inflightSnapshot;
}

const EDITORIAL_SSR_CSS = `
  :root {
    --parchment: #f3ebd6;
    --ivory: #fcf8ee;
    --sand: #e3d7ba;
    --sand-strong: #d2c39d;
    --forest: #083b27;
    --forest-hover: #0d4f35;
    --ink: #041a11;
    --ink-soft: #2f4238;
    --ink-muted: #646050;
    --amber: #ea9222;
    --amber-soft: #f8e3be;
  }
  * { box-sizing: border-box; }
  html { scroll-behavior: smooth; }
  body {
    margin: 0;
    background: var(--parchment);
    color: var(--ink);
    font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
    line-height: 1.6;
    -webkit-font-smoothing: antialiased;
  }
  a { color: var(--forest); text-underline-offset: 3px; }
  a:hover { color: var(--forest-hover); }
  .topbar {
    position: sticky; top: 0; z-index: 20;
    background: rgba(243, 235, 214, 0.94);
    backdrop-filter: blur(8px);
    border-bottom: 1px solid var(--sand);
  }
  .topbar-inner {
    max-width: 880px; margin: 0 auto; padding: 12px 20px;
    display: flex; align-items: center; justify-content: space-between; gap: 12px;
  }
  .brand-link { display: inline-flex; align-items: center; text-decoration: none; }
  .nav-cta {
    display: inline-flex; align-items: center; justify-content: center;
    background: var(--forest); color: var(--ivory); text-decoration: none;
    font-weight: 700; font-size: 13px; padding: 9px 16px; border-radius: 999px;
  }
  .nav-cta:hover { background: var(--forest-hover); color: var(--ivory); }
  .wrap { max-width: 880px; margin: 0 auto; padding: 28px 20px 64px; }
  .breadcrumb {
    display: flex; flex-wrap: wrap; align-items: center; gap: 6px;
    font-size: 12.5px; color: var(--ink-muted); margin-bottom: 18px;
  }
  .breadcrumb a { color: var(--forest); font-weight: 600; text-decoration: none; }
  .breadcrumb a:hover { text-decoration: underline; }
  .kicker {
    font-size: 11.5px; font-weight: 800; letter-spacing: 0.11em;
    text-transform: uppercase; color: var(--forest); margin: 0 0 8px;
  }
  h1 {
    font-size: clamp(1.7rem, 4vw, 2.35rem);
    line-height: 1.12; letter-spacing: -0.03em; margin: 0 0 12px; color: var(--ink);
  }
  h2 {
    font-size: 1.18rem; line-height: 1.3; letter-spacing: -0.015em;
    margin: 28px 0 12px; color: var(--forest);
  }
  h3 {
    font-size: 1.02rem; line-height: 1.35; margin: 0 0 8px; color: var(--ink);
  }
  .lead { font-size: 16px; color: var(--ink-soft); max-width: 64ch; margin: 0 0 22px; }
  .card {
    background: var(--ivory); border: 1px solid var(--sand);
    border-radius: 18px; padding: 20px 22px; margin-bottom: 16px;
  }
  .page-pill {
    display: inline-block; background: var(--amber-soft); border: 1px solid rgba(234,146,34,0.35);
    color: var(--ink); font-weight: 800; font-size: 12px; padding: 3px 10px;
    border-radius: 8px; font-variant-numeric: tabular-nums;
  }
  .cycle-pills { display: flex; flex-wrap: wrap; gap: 8px; margin: 16px 0 26px; }
  .cycle-pill {
    display: inline-block; background: var(--ivory); border: 1px solid var(--sand-strong);
    color: var(--forest); font-weight: 700; font-size: 13px; text-decoration: none;
    padding: 8px 14px; border-radius: 999px;
  }
  .cycle-pill:hover { background: var(--forest); color: var(--ivory); border-color: var(--forest); }
  .topic-list { list-style: none; padding: 0; margin: 12px 0 0; }
  .topic-row {
    padding: 12px 0; border-top: 1px solid var(--sand);
    display: flex; flex-direction: column; gap: 4px;
  }
  .topic-row:first-child { border-top: 0; padding-top: 4px; }
  .topic-head { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; }
  .topic-link { font-weight: 700; font-size: 15.5px; color: var(--ink); text-decoration: none; }
  .topic-link:hover { color: var(--forest); text-decoration: underline; }
  .topic-summary { margin: 0; font-size: 14px; color: var(--ink-soft); }
  .serif-prose {
    font-family: 'Merriweather', Georgia, serif;
    font-size: 16.5px; line-height: 1.78; color: var(--ink); max-width: 62ch;
  }
  .cta-bar {
    display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 14px;
    background: var(--forest); color: var(--ivory);
    border-radius: 18px; padding: 20px 22px; margin: 24px 0;
  }
  .cta-btn {
    display: inline-flex; align-items: center; justify-content: center;
    background: var(--amber); color: var(--ink); text-decoration: none;
    font-weight: 800; font-size: 15px; padding: 13px 22px; border-radius: 14px;
  }
  .cta-btn:hover { background: #f2a137; color: var(--ink); }
  .site-footer {
    margin-top: 44px; padding-top: 20px; border-top: 1px solid var(--sand);
    display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px;
    font-size: 13px; color: var(--ink-muted);
  }
  .footer-links { display: flex; flex-wrap: wrap; gap: 14px; }
`;

interface RenderShellOptions {
  title: string;
  description: string;
  canonicalPath: string;
  ogType: 'website' | 'article';
  robots?: string;
  jsonLd: unknown;
  bodyHtml: string;
}

function renderSeoDocument(opts: RenderShellOptions): string {
  const siteUrl = getSiteUrl();
  const canonicalUrl = toCanonicalUrl(opts.canonicalPath, siteUrl);
  const ogImageUrl = `${siteUrl}${OG_IMAGE_PATH}`;
  const robots = opts.robots ?? 'index, follow, max-image-preview:large, max-snippet:-1';

  return `<!doctype html>
<html lang="pt-MZ">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#f3ebd6" />
    <meta name="robots" content="${escapeHtml(robots)}" />
    <title>${escapeHtml(opts.title)}</title>
    <meta name="description" content="${escapeHtml(opts.description)}" />
    <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />
    <link rel="manifest" href="/manifest.webmanifest" />
    <link rel="apple-touch-icon" href="/assets/folio-symbol.png" />
    <link rel="icon" type="image/png" href="/assets/folio-symbol.png" />
    <meta property="og:site_name" content="${SITE_NAME}" />
    <meta property="og:type" content="${opts.ogType}" />
    <meta property="og:locale" content="pt_MZ" />
    <meta property="og:title" content="${escapeHtml(opts.title)}" />
    <meta property="og:description" content="${escapeHtml(opts.description)}" />
    <meta property="og:url" content="${escapeHtml(canonicalUrl)}" />
    <meta property="og:image" content="${escapeHtml(ogImageUrl)}" />
    <meta property="og:image:width" content="${OG_IMAGE_WIDTH}" />
    <meta property="og:image:height" content="${OG_IMAGE_HEIGHT}" />
    <meta property="og:image:alt" content="${escapeHtml(OG_IMAGE_ALT)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(opts.title)}" />
    <meta name="twitter:description" content="${escapeHtml(opts.description)}" />
    <meta name="twitter:image" content="${escapeHtml(ogImageUrl)}" />
    <meta name="twitter:image:alt" content="${escapeHtml(OG_IMAGE_ALT)}" />
    <script type="application/ld+json">${safeJsonLd(opts.jsonLd)}</script>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Merriweather:ital,wght@0,400;0,700;1,400&family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet" />
    <style>${EDITORIAL_SSR_CSS}</style>
  </head>
  <body>
    <header class="topbar">
      <div class="topbar-inner">
        <a href="/" class="brand-link" aria-label="Fólio — Página Inicial">
          <img src="/assets/folio-logo.png" alt="Fólio" width="124" height="32" style="height:30px;width:auto;" />
        </a>
        <a href="/#pesquisar" class="nav-cta">Pesquisar no Fólio</a>
      </div>
    </header>
    <main id="main" class="wrap">
      ${opts.bodyHtml}
      <footer class="site-footer">
        <span>Fólio · A página certa para cada dúvida · Moçambique (1.ª–12.ª Classe)</span>
        <nav class="footer-links" aria-label="Navegação do rodapé">
          <a href="/">Início</a>
          <a href="/materias">Índice de Matérias</a>
          <a href="/#pesquisar">Abrir Pesquisa</a>
        </nav>
      </footer>
    </main>
  </body>
</html>`;
}

/**
 * Optional IndexNow submission (OpenSEO 0016-indexnow spec).
 * Runs non-blockingly when INDEXNOW_KEY is configured in environment variables.
 */
export async function notifyIndexNow(paths: string[]): Promise<void> {
  const key = (process.env.INDEXNOW_KEY || '').trim();
  if (!key || !INDEXNOW_KEY_RE.test(key) || paths.length === 0) return;

  const siteUrl = getSiteUrl();
  let host: string;
  try {
    host = new URL(siteUrl).host;
  } catch {
    return;
  }

  const urlList = Array.from(new Set(paths.map((p) => toCanonicalUrl(p, siteUrl)))).slice(0, 10_000);
  const payload = {
    host,
    key,
    keyLocation: `${siteUrl}/${key}.txt`,
    urlList,
  };

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timer);
  } catch {
    // Non-blocking: IndexNow failure must never disrupt publishing
  }
}

export function createSeoRouter(ensureDbReady: () => Promise<boolean>): Router {
  const router = Router();

  // Enforce clean trailing-slash-free canonical URLs via single 301 redirect (avoids duplicate-content)
  router.use((req, res, next) => {
    if (
      req.method === 'GET' &&
      req.path.length > 1 &&
      req.path.endsWith('/') &&
      (req.path === '/materias/' || req.path.startsWith('/tema/'))
    ) {
      const cleanPath = req.path.replace(/\/+$/, '');
      return res.redirect(301, cleanPath);
    }
    return next();
  });

  // 1. Dynamic XML Sitemap (CockroachDB-backed, excludes /admin and /api/*)
  router.get('/sitemap.xml', async (_req: Request, res: Response) => {
    try {
      const siteUrl = getSiteUrl();
      const snap = await loadPublicSeoSnapshot(ensureDbReady);
      const todayIso = new Date().toISOString().slice(0, 10);
      const latestCurrDate =
        snap.curricula[0]?.updatedAt?.slice(0, 10) || todayIso;

      const urls: Array<{ loc: string; lastmod: string; changefreq: string; priority: string }> = [
        { loc: toCanonicalUrl('/', siteUrl), lastmod: latestCurrDate, changefreq: 'weekly', priority: '1.0' },
        { loc: toCanonicalUrl('/materias', siteUrl), lastmod: latestCurrDate, changefreq: 'daily', priority: '0.9' },
      ];

      for (const curr of snap.curricula) {
        for (const t of curr.topics) {
          urls.push({
            loc: toCanonicalUrl(`/tema/${t.id}`, siteUrl),
            lastmod: t.updatedAt.slice(0, 10),
            changefreq: 'monthly',
            priority: '0.8',
          });
        }
      }

      const xml = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        ...urls.map(
          (u) =>
            `  <url><loc>${escapeXml(u.loc)}</loc><lastmod>${escapeXml(u.lastmod)}</lastmod><changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`
        ),
        '</urlset>',
      ].join('\n');

      res.setHeader('Content-Type', 'application/xml; charset=utf-8');
      res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');
      return res.status(200).send(xml);
    } catch (err) {
      console.error('[GET /sitemap.xml]', err);
      const siteUrl = getSiteUrl();
      const fallbackXml = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        `  <url><loc>${escapeXml(toCanonicalUrl('/', siteUrl))}</loc><priority>1.0</priority></url>`,
        `  <url><loc>${escapeXml(toCanonicalUrl('/materias', siteUrl))}</loc><priority>0.9</priority></url>`,
        '</urlset>',
      ].join('\n');
      res.setHeader('Content-Type', 'application/xml; charset=utf-8');
      return res.status(200).send(fallbackXml);
    }
  });

  // 2. Public Curriculum Directory Hub (/materias) — links every published topic (depth <= 2, zero orphan pages!)
  router.get(['/materias', '/materias/'], async (_req: Request, res: Response) => {
    try {
      const siteUrl = getSiteUrl();
      const snap = await loadPublicSeoSnapshot(ensureDbReady);
      const totalTopics = snap.topicsById.size;
      const totalCurricula = snap.curricula.length;

      const cycles: Array<{ id: '1-6' | '7-9' | '10-12'; title: string; subtitle: string }> = [
        {
          id: '1-6',
          title: 'Ensino Primário (1.ª à 6.ª Classe)',
          subtitle: 'Bases sólidas em Português, Matemática, Ciências Naturais e Ciências Sociais.',
        },
        {
          id: '7-9',
          title: '1.º Ciclo do Ensino Secundário (7.ª à 9.ª Classe)',
          subtitle: 'Disciplinas do ensino secundário geral com fórmulas, resumos e página exata.',
        },
        {
          id: '10-12',
          title: '2.º Ciclo do Ensino Secundário (10.ª à 12.ª Classe)',
          subtitle: 'Matérias organizadas para preparação de exames nacionais em Moçambique.',
        },
      ];

      const cycleSectionsHtml = cycles
        .map((cyc) => {
          const matching = snap.curricula.filter((c) => c.cycle === cyc.id);
          const innerHtml =
            matching.length === 0
              ? `<div class="card"><p class="topic-summary">Novas matérias deste ciclo estão em preparação. Usa a <a href="/#pesquisar">pesquisa do Fólio</a> para explorar todas as disciplinas disponíveis.</p></div>`
              : matching
                  .map(
                    (curr) => `
          <article class="card">
            <h3>${escapeHtml(curr.subject)} · ${escapeHtml(curr.grade)}</h3>
            <p class="topic-summary">${curr.topics.length} ${curr.topics.length === 1 ? 'tema indexado' : 'temas indexados'} · Resumo grátis e estudo offline por ${curr.priceMt} MT</p>
            <ul class="topic-list">
              ${curr.topics
                .map(
                  (t) => `
                <li class="topic-row">
                  <div class="topic-head">
                    <a class="topic-link" href="/tema/${escapeHtml(t.id)}">${escapeHtml(sanitizePublicSeoCopy(t.title))}</a>
                    <span class="page-pill">Pág. ${t.pageNumber}</span>
                  </div>
                  <p class="topic-summary">${escapeHtml(sanitizePublicSeoCopy(t.summaryHalfParagraph))}</p>
                </li>`
                )
                .join('')}
            </ul>
          </article>`
                  )
                  .join('');

          return `
        <section id="ciclo-${cyc.id}" aria-labelledby="heading-ciclo-${cyc.id}">
          <h2 id="heading-ciclo-${cyc.id}">${escapeHtml(cyc.title)}</h2>
          <p class="topic-summary" style="margin-bottom:14px;">${escapeHtml(cyc.subtitle)}</p>
          ${innerHtml}
        </section>`;
        })
        .join('');

      const itemListElements = Array.from(snap.topicsById.values())
        .slice(0, 60)
        .map((t, idx) => ({
          '@type': 'ListItem',
          position: idx + 1,
          url: toCanonicalUrl(`/tema/${t.id}`, siteUrl),
          name: `${sanitizePublicSeoCopy(t.title)} — ${t.subject} (${t.grade})`,
        }));

      const jsonLd = {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Início', item: toCanonicalUrl('/', siteUrl) },
              {
                '@type': 'ListItem',
                position: 2,
                name: 'Índice de Matérias',
                item: toCanonicalUrl('/materias', siteUrl),
              },
            ],
          },
          {
            '@type': 'CollectionPage',
            name: 'Índice de Matérias Escolares de Moçambique (1.ª–12.ª Classe)',
            url: toCanonicalUrl('/materias', siteUrl),
            inLanguage: 'pt-MZ',
            description:
              'Diretório público de matérias escolares da 1.ª à 12.ª classe em Moçambique com resumo grátis e referência de página exata.',
            mainEntity: {
              '@type': 'ItemList',
              numberOfItems: totalTopics,
              itemListElement: itemListElements,
            },
          },
        ],
      };

      const bodyHtml = `
        <nav class="breadcrumb" aria-label="Caminho de navegação">
          <a href="/">Início</a>
          <span aria-hidden="true">/</span>
          <span>Índice de Matérias</span>
        </nav>

        <p class="kicker">Sistema Nacional de Educação · Moçambique</p>
        <h1>Índice de Matérias Escolares (1.ª–12.ª Classe)</h1>
        <p class="lead">
          Explora ${totalTopics > 0 ? `${totalTopics} temas escolares distribuídos por ${totalCurricula} disciplinas` : 'as matérias escolares de Moçambique'} com resumo gratuito de meio parágrafo, número exato da página e pré-visualização imediata sem precisar de conta.
        </p>

        <nav class="cycle-pills" aria-label="Ir para ciclo escolar">
          <a class="cycle-pill" href="#ciclo-1-6">1.ª–6.ª Classe</a>
          <a class="cycle-pill" href="#ciclo-7-9">7.ª–9.ª Classe</a>
          <a class="cycle-pill" href="#ciclo-10-12">10.ª–12.ª Classe</a>
        </nav>

        ${cycleSectionsHtml}

        <section class="cta-bar" aria-label="Pesquisa interativa">
          <div>
            <p class="kicker" style="color:#f8e3be;margin-bottom:4px;">Procuras um tema específico?</p>
            <p style="margin:0;font-size:15px;color:#fcf8ee;">
              Pesquisa diretamente no Fólio e desbloqueia a disciplina completa por 17 MT (M-Pesa ou e-Mola) para estudar 100% offline.
            </p>
          </div>
          <a href="/#pesquisar" class="cta-btn">Pesquisar Matéria Agora</a>
        </section>
      `;

      const html = renderSeoDocument({
        title: clampSeoTitle('Índice de Matérias Escolares (1.ª–12.ª)'),
        description: clampSeoDescription(
          'Explora matérias escolares da 1.ª à 12.ª classe em Moçambique por ciclo e disciplina. Consulta resumos grátis, página exata e estudo offline.'
        ),
        canonicalPath: '/materias',
        ogType: 'website',
        jsonLd,
        bodyHtml,
      });

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');
      return res.status(200).send(html);
    } catch (err) {
      console.error('[GET /materias]', err);
      return res.status(500).send('Serviço temporariamente indisponível.');
    }
  });

  // 3. Public Free Topic Preview Page (/tema/:id) — ZERO paid full_text leaked!
  router.get(['/tema/:id', '/tema/:id/'], async (req: Request, res: Response) => {
    const id = String(req.params.id || '').trim();
    const siteUrl = getSiteUrl();

    if (!UUID_RE.test(id)) {
      const notFoundHtml = renderSeoDocument({
        title: 'Tema escolar não encontrado — Fólio',
        description:
          'O tema escolar solicitado não está disponível neste endereço. Explora o índice completo de matérias da 1.ª à 12.ª classe no Fólio.',
        canonicalPath: '/materias',
        ogType: 'website',
        robots: 'noindex, follow',
        jsonLd: { '@context': 'https://schema.org', '@type': 'WebPage', name: 'Tema não encontrado' },
        bodyHtml: `
          <h1>Tema escolar não encontrado</h1>
          <p class="lead">O endereço solicitado não corresponde a nenhum tema publicado no Fólio. Podes consultar todas as disciplinas e páginas disponíveis no índice escolar.</p>
          <p><a class="nav-cta" href="/materias">Ver Índice de Matérias</a></p>
        `,
      });
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(404).send(notFoundHtml);
    }

    try {
      const snap = await loadPublicSeoSnapshot(ensureDbReady);
      const topic = snap.topicsById.get(id);

      if (!topic) {
        const notFoundHtml = renderSeoDocument({
          title: 'Tema escolar não encontrado — Fólio',
          description:
            'O tema escolar solicitado não está disponível neste endereço. Explora o índice completo de matérias da 1.ª à 12.ª classe no Fólio.',
          canonicalPath: '/materias',
          ogType: 'website',
          robots: 'noindex, follow',
          jsonLd: { '@context': 'https://schema.org', '@type': 'WebPage', name: 'Tema não encontrado' },
          bodyHtml: `
            <h1>Tema escolar não encontrado</h1>
            <p class="lead">Este tema pode ter sido atualizado ou removido do catálogo escolar. Explora todas as disciplinas disponíveis da 1.ª à 12.ª classe.</p>
            <p><a class="nav-cta" href="/materias">Voltar ao Índice de Matérias</a></p>
          `,
        });
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.status(404).send(notFoundHtml);
      }

      const currGroup = snap.curricula.find((c) => c.id === topic.curriculumId);
      const siblings = (currGroup?.topics || []).filter((t) => t.id !== topic.id).slice(0, 10);
      const curriculumTopicsCount = currGroup?.topics.length || 1;

      const pageTitle = snap.uniqueTitleById.get(topic.id) || clampSeoTitle(topic.title);
      const pageDesc =
        snap.uniqueDescById.get(topic.id) || clampSeoDescription(topic.summaryHalfParagraph);
      const cleanTitle = sanitizePublicSeoCopy(topic.title);
      const cleanSummary = sanitizePublicSeoCopy(topic.summaryHalfParagraph);
      const previewParas = clampPublicPreviewParagraphs(topic.previewParagraphs, cleanSummary);

      const canonicalPath = `/tema/${topic.id}`;
      const jsonLd = {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Início', item: toCanonicalUrl('/', siteUrl) },
              {
                '@type': 'ListItem',
                position: 2,
                name: 'Índice de Matérias',
                item: toCanonicalUrl('/materias', siteUrl),
              },
              {
                '@type': 'ListItem',
                position: 3,
                name: cleanTitle,
                item: toCanonicalUrl(canonicalPath, siteUrl),
              },
            ],
          },
          {
            '@type': 'LearningResource',
            name: cleanTitle,
            headline: cleanTitle,
            description: pageDesc,
            url: toCanonicalUrl(canonicalPath, siteUrl),
            inLanguage: 'pt-MZ',
            educationalLevel: topic.grade,
            about: {
              '@type': 'Thing',
              name: `${topic.subject} — ${topic.grade} (Moçambique)`,
            },
            teaches: topic.keyTakeaways.length > 0 ? topic.keyTakeaways : [cleanTitle],
            timeRequired: `PT${Math.max(1, topic.readingMinutes)}M`,
            isAccessibleForFree: false,
            hasPart: {
              '@type': 'WebPageElement',
              isAccessibleForFree: true,
              cssSelector: '.free-preview',
            },
            provider: {
              '@type': 'Organization',
              name: SITE_NAME,
              url: toCanonicalUrl('/', siteUrl),
            },
          },
        ],
      };

      const takeawaysHtml =
        topic.keyTakeaways.length > 0
          ? `<ul style="margin:12px 0 0;padding-left:20px;color:#2f4238;">${topic.keyTakeaways
              .map((pt) => `<li style="margin-bottom:6px;">${escapeHtml(sanitizePublicSeoCopy(pt))}</li>`)
              .join('')}</ul>`
          : '';

      const visualsNote =
        topic.visualsCount > 0
          ? ` Esta matéria inclui também ${topic.visualsCount} ${topic.visualsCount === 1 ? 'esquema ilustrativo' : 'esquemas e ilustrações didáticas'} disponíveis no leitor offline.`
          : '';

      const siblingsHtml =
        siblings.length > 0
          ? `
        <section class="card" aria-labelledby="heading-siblings">
          <h2 id="heading-siblings" style="margin-top:0;">Outros temas de ${escapeHtml(topic.subject)} · ${escapeHtml(topic.grade)}</h2>
          <ul class="topic-list">
            ${siblings
              .map(
                (s) => `
              <li class="topic-row">
                <div class="topic-head">
                  <a class="topic-link" href="/tema/${escapeHtml(s.id)}">${escapeHtml(sanitizePublicSeoCopy(s.title))}</a>
                  <span class="page-pill">Pág. ${s.pageNumber}</span>
                </div>
              </li>`
              )
              .join('')}
          </ul>
        </section>`
          : '';

      const bodyHtml = `
        <nav class="breadcrumb" aria-label="Caminho de navegação">
          <a href="/">Início</a>
          <span aria-hidden="true">/</span>
          <a href="/materias">Índice de Matérias</a>
          <span aria-hidden="true">/</span>
          <a href="/materias#ciclo-${topic.cycle}">${escapeHtml(topic.subject)} · ${escapeHtml(topic.grade)}</a>
          <span aria-hidden="true">/</span>
          <span>Pág. ${topic.pageNumber}</span>
        </nav>

        <p class="kicker">${escapeHtml(topic.unitLabel || `${topic.subject} · ${topic.grade}`)} · Página ${topic.pageNumber}${topic.pageEnd > topic.pageNumber ? `–${topic.pageEnd}` : ''}</p>
        <h1>${escapeHtml(cleanTitle)}</h1>
        <p class="lead">
          Pré-visualização gratuita da matéria de <strong>${escapeHtml(topic.subject)} (${escapeHtml(topic.grade)})</strong> — referência exata na <strong>Página ${topic.pageNumber}</strong>, tempo estimado de ${topic.readingMinutes} minutos de estudo.
        </p>

        <section class="card free-preview" aria-labelledby="heading-resumo">
          <h2 id="heading-resumo" style="margin-top:0;">Resumo Rápido (Grátis)</h2>
          <p style="margin:0;color:#041a11;font-size:15.5px;">${escapeHtml(cleanSummary)}</p>
          ${takeawaysHtml}
        </section>

        <article class="card free-preview" aria-labelledby="heading-excerto">
          <h2 id="heading-excerto" style="margin-top:0;">Excerto da Página ${topic.pageNumber}</h2>
          <div class="serif-prose">
            ${previewParas.map((p) => `<p>${escapeHtml(p)}</p>`).join('')}
          </div>
          <p style="margin:18px 0 0;font-size:13.5px;color:#646050;">
            A continuação completa desta lição, explicações passo a passo e todos os ${curriculumTopicsCount} ${curriculumTopicsCount === 1 ? 'tema' : 'temas'} de ${escapeHtml(topic.subject)} (${escapeHtml(topic.grade)}) ficam disponíveis no leitor offline do Fólio.${escapeHtml(visualsNote)}
          </p>
        </article>

        <section class="cta-bar" aria-label="Abrir matéria no Fólio">
          <div>
            <p class="kicker" style="color:#f8e3be;margin-bottom:4px;">Taxa única · ${topic.priceMt} MT (M-Pesa ou e-Mola)</p>
            <p style="margin:0;font-size:15px;color:#fcf8ee;">
              Abre diretamente na Página ${topic.pageNumber} e estuda ${escapeHtml(topic.subject)} (${escapeHtml(topic.grade)}) 100% offline.
            </p>
          </div>
          <a href="/#tema=${escapeHtml(topic.id)}" class="cta-btn">Abrir no Fólio (Pág. ${topic.pageNumber})</a>
        </section>

        <section class="card" aria-labelledby="heading-sobre">
          <h2 id="heading-sobre" style="margin-top:0;">Como estudar ${escapeHtml(topic.subject)} (${escapeHtml(topic.grade)}) sem internet</h2>
          <p style="margin:0;color:#2f4238;font-size:14.5px;">
            No Fólio, os estudantes do Sistema Nacional de Educação de Moçambique encontram a matéria exata da ${escapeHtml(topic.grade)} sem perder tempo. A consulta do tema, do resumo de meio parágrafo e do número da página é sempre gratuita e não exige registo. Ao efetuar a sincronização única de ${topic.priceMt} MT via M-Pesa ou e-Mola, toda a disciplina fica protegida na tua conta para estudo 100% offline, com leitura em modo Papel, Sépia ou Noite, ajuste de tamanho da letra e marcadores de página.
          </p>
        </section>

        ${siblingsHtml}
      `;

      const html = renderSeoDocument({
        title: pageTitle,
        description: pageDesc,
        canonicalPath,
        ogType: 'article',
        jsonLd,
        bodyHtml,
      });

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');
      return res.status(200).send(html);
    } catch (err) {
      console.error('[GET /tema/:id]', err);
      return res.status(500).send('Erro ao carregar pré-visualização da matéria.');
    }
  });

  // 4. Optional IndexNow Key Verification File (OpenSEO 0016-indexnow spec)
  router.get('/:key.txt', (req: Request, res: Response, next) => {
    const configuredKey = (process.env.INDEXNOW_KEY || '').trim();
    const requestedKey = String(req.params.key || '').trim();
    if (!configuredKey || !INDEXNOW_KEY_RE.test(configuredKey) || requestedKey !== configuredKey) {
      return next();
    }
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.status(200).send(configuredKey);
  });

  return router;
}
