import { useState } from 'react';
import { ArrowRight, BookOpenCheck, ShieldCheck, Smartphone } from 'lucide-react';

interface WelcomeHookProps {
  onStartSearch: (initialQuery?: string) => void;
  totalCurriculaCount: number;
}

const SPECIMEN_FOLIOS = [
  {
    id: 'fotossintese',
    chip: 'Fotossíntese',
    query: 'Fotossíntese',
    subject: 'Biologia',
    grade: '10.ª Classe',
    page: 84,
    topic: 'Fotossíntese e Fase Fotoquímica',
    excerpt:
      'As plantas convertem luz solar, água e CO₂ em glicose e oxigénio nos cloroplastos, entre os tilacoides e o estroma.',
  },
  {
    id: 'equacoes',
    chip: 'Equações 2.º Grau',
    query: 'Equações do 2.º Grau',
    subject: 'Matemática',
    grade: '9.ª Classe',
    page: 112,
    topic: 'Equações do 2.º Grau e Fórmula Resolvente',
    excerpt:
      'Com Δ = b² − 4ac descobres quantas raízes reais tem ax² + bx + c = 0 antes mesmo de concluir o cálculo.',
  },
  {
    id: 'independencia',
    chip: 'Independência',
    query: 'Independência de Moçambique',
    subject: 'História',
    grade: '10.ª Classe',
    page: 67,
    topic: 'Luta de Libertação e 25 de Junho de 1975',
    excerpt:
      'Dos Acordos de Lusaka à proclamação da soberania nacional no Estádio da Machava.',
  },
];

export function WelcomeHook({ onStartSearch, totalCurriculaCount }: WelcomeHookProps) {
  const [activeSpecimenIdx, setActiveSpecimenIdx] = useState(0);
  const specimen = SPECIMEN_FOLIOS[activeSpecimenIdx];

  return (
    <main
      id="main"
      tabIndex={-1}
      className="min-h-dvh flex flex-col justify-between bg-parchment px-5 pt-5 pb-7 sm:px-8 sm:py-8"
    >
      {/* Top Bar: Official Logo + Grade Badge */}
      <header className="w-full max-w-5xl mx-auto flex items-center justify-between gap-3 folio-enter">
        <img
          src="/assets/folio-logo.png"
          alt="Fólio"
          width={156}
          height={40}
          className="h-8 sm:h-9 w-auto object-contain"
        />
        <span className="inline-flex items-center rounded-full bg-ivory border border-sand px-3 py-1.5 text-[12px] font-semibold tracking-[0.02em] text-forest">
          1.ª à 12.ª Classe
        </span>
      </header>

      {/* Main Hook Spread */}
      <section className="w-full max-w-5xl mx-auto my-auto py-7 sm:py-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* Left / Top: Short, gripping copy + single primary CTA */}
        <div className="lg:col-span-6 flex flex-col items-start">
          <p className="text-[11px] sm:text-xs font-bold uppercase tracking-[0.14em] text-forest/80 folio-enter">
            Matéria escolar · Moçambique
          </p>

          <h1 className="mt-3 text-[2.15rem] sm:text-[3.1rem] font-extrabold tracking-[-0.035em] leading-[1.03] text-ink max-w-[14ch] folio-enter-d1">
            A página certa para cada dúvida.
          </h1>

          <p className="mt-4 text-[16px] sm:text-[17px] leading-[1.55] text-ink-soft max-w-[38ch] folio-enter-d2">
            Escreve o tema da escola. Lê o resumo grátis, vai direto à página exata e estuda offline
            por <strong className="font-bold text-ink tabular-nums">17 MT</strong>.
          </p>

          {/* Compact Editorial Proof Strip */}
          <dl className="mt-6 w-full max-w-md grid grid-cols-3 border-y border-sand py-3.5 gap-2 folio-enter-d2">
            <div className="flex flex-col gap-1 pr-2">
              <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-muted">
                <BookOpenCheck className="w-3.5 h-3.5 text-forest shrink-0" aria-hidden="true" />
                <span>Direto</span>
              </dt>
              <dd className="text-[13px] font-bold text-ink leading-tight">Página exata</dd>
            </div>

            <div className="flex flex-col gap-1 px-2 border-x border-sand">
              <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-muted">
                <Smartphone className="w-3.5 h-3.5 text-amber shrink-0" aria-hidden="true" />
                <span>Taxa única</span>
              </dt>
              <dd className="text-[13px] font-bold text-ink leading-tight tabular-nums">
                17 MT · M-Pesa
              </dd>
            </div>

            <div className="flex flex-col gap-1 pl-2">
              <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-muted">
                <ShieldCheck className="w-3.5 h-3.5 text-forest shrink-0" aria-hidden="true" />
                <span>Sem internet</span>
              </dt>
              <dd className="text-[13px] font-bold text-ink leading-tight">100% offline</dd>
            </div>
          </dl>

          {/* Single Primary CTA */}
          <div className="mt-7 w-full sm:w-auto folio-enter-d3">
            <button
              type="button"
              onClick={() => onStartSearch()}
              className="group w-full sm:w-auto inline-flex items-center justify-center gap-2.5 min-h-[54px] px-8 rounded-2xl bg-forest hover:bg-forest-hover active:scale-[0.985] text-ivory font-bold text-[15.5px] tracking-[-0.01em] shadow-[0_12px_26px_-10px_rgba(8,59,39,0.55)] transition-all duration-200 cursor-pointer"
            >
              <span>Começar a Pesquisar</span>
              <ArrowRight
                className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1"
                aria-hidden="true"
              />
            </button>
          </div>
        </div>

        {/* Right / Bottom: Signature Interactive Folio Specimen */}
        <div className="lg:col-span-6 folio-enter-d2">
          <div className="folio-specimen rounded-2xl p-5 sm:p-6 overflow-hidden">
            <div
              className="absolute top-0 right-5 w-7 h-11 bg-amber folio-ribbon shadow-sm"
              aria-hidden="true"
            />

            <div className="flex items-center gap-1.5 pr-9 overflow-x-auto no-scrollbar">
              {SPECIMEN_FOLIOS.map((item, idx) => {
                const active = idx === activeSpecimenIdx;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveSpecimenIdx(idx)}
                    aria-pressed={active}
                    className={`shrink-0 min-h-[34px] px-3 rounded-full text-[12px] font-semibold transition-all duration-200 cursor-pointer ${active
                        ? 'bg-forest text-ivory'
                        : 'bg-parchment/80 text-ink-soft hover:bg-parchment-deep'
                      }`}
                  >
                    {item.chip}
                  </button>
                );
              })}
            </div>

            <div className="mt-5 pt-4 border-t border-sand/80">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[11px] font-bold uppercase tracking-[0.11em] text-forest">
                  {specimen.subject} · {specimen.grade}
                </span>
                <span className="inline-flex items-center rounded-md bg-amber-soft px-2 py-0.5 text-[12px] font-extrabold text-ink tabular-nums">
                  Pág. {specimen.page}
                </span>
              </div>

              <h2 className="mt-2.5 text-[18px] sm:text-[20px] font-bold tracking-[-0.02em] text-ink leading-snug">
                {specimen.topic}
              </h2>

              <p className="mt-2.5 font-editorial text-[14px] sm:text-[15px] leading-[1.68] text-ink-soft">
                “{specimen.excerpt}”
              </p>

              <div className="mt-4 pt-3.5 border-t border-sand/70 flex items-center justify-between gap-2">
                <span className="text-[12px] text-ink-muted">
                  Resumo grátis sem precisar de conta
                </span>
                <button
                  type="button"
                  onClick={() => onStartSearch(specimen.query)}
                  className="inline-flex items-center gap-1 text-[13px] font-bold text-forest hover:text-amber transition-colors cursor-pointer min-h-[36px] px-1"
                >
                  <span>Abrir página</span>
                  <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quiet Editorial Footer */}
      <footer className="w-full max-w-5xl mx-auto pt-2 flex flex-wrap items-center justify-between gap-2 text-[12px] text-ink-muted">
        <span>Para alunos, pais e explicadores.</span>
        <div className="flex flex-wrap items-center gap-3 tabular-nums">
          <a
            href="/materias"
            className="font-semibold text-forest underline decoration-sand-strong underline-offset-4 hover:text-amber transition-colors"
          >
            Índice de matérias
          </a>
          <span aria-hidden="true">·</span>
          <span>
            {totalCurriculaCount > 0
              ? `${totalCurriculaCount} disciplinas indexadas`
              : 'Currículo SNE · 1.ª à 12.ª Classe'}
          </span>
        </div>
      </footer>
    </main>
  );
}
