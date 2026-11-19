import { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Cloud,
  FileText,
  FileUp,
  Loader2,
  Lock,
  Sparkles,
  Unlock,
  X,
} from 'lucide-react';
import {
  AVAILABLE_SUBJECTS,
  dissectPdfToManual,
  formatGrade,
  inspectPdfFile,
  type DissectResult,
  type PdfQuickInspect,
} from '../lib/pdfDissector';
import type { DissectionProgress, Manual } from '../types/folio';

interface PdfUploadModalProps {
  onClose: () => void;
  onManualDissected: (manual: Manual) => Promise<{ cloudSaved: boolean }>;
  onOpenManualNow: (manual: Manual) => void;
  onSearchManual: (manual: Manual) => void;
}

const PIPELINE_STEPS: Array<{ key: DissectionProgress['stage']; label: string }> = [
  { key: 'reading', label: 'Extração página a página do PDF' },
  { key: 'cleaning', label: 'Limpeza tipográfica e remoção de cabeçalhos repetidos' },
  { key: 'structuring', label: 'Segmentação em unidades, capítulos e números de página' },
  { key: 'summarizing', label: 'Geração de resumos didáticos, pontos-chave e conceitos' },
  { key: 'saving', label: 'Indexação no CockroachDB e cofre encriptado offline' },
];

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function PdfUploadModal({
  onClose,
  onManualDissected,
  onOpenManualNow,
  onSearchManual,
}: PdfUploadModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<'pick' | 'configure' | 'processing' | 'done'>('pick');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [inspecting, setInspecting] = useState(false);
  const [inspectInfo, setInspectInfo] = useState<PdfQuickInspect | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Editable metadata before dissection
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('Biologia');
  const [gradeNumber, setGradeNumber] = useState(10);
  const [defaultUnlocked, setDefaultUnlocked] = useState(true);

  // Dissection live state
  const [progress, setProgress] = useState<DissectionProgress>({
    stage: 'reading',
    percent: 0,
    detail: 'A preparar…',
  });
  const [result, setResult] = useState<DissectResult | null>(null);
  const [cloudSaved, setCloudSaved] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && phase !== 'processing') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, phase]);

  const handleFileChosen = async (file: File) => {
    setError(null);
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setError('Por favor seleciona um ficheiro em formato PDF (.pdf).');
      return;
    }

    setSelectedFile(file);
    setInspecting(true);
    try {
      const info = await inspectPdfFile(file);
      setInspectInfo(info);
      setTitle(info.suggestedTitle);
      setSubject(info.suggestedSubject);
      setGradeNumber(info.suggestedGradeNumber);
      setPhase('configure');
    } catch (err) {
      console.error(err);
      setError(
        'Não foi possível ler este PDF. Verifica se o ficheiro não está protegido por palavra-passe ou corrompido.'
      );
      setSelectedFile(null);
    } finally {
      setInspecting(false);
    }
  };

  const handleStartDissection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setPhase('processing');
    setError(null);

    try {
      const dissected = await dissectPdfToManual(selectedFile, {
        title,
        subject,
        gradeNumber,
        defaultUnlocked,
        priceMt: 17,
        onProgress: (p) => setProgress(p),
      });

      setProgress({
        stage: 'saving',
        percent: 94,
        detail: 'A gravar capítulos no CockroachDB e a encriptar no cofre offline…',
      });

      const persistRes = await onManualDissected(dissected.manual);
      setCloudSaved(persistRes.cloudSaved);
      setResult(dissected);
      setProgress({
        stage: 'done',
        percent: 100,
        detail: 'Manual pronto para busca por página e leitura offline!',
      });
      setPhase('done');
    } catch (err) {
      console.error(err);
      setError('Ocorreu um erro ao esmiuçar o livro PDF. Tenta novamente.');
      setPhase('configure');
    }
  };

  const currentStepIndex = PIPELINE_STEPS.findIndex((s) => s.key === progress.stage);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pdf-studio-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink/55 backdrop-blur-[2px] p-0 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && phase !== 'processing') onClose();
      }}
    >
      <div className="w-full max-w-xl max-h-[92dvh] overflow-y-auto bg-ivory rounded-t-[26px] sm:rounded-[26px] border-t sm:border border-sand shadow-[var(--shadow-sheet)] px-5 pt-4 pb-6 pb-safe sheet-enter">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-3.5 border-b border-sand">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-forest text-ivory flex items-center justify-center shrink-0">
              <FileUp className="w-5 h-5 text-amber" aria-hidden="true" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.11em] text-forest">
                Estúdio de Adaptação Curricular
              </p>
              <h2 id="pdf-studio-title" className="text-[18px] font-extrabold text-ink leading-tight">
                Carregar e Esmiuçar Livro PDF
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={phase === 'processing'}
            aria-label="Fechar carregador de PDF"
            className="w-10 h-10 rounded-full flex items-center justify-center text-ink-muted hover:text-ink hover:bg-parchment cursor-pointer disabled:opacity-40"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="mt-4 rounded-xl bg-red-50 border border-red-200 px-3.5 py-3 flex items-start gap-2 text-[13px] text-red-800"
          >
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        {/* PHASE 1: PICK PDF */}
        {phase === 'pick' && (
          <div className="mt-5 space-y-4">
            <p className="text-[14px] text-ink-soft leading-relaxed">
              Escolhe qualquer manual escolar ou sebenta em PDF. O Fólio lê cada página, deteta os
              capítulos, cria resumos didáticos e adapta o texto para leitura confortável no telemóvel.
            </p>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                const file = e.dataTransfer.files?.[0];
                if (file) void handleFileChosen(file);
              }}
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              className={`rounded-2xl border-2 border-dashed p-7 sm:p-9 text-center transition-all cursor-pointer ${
                isDragging
                  ? 'border-amber bg-amber-soft/35'
                  : 'border-sand-strong bg-parchment/55 hover:border-forest hover:bg-parchment/85'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleFileChosen(file);
                }}
              />

              {inspecting ? (
                <div className="py-4 flex flex-col items-center gap-3">
                  <Loader2 className="w-8 h-8 text-forest animate-spin" aria-hidden="true" />
                  <p className="text-[14px] font-bold text-ink">
                    A analisar estrutura inicial do PDF…
                  </p>
                </div>
              ) : (
                <>
                  <img
                    src="/assets/folio-symbol.png"
                    alt=""
                    aria-hidden="true"
                    className="w-12 h-12 mx-auto object-contain"
                  />
                  <p className="mt-4 text-[16px] font-extrabold text-ink">
                    Toca para escolher o livro em PDF
                  </p>
                  <p className="mt-1 text-[13px] text-ink-muted">
                    Ou arrasta o ficheiro `.pdf` para aqui (ex: Biologia 10.ª Classe.pdf)
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1.5 min-h-[40px] px-4 rounded-full bg-forest text-ivory text-[13px] font-bold">
                    <FileUp className="w-4 h-4 text-amber" aria-hidden="true" />
                    <span>Selecionar ficheiro PDF</span>
                  </span>
                </>
              )}
            </div>

            {/* What Fólio does with the PDF */}
            <div className="grid grid-cols-3 gap-2 pt-1 text-center">
              <div className="rounded-xl bg-parchment/70 border border-sand p-2.5">
                <p className="text-[12px] font-extrabold text-forest">1. Esmiúça</p>
                <p className="mt-0.5 text-[11px] text-ink-muted leading-tight">
                  Separa capítulos e páginas reais
                </p>
              </div>
              <div className="rounded-xl bg-parchment/70 border border-sand p-2.5">
                <p className="text-[12px] font-extrabold text-forest">2. Resume</p>
                <p className="mt-0.5 text-[11px] text-ink-muted leading-tight">
                  Gera síntese e pontos-chave
                </p>
              </div>
              <div className="rounded-xl bg-parchment/70 border border-sand p-2.5">
                <p className="text-[12px] font-extrabold text-forest">3. Adapta</p>
                <p className="mt-0.5 text-[11px] text-ink-muted leading-tight">
                  Indexa busca + leitor offline
                </p>
              </div>
            </div>
          </div>
        )}

        {/* PHASE 2: CONFIGURE AUTO-DETECTED METADATA */}
        {phase === 'configure' && inspectInfo && (
          <form onSubmit={handleStartDissection} className="mt-5 space-y-4">
            {/* File Summary Chip */}
            <div className="rounded-2xl bg-parchment/80 border border-sand px-4 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <FileText className="w-5 h-5 text-forest shrink-0" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-[13.5px] font-bold text-ink truncate">
                    {inspectInfo.fileName}
                  </p>
                  <p className="text-[12px] text-ink-muted tabular-nums">
                    {inspectInfo.totalPages} {inspectInfo.totalPages === 1 ? 'página' : 'páginas'} ·{' '}
                    {formatFileSize(inspectInfo.fileSizeBytes)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPhase('pick');
                  setSelectedFile(null);
                  setInspectInfo(null);
                }}
                className="text-[12px] font-bold text-forest hover:text-amber cursor-pointer shrink-0"
              >
                Trocar
              </button>
            </div>

            {/* Title */}
            <div>
              <label
                htmlFor="pdf-title"
                className="block text-[12px] font-bold uppercase tracking-[0.08em] text-ink-muted mb-1.5"
              >
                Título do Manual
              </label>
              <input
                id="pdf-title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full min-h-[46px] px-3.5 rounded-xl bg-parchment/45 border border-sand-strong text-[14.5px] font-semibold text-ink focus:border-forest"
              />
            </div>

            {/* Subject & Grade */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="pdf-subject"
                  className="block text-[12px] font-bold uppercase tracking-[0.08em] text-ink-muted mb-1.5"
                >
                  Disciplina
                </label>
                <select
                  id="pdf-subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full min-h-[46px] px-3 rounded-xl bg-parchment/45 border border-sand-strong text-[14px] font-semibold text-ink focus:border-forest"
                >
                  {AVAILABLE_SUBJECTS.map((subj) => (
                    <option key={subj} value={subj}>
                      {subj}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="pdf-grade"
                  className="block text-[12px] font-bold uppercase tracking-[0.08em] text-ink-muted mb-1.5"
                >
                  Classe
                </label>
                <select
                  id="pdf-grade"
                  value={gradeNumber}
                  onChange={(e) => setGradeNumber(Number(e.target.value))}
                  className="w-full min-h-[46px] px-3 rounded-xl bg-parchment/45 border border-sand-strong text-[14px] font-semibold text-ink focus:border-forest"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => (
                    <option key={g} value={g}>
                      {formatGrade(g)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Access Mode Toggle (Instant Offline vs Fólio 17 MT Paywall Test) */}
            <div>
              <span className="block text-[12px] font-bold uppercase tracking-[0.08em] text-ink-muted mb-1.5">
                Modo de Publicação no Fólio
              </span>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setDefaultUnlocked(true)}
                  aria-pressed={defaultUnlocked}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                    defaultUnlocked
                      ? 'bg-forest text-ivory border-forest'
                      : 'bg-parchment/45 border-sand-strong text-ink'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-[13px] font-bold">
                    <Unlock className="w-3.5 h-3.5 text-amber" aria-hidden="true" />
                    <span>Leitura Imediata</span>
                  </div>
                  <p
                    className={`mt-0.5 text-[11px] leading-snug ${
                      defaultUnlocked ? 'text-ivory/80' : 'text-ink-muted'
                    }`}
                  >
                    Já desbloqueado no teu cofre offline.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setDefaultUnlocked(false)}
                  aria-pressed={!defaultUnlocked}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                    !defaultUnlocked
                      ? 'bg-forest text-ivory border-forest'
                      : 'bg-parchment/45 border-sand-strong text-ink'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-[13px] font-bold">
                    <Lock className="w-3.5 h-3.5 text-amber" aria-hidden="true" />
                    <span>Modo Catálogo (17 MT)</span>
                  </div>
                  <p
                    className={`mt-0.5 text-[11px] leading-snug ${
                      !defaultUnlocked ? 'text-ivory/80' : 'text-ink-muted'
                    }`}
                  >
                    Pré-visualização grátis + desbloqueio M-Pesa.
                  </p>
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full min-h-[52px] rounded-2xl bg-forest hover:bg-forest-hover active:scale-[0.985] text-ivory font-extrabold text-[15px] flex items-center justify-center gap-2 transition-all cursor-pointer shadow-[0_10px_24px_-10px_rgba(8,59,39,0.5)]"
            >
              <Sparkles className="w-4 h-4 text-amber" aria-hidden="true" />
              <span>Esmiuçar e Adaptar para o Fólio</span>
            </button>
          </form>
        )}

        {/* PHASE 3: LIVE DISSECTION PROGRESS */}
        {phase === 'processing' && (
          <div className="mt-6 space-y-5">
            <div>
              <div className="flex items-center justify-between text-[13px] font-bold text-ink mb-2">
                <span>{progress.detail}</span>
                <span className="tabular-nums text-forest">{progress.percent}%</span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-parchment-deep overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-forest to-amber transition-all duration-300"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
            </div>

            <ul className="space-y-2.5">
              {PIPELINE_STEPS.map((st, idx) => {
                const done = currentStepIndex > idx || progress.stage === 'done';
                const active = currentStepIndex === idx;
                return (
                  <li
                    key={st.key}
                    className={`flex items-center gap-3 text-[13.5px] ${
                      done ? 'text-forest font-semibold' : active ? 'text-ink font-bold' : 'text-ink-muted'
                    }`}
                  >
                    {done ? (
                      <CheckCircle2 className="w-4 h-4 text-forest shrink-0" aria-hidden="true" />
                    ) : active ? (
                      <Loader2 className="w-4 h-4 text-amber animate-spin shrink-0" aria-hidden="true" />
                    ) : (
                      <span className="w-4 h-4 rounded-full border border-sand-strong shrink-0" />
                    )}
                    <span>{st.label}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* PHASE 4: DISSECTED MANUAL REVIEW */}
        {phase === 'done' && result && (
          <div className="mt-5 space-y-4">
            <div className="rounded-2xl bg-forest text-ivory p-4 sm:p-5">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.11em] text-amber">
                  <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                  <span>Manual esmiuçado com sucesso</span>
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-ivory/12 px-2.5 py-0.5 text-[11px] font-semibold">
                  <Cloud className="w-3 h-3 text-amber" aria-hidden="true" />
                  {cloudSaved ? 'CockroachDB + Offline' : 'Cofre Offline'}
                </span>
              </div>

              <h3 className="mt-2 text-[18px] font-extrabold leading-snug">
                {result.manual.title}
              </h3>

              <dl className="mt-4 grid grid-cols-3 gap-2 pt-3 border-t border-ivory/15 text-center">
                <div>
                  <dt className="text-[11px] text-ivory/70">Páginas</dt>
                  <dd className="text-[18px] font-extrabold tabular-nums">
                    {result.stats.totalPages}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] text-ivory/70">Capítulos</dt>
                  <dd className="text-[18px] font-extrabold tabular-nums text-amber">
                    {result.stats.chaptersCount}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] text-ivory/70">Palavras</dt>
                  <dd className="text-[18px] font-extrabold tabular-nums">
                    {result.stats.totalWords.toLocaleString('pt-MZ')}
                  </dd>
                </div>
              </dl>
            </div>

            {result.stats.scannedPages > 0 && (
              <p className="rounded-xl bg-amber-soft/55 border border-amber/35 px-3.5 py-2.5 text-[12px] text-ink">
                Nota: {result.stats.scannedPages} de {result.stats.totalPages} páginas parecem ser
                imagens digitalizadas sem texto selecionável.
              </p>
            )}

            {/* Dissected Chapters Preview */}
            <div>
              <p className="text-[11.5px] font-bold uppercase tracking-[0.1em] text-ink-muted mb-2">
                Índice Adaptado pelo Fólio ({result.manual.chapters.length} capítulos)
              </p>
              <div className="max-h-52 overflow-y-auto space-y-2 pr-1">
                {result.manual.chapters.map((ch) => (
                  <div
                    key={ch.id}
                    className="rounded-xl bg-parchment/70 border border-sand p-3"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-[13.5px] font-bold text-ink leading-snug">{ch.title}</p>
                      <span className="shrink-0 text-[11.5px] font-extrabold text-forest tabular-nums">
                        Pág. {ch.pageStart}
                      </span>
                    </div>
                    <p className="mt-1 text-[12px] text-ink-soft line-clamp-2 leading-relaxed">
                      {ch.summary}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Instant Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => onOpenManualNow(result.manual)}
                className="min-h-[48px] px-4 rounded-xl bg-forest hover:bg-forest-hover text-ivory font-bold text-[14px] inline-flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <BookOpen className="w-4 h-4 text-amber" aria-hidden="true" />
                <span>Abrir no Leitor</span>
              </button>

              <button
                type="button"
                onClick={() => onSearchManual(result.manual)}
                className="min-h-[48px] px-4 rounded-xl bg-parchment hover:bg-parchment-deep border border-sand-strong text-ink font-bold text-[14px] cursor-pointer transition-colors"
              >
                Pesquisar na Matéria
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
