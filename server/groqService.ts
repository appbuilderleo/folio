import dotenv from 'dotenv';
import type { Manual, ManualChapter } from '../src/types/folio';

dotenv.config();

const GROQ_CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions';

const PREFERRED_MODELS = [
  'openai/gpt-oss-20b',
  'qwen/qwen3.8-27b',
  'openai/gpt-oss-120b',
];

export interface GroqEnrichChapterOutput {
  id: string;
  title?: string;
  summary?: string;
  keyTakeaways?: string[];
  keywords?: string[];
}

export interface GroqManualEnrichResult {
  manual: Manual;
  enrichedChapters: number;
  totalChapters: number;
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

function extractJsonObject(raw: string): unknown {
  let cleaned = raw.trim();
  // Strip <think>...</think> blocks if emitted by reasoning models
  cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  // Strip ```json ... ``` fences
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

async function callGroqBatch(
  manual: Pick<Manual, 'title' | 'subject' | 'grade'>,
  chapters: ManualChapter[]
): Promise<{ items: GroqEnrichChapterOutput[]; model: string }> {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('GROQ_API_KEY não configurada');
  }

  const chapterPayload = chapters.map((ch) => ({
    id: ch.id,
    pageStart: ch.pageStart,
    pageEnd: ch.pageEnd,
    unitLabel: ch.unitLabel ?? '',
    detectedTitle: ch.title,
    excerpt: ch.paragraphs.join('\n\n').slice(0, 3200),
  }));

  const systemPrompt = [
    'És um editor pedagógico do aplicativo escolar moçambicano Fólio (Sistema Nacional de Educação, 1.ª à 12.ª classe).',
    'A tua tarefa é adaptar capítulos extraídos de manuais escolares em PDF para busca instantânea por página e estudo rápido no telemóvel.',
    'Regras obrigatórias:',
    '1. Escreve em português de Moçambique (norma europeia/moçambicana: "eletrões", "protões", "neutrões", "iónica", "atómica", "tu/você" conforme a classe, sem brasileirismos), adaptado ao nível da classe indicada.',
    '2. Mantém fidelidade absoluta ao conteúdo do excerto fornecido — nunca inventes factos, datas ou fórmulas que não estejam implícitos no tema.',
    '3. Devolve APENAS um objeto JSON válido com o formato exato:',
    '{"chapters":[{"id":"...","title":"título limpo e claro","summary":"resumo didático objetivo em 2 a 3 frases (máx. 320 caracteres) que ajude o aluno a saber se esta é a página que procura","keyTakeaways":["ponto-chave concreto 1","ponto-chave 2","ponto-chave 3"],"keywords":["termo1","termo2","termo3","termo4","termo5","termo6"]}]}',
    '4. Em "keywords", inclui 5 a 7 termos em minúsculas que alunos ou pais realmente digitariam na busca (incluindo sinónimos curriculares comuns).',
    '5. Nunca uses travessões longos nem linguagem publicitária.',
  ].join('\n');

  const userPrompt = JSON.stringify({
    manualTitle: manual.title,
    subject: manual.subject,
    grade: manual.grade,
    chapters: chapterPayload,
  });

  const models = getModelCascade();
  let lastError = 'Falha desconhecida ao contactar Groq';

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

        // Keep gpt-oss reasoning crisp so tokens go directly into the structured JSON output
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
          lastError = data.error?.message || `HTTP ${res.status} no modelo ${model}`;
          break; // try next fallback model
        }

        const content = data.choices?.[0]?.message?.content;
        if (!content) {
          lastError = `Resposta vazia do modelo ${model}`;
          break;
        }

        const parsed = extractJsonObject(content) as { chapters?: GroqEnrichChapterOutput[] };
        if (!parsed || !Array.isArray(parsed.chapters)) {
          lastError = `Estrutura JSON inesperada do modelo ${model}`;
          break;
        }

        return {
          items: parsed.chapters,
          model: data.model || model,
        };
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
      }
    }
  }

  throw new Error(lastError);
}

/**
 * Enriches all chapters of a dissected Manual in small batches (3 chapters/request)
 * using Groq free-tier models. Preserves local extractive summaries for any chapter
 * that fails so ingestion never breaks.
 */
export async function enrichManualWithGroq(manual: Manual): Promise<GroqManualEnrichResult> {
  if (!isGroqConfigured()) {
    return {
      manual,
      enrichedChapters: 0,
      totalChapters: manual.chapters.length,
      modelUsed: null,
      warnings: ['GROQ_API_KEY não configurada no servidor.'],
    };
  }

  const batchSize = 3;
  const enrichedMap = new Map<string, GroqEnrichChapterOutput>();
  const warnings: string[] = [];
  let modelUsed: string | null = null;

  // Cap at 36 chapters per single upload batch to protect free-tier rate limits
  const eligibleChapters = manual.chapters.slice(0, 36);
  if (manual.chapters.length > 36) {
    warnings.push(
      `Os primeiros 36 capítulos foram enriquecidos em lote com Groq; os restantes mantiveram o resumo local rápido.`
    );
  }

  for (let i = 0; i < eligibleChapters.length; i += batchSize) {
    const batch = eligibleChapters.slice(i, i + batchSize);
    try {
      const { items, model } = await callGroqBatch(manual, batch);
      modelUsed = modelUsed || model;
      for (const item of items) {
        if (item && typeof item.id === 'string') {
          enrichedMap.set(item.id, item);
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      warnings.push(`Lote ${Math.floor(i / batchSize) + 1}: ${msg}`);
    }

    // Gentle pacing between batches to stay comfortably inside Groq free-tier RPM
    if (i + batchSize < eligibleChapters.length) {
      await new Promise((r) => setTimeout(r, 280));
    }
  }

  let enrichedCount = 0;

  const updatedChapters: ManualChapter[] = manual.chapters.map((ch) => {
    const ai = enrichedMap.get(ch.id);
    if (!ai) return ch;

    const cleanSummary =
      typeof ai.summary === 'string' && ai.summary.trim().length >= 30
        ? ai.summary.trim()
        : ch.summary;

    const cleanTitle =
      typeof ai.title === 'string' && ai.title.trim().length >= 3 && ai.title.trim().length <= 130
        ? ai.title.trim()
        : ch.title;

    const cleanTakeaways =
      Array.isArray(ai.keyTakeaways) && ai.keyTakeaways.length > 0
        ? ai.keyTakeaways
            .map((t) => String(t).trim())
            .filter((t) => t.length >= 10)
            .slice(0, 4)
        : ch.keyTakeaways;

    const cleanKeywords =
      Array.isArray(ai.keywords) && ai.keywords.length > 0
        ? Array.from(
            new Set(
              [...ai.keywords.map((k) => String(k).trim().toLowerCase()), ...ch.keywords].filter(
                (k) => k.length >= 3
              )
            )
          ).slice(0, 8)
        : ch.keywords;

    enrichedCount += 1;

    return {
      ...ch,
      title: cleanTitle,
      summary: cleanSummary,
      keyTakeaways: cleanTakeaways.length > 0 ? cleanTakeaways : ch.keyTakeaways,
      keywords: cleanKeywords,
      summarySource: 'groq',
    };
  });

  return {
    manual: {
      ...manual,
      aiEnriched: enrichedCount > 0,
      aiModel: enrichedCount > 0 ? modelUsed ?? getPreferredGroqModel() : manual.aiModel,
      chapters: updatedChapters,
    },
    enrichedChapters: enrichedCount,
    totalChapters: manual.chapters.length,
    modelUsed,
    warnings,
  };
}
