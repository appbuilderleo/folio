import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Bookmark,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  List,
  Lock,
  Minus,
  Plus,
  ShieldCheck,
  Sparkles,
  Type,
  X,
} from 'lucide-react';
import {
  loadReaderPreferences,
  saveReaderPreferences,
  type ReaderPreferences,
} from '../lib/offlineStore';
import type {
  BookmarkEntry,
  ReaderTheme,
  UnlockedCurriculum,
  UnlockedTopic,
} from '../types/folio';
import { TopicVisualCard } from './EditorialDiagram';
import { isQuestionOrItem, normalizeParagraphsWithQuestions } from '../lib/questionUtils';

interface OfflineReaderViewProps {
  curriculum: UnlockedCurriculum;
  topic: UnlockedTopic;
  initialPage?: number;
  justUnlocked: boolean;
  bookmarks: BookmarkEntry[];
  onToggleBookmark: (entry: BookmarkEntry) => void;
  onSelectTopic: (topic: UnlockedTopic) => void;
  onBack: () => void;
}

const FONT_SIZES = [16, 18, 20, 22];

const THEME_CONFIG: Record<
  ReaderTheme,
  { label: string; rootClass: string; headerBg: string; cardBg: string; border: string; muted: string }
> = {
  paper: {
    label: 'Papel',
    rootClass: 'reader-paper',
    headerBg: 'bg-[#f3ebd6]/94',
    cardBg: 'bg-[#fcf8ee]',
    border: 'border-[#e3d7ba]',
    muted: 'text-[#696455]',
  },
  sepia: {
    label: 'Sépia',
    rootClass: 'reader-sepia',
    headerBg: 'bg-[#ebe0c5]/94',
    cardBg: 'bg-[#f4ebd4]',
    border: 'border-[#d6c6a2]',
    muted: 'text-[#635642]',
  },
  night: {
    label: 'Noite',
    rootClass: 'reader-night',
    headerBg: 'bg-[#041a11]/94',
    cardBg: 'bg-[#08261a]',
    border: 'border-[#164230]',
    muted: 'text-[#a3b5aa]',
  },
};

export function OfflineReaderView({
  curriculum,
  topic,
  initialPage,
  justUnlocked,
  bookmarks,
  onToggleBookmark,
  onSelectTopic,
  onBack,
}: OfflineReaderViewProps) {
  const [prefs, setPrefs] = useState<ReaderPreferences>(() => loadReaderPreferences());
  const [showSettings, setShowSettings] = useState(false);
  const [showToc, setShowToc] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(true);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [syncPercent, setSyncPercent] = useState<number>(justUnlocked ? 16 : 100);

  const theme = THEME_CONFIG[prefs.theme];
  const fontSizePx = FONT_SIZES[prefs.fontSizeStep] ?? 18;

  const topicIndex = curriculum.topics.findIndex((t) => t.id === topic.id);
  const prevTopic = topicIndex > 0 ? curriculum.topics[topicIndex - 1] : null;
  const nextTopic =
    topicIndex >= 0 && topicIndex < curriculum.topics.length - 1
      ? curriculum.topics[topicIndex + 1]
      : null;

  const isBookmarked = bookmarks.some(
    (b) => b.curriculumId === curriculum.id && b.topicId === topic.id
  );

  const updatePrefs = (patch: Partial<ReaderPreferences>) => {
    setPrefs((curr) => {
      const next = { ...curr, ...patch };
      saveReaderPreferences(next);
      return next;
    });
  };

  useEffect(() => {
    if (!justUnlocked) {
      setSyncPercent(100);
      return;
    }
    setSyncPercent(16);
    const steps = [44, 74, 92, 100];
    const timers = steps.map((val, idx) =>
      window.setTimeout(() => setSyncPercent(val), (idx + 1) * 380)
    );
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [justUnlocked, curriculum.id]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    setScrollProgress(0);
  }, [topic.id]);

  useEffect(() => {
    const onScroll = () => {
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - doc.clientHeight;
      if (scrollable <= 0) {
        setScrollProgress(100);
        return;
      }
      setScrollProgress(Math.min(100, Math.round((window.scrollY / scrollable) * 100)));
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!initialPage || initialPage === topic.pageNumber) return;
    const el = document.getElementById(`folio-page-${initialPage}`);
    if (el) {
      window.setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
    }
  }, [initialPage, topic.id, topic.pageNumber]);

  const activePage = initialPage ?? topic.pageNumber;

  return (
    <div className={`min-h-dvh flex flex-col transition-colors duration-200 ${theme.rootClass}`}>
      {/* Reading Progress Hairline */}
      <div className="fixed top-0 inset-x-0 z-50 h-[3px] bg-transparent pointer-events-none">
        <div
          className="h-full bg-amber transition-[width] duration-150"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      {/* Encrypted Offline Sync Progress Bar */}
      {syncPercent < 100 && (
        <div
          role="status"
          aria-live="polite"
          className="sticky top-0 z-40 bg-forest text-ivory px-4 py-2 text-[12px] font-semibold"
        >
          <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-amber" aria-hidden="true" />
              <span>A encriptar matéria para estudo 100% offline…</span>
            </span>
            <span className="tabular-nums font-bold text-amber">{syncPercent}%</span>
          </div>
          <div className="max-w-2xl mx-auto mt-1.5 h-1 rounded-full bg-ivory/20 overflow-hidden">
            <div
              className="h-full bg-amber transition-all duration-300"
              style={{ width: `${syncPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Top Bar */}
      <header
        className={`sticky top-0 z-30 backdrop-blur-md border-b transition-colors ${theme.headerBg} ${theme.border}`}
      >
        <div className="w-full max-w-2xl mx-auto px-3 sm:px-4 h-14 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onBack}
            aria-label="Voltar"
            className="inline-flex items-center gap-1.5 min-h-[44px] px-2 rounded-xl hover:opacity-80 cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            <span className="text-[14px] font-semibold hidden sm:inline">Voltar</span>
          </button>

          <div className="min-w-0 text-center flex-1 px-1">
            <p className="text-[12.5px] font-bold truncate">
              {curriculum.subject} · {curriculum.grade}
            </p>
            <p className={`text-[11px] font-semibold tabular-nums ${theme.muted}`}>
              Pág. {activePage}
              {topic.pageEnd > topic.pageNumber ? `–${topic.pageEnd}` : ''}
            </p>
          </div>

          <div className="flex items-center gap-0.5 shrink-0">
            <button
              type="button"
              onClick={() =>
                onToggleBookmark({
                  curriculumId: curriculum.id,
                  topicId: topic.id,
                  subject: curriculum.subject,
                  grade: curriculum.grade,
                  topicTitle: topic.title,
                  pageNumber: activePage,
                  savedAt: new Date().toISOString(),
                })
              }
              aria-label={isBookmarked ? 'Remover marcador' : 'Marcar esta página'}
              aria-pressed={isBookmarked}
              className="w-11 h-11 rounded-xl flex items-center justify-center hover:opacity-80 cursor-pointer"
            >
              <Bookmark
                className={`w-[19px] h-[19px] ${isBookmarked ? 'text-amber fill-amber' : ''}`}
                aria-hidden="true"
              />
            </button>

            <button
              type="button"
              onClick={() => {
                setShowSettings((v) => !v);
                setShowToc(false);
              }}
              aria-label="Aparência e tamanho da letra"
              aria-expanded={showSettings}
              className="w-11 h-11 rounded-xl flex items-center justify-center hover:opacity-80 cursor-pointer"
            >
              <Type className="w-[19px] h-[19px]" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={() => {
                setShowToc((v) => !v);
                setShowSettings(false);
              }}
              aria-label="Índice de temas"
              aria-expanded={showToc}
              className="w-11 h-11 rounded-xl flex items-center justify-center hover:opacity-80 cursor-pointer"
            >
              <List className="w-[19px] h-[19px]" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Theme & Font Controls */}
        {showSettings && (
          <div className={`border-t px-4 py-4 ${theme.cardBg} ${theme.border}`}>
            <div className="max-w-2xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className={`block text-[11px] font-bold uppercase tracking-[0.1em] mb-2 ${theme.muted}`}>
                  Modo de leitura
                </span>
                <div className="flex items-center gap-2">
                  {(
                    [
                      { id: 'paper', label: 'Papel', swatch: '#f3ebd6' },
                      { id: 'sepia', label: 'Sépia', swatch: '#ebe0c5' },
                      { id: 'night', label: 'Noite', swatch: '#041a11' },
                    ] as const
                  ).map((item) => {
                    const active = prefs.theme === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => updatePrefs({ theme: item.id })}
                        aria-pressed={active}
                        className={`inline-flex items-center gap-2 min-h-[40px] px-3.5 rounded-full border text-[13px] font-bold cursor-pointer transition-all ${
                          active
                            ? 'border-amber ring-2 ring-amber/40'
                            : `${theme.border} opacity-80 hover:opacity-100`
                        }`}
                      >
                        <span
                          className="w-4 h-4 rounded-full border border-black/20"
                          style={{ backgroundColor: item.swatch }}
                          aria-hidden="true"
                        />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <span className={`block text-[11px] font-bold uppercase tracking-[0.1em] mb-2 ${theme.muted}`}>
                  Tamanho da letra ({fontSizePx}px)
                </span>
                <div className="inline-flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      updatePrefs({ fontSizeStep: Math.max(0, prefs.fontSizeStep - 1) })
                    }
                    disabled={prefs.fontSizeStep === 0}
                    aria-label="Diminuir letra"
                    className={`min-h-[40px] min-w-[52px] px-3 rounded-xl border font-bold text-[14px] inline-flex items-center justify-center gap-1 cursor-pointer disabled:opacity-40 ${theme.border}`}
                  >
                    <Minus className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>A</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updatePrefs({
                        fontSizeStep: Math.min(FONT_SIZES.length - 1, prefs.fontSizeStep + 1),
                      })
                    }
                    disabled={prefs.fontSizeStep === FONT_SIZES.length - 1}
                    aria-label="Aumentar letra"
                    className={`min-h-[40px] min-w-[52px] px-3 rounded-xl border font-bold text-[15px] inline-flex items-center justify-center gap-1 cursor-pointer disabled:opacity-40 ${theme.border}`}
                  >
                    <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>A</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Didactic Reading Body */}
      <main id="main" tabIndex={-1} className="w-full max-w-[660px] mx-auto px-5 sm:px-6 pt-7 pb-16 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-5">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.11em] text-amber">
            <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Estudo 100% Offline • Protegido</span>
          </span>
          <span className={`text-[12px] font-semibold tabular-nums ${theme.muted}`}>
            {topic.readingMinutes} min de estudo
          </span>
        </div>

        <p className={`text-[11px] font-bold uppercase tracking-[0.1em] ${theme.muted}`}>
          {topic.unitLabel || `${curriculum.subject} · ${curriculum.grade}`}
        </p>
        <h1 className="mt-2 text-[26px] sm:text-[31px] font-extrabold tracking-[-0.03em] leading-[1.12]">
          {topic.title}
        </h1>

        {/* Collapsible Study Summary */}
        <section className={`mt-6 rounded-2xl border overflow-hidden ${theme.cardBg} ${theme.border}`}>
          <button
            type="button"
            onClick={() => setSummaryOpen((v) => !v)}
            aria-expanded={summaryOpen}
            className="w-full px-4 sm:px-5 py-3.5 flex items-center justify-between gap-2 text-left cursor-pointer"
          >
            <span className="inline-flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.09em]">
              <Sparkles className="w-4 h-4 text-amber" aria-hidden="true" />
              <span>Resumo de Revisão Rápida</span>
            </span>
            {summaryOpen ? (
              <ChevronUp className="w-4 h-4 opacity-70" aria-hidden="true" />
            ) : (
              <ChevronDown className="w-4 h-4 opacity-70" aria-hidden="true" />
            )}
          </button>

          {summaryOpen && (
            <div className={`px-4 sm:px-5 pb-4 pt-1 border-t ${theme.border}`}>
              <p className="mt-2.5 text-[14.5px] leading-[1.6] opacity-90">
                {topic.summaryHalfParagraph}
              </p>
              {topic.keyTakeaways.length > 0 && (
                <ul className="mt-3.5 space-y-2">
                  {topic.keyTakeaways.map((point, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-[13.5px] leading-snug">
                      <Check className="w-4 h-4 text-amber mt-0.5 shrink-0" aria-hidden="true" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>

        {/* Editorial Vector Schematics (theme-adaptive SVG) */}
        {(topic.visuals || [])
          .filter((v) => v.kind === 'vector_diagram')
          .map((vis) => (
            <TopicVisualCard key={vis.id} visual={vis} theme={prefs.theme} />
          ))}

        {/* Full Editorial Prose + Inline Original Figures Mapped to Exact Pages */}
        <article
          className="mt-8 font-editorial reader-prose space-y-5 max-w-[60ch] select-none"
          style={{ fontSize: `${fontSizePx}px`, lineHeight: prefs.theme === 'night' ? 1.78 : 1.72 }}
        >
          {topic.pages && topic.pages.length > 0
            ? (() => {
                const extractedFigs = (topic.visuals || []).filter(
                  (v) => v.kind === 'extracted_figure'
                );
                const renderedFigIds = new Set<string>();
                const pageBlocks = topic.pages.map((pg, idx) => {
                  const pageFigs = extractedFigs.filter((f) => f.pageNumber === pg.pageNumber);
                  pageFigs.forEach((f) => renderedFigIds.add(f.id));
                  return (
                    <div key={pg.pageNumber} id={`folio-page-${pg.pageNumber}`} className="scroll-mt-20">
                      <div
                        className={`flex items-center gap-3 my-6 first:mt-0 text-[11px] font-sans font-bold uppercase tracking-[0.14em] ${theme.muted}`}
                      >
                        <span className={`h-[1px] flex-1 border-t ${theme.border}`} aria-hidden="true" />
                        <span className="tabular-nums">Página {pg.pageNumber}</span>
                        <span className={`h-[1px] flex-1 border-t ${theme.border}`} aria-hidden="true" />
                      </div>
                      <div className="space-y-4">
                        {normalizeParagraphsWithQuestions(pg.paragraphs).map((p, pIdx) => {
                          const isQ = isQuestionOrItem(p);
                          return (
                            <p
                              key={`${idx}-${pIdx}`}
                              className={
                                isQ
                                  ? 'pl-3.5 border-l-2 border-amber/70 my-3 font-medium'
                                  : undefined
                              }
                            >
                              {p}
                            </p>
                          );
                        })}
                      </div>
                      {pageFigs.map((fig) => (
                        <TopicVisualCard key={fig.id} visual={fig} theme={prefs.theme} />
                      ))}
                    </div>
                  );
                });

                const unmappedFigs = extractedFigs.filter((f) => !renderedFigIds.has(f.id));
                return (
                  <>
                    {pageBlocks}
                    {unmappedFigs.map((fig) => (
                      <TopicVisualCard key={fig.id} visual={fig} theme={prefs.theme} />
                    ))}
                  </>
                );
              })()
            : (
              <>
                {normalizeParagraphsWithQuestions(topic.paragraphs).map((p, idx) => {
                  const isQ = isQuestionOrItem(p);
                  return (
                    <p
                      key={idx}
                      className={
                        isQ
                          ? 'pl-3.5 border-l-2 border-amber/70 my-3 font-medium'
                          : undefined
                      }
                    >
                      {p}
                    </p>
                  );
                })}
                {(topic.visuals || [])
                  .filter((v) => v.kind === 'extracted_figure')
                  .map((fig) => (
                    <TopicVisualCard key={fig.id} visual={fig} theme={prefs.theme} />
                  ))}
              </>
            )}
        </article>

        {/* Topic Navigation */}
        <nav
          aria-label="Navegação entre temas"
          className={`mt-12 pt-6 border-t grid grid-cols-1 sm:grid-cols-2 gap-3 ${theme.border}`}
        >
          {prevTopic ? (
            <button
              type="button"
              onClick={() => onSelectTopic(prevTopic)}
              className={`p-4 rounded-2xl border text-left transition-opacity hover:opacity-85 cursor-pointer ${theme.cardBg} ${theme.border}`}
            >
              <span className={`inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.08em] ${theme.muted}`}>
                <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
                Anterior · Pág. {prevTopic.pageNumber}
              </span>
              <span className="block mt-1 text-[14px] font-bold line-clamp-2">
                {prevTopic.title}
              </span>
            </button>
          ) : (
            <div />
          )}

          {nextTopic && (
            <button
              type="button"
              onClick={() => onSelectTopic(nextTopic)}
              className={`p-4 rounded-2xl border text-left sm:text-right transition-opacity hover:opacity-85 cursor-pointer ${theme.cardBg} ${theme.border}`}
            >
              <span className={`inline-flex items-center sm:justify-end gap-1 text-[11px] font-bold uppercase tracking-[0.08em] ${theme.muted}`}>
                Seguinte · Pág. {nextTopic.pageNumber}
                <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
              </span>
              <span className="block mt-1 text-[14px] font-bold line-clamp-2">
                {nextTopic.title}
              </span>
            </button>
          )}
        </nav>
      </main>

      {/* Topic Index Drawer */}
      {showToc && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Índice da matéria"
          className="fixed inset-0 z-50 flex justify-end bg-ink/50 backdrop-blur-[2px]"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowToc(false);
          }}
        >
          <div
            className={`w-full max-w-sm h-full overflow-y-auto p-5 border-l flex flex-col ${theme.cardBg} ${theme.border}`}
          >
            <div className="flex items-center justify-between gap-2 pb-4 border-b border-current/10">
              <div>
                <p className={`text-[11px] font-bold uppercase tracking-[0.1em] ${theme.muted}`}>
                  Temas de {curriculum.grade}
                </p>
                <h2 className="text-[17px] font-extrabold mt-0.5">{curriculum.subject}</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowToc(false)}
                aria-label="Fechar índice"
                className="w-10 h-10 rounded-full flex items-center justify-center hover:opacity-75 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <ul className="mt-4 space-y-2 flex-1">
              {curriculum.topics.map((t, idx) => {
                const active = t.id === topic.id;
                return (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onSelectTopic(t);
                        setShowToc(false);
                      }}
                      className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
                        active
                          ? 'border-amber bg-amber/15 font-bold'
                          : `${theme.border} hover:opacity-85`
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 text-[11px] font-bold uppercase tracking-[0.06em] opacity-75">
                        <span>Tema {idx + 1}</span>
                        <span className="tabular-nums">Pág. {t.pageNumber}</span>
                      </div>
                      <p className="mt-1 text-[14px] leading-snug">{t.title}</p>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
