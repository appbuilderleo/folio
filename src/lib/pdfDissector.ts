import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import pdfWorkerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';
import type { AdminTopicDraft, DissectionProgress, TopicPage, TopicVisual } from '../types/folio';

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
  figures: TopicVisual[];
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
    figuresCount: number;
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

interface PixelBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  text?: string;
}

/**
 * Renders a PDF page into:
 * - colorCanvas: natural rendering (cropped above bottom CamScanner watermark if needed), used to crop crisp figures/diagrams
 * - ocrCanvas: optional high-contrast grayscale copy optimized for Portuguese Tesseract OCR
 */
async function renderPageCanvases(
  pdfDoc: pdfjsLib.PDFDocumentProxy,
  pageNumber: number,
  cropBottomWatermark: boolean,
  buildOcrCopy: boolean,
  targetWidth = 1650
): Promise<{
  colorCanvas: HTMLCanvasElement;
  ocrCanvas?: HTMLCanvasElement;
  viewport: ReturnType<pdfjsLib.PDFPageProxy['getViewport']>;
}> {
  const page = await pdfDoc.getPage(pageNumber);
  const baseViewport = page.getViewport({ scale: 1 });
  const scale = Math.min(2.3, Math.max(1.35, targetWidth / Math.max(baseViewport.width, 400)));
  const viewport = page.getViewport({ scale });

  const fullCanvas = document.createElement('canvas');
  fullCanvas.width = Math.round(viewport.width);
  fullCanvas.height = Math.round(viewport.height);

  const ctx = fullCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas 2D indisponível');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, fullCanvas.width, fullCanvas.height);

  await page.render({
    canvas: fullCanvas,
    canvasContext: ctx,
    viewport,
  }).promise;

  const finalHeight = cropBottomWatermark
    ? Math.round(fullCanvas.height * 0.942)
    : fullCanvas.height;

  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = fullCanvas.width;
  colorCanvas.height = finalHeight;
  const cCtx = colorCanvas.getContext('2d', { willReadFrequently: true })!;
  cCtx.drawImage(fullCanvas, 0, 0, fullCanvas.width, finalHeight, 0, 0, fullCanvas.width, finalHeight);

  fullCanvas.width = 0;
  fullCanvas.height = 0;

  if (!buildOcrCopy) {
    return { colorCanvas, viewport };
  }

  const ocrCanvas = document.createElement('canvas');
  ocrCanvas.width = colorCanvas.width;
  ocrCanvas.height = colorCanvas.height;
  const oCtx = ocrCanvas.getContext('2d', { willReadFrequently: true })!;
  oCtx.drawImage(colorCanvas, 0, 0);

  const imgData = oCtx.getImageData(0, 0, ocrCanvas.width, ocrCanvas.height);
  const d = imgData.data;
  for (let i = 0; i < d.length; i += 4) {
    const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    let boosted = (gray - 128) * 1.48 + 136;
    if (boosted > 235) boosted = 255;
    if (boosted < 22) boosted = 0;
    const v = Math.max(0, Math.min(255, boosted));
    d[i] = v;
    d[i + 1] = v;
    d[i + 2] = v;
  }
  oCtx.putImageData(imgData, 0, 0);

  return { colorCanvas, ocrCanvas, viewport };
}

/**
 * Checks whether a digital PDF page contains embedded raster images or dense vector schematics
 * worth cropping out as visual illustrations.
 */
async function digitalPageHasGraphics(
  pdfDoc: pdfjsLib.PDFDocumentProxy,
  pageNumber: number
): Promise<boolean> {
  try {
    const page = await pdfDoc.getPage(pageNumber);
    const opList = await page.getOperatorList();
    const OPS = pdfjsLib.OPS;
    let vectorPaths = 0;
    for (const fn of opList.fnArray) {
      if (
        fn === OPS.paintImageXObject ||
        fn === OPS.paintInlineImageXObject ||
        fn === OPS.paintImageXObjectRepeat ||
        fn === OPS.paintXObject
      ) {
        return true;
      }
      if (fn === OPS.constructPath || fn === OPS.stroke || fn === OPS.fill || fn === OPS.eoFill) {
        vectorPaths += 1;
        if (vectorPaths >= 24) return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Projects native PDF text items onto rendered Canvas pixel rectangles so our figure detector
 * masks out text paragraphs cleanly and isolates only diagrams, schematics, and photos.
 */
async function extractNativeTextPixelBoxes(
  pdfDoc: pdfjsLib.PDFDocumentProxy,
  pageNumber: number,
  viewport: ReturnType<pdfjsLib.PDFPageProxy['getViewport']>
): Promise<PixelBox[]> {
  const page = await pdfDoc.getPage(pageNumber);
  const tc = await page.getTextContent();
  const boxes: PixelBox[] = [];

  for (const item of tc.items) {
    if (!('str' in item) || !item.str.trim()) continue;
    const tx = pdfjsLib.Util.transform(viewport.transform, item.transform);
    const fontH = Math.max(8, Math.hypot(tx[2], tx[3]) || Math.hypot(tx[0], tx[1]));
    const w = Math.max(fontH * 0.6, (item.width || 0) * viewport.scale);
    const x0 = tx[4];
    const y1 = tx[5];
    const y0 = y1 - fontH * 1.1;
    boxes.push({ x0, y0, x1: x0 + w, y1: y1 + fontH * 0.25, text: item.str.trim() });
  }
  return boxes;
}

/**
 * Smart Non-Text Visual Region Detector & Cropper:
 * Isolates real illustrations, photos, charts, and vector schematics on any rendered PDF page
 * by masking out known text lines and finding dense non-paper connected regions.
 */
function extractIllustrationsFromCanvas(
  colorCanvas: HTMLCanvasElement,
  textBoxes: PixelBox[],
  pageNumber: number,
  maxFiguresForPage = 2
): TopicVisual[] {
  const W = colorCanvas.width;
  const H = colorCanvas.height;
  if (W < 180 || H < 180) return [];

  const ctx = colorCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return [];
  const data = ctx.getImageData(0, 0, W, H).data;

  // Estimate paper background luminance from sampled interior pixels (75th percentile = paper)
  const samples: number[] = [];
  const stepX = Math.max(8, Math.floor(W / 40));
  const stepY = Math.max(8, Math.floor(H / 40));
  for (let y = Math.floor(H * 0.05); y < Math.floor(H * 0.95); y += stepY) {
    for (let x = Math.floor(W * 0.05); x < Math.floor(W * 0.95); x += stepX) {
      const idx = (y * W + x) * 4;
      samples.push(0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]);
    }
  }
  samples.sort((a, b) => a - b);
  const paperLum = samples.length ? samples[Math.floor(samples.length * 0.78)] : 240;

  const COLS = 36;
  const ROWS = 48;
  const cellW = W / COLS;
  const cellH = H / ROWS;

  // Mark cells covered by confirmed body text lines (exclude short figure labels inside diagrams)
  const textMask = new Uint8Array(COLS * ROWS);
  for (const box of textBoxes) {
    const bw = box.x1 - box.x0;
    const bh = box.y1 - box.y0;
    if (bw < 6 || bh < 6) continue;
    const padX = 4;
    const padY = 3;
    const c0 = Math.max(0, Math.floor((box.x0 - padX) / cellW));
    const c1 = Math.min(COLS - 1, Math.floor((box.x1 + padX) / cellW));
    const r0 = Math.max(0, Math.floor((box.y0 - padY) / cellH));
    const r1 = Math.min(ROWS - 1, Math.floor((box.y1 + padY) / cellH));
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        textMask[r * COLS + c] = 1;
      }
    }
  }

  // Measure non-paper visual ink/color density in every unmasked interior cell
  const activeGrid = new Uint8Array(COLS * ROWS);
  for (let r = 1; r < ROWS - 1; r++) {
    for (let c = 1; c < COLS - 1; c++) {
      if (textMask[r * COLS + c]) continue;
      const xStart = Math.floor(c * cellW);
      const yStart = Math.floor(r * cellH);
      const xEnd = Math.min(W, Math.floor((c + 1) * cellW));
      const yEnd = Math.min(H, Math.floor((r + 1) * cellH));

      let total = 0;
      let ink = 0;
      for (let y = yStart; y < yEnd; y += 2) {
        for (let x = xStart; x < xEnd; x += 2) {
          const idx = (y * W + x) * 4;
          const rv = data[idx];
          const gv = data[idx + 1];
          const bv = data[idx + 2];
          const lum = 0.299 * rv + 0.587 * gv + 0.114 * bv;
          const chroma = Math.max(rv, gv, bv) - Math.min(rv, gv, bv);
          total += 1;
          if (paperLum - lum > 32 || chroma > 34) {
            ink += 1;
          }
        }
      }
      if (total > 0 && ink / total >= 0.085) {
        activeGrid[r * COLS + c] = 1;
      }
    }
  }

  // 1-cell morphological closing (bridges thin whitespace gaps inside vector diagrams/charts)
  const bridged = new Uint8Array(activeGrid);
  for (let r = 1; r < ROWS - 1; r++) {
    for (let c = 1; c < COLS - 1; c++) {
      const i = r * COLS + c;
      if (activeGrid[i] || textMask[i]) continue;
      const horiz = activeGrid[i - 1] && activeGrid[i + 1];
      const vert = activeGrid[i - COLS] && activeGrid[i + COLS];
      if (horiz || vert) bridged[i] = 1;
    }
  }

  // Flood-fill 8-connected components to obtain distinct candidate illustration rectangles
  const visited = new Uint8Array(COLS * ROWS);
  const candidates: Array<{
    c0: number;
    r0: number;
    c1: number;
    r1: number;
    cellCount: number;
  }> = [];

  const dirs = [
    [-1, -1], [0, -1], [1, -1],
    [-1, 0],           [1, 0],
    [-1, 1],  [0, 1],  [1, 1],
  ];

  for (let r = 1; r < ROWS - 1; r++) {
    for (let c = 1; c < COLS - 1; c++) {
      const startIdx = r * COLS + c;
      if (!bridged[startIdx] || visited[startIdx]) continue;

      const queue: Array<[number, number]> = [[c, r]];
      visited[startIdx] = 1;
      let c0 = c;
      let c1 = c;
      let r0 = r;
      let r1 = r;
      let cellCount = 0;

      while (queue.length > 0) {
        const [cc, cr] = queue.pop()!;
        cellCount += 1;
        if (cc < c0) c0 = cc;
        if (cc > c1) c1 = cc;
        if (cr < r0) r0 = cr;
        if (cr > r1) r1 = cr;

        for (const [dc, dr] of dirs) {
          const nc = cc + dc;
          const nr = cr + dr;
          if (nc < 1 || nc >= COLS - 1 || nr < 1 || nr >= ROWS - 1) continue;
          const ni = nr * COLS + nc;
          if (bridged[ni] && !visited[ni]) {
            visited[ni] = 1;
            queue.push([nc, nr]);
          }
        }
      }

      const wFrac = (c1 - c0 + 1) / COLS;
      const hFrac = (r1 - r0 + 1) / ROWS;
      const areaFrac = wFrac * hFrac;
      const fillRatio = cellCount / ((c1 - c0 + 1) * (r1 - r0 + 1));

      // Keep substantial real illustrations/diagrams; reject tiny noise specks or full-page scan shadows
      if (
        wFrac >= 0.14 &&
        hFrac >= 0.08 &&
        areaFrac >= 0.032 &&
        areaFrac <= 0.72 &&
        fillRatio >= 0.24
      ) {
        candidates.push({ c0, r0, c1, r1, cellCount });
      }
    }
  }

  candidates.sort((a, b) => b.cellCount - a.cellCount);
  const picked = candidates.slice(0, maxFiguresForPage);
  const visuals: TopicVisual[] = [];

  for (let idx = 0; idx < picked.length; idx++) {
    const comp = picked[idx];
    const padX = Math.round(cellW * 0.45);
    const padY = Math.round(cellH * 0.45);
    const sx = Math.max(0, Math.floor(comp.c0 * cellW) - padX);
    const sy = Math.max(0, Math.floor(comp.r0 * cellH) - padY);
    const ex = Math.min(W, Math.ceil((comp.c1 + 1) * cellW) + padX);
    const ey = Math.min(H, Math.ceil((comp.r1 + 1) * cellH) + padY);
    const cw = ex - sx;
    const ch = ey - sy;
    if (cw < 80 || ch < 60) continue;

    // Resize cleanly to max 620px width for crisp mobile display & tiny 3G/4G size (~15-30KB)
    const maxOutW = 620;
    const ratio = cw > maxOutW ? maxOutW / cw : 1;
    const outW = Math.round(cw * ratio);
    const outH = Math.round(ch * ratio);

    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = outW;
    cropCanvas.height = outH;
    const cropCtx = cropCanvas.getContext('2d')!;
    cropCtx.fillStyle = '#fcf8ee';
    cropCtx.fillRect(0, 0, outW, outH);
    cropCtx.drawImage(colorCanvas, sx, sy, cw, ch, 0, 0, outW, outH);

    // Prefer compact WebP, fallback to JPEG
    let imageDataUrl = cropCanvas.toDataURL('image/webp', 0.78);
    if (!imageDataUrl.startsWith('data:image/webp')) {
      imageDataUrl = cropCanvas.toDataURL('image/jpeg', 0.76);
    }
    cropCanvas.width = 0;
    cropCanvas.height = 0;

    // Detect nearby caption text immediately below the figure
    const captionLines = textBoxes
      .filter(
        (b) =>
          b.text &&
          b.y0 >= ey - 10 &&
          b.y0 <= ey + H * 0.14 &&
          b.x1 >= sx - 30 &&
          b.x0 <= ex + 30 &&
          !isScannerWatermark(b.text)
      )
      .sort((a, b) => a.y0 - b.y0)
      .slice(0, 3)
      .map((b) => b.text!.trim());

    const rawCaption = captionLines.join(' ').replace(/-\s+/g, '').replace(/\s+/g, ' ').trim();
    const caption = rawCaption.length >= 12 && rawCaption.length <= 210 ? rawCaption : undefined;

    visuals.push({
      id: `fig-p${pageNumber}-${idx + 1}`,
      kind: 'extracted_figure',
      pageNumber,
      title: `Ilustração · Página ${pageNumber}`,
      caption,
      imageDataUrl,
      width: outW,
      height: outH,
    });
  }

  return visuals;
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

  // Pass 1: Extract native non-watermark text layer, detect scanned pages, and crop real diagrams on digital pages
  const rawPages: Array<{
    pageNumber: number;
    lines: RawTextLine[];
    needsOcr: boolean;
    figures: TopicVisual[];
  }> = [];
  let anyWatermarkDetected = Boolean(options.stripBottomWatermark);
  let totalExtractedFigures = 0;
  const MAX_TOTAL_FIGURES = 24;

  for (let p = startPage; p <= endPage; p++) {
    const { cleanLines, detectedWatermark } = await extractNativePageLines(pdfDoc, p);
    if (detectedWatermark) anyWatermarkDetected = true;

    const cleanCharCount = cleanLines.reduce((acc, l) => acc + l.text.length, 0);
    const needsOcr = cleanCharCount < 50;
    let figures: TopicVisual[] = [];

    // On digital native-text pages that contain embedded raster images or vector schematics, crop them cleanly!
    if (!needsOcr && totalExtractedFigures < MAX_TOTAL_FIGURES) {
      const hasGraphics = await digitalPageHasGraphics(pdfDoc, p);
      if (hasGraphics) {
        const { colorCanvas, viewport } = await renderPageCanvases(
          pdfDoc,
          p,
          Boolean(detectedWatermark),
          false,
          1350
        );
        try {
          const textBoxes = await extractNativeTextPixelBoxes(pdfDoc, p, viewport);
          figures = extractIllustrationsFromCanvas(
            colorCanvas,
            textBoxes,
            p,
            Math.min(2, MAX_TOTAL_FIGURES - totalExtractedFigures)
          );
          totalExtractedFigures += figures.length;
        } finally {
          colorCanvas.width = 0;
          colorCanvas.height = 0;
        }
      }
    }

    rawPages.push({ pageNumber: p, lines: cleanLines, needsOcr, figures });

    const doneIdx = p - startPage + 1;
    if (doneIdx % 4 === 0 || p === endPage) {
      onProgress?.({
        stage: 'reading',
        percent: Math.round(4 + (doneIdx / pageCountToProcess) * 14),
        currentPage: p,
        totalPages: endPage,
        detail: `A analisar texto e ilustrações (página ${p} de ${endPage})…`,
      });
    }
  }

  // Pass 2: Automatic Portuguese OCR + Figure Extraction for scanned/photographed pages (CamScanner, etc.)
  const pagesNeedingOcr = rawPages.filter((rp) => rp.needsOcr);
  let ocrSuccessCount = 0;

  if (pagesNeedingOcr.length > 0 && enableOcr) {
    onProgress?.({
      stage: 'ocr',
      percent: 20,
      detail: `A inicializar OCR em Português e extração de ilustrações para ${pagesNeedingOcr.length} páginas…`,
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

      for (let i = 0; i < pagesNeedingOcr.length; i += workerCount) {
        const chunk = pagesNeedingOcr.slice(i, i + workerCount);
        const rendered = await Promise.all(
          chunk.map(async (rp) => ({
            rp,
            canvases: await renderPageCanvases(pdfDoc, rp.pageNumber, anyWatermarkDetected, true, 1650),
          }))
        );

        await Promise.all(
          rendered.map(async ({ rp, canvases }) => {
            const { colorCanvas, ocrCanvas } = canvases;
            try {
              const res = await scheduler.addJob('recognize', ocrCanvas!, {}, { blocks: true });
              const rawBlocks =
                (res.data.blocks as Parameters<typeof parseTesseractBlocksToLines>[0]) ?? null;
              const ocrLines = parseTesseractBlocksToLines(
                rawBlocks,
                res.data.text || '',
                rp.pageNumber
              );
              if (ocrLines.length > 0) {
                rp.lines = ocrLines;
                ocrSuccessCount += 1;
              }

              // Extract real cropped figures/diagrams from the natural colorCanvas using OCR text masks
              if (totalExtractedFigures < MAX_TOTAL_FIGURES) {
                const ocrTextBoxes: PixelBox[] = [];
                for (const b of rawBlocks || []) {
                  for (const p of b.paragraphs || []) {
                    for (const l of p.lines || []) {
                      const lt = l.text.trim();
                      const alpha = (lt.match(/[A-Za-zÁÀÂÃÉÊÍÓÔÕÚÇáàâãéêíóôõúç]/g) || []).length;
                      if (l.confidence >= 50 && alpha >= 5 && !isScannerWatermark(lt)) {
                        ocrTextBoxes.push({
                          x0: l.bbox.x0,
                          y0: l.bbox.y0,
                          x1: l.bbox.x1,
                          y1: l.bbox.y1,
                          text: lt,
                        });
                      }
                    }
                  }
                }
                const pageFigs = extractIllustrationsFromCanvas(
                  colorCanvas,
                  ocrTextBoxes,
                  rp.pageNumber,
                  Math.min(2, MAX_TOTAL_FIGURES - totalExtractedFigures)
                );
                if (pageFigs.length > 0) {
                  rp.figures = pageFigs;
                  totalExtractedFigures += pageFigs.length;
                }
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
                detail: `OCR + Ilustrações: página ${rp.pageNumber} (${completedOcr} de ${pagesNeedingOcr.length})…`,
                ocrSnippet: snippet || undefined,
              });
            } finally {
              colorCanvas.width = 0;
              colorCanvas.height = 0;
              if (ocrCanvas) {
                ocrCanvas.width = 0;
                ocrCanvas.height = 0;
              }
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
      figures: rp.figures,
    });
  }

  onProgress?.({
    stage: 'structuring',
    percent: 76,
    detail: 'A segmentar temas curriculares com páginas e ilustrações exatas…',
  });

  interface Draft {
    title: string;
    unitLabel?: string;
    pageNumber: number;
    pageEnd: number;
    paragraphs: string[];
    pages: TopicPage[];
    visuals: TopicVisual[];
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
          visuals: [...ep.figures],
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
          visuals: [...ep.figures],
          usedOcr: ep.usedOcr,
        };
        continue;
      }
    }

    if (paras.length === 0 && ep.figures.length === 0) continue;

    if (!active) {
      active = {
        title: `Tema inicial · ${subject}`,
        unitLabel: currentUnit,
        pageNumber: ep.pageNumber,
        pageEnd: ep.pageNumber,
        paragraphs: [...paras],
        pages: paras.length ? [{ pageNumber: ep.pageNumber, paragraphs: paras }] : [],
        visuals: [...ep.figures],
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
        pages: paras.length ? [{ pageNumber: ep.pageNumber, paragraphs: paras }] : [],
        visuals: [...ep.figures],
        usedOcr: ep.usedOcr,
      };
    } else {
      active.pageEnd = ep.pageNumber;
      active.paragraphs.push(...paras);
      if (paras.length) active.pages.push({ pageNumber: ep.pageNumber, paragraphs: paras });
      if (ep.figures.length) active.visuals.push(...ep.figures);
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
      visuals: d.visuals,
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
      figuresCount: totalExtractedFigures,
      topicsCount: topics.length,
      totalWords,
    },
  };
}
