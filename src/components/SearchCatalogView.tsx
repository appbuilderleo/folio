import { useEffect, useRef, useState } from 'react';
import {
  Bookmark,
  BookOpen,
  CheckCircle2,
  Lock,
  LogOut,
  Search,
  Smartphone,
  User,
  X,
} from 'lucide-react';
import type { MySubjectOverview } from '../lib/apiClient';
import type {
  AuthSessionState,
  BookmarkEntry,
  SchoolCycle,
  TopicSearchItem,
} from '../types/folio';
import { AuthCardContent } from './AuthSheet';

interface SearchCatalogViewProps {
  topics: TopicSearchItem[];
  loadingTopics: boolean;
  query: string;
  onQueryChange: (q: string) => void;
  cycle: SchoolCycle;
  onCycleChange: (cycle: SchoolCycle) => void;
  activeTab: 'search' | 'library';
  onTabChange: (tab: 'search' | 'library') => void;
  session: AuthSessionState | null;
  mySubjects: MySubjectOverview[];
  loadingSubjects: boolean;
  bookmarks: BookmarkEntry[];
  onSelectTopic: (topic: TopicSearchItem) => void;
  onOpenUnlockedSubject: (curriculumId: string, topicId?: string, pageNumber?: number) => void;
  onAuthSuccess: (session: AuthSessionState) => void;
  onOpenLoginModal: () => void;
  onLogout: () => void;
  onBackToHome: () => void;
}

const CYCLE_FILTERS: Array<{ id: SchoolCycle; label: string }> = [
  { id: 'all', label: 'Todas' },
  { id: '1-6', label: '1.ª–6.ª Classe' },
  { id: '7-9', label: '7.ª–9.ª Classe' },
  { id: '10-12', label: '10.ª–12.ª Classe' },
];

const QUICK_TOPICS: string[] = [
  'Fotossíntese',
  'Equações do 2.º Grau',
  'Independência de Moçambique',
  'Classes de Palavras',
  'Cinemática',
  'Ciclo da Água',
];

function normalizeSimple(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

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
  topics,
  loadingTopics,
  query,
  onQueryChange,
  cycle,
  onCycleChange,
  activeTab,
  onTabChange,
  session,
  mySubjects,
  loadingSubjects,
  bookmarks,
  onSelectTopic,
  onOpenUnlockedSubject,
  onAuthSuccess,
  onOpenLoginModal,
  onLogout,
  onBackToHome,
}: SearchCatalogViewProps) {
  const [shimmering, setShimmering] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Spec: crisp 350ms Skeleton Shimmer on filter/search changes
  useEffect(() => {
    setShimmering(true);
    const t = window.setTimeout(() => setShimmering(false), 350);
    return () => window.clearTimeout(t);
  }, [query, cycle]);

  const showSkeleton = shimmering || loadingTopics;

  return (
    <div className="min-h-dvh flex flex-col bg-parchment pb-24">
      {/* Sticky Editorial Header (Strict: ZERO admin/PDF/tech links) */}
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

          {session ? (
            <button
              type="button"
              onClick={() => onTabChange('library')}
              className="inline-flex items-center gap-2 min-h-[38px] px-3 rounded-full bg-ivory border border-sand text-[12px] font-bold text-forest hover:border-forest/40 transition-colors cursor-pointer max-w-[190px]"
            >
              <User className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">{session.user.email.split('@')[0]}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenLoginModal}
              className="inline-flex items-center gap-1.5 min-h-[38px] px-3.5 rounded-full bg-ivory border border-sand-strong text-[13px] font-bold text-forest hover:border-forest transition-colors cursor-pointer"
            >
              <User className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Entrar</span>
            </button>
          )}
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
                type="text"
                inputMode="search"
                enterKeyHint="search"
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                placeholder="Pesquisar matéria, tema ou assunto..."
                aria-label="Pesquisar matéria, tema ou assunto"
                className="w-full min-h-[52px] pl-11 pr-11 rounded-full bg-ivory border border-sand-strong text-[15px] text-ink placeholder:text-ink-muted shadow-[0_2px_10px_-4px_rgba(4,26,17,0.08)] focus:border-forest transition-colors"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    onQueryChange('');
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
                const active = cycle === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onCycleChange(item.id)}
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
            </div>

            {/* Quick Topic Chips */}
            <div className="mt-3 flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
              <span className="shrink-0 text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted mr-1">
                Temas:
              </span>
              {QUICK_TOPICS.map((topic) => {
                const active = normalizeSimple(query) === normalizeSimple(topic);
                return (
                  <button
                    key={topic}
                    type="button"
                    onClick={() => onQueryChange(active ? '' : topic)}
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
                  ? `Matérias para “${query.trim()}”`
                  : 'Matérias escolares prontas a estudar'}
              </h1>
              <span className="text-[12px] font-semibold text-ink-muted tabular-nums">
                {showSkeleton ? '…' : `${topics.length} ${topics.length === 1 ? 'tema' : 'temas'}`}
              </span>
            </div>

            {/* Skeleton Shimmer */}
            {showSkeleton ? (
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
                      <div className="h-3.5 w-4/5 rounded skeleton-pulse" />
                    </div>
                    <div className="pt-2 flex items-center justify-between">
                      <div className="h-3.5 w-28 rounded skeleton-pulse" />
                      <div className="h-7 w-36 rounded-full skeleton-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : topics.length === 0 ? (
              <div className="folio-card rounded-2xl p-7 text-center">
                <img
                  src="/assets/folio-symbol.png"
                  alt=""
                  aria-hidden="true"
                  className="w-11 h-11 mx-auto opacity-85 object-contain"
                />
                <h2 className="mt-4 text-[17px] font-bold text-ink">
                  Nenhum tema encontrado para “{query}”
                </h2>
                <p className="mt-2 text-[14px] text-ink-soft max-w-[34ch] mx-auto leading-relaxed">
                  Experimenta outro termo escolar ou muda o filtro de classe acima.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    onQueryChange('');
                    onCycleChange('all');
                  }}
                  className="mt-5 min-h-[44px] px-5 rounded-xl bg-forest text-ivory text-[13px] font-bold cursor-pointer"
                >
                  Ver todas as matérias
                </button>
              </div>
            ) : (
              <div className="space-y-3.5">
                {topics.map((topic) => (
                  <article
                    key={topic.id}
                    onClick={() => onSelectTopic(topic)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelectTopic(topic);
                      }
                    }}
                    className="folio-card folio-card-interactive rounded-2xl p-4 sm:p-5 cursor-pointer relative overflow-hidden"
                  >
                    {/* Strict Semantic Row: Disciplina · Classe + Página Exata */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-[11px] font-bold uppercase tracking-[0.09em] text-forest">
                          {topic.subject}
                        </span>
                        <span className="text-sand-strong" aria-hidden="true">
                          •
                        </span>
                        <span className="text-[12px] font-semibold text-ink-soft">
                          {topic.grade}
                        </span>
                      </div>

                      <span className="shrink-0 inline-flex items-center rounded-lg bg-amber-soft border border-amber/30 px-2.5 py-1 text-[12px] font-extrabold text-ink tabular-nums">
                        Pág. {topic.pageNumber}
                      </span>
                    </div>

                    {/* Tema / Assunto */}
                    <h2 className="mt-2.5 text-[17px] sm:text-[18px] font-bold tracking-[-0.02em] text-ink leading-snug">
                      {highlightMatch(topic.title, query)}
                    </h2>

                    {/* Resumo de ½ parágrafo (≤ 220 caracteres) */}
                    <p className="mt-2 font-editorial text-[13.5px] sm:text-[14px] leading-[1.62] text-ink-soft">
                      {highlightMatch(topic.summaryHalfParagraph, query)}
                    </p>

                    {/* Footer: Reading time + Unlock/Offline status */}
                    <div className="mt-4 pt-3 border-t border-sand/75 flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[12px] text-ink-muted tabular-nums">
                        {topic.readingMinutes} min de estudo · {topic.curriculumTopicsCount}{' '}
                        {topic.curriculumTopicsCount === 1 ? 'tema' : 'temas'}
                      </span>

                      {topic.unlocked ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-forest/10 text-forest px-3 py-1 text-[12px] font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Desbloqueado • Offline</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber/15 text-ink px-3 py-1 text-[12px] font-bold tabular-nums">
                          <Lock className="w-3 h-3 text-amber" aria-hidden="true" />
                          <span>Pré-visualizar · {topic.priceMt} MT</span>
                        </span>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </>
        ) : (
          /* TAB 2: MINHAS MATÉRIAS (Requires Auth — Syncs Unlocked Curricula Across Devices) */
          <section className="space-y-5 folio-enter">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-forest">
                  Estudo Offline Sincronizado
                </p>
                <h1 className="mt-1 text-[24px] font-extrabold tracking-[-0.03em] text-ink leading-tight">
                  Minhas Matérias
                </h1>
              </div>

              {session && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="inline-flex items-center gap-1.5 min-h-[38px] px-3 rounded-xl bg-ivory border border-sand text-[12px] font-bold text-ink-soft hover:text-ink cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Sair</span>
                </button>
              )}
            </div>

            {!session ? (
              <div className="folio-card rounded-2xl p-5 sm:p-6">
                <div className="flex items-center gap-3 mb-3">
                  <img
                    src="/assets/folio-symbol.png"
                    alt=""
                    aria-hidden="true"
                    className="w-9 h-9 object-contain shrink-0"
                  />
                  <div>
                    <h2 className="text-[17px] font-extrabold text-ink">
                      Guarda as tuas matérias na conta
                    </h2>
                    <p className="text-[12.5px] text-ink-muted">
                      Acede às matérias desbloqueadas em qualquer telemóvel.
                    </p>
                  </div>
                </div>

                <AuthCardContent
                  defaultMode="login"
                  onSuccess={onAuthSuccess}
                />
              </div>
            ) : (
              <>
                {/* Account & Device Limit Strip */}
                <div className="folio-card rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-[12.5px]">
                  <span className="font-semibold text-ink truncate">{session.user.email}</span>
                  <span className="inline-flex items-center gap-1.5 text-forest font-bold tabular-nums">
                    <Smartphone className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>1 dispositivo ativo · Sessão única</span>
                  </span>
                </div>

                {/* Saved Bookmarks */}
                {bookmarks.length > 0 && (
                  <div>
                    <h2 className="text-[12px] font-bold uppercase tracking-[0.1em] text-ink-muted mb-2.5 flex items-center gap-1.5">
                      <Bookmark className="w-3.5 h-3.5 text-amber fill-amber" aria-hidden="true" />
                      <span>Páginas Marcadas</span>
                    </h2>
                    <div className="space-y-2">
                      {bookmarks.map((bm) => (
                        <button
                          key={`${bm.curriculumId}-${bm.topicId}`}
                          type="button"
                          onClick={() =>
                            onOpenUnlockedSubject(bm.curriculumId, bm.topicId, bm.pageNumber)
                          }
                          className="w-full text-left folio-card folio-card-interactive rounded-xl px-4 py-3 flex items-center justify-between gap-3 cursor-pointer"
                        >
                          <div className="min-w-0">
                            <p className="text-[14px] font-bold text-ink truncate">
                              {bm.topicTitle}
                            </p>
                            <p className="text-[12px] text-ink-muted truncate">
                              {bm.subject} · {bm.grade}
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

                {loadingSubjects ? (
                  <div className="space-y-3" aria-busy="true">
                    {[0, 1].map((i) => (
                      <div key={i} className="folio-card rounded-2xl p-5 space-y-3">
                        <div className="h-4 w-32 rounded skeleton-pulse" />
                        <div className="h-5 w-48 rounded skeleton-pulse" />
                        <div className="h-10 w-full rounded-xl skeleton-pulse" />
                      </div>
                    ))}
                  </div>
                ) : mySubjects.length === 0 ? (
                  <div className="folio-card rounded-2xl p-8 text-center">
                    <img
                      src="/assets/folio-symbol.png"
                      alt=""
                      aria-hidden="true"
                      className="w-12 h-12 mx-auto object-contain opacity-85"
                    />
                    <h2 className="mt-4 text-[17px] font-bold text-ink">
                      Ainda não tens matérias desbloqueadas
                    </h2>
                    <p className="mt-2 text-[14px] text-ink-soft max-w-[34ch] mx-auto leading-relaxed">
                      Pesquisa qualquer tema escolar, lê o resumo grátis e desbloqueia a disciplina
                      por 17 MT para estudar sem internet.
                    </p>
                    <button
                      type="button"
                      onClick={() => onTabChange('search')}
                      className="mt-5 min-h-[46px] px-5 rounded-xl bg-forest text-ivory text-[14px] font-bold cursor-pointer"
                    >
                      Pesquisar Matérias
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    {mySubjects.map((subj) => (
                      <article key={subj.id} className="folio-card rounded-2xl p-4 sm:p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <span className="text-[11px] font-bold uppercase tracking-[0.09em] text-forest">
                              {subj.grade}
                            </span>
                            <h2 className="mt-0.5 text-[19px] font-extrabold text-ink leading-snug">
                              {subj.subject}
                            </h2>
                            <p className="mt-0.5 text-[12px] text-ink-muted tabular-nums">
                              {subj.topics.length}{' '}
                              {subj.topics.length === 1 ? 'tema indexado' : 'temas indexados'} · Ref.{' '}
                              {subj.transactionRef}
                            </p>
                          </div>

                          <span className="inline-flex items-center gap-1 rounded-full bg-forest/10 text-forest px-2.5 py-1 text-[11px] font-bold shrink-0">
                            <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Offline</span>
                          </span>
                        </div>

                        {subj.topics.length > 0 && (
                          <div className="mt-3.5 pt-3 border-t border-sand/75 space-y-1">
                            {subj.topics.slice(0, 4).map((t) => (
                              <button
                                key={t.id}
                                type="button"
                                onClick={() => onOpenUnlockedSubject(subj.id, t.id, t.pageNumber)}
                                className="w-full text-left flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl hover:bg-parchment/80 transition-colors cursor-pointer"
                              >
                                <span className="text-[13.5px] font-medium text-ink truncate">
                                  {t.title}
                                </span>
                                <span className="shrink-0 text-[12px] font-bold text-forest tabular-nums">
                                  Pág. {t.pageNumber}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}

                        <div className="mt-3.5 flex justify-end">
                          <button
                            type="button"
                            onClick={() =>
                              onOpenUnlockedSubject(
                                subj.id,
                                subj.topics[0]?.id,
                                subj.topics[0]?.pageNumber
                              )
                            }
                            className="min-h-[42px] px-4 rounded-xl bg-forest hover:bg-forest-hover text-ivory text-[13px] font-bold cursor-pointer transition-colors"
                          >
                            Estudar Offline
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </>
            )}
          </section>
        )}
      </main>

      {/* Bottom Navigation: Strictly 2 Tabs (Pesquisar + Minhas Matérias) */}
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
              {session && mySubjects.length > 0 && (
                <span className="absolute -top-1.5 -right-3 min-w-[18px] h-[18px] px-1 rounded-full bg-amber text-ink text-[10px] font-extrabold flex items-center justify-center tabular-nums">
                  {mySubjects.length}
                </span>
              )}
            </div>
            <span>Minhas Matérias</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
