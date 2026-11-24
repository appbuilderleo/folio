/**
 * Didactic formatting utilities for textbook questions, exercises, and lists.
 * Ensures each numbered question (e.g. "11. ...", "12) ...", "a) ...")
 * is separated into its own paragraph for clear readability on mobile and web.
 */

export function isQuestionOrItem(text: string): boolean {
  if (!text || typeof text !== 'string') return false;
  return /^(?:(?:\d{1,3}|[a-e])[\.\)\-]|\([a-z0-9]+\))\s+/i.test(text.trim());
}

/**
 * Splits continuous text blocks containing multiple numbered questions or exercise items
 * into distinct paragraphs.
 *
 * Example:
 * "11. O que significa unidade? 12. Porque recorrem a modelos? 13. Explique a importância."
 * ->
 * [
 *   "11. O que significa unidade?",
 *   "12. Porque recorrem a modelos?",
 *   "13. Explique a importância."
 * ]
 */
export function splitNumberedQuestions(text: string): string[] {
  if (!text || typeof text !== 'string') return [];
  const trimmed = text.trim();
  if (!trimmed) return [];

  // Punctuation lookbehind (. ? ! : ; » ” ") followed by whitespace and:
  // - digits with period/paren/dash: e.g. "12. Porque...", "13) Explique..."
  // - parenthesized label: e.g. "(a) Primeira...", "(1) Opção..."
  // - letter sub-item: e.g. "a) opção...", "b) opção..."
  const regex = /(?<=[.?!:;»”"])\s+(?=(?:\d{1,3}[\.\)\-]|\([a-z0-9]+\))\s+[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ«“]|[a-e]\)\s+)/;

  return trimmed
    .split(regex)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Normalizes an array of paragraphs so that any paragraph containing multiple
 * inline questions is flattened into individual paragraphs.
 */
export function normalizeParagraphsWithQuestions(paragraphs: string[]): string[] {
  if (!Array.isArray(paragraphs)) return [];
  const result: string[] = [];
  for (const p of paragraphs) {
    if (!p || typeof p !== 'string') continue;
    const parts = splitNumberedQuestions(p);
    for (const part of parts) {
      if (part.length > 0) {
        result.push(part);
      }
    }
  }
  return result;
}
