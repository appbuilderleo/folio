import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { CheckoutSheet } from './components/CheckoutSheet';
import { EditorialPreviewView } from './components/EditorialPreviewView';
import { OfflineReaderView } from './components/OfflineReaderView';
import { SearchCatalogView } from './components/SearchCatalogView';
import { SplashScreen } from './components/SplashScreen';
import { WelcomeHook } from './components/WelcomeHook';

const PdfUploadModal = lazy(() =>
  import('./components/PdfUploadModal').then((m) => ({ default: m.PdfUploadModal }))
);
import { SEED_MANUALS } from './data/seedManuals';
import {
  checkBackendHealth,
  deleteManualFromCloud,
  fetchManualsFromCloud,
  recordUnlockInCloud,
  saveManualToCloud,
  type BackendHealth,
} from './lib/apiClient';
import {
  deleteManualFromOfflineVault,
  loadBookmarks,
  loadOfflineVaultManuals,
  loadUnlockReceipts,
  saveManualToOfflineVault,
  saveUnlockReceipt,
  toggleBookmarkEntry,
} from './lib/offlineStore';
import type {
  BookmarkEntry,
  Manual,
  ManualChapter,
  SearchHit,
  UnlockReceipt,
} from './types/folio';

type Stage = 'splash' | 'welcome' | 'catalog' | 'preview' | 'reader';

interface ActiveSelection {
  manualId: string;
  chapterId: string;
  pageNumber: number;
  justUnlocked?: boolean;
}

function mergeManualLists(...lists: Manual[][]): Manual[] {
  const byId = new Map<string, Manual>();
  for (const list of lists) {
    for (const m of list) {
      byId.set(m.id, m);
    }
  }
  return Array.from(byId.values()).sort((a, b) => {
    if (a.sourceType !== b.sourceType) {
      return a.sourceType === 'pdf_upload' ? -1 : 1;
    }
    return b.createdAt.localeCompare(a.createdAt);
  });
}

export function App() {
  const [stage, setStage] = useState<Stage>('splash');
  const [catalogTab, setCatalogTab] = useState<'search' | 'library'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [manuals, setManuals] = useState<Manual[]>(SEED_MANUALS);
  const [unlocks, setUnlocks] = useState<Record<string, UnlockReceipt>>(() => loadUnlockReceipts());
  const [bookmarks, setBookmarks] = useState<BookmarkEntry[]>(() => loadBookmarks());
  const [backendHealth, setBackendHealth] = useState<BackendHealth>({
    online: false,
    dbConnected: false,
  });

  const [selection, setSelection] = useState<ActiveSelection | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showPdfStudio, setShowPdfStudio] = useState(false);

  // Hydrate offline IndexedDB vault + CockroachDB cloud manuals
  useEffect(() => {
    let active = true;

    async function hydrate() {
      const [localManuals, health, cloudManuals] = await Promise.all([
        loadOfflineVaultManuals(),
        checkBackendHealth(),
        fetchManualsFromCloud(),
      ]);

      if (!active) return;

      setBackendHealth(health);

      const uploadedLocal = localManuals.filter((m) => m.sourceType === 'pdf_upload');
      const uploadedCloud = (cloudManuals ?? []).filter((m) => m.sourceType === 'pdf_upload');

      if (uploadedLocal.length > 0 || uploadedCloud.length > 0) {
        setManuals(mergeManualLists(SEED_MANUALS, uploadedLocal, uploadedCloud));
      }
    }

    void hydrate();
    return () => {
      active = false;
    };
  }, []);

  const isUnlocked = useCallback(
    (manual: Manual) => Boolean(manual.defaultUnlocked || unlocks[manual.id]),
    [unlocks]
  );

  const selectedManual = selection
    ? manuals.find((m) => m.id === selection.manualId) ?? null
    : null;

  const selectedChapter =
    selectedManual && selection
      ? selectedManual.chapters.find((c) => c.id === selection.chapterId) ??
        selectedManual.chapters[0] ??
        null
      : null;

  const handleOpenManualChapter = useCallback(
    (manual: Manual, chapter: ManualChapter, pageNumber?: number) => {
      const targetPage = pageNumber ?? chapter.pageStart;
      setSelection({
        manualId: manual.id,
        chapterId: chapter.id,
        pageNumber: targetPage,
        justUnlocked: false,
      });
      setStage(isUnlocked(manual) ? 'reader' : 'preview');
    },
    [isUnlocked]
  );

  const handleSelectHit = useCallback(
    (hit: SearchHit) => {
      handleOpenManualChapter(hit.manual, hit.chapter, hit.matchedPage);
    },
    [handleOpenManualChapter]
  );

  const handleUnlockSuccess = useCallback(
    async (receipt: UnlockReceipt) => {
      const nextUnlocks = saveUnlockReceipt(receipt);
      setUnlocks(nextUnlocks);
      setShowCheckout(false);

      if (selectedManual) {
        // Encrypt and save into offline IndexedDB sandbox
        void saveManualToOfflineVault(selectedManual);
        // Log sync receipt in CockroachDB asynchronously
        void recordUnlockInCloud({
          manualId: selectedManual.id,
          operator: receipt.operator,
          phone: receipt.phone,
          amountMt: receipt.amountMt,
          reference: receipt.reference,
        });
      }

      setSelection((curr) => (curr ? { ...curr, justUnlocked: true } : curr));
      setStage('reader');
    },
    [selectedManual]
  );

  const handleManualDissected = useCallback(async (manual: Manual) => {
    setManuals((prev) => mergeManualLists(prev, [manual]));
    await saveManualToOfflineVault(manual);
    const cloudSaved = await saveManualToCloud(manual);
    return { cloudSaved };
  }, []);

  const handleDeleteUploadedManual = useCallback(async (manualId: string) => {
    setManuals((prev) => prev.filter((m) => m.id !== manualId));
    await deleteManualFromOfflineVault(manualId);
    void deleteManualFromCloud(manualId);
  }, []);

  const handleToggleBookmark = useCallback((entry: BookmarkEntry) => {
    const next = toggleBookmarkEntry(entry);
    setBookmarks(next);
  }, []);

  const handleCompleteSplash = useCallback(() => {
    setStage((curr) => (curr === 'splash' ? 'welcome' : curr));
  }, []);

  return (
    <>
      {stage === 'splash' && <SplashScreen onComplete={handleCompleteSplash} />}

      {stage === 'welcome' && (
        <WelcomeHook
          totalCatalogCount={manuals.length}
          onStartSearch={(initial) => {
            if (initial) setSearchQuery(initial);
            setCatalogTab('search');
            setStage('catalog');
          }}
          onOpenPdfUpload={() => setShowPdfStudio(true)}
        />
      )}

      {stage === 'catalog' && (
        <SearchCatalogView
          manuals={manuals}
          initialQuery={searchQuery}
          activeTab={catalogTab}
          onTabChange={setCatalogTab}
          unlocks={unlocks}
          bookmarks={bookmarks}
          backendHealth={backendHealth}
          onSelectHit={handleSelectHit}
          onOpenManualChapter={handleOpenManualChapter}
          onOpenPdfUpload={() => setShowPdfStudio(true)}
          onDeleteUploadedManual={handleDeleteUploadedManual}
          onBackToHome={() => setStage('welcome')}
        />
      )}

      {stage === 'preview' && selectedManual && selectedChapter && (
        <EditorialPreviewView
          manual={selectedManual}
          chapter={selectedChapter}
          matchedPage={selection?.pageNumber ?? selectedChapter.pageStart}
          onBack={() => setStage('catalog')}
          onOpenCheckout={() => setShowCheckout(true)}
        />
      )}

      {stage === 'reader' && selectedManual && selectedChapter && (
        <OfflineReaderView
          manual={selectedManual}
          chapter={selectedChapter}
          initialPage={selection?.pageNumber}
          justUnlocked={Boolean(selection?.justUnlocked)}
          bookmarks={bookmarks}
          onToggleBookmark={handleToggleBookmark}
          onSelectChapter={(ch) =>
            setSelection({
              manualId: selectedManual.id,
              chapterId: ch.id,
              pageNumber: ch.pageStart,
              justUnlocked: false,
            })
          }
          onBack={() => setStage('catalog')}
        />
      )}

      {showCheckout && selectedManual && (
        <CheckoutSheet
          manual={selectedManual}
          onClose={() => setShowCheckout(false)}
          onUnlockSuccess={handleUnlockSuccess}
        />
      )}

      {showPdfStudio && (
        <Suspense
          fallback={
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 backdrop-blur-[2px]">
              <div className="rounded-2xl bg-ivory border border-sand px-5 py-4 text-[14px] font-bold text-forest shadow-lg">
                A abrir Estúdio PDF…
              </div>
            </div>
          }
        >
          <PdfUploadModal
            onClose={() => setShowPdfStudio(false)}
            onManualDissected={handleManualDissected}
            onOpenManualNow={(manual) => {
              setShowPdfStudio(false);
              if (manual.chapters[0]) {
                handleOpenManualChapter(manual, manual.chapters[0], manual.chapters[0].pageStart);
              } else {
                setCatalogTab('library');
                setStage('catalog');
              }
            }}
            onSearchManual={(manual) => {
              setShowPdfStudio(false);
              setSearchQuery(manual.subject);
              setCatalogTab('search');
              setStage('catalog');
            }}
          />
        </Suspense>
      )}
    </>
  );
}

export default App;
