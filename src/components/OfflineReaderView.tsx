import { useEffect, useRef, useState } from 'react';
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
import type { BookmarkEntry, Manual, ManualChapter, ReaderTheme } from '../types/folio';

interface OfflineReaderViewProps {
  manual: Manual;
  chapter: ManualChapter;
  initialPage?: number;
  justUnlocked: boolean;
  bookmarks: BookmarkEntry[];
  onToggleBookmark: (entry: BookmarkEntry) => void;
  onSelectChapter: (chapter: ManualChapter) => void;
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
  manual,
  chapter,
  initialPage,
  justUnlocked,
  bookmarks,
  onToggleBookmark,
  onSelectChapter,
  onBack,
}: OfflineReaderViewProps) {
  const [prefs, setPrefs] = useState<ReaderPreferences>(() => loadReaderPreferences());
  const [showSettings, setShowSettings] = useState(false);
  const [showToc, setShowToc] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(true);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [syncPercent, setSyncPercent] = useState<number>(justUnlocked ? 12 : 100);
  const contentRef = useRef<HTMLDivElement>(null);

  const theme = THEME_CONFIG[prefs.theme];
  const fontSizePx = FONT_SIZES[prefs.fontSizeStep] ?? 18;

  const chapterIndex = manual.chapters.findIndex((c) => c.id === chapter.id);
  const prevChapter = chapterIndex > 0 ? manual.chapters[chapterIndex - 1] : null;
  const nextChapter =
    chapterIndex >= 0 && chapterIndex < manual.chapters.length - 1
      ? manual.chapters[chapterIndex + 1]
      : null;

  const isBookmarked = bookmarks.some(
    (b) => b.manualId === manual.id && b.chapterId === chapter.id
  );

  const updatePrefs = (patch: Partial<ReaderPreferences>) => {
    setPrefs((curr) => {
      const next = { ...curr, ...patch };
      saveReaderPreferences(next);
      return next;
    });
  };

  // Background encrypted sync progress simulation right after payment
  useEffect(() => {
    if (!justUnlocked) {
      setSyncPercent(100);
      return;
    }
    setSyncPercent(14);
    const steps = [38, 66, 89, 100];
    const timers = steps.map((val, idx) =>
      window.setTimeout(() => setSyncPercent(val), (idx + 1) * 420)
    );
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [justUnlocked, manual.id]);

  // Reset scroll on chapter change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    setScrollProgress(0);
  }, [chapter.id]);

  // Reading scroll progress
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

  // Scroll to specific page marker if requested inside a multi-page chapter
  useEffect(() => {
    if (!initialPage || initialPage === chapter.pageStart) return;
    const el = document.getElementById(`folio-page-${initialPage}`);
    if (el) {
      window.setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
    }
  }, [initialPage, chapter.id, chapter.pageStart]);

  const activePageLabel = initialPage ?? chapter.pageStart;

  return (
    <div className={`min-h-dvh flex flex-col transition-colors duration-200 ${theme.rootClass}`}>
      {/* Top Reading Progress Hairline */}
      <div className="fixed top-0 inset-x-0 z-50 h-[3px] bg-transparent pointer-events-none">
        <div
          className="h-full bg-amber transition-[width] duration-150"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      {/* Background Encrypted Sync Banner (appears smoothly right after unlock) */}
      {syncPercent < 100 && (
        <div
          role="status"
          aria-live="polite"
          className="sticky top-0 z-40 bg-forest text-ivory px-4 py-2 text-[12px] font-semibold"
        >
          <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-amber" aria-hidden="true" />
              <span>A encriptar e guardar manual no cofre offline…</span>
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

      {/* Reader Top Bar */}
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
            <p className="text-[12.5px] font-bold truncate">{manual.title}</p>
            <p className={`text-[11px] font-semibold tabular-nums ${theme.muted}`}>
              Pág. {activePageLabel}
              {chapter.pageEnd > chapter.pageStart ? `–${chapter.pageEnd}` : ''} ·{' '}
              {manual.subject}
            </p>
          </div>

          <div className="flex items-center gap-0.5 shrink-0">
            <button
              type="button"
              onClick={() =>
                onToggleBookmark({
                  manualId: manual.id,
                  chapterId: chapter.id,
                  pageNumber: activePageLabel,
                  savedAt: new Date().toISOString(),
                })
              }
              aria-label={isBookmarked ? 'Remover marcador de página' : 'Marcar esta página'}
              aria-pressed={isBookmarked}
              className="w-11 h-11 rounded-xl flex items-center justify-center hover:opacity-80 cursor-pointer"
            >
              <Bookmark
                className={`w-[19px] h-[19px] ${
                  isBookmarked ? 'text-amber fill-amber' : ''
                }`}
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
              aria-label="Índice de capítulos"
              aria-expanded={showToc}
              className="w-11 h-11 rounded-xl flex items-center justify-center hover:opacity-80 cursor-pointer"
            >
              <List className="w-[19px] h-[19px]" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Adaptive Reader Settings Popover (Theme: Papel, Sépia, Noite + Font A- / A+) */}
        {showSettings && (
          <div className={`border-t px-4 py-4 ${theme.cardBg} ${theme.border}`}>
            <div className="max-w-2xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              {/* Theme Switcher */}
              <div>
                <span className={`block text-[11px] font-bold uppercase tracking-[0.1em] mb-2 ${theme.muted}`}>
                  Modo de leitura
                </span>
                <div className="flex items-center gap-2">
                  {(
                    [
                      { id: 'paper', label: 'Papel', swatch: '#f3ebd6', ring: '#083b27' },
                      { id: 'sepia', label: 'Sépia', swatch: '#ebe0c5', ring: '#8a6b3e' },
                      { id: 'night', label: 'Noite', swatch: '#041a11', ring: '#ea9222' },
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

              {/* Font Size A- / A+ */}
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
                    aria-label="Diminuir tamanho da letra"
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
                    aria-label="Aumentar tamanho da letra"
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

      {/* Main Didactic Content */}
      <main
        id="main"
        tabIndex={-1}
        ref={contentRef}
        className="w-full max-w-[660px] mx-auto px-5 sm:px-6 pt-7 pb-16 flex-1"
      >
        {/* Offline Encrypted Trust Seal */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-5">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.11em] text-amber">
            <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Leitura 100% Offline • Encriptado</span>
          </span>
          <span className={`text-[12px] font-semibold tabular-nums ${theme.muted}`}>
            {chapter.readingMinutes} min de estudo
          </span>
        </div>

        {/* Chapter Title */}
        <p className={`text-[11px] font-bold uppercase tracking-[0.1em] ${theme.muted}`}>
          {chapter.unitLabel || `${manual.subject} · ${manual.grade}`}
        </p>
        <h1 className="mt-2 text-[26px] sm:text-[31px] font-extrabold tracking-[-0.03em] leading-[1.12]">
          {chapter.title}
        </h1>

        {/* Collapsible Didactic Study Summary & Key Takeaways */}
        <section
          className={`mt-6 rounded-2xl border overflow-hidden ${theme.cardBg} ${theme.border}`}
        >
          <button
            type="button"
            onClick={() => setSummaryOpen((v) => !v)}
            aria-expanded={summaryOpen}
            className="w-full px-4 sm:px-5 py-3.5 flex items-center justify-between gap-2 text-left cursor-pointer"
          >
            <span className="inline-flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.09em]">
              <Sparkles className="w-4 h-4 text-amber" aria-hidden="true" />
              <span>
                {chapter.summarySource === 'groq'
                  ? 'Resumo de Revisão · IA Groq'
                  : 'Resumo de Revisão Rápida'}
              </span>
            </span>
            {summaryOpen ? (
              <ChevronUp className="w-4 h-4 opacity-70" aria-hidden="true" />
            ) : (
              <ChevronDown className="w-4 h-4 opacity-70" aria-hidden="true" />
            )}
          </button>

          {summaryOpen && (
            <div className={`px-4 sm:px-5 pb-4 pt-1 border-t ${theme.border}`}>
              <p className="mt-2.5 text-[14.5px] leading-[1.6] opacity-90">{chapter.summary}</p>
              {chapter.keyTakeaways.length > 0 && (
                <ul className="mt-3.5 space-y-2">
                  {chapter.keyTakeaways.map((point, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-[13.5px] leading-snug">
                      <Check className="w-4 h-4 text-amber mt-0.5 shrink-0" aria-hidden="true" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              )}
              {chapter.keywords.length > 0 && (
                <div className="mt-3.5 flex flex-wrap gap-1.5">
                  {chapter.keywords.slice(0, 6).map((kw) => (
                    <span
                      key={kw}
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${theme.border} ${theme.muted}`}
                    >
                      #{kw}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        {/* Full Editorial Didactic Prose */}
        <article
          className="mt-8 font-editorial reader-prose space-y-5 max-w-[60ch]"
          style={{ fontSize: `${fontSizePx}px`, lineHeight: prefs.theme === 'night' ? 1.78 : 1.72 }}
        >
          {chapter.pages && chapter.pages.length > 0
            ? chapter.pages.map((pg, idx) => (
                <div key={pg.pageNumber} id={`folio-page-${pg.pageNumber}`} className="scroll-mt-20">
                  <div
                    className={`flex items-center gap-3 my-6 first:mt-0 text-[11px] font-sans font-bold uppercase tracking-[0.14em] ${theme.muted}`}
                  >
                    <span className={`h-[1px] flex-1 border-t ${theme.border}`} aria-hidden="true" />
                    <span className="tabular-nums">Página {pg.pageNumber}</span>
                    <span className={`h-[1px] flex-1 border-t ${theme.border}`} aria-hidden="true" />
                  </div>
                  <div className="space-y-5">
                    {pg.paragraphs.map((p, pIdx) => (
                      <p key={`${idx}-${pIdx}`}>{p}</p>
                    ))}
                  </div>
                </div>
              ))
            : chapter.paragraphs.map((p, idx) => <p key={idx}>{p}</p>)}
        </article>

        {/* Chapter Navigation */}
        <nav
          aria-label="Navegação entre capítulos"
          className={`mt-12 pt-6 border-t grid grid-cols-1 sm:grid-cols-2 gap-3 ${theme.border}`}
        >
          {prevChapter ? (
            <button
              type="button"
              onClick={() => onSelectChapter(prevChapter)}
              className={`p-4 rounded-2xl border text-left transition-opacity hover:opacity-85 cursor-pointer ${theme.cardBg} ${theme.border}`}
            >
              <span className={`inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.08em] ${theme.muted}`}>
                <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
                Anterior · Pág. {prevChapter.pageStart}
              </span>
              <span className="block mt-1 text-[14px] font-bold line-clamp-2">
                {prevChapter.title}
              </span>
            </button>
          ) : (
            <div />
          )}

          {nextChapter && (
            <button
              type="button"
              onClick={() => onSelectChapter(nextChapter)}
              className={`p-4 rounded-2xl border text-left sm:text-right transition-opacity hover:opacity-85 cursor-pointer ${theme.cardBg} ${theme.border}`}
            >
              <span className={`inline-flex items-center sm:justify-end gap-1 text-[11px] font-bold uppercase tracking-[0.08em] ${theme.muted}`}>
                Seguinte · Pág. {nextChapter.pageStart}
                <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
              </span>
              <span className="block mt-1 text-[14px] font-bold line-clamp-2">
                {nextChapter.title}
              </span>
            </button>
          )}
        </nav>
      </main>

      {/* Chapter Index / Table of Contents Drawer */}
      {showToc && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Índice do manual"
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
                  Índice do Manual
                </p>
                <h2 className="text-[16px] font-extrabold mt-0.5">{manual.title}</h2>
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
              {manual.chapters.map((ch, idx) => {
                const active = ch.id === chapter.id;
                return (
                  <li key={ch.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onSelectChapter(ch);
                        setShowToc(false);
                      }}
                      className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
                        active
                          ? 'border-amber bg-amber/15 font-bold'
                          : `${theme.border} hover:opacity-85`
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 text-[11px] font-bold uppercase tracking-[0.06em] opacity-75">
                        <span>Capítulo {idx + 1}</span>
                        <span className="tabular-nums">Pág. {ch.pageStart}</span>
                      </div>
                      <p className="mt-1 text-[14px] leading-snug">{ch.title}</p>
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
