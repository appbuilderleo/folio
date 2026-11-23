/**
 * Shared SEO configuration, canonical normalization, title/description bounds,
 * and client-side <head> synchronization modeled on OpenSEO (every-app/open-seo).
 *
 * Enforces OpenSEO audit thresholds:
 *  - Title length: 10..60 characters (unique per route)
 *  - Meta description length: 70..160 characters (unique per route)
 *  - Self-referencing canonical URL with normalized trailing slashes
 *  - Complete OpenGraph (1200x630) + Twitter summary_large_image tags
 *  - Explicit noindex, nofollow on private/admin routes
 */

export const SITE_NAME = 'Fólio';
export const DEFAULT_SITE_URL = 'https://folio-one-snowy.vercel.app';
export const OG_IMAGE_PATH = '/og-folio.png';
export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 630;
export const OG_IMAGE_ALT =
  'Fólio — A página certa para cada dúvida. Matérias escolares da 1.ª à 12.ª classe em Moçambique.';

export const DEFAULT_TITLE = 'Fólio — Matérias Escolares de Moçambique (1.ª–12.ª)';
export const DEFAULT_DESCRIPTION =
  'Pesquisa matérias escolares da 1.ª à 12.ª classe em Moçambique. Lê o resumo grátis, vai direto à página exata e estuda 100% offline por 17 MT.';

export const SEO_LIMITS = {
  titleMin: 10,
  titleMax: 60,
  descriptionMin: 70,
  descriptionMax: 160,
} as const;

export function getSiteUrl(): string {
  let envUrl: string | undefined;
  if (typeof process !== 'undefined' && process.env) {
    envUrl = process.env.SITE_URL || process.env.VITE_SITE_URL;
  }
  const raw = (envUrl || DEFAULT_SITE_URL).trim();
  return raw.replace(/\/+$/, '') || DEFAULT_SITE_URL;
}

/**
 * Mirrors OpenSEO's toCanonicalPath: ensures leading slash and removes
 * trailing slash on non-root paths to avoid duplicate-content / canonical-conflict.
 */
export function toCanonicalPath(pathname: string): string {
  const clean = pathname.split('?')[0].split('#')[0].trim();
  if (!clean || clean === '/') return '/';
  const withLeading = clean.startsWith('/') ? clean : `/${clean}`;
  return withLeading.replace(/\/+$/, '') || '/';
}

export function toCanonicalUrl(pathname: string, siteUrl = getSiteUrl()): string {
  const path = toCanonicalPath(pathname);
  return path === '/' ? `${siteUrl}/` : `${siteUrl}${path}`;
}

export function cleanWhitespace(input: string): string {
  return input.replace(/\s+/g, ' ').trim();
}

/**
 * Removes forbidden internal/technical words from public SEO strings
 * (aligned with Fólio public copy rules).
 */
export function sanitizePublicSeoCopy(input: string): string {
  return cleanWhitespace(
    input
      .replace(/\b(pdf|ficheiro|ficheiros|manual|manuais|livro|livros|m[oó]dulo|m[oó]dulos|cockroachdb|groq)\b/gi, 'matéria')
      .replace(/\bmatéria\s+matéria\b/gi, 'matéria')
  );
}

/**
 * Truncates text cleanly on word boundaries so title tags stay strictly <= 60 chars.
 */
export function clampSeoTitle(rawTitle: string, suffix = ' — Fólio'): string {
  const clean = sanitizePublicSeoCopy(rawTitle);
  const maxTotal = SEO_LIMITS.titleMax;

  if (!clean) return DEFAULT_TITLE;
  if (clean.endsWith(suffix)) {
    if (clean.length <= maxTotal) return clean;
    const base = clean.slice(0, clean.length - suffix.length).trim();
    return clampSeoTitle(base, suffix);
  }

  const combined = `${clean}${suffix}`;
  if (combined.length <= maxTotal && combined.length >= SEO_LIMITS.titleMin) {
    return combined;
  }

  const budget = Math.max(12, maxTotal - suffix.length - 1);
  let cut = clean.slice(0, budget);
  const lastSpace = cut.lastIndexOf(' ');
  if (lastSpace > budget * 0.55) {
    cut = cut.slice(0, lastSpace);
  }
  cut = cut.replace(/[\s,.;:–—-]+$/g, '');
  return `${cut}…${suffix}`.slice(0, maxTotal);
}

/**
 * Guarantees every meta description is strictly within OpenSEO's 70..160 char window.
 */
export function clampSeoDescription(rawDescription: string, fallbackTail?: string): string {
  let text = sanitizePublicSeoCopy(rawDescription);
  const tail = sanitizePublicSeoCopy(
    fallbackTail ||
      'Lê o resumo grátis, confirma a página exata e estuda 100% offline no Fólio (Moçambique).'
  );

  if (text.length < SEO_LIMITS.descriptionMin) {
    text = text ? `${text.replace(/[.!?]*$/, '.')} ${tail}` : tail;
  }

  if (text.length <= SEO_LIMITS.descriptionMax) {
    return text;
  }

  let cut = text.slice(0, SEO_LIMITS.descriptionMax - 1);
  const lastSpace = cut.lastIndexOf(' ');
  if (lastSpace > SEO_LIMITS.descriptionMax * 0.65) {
    cut = cut.slice(0, lastSpace);
  }
  cut = cut.replace(/[\s,.;:–—-]+$/g, '');
  return `${cut}…`;
}

export interface DocumentSeoOptions {
  title: string;
  description: string;
  canonicalPath?: string;
  robots?: string;
  ogType?: 'website' | 'article';
}

function upsertMetaTag(attr: 'name' | 'property', key: string, content: string): void {
  if (typeof document === 'undefined') return;
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertCanonicalLink(href: string): void {
  if (typeof document === 'undefined') return;
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', href);
}

/**
 * Synchronizes document <head> tags during client-side SPA navigation so
 * JS-rendering crawlers and share tools always see accurate per-view metadata.
 */
export function applyDocumentSeo(opts: DocumentSeoOptions): void {
  if (typeof document === 'undefined') return;

  const siteUrl = getSiteUrl();
  const title = clampSeoTitle(opts.title);
  const description = clampSeoDescription(opts.description);
  const canonicalUrl = toCanonicalUrl(opts.canonicalPath ?? '/', siteUrl);
  const robots = opts.robots ?? 'index, follow, max-image-preview:large, max-snippet:-1';
  const ogType = opts.ogType ?? 'website';
  const ogImageUrl = `${siteUrl}${OG_IMAGE_PATH}`;

  document.title = title;
  upsertCanonicalLink(canonicalUrl);
  upsertMetaTag('name', 'description', description);
  upsertMetaTag('name', 'robots', robots);

  upsertMetaTag('property', 'og:site_name', SITE_NAME);
  upsertMetaTag('property', 'og:locale', 'pt_MZ');
  upsertMetaTag('property', 'og:type', ogType);
  upsertMetaTag('property', 'og:title', title);
  upsertMetaTag('property', 'og:description', description);
  upsertMetaTag('property', 'og:url', canonicalUrl);
  upsertMetaTag('property', 'og:image', ogImageUrl);
  upsertMetaTag('property', 'og:image:alt', OG_IMAGE_ALT);

  upsertMetaTag('name', 'twitter:card', 'summary_large_image');
  upsertMetaTag('name', 'twitter:title', title);
  upsertMetaTag('name', 'twitter:description', description);
  upsertMetaTag('name', 'twitter:image', ogImageUrl);
  upsertMetaTag('name', 'twitter:image:alt', OG_IMAGE_ALT);
}
