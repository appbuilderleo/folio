import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileText,
  FileUp,
  Loader2,
  Lock,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Trash2,
} from 'lucide-react';
import {
  deleteAdminCurriculum,
  fetchAdminDashboard,
  fetchCurrentSession,
  loginAccount,
  logoutAccount,
  publishAdminCurriculum,
  reEnrichAdminCurriculum,
  subscribeSessionRevoked,
  verifyActiveSession,
} from '../lib/apiClient';
import {
  AVAILABLE_SUBJECTS,
  dissectPdfForAdmin,
  formatGrade,
  inspectAdminPdf,
  type AdminPdfInspect,
} from '../lib/pdfDissector';
import type {
  AdminCurriculumOverview,
  AdminDashboardStats,
  AuthSessionState,
  DissectionProgress,
} from '../types/folio';

export function AdminPanel() {
  const [session, setSession] = useState<AuthSessionState | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Admin Login Form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Dashboard state
  const [curricula, setCurricula] = useState<AdminCurriculumOverview[]>([]);
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [loadingDash, setLoadingDash] = useState(false);
  const [dashError, setDashError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Focused Admin Upload Form (Classe + Disciplina + PDF + auto-OCR range when scanned)
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [gradeNumber, setGradeNumber] = useState<number>(10);
  const [subject, setSubject] = useState<string>('Biologia');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pdfInspect, setPdfInspect] = useState<AdminPdfInspect | null>(null);
  const [startPage, setStartPage] = useState<number>(1);
  const [endPage, setEndPage] = useState<number>(1);
  const [inspectingPdf, setInspectingPdf] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [progress, setProgress] = useState<DissectionProgress | null>(null);
  const [publishNotice, setPublishNotice] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setLoadingDash(true);
    setDashError(null);
    try {
      const data = await fetchAdminDashboard();
      setCurricula(data.curricula);
      setStats(data.stats);
    } catch (err) {
      setDashError(err instanceof Error ? err.message : 'Erro ao carregar painel.');
    } finally {
      setLoadingDash(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetchCurrentSession()
      .then((s) => {
        if (!active) return;
        setSession(s);
        setCheckingAuth(false);
        if (s && s.user.role === 'admin') {
          void loadDashboard();
        }
      })
      .catch(() => {
        if (active) setCheckingAuth(false);
      });
    return () => {
      active = false;
    };
  }, [loadDashboard]);

  // Auto-logout admin if the admin account signs in on another device
  useEffect(() => {
    return subscribeSessionRevoked((reason) => {
      setSession(null);
      setCurricula([]);
      setStats(null);
      setLoginError(reason);
    });
  }, []);

  useEffect(() => {
    if (!session || session.user.role !== 'admin') return;
    const checkNow = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        void verifyActiveSession();
      }
    };
    const interval = window.setInterval(checkNow, 15000);
    window.addEventListener('focus', checkNow);
    document.addEventListener('visibilitychange', checkNow);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', checkNow);
      document.removeEventListener('visibilitychange', checkNow);
    };
  }, [session?.token, session?.user.role]);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);
    try {
      const s = await loginAccount(email, password);
      if (s.user.role !== 'admin') {
        await logoutAccount();
        setLoginError('Esta conta não possui permissão de administrador (role = admin).');
        return;
      }
      setSession(s);
      await loadDashboard();
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'Credenciais inválidas.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    await logoutAccount();
    setSession(null);
    setCurricula([]);
    setStats(null);
  };

  const handleSelectPdf = async (file: File) => {
    setUploadError(null);
    setPublishNotice(null);
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setUploadError('Seleciona um ficheiro em formato PDF (.pdf).');
      return;
    }
    setSelectedFile(file);
    setInspectingPdf(true);
    try {
      const info = await inspectAdminPdf(file);
      setPdfInspect(info);
      setGradeNumber(info.suggestedGradeNumber);
      setSubject(info.suggestedSubject);
      setStartPage(1);
      setEndPage(info.totalPages);
    } catch {
      setUploadError('Não foi possível abrir o PDF selecionado.');
      setSelectedFile(null);
      setPdfInspect(null);
    } finally {
      setInspectingPdf(false);
    }
  };

  const handlePublishCurriculum = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setPublishing(true);
    setUploadError(null);
    setPublishNotice(null);

    try {
      const extracted = await dissectPdfForAdmin(selectedFile, {
        subject,
        startPage,
        endPage,
        enableOcr: true,
        stripBottomWatermark: Boolean(pdfInspect?.detectedWatermark),
        onProgress: (p) => {
          setProgress({ ...p, percent: Math.min(78, p.percent) });
        },
      });

      setProgress({
        stage: 'ai_enriching',
        percent: 84,
        detail: `A corrigir texto e gerar resumos de ½ parágrafo via Groq (${extracted.topics.length} temas)…`,
      });

      const res = await publishAdminCurriculum({
        gradeNumber,
        subject,
        totalPages: extracted.stats.totalPages,
        topics: extracted.topics,
      });

      setProgress({
        stage: 'done',
        percent: 100,
        detail: 'Matéria curricular publicada com sucesso!',
      });

      const ocrNote =
        extracted.stats.ocrPages > 0 ? ` · ${extracted.stats.ocrPages} págs. OCR` : '';
      const figNote =
        extracted.stats.figuresCount > 0
          ? ` · ${extracted.stats.figuresCount} ilustrações extraídas`
          : '';

      setPublishNotice(
        `${res.subject} (${res.grade}) publicada com ${res.topicsCount} temas indexados${ocrNote}${figNote} (${res.groqEnrichedCount} resumidos + esquemas vetoriais via Groq).`
      );
      setSelectedFile(null);
      setPdfInspect(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      await loadDashboard();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Erro ao processar PDF.');
    } finally {
      setPublishing(false);
    }
  };

  const handleReEnrich = async (id: string) => {
    setBusyId(id);
    setDashError(null);
    try {
      const res = await reEnrichAdminCurriculum(id);
      setPublishNotice(
        `Resumos de ½ parágrafo atualizados via Groq (${res.enrichedCount}/${res.totalCount} temas).`
      );
      await loadDashboard();
    } catch (err) {
      setDashError(err instanceof Error ? err.message : 'Erro ao reprocessar resumos.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (id: string, label: string) => {
    if (!window.confirm(`Remover definitivamente "${label}" do catálogo?`)) return;
    setBusyId(id);
    try {
      await deleteAdminCurriculum(id);
      await loadDashboard();
    } catch (err) {
      setDashError(err instanceof Error ? err.message : 'Erro ao remover.');
    } finally {
      setBusyId(null);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-parchment px-5">
        <div className="inline-flex items-center gap-2 text-[14px] font-bold text-forest">
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
          <span>A verificar sessão administrativa…</span>
        </div>
      </div>
    );
  }

  // Admin Login Gate (strictly isolated, server enforces role === 'admin')
  if (!session || session.user.role !== 'admin') {
    return (
      <main id="main" tabIndex={-1} className="min-h-dvh flex flex-col items-center justify-center bg-parchment px-5 py-10">
        <div className="w-full max-w-md folio-card rounded-[26px] p-6 sm:p-7">
          <div className="flex items-center justify-between gap-3 mb-5">
            <img
              src="/assets/folio-logo.png"
              alt="Fólio"
              width={112}
              height={28}
              className="h-7 w-auto object-contain"
            />
            <span className="inline-flex items-center gap-1 rounded-full bg-forest text-ivory px-3 py-1 text-[11px] font-bold uppercase tracking-[0.08em]">
              <Lock className="w-3 h-3 text-amber" aria-hidden="true" />
              Admin
            </span>
          </div>

          <h1 className="text-[22px] font-extrabold tracking-[-0.02em] text-ink">
            Painel de Publicação Curricular
          </h1>
          <p className="mt-1.5 text-[13.5px] text-ink-soft leading-relaxed">
            Acesso restrito a administradores autorizados (`role = admin`) para gestão de matérias
            escolares.
          </p>

          {session && session.user.role !== 'admin' && (
            <div className="mt-4 rounded-xl bg-amber-soft/70 border border-amber/40 px-3.5 py-2.5 text-[12.5px] text-ink">
              Estás autenticado como <strong>{session.user.email}</strong> (aluno). Inicia sessão com
              uma conta administrativa.
            </div>
          )}

          {loginError && (
            <div
              role="alert"
              className="mt-4 rounded-xl bg-red-50 border border-red-200 px-3.5 py-3 flex items-start gap-2.5 text-[13px] font-medium text-red-900 leading-snug"
            >
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-600" aria-hidden="true" />
              <div className="flex-1">
                <p className="font-bold text-[12.5px] uppercase tracking-[0.04em] text-red-800 mb-0.5">
                  Não foi possível entrar
                </p>
                <p>{loginError}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="mt-5 space-y-3.5">
            <div>
              <label
                htmlFor="admin-email"
                className="block text-[11.5px] font-bold uppercase tracking-[0.08em] text-ink-muted mb-1.5"
              >
                E-mail Administrativo
              </label>
              <input
                id="admin-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@folio.co.mz"
                className="w-full min-h-[48px] px-3.5 rounded-xl bg-parchment/55 border border-sand-strong text-[15px] text-ink focus:border-forest"
              />
            </div>

            <div>
              <label
                htmlFor="admin-pass"
                className="block text-[11.5px] font-bold uppercase tracking-[0.08em] text-ink-muted mb-1.5"
              >
                Senha
              </label>
              <input
                id="admin-pass"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full min-h-[48px] px-3.5 rounded-xl bg-parchment/55 border border-sand-strong text-[15px] text-ink focus:border-forest"
              />
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full min-h-[50px] rounded-2xl bg-forest hover:bg-forest-hover text-ivory font-bold text-[15px] flex items-center justify-center gap-2 cursor-pointer transition-colors disabled:opacity-65"
            >
              {loginLoading && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
              <span>Entrar no Painel Admin</span>
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-sand text-center">
            <a
              href="/"
              className="text-[12.5px] font-semibold text-ink-muted hover:text-forest transition-colors"
            >
              Voltar ao aplicativo Fólio
            </a>
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-dvh bg-parchment pb-16">
      {/* Admin Top Header */}
      <header className="sticky top-0 z-30 bg-forest text-ivory border-b border-ivory/15">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src="/assets/folio-symbol.png"
              alt=""
              aria-hidden="true"
              className="w-8 h-8 rounded-lg bg-parchment p-1 object-contain shrink-0"
            />
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-amber">
                Fólio · Administração Curricular
              </p>
              <p className="text-[12.5px] text-ivory/80 truncate">{session.user.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="/"
              className="hidden sm:inline-flex items-center min-h-[38px] px-3.5 rounded-xl bg-ivory/10 hover:bg-ivory/15 text-[12.5px] font-bold text-ivory transition-colors"
            >
              Ver App Público
            </a>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 min-h-[38px] px-3.5 rounded-xl bg-ivory/12 hover:bg-ivory/20 text-[12.5px] font-bold text-ivory cursor-pointer transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Sair</span>
            </button>
          </div>
        </div>
      </header>

      <main id="main" tabIndex={-1} className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Metrics Row */}
        {stats && (
          <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="folio-card rounded-2xl p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.09em] text-ink-muted">
                Disciplinas Publicadas
              </p>
              <p className="mt-1 text-[26px] font-extrabold text-ink tabular-nums">
                {stats.totalCurricula}
              </p>
            </div>
            <div className="folio-card rounded-2xl p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.09em] text-ink-muted">
                Temas Indexados
              </p>
              <p className="mt-1 text-[26px] font-extrabold text-forest tabular-nums">
                {stats.totalTopics}
              </p>
            </div>
            <div className="folio-card rounded-2xl p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.09em] text-ink-muted">
                Contas de Alunos
              </p>
              <p className="mt-1 text-[26px] font-extrabold text-ink tabular-nums">
                {stats.totalStudents}
              </p>
            </div>
            <div className="folio-card rounded-2xl p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.09em] text-ink-muted">
                Desbloqueios (MT)
              </p>
              <p className="mt-1 text-[26px] font-extrabold text-amber tabular-nums">
                {stats.totalUnlocks}{' '}
                <span className="text-[13px] font-bold text-ink-muted">
                  ({stats.revenueMt.toFixed(0)} MT)
                </span>
              </p>
            </div>
          </section>
        )}

        {publishNotice && (
          <div className="rounded-2xl bg-forest text-ivory px-4 py-3.5 flex items-center gap-2.5 text-[13.5px] font-semibold">
            <CheckCircle2 className="w-5 h-5 text-amber shrink-0" aria-hidden="true" />
            <span>{publishNotice}</span>
          </div>
        )}

        {dashError && (
          <div
            role="alert"
            className="rounded-2xl bg-red-50 border border-red-200 p-4 flex flex-wrap items-center justify-between gap-3 text-[13px] text-red-900"
          >
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-600" aria-hidden="true" />
              <div>
                <p className="font-bold text-[12px] uppercase tracking-[0.04em] text-red-800">
                  Aviso de Comunicação
                </p>
                <p className="text-red-900 mt-0.5">
                  {/timed?\s*out|abort/i.test(dashError)
                    ? 'A ligação demorou mais do que o esperado (rede móvel lenta). Clica em tentar novamente.'
                    : dashError}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void loadDashboard()}
              className="px-3.5 py-1.5 rounded-xl bg-red-700 text-white text-[12px] font-bold cursor-pointer hover:bg-red-800 shadow-xs"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {/* Simplified Admin Publisher: ONLY Classe + Disciplina + PDF */}
        <section className="folio-card rounded-2xl p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-sand">
            <div>
              <h1 className="text-[19px] font-extrabold text-ink">
                Publicar Nova Matéria Curricular
              </h1>
              <p className="mt-0.5 text-[13px] text-ink-soft">
                Seleciona a Classe, a Disciplina e anexa o PDF. O sistema extrai as páginas, gera
                resumos automáticos de ½ parágrafo via Groq e publica no catálogo.
              </p>
            </div>

            {stats && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-parchment border border-sand-strong px-3 py-1 text-[11.5px] font-bold text-forest">
                <Sparkles className="w-3.5 h-3.5 text-amber" aria-hidden="true" />
                <span>
                  {stats.groqEnabled ? `Groq ativa (${stats.groqModel})` : 'Groq inativa (resumo base)'}
                </span>
              </span>
            )}
          </div>

          {uploadError && (
            <div
              role="alert"
              className="mt-4 rounded-xl bg-red-50 border border-red-200 px-3.5 py-3 flex items-start gap-2.5 text-[13px] text-red-900 leading-snug"
            >
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-600" aria-hidden="true" />
              <div>
                <p className="font-bold text-[12px] uppercase tracking-[0.04em] text-red-800">
                  Falha ao publicar matéria
                </p>
                <p className="mt-0.5">
                  {/timed?\s*out|abort/i.test(uploadError)
                    ? 'O processamento demorou mais do que o esperado (tempo limite de rede excedido). Tenta novamente.'
                    : uploadError}
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handlePublishCurriculum} className="mt-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="adm-grade"
                  className="block text-[11.5px] font-bold uppercase tracking-[0.09em] text-ink-muted mb-1.5"
                >
                  Classe (1.ª à 12.ª)
                </label>
                <select
                  id="adm-grade"
                  value={gradeNumber}
                  disabled={publishing}
                  onChange={(e) => setGradeNumber(Number(e.target.value))}
                  className="w-full min-h-[48px] px-3.5 rounded-xl bg-parchment/55 border border-sand-strong text-[14.5px] font-semibold text-ink focus:border-forest"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => (
                    <option key={g} value={g}>
                      {formatGrade(g)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="adm-subject"
                  className="block text-[11.5px] font-bold uppercase tracking-[0.09em] text-ink-muted mb-1.5"
                >
                  Disciplina
                </label>
                <select
                  id="adm-subject"
                  value={subject}
                  disabled={publishing}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full min-h-[48px] px-3.5 rounded-xl bg-parchment/55 border border-sand-strong text-[14.5px] font-semibold text-ink focus:border-forest"
                >
                  {AVAILABLE_SUBJECTS.map((subj) => (
                    <option key={subj} value={subj}>
                      {subj}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* PDF Dropzone */}
            <div>
              <span className="block text-[11.5px] font-bold uppercase tracking-[0.09em] text-ink-muted mb-1.5">
                Ficheiro PDF da Matéria
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleSelectPdf(file);
                }}
              />

              <div
                role="button"
                tabIndex={0}
                onClick={() => !publishing && fileInputRef.current?.click()}
                onKeyDown={(e) => {
                  if (!publishing && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (publishing) return;
                  const f = e.dataTransfer.files?.[0];
                  if (f) void handleSelectPdf(f);
                }}
                className="rounded-2xl border-2 border-dashed border-sand-strong bg-parchment/45 hover:border-forest p-5 text-center transition-colors cursor-pointer"
              >
                {inspectingPdf ? (
                  <div className="py-2 inline-flex items-center gap-2 text-[14px] font-bold text-forest">
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                    <span>A detetar páginas e disciplina…</span>
                  </div>
                ) : selectedFile && pdfInspect ? (
                  <div className="flex flex-wrap items-center justify-between gap-3 text-left">
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="w-6 h-6 text-forest shrink-0" aria-hidden="true" />
                      <div className="min-w-0">
                        <p className="text-[14px] font-bold text-ink truncate">
                          {pdfInspect.fileName}
                        </p>
                        <p className="text-[12px] text-ink-muted tabular-nums">
                          {pdfInspect.totalPages} páginas detetadas ·{' '}
                          {Math.max(1, Math.round(pdfInspect.fileSizeBytes / 1024))} KB
                        </p>
                      </div>
                    </div>
                    <span className="text-[12px] font-bold text-forest underline">
                      Trocar ficheiro
                    </span>
                  </div>
                ) : (
                  <div className="py-2">
                    <FileUp className="w-7 h-7 mx-auto text-forest" aria-hidden="true" />
                    <p className="mt-2 text-[14.5px] font-bold text-ink">
                      Clica ou arrasta o PDF curricular aqui
                    </p>
                    <p className="mt-0.5 text-[12px] text-ink-muted">
                      Classe e disciplina são auto-sugeridas e editáveis acima
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Scanned / CamScanner PDF Detection Banner + Page Range Control */}
            {pdfInspect && (
              <div
                className={`rounded-2xl border p-4 space-y-3 ${
                  pdfInspect.isScannedPdf
                    ? 'bg-amber-soft/55 border-amber/50'
                    : 'bg-parchment/60 border-sand'
                }`}
              >
                {pdfInspect.isScannedPdf ? (
                  <div className="text-[13px] text-ink leading-relaxed">
                    <p className="font-extrabold text-forest flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber shrink-0" aria-hidden="true" />
                      <span>
                        PDF digitalizado por imagem detetado
                        {pdfInspect.detectedWatermark ? ` (${pdfInspect.detectedWatermark})` : ''} —
                        OCR em Português ativado
                      </span>
                    </p>
                    <p className="mt-1 text-[12.5px] text-ink-soft">
                      As marcas d&apos;água do scanner serão ignoradas e o motor OCR lerá o texto
                      real de cada página fotografada (~1,5 s por página), seguido de limpeza e
                      resumos de ½ parágrafo via Groq.
                    </p>
                  </div>
                ) : (
                  <p className="text-[12.5px] font-semibold text-forest">
                    PDF com texto digital detetado ({pdfInspect.totalPages} páginas). Extração
                    instantânea pronta.
                  </p>
                )}

                {pdfInspect.totalPages > 1 && (
                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <span className="text-[11.5px] font-bold uppercase tracking-[0.08em] text-ink-muted">
                      Intervalo de páginas:
                    </span>
                    <div className="inline-flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        max={pdfInspect.totalPages}
                        value={startPage}
                        disabled={publishing}
                        aria-label="Página inicial"
                        onChange={(e) => {
                          const v = Math.max(1, Math.min(pdfInspect.totalPages, Number(e.target.value) || 1));
                          setStartPage(v);
                          if (v > endPage) setEndPage(v);
                        }}
                        className="w-20 min-h-[38px] px-2.5 rounded-xl bg-ivory border border-sand-strong text-[13.5px] font-bold text-ink tabular-nums text-center"
                      />
                      <span className="text-[12px] text-ink-muted">até</span>
                      <input
                        type="number"
                        min={startPage}
                        max={pdfInspect.totalPages}
                        value={endPage}
                        disabled={publishing}
                        aria-label="Página final"
                        onChange={(e) => {
                          const v = Math.max(
                            startPage,
                            Math.min(pdfInspect.totalPages, Number(e.target.value) || pdfInspect.totalPages)
                          );
                          setEndPage(v);
                        }}
                        className="w-20 min-h-[38px] px-2.5 rounded-xl bg-ivory border border-sand-strong text-[13.5px] font-bold text-ink tabular-nums text-center"
                      />
                      <span className="text-[12px] text-ink-muted tabular-nums">
                        de {pdfInspect.totalPages} págs.
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {publishing && progress && (
              <div className="rounded-xl bg-parchment border border-sand p-4 space-y-2">
                <div className="flex items-center justify-between gap-2 text-[13px] font-bold text-ink">
                  <span>{progress.detail}</span>
                  <span className="tabular-nums text-forest shrink-0">{progress.percent}%</span>
                </div>
                <div className="h-2 rounded-full bg-sand overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-forest to-amber transition-all duration-300"
                    style={{ width: `${progress.percent}%` }}
                  />
                </div>
                {progress.ocrSnippet && (
                  <p className="pt-1 font-editorial italic text-[12px] text-ink-soft truncate">
                    Texto lido: “{progress.ocrSnippet}”
                  </p>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={!selectedFile || publishing || inspectingPdf}
              className="w-full sm:w-auto min-h-[50px] px-7 rounded-2xl bg-forest hover:bg-forest-hover text-ivory font-extrabold text-[14.5px] inline-flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              {publishing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-amber" aria-hidden="true" />
                  <span>A processar e publicar…</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-amber" aria-hidden="true" />
                  <span>Processar com Groq e Publicar Matéria</span>
                </>
              )}
            </button>
          </form>
        </section>

        {/* Published Curricula List */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[13px] font-bold uppercase tracking-[0.1em] text-ink-muted">
              Catálogo Publicado ({curricula.length})
            </h2>
            <button
              type="button"
              onClick={() => void loadDashboard()}
              className="inline-flex items-center gap-1.5 text-[12px] font-bold text-forest hover:text-amber cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingDash ? 'animate-spin' : ''}`} />
              <span>Atualizar</span>
            </button>
          </div>

          {curricula.map((curr) => {
            const expanded = expandedId === curr.id;
            const isBusy = busyId === curr.id;
            return (
              <article key={curr.id} className="folio-card rounded-2xl p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-[0.09em] text-forest">
                        {curr.grade}
                      </span>
                      <span className="rounded-full bg-forest/10 text-forest px-2 py-0.5 text-[10.5px] font-bold">
                        {curr.status === 'published' ? 'Publicado' : 'A processar'}
                      </span>
                    </div>
                    <h3 className="mt-0.5 text-[18px] font-extrabold text-ink">{curr.subject}</h3>
                    <p className="text-[12px] text-ink-muted tabular-nums">
                      {curr.topicsCount} temas · {curr.totalPages} págs. · {curr.unlocksCount}{' '}
                      desbloqueios (17 MT)
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => void handleReEnrich(curr.id)}
                      title="Regerar resumos de ½ parágrafo com Groq"
                      className="inline-flex items-center gap-1.5 min-h-[38px] px-3 rounded-xl bg-parchment border border-sand-strong text-[12px] font-bold text-ink hover:border-forest cursor-pointer disabled:opacity-50"
                    >
                      {isBusy ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5 text-amber" />
                      )}
                      <span>Resumos Groq</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setExpandedId(expanded ? null : curr.id)}
                      className="inline-flex items-center gap-1 min-h-[38px] px-3 rounded-xl bg-parchment border border-sand text-[12px] font-bold text-ink-soft cursor-pointer"
                    >
                      <span>Temas</span>
                      {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => void handleDelete(curr.id, `${curr.subject} (${curr.grade})`)}
                      aria-label={`Remover ${curr.subject} ${curr.grade}`}
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-ink-muted hover:text-red-700 hover:bg-red-50 cursor-pointer disabled:opacity-40"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {expanded && (
                  <div className="mt-4 pt-3.5 border-t border-sand space-y-2.5">
                    {curr.topicsPreview.map((t) => (
                      <div key={t.id} className="rounded-xl bg-parchment/65 border border-sand p-3">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="text-[13.5px] font-bold text-ink">{t.title}</p>
                          <div className="flex items-center gap-2 shrink-0">
                            {t.visualsCount > 0 && (
                              <span className="rounded-full bg-amber-soft px-2 py-0.5 text-[10.5px] font-bold text-ink tabular-nums">
                                {t.visualsCount} {t.visualsCount === 1 ? 'esquema' : 'esquemas'}
                              </span>
                            )}
                            <span className="text-[11.5px] font-extrabold text-forest tabular-nums">
                              Pág. {t.pageNumber}
                            </span>
                          </div>
                        </div>
                        <p className="mt-1 text-[12.5px] text-ink-soft leading-relaxed">
                          {t.summaryHalfParagraph}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            );
          })}
        </section>
      </main>
    </div>
  );
}
