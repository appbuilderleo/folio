import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { AuthSheet } from './components/AuthSheet';
import { CheckoutSheet } from './components/CheckoutSheet';
import { EditorialPreviewView } from './components/EditorialPreviewView';
import { OfflineReaderView } from './components/OfflineReaderView';
import { SearchCatalogView } from './components/SearchCatalogView';
import { SplashScreen } from './components/SplashScreen';
import { WelcomeHook } from './components/WelcomeHook';
import {
  fetchCurrentSession,
  fetchMySubjects,
  fetchProtectedCurriculumContent,
  fetchTopics,
  logoutAccount,
  type MySubjectOverview,
} from './lib/apiClient';
import {
  loadAllOfflineCurriculaForUser,
  loadBookmarks,
  loadCurriculumFromOfflineVault,
  saveCurriculumToOfflineVault,
  toggleBookmarkEntry,
} from './lib/offlineStore';
import type {
  AuthSessionState,
  BookmarkEntry,
  SchoolCycle,
  TopicSearchItem,
  UnlockedCurriculum,
  UnlockedTopic,
  UnlockReceipt,
} from './types/folio';

// Strictly isolated admin bundle — public students NEVER download pdfjs-dist or admin UI
const AdminPanel = lazy(() =>
  import('./components/AdminPanel').then((m) => ({ default: m.AdminPanel }))
);

type Stage = 'splash' | 'welcome' | 'catalog' | 'preview' | 'reader';

export function App() {
  // Isolated route check for /admin (invisible from public UI)
  const isAdminRoute =
    typeof window !== 'undefined' &&
    window.location.pathname.replace(/\/+$/, '') === '/admin';

  if (isAdminRoute) {
    return (
      <Suspense
        fallback={
          <div className="min-h-dvh flex items-center justify-center bg-parchment text-[14px] font-bold text-forest">
            A abrir painel administrativo…
          </div>
        }
      >
        <AdminPanel />
      </Suspense>
    );
  }

  return <StudentApp />;
}

function StudentApp() {
  const [stage, setStage] = useState<Stage>('splash');
  const [catalogTab, setCatalogTab] = useState<'search' | 'library'>('search');

  // Lightweight search state (3G/4G friendly)
  const [query, setQuery] = useState('');
  const [cycle, setCycle] = useState<SchoolCycle>('all');
  const [topics, setTopics] = useState<TopicSearchItem[]>([]);
  const [totalCurricula, setTotalCurricula] = useState(0);
  const [loadingTopics, setLoadingTopics] = useState(true);

  // Auth & Minhas Matérias
  const [session, setSession] = useState<AuthSessionState | null>(null);
  const [mySubjects, setMySubjects] = useState<MySubjectOverview[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [bookmarks, setBookmarks] = useState<BookmarkEntry[]>(() => loadBookmarks());

  // Preview / Checkout / Auth Gate / Reader state
  const [previewTopic, setPreviewTopic] = useState<TopicSearchItem | null>(null);
  const [authModal, setAuthModal] = useState<{
    open: boolean;
    title: string;
    reason: string;
    defaultMode: 'login' | 'register';
    pendingAction?: 'checkout' | 'none';
  }>({ open: false, title: '', reason: '', defaultMode: 'register' });
  const [showCheckout, setShowCheckout] = useState(false);

  const [readerState, setReaderState] = useState<{
    curriculum: UnlockedCurriculum;
    topic: UnlockedTopic;
    pageNumber?: number;
    justUnlocked: boolean;
  } | null>(null);
  const [openingReader, setOpeningReader] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 4200);
  }, []);

  // 1. Restore session cleanly on load (if token exists)
  useEffect(() => {
    let active = true;
    void fetchCurrentSession().then((s) => {
      if (active && s) setSession(s);
    });
    return () => {
      active = false;
    };
  }, []);

  // 2. Fetch lightweight search topics from CockroachDB API (debounced for 3G/4G)
  const reloadTopics = useCallback(
    async (qVal: string, cycleVal: SchoolCycle) => {
      setLoadingTopics(true);
      try {
        const res = await fetchTopics(qVal, cycleVal);
        setTopics(res.topics);
        setTotalCurricula(res.totalCurricula);
      } catch {
        // Keep current topics if momentarily offline
      } finally {
        setLoadingTopics(false);
      }
    },
    []
  );

  useEffect(() => {
    const t = window.setTimeout(() => {
      void reloadTopics(query, cycle);
    }, query ? 220 : 0);
    return () => window.clearTimeout(t);
  }, [query, cycle, session?.user.id, reloadTopics]);

  // 3. Load authenticated user's unlocked subjects (with encrypted IndexedDB offline fallback!)
  const reloadMySubjects = useCallback(async (activeSession: AuthSessionState | null) => {
    if (!activeSession) {
      setMySubjects([]);
      return;
    }
    setLoadingSubjects(true);
    try {
      const list = await fetchMySubjects();
      setMySubjects(list);
    } catch {
      // Offline fallback: show locally encrypted subjects from IndexedDB!
      const cached = await loadAllOfflineCurriculaForUser(activeSession.user.id);
      setMySubjects(
        cached.map((c) => ({
          id: c.id,
          subject: c.subject,
          grade: c.grade,
          gradeNumber: c.gradeNumber,
          cycle: c.cycle,
          totalPages: c.totalPages,
          priceMt: c.priceMt,
          paymentProvider: c.paymentProvider ?? 'mpesa',
          transactionRef: c.transactionRef ?? 'OFFLINE',
          unlockedAt: c.unlockedAt ?? new Date().toISOString(),
          topics: c.topics.map((t) => ({ id: t.id, title: t.title, pageNumber: t.pageNumber })),
        }))
      );
    } finally {
      setLoadingSubjects(false);
    }
  }, []);

  useEffect(() => {
    void reloadMySubjects(session);
  }, [session, reloadMySubjects]);

  // Open an unlocked curriculum (loads encrypted IndexedDB first or fetches protected content from server)
  const openUnlockedCurriculum = useCallback(
    async (
      curriculumId: string,
      targetTopicId?: string,
      targetPage?: number,
      justUnlocked = false,
      activeSessionOverride?: AuthSessionState | null
    ) => {
      const activeSession = activeSessionOverride ?? session;
      if (!activeSession) return;

      setOpeningReader(true);
      try {
        let full: UnlockedCurriculum | null = null;

        if (!justUnlocked) {
          full = await loadCurriculumFromOfflineVault(activeSession.user.id, curriculumId);
        }

        if (!full) {
          full = await fetchProtectedCurriculumContent(curriculumId);
          await saveCurriculumToOfflineVault(activeSession.user.id, full);
        }

        const chosenTopic =
          (targetTopicId ? full.topics.find((t) => t.id === targetTopicId) : null) ??
          full.topics[0];

        if (!chosenTopic) {
          showToast('Esta matéria ainda não tem temas disponíveis.');
          return;
        }

        setReaderState({
          curriculum: full,
          topic: chosenTopic,
          pageNumber: targetPage ?? chosenTopic.pageNumber,
          justUnlocked,
        });
        setStage('reader');
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Não foi possível abrir a matéria offline.');
      } finally {
        setOpeningReader(false);
      }
    },
    [session, showToast]
  );

  // Clicking a search card: unlocked -> Reader; locked -> Free Editorial Preview (no login needed!)
  const handleSelectTopic = useCallback(
    (topic: TopicSearchItem) => {
      if (topic.unlocked && session) {
        void openUnlockedCurriculum(topic.curriculumId, topic.id, topic.pageNumber, false);
      } else {
        setPreviewTopic(topic);
        setStage('preview');
      }
    },
    [session, openUnlockedCurriculum]
  );

  // Clicking "Desbloquear Matéria Completa — 17 MT": Auth gate first if visitor, else straight to M-Pesa/e-Mola!
  const handleRequestUnlock = useCallback(() => {
    if (!previewTopic) return;
    if (!session) {
      setAuthModal({
        open: true,
        title: 'Entra para desbloquear',
        reason: `Cria uma conta rápida ou entra com o teu e-mail para vincular ${previewTopic.subject} (${previewTopic.grade}) à tua conta e estudar offline em qualquer dispositivo.`,
        defaultMode: 'register',
        pendingAction: 'checkout',
      });
      return;
    }
    setShowCheckout(true);
  }, [previewTopic, session]);

  const handleAuthSuccess = useCallback(
    (nextSession: AuthSessionState) => {
      setSession(nextSession);
      const pending = authModal.pendingAction;
      setAuthModal((curr) => ({ ...curr, open: false, pendingAction: 'none' }));

      if (nextSession.evictedOldSession) {
        showToast('Sessão iniciada. A sessão mais antiga foi encerrada (limite de 2 dispositivos).');
      }

      if (pending === 'checkout' && previewTopic) {
        const alreadyOwned =
          nextSession.user.role === 'admin' ||
          nextSession.unlockedCurriculumIds.includes(previewTopic.curriculumId);
        if (alreadyOwned) {
          showToast('Esta matéria já está desbloqueada na tua conta!');
          void openUnlockedCurriculum(
            previewTopic.curriculumId,
            previewTopic.id,
            previewTopic.pageNumber,
            false,
            nextSession
          );
        } else {
          setShowCheckout(true);
        }
      }
    },
    [authModal.pendingAction, previewTopic, openUnlockedCurriculum, showToast]
  );

  const handleUnlockSuccess = useCallback(
    async (_receipt: UnlockReceipt) => {
      setShowCheckout(false);
      if (!previewTopic || !session) return;

      const updatedSession: AuthSessionState = {
        ...session,
        unlockedCurriculumIds: Array.from(
          new Set([...session.unlockedCurriculumIds, previewTopic.curriculumId])
        ),
      };
      setSession(updatedSession);
      void reloadTopics(query, cycle);
      void reloadMySubjects(updatedSession);

      await openUnlockedCurriculum(
        previewTopic.curriculumId,
        previewTopic.id,
        previewTopic.pageNumber,
        true,
        updatedSession
      );
    },
    [previewTopic, session, query, cycle, reloadTopics, reloadMySubjects, openUnlockedCurriculum]
  );

  const handleLogout = useCallback(async () => {
    await logoutAccount();
    setSession(null);
    setMySubjects([]);
    showToast('Sessão encerrada com segurança.');
  }, [showToast]);

  const handleToggleBookmark = useCallback((entry: BookmarkEntry) => {
    setBookmarks(toggleBookmarkEntry(entry));
  }, []);

  const handleCompleteSplash = useCallback(() => {
    setStage((curr) => (curr === 'splash' ? 'welcome' : curr));
  }, []);

  return (
    <>
      {stage === 'splash' && <SplashScreen onComplete={handleCompleteSplash} />}

      {stage === 'welcome' && (
        <WelcomeHook
          totalCurriculaCount={totalCurricula}
          onStartSearch={(initial) => {
            if (initial) setQuery(initial);
            setCatalogTab('search');
            setStage('catalog');
          }}
        />
      )}

      {stage === 'catalog' && (
        <SearchCatalogView
          topics={topics}
          loadingTopics={loadingTopics}
          query={query}
          onQueryChange={setQuery}
          cycle={cycle}
          onCycleChange={setCycle}
          activeTab={catalogTab}
          onTabChange={setCatalogTab}
          session={session}
          mySubjects={mySubjects}
          loadingSubjects={loadingSubjects}
          bookmarks={bookmarks}
          onSelectTopic={handleSelectTopic}
          onOpenUnlockedSubject={(cid, tid, pg) => {
            void openUnlockedCurriculum(cid, tid, pg, false);
          }}
          onAuthSuccess={handleAuthSuccess}
          onOpenLoginModal={() =>
            setAuthModal({
              open: true,
              title: 'Aceder à tua conta',
              reason: 'Entra ou cria conta para sincronizar as tuas matérias desbloqueadas.',
              defaultMode: 'login',
              pendingAction: 'none',
            })
          }
          onLogout={() => void handleLogout()}
          onBackToHome={() => setStage('welcome')}
        />
      )}

      {stage === 'preview' && previewTopic && (
        <EditorialPreviewView
          topic={previewTopic}
          onBack={() => setStage('catalog')}
          onRequestUnlock={handleRequestUnlock}
        />
      )}

      {stage === 'reader' && readerState && (
        <OfflineReaderView
          curriculum={readerState.curriculum}
          topic={readerState.topic}
          initialPage={readerState.pageNumber}
          justUnlocked={readerState.justUnlocked}
          bookmarks={bookmarks}
          onToggleBookmark={handleToggleBookmark}
          onSelectTopic={(t) =>
            setReaderState((curr) =>
              curr ? { ...curr, topic: t, pageNumber: t.pageNumber, justUnlocked: false } : null
            )
          }
          onBack={() => setStage('catalog')}
        />
      )}

      {authModal.open && (
        <AuthSheet
          title={authModal.title}
          reason={authModal.reason}
          defaultMode={authModal.defaultMode}
          onClose={() => setAuthModal((curr) => ({ ...curr, open: false, pendingAction: 'none' }))}
          onSuccess={handleAuthSuccess}
        />
      )}

      {showCheckout && previewTopic && session && (
        <CheckoutSheet
          topic={previewTopic}
          userEmail={session.user.email}
          onClose={() => setShowCheckout(false)}
          onUnlockSuccess={(receipt) => void handleUnlockSuccess(receipt)}
        />
      )}

      {openingReader && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-[2px]">
          <div className="rounded-2xl bg-ivory border border-sand px-5 py-4 text-[14px] font-bold text-forest shadow-lg">
            A abrir matéria offline…
          </div>
        </div>
      )}

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-[92vw] rounded-2xl bg-forest text-ivory border border-amber/40 px-4 py-3 text-[13px] font-semibold shadow-xl"
        >
          {toast}
        </div>
      )}
    </>
  );
}

export default App;
