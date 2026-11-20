import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import pdfWorkerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';
import type { AdminTopicDraft, DissectionProgress, TopicPage } from '../types/folio';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

interface RawTextLine {
  text: string;
  y: number;
  fontSize: number;
  pageNumber: number;
  fromOcr?: boolean;
  gapBelow?: number;
}

interface ExtractedPage {
  pageNumber: number;
  lines: RawTextLine[];
  paragraphs: string[];
  headings: string[];
  rawText: string;
  usedOcr: boolean;
}

export interface AdminPdfInspect {
  suggestedSubject: string;
  suggestedGradeNumber: number;
  totalPages: number;
  fileName: string;
  fileSizeBytes: number;
  isScannedPdf: boolean;
  detectedWatermark: string | null;
}

export interface AdminDissectOptions {
  subject: string;
  startPage?: number;
  endPage?: number;
  enableOcr?: boolean;
  stripBottomWatermark?: boolean;
  onProgress?: (progress: DissectionProgress) => void;
}

export interface AdminDissectResult {
  topics: AdminTopicDraft[];
  stats: {
    totalPages: number;
    processedPages: number;
    textPages: number;
    ocrPages: number;
    emptyPages: number;
    topicsCount: number;
    totalWords: number;
  };
}

export const AVAILABLE_SUBJECTS = [
  'Biologia',
  'Matemática',
  'Português',
  'História',
  'Física',
  'Química',
  'Geografia',
  'Ciências Naturais',
  'Filosofia',
  'Inglês',
  'Educação Moral e Cívica',
  'Noções de Empreendedorismo',
  'TICs',
];

const SCANNER_WATERMARK_REGEX =
  /\b(scanned\s+(by|with)\s+\w+|camscanner|cam\s*scanner|digitalizado\s+(com|por)\s+\w+|adobe\s*scan|tapscanner|microsoft\s*lens|fast\s*scanner|tiny\s*scanner|clear\s*scanner|genius\s*scan|notebloc|vflat|turbo\s*scan|pdf\s*element|wps\s*office)\b/i;

const PT_STOPWORDS = new Set([
  'a', 'o', 'os', 'as', 'um', 'uma', 'uns', 'umas', 'de', 'do', 'da', 'dos', 'das',
  'em', 'no', 'na', 'nos', 'nas', 'por', 'pelo', 'pela', 'pelos', 'pelas', 'para',
  'com', 'sem', 'sob', 'sobre', 'entre', 'ate', 'até', 'apos', 'após', 'ante', 'contra',
  'desde', 'que', 'quem', 'qual', 'quais', 'cujo', 'cuja', 'onde', 'quando', 'como',
  'porque', 'pois', 'mas', 'porem', 'porém', 'contudo', 'ou', 'nem', 'se', 'caso',
  'embora', 'conforme', 'segundo', 'e', 'é', 'sao', 'são', 'foi', 'foram', 'era', 'eram',
  'ser', 'estar', 'esta', 'está', 'estao', 'estão', 'ter', 'tem', 'têm', 'pode', 'podem',
  'fazer', 'faz', 'mais', 'menos', 'muito', 'muita', 'muitos', 'muitas', 'pouco', 'todo',
  'toda', 'todos', 'todas', 'outro', 'outra', 'mesmo', 'mesma', 'este', 'esta', 'estes',
  'estas', 'esse', 'essa', 'aquele', 'aquela', 'isto', 'isso', 'aquilo', 'seu', 'sua',
  'seus', 'suas', 'meu', 'minha', 'nosso', 'nossa', 'ele', 'ela', 'eles', 'elas', 'nos',
  'nós', 'nao', 'não', 'sim', 'ja', 'já', 'tambem', 'também', 'ainda', 'so', 'só',
  'apenas', 'bem', 'cada', 'assim', 'entao', 'então', 'logo', 'aqui', 'num', 'numa',
  'ao', 'aos', 'à', 'às', 'página', 'pagina', 'capitulo', 'capítulo', 'unidade', 'classe',
  'texto', 'figura', 'tabela', 'exemplo', 'exercicio', 'exercício', 'atividades', 'actividades',
  'tema', 'inicial', 'scanned', 'camscanner',
]);

const SUBJECT_PATTERNS: Array<{ subject: string; nameRegex: RegExp; regex: RegExp }> = [
  {
    subject: 'Biologia',
    nameRegex: /\bbiologia\b/i,
    regex: /\b(biologia|célula|celula|fotossíntese|fotossintese|organismo|ecossistema|genética|genetica|dna|cloroplasto|mitocôndria|mitocondria)\b/gi,
  },
  {
    subject: 'Matemática',
    nameRegex: /\bmatem[aá]tica\b/i,
    regex: /\b(matemática|matematica|álgebra|algebra|geometria|triângulo|triangulo|polinómio|polinomio|logaritmo|pitágoras|pitagoras|discriminante|função quadrática)\b/gi,
  },
  {
    subject: 'Física',
    nameRegex: /\bf[ií]sica\b/i,
    regex: /\b(física|fisica|cinemática|cinematica|dinâmica|dinamica|velocidade|aceleração|aceleracao|newton|eletricidade|electricidade|óptica|optica|mecânica|mecanica|grandezas|medição|medicao)\b/gi,
  },
  {
    subject: 'Química',
    nameRegex: /\bqu[ií]mica\b/i,
    regex: /\b(química|quimica|átomo|atomo|molécula|molecula|reação|reacao|elemento químico|elemento quimico|tabela periódica|tabela periodica|ácido|acido|estequiometria|protões|protoes|eletrões|eletroes|covalente|iónica|ionica|lavoisier)\b/gi,
  },
  {
    subject: 'História',
    nameRegex: /\bhist[oó]ria\b/i,
    regex: /\b(história|historia|independência|independencia|colonial|império|imperio|século|seculo|frelimo|guerra|revolução|revolucao|lusaka|monomotapa)\b/gi,
  },
  {
    subject: 'Português',
    nameRegex: /\bportugu[eê]s\b/i,
    regex: /\b(português|portugues|gramática|gramatica|sintaxe|morfologia|substantivo|adjetivo|adjectivo|verbo|oração|oracao|literatura|acentuação)\b/gi,
  },
  {
    subject: 'Geografia',
    nameRegex: /\bgeografia\b/i,
    regex: /\b(geografia|clima|relevo|hidrografia|população|populacao|cartografia|latitude|longitude|bacia hidrográfica|savana)\b/gi,
  },
  {
    subject: 'Ciências Naturais',
    nameRegex: /\bci[eê]ncias naturais\b/i,
    regex: /\b(ciências naturais|ciencias naturais|ciclo da água|ciclo da agua|corpo humano|plantas|animais|ambiente|evaporação|condensação)\b/gi,
  },
  {
    subject: 'Filosofia',
    nameRegex: /\bfilosofia\b/i,
    regex: /\b(filosofia|lógica|logica|ética|etica|epistemologia|aristóteles|platão|conhecimento|silogismo)\b/gi,
  },
  {
    subject: 'Inglês',
    nameRegex: /\b(ingl[eê]s|english)\b/i,
    regex: /\b(inglês|ingles|english|grammar|vocabulary|reading comprehension)\b/gi,
  },
];

export function formatGrade(gradeNumber: number): string {
  const clamped = Math.max(1, Math.min(12, Math.round(gradeNumber)));
  return `${clamped}.ª Classe`;
}

export function isScannerWatermark(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return true;
  return SCANNER_WATERMARK_REGEX.test(trimmed);
}

function normalizeForMatch(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function detectGrade(text: string): number {
  const match = text.match(/\b(1[0-2]|[1-9])\s*(?:ª|a|\.ª|\.a|º)?\s*(?:classe|cl\.?)\b/i);
  if (match) return parseInt(match[1], 10);
  const alt = text.match(/\bclasse\s*(1[0-2]|[1-9])\b/i);
  if (alt) return parseInt(alt[1], 10);
  const compact = text.match(/\b(1[0-2]|[1-9])(?:a|ª)\b/i);
  if (compact) return parseInt(compact[1], 10);
  return 10;
}

function detectSubject(fileName: string, bodySample: string): string {
  let bestSubject = 'Biologia';
  let bestScore = 0;
  for (const item of SUBJECT_PATTERNS) {
    let score = 0;
    if (item.nameRegex.test(fileName)) score += 12;
    score += (fileName.match(item.regex)?.length ?? 0) * 4;
    score += bodySample.match(item.regex)?.length ?? 0;
    if (score > bestScore) {
      bestScore = score;
      bestSubject = item.subject;
    }
  }
  return bestSubject;
}

async function extractNativePageLines(
  pdfDoc: pdfjsLib.PDFDocumentProxy,
  pageNumber: number
): Promise<{ cleanLines: RawTextLine[]; detectedWatermark: string | null }> {
  const page = await pdfDoc.getPage(pageNumber);
  const textContent = await page.getTextContent();
  const fragments: Array<{ str: string; x: number; y: number; fontSize: number }> = [];

  for (const rawItem of textContent.items) {
    if (!('str' in rawItem)) continue;
    if (!rawItem.str || !rawItem.str.trim()) continue;
    const tx = rawItem.transform;
    const x = tx[4] ?? 0;
    const y = tx[5] ?? 0;
    const scaleX = Math.hypot(tx[0] ?? 0, tx[1] ?? 0);
    const scaleY = Math.hypot(tx[2] ?? 0, tx[3] ?? 0);
    const fontSize = Math.max(scaleX, scaleY, rawItem.height || 10);
    fragments.push({ str: rawItem.str, x, y, fontSize });
  }

  if (fragments.length === 0) return { cleanLines: [], detectedWatermark: null };

  fragments.sort((a, b) => {
    const dy = b.y - a.y;
    if (Math.abs(dy) > 3.2) return dy;
    return a.x - b.x;
  });

  const allLines: RawTextLine[] = [];
  let group = [fragments[0]];
  let currentY = fragments[0].y;

  const mergeGroup = (g: typeof fragments): RawTextLine => {
    g.sort((a, b) => a.x - b.x);
    let text = '';
    let maxFont = 0;
    for (let i = 0; i < g.length; i++) {
      const it = g[i];
      maxFont = Math.max(maxFont, it.fontSize);
      const piece = it.str.replace(/\s+/g, ' ');
      if (i === 0) {
        text = piece.trimStart();
      } else {
        const prev = g[i - 1];
        const needsSpace =
          !text.endsWith(' ') &&
          !text.endsWith('-') &&
          !piece.startsWith(' ') &&
          !/^[.,;:!?)\]]/.test(piece) &&
          it.x - prev.x > 1.5;
        text += (needsSpace ? ' ' : '') + piece;
      }
    }
    return { text: text.replace(/\s+/g, ' ').trim(), y: g[0].y, fontSize: maxFont, pageNumber };
  };

  for (let i = 1; i < fragments.length; i++) {
    const f = fragments[i];
    const tol = Math.max(3.5, group[0].fontSize * 0.45);
    if (Math.abs(f.y - currentY) <= tol) {
      group.push(f);
    } else {
      allLines.push(mergeGroup(group));
      group = [f];
      currentY = f.y;
    }
  }
  allLines.push(mergeGroup(group));

  let detectedWatermark: string | null = null;
  const cleanLines: RawTextLine[] = [];

  for (const line of allLines) {
    if (!line.text) continue;
    if (isScannerWatermark(line.text)) {
      if (!detectedWatermark) detectedWatermark = line.text;
      continue;
    }
    cleanLines.push(line);
  }

  return { cleanLines, detectedWatermark };
}

/**
 * Renders a scanned PDF page to a preprocessed high-contrast Canvas (cropping off
 * CamScanner bottom watermarks if detected) for maximum Portuguese OCR accuracy.
 */
async function renderPageCanvasForOcr(
  pdfDoc: pdfjsLib.PDFDocumentProxy,
  pageNumber: number,
  cropBottomWatermark: boolean
): Promise<HTMLCanvasElement> {
  const page = await pdfDoc.getPage(pageNumber);
  const baseViewport = page.getViewport({ scale: 1 });
  // Aim for ~1650px width for crisp Portuguese diacritics (á, ã, ç, ê, ó) without excess memory
  const scale = Math.min(2.3, Math.max(1.5, 1650 / Math.max(baseViewport.width, 400)));
  const viewport = page.getViewport({ scale });

  const fullCanvas = document.createElement('canvas');
  fullCanvas.width = Math.round(viewport.width);
  fullCanvas.height = Math.round(viewport.height);

  const ctx = fullCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas 2D indisponível para OCR');

  // White paper background before rendering PDF page
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, fullCanvas.width, fullCanvas.height);

  await page.render({
    canvas: fullCanvas,
    canvasContext: ctx,
    viewport,
  }).promise;

  // Crop off bottom 5.8% strip when CamScanner / scanner footer watermark is present
  const finalHeight = cropBottomWatermark
    ? Math.round(fullCanvas.height * 0.942)
    : fullCanvas.height;

  const targetCanvas = document.createElement('canvas');
  targetCanvas.width = fullCanvas.width;
  targetCanvas.height = finalHeight;
  const tCtx = targetCanvas.getContext('2d', { willReadFrequently: true })!;
  tCtx.drawImage(fullCanvas, 0, 0, fullCanvas.width, finalHeight, 0, 0, fullCanvas.width, finalHeight);

  // High-contrast grayscale stretch: clears gray CamScanner paper shadows while keeping ink razor-sharp
  const imgData = tCtx.getImageData(0, 0, targetCanvas.width, targetCanvas.height);
  const d = imgData.data;
  for (let i = 0; i < d.length; i += 4) {
    const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    // Contrast curve: push light paper grays (>188) to pure white, darken ink (<125)
    let boosted = (gray - 128) * 1.48 + 136;
    if (boosted > 235) boosted = 255;
    if (boosted < 22) boosted = 0;
    const v = Math.max(0, Math.min(255, boosted));
    d[i] = v;
    d[i + 1] = v;
    d[i + 2] = v;
  }
  tCtx.putImageData(imgData, 0, 0);

  // Release temporary full canvas
  fullCanvas.width = 0;
  fullCanvas.height = 0;

  return targetCanvas;
}

/**
 * Parses Tesseract v7 block/line/word output, filtering out low-confidence photo speckles
 * and scanner watermarks while preserving vertical layout & heading heights.
 */
function parseTesseractBlocksToLines(
  blocks: Array<{
    paragraphs?: Array<{
      lines?: Array<{
        text: string;
        confidence: number;
        bbox: { x0: number; y0: number; x1: number; y1: number };
        words?: Array<{ text: string; confidence: number }>;
      }>;
    }>;
  }> | null,
  fallbackText: string,
  pageNumber: number
): RawTextLine[] {
  const raw: Array<{ text: string; y0: number; y1: number; h: number }> = [];

  if (blocks && blocks.length > 0) {
    for (const b of blocks) {
      for (const p of b.paragraphs || []) {
        for (const l of p.lines || []) {
          if (l.confidence < 38) continue;

          // Keep only reliable words to eliminate stray speckles from embedded photos/illustrations
          let lineText = '';
          if (Array.isArray(l.words) && l.words.length > 0) {
            const cleanWords = l.words
              .filter((w) => {
                const wt = w.text.trim();
                if (!wt) return false;
                if (w.confidence >= 48) return true;
                // Keep short Portuguese prepositions/punctuation if confidence is moderate
                if (w.confidence >= 35 && /^[a-záàâãéêíóôõúç0-9.,;:!?()\-–]+$/i.test(wt)) {
                  return true;
                }
                return false;
              })
              .map((w) => w.text.trim());
            lineText = cleanWords.join(' ');
          } else {
            lineText = l.text.trim();
          }

          lineText = lineText
            .replace(/\s+/g, ' ')
            .replace(/^[^\wÁÀÂÃÉÊÍÓÔÕÚÇáàâãéêíóôõúç(]+(?=\s)/, '')
            .trim();

          // Filter out meaningless symbol-only photo noise
          const alphaCount = (lineText.match(/[A-Za-zÁÀÂÃÉÊÍÓÔÕÚÇáàâãéêíóôõúç]/g) || []).length;
          if (alphaCount < 3) continue;
          if (isScannerWatermark(lineText)) continue;

          const h = Math.max(10, l.bbox.y1 - l.bbox.y0);
          raw.push({ text: lineText, y0: l.bbox.y0, y1: l.bbox.y1, h });
        }
      }
    }
  }

  // Fallback to plain text if blocks were empty
  if (raw.length === 0 && fallbackText.trim()) {
    const plainLines = fallbackText
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter((s) => {
        if (isScannerWatermark(s)) return false;
        const alpha = (s.match(/[A-Za-zÁÀÂÃÉÊÍÓÔÕÚÇáàâãéêíóôõúç]/g) || []).length;
        return alpha >= 3;
      });
    return plainLines.map((text, idx) => ({
      text,
      y: 10000 - idx * 28,
      fontSize: 16,
      pageNumber,
      fromOcr: true,
    }));
  }

  raw.sort((a, b) => a.y0 - b.y0);

  // Convert top-down pixel y0 into same descending coordinate convention + record gapBelow
  const maxY = raw.reduce((m, r) => Math.max(m, r.y1), 2000) + 50;
  return raw.map((item, idx) => {
    const next = raw[idx + 1];
    const gapBelow = next ? Math.max(0, next.y0 - item.y1) : 0;
    return {
      text: item.text,
      y: maxY - item.y0,
      fontSize: item.h,
      pageNumber,
      fromOcr: true,
      gapBelow,
    };
  });
}

/**
 * Quick pre-scan (first 5 pages) that strips scanner watermarks BEFORE judging
 * whether the PDF is a real digital text PDF or a photographed/CamScanner PDF.
 */
export async function inspectAdminPdf(file: File): Promise<AdminPdfInspect> {
  const buffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
  const pdfDoc = await loadingTask.promise;

  const samplePages = Math.min(5, pdfDoc.numPages);
  let sampleText = '';
  let scannedSampleCount = 0;
  let detectedWatermark: string | null = null;

  for (let p = 1; p <= samplePages; p++) {
    const { cleanLines, detectedWatermark: wm } = await extractNativePageLines(pdfDoc, p);
    if (wm && !detectedWatermark) detectedWatermark = wm;
    const pageText = cleanLines.map((l) => l.text).join(' ').trim();
    if (pageText.length < 45) {
      scannedSampleCount += 1;
    } else {
      sampleText += pageText + '\n';
    }
  }

  const isScannedPdf = scannedSampleCount >= Math.ceil(samplePages * 0.6);
  const suggestedSubject = detectSubject(file.name, sampleText.slice(0, 2200));
  const suggestedGradeNumber = detectGrade(`${file.name} ${sampleText.slice(0, 2200)}`);
  const totalPages = pdfDoc.numPages;

  await loadingTask.destroy();

  return {
    suggestedSubject,
    suggestedGradeNumber,
    totalPages,
    fileName: file.name,
    fileSizeBytes: file.size,
    isScannedPdf,
    detectedWatermark,
  };
}

function isHeadingCandidate(line: RawTextLine, bodyFontSize: number): boolean {
  const t = line.text.trim();
  if (t.length < 4 || t.length > 110) return false;
  if (/^\d+$/.test(t) || /^(página|pagina|pág\.?)\s*\d+$/i.test(t)) return false;
  if (isScannerWatermark(t)) return false;

  if (
    /^(unidade(\s+temática|\s+didática)?|capítulo|capitulo|tema|lição|licao|parte|secção|seccao)\s+([ivxlcdm]+|\d+)/i.test(
      t
    )
  ) {
    return true;
  }

  if (/^\d+(\.\d+)?\.?\s+[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ]/.test(t) && t.length <= 90 && !/[.!?]$/.test(t)) {
    if (line.fontSize >= bodyFontSize * 1.05 || line.fromOcr) return true;
  }

  if (line.fontSize >= bodyFontSize * 1.24 && t.length <= 95 && !/[.,;]$/.test(t)) {
    const words = t.split(/\s+/).length;
    if (words >= 1 && words <= 12) return true;
  }

  // OCR-specific heading heuristic (like "Grandezas físicas" in Print 3!):
  // Short title-like line starting with capital letter, no ending sentence punctuation,
  // followed by noticeable vertical gap above body text.
  if (
    line.fromOcr &&
    /^[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ]/.test(t) &&
    t.length >= 6 &&
    t.length <= 58 &&
    !/[.,;:!?]$/.test(t) &&
    line.fontSize >= bodyFontSize * 1.08 &&
    (line.gapBelow ?? 0) >= bodyFontSize * 0.55
  ) {
    const words = t.split(/\s+/).length;
    if (words >= 2 && words <= 8) return true;
  }

  if (
    t.length >= 6 &&
    t.length <= 72 &&
    t === t.toUpperCase() &&
    /[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ]{4,}/.test(t) &&
    !/[.,;!?]$/.test(t) &&
    line.fontSize >= bodyFontSize * 1.05
  ) {
    return true;
  }

  return false;
}

function cleanHeadingTitle(raw: string): string {
  let t = raw.replace(/\s+/g, ' ').trim();
  const letters = t.replace(/[^A-Za-zÁÀÂÃÉÊÍÓÔÕÚÇáàâãéêíóôõúç]/g, '');
  if (letters.length > 5 && letters === letters.toUpperCase()) {
    t = t
      .toLowerCase()
      .replace(/(^|\s|[-/])([a-záàâãéêíóôõúç])/g, (_, sep, ch) => sep + ch.toUpperCase())
      .replace(/\b(De|Da|Do|Das|Dos|Em|Na|No|Nas|Nos|E|A|O|As|Os|Para|Com|Por|Sobre|Entre|Um|Uma)\b/g, (m) =>
        m.toLowerCase()
      );
    t = t.charAt(0).toUpperCase() + t.slice(1);
  }
  return t;
}

function buildParagraphsFromLines(
  lines: RawTextLine[],
  bodyFontSize: number,
  repeatedEdgeLines: Set<string>
): { paragraphs: string[]; headings: string[] } {
  const paragraphs: string[] = [];
  const headings: string[] = [];
  let buffer = '';
  let prevLine: RawTextLine | null = null;

  const flush = () => {
    const cleaned = buffer.replace(/\s+/g, ' ').replace(/\s+([.,;:!?])/g, '$1').trim();
    if (cleaned.length >= 20 && !isScannerWatermark(cleaned)) {
      paragraphs.push(cleaned);
    }
    buffer = '';
  };

  for (const line of lines) {
    const trimmed = line.text.trim();
    if (!trimmed || /^\d{1,4}$/.test(trimmed)) continue;
    if (isScannerWatermark(trimmed)) continue;
    if (repeatedEdgeLines.has(normalizeForMatch(trimmed))) continue;

    if (isHeadingCandidate(line, bodyFontSize)) {
      flush();
      headings.push(cleanHeadingTitle(trimmed));
      prevLine = line;
      continue;
    }

    const lineGap = prevLine ? Math.abs(prevLine.y - line.y) : 0;
    const expectedStep = Math.max(12, bodyFontSize * 1.42);
    const isBullet = /^[•▪▸◦\-*]\s+/.test(trimmed) || /^[a-z]\)\s+/i.test(trimmed);
    const prevEnded = /[.!?:»"]$/.test(buffer.trim());

    if (
      buffer.length > 0 &&
      (isBullet ||
        lineGap > expectedStep * 1.42 ||
        (buffer.length > 380 && prevEnded && lineGap > expectedStep * 1.08))
    ) {
      flush();
    }

    if (buffer.endsWith('-') && /^[a-záàâãéêíóôõúç]/.test(trimmed)) {
      buffer = buffer.slice(0, -1) + trimmed;
    } else if (buffer.length > 0) {
      buffer += ' ' + trimmed;
    } else {
      buffer = trimmed;
    }

    prevLine = line;
  }

  flush();
  return { paragraphs, headings };
}

function extractKeywords(text: string, limit = 7): string[] {
  const freq = new Map<string, number>();
  const surface = new Map<string, string>();
  const words = text.match(/[A-Za-zÁÀÂÃÉÊÍÓÔÕÚÇáàâãéêíóôõúç][A-Za-zÁÀÂÃÉÊÍÓÔÕÚÇáàâãéêíóôõúç-]{3,}/g) || [];

  for (const raw of words) {
    const clean = raw.replace(/^-|-$/g, '');
    const norm = normalizeForMatch(clean);
    if (norm.length < 4 || PT_STOPWORDS.has(norm)) continue;
    freq.set(norm, (freq.get(norm) ?? 0) + 1);
    if (!surface.has(norm)) surface.set(norm, clean.toLowerCase());
  }

  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([norm]) => surface.get(norm) ?? norm);
}

function buildLocalHalfParagraphSummary(title: string, paragraphs: string[], keywords: string[]) {
  const fullText = paragraphs.join(' ');
  const sentences = fullText
    .split(/(?<=[.!?])\s+(?=[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ0-9])/)
    .map((s) => s.replace(/\s+/g, ' ').trim())
    .filter((s) => s.length >= 38 && s.length <= 240 && !isScannerWatermark(s));

  if (sentences.length === 0) {
    const raw = (paragraphs[0] || `Conteúdo curricular sobre ${title}.`).slice(0, 210);
    return {
      summary: raw.endsWith('.') ? raw : `${raw}…`,
      keyTakeaways: keywords.length ? [`Conceitos principais: ${keywords.slice(0, 4).join(', ')}.`] : [],
    };
  }

  const kwSet = new Set(keywords.map(normalizeForMatch));
  const didacticRegex = /\b(é o|é a|define-se|consiste em|designa-se|chama-se|divide-se|permite|fórmula|lei de|medição|grandeza)\b/i;

  const ranked = sentences
    .map((sentence, idx) => {
      let score = idx === 0 ? 3 : idx <= 2 ? 1.5 : 0;
      if (didacticRegex.test(sentence)) score += 3.5;
      const hits = normalizeForMatch(sentence)
        .split(/[^a-z0-9]+/)
        .filter((t) => kwSet.has(t)).length;
      score += Math.min(hits, 4);
      if (sentence.endsWith('?')) score -= 4;
      return { sentence, idx, score };
    })
    .sort((a, b) => b.score - a.score);

  let summary = ranked[0].sentence;
  if (ranked[1] && summary.length + ranked[1].sentence.length + 1 <= 220) {
    const pair = [ranked[0], ranked[1]].sort((a, b) => a.idx - b.idx);
    summary = `${pair[0].sentence} ${pair[1].sentence}`;
  }
  if (summary.length > 220) {
    summary = summary.slice(0, 216).replace(/\s+\S*$/, '') + '…';
  }

  return {
    summary,
    keyTakeaways: ranked.slice(0, 3).map((r) => r.sentence),
  };
}

/**
 * Admin-only Hybrid PDF Dissector:
 * 1. Strips CamScanner / scanner watermarks automatically.
 * 2. Extracts native digital text where present.
 * 3. Automatically runs parallel Portuguese OCR (tesseract.js) with high-contrast
 *    preprocessing + footer watermark crop on photographed/scanned pages!
 */
export async function dissectPdfForAdmin(
  file: File,
  options: AdminDissectOptions
): Promise<AdminDissectResult> {
  const { subject, onProgress, enableOcr = true } = options;

  onProgress?.({ stage: 'reading', percent: 4, detail: 'A abrir o documento PDF…' });

  const buffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
  const pdfDoc = await loadingTask.promise;
  const totalPages = pdfDoc.numPages;

  const startPage = Math.max(1, Math.min(totalPages, options.startPage ?? 1));
  const endPage = Math.max(startPage, Math.min(totalPages, options.endPage ?? totalPages));
  const pageCountToProcess = endPage - startPage + 1;

  // Pass 1: Extract native non-watermark text layer and detect scanned pages
  const rawPages: Array<{ pageNumber: number; lines: RawTextLine[]; needsOcr: boolean }> = [];
  let anyWatermarkDetected = Boolean(options.stripBottomWatermark);

  for (let p = startPage; p <= endPage; p++) {
    const { cleanLines, detectedWatermark } = await extractNativePageLines(pdfDoc, p);
    if (detectedWatermark) anyWatermarkDetected = true;

    const cleanCharCount = cleanLines.reduce((acc, l) => acc + l.text.length, 0);
    const needsOcr = cleanCharCount < 50;
    rawPages.push({ pageNumber: p, lines: cleanLines, needsOcr });

    const doneIdx = p - startPage + 1;
    if (doneIdx % 4 === 0 || p === endPage) {
      onProgress?.({
        stage: 'reading',
        percent: Math.round(4 + (doneIdx / pageCountToProcess) * 14),
        currentPage: p,
        totalPages: endPage,
        detail: `A analisar camada de texto (página ${p} de ${endPage})…`,
      });
    }
  }

  // Pass 2: Automatic Portuguese OCR for scanned/photographed pages (CamScanner, etc.)
  const pagesNeedingOcr = rawPages.filter((rp) => rp.needsOcr);
  let ocrSuccessCount = 0;

  if (pagesNeedingOcr.length > 0 && enableOcr) {
    onProgress?.({
      stage: 'ocr',
      percent: 20,
      detail: `A inicializar motor OCR em Português para ${pagesNeedingOcr.length} páginas digitalizadas…`,
    });

    const { createScheduler, createWorker } = await import('tesseract.js');
    const scheduler = createScheduler();
    const workerCount = pagesNeedingOcr.length >= 3 ? 2 : 1;

    try {
      for (let w = 0; w < workerCount; w++) {
        const worker = await createWorker('por');
        scheduler.addWorker(worker);
      }

      let completedOcr = 0;

      // Render canvases sequentially (pdfjs canvas pool) in small batches of workerCount and run OCR in parallel
      for (let i = 0; i < pagesNeedingOcr.length; i += workerCount) {
        const chunk = pagesNeedingOcr.slice(i, i + workerCount);
        const rendered = await Promise.all(
          chunk.map(async (rp) => ({
            rp,
            canvas: await renderPageCanvasForOcr(pdfDoc, rp.pageNumber, anyWatermarkDetected),
          }))
        );

        await Promise.all(
          rendered.map(async ({ rp, canvas }) => {
            try {
              const res = await scheduler.addJob('recognize', canvas, {}, { blocks: true });
              const ocrLines = parseTesseractBlocksToLines(
                (res.data.blocks as Parameters<typeof parseTesseractBlocksToLines>[0]) ?? null,
                res.data.text || '',
                rp.pageNumber
              );
              if (ocrLines.length > 0) {
                rp.lines = ocrLines;
                ocrSuccessCount += 1;
              }
              completedOcr += 1;

              const snippet = ocrLines
                .slice(0, 2)
                .map((l) => l.text)
                .join(' — ')
                .slice(0, 120);

              onProgress?.({
                stage: 'ocr',
                percent: Math.round(22 + (completedOcr / pagesNeedingOcr.length) * 48),
                currentPage: rp.pageNumber,
                totalPages: endPage,
                detail: `OCR em Português: página ${rp.pageNumber} (${completedOcr} de ${pagesNeedingOcr.length})…`,
                ocrSnippet: snippet || undefined,
              });
            } finally {
              canvas.width = 0;
              canvas.height = 0;
            }
          })
        );
      }
    } finally {
      await scheduler.terminate();
    }
  }

  await loadingTask.destroy();

  // Compute font statistics across extracted lines
  const allFontSizes: number[] = [];
  const edgeLineCounts = new Map<string, number>();

  for (const rp of rawPages) {
    for (const l of rp.lines) {
      if (l.text.length > 15) allFontSizes.push(Math.round(l.fontSize * 10) / 10);
    }
    if (rp.lines.length >= 3) {
      const topNorm = normalizeForMatch(rp.lines[0].text);
      const botNorm = normalizeForMatch(rp.lines[rp.lines.length - 1].text);
      if (topNorm.length > 2 && topNorm.length < 90) edgeLineCounts.set(topNorm, (edgeLineCounts.get(topNorm) ?? 0) + 1);
      if (botNorm.length > 2 && botNorm.length < 90) edgeLineCounts.set(botNorm, (edgeLineCounts.get(botNorm) ?? 0) + 1);
    }
  }

  allFontSizes.sort((a, b) => a - b);
  const bodyFontSize = allFontSizes.length > 0 ? allFontSizes[Math.floor(allFontSizes.length * 0.5)] : 14;

  const repeatedEdgeLines = new Set<string>();
  if (rawPages.length >= 4) {
    const threshold = Math.max(3, Math.floor(rawPages.length * 0.3));
    for (const [normLine, count] of edgeLineCounts.entries()) {
      if (count >= threshold) repeatedEdgeLines.add(normLine);
    }
  }

  onProgress?.({
    stage: 'cleaning',
    percent: 72,
    detail: 'A limpar marcas de scanner, cabeçalhos repetidos e estruturar parágrafos…',
  });

  const extractedPages: ExtractedPage[] = [];
  let textPages = 0;
  let emptyPages = 0;

  for (const rp of rawPages) {
    const { paragraphs, headings } = buildParagraphsFromLines(rp.lines, bodyFontSize, repeatedEdgeLines);
    const rawText = rp.lines.map((l) => l.text).join(' ');
    if (paragraphs.length > 0 || headings.length > 0) {
      textPages += 1;
    } else {
      emptyPages += 1;
    }
    extractedPages.push({
      pageNumber: rp.pageNumber,
      lines: rp.lines,
      paragraphs,
      headings,
      rawText,
      usedOcr: rp.needsOcr && rp.lines.length > 0,
    });
  }

  onProgress?.({
    stage: 'structuring',
    percent: 76,
    detail: 'A segmentar temas curriculares com páginas exatas…',
  });

  interface Draft {
    title: string;
    unitLabel?: string;
    pageNumber: number;
    pageEnd: number;
    paragraphs: string[];
    pages: TopicPage[];
    usedOcr: boolean;
  }

  const drafts: Draft[] = [];
  let currentUnit: string | undefined;
  let active: Draft | null = null;

  for (const ep of extractedPages) {
    const paras =
      ep.paragraphs.length > 0
        ? ep.paragraphs
        : ep.rawText.trim().length > 35 && !isScannerWatermark(ep.rawText)
          ? [ep.rawText.trim()]
          : [];

    if (ep.headings.length > 0) {
      const h0 = ep.headings[0];
      const isUnit = /^(unidade|parte)\b/i.test(h0);
      if (isUnit && ep.headings.length > 1) {
        currentUnit = h0;
        if (active && active.paragraphs.length > 0) drafts.push(active);
        active = {
          title: ep.headings[1],
          unitLabel: currentUnit,
          pageNumber: ep.pageNumber,
          pageEnd: ep.pageNumber,
          paragraphs: [...paras],
          pages: paras.length ? [{ pageNumber: ep.pageNumber, paragraphs: paras }] : [],
          usedOcr: ep.usedOcr,
        };
        continue;
      }
      if (isUnit) currentUnit = h0;

      const curLen = active ? active.paragraphs.join(' ').length : 0;
      if (!active || curLen >= 220) {
        if (active && active.paragraphs.length > 0) drafts.push(active);
        active = {
          title: h0,
          unitLabel: isUnit ? undefined : currentUnit,
          pageNumber: ep.pageNumber,
          pageEnd: ep.pageNumber,
          paragraphs: [...paras],
          pages: paras.length ? [{ pageNumber: ep.pageNumber, paragraphs: paras }] : [],
          usedOcr: ep.usedOcr,
        };
        continue;
      }
    }

    if (paras.length === 0) continue;

    if (!active) {
      active = {
        title: `Tema inicial · ${subject}`,
        unitLabel: currentUnit,
        pageNumber: ep.pageNumber,
        pageEnd: ep.pageNumber,
        paragraphs: [...paras],
        pages: [{ pageNumber: ep.pageNumber, paragraphs: paras }],
        usedOcr: ep.usedOcr,
      };
    } else if (ep.pageNumber - active.pageNumber >= 3 && active.paragraphs.join(' ').length >= 1400) {
      drafts.push(active);
      const lead = extractKeywords(paras.join(' '), 3);
      active = {
        title: lead.length
          ? lead.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(', ')
          : `${subject} · Página ${ep.pageNumber}`,
        unitLabel: currentUnit,
        pageNumber: ep.pageNumber,
        pageEnd: ep.pageNumber,
        paragraphs: [...paras],
        pages: [{ pageNumber: ep.pageNumber, paragraphs: paras }],
        usedOcr: ep.usedOcr,
      };
    } else {
      active.pageEnd = ep.pageNumber;
      active.paragraphs.push(...paras);
      active.pages.push({ pageNumber: ep.pageNumber, paragraphs: paras });
      active.usedOcr = active.usedOcr || ep.usedOcr;
    }
  }

  if (active && active.paragraphs.length > 0) drafts.push(active);

  if (drafts.length === 0) {
    throw new Error(
      'Não foi possível extrair texto legível deste PDF. Verifica se as páginas têm texto nítido ou ativa o OCR automático.'
    );
  }

  let totalWords = 0;
  const topics: AdminTopicDraft[] = drafts.map((d, idx) => {
    const joined = d.paragraphs.join(' ');
    const wc = joined.split(/\s+/).filter(Boolean).length;
    totalWords += wc;
    const keywords = extractKeywords(`${d.title} ${joined}`, 7);
    let finalTitle = d.title;
    if (finalTitle.startsWith('Tema inicial') && keywords.length >= 2) {
      finalTitle = `${subject}: ${keywords
        .slice(0, 3)
        .map((k) => k.charAt(0).toUpperCase() + k.slice(1))
        .join(' e ')}`;
    }
    const { summary, keyTakeaways } = buildLocalHalfParagraphSummary(finalTitle, d.paragraphs, keywords);
    return {
      unitLabel: d.unitLabel || `Unidade ${idx + 1}`,
      title: finalTitle,
      pageNumber: d.pageNumber,
      pageEnd: d.pageEnd,
      summaryHalfParagraph: summary,
      previewParagraphs: d.paragraphs.slice(0, 2),
      keyTakeaways,
      keywords,
      paragraphs: d.paragraphs,
      pages: d.pages,
      readingMinutes: Math.max(1, Math.round(wc / 180)),
      sourceWasOcr: d.usedOcr,
    };
  });

  return {
    topics,
    stats: {
      totalPages,
      processedPages: pageCountToProcess,
      textPages,
      ocrPages: ocrSuccessCount,
      emptyPages,
      topicsCount: topics.length,
      totalWords,
    },
  };
}
