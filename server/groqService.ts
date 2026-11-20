import dotenv from 'dotenv';
import type { AdminTopicDraft } from '../src/types/folio';

dotenv.config();

const GROQ_CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions';

const PREFERRED_MODELS = [
  'openai/gpt-oss-20b',
  'qwen/qwen3.8-27b',
  'openai/gpt-oss-120b',
];

const MAX_HALF_PARAGRAPH_CHARS = 220;

interface GroqTopicOutput {
  index: number;
  title?: string;
  summaryHalfParagraph?: string;
  keyTakeaways?: string[];
  keywords?: string[];
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

  const payload = batch.map(({ index, topic }) => ({
    index,
    pageNumber: topic.pageNumber,
    unitLabel: topic.unitLabel ?? '',
    detectedTitle: topic.title,
    excerpt: topic.paragraphs.join('\n\n').slice(0, 3000),
  }));

  const systemPrompt = [
    'És o editor pedagógico oficial do aplicativo escolar moçambicano Fólio (Sistema Nacional de Educação, 1.ª à 12.ª classe).',
    'A tua missão é resumir e estruturar matérias curriculares para leitura imediata no telemóvel.',
    'REGRAS OBRIGATÓRIAS:',
    '1. Escreve em português de Moçambique (norma europeia/moçambicana: "eletrões", "protões", "neutrões", "iónica", "atómica", sem brasileirismos), adequado à classe indicada.',
    '2. PROIBIDO usar as palavras "PDF", "livro", "manual", "módulo" ou "ficheiro". Fala sempre em tema, matéria ou assunto.',
    '3. "summaryHalfParagraph" DEVE ter extensão rigorosa de MEIO PARÁGRAFO: exatamente 2 frases objetivas, no máximo 215 caracteres (contando espaços), para caber num cartão de telemóvel.',
    '4. Fidelidade total ao conteúdo do excerto: nunca inventes datas, nomes ou fórmulas.',
    '5. Devolve APENAS JSON válido neste formato exato:',
    '{"topics":[{"index":0,"title":"título limpo do tema","summaryHalfParagraph":"2 frases objetivas até 215 caracteres.","keyTakeaways":["ponto concreto 1","ponto concreto 2","ponto concreto 3"],"keywords":["termo1","termo2","termo3","termo4","termo5","termo6"]}]}',
    '6. Em "keywords", inclui 5 a 7 termos em minúsculas que estudantes ou pais pesquisariam (incluindo sinónimos escolares comuns).',
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
          max_completion_tokens: 2400,
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

  const batchSize = 3;
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

    enrichedCount += 1;

    return {
      ...topic,
      title,
      summaryHalfParagraph: summary,
      keyTakeaways: keyTakeaways.length > 0 ? keyTakeaways : topic.keyTakeaways,
      keywords,
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
