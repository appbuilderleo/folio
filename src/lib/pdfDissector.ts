import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import pdfWorkerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';
import type { AdminTopicDraft, DissectionProgress, TopicPage } from '../types/folio';

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

export interface AdminPdfInspect {
  suggestedSubject: string;
  suggestedGradeNumber: number;
  totalPages: number;
  fileName: string;
  fileSizeBytes: number;
}

export interface AdminDissectResult {
  topics: AdminTopicDraft[];
  stats: {
    totalPages: number;
    textPages: number;
    scannedPages: number;
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

export function formatGrade(gradeNumber: number): string {
  const clamped = Math.max(1, Math.min(12, Math.round(gradeNumber)));
  return `${clamped}.ª Classe`;
}

function normalizeForMatch(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function detectGrade(text: string): number {
  const match = text.match(/\b(1[0-2]|[1-9])\s*(?:ª|a|\.ª|\.a)?\s*classe\b/i);
  if (match) return parseInt(match[1], 10);
  const alt = text.match(/\bclasse\s*(1[0-2]|[1-9])\b/i);
  if (alt) return parseInt(alt[1], 10);
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

async function extractPageLines(
  pdfDoc: pdfjsLib.PDFDocumentProxy,
  pageNumber: number
): Promise<RawTextLine[]> {
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

  if (fragments.length === 0) return [];
  fragments.sort((a, b) => {
    const dy = b.y - a.y;
    if (Math.abs(dy) > 3.2) return dy;
    return a.x - b.x;
  });

  const lines: RawTextLine[] = [];
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
      lines.push(mergeGroup(group));
      group = [f];
      currentY = f.y;
    }
  }
  lines.push(mergeGroup(group));
  return lines.filter((l) => l.text.length > 0);
}

export async function inspectAdminPdf(file: File): Promise<AdminPdfInspect> {
  const buffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
  const pdfDoc = await loadingTask.promise;

  const samplePages = Math.min(3, pdfDoc.numPages);
  let sampleText = '';
  for (let p = 1; p <= samplePages; p++) {
    const lines = await extractPageLines(pdfDoc, p);
    sampleText += lines.map((l) => l.text).join(' ') + '\n';
  }

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
  };
}

function isHeadingCandidate(line: RawTextLine, bodyFontSize: number): boolean {
  const t = line.text.trim();
  if (t.length < 4 || t.length > 125) return false;
  if (/^\d+$/.test(t) || /^(página|pagina|pág\.?)\s*\d+$/i.test(t)) return false;

  if (
    /^(unidade(\s+temática|\s+didática)?|capítulo|capitulo|tema|lição|licao|parte|secção|seccao)\s+([ivxlcdm]+|\d+)/i.test(
      t
    )
  ) {
    return true;
  }

  if (/^\d+(\.\d+)?\.?\s+[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ]/.test(t) && t.length <= 95 && !/[.!?]$/.test(t)) {
    if (line.fontSize >= bodyFontSize * 1.06) return true;
  }

  if (line.fontSize >= bodyFontSize * 1.24 && t.length <= 105 && !/[.,;]$/.test(t)) {
    const words = t.split(/\s+/).length;
    if (words >= 1 && words <= 14) return true;
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
    if (cleaned.length >= 20) paragraphs.push(cleaned);
    buffer = '';
  };

  for (const line of lines) {
    const trimmed = line.text.trim();
    if (!trimmed || /^\d{1,4}$/.test(trimmed)) continue;
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
        lineGap > expectedStep * 1.38 ||
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
    .filter((s) => s.length >= 38 && s.length <= 240);

  if (sentences.length === 0) {
    const raw = (paragraphs[0] || `Conteúdo curricular sobre ${title}.`).slice(0, 210);
    return {
      summary: raw.endsWith('.') ? raw : `${raw}…`,
      keyTakeaways: keywords.length ? [`Conceitos principais: ${keywords.slice(0, 4).join(', ')}.`] : [],
    };
  }

  const kwSet = new Set(keywords.map(normalizeForMatch));
  const didacticRegex = /\b(é o|é a|define-se|consiste em|designa-se|chama-se|divide-se|permite|fórmula|lei de)\b/i;

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
 * Admin-only PDF extraction & structural dissection into Curriculum Topics.
 * Produces clean page-indexed drafts ready for server-side Groq ½-paragraph enrichment.
 */
export async function dissectPdfForAdmin(
  file: File,
  subject: string,
  onProgress?: (progress: DissectionProgress) => void
): Promise<AdminDissectResult> {
  onProgress?.({ stage: 'reading', percent: 6, detail: 'A abrir o documento PDF…' });

  const buffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
  const pdfDoc = await loadingTask.promise;
  const totalPages = pdfDoc.numPages;

  const rawPages: Array<{ pageNumber: number; lines: RawTextLine[] }> = [];
  const allFontSizes: number[] = [];
  const edgeLineCounts = new Map<string, number>();

  for (let p = 1; p <= totalPages; p++) {
    const lines = await extractPageLines(pdfDoc, p);
    rawPages.push({ pageNumber: p, lines });

    for (const l of lines) {
      if (l.text.length > 15) allFontSizes.push(Math.round(l.fontSize * 10) / 10);
    }

    if (lines.length >= 3) {
      const topNorm = normalizeForMatch(lines[0].text);
      const botNorm = normalizeForMatch(lines[lines.length - 1].text);
      if (topNorm.length > 2 && topNorm.length < 90) edgeLineCounts.set(topNorm, (edgeLineCounts.get(topNorm) ?? 0) + 1);
      if (botNorm.length > 2 && botNorm.length < 90) edgeLineCounts.set(botNorm, (edgeLineCounts.get(botNorm) ?? 0) + 1);
    }

    if (p % 2 === 0 || p === totalPages) {
      onProgress?.({
        stage: 'reading',
        percent: Math.round(6 + (p / totalPages) * 44),
        currentPage: p,
        totalPages,
        detail: `A extrair página ${p} de ${totalPages}…`,
      });
    }
  }

  await loadingTask.destroy();

  allFontSizes.sort((a, b) => a - b);
  const bodyFontSize = allFontSizes.length > 0 ? allFontSizes[Math.floor(allFontSizes.length * 0.5)] : 11;

  const repeatedEdgeLines = new Set<string>();
  if (totalPages >= 4) {
    const threshold = Math.max(3, Math.floor(totalPages * 0.3));
    for (const [normLine, count] of edgeLineCounts.entries()) {
      if (count >= threshold) repeatedEdgeLines.add(normLine);
    }
  }

  onProgress?.({
    stage: 'cleaning',
    percent: 58,
    detail: 'A limpar cabeçalhos repetidos e estruturar parágrafos…',
  });

  const extractedPages: ExtractedPage[] = [];
  let textPages = 0;
  let scannedPages = 0;

  for (const rp of rawPages) {
    const { paragraphs, headings } = buildParagraphsFromLines(rp.lines, bodyFontSize, repeatedEdgeLines);
    const rawText = rp.lines.map((l) => l.text).join(' ');
    if (paragraphs.length > 0 || headings.length > 0 || rawText.trim().length > 25) textPages += 1;
    else scannedPages += 1;
    extractedPages.push({ pageNumber: rp.pageNumber, lines: rp.lines, paragraphs, headings, rawText });
  }

  onProgress?.({
    stage: 'structuring',
    percent: 68,
    detail: 'A organizar temas curriculares com páginas exatas…',
  });

  interface Draft {
    title: string;
    unitLabel?: string;
    pageNumber: number;
    pageEnd: number;
    paragraphs: string[];
    pages: TopicPage[];
  }

  const drafts: Draft[] = [];
  let currentUnit: string | undefined;
  let active: Draft | null = null;

  for (const ep of extractedPages) {
    const paras =
      ep.paragraphs.length > 0
        ? ep.paragraphs
        : ep.rawText.trim().length > 25
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
        };
        continue;
      }
      if (isUnit) currentUnit = h0;

      const curLen = active ? active.paragraphs.join(' ').length : 0;
      if (!active || curLen >= 240) {
        if (active && active.paragraphs.length > 0) drafts.push(active);
        active = {
          title: h0,
          unitLabel: isUnit ? undefined : currentUnit,
          pageNumber: ep.pageNumber,
          pageEnd: ep.pageNumber,
          paragraphs: [...paras],
          pages: paras.length ? [{ pageNumber: ep.pageNumber, paragraphs: paras }] : [],
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
      };
    } else if (ep.pageNumber - active.pageNumber >= 4 && active.paragraphs.join(' ').length >= 1600) {
      drafts.push(active);
      const lead = extractKeywords(paras.join(' '), 3);
      active = {
        title: lead.length
          ? lead.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(', ')
          : `Matéria · Página ${ep.pageNumber}`,
        unitLabel: currentUnit,
        pageNumber: ep.pageNumber,
        pageEnd: ep.pageNumber,
        paragraphs: [...paras],
        pages: [{ pageNumber: ep.pageNumber, paragraphs: paras }],
      };
    } else {
      active.pageEnd = ep.pageNumber;
      active.paragraphs.push(...paras);
      active.pages.push({ pageNumber: ep.pageNumber, paragraphs: paras });
    }
  }

  if (active && active.paragraphs.length > 0) drafts.push(active);

  if (drafts.length === 0) {
    throw new Error(
      'Nenhuma camada de texto selecionável foi encontrada neste PDF (parece ser imagem digitalizada).'
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
    };
  });

  return {
    topics,
    stats: {
      totalPages,
      textPages,
      scannedPages,
      topicsCount: topics.length,
      totalWords,
    },
  };
}
