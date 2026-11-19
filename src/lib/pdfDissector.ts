import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import pdfWorkerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';
import type { DissectionProgress, Manual, ManualChapter, ManualPage, SchoolCycle } from '../types/folio';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

interface RawTextLine {
  text: string;
  y: number;
  fontSize: number;
  pageNumber: number;
}

interface ExtractedPage {
  pageNumber: number;
  lines: RawTextLine[];
  paragraphs: string[];
  headings: string[];
  rawText: string;
}

export interface PdfQuickInspect {
  suggestedTitle: string;
  suggestedSubject: string;
  suggestedGradeNumber: number;
  totalPages: number;
  fileName: string;
  fileSizeBytes: number;
  sampleText: string;
}

export interface DissectOptions {
  title: string;
  subject: string;
  gradeNumber: number;
  publisher?: string;
  defaultUnlocked: boolean;
  priceMt?: number;
  onProgress?: (progress: DissectionProgress) => void;
}

export interface DissectResult {
  manual: Manual;
  stats: {
    totalPages: number;
    textPages: number;
    scannedPages: number;
    chaptersCount: number;
    totalWords: number;
    keywordsCount: number;
  };
}

const PT_STOPWORDS = new Set([
  'a', 'o', 'os', 'as', 'um', 'uma', 'uns', 'umas', 'de', 'do', 'da', 'dos', 'das',
  'em', 'no', 'na', 'nos', 'nas', 'por', 'pelo', 'pela', 'pelos', 'pelas', 'para',
  'com', 'sem', 'sob', 'sobre', 'entre', 'ate', 'até', 'apos', 'após', 'ante', 'contra',
  'desde', 'que', 'quem', 'qual', 'quais', 'cujo', 'cuja', 'onde', 'quando', 'como',
  'porque', 'pois', 'mas', 'porem', 'porém', 'contudo', 'todavia', 'entretanto', 'ou',
  'nem', 'se', 'caso', 'embora', 'conforme', 'segundo', 'e', 'é', 'sao', 'são', 'foi',
  'foram', 'era', 'eram', 'ser', 'estar', 'esta', 'está', 'estao', 'estão', 'ter', 'tem',
  'têm', 'tinha', 'pode', 'podem', 'fazer', 'faz', 'mais', 'menos', 'muito', 'muita',
  'muitos', 'muitas', 'pouco', 'todo', 'toda', 'todos', 'todas', 'outro', 'outra',
  'outros', 'outras', 'mesmo', 'mesma', 'este', 'esta', 'estes', 'estas', 'esse', 'essa',
  'esses', 'essas', 'aquele', 'aquela', 'isto', 'isso', 'aquilo', 'seu', 'sua', 'seus',
  'suas', 'meu', 'minha', 'nosso', 'nossa', 'ele', 'ela', 'eles', 'elas', 'nos', 'nós',
  'voce', 'você', 'nao', 'não', 'sim', 'ja', 'já', 'tambem', 'também', 'ainda', 'so', 'só',
  'apenas', 'bem', 'mal', 'cada', 'assim', 'entao', 'então', 'logo', 'aqui', 'ali', 'la',
  'lá', 'num', 'numa', 'ao', 'aos', 'à', 'às', 'pelo', 'pela', 'página', 'pagina',
  'capitulo', 'capítulo', 'unidade', 'manual', 'classe', 'livro', 'texto', 'figura',
  'tabela', 'exemplo', 'exercicio', 'exercício', 'atividades', 'actividades', 'the', 'and',
  'of', 'to', 'in', 'is', 'for', 'with', 'that', 'this', 'from', 'are', 'be',
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
    regex: /\b(física|fisica|cinemática|cinematica|dinâmica|dinamica|velocidade|aceleração|aceleracao|newton|eletricidade|electricidade|óptica|optica|mecânica|mecanica)\b/gi,
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
  'Outro',
];

export function gradeToCycle(gradeNumber: number): Exclude<SchoolCycle, 'all'> {
  if (gradeNumber <= 6) return '1-6';
  if (gradeNumber <= 9) return '7-9';
  return '10-12';
}

export function formatGrade(gradeNumber: number): string {
  const clamped = Math.max(1, Math.min(12, Math.round(gradeNumber)));
  return `${clamped}.ª Classe`;
}

function normalizeForMatch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function cleanFileNameToTitle(fileName: string): string {
  return fileName
    .replace(/\.pdf$/i, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function detectGrade(text: string): number {
  const match = text.match(/\b(1[0-2]|[1-9])\s*(?:ª|a|\.ª|\.a)?\s*classe\b/i);
  if (match) {
    return parseInt(match[1], 10);
  }
  const alt = text.match(/\bclasse\s*(1[0-2]|[1-9])\b/i);
  if (alt) {
    return parseInt(alt[1], 10);
  }
  return 10;
}

function detectSubject(titleAndFile: string, bodySample: string): string {
  let bestSubject = 'Outro';
  let bestScore = 0;

  for (const item of SUBJECT_PATTERNS) {
    let score = 0;
    if (item.nameRegex.test(titleAndFile)) score += 12;
    const titleHits = titleAndFile.match(item.regex)?.length ?? 0;
    const bodyHits = bodySample.match(item.regex)?.length ?? 0;
    score += titleHits * 4 + bodyHits;

    if (score > bestScore) {
      bestScore = score;
      bestSubject = item.subject;
    }
  }

  return bestSubject;
}

async function extractPageLines(
  pdfDoc: pdfjsLib.PDFDocumentProxy,
  pageNumber: number
): Promise<RawTextLine[]> {
  const page = await pdfDoc.getPage(pageNumber);
  const textContent = await page.getTextContent();

  interface TextFragment {
    str: string;
    x: number;
    y: number;
    fontSize: number;
  }

  const fragments: TextFragment[] = [];

  for (const rawItem of textContent.items) {
    if (!('str' in rawItem)) continue;
    const str = rawItem.str;
    if (!str || !str.trim()) continue;
    const tx = rawItem.transform;
    const x = tx[4] ?? 0;
    const y = tx[5] ?? 0;
    const scaleX = Math.hypot(tx[0] ?? 0, tx[1] ?? 0);
    const scaleY = Math.hypot(tx[2] ?? 0, tx[3] ?? 0);
    const fontSize = Math.max(scaleX, scaleY, rawItem.height || 10);
    fragments.push({ str, x, y, fontSize });
  }

  if (fragments.length === 0) return [];

  // Sort top-to-bottom (descending y in PDF coordinate space), then left-to-right
  fragments.sort((a, b) => {
    const dy = b.y - a.y;
    if (Math.abs(dy) > 3.2) return dy;
    return a.x - b.x;
  });

  const lines: RawTextLine[] = [];
  let currentGroup: TextFragment[] = [fragments[0]];
  let currentY = fragments[0].y;

  for (let i = 1; i < fragments.length; i++) {
    const f = fragments[i];
    const tolerance = Math.max(3.5, currentGroup[0].fontSize * 0.45);
    if (Math.abs(f.y - currentY) <= tolerance) {
      currentGroup.push(f);
    } else {
      lines.push(mergeFragmentsToLine(currentGroup, pageNumber));
      currentGroup = [f];
      currentY = f.y;
    }
  }
  if (currentGroup.length > 0) {
    lines.push(mergeFragmentsToLine(currentGroup, pageNumber));
  }

  return lines.filter((l) => l.text.length > 0);
}

function mergeFragmentsToLine(
  group: Array<{ str: string; x: number; y: number; fontSize: number }>,
  pageNumber: number
): RawTextLine {
  group.sort((a, b) => a.x - b.x);
  let text = '';
  let maxFont = 0;

  for (let i = 0; i < group.length; i++) {
    const item = group[i];
    maxFont = Math.max(maxFont, item.fontSize);
    const piece = item.str.replace(/\s+/g, ' ');
    if (i === 0) {
      text = piece.trimStart();
    } else {
      const prev = group[i - 1];
      const needsSpace =
        !text.endsWith(' ') &&
        !text.endsWith('-') &&
        !piece.startsWith(' ') &&
        !/^[.,;:!?)\]]/.test(piece) &&
        item.x - prev.x > 1.5;
      text += (needsSpace ? ' ' : '') + piece;
    }
  }

  return {
    text: text.replace(/\s+/g, ' ').trim(),
    y: group[0].y,
    fontSize: maxFont,
    pageNumber,
  };
}

/**
 * Quick pre-scan (first 3 pages + PDF metadata) to auto-fill the Upload Form cleanly.
 */
export async function inspectPdfFile(file: File): Promise<PdfQuickInspect> {
  const buffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
  const pdfDoc = await loadingTask.promise;

  let metaTitle = '';
  try {
    const meta = await pdfDoc.getMetadata();
    const info = meta?.info as Record<string, unknown> | undefined;
    if (info && typeof info.Title === 'string' && info.Title.trim().length > 3) {
      metaTitle = info.Title.trim();
    }
  } catch {
    // ignore missing metadata
  }

  const samplePages = Math.min(3, pdfDoc.numPages);
  let sampleText = '';
  for (let p = 1; p <= samplePages; p++) {
    const lines = await extractPageLines(pdfDoc, p);
    sampleText += lines.map((l) => l.text).join(' ') + '\n';
  }

  const titleContext = `${file.name} ${metaTitle}`;
  const combinedForDetection = `${titleContext} ${sampleText.slice(0, 2200)}`;
  const suggestedSubject = detectSubject(titleContext, sampleText.slice(0, 2200));
  const suggestedGradeNumber = detectGrade(combinedForDetection);
  const cleanFileTitle = cleanFileNameToTitle(file.name);
  const suggestedTitle =
    metaTitle && !/microsoft word|untitled|document/i.test(metaTitle)
      ? metaTitle
      : cleanFileTitle || `${suggestedSubject} — ${formatGrade(suggestedGradeNumber)}`;

  await loadingTask.destroy();

  return {
    suggestedTitle,
    suggestedSubject,
    suggestedGradeNumber,
    totalPages: pdfDoc.numPages,
    fileName: file.name,
    fileSizeBytes: file.size,
    sampleText: sampleText.slice(0, 600),
  };
}

function isHeadingCandidate(line: RawTextLine, bodyFontSize: number): boolean {
  const t = line.text.trim();
  if (t.length < 4 || t.length > 125) return false;
  if (/^\d+$/.test(t)) return false; // pure page number
  if (/^(página|pagina|pág\.?)\s*\d+$/i.test(t)) return false;

  // Explicit curriculum structural markers
  if (
    /^(unidade(\s+temática|\s+didática)?|capítulo|capitulo|tema|lição|licao|módulo|modulo|parte|secção|seccao)\s+([ivxlcdm]+|\d+)/i.test(
      t
    )
  ) {
    return true;
  }

  // Numbered heading with larger font or clean title casing
  if (/^\d+(\.\d+)?\.?\s+[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ]/.test(t) && t.length <= 95 && !/[.!?]$/.test(t)) {
    if (line.fontSize >= bodyFontSize * 1.06) return true;
  }

  // Significantly larger font than body copy
  if (line.fontSize >= bodyFontSize * 1.24 && t.length <= 105 && !/[.,;]$/.test(t)) {
    const wordCount = t.split(/\s+/).length;
    if (wordCount >= 1 && wordCount <= 14) return true;
  }

  // All-caps medium-length section titles
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
  // Convert screaming ALL CAPS to readable Title/Sentence case
  const letters = t.replace(/[^A-Za-zÁÀÂÃÉÊÍÓÔÕÚÇáàâãéêíóôõúç]/g, '');
  if (letters.length > 5 && letters === letters.toUpperCase()) {
    t = t
      .toLowerCase()
      .replace(/(^|\s|[-–—/])([a-záàâãéêíóôõúç])/g, (_, sep, ch) => sep + ch.toUpperCase())
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
    const cleaned = buffer
      .replace(/\s+/g, ' ')
      .replace(/\s+([.,;:!?])/g, '$1')
      .trim();
    if (cleaned.length >= 20) {
      paragraphs.push(cleaned);
    }
    buffer = '';
  };

  for (const line of lines) {
    const trimmed = line.text.trim();
    if (!trimmed) continue;

    // Strip isolated page numbers & repeated running headers/footers
    if (/^\d{1,4}$/.test(trimmed)) continue;
    if (repeatedEdgeLines.has(normalizeForMatch(trimmed))) continue;

    if (isHeadingCandidate(line, bodyFontSize)) {
      flush();
      headings.push(cleanHeadingTitle(trimmed));
      prevLine = line;
      continue;
    }

    const lineGap = prevLine ? Math.abs(prevLine.y - line.y) : 0;
    const expectedLineStep = Math.max(12, bodyFontSize * 1.42);
    const isBullet = /^[•▪▸◦–—\-*]\s+/.test(trimmed) || /^[a-z]\)\s+/i.test(trimmed);
    const prevEndedSentence = /[.!?:»"]$/.test(buffer.trim());

    const startsNewParagraph =
      buffer.length > 0 &&
      (isBullet ||
        lineGap > expectedLineStep * 1.38 ||
        (buffer.length > 380 && prevEndedSentence && lineGap > expectedLineStep * 1.08));

    if (startsNewParagraph) {
      flush();
    }

    if (buffer.endsWith('-') && /^[a-záàâãéêíóôõúç]/.test(trimmed)) {
      // Rejoin hyphenated Portuguese word split across lines
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
  const words = text.match(/[A-Za-zÁÀÂÃÉÊÍÓÔÕÚÇáàâãéêíóôõúç][A-Za-zÁÀÂÃÉÊÍÓÔÕÚÇáàâãéêíóôõúç-]{3,}/g) || [];

  for (const raw of words) {
    const clean = raw.replace(/^-|-$/g, '');
    const norm = normalizeForMatch(clean);
    if (norm.length < 4 || PT_STOPWORDS.has(norm)) continue;
    freq.set(norm, (freq.get(norm) ?? 0) + 1);
  }

  // Keep best surface capitalization seen for each normalized term
  const surface = new Map<string, string>();
  for (const raw of words) {
    const clean = raw.replace(/^-|-$/g, '');
    const norm = normalizeForMatch(clean);
    if (!surface.has(norm)) {
      surface.set(norm, clean.toLowerCase());
    }
  }

  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([norm]) => surface.get(norm) ?? norm);
}

function generateDidacticSummary(
  title: string,
  paragraphs: string[],
  keywords: string[]
): { summary: string; keyTakeaways: string[] } {
  const fullText = paragraphs.join(' ');
  const rawSentences = fullText
    .split(/(?<=[.!?])\s+(?=[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ0-9])/)
    .map((s) => s.replace(/\s+/g, ' ').trim())
    .filter((s) => s.length >= 42 && s.length <= 300);

  if (rawSentences.length === 0) {
    const fallback = paragraphs[0]?.slice(0, 220) || `Conteúdo indexado sobre ${title}.`;
    return {
      summary: fallback.endsWith('.') ? fallback : `${fallback}...`,
      keyTakeaways: keywords.length
        ? [`Conceitos centrais abordados: ${keywords.slice(0, 4).join(', ')}.`]
        : [`Tema estruturado a partir do manual original para estudo rápido.`],
    };
  }

  const kwSet = new Set(keywords.map(normalizeForMatch));
  const titleWords = new Set(
    normalizeForMatch(title)
      .split(/\s+/)
      .filter((w) => w.length > 3 && !PT_STOPWORDS.has(w))
  );

  const didacticBonusRegex =
    /\b(é o|é a|é um|é uma|define-se|consiste em|designa-se|chama-se|divide-se|caracteriza-se|carateriza-se|permite|resulta|processo|fórmula|formula|lei de|equação|equacao|função|funcao|importância|importancia|objetivo|objectivo|princípio|principio)\b/i;

  const scored = rawSentences.map((sentence, idx) => {
    const norm = normalizeForMatch(sentence);
    let score = 0;

    // Position bonus (opening definitions carry high academic weight)
    if (idx === 0) score += 3.2;
    else if (idx <= 3) score += 1.8;

    // Didactic definition markers
    if (didacticBonusRegex.test(sentence)) score += 3.5;

    // Keyword overlap
    const tokens = norm.split(/[^a-z0-9]+/);
    let kwHits = 0;
    for (const tok of tokens) {
      if (kwSet.has(tok)) kwHits += 1;
      if (titleWords.has(tok)) score += 1.2;
    }
    score += Math.min(kwHits * 0.9, 4.5);

    // Ideal length sweet spot
    if (sentence.length >= 70 && sentence.length <= 210) score += 1.5;

    // Penalize question-only exercise prompts in summaries
    if (sentence.endsWith('?') || /^(exercício|exercicio|atividade|actividade|responde|calcula|indica)/i.test(sentence)) {
      score -= 4;
    }

    return { sentence, idx, score };
  });

  const ranked = [...scored].sort((a, b) => b.score - a.score);

  // Pick top 2 distinct sentences for summary, restored in reading order
  const pickedSummary = ranked
    .slice(0, 2)
    .sort((a, b) => a.idx - b.idx)
    .map((item) => item.sentence);

  let summary = pickedSummary.join(' ');
  if (summary.length > 340) {
    summary = pickedSummary[0];
  }

  // Pick 3–4 crisp takeaways (preferring non-duplicate high-signal sentences)
  const takeawayCandidates: string[] = [];
  for (const item of ranked) {
    if (takeawayCandidates.length >= 4) break;
    if (takeawayCandidates.some((existing) => existing.slice(0, 40) === item.sentence.slice(0, 40))) {
      continue;
    }
    takeawayCandidates.push(item.sentence);
  }

  return {
    summary,
    keyTakeaways: takeawayCandidates.slice(0, 4),
  };
}

/**
 * Full PDF Dissection Pipeline:
 * Extracts page-by-page text, cleans layout artifacts, detects chapters/units,
 * generates Portuguese didactic summaries & key concepts, and formats a Fólio Manual.
 */
export async function dissectPdfToManual(
  file: File,
  options: DissectOptions
): Promise<DissectResult> {
  const report = (p: DissectionProgress) => options.onProgress?.(p);

  report({
    stage: 'reading',
    percent: 5,
    detail: 'A abrir o ficheiro PDF...',
  });

  const buffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
  const pdfDoc = await loadingTask.promise;
  const totalPages = pdfDoc.numPages;

  // Stage 1: Extract raw lines & font statistics from every page
  const rawPages: Array<{ pageNumber: number; lines: RawTextLine[] }> = [];
  const allFontSizes: number[] = [];
  const edgeLineCounts = new Map<string, number>();

  for (let p = 1; p <= totalPages; p++) {
    const lines = await extractPageLines(pdfDoc, p);
    rawPages.push({ pageNumber: p, lines });

    for (const l of lines) {
      if (l.text.length > 15) {
        allFontSizes.push(Math.round(l.fontSize * 10) / 10);
      }
    }

    // Track first & last lines across pages to identify repeating running headers/footers
    if (lines.length >= 3) {
      const topNorm = normalizeForMatch(lines[0].text);
      const bottomNorm = normalizeForMatch(lines[lines.length - 1].text);
      if (topNorm.length > 2 && topNorm.length < 90) {
        edgeLineCounts.set(topNorm, (edgeLineCounts.get(topNorm) ?? 0) + 1);
      }
      if (bottomNorm.length > 2 && bottomNorm.length < 90) {
        edgeLineCounts.set(bottomNorm, (edgeLineCounts.get(bottomNorm) ?? 0) + 1);
      }
    }

    if (p % 2 === 0 || p === totalPages) {
      report({
        stage: 'reading',
        percent: Math.round(5 + (p / totalPages) * 45),
        currentPage: p,
        totalPages,
        detail: `A extrair texto da página ${p} de ${totalPages}...`,
      });
    }
  }

  await loadingTask.destroy();

  // Compute median body font size
  allFontSizes.sort((a, b) => a - b);
  const bodyFontSize =
    allFontSizes.length > 0 ? allFontSizes[Math.floor(allFontSizes.length * 0.5)] : 11;

  // Identify running headers/footers repeated on >= 30% of pages (when doc has >= 4 pages)
  const repeatedEdgeLines = new Set<string>();
  if (totalPages >= 4) {
    const threshold = Math.max(3, Math.floor(totalPages * 0.3));
    for (const [normLine, count] of edgeLineCounts.entries()) {
      if (count >= threshold) {
        repeatedEdgeLines.add(normLine);
      }
    }
  }

  // Stage 2: Clean lines into editorial paragraphs & identify headings per page
  report({
    stage: 'cleaning',
    percent: 58,
    detail: 'A limpar quebras de linha, cabeçalhos repetidos e estruturar parágrafos...',
  });

  const extractedPages: ExtractedPage[] = [];
  let textPages = 0;
  let scannedPages = 0;

  for (const rp of rawPages) {
    const { paragraphs, headings } = buildParagraphsFromLines(
      rp.lines,
      bodyFontSize,
      repeatedEdgeLines
    );
    const rawText = rp.lines.map((l) => l.text).join(' ');
    if (paragraphs.length > 0 || headings.length > 0 || rawText.trim().length > 25) {
      textPages += 1;
    } else {
      scannedPages += 1;
    }
    extractedPages.push({
      pageNumber: rp.pageNumber,
      lines: rp.lines,
      paragraphs,
      headings,
      rawText,
    });
  }

  // Stage 3: Dissect into structured thematic chapters
  report({
    stage: 'structuring',
    percent: 72,
    detail: 'A identificar unidades, capítulos e números de página exatos...',
  });

  const manualId = `pdf-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

  interface DraftChapter {
    title: string;
    unitLabel?: string;
    pageStart: number;
    pageEnd: number;
    paragraphs: string[];
    pages: ManualPage[];
  }

  const drafts: DraftChapter[] = [];
  let currentUnitLabel: string | undefined;
  let activeDraft: DraftChapter | null = null;

  for (const ep of extractedPages) {
    const usableParagraphs =
      ep.paragraphs.length > 0
        ? ep.paragraphs
        : ep.rawText.trim().length > 25
          ? [ep.rawText.trim()]
          : [];

    if (ep.headings.length > 0) {
      const primaryHeading = ep.headings[0];
      const isUnitMarker = /^(unidade|módulo|modulo|parte)\b/i.test(primaryHeading);

      if (isUnitMarker && ep.headings.length > 1) {
        currentUnitLabel = primaryHeading;
        const subHeading = ep.headings[1];
        if (activeDraft && activeDraft.paragraphs.length > 0) {
          drafts.push(activeDraft);
        }
        activeDraft = {
          title: subHeading,
          unitLabel: currentUnitLabel,
          pageStart: ep.pageNumber,
          pageEnd: ep.pageNumber,
          paragraphs: [...usableParagraphs],
          pages: usableParagraphs.length
            ? [{ pageNumber: ep.pageNumber, paragraphs: usableParagraphs }]
            : [],
        };
        continue;
      }

      if (isUnitMarker) {
        currentUnitLabel = primaryHeading;
      }

      // Start new chapter if current one already has meaningful content
      const currentChars = activeDraft ? activeDraft.paragraphs.join(' ').length : 0;
      if (!activeDraft || currentChars >= 240) {
        if (activeDraft && activeDraft.paragraphs.length > 0) {
          drafts.push(activeDraft);
        }
        activeDraft = {
          title: primaryHeading,
          unitLabel: isUnitMarker ? undefined : currentUnitLabel,
          pageStart: ep.pageNumber,
          pageEnd: ep.pageNumber,
          paragraphs: [...usableParagraphs],
          pages: usableParagraphs.length
            ? [{ pageNumber: ep.pageNumber, paragraphs: usableParagraphs }]
            : [],
        };
        continue;
      } else if (!activeDraft.title || activeDraft.title.startsWith('Secção')) {
        activeDraft.title = primaryHeading;
      }
    }

    if (usableParagraphs.length === 0) continue;

    // If no headings were detected yet, start a thematic folio every 3 pages
    if (!activeDraft) {
      activeDraft = {
        title: `Secção inicial · ${options.subject}`,
        unitLabel: currentUnitLabel,
        pageStart: ep.pageNumber,
        pageEnd: ep.pageNumber,
        paragraphs: [...usableParagraphs],
        pages: [{ pageNumber: ep.pageNumber, paragraphs: usableParagraphs }],
      };
    } else if (
      ep.pageNumber - activeDraft.pageStart >= 4 &&
      activeDraft.paragraphs.join(' ').length >= 1600
    ) {
      drafts.push(activeDraft);
      const leadWords = extractKeywords(usableParagraphs.join(' '), 3);
      const inferredTitle =
        leadWords.length > 0
          ? `${leadWords.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(', ')}`
          : `Continuação · Página ${ep.pageNumber}`;
      activeDraft = {
        title: inferredTitle,
        unitLabel: currentUnitLabel,
        pageStart: ep.pageNumber,
        pageEnd: ep.pageNumber,
        paragraphs: [...usableParagraphs],
        pages: [{ pageNumber: ep.pageNumber, paragraphs: usableParagraphs }],
      };
    } else {
      activeDraft.pageEnd = ep.pageNumber;
      activeDraft.paragraphs.push(...usableParagraphs);
      activeDraft.pages.push({ pageNumber: ep.pageNumber, paragraphs: usableParagraphs });
    }
  }

  if (activeDraft && activeDraft.paragraphs.length > 0) {
    drafts.push(activeDraft);
  }

  // Handle scanned / image-only PDFs cleanly so the user still gets an honest result
  if (drafts.length === 0) {
    drafts.push({
      title: `${options.title} (Digitalização por imagem)`,
      unitLabel: 'Aviso de Extração',
      pageStart: 1,
      pageEnd: totalPages,
      paragraphs: [
        `Este ficheiro PDF (${totalPages} páginas) contém páginas digitalizadas como imagem sem camada de texto selecionável incorporada.`,
        'Para indexação automática por parágrafo e resumo didático, utilize um PDF com texto selecionável ou ative o processamento OCR no backend do Fólio na próxima fase.',
      ],
      pages: [
        {
          pageNumber: 1,
          paragraphs: [
            `Este ficheiro PDF (${totalPages} páginas) contém páginas digitalizadas como imagem sem camada de texto selecionável incorporada.`,
            'Para indexação automática por parágrafo e resumo didático, utilize um PDF com texto selecionável ou ative o processamento OCR no backend do Fólio na próxima fase.',
          ],
        },
      ],
    });
  }

  // Stage 4: Generate didactic summaries, key takeaways & keywords per chapter
  report({
    stage: 'summarizing',
    percent: 86,
    detail: `A gerar resumos didáticos e conceitos-chave para ${drafts.length} capítulos...`,
  });

  let totalWords = 0;
  let totalKeywords = 0;

  const chapters: ManualChapter[] = drafts.map((draft, index) => {
    const joined = draft.paragraphs.join(' ');
    const wordCount = joined.split(/\s+/).filter(Boolean).length;
    totalWords += wordCount;

    const keywords = extractKeywords(`${draft.title} ${joined}`, 7);
    totalKeywords += keywords.length;

    // Improve generic opening section title using top extracted keywords
    let finalTitle = draft.title;
    if (finalTitle.startsWith('Secção inicial') && keywords.length >= 2) {
      const pretty = keywords
        .slice(0, 3)
        .map((k) => k.charAt(0).toUpperCase() + k.slice(1))
        .join(' e ');
      finalTitle = `${options.subject}: ${pretty}`;
    }

    const { summary, keyTakeaways } = generateDidacticSummary(
      finalTitle,
      draft.paragraphs,
      keywords
    );

    const previewParagraphs = draft.paragraphs.slice(0, 2);
    const readingMinutes = Math.max(1, Math.round(wordCount / 180));

    return {
      id: `${manualId}-ch-${index + 1}`,
      manualId,
      title: finalTitle,
      unitLabel: draft.unitLabel || `Fólio ${index + 1} · Págs. ${draft.pageStart}–${draft.pageEnd}`,
      pageStart: draft.pageStart,
      pageEnd: draft.pageEnd,
      summary,
      keyTakeaways,
      keywords,
      previewParagraphs:
        previewParagraphs.length > 0 ? previewParagraphs : [summary],
      paragraphs: draft.paragraphs,
      pages: draft.pages,
      readingMinutes,
    };
  });

  const manual: Manual = {
    id: manualId,
    title: options.title.trim() || `${options.subject} — ${formatGrade(options.gradeNumber)}`,
    subject: options.subject,
    grade: formatGrade(options.gradeNumber),
    gradeNumber: options.gradeNumber,
    cycle: gradeToCycle(options.gradeNumber),
    publisher: options.publisher?.trim() || 'Importado via PDF · Adaptado pelo Fólio',
    year: String(new Date().getFullYear()),
    totalPages,
    priceMt: options.priceMt ?? 17,
    sourceType: 'pdf_upload',
    fileName: file.name,
    fileSizeBytes: file.size,
    defaultUnlocked: options.defaultUnlocked,
    createdAt: new Date().toISOString(),
    chapters,
  };

  report({
    stage: 'done',
    percent: 100,
    totalPages,
    currentPage: totalPages,
    detail: `Concluído: ${chapters.length} capítulos indexados a partir de ${totalPages} páginas.`,
  });

  return {
    manual,
    stats: {
      totalPages,
      textPages,
      scannedPages,
      chaptersCount: chapters.length,
      totalWords,
      keywordsCount: totalKeywords,
    },
  };
}
