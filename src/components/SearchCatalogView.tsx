import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bookmark,
  BookOpen,
  CheckCircle2,
  Cloud,
  CloudOff,
  FileText,
  FileUp,
  Loader2,
  Lock,
  Search,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { QUICK_TOPICS } from '../data/seedManuals';
import type { BackendHealth } from '../lib/apiClient';
import { normalizeQuery, searchManuals } from '../lib/searchEngine';
import type {
  BookmarkEntry,
  Manual,
  ManualChapter,
  SchoolCycle,
  SearchHit,
  UnlockReceipt,
} from '../types/folio';

interface SearchCatalogViewProps {
  manuals: Manual[];
  initialQuery: string;
  activeTab: 'search' | 'library';
  onTabChange: (tab: 'search' | 'library') => void;
  unlocks: Record<string, UnlockReceipt>;
  bookmarks: BookmarkEntry[];
  backendHealth: BackendHealth;
  onSelectHit: (hit: SearchHit) => void;
  onOpenManualChapter: (manual: Manual, chapter: ManualChapter, pageNumber?: number) => void;
  onOpenPdfUpload: () => void;
  onDeleteUploadedManual: (manualId: string) => void;
  onEnrichManualWithAI: (manual: Manual) => Promise<void>;
  onBackToHome: () => void;
}

const CYCLE_FILTERS: Array<{ id: SchoolCycle; label: string }> = [
  { id: 'all', label: 'Todas' },
  { id: '1-6', label: '1.ª–6.ª Classe' },
  { id: '7-9', label: '7.ª–9.ª Classe' },
  { id: '10-12', label: '10.ª–12.ª Classe' },
];

function highlightMatch(text: string, query: string) {
  const clean = query.trim();
  if (clean.length < 2) return text;
  const escaped = clean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'ig');
  const parts = text.split(regex);
  if (parts.length === 1) return text;

  return parts.map((part, idx) =>
    part.toLowerCase() === clean.toLowerCase() ? (
      <mark key={idx} className="bg-amber-soft text-ink rounded px-0.5 font-semibold">
        {part}
      </mark>
    ) : (
      <span key={idx}>{part}</span>
    )
  );
}

export function SearchCatalogView({
  manuals,
  initialQuery,
  activeTab,
  onTabChange,
  unlocks,
  bookmarks,
  backendHealth,
  onSelectHit,
  onOpenManualChapter,
  onOpenPdfUpload,
  onDeleteUploadedManual,
  onEnrichManualWithAI,
  onBackToHome,
}: SearchCatalogViewProps) {
  const [query, setQuery] = useState(initialQuery);
  const [cycle, setCycle] = useState<SchoolCycle>('all');
  const [onlyUploaded, setOnlyUploaded] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [enrichingManualId, setEnrichingManualId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  // Spec: 350ms Skeleton Shimmer when searching or filtering
  useEffect(() => {
    setIsSearching(true);
    const t = window.setTimeout(() => setIsSearching(false), 350);
    return () => window.clearTimeout(t);
  }, [query, cycle, onlyUploaded]);

  const uploadedCount = useMemo(
    () => manuals.filter((m) => m.sourceType === 'pdf_upload').length,
    [manuals]
  );

  const isManualUnlocked = (manual: Manual) =>
    Boolean(manual.defaultUnlocked || unlocks[manual.id]);

  const myManuals = useMemo(
    () => manuals.filter((m) => isManualUnlocked(m) || m.sourceType === 'pdf_upload'),
    [manuals, unlocks]
  );

  const dynamicTopics = useMemo(() => {
    const uploadedKeywords: string[] = [];
    for (const m of manuals) {
      if (m.sourceType === 'pdf_upload') {
        for (const ch of m.chapters.slice(0, 2)) {
          if (ch.keywords[0]) {
            const label = ch.keywords[0].charAt(0).toUpperCase() + ch.keywords[0].slice(1);
            if (!uploadedKeywords.includes(label)) uploadedKeywords.push(label);
          }
        }
      }
    }
    return [...uploadedKeywords.slice(0, 3), ...QUICK_TOPICS];
  }, [manuals]);

  const hits = useMemo(
    () => searchManuals(manuals, query, cycle, onlyUploaded),
    [manuals, query, cycle, onlyUploaded]
  );

  const bookmarkDetails = useMemo(() => {
    return bookmarks
      .map((bm) => {
        const manual = manuals.find((m) => m.id === bm.manualId);
        const chapter = manual?.chapters.find((c) => c.id === bm.chapterId);
        return manual && chapter ? { ...bm, manual, chapter } : null;
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }, [bookmarks, manuals]);

  return (
    <div className="min-h-dvh flex flex-col bg-parchment pb-24">
      {/* Sticky Editorial Header */}
      <header className="sticky top-0 z-30 bg-parchment/92 backdrop-blur-md border-b border-sand/85">
        <div className="w-full max-w-2xl mx-auto px-4 h-15 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onBackToHome}
            aria-label="Voltar ao início do Fólio"
            className="flex items-center gap-2 min-h-[44px] pr-2 cursor-pointer"
          >
            <img
              src="/assets/folio-logo.png"
              alt="Fólio"
              width={112}
              height={28}
              className="h-7 w-auto object-contain"
            />
          </button>

          <div className="flex items-center gap-2">
            {/* Subtle CockroachDB + Groq IA / Offline status indicator */}
            <span
              title={
                backendHealth.dbConnected
                  ? `Ligado ao CockroachDB${backendHealth.groqEnabled ? ` + IA Groq (${backendHealth.groqModel})` : ''}`
                  : 'Modo Cofre Offline Local'
              }
              className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-ivory border border-sand px-2.5 py-1 text-[11px] font-semibold text-ink-soft"
            >
              {backendHealth.dbConnected ? (
                <>
                  <Cloud className="w-3.5 h-3.5 text-forest" aria-hidden="true" />
                  <span>
                    CockroachDB{backendHealth.groqEnabled ? ' · Groq IA' : ''}
                  </span>
                </>
              ) : (
                <>
                  <CloudOff className="w-3.5 h-3.5 text-ink-muted" aria-hidden="true" />
                  <span>Offline</span>
                </>
              )}
            </span>

            {/* Prominent 1-Tap PDF Upload & Dissection Studio trigger */}
            <button
              type="button"
              onClick={onOpenPdfUpload}
              className="inline-flex items-center gap-1.5 min-h-[40px] px-3.5 rounded-full bg-forest hover:bg-forest-hover active:scale-[0.98] text-ivory text-[13px] font-bold shadow-xs transition-all cursor-pointer"
            >
              <FileUp className="w-4 h-4 text-amber" aria-hidden="true" />
              <span>Carregar PDF</span>
            </button>
          </div>
        </div>
      </header>

      <main id="main" tabIndex={-1} className="w-full max-w-2xl mx-auto px-4 pt-5 flex-1">
        {activeTab === 'search' ? (
          <>
            {/* Pill Search Bar */}
            <div className="relative">
              <Search
                className="w-[18px] h-[18px] text-forest/70 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                ref={inputRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Pesquisar matéria, tema ou capítulo..."
                aria-label="Pesquisar matéria, tema ou capítulo"
                className="w-full min-h-[52px] pl-11 pr-11 rounded-full bg-ivory border border-sand-strong text-[15px] text-ink placeholder:text-ink-muted shadow-[0_2px_10px_-4px_rgba(4,26,17,0.08)] focus:border-forest transition-colors"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    inputRef.current?.focus();
                  }}
                  aria-label="Limpar pesquisa"
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center text-ink-muted hover:text-ink hover:bg-parchment cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Horizontal Cycle Filters */}
            <div
              role="group"
              aria-label="Filtrar por ciclo escolar"
              className="mt-3.5 flex items-center gap-2 overflow-x-auto no-scrollbar pb-1"
            >
              {CYCLE_FILTERS.map((item) => {
                const active = cycle === item.id && !onlyUploaded;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setCycle(item.id);
                      setOnlyUploaded(false);
                    }}
                    aria-pressed={active}
                    className={`shrink-0 min-h-[38px] px-3.5 rounded-full text-[13px] font-semibold transition-all cursor-pointer ${
                      active
                        ? 'bg-forest text-ivory shadow-xs'
                        : 'bg-ivory border border-sand text-ink-soft hover:border-sand-strong'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}

              {uploadedCount > 0 && (
                <button
                  type="button"
                  onClick={() => setOnlyUploaded((v) => !v)}
                  aria-pressed={onlyUploaded}
                  className={`shrink-0 inline-flex items-center gap-1.5 min-h-[38px] px-3.5 rounded-full text-[13px] font-semibold transition-all cursor-pointer ${
                    onlyUploaded
                      ? 'bg-amber text-ink shadow-xs'
                      : 'bg-ivory border border-sand text-forest hover:border-amber'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>PDFs ({uploadedCount})</span>
                </button>
              )}
            </div>

            {/* Quick Topic Chips */}
            <div className="mt-3 flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
              <span className="shrink-0 text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted mr-1">
                Temas:
              </span>
              {dynamicTopics.map((topic) => {
                const active = normalizeQuery(query) === normalizeQuery(topic);
                return (
                  <button
                    key={topic}
                    type="button"
                    onClick={() => setQuery(active ? '' : topic)}
                    className={`shrink-0 min-h-[34px] px-3 rounded-full text-[12px] font-medium transition-colors cursor-pointer ${
                      active
                        ? 'bg-amber-soft text-ink border border-amber font-semibold'
                        : 'bg-parchment-deep/75 text-ink-soft hover:bg-parchment-deep'
                    }`}
                  >
                    {topic}
                  </button>
                );
              })}
            </div>

            {/* Results Counter */}
            <div className="mt-5 mb-3 flex items-baseline justify-between gap-2">
              <h1 className="text-[13px] font-bold uppercase tracking-[0.09em] text-ink-muted">
                {query.trim()
                  ? `Resultados para “${query.trim()}”`
                  : onlyUploaded
                    ? 'Manuais PDF adaptados'
                    : 'Páginas indexadas prontas a estudar'}
              </h1>
              <span className="text-[12px] font-semibold text-ink-muted tabular-nums">
                {isSearching ? '…' : `${hits.length} ${hits.length === 1 ? 'página' : 'páginas'}`}
              </span>
            </div>

            {/* 350ms Skeleton Shimmer */}
            {isSearching ? (
              <div className="space-y-3.5" aria-busy="true" aria-label="A pesquisar matéria...">
                {[0, 1, 2].map((idx) => (
                  <div key={idx} className="folio-card rounded-2xl p-4 sm:p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="h-4 w-36 rounded-full skeleton-pulse" />
                      <div className="h-5 w-16 rounded-md skeleton-pulse" />
                    </div>
                    <div className="h-5 w-3/4 rounded-md skeleton-pulse" />
                    <div className="space-y-2">
                      <div className="h-3.5 w-full rounded skeleton-pulse" />
                      <div className="h-3.5 w-5/6 rounded skeleton-pulse" />
                    </div>
                    <div className="pt-2 flex items-center justify-between">
                      <div className="h-3.5 w-32 rounded skeleton-pulse" />
                      <div className="h-7 w-36 rounded-full skeleton-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : hits.length === 0 ? (
              <div className="folio-card rounded-2xl p-7 text-center">
                <img
                  src="/assets/folio-symbol.png"
                  alt=""
                  aria-hidden="true"
                  className="w-11 h-11 mx-auto opacity-85 object-contain"
                />
                <h2 className="mt-4 text-[17px] font-bold text-ink">
                  Nenhuma página encontrada para “{query}”
                </h2>
                <p className="mt-2 text-[14px] text-ink-soft max-w-[36ch] mx-auto leading-relaxed">
                  Tenta outro termo escolar ou carrega o teu próprio livro em PDF para o Fólio
                  esmiuçar e indexar cada página automaticamente.
                </p>
                <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setQuery('');
                      setCycle('all');
                      setOnlyUploaded(false);
                    }}
                    className="min-h-[44px] px-4 rounded-xl bg-parchment border border-sand-strong text-[13px] font-semibold text-ink cursor-pointer"
                  >
                    Ver todos os temas
                  </button>
                  <button
                    type="button"
                    onClick={onOpenPdfUpload}
                    className="inline-flex items-center gap-1.5 min-h-[44px] px-4 rounded-xl bg-forest text-ivory text-[13px] font-bold cursor-pointer"
                  >
                    <FileUp className="w-4 h-4 text-amber" aria-hidden="true" />
                    <span>Carregar PDF agora</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3.5">
                {hits.map((hit) => {
                  const unlocked = isManualUnlocked(hit.manual);
                  return (
                    <article
                      key={`${hit.manual.id}-${hit.chapter.id}`}
                      onClick={() => onSelectHit(hit)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onSelectHit(hit);
                        }
                      }}
                      className="folio-card folio-card-interactive rounded-2xl p-4 sm:p-5 cursor-pointer relative overflow-hidden"
                    >
                      {/* Top row: Subject, Grade & Exact Page Stamp */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                          <span className="text-[11px] font-bold uppercase tracking-[0.09em] text-forest">
                            {hit.manual.subject}
                          </span>
                          <span className="text-sand-strong" aria-hidden="true">
                            •
                          </span>
                          <span className="text-[12px] font-semibold text-ink-soft">
                            {hit.manual.grade}
                          </span>
                          {hit.manual.sourceType === 'pdf_upload' && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-forest/10 text-forest px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em]">
                              <Sparkles className="w-2.5 h-2.5" aria-hidden="true" />
                              {hit.chapter.summarySource === 'groq' ? 'PDF · IA Groq' : 'PDF Adaptado'}
                            </span>
                          )}
                        </div>

                        <span className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-amber-soft border border-amber/30 px-2.5 py-1 text-[12px] font-extrabold text-ink tabular-nums">
                          Pág. {hit.matchedPage}
                        </span>
                      </div>

                      {/* Chapter Title */}
                      <h2 className="mt-2.5 text-[17px] sm:text-[18px] font-bold tracking-[-0.02em] text-ink leading-snug">
                        {highlightMatch(hit.chapter.title, query)}
                      </h2>

                      {/* Pre-generated Didactic Summary or Exact Page Snippet */}
                      <p className="mt-2 font-editorial text-[13.5px] sm:text-[14px] leading-[1.64] text-ink-soft line-clamp-3">
                        {highlightMatch(hit.matchedSnippet || hit.chapter.summary, query)}
                      </p>

                      {/* Bottom Bar: Source + Unlock/Offline Status */}
                      <div className="mt-4 pt-3 border-t border-sand/75 flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[12px] text-ink-muted truncate max-w-[200px] sm:max-w-[260px]">
                          {hit.manual.title} · {hit.chapter.readingMinutes} min
                        </span>

                        {unlocked ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-forest/10 text-forest px-3 py-1 text-[12px] font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Desbloqueado • Offline</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber/15 text-ink px-3 py-1 text-[12px] font-bold tabular-nums">
                            <Lock className="w-3 h-3 text-amber" aria-hidden="true" />
                            <span>Pré-visualizar · {hit.manual.priceMt} MT</span>
                          </span>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          /* TAB 2: MEUS MANUAIS (Offline Vault + Uploaded PDFs + Bookmarks) */
          <section className="space-y-5 folio-enter">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-forest">
                  Cofre Encriptado Offline
                </p>
                <h1 className="mt-1 text-[24px] font-extrabold tracking-[-0.03em] text-ink leading-tight">
                  Meus Manuais
                </h1>
              </div>
              <span className="text-[12px] font-semibold text-ink-muted tabular-nums">
                {myManuals.length} {myManuals.length === 1 ? 'livro' : 'livros'}
              </span>
            </div>

            {/* PDF Upload Callout Card */}
            <div className="folio-card rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-dashed border-sand-strong">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-forest/10 text-forest flex items-center justify-center shrink-0">
                  <FileUp className="w-5 h-5" aria-hidden="true" />
                </div>
                <div>
                  <h2 className="text-[15px] font-bold text-ink">
                    Adaptar um novo livro em PDF
                  </h2>
                  <p className="mt-0.5 text-[13px] text-ink-soft leading-snug">
                    O Fólio extrai páginas, cria capítulos, gera resumos didáticos e guarda no teu
                    cofre offline e no CockroachDB.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onOpenPdfUpload}
                className="shrink-0 min-h-[44px] px-4 rounded-xl bg-forest hover:bg-forest-hover text-ivory text-[13px] font-bold cursor-pointer transition-colors"
              >
                Carregar PDF
              </button>
            </div>

            {/* Saved Bookmarks */}
            {bookmarkDetails.length > 0 && (
              <div>
                <h2 className="text-[12px] font-bold uppercase tracking-[0.1em] text-ink-muted mb-2.5 flex items-center gap-1.5">
                  <Bookmark className="w-3.5 h-3.5 text-amber fill-amber" aria-hidden="true" />
                  <span>Páginas Marcadas</span>
                </h2>
                <div className="space-y-2">
                  {bookmarkDetails.map((bm) => (
                    <button
                      key={`${bm.manualId}-${bm.chapterId}`}
                      type="button"
                      onClick={() => onOpenManualChapter(bm.manual, bm.chapter, bm.pageNumber)}
                      className="w-full text-left folio-card folio-card-interactive rounded-xl px-4 py-3 flex items-center justify-between gap-3 cursor-pointer"
                    >
                      <div className="min-w-0">
                        <p className="text-[14px] font-bold text-ink truncate">
                          {bm.chapter.title}
                        </p>
                        <p className="text-[12px] text-ink-muted truncate">
                          {bm.manual.subject} · {bm.manual.grade}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-md bg-amber-soft px-2 py-0.5 text-[12px] font-extrabold text-ink tabular-nums">
                        Pág. {bm.pageNumber}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Offline & Unlocked Manuals */}
            {myManuals.length === 0 ? (
              <div className="folio-card rounded-2xl p-8 text-center">
                <img
                  src="/assets/folio-symbol.png"
                  alt=""
                  aria-hidden="true"
                  className="w-12 h-12 mx-auto object-contain opacity-85"
                />
                <h2 className="mt-4 text-[17px] font-bold text-ink">
                  Ainda não tens manuais sincronizados
                </h2>
                <p className="mt-2 text-[14px] text-ink-soft max-w-[34ch] mx-auto leading-relaxed">
                  Pesquisa uma matéria e desbloqueia por 17 MT ou carrega um manual em PDF para ler
                  100% offline.
                </p>
                <button
                  type="button"
                  onClick={() => onTabChange('search')}
                  className="mt-5 min-h-[46px] px-5 rounded-xl bg-forest text-ivory text-[14px] font-bold cursor-pointer"
                >
                  Ir para Pesquisa
                </button>
              </div>
            ) : (
              <div className="space-y-3.5">
                {myManuals.map((manual) => {
                  const unlocked = isManualUnlocked(manual);
                  const receipt = unlocks[manual.id];
                  return (
                    <article key={manual.id} className="folio-card rounded-2xl p-4 sm:p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[11px] font-bold uppercase tracking-[0.09em] text-forest">
                              {manual.subject} · {manual.grade}
                            </span>
                            {manual.sourceType === 'pdf_upload' && (
                              <span className="rounded-full bg-amber-soft px-2 py-0.5 text-[10px] font-bold text-ink">
                                PDF Adaptado
                              </span>
                            )}
                          </div>
                          <h2 className="mt-1 text-[17px] font-bold text-ink leading-snug">
                            {manual.title}
                          </h2>
                          <p className="mt-0.5 text-[12px] text-ink-muted tabular-nums">
                            {manual.totalPages} págs. · {manual.chapters.length}{' '}
                            {manual.chapters.length === 1 ? 'capítulo' : 'capítulos'}
                            {receipt ? ` · Ref. ${receipt.reference}` : ''}
                          </p>
                        </div>

                        {manual.sourceType === 'pdf_upload' && (
                          <button
                            type="button"
                            onClick={() => onDeleteUploadedManual(manual.id)}
                            aria-label={`Remover ${manual.title}`}
                            className="w-9 h-9 rounded-xl flex items-center justify-center text-ink-muted hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {/* Quick Chapter Links */}
                      <div className="mt-3.5 pt-3 border-t border-sand/75 space-y-1.5">
                        {manual.chapters.slice(0, 3).map((ch) => (
                          <button
                            key={ch.id}
                            type="button"
                            onClick={() => onOpenManualChapter(manual, ch, ch.pageStart)}
                            className="w-full text-left flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl hover:bg-parchment/80 transition-colors cursor-pointer"
                          >
                            <span className="text-[13.5px] font-medium text-ink truncate">
                              {ch.title}
                            </span>
                            <span className="shrink-0 text-[12px] font-bold text-forest tabular-nums">
                              Pág. {ch.pageStart}
                            </span>
                          </button>
                        ))}
                      </div>

                      <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-forest">
                            <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>
                              {unlocked ? 'Sincronizado • Offline' : 'Modo Pré-visualização (17 MT)'}
                            </span>
                          </span>

                          {manual.sourceType === 'pdf_upload' &&
                            backendHealth.groqEnabled &&
                            !manual.aiEnriched && (
                              <button
                                type="button"
                                disabled={enrichingManualId === manual.id}
                                onClick={async () => {
                                  setEnrichingManualId(manual.id);
                                  try {
                                    await onEnrichManualWithAI(manual);
                                  } finally {
                                    setEnrichingManualId(null);
                                  }
                                }}
                                className="inline-flex items-center gap-1 rounded-full bg-amber-soft border border-amber/40 px-2.5 py-1 text-[11px] font-bold text-ink hover:bg-amber/30 transition-colors cursor-pointer disabled:opacity-60"
                              >
                                {enrichingManualId === manual.id ? (
                                  <>
                                    <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
                                    <span>A resumir com Groq…</span>
                                  </>
                                ) : (
                                  <>
                                    <Sparkles className="w-3 h-3 text-forest" aria-hidden="true" />
                                    <span>Melhorar com Groq IA</span>
                                  </>
                                )}
                              </button>
                            )}
                        </div>

                        {manual.chapters[0] && (
                          <button
                            type="button"
                            onClick={() =>
                              onOpenManualChapter(
                                manual,
                                manual.chapters[0],
                                manual.chapters[0].pageStart
                              )
                            }
                            className="min-h-[40px] px-4 rounded-xl bg-forest hover:bg-forest-hover text-ivory text-[13px] font-bold cursor-pointer transition-colors"
                          >
                            {unlocked ? 'Ler Offline' : 'Pré-visualizar'}
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </main>

      {/* Spec: Minimalist Bottom Navigation restricted to 2 Tabs */}
      <nav
        aria-label="Navegação principal"
        className="fixed bottom-0 inset-x-0 z-30 bg-ivory/95 backdrop-blur-md border-t border-sand pb-safe"
      >
        <div className="w-full max-w-2xl mx-auto grid grid-cols-2">
          <button
            type="button"
            onClick={() => onTabChange('search')}
            aria-current={activeTab === 'search' ? 'page' : undefined}
            className={`min-h-[58px] flex flex-col items-center justify-center gap-1 text-[12px] font-bold transition-colors cursor-pointer ${
              activeTab === 'search' ? 'text-forest' : 'text-ink-muted hover:text-ink'
            }`}
          >
            <Search
              className={`w-5 h-5 ${activeTab === 'search' ? 'stroke-[2.5]' : 'stroke-[1.9]'}`}
              aria-hidden="true"
            />
            <span>Pesquisar</span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange('library')}
            aria-current={activeTab === 'library' ? 'page' : undefined}
            className={`min-h-[58px] flex flex-col items-center justify-center gap-1 text-[12px] font-bold transition-colors cursor-pointer ${
              activeTab === 'library' ? 'text-forest' : 'text-ink-muted hover:text-ink'
            }`}
          >
            <div className="relative">
              <BookOpen
                className={`w-5 h-5 ${activeTab === 'library' ? 'stroke-[2.5]' : 'stroke-[1.9]'}`}
                aria-hidden="true"
              />
              {myManuals.length > 0 && (
                <span className="absolute -top-1.5 -right-3 min-w-[18px] h-[18px] px-1 rounded-full bg-amber text-ink text-[10px] font-extrabold flex items-center justify-center tabular-nums">
                  {myManuals.length}
                </span>
              )}
            </div>
            <span>Meus Manuais</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
