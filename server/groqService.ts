import dotenv from 'dotenv';
import type { AdminTopicDraft, TopicVisual, VectorDiagramSpec } from '../src/types/folio';

dotenv.config();

const GROQ_CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions';

const PREFERRED_MODELS = [
  'openai/gpt-oss-20b',
  'qwen/qwen3.8-27b',
  'openai/gpt-oss-120b',
];

const MAX_HALF_PARAGRAPH_CHARS = 220;

interface GroqVectorDiagramPayload {
  title?: string;
  caption?: string;
  diagram?: Record<string, unknown>;
}

interface GroqTopicOutput {
  index: number;
  title?: string;
  summaryHalfParagraph?: string;
  keyTakeaways?: string[];
  keywords?: string[];
  cleanedParagraphs?: string[];
  vectorDiagram?: GroqVectorDiagramPayload | null;
}

function sanitizeGroqVectorVisual(
  raw: GroqVectorDiagramPayload | null | undefined,
  pageNumber: number,
  topicIndex: number
): TopicVisual | null {
  if (!raw || typeof raw !== 'object' || !raw.diagram || typeof raw.diagram !== 'object') {
    return null;
  }
  const d = raw.diagram;
  const type = String(d.type || '');
  const title =
    typeof raw.title === 'string' && raw.title.trim().length >= 4
      ? raw.title.trim().slice(0, 88)
      : 'Esquema Ilustrativo';
  const caption =
    typeof raw.caption === 'string' && raw.caption.trim().length >= 8
      ? raw.caption.trim().slice(0, 180)
      : undefined;

  let spec: VectorDiagramSpec | null = null;

  if (type === 'flow' && Array.isArray(d.steps)) {
    const steps = d.steps
      .filter((s): s is Record<string, unknown> => Boolean(s && typeof s === 'object' && typeof (s as Record<string, unknown>).label === 'string'))
      .slice(0, 5)
      .map((s) => ({
        label: String(s.label).trim().slice(0, 54),
        detail: typeof s.detail === 'string' ? s.detail.trim().slice(0, 105) : undefined,
        badge: typeof s.badge === 'string' ? s.badge.trim().slice(0, 20) : undefined,
      }))
      .filter((s) => s.label.length >= 2);
    if (steps.length >= 2) {
      spec = {
        type: 'flow',
        formula: typeof d.formula === 'string' && d.formula.trim() ? d.formula.trim().slice(0, 72) : undefined,
        steps,
      };
    }
  } else if (type === 'cycle' && Array.isArray(d.nodes)) {
    const nodes = d.nodes
      .filter((n): n is Record<string, unknown> => Boolean(n && typeof n === 'object' && typeof (n as Record<string, unknown>).label === 'string'))
      .slice(0, 6)
      .map((n) => ({
        label: String(n.label).trim().slice(0, 26),
        detail: typeof n.detail === 'string' ? n.detail.trim().slice(0, 48) : undefined,
      }))
      .filter((n) => n.label.length >= 2);
    if (nodes.length >= 3) {
      spec = {
        type: 'cycle',
        centerLabel:
          typeof d.centerLabel === 'string' && d.centerLabel.trim()
            ? d.centerLabel.trim().slice(0, 28)
            : title.slice(0, 28),
        nodes,
      };
    }
  } else if (type === 'compare' && Array.isArray(d.columns)) {
    const columns = d.columns
      .filter((c): c is Record<string, unknown> => Boolean(c && typeof c === 'object' && typeof (c as Record<string, unknown>).title === 'string' && Array.isArray((c as Record<string, unknown>).points)))
      .slice(0, 3)
      .map((c) => ({
        title: String(c.title).trim().slice(0, 32),
        badge: typeof c.badge === 'string' ? c.badge.trim().slice(0, 20) : undefined,
        points: (c.points as unknown[]).map((pt) => String(pt).trim().slice(0, 95)).filter((pt) => pt.length >= 3).slice(0, 4),
      }))
      .filter((c) => c.title.length >= 2 && c.points.length >= 1);
    if (columns.length >= 2) {
      spec = { type: 'compare', columns };
    }
  } else if (type === 'timeline' && Array.isArray(d.events)) {
    const events = d.events
      .filter((e): e is Record<string, unknown> => Boolean(e && typeof e === 'object' && typeof (e as Record<string, unknown>).date === 'string' && typeof (e as Record<string, unknown>).label === 'string'))
      .slice(0, 6)
      .map((e) => ({
        date: String(e.date).trim().slice(0, 16),
        label: String(e.label).trim().slice(0, 48),
        detail: typeof e.detail === 'string' ? e.detail.trim().slice(0, 90) : undefined,
      }))
      .filter((e) => e.date.length >= 2 && e.label.length >= 2);
    if (events.length >= 2) {
      spec = { type: 'timeline', events };
    }
  } else if (type === 'geometry_triangle' && typeof d.formula === 'string') {
    spec = {
      type: 'geometry_triangle',
      sideA: String(d.sideA || 'Cateto (a)').slice(0, 20),
      sideB: String(d.sideB || 'Cateto (b)').slice(0, 20),
      hypotenuse: String(d.hypotenuse || 'Hipotenusa (h)').slice(0, 22),
      formula: String(d.formula).slice(0, 30),
      note: typeof d.note === 'string' ? d.note.slice(0, 48) : undefined,
    };
  } else if (type === 'atom_model' && Array.isArray(d.shells)) {
    const shells = d.shells.map((s) => String(s).trim().slice(0, 32)).filter(Boolean).slice(0, 4);
    if (shells.length >= 1) {
      spec = {
        type: 'atom_model',
        nucleusLabel: String(d.nucleusLabel || 'Núcleo').slice(0, 14),
        shells,
        note: typeof d.note === 'string' ? d.note.slice(0, 64) : undefined,
      };
    }
  } else if (type === 'kinematics_graph' && Array.isArray(d.equations)) {
    const equations = d.equations.map((eq) => String(eq).trim().slice(0, 28)).filter(Boolean).slice(0, 4);
    if (equations.length >= 1) {
      spec = {
        type: 'kinematics_graph',
        xLabel: String(d.xLabel || 'Tempo (s)').slice(0, 16),
        yLabel: String(d.yLabel || 'v (m/s)').slice(0, 16),
        areaLabel: String(d.areaLabel || 'Área = Δx').slice(0, 16),
        equations,
      };
    }
  }

  if (!spec) return null;
  return {
    id: `vec-ai-p${pageNumber}-${topicIndex + 1}`,
    kind: 'vector_diagram',
    pageNumber,
    title,
    caption,
    diagram: spec,
  };
}

export interface GroqTopicsEnrichResult {
  topics: AdminTopicDraft[];
  enrichedCount: number;
  totalCount: number;
  modelUsed: string | null;
  warnings: string[];
}

export function isGroqConfigured(): boolean {
  const key = process.env.GROQ_API_KEY?.trim();
  return Boolean(key && key.length > 10);
}

export function getPreferredGroqModel(): string {
  const custom = process.env.GROQ_MODEL?.trim();
  return custom || PREFERRED_MODELS[0];
}

function getModelCascade(): string[] {
  const custom = process.env.GROQ_MODEL?.trim();
  const list = custom ? [custom, ...PREFERRED_MODELS] : [...PREFERRED_MODELS];
  return Array.from(new Set(list));
}

/**
 * Enforces the strict ½-paragraph rule: 2–3 objective sentences, up to ~220 chars.
 */
export function clampHalfParagraph(raw: string, maxChars = MAX_HALF_PARAGRAPH_CHARS): string {
  const clean = raw
    .replace(/\b(pdf|livro|manual|módulo|modulo|ficheiro)\b/gi, 'matéria')
    .replace(/\s+/g, ' ')
    .trim();

  if (clean.length <= maxChars) return clean;

  // Prefer cutting cleanly at a sentence boundary within maxChars
  const slice = clean.slice(0, maxChars);
  const lastSentenceEnd = Math.max(slice.lastIndexOf('. '), slice.lastIndexOf('! '), slice.lastIndexOf('? '));
  if (lastSentenceEnd >= 90) {
    return slice.slice(0, lastSentenceEnd + 1).trim();
  }

  // Fallback: cut at word boundary
  const lastSpace = slice.lastIndexOf(' ');
  const trimmed = (lastSpace > 80 ? slice.slice(0, lastSpace) : slice).replace(/[,;:\s]+$/, '');
  return trimmed.endsWith('.') ? trimmed : `${trimmed}…`;
}

function extractJsonObject(raw: string): unknown {
  let cleaned = raw.trim();
  cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1));
    }
    throw new Error('JSON inválido na resposta da Groq');
  }
}

async function callGroqTopicBatch(
  meta: { subject: string; grade: string },
  batch: Array<{ index: number; topic: AdminTopicDraft }>
): Promise<{ items: GroqTopicOutput[]; model: string }> {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) throw new Error('GROQ_API_KEY não configurada');

  const hasOcrTopics = batch.some((b) => b.topic.sourceWasOcr);

  const payload = batch.map(({ index, topic }) => ({
    index,
    pageNumber: topic.pageNumber,
    unitLabel: topic.unitLabel ?? '',
    detectedTitle: topic.title,
    sourceWasOcr: Boolean(topic.sourceWasOcr),
    paragraphs: topic.sourceWasOcr
      ? topic.paragraphs.slice(0, 12).map((p) => p.slice(0, 750))
      : undefined,
    excerpt: topic.paragraphs.join('\n\n').slice(0, 3200),
  }));

  const systemPrompt = [
    'És o editor pedagógico oficial do aplicativo escolar moçambicano Fólio (Sistema Nacional de Educação, 1.ª à 12.ª classe).',
    'A tua missão é resumir, limpar erros de digitalização (OCR) e estruturar matérias curriculares para leitura imediata no telemóvel.',
    'REGRAS OBRIGATÓRIAS:',
    '1. Escreve em português de Moçambique (norma europeia/moçambicana: "eletrões", "protões", "neutrões", "iónica", "atómica", sem brasileirismos), adequado à classe indicada.',
    '2. PROIBIDO usar as palavras "PDF", "livro", "manual", "módulo", "ficheiro" ou marcas de scanner como "CamScanner". Fala sempre em tema, matéria ou assunto.',
    '3. "summaryHalfParagraph" DEVE ter extensão rigorosa de MEIO PARÁGRAFO: exatamente 2 frases objetivas, no máximo 215 caracteres (contando espaços), para caber num cartão de telemóvel.',
    '4. Fidelidade total ao conteúdo do excerto: nunca inventes datas, nomes ou fórmulas.',
    hasOcrTopics
      ? '5. Quando "sourceWasOcr" for true, devolve também "cleanedParagraphs" corrigindo gralhas evidentes de OCR (ex: letras trocadas, acentos em falta, ruído de margens/fotos) mantendo rigorosamente o texto original completo de cada parágrafo.'
      : '5. Foca em títulos claros, resumos rigorosos de ½ parágrafo e palavras-chave úteis para busca.',
    '6. Sempre que o tema envolver processo, classificação, comparação, medição, fórmula, cronologia ou ciclo, cria TAMBÉM um "vectorDiagram" didático fiel ao conteúdo escolhendo UM destes tipos: "flow" (steps: [{label, badge?, detail?}], formula?), "compare" (columns: [{title, badge?, points[]}]), "cycle" (centerLabel, nodes: [{label, detail?}]), "timeline" (events: [{date, label, detail?}]), "atom_model" (nucleusLabel, shells[], note?), "geometry_triangle" (sideA, sideB, hypotenuse, formula, note?) ou "kinematics_graph" (xLabel, yLabel, areaLabel, equations[]).',
    '7. Devolve APENAS JSON válido neste formato exato (usa um título específico do tema em vectorDiagram.title, nunca texto genérico):',
    '{"topics":[{"index":0,"title":"título limpo do tema","summaryHalfParagraph":"2 frases objetivas até 215 caracteres.","keyTakeaways":["ponto concreto 1","ponto concreto 2","ponto concreto 3"],"keywords":["termo1","termo2","termo3","termo4","termo5","termo6"],"cleanedParagraphs":["parágrafo 1 corrigido..."],"vectorDiagram":{"title":"título específico do esquema","caption":"explicação curta do esquema","diagram":{"type":"compare","columns":[{"title":"...","points":["..."]}]}}}]}',
    '8. Em "keywords", inclui 5 a 7 termos em minúsculas que estudantes ou pais pesquisariam (incluindo sinónimos escolares comuns).',
  ].join('\n');

  const userPrompt = JSON.stringify({
    subject: meta.subject,
    grade: meta.grade,
    topics: payload,
  });

  const models = getModelCascade();
  let lastError = 'Falha ao contactar Groq';

  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const body: Record<string, unknown> = {
          model,
          temperature: 0.2,
          max_completion_tokens: hasOcrTopics ? 4200 : 2400,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
        };

        if (model.includes('gpt-oss')) {
          body.reasoning_effort = 'low';
        }

        const res = await fetch(GROQ_CHAT_URL, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(28000),
        });

        if (res.status === 429 && attempt === 0) {
          const retryAfter = Number(res.headers.get('retry-after') || '2');
          await new Promise((r) => setTimeout(r, Math.min(4500, Math.max(1200, retryAfter * 1000))));
          continue;
        }

        const data = (await res.json()) as {
          model?: string;
          choices?: Array<{ message?: { content?: string } }>;
          error?: { message?: string };
        };

        if (!res.ok) {
          lastError = data.error?.message || `HTTP ${res.status} (${model})`;
          break;
        }

        const content = data.choices?.[0]?.message?.content;
        if (!content) {
          lastError = `Resposta vazia (${model})`;
          break;
        }

        const parsed = extractJsonObject(content) as { topics?: GroqTopicOutput[] };
        if (!parsed || !Array.isArray(parsed.topics)) {
          lastError = `JSON sem array topics (${model})`;
          break;
        }

        return { items: parsed.topics, model: data.model || model };
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
      }
    }
  }

  throw new Error(lastError);
}

/**
 * Generates strict ½-paragraph (≤220 chars) summaries, key takeaways,
 * and search synonyms for curriculum topics in batches of 3 via Groq.
 */
export async function enrichTopicsWithGroq(
  meta: { subject: string; grade: string },
  topics: AdminTopicDraft[]
): Promise<GroqTopicsEnrichResult> {
  if (!isGroqConfigured()) {
    return {
      topics: topics.map((t) => ({
        ...t,
        summaryHalfParagraph: clampHalfParagraph(t.summaryHalfParagraph),
      })),
      enrichedCount: 0,
      totalCount: topics.length,
      modelUsed: null,
      warnings: ['GROQ_API_KEY não configurada no servidor.'],
    };
  }

  const hasAnyOcr = topics.some((t) => t.sourceWasOcr);
  const batchSize = hasAnyOcr ? 2 : 3;
  const enrichedByIndex = new Map<number, GroqTopicOutput>();
  const warnings: string[] = [];
  let modelUsed: string | null = null;

  const limit = Math.min(topics.length, 36);
  if (topics.length > 36) {
    warnings.push('Os primeiros 36 temas foram resumidos pela Groq; os restantes usaram resumo base.');
  }

  for (let i = 0; i < limit; i += batchSize) {
    const batch = [];
    for (let j = i; j < Math.min(limit, i + batchSize); j++) {
      batch.push({ index: j, topic: topics[j] });
    }

    try {
      const { items, model } = await callGroqTopicBatch(meta, batch);
      modelUsed = modelUsed || model;
      for (const item of items) {
        if (item && typeof item.index === 'number') {
          enrichedByIndex.set(item.index, item);
        }
      }
    } catch (err) {
      warnings.push(
        `Lote ${Math.floor(i / batchSize) + 1}: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    if (i + batchSize < limit) {
      await new Promise((r) => setTimeout(r, 260));
    }
  }

  let enrichedCount = 0;

  const updatedTopics = topics.map((topic, idx) => {
    const ai = enrichedByIndex.get(idx);
    if (!ai) {
      return {
        ...topic,
        summaryHalfParagraph: clampHalfParagraph(topic.summaryHalfParagraph),
      };
    }

    const summary =
      typeof ai.summaryHalfParagraph === 'string' && ai.summaryHalfParagraph.trim().length >= 25
        ? clampHalfParagraph(ai.summaryHalfParagraph)
        : clampHalfParagraph(topic.summaryHalfParagraph);

    const title =
      typeof ai.title === 'string' && ai.title.trim().length >= 3 && ai.title.trim().length <= 130
        ? ai.title.trim()
        : topic.title;

    const keyTakeaways =
      Array.isArray(ai.keyTakeaways) && ai.keyTakeaways.length > 0
        ? ai.keyTakeaways
            .map((k) => String(k).trim())
            .filter((k) => k.length >= 8)
            .slice(0, 4)
        : topic.keyTakeaways;

    const keywords =
      Array.isArray(ai.keywords) && ai.keywords.length > 0
        ? Array.from(
            new Set(
              [...ai.keywords.map((k) => String(k).trim().toLowerCase()), ...topic.keywords].filter(
                (k) => k.length >= 3
              )
            )
          ).slice(0, 8)
        : topic.keywords;

    const cleanedParas =
      topic.sourceWasOcr &&
      Array.isArray(ai.cleanedParagraphs) &&
      ai.cleanedParagraphs.length > 0
        ? ai.cleanedParagraphs
            .map((p) => String(p).replace(/\s+/g, ' ').trim())
            .filter((p) => p.length >= 20 && !/camscanner|scanned\s+by/i.test(p))
        : null;

    // Only accept Groq cleanedParagraphs if they preserve meaningful volume of the original OCR text
    const origLen = topic.paragraphs.join(' ').length;
    const cleanedLen = cleanedParas ? cleanedParas.join(' ').length : 0;
    const usedCleaned = Boolean(cleanedParas && cleanedLen >= Math.min(120, origLen * 0.45));
    const finalParagraphs = usedCleaned
      ? [...cleanedParas!, ...topic.paragraphs.slice(12)]
      : topic.paragraphs;

    // Keep page-mapped paragraphs synced with Groq-cleaned OCR text so OfflineReader renders spotless prose
    let finalPages = topic.pages;
    if (usedCleaned && topic.pages && topic.pages.length > 0) {
      if (topic.pages.length === 1) {
        finalPages = [{ ...topic.pages[0], paragraphs: finalParagraphs }];
      } else {
        // Proportionally map cleaned paragraphs onto page markers
        let cursor = 0;
        finalPages = topic.pages.map((pg, idx) => {
          const isLast = idx === topic.pages!.length - 1;
          const count = isLast
            ? Math.max(0, finalParagraphs.length - cursor)
            : Math.min(pg.paragraphs.length, Math.max(1, Math.round(finalParagraphs.length / topic.pages!.length)));
          const slice = finalParagraphs.slice(cursor, cursor + count);
          cursor += count;
          return { pageNumber: pg.pageNumber, paragraphs: slice };
        }).filter((pg) => pg.paragraphs.length > 0);
      }
    }

    // Preserve real extracted figures cropped from the PDF and append/update the AI vector diagram
    const existingExtracted = (topic.visuals || []).filter((v) => v.kind === 'extracted_figure');
    const existingVectors = (topic.visuals || []).filter((v) => v.kind === 'vector_diagram');
    const aiVector = sanitizeGroqVectorVisual(ai.vectorDiagram, topic.pageNumber, idx);
    const mergedVisuals: TopicVisual[] = [
      ...existingExtracted,
      ...(aiVector ? [aiVector] : existingVectors),
    ];

    enrichedCount += 1;

    return {
      ...topic,
      title,
      summaryHalfParagraph: summary,
      keyTakeaways: keyTakeaways.length > 0 ? keyTakeaways : topic.keyTakeaways,
      keywords,
      paragraphs: finalParagraphs,
      previewParagraphs: finalParagraphs.slice(0, 2),
      pages: finalPages,
      visuals: mergedVisuals,
    };
  });

  return {
    topics: updatedTopics,
    enrichedCount,
    totalCount: topics.length,
    modelUsed,
    warnings,
  };
}
