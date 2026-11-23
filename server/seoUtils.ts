/**
 * Pure Node.js SEO utilities for server-rendered HTML, XML sitemap and IndexNow.
 * ZERO DOM manipulation, ZERO browser APIs, ZERO import.meta — 100% CommonJS & ESM compatible.
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
  const envUrl = process.env.SITE_URL || process.env.VITE_SITE_URL;
  const raw = (envUrl || DEFAULT_SITE_URL).trim();
  return raw.replace(/\/+$/, '') || DEFAULT_SITE_URL;
}

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

export function sanitizePublicSeoCopy(input: string): string {
  return cleanWhitespace(
    input
      .replace(/\b(pdf|ficheiro|ficheiros|manual|manuais|livro|livros|m[oó]dulo|m[oó]dulos|cockroachdb|groq)\b/gi, 'matéria')
      .replace(/\bmatéria\s+matéria\b/gi, 'matéria')
  );
}

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
