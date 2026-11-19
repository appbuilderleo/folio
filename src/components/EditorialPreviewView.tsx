import { ArrowLeft, BookOpen, Check, Lock, ShieldCheck, Sparkles } from 'lucide-react';
import type { Manual, ManualChapter } from '../types/folio';

interface EditorialPreviewViewProps {
  manual: Manual;
  chapter: ManualChapter;
  matchedPage: number;
  onBack: () => void;
  onOpenCheckout: () => void;
}

export function EditorialPreviewView({
  manual,
  chapter,
  matchedPage,
  onBack,
  onOpenCheckout,
}: EditorialPreviewViewProps) {
  const previewParas =
    chapter.previewParagraphs.length > 0
      ? chapter.previewParagraphs.slice(0, 2)
      : chapter.paragraphs.slice(0, 2);

  const teaserParagraph =
    chapter.paragraphs[2] ||
    'Os restantes parágrafos, exemplos resolvidos passo a passo, exercícios de consolidação e todos os capítulos deste manual ficam imediatamente disponíveis no leitor offline encriptado.';

  return (
    <div className="min-h-dvh flex flex-col bg-parchment pb-40">
      {/* Top Bar */}
      <header className="sticky top-0 z-30 bg-parchment/92 backdrop-blur-md border-b border-sand">
        <div className="w-full max-w-2xl mx-auto px-4 h-14 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onBack}
            aria-label="Voltar aos resultados"
            className="inline-flex items-center gap-1.5 min-h-[44px] pr-3 text-[14px] font-semibold text-ink hover:text-forest cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            <span>Voltar</span>
          </button>

          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[12px] font-semibold text-ink-soft truncate">
              {manual.subject} · {manual.grade}
            </span>
            <span className="shrink-0 rounded-md bg-amber-soft border border-amber/30 px-2 py-0.5 text-[12px] font-extrabold text-ink tabular-nums">
              Pág. {matchedPage}
            </span>
          </div>
        </div>
      </header>

      <main id="main" tabIndex={-1} className="w-full max-w-2xl mx-auto px-5 pt-6 flex-1">
        {/* Editorial Chapter Heading */}
        <div className="folio-enter">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-[0.11em] text-forest">
            <span>{chapter.unitLabel || manual.title}</span>
            <span aria-hidden="true">•</span>
            <span className="tabular-nums">
              Págs. {chapter.pageStart}–{chapter.pageEnd}
            </span>
          </div>

          <h1 className="mt-2.5 text-[24px] sm:text-[28px] font-extrabold tracking-[-0.03em] leading-[1.12] text-ink">
            {chapter.title}
          </h1>

          <p className="mt-2 text-[13px] text-ink-muted flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5 text-forest" aria-hidden="true" />
              Pré-visualização gratuita
            </span>
            <span>·</span>
            <span className="tabular-nums">{chapter.readingMinutes} min de leitura</span>
          </p>
        </div>

        {/* Free Pre-generated Summary Box */}
        <section
          aria-label="Resumo rápido gratuito"
          className="mt-5 folio-card rounded-2xl p-4 sm:p-5 folio-enter-d1"
        >
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-forest">
            <Sparkles className="w-3.5 h-3.5 text-amber" aria-hidden="true" />
            <span>Resumo pré-gerado (Grátis)</span>
          </div>
          <p className="mt-2 text-[14.5px] leading-[1.6] text-ink">{chapter.summary}</p>
          {chapter.keyTakeaways.length > 0 && (
            <ul className="mt-3 pt-3 border-t border-sand/80 space-y-1.5">
              {chapter.keyTakeaways.slice(0, 2).map((point, idx) => (
                <li key={idx} className="flex items-start gap-2 text-[13px] text-ink-soft">
                  <Check className="w-3.5 h-3.5 text-forest mt-1 shrink-0" aria-hidden="true" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Exact Page Editorial Excerpt: 2 sharp serif paragraphs + smooth fade-out */}
        <article className="mt-7 max-w-[60ch] folio-enter-d2">
          <div className="mb-4 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-ink-muted">
            <span className="h-[1px] flex-1 bg-sand" aria-hidden="true" />
            <span className="tabular-nums">Excerto real · Página {matchedPage}</span>
            <span className="h-[1px] flex-1 bg-sand" aria-hidden="true" />
          </div>

          <div className="space-y-5 font-editorial text-[17px] sm:text-[18px] leading-[1.72] text-ink">
            {previewParas.map((para, idx) => (
              <p key={idx}>{para}</p>
            ))}
          </div>

          {/* Fading 3rd paragraph into parchment */}
          <div className="relative mt-5 select-none overflow-hidden max-h-36" aria-hidden="true">
            <p className="font-editorial text-[17px] sm:text-[18px] leading-[1.72] text-ink/75 blur-[0.4px]">
              {teaserParagraph}
            </p>
            <div className="absolute inset-0 preview-fade-parchment" />
          </div>
        </article>

        {/* Transparent Table of Contents Preview: lets user verify all chapters before unlocking */}
        {manual.chapters.length > 1 && (
          <section
            aria-label="Capítulos incluídos neste manual"
            className="mt-8 folio-card rounded-2xl p-4 sm:p-5"
          >
            <div className="flex items-center justify-between gap-2 mb-3">
              <h2 className="text-[12px] font-bold uppercase tracking-[0.1em] text-forest">
                Incluído ao desbloquear este manual
              </h2>
              <span className="text-[12px] font-bold text-ink-muted tabular-nums">
                {manual.chapters.length} capítulos · {manual.totalPages} págs.
              </span>
            </div>
            <ul className="divide-y divide-sand/75">
              {manual.chapters.slice(0, 6).map((ch) => (
                <li key={ch.id} className="py-2.5 flex items-baseline justify-between gap-3">
                  <span className="text-[13.5px] font-semibold text-ink leading-snug">
                    {ch.title}
                  </span>
                  <span className="shrink-0 text-[12px] font-bold text-ink-muted tabular-nums">
                    Pág. {ch.pageStart}
                  </span>
                </li>
              ))}
              {manual.chapters.length > 6 && (
                <li className="pt-2.5 text-[12px] font-semibold text-forest">
                  + {manual.chapters.length - 6} capítulos adicionais indexados neste manual
                </li>
              )}
            </ul>
          </section>
        )}
      </main>

      {/* Fixed Bottom Unlock Dock */}
      <div className="fixed bottom-0 inset-x-0 z-30 bg-ivory/96 backdrop-blur-md border-t border-sand shadow-[0_-12px_32px_-12px_rgba(4,26,17,0.16)] pb-safe">
        <div className="w-full max-w-2xl mx-auto px-4 pt-3.5 pb-3">
          <div className="flex items-center justify-between gap-2 mb-2.5 text-[12px] text-ink-soft">
            <span className="inline-flex items-center gap-1.5 font-medium">
              <ShieldCheck className="w-4 h-4 text-forest shrink-0" aria-hidden="true" />
              <span>Taxa única de sincronização & acesso 100% offline</span>
            </span>
            <span className="shrink-0 font-bold text-ink tabular-nums">
              {manual.chapters.length}{' '}
              {manual.chapters.length === 1 ? 'capítulo' : 'capítulos'}
            </span>
          </div>

          <button
            type="button"
            onClick={onOpenCheckout}
            className="w-full min-h-[54px] px-5 rounded-2xl bg-amber hover:bg-amber-hover active:scale-[0.985] text-ink font-extrabold text-[15px] sm:text-[16px] tracking-[-0.01em] flex items-center justify-center gap-2 shadow-[0_10px_24px_-10px_rgba(234,146,34,0.65)] transition-all cursor-pointer tabular-nums"
          >
            <Lock className="w-4 h-4 stroke-[2.5]" aria-hidden="true" />
            <span>Desbloquear Manual Completo — {manual.priceMt} MT</span>
          </button>
        </div>
      </div>
    </div>
  );
}
