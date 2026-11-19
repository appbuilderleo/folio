import type { Manual, SchoolCycle, SearchHit } from '../types/folio';

export function normalizeQuery(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function searchManuals(
  manuals: Manual[],
  query: string,
  cycle: SchoolCycle,
  onlyUploaded = false
): SearchHit[] {
  const filteredManuals = manuals.filter((m) => {
    if (onlyUploaded && m.sourceType !== 'pdf_upload') return false;
    if (cycle !== 'all' && m.cycle !== cycle) return false;
    return true;
  });

  const normQuery = normalizeQuery(query);
  const tokens = normQuery.split(/\s+/).filter((t) => t.length >= 2);

  const hits: SearchHit[] = [];

  for (const manual of filteredManuals) {
    const manualHaystack = normalizeQuery(
      `${manual.title} ${manual.subject} ${manual.grade}`
    );

    for (const chapter of manual.chapters) {
      if (!normQuery) {
        hits.push({
          manual,
          chapter,
          matchedPage: chapter.pageStart,
          score: manual.sourceType === 'pdf_upload' ? 20 : 10,
        });
        continue;
      }

      const titleNorm = normalizeQuery(chapter.title);
      const summaryNorm = normalizeQuery(chapter.summary);
      const kwNorm = normalizeQuery(chapter.keywords.join(' '));
      const bodyNorm = normalizeQuery(chapter.paragraphs.join(' '));

      let score = 0;

      // Exact phrase boosts
      if (titleNorm.includes(normQuery)) score += 60;
      if (kwNorm.includes(normQuery)) score += 45;
      if (summaryNorm.includes(normQuery)) score += 30;
      if (manualHaystack.includes(normQuery)) score += 22;
      if (bodyNorm.includes(normQuery)) score += 18;

      // Token-level scoring
      let matchedTokens = 0;
      for (const tok of tokens) {
        let hitToken = false;
        if (titleNorm.includes(tok)) {
          score += 18;
          hitToken = true;
        }
        if (kwNorm.includes(tok)) {
          score += 14;
          hitToken = true;
        }
        if (summaryNorm.includes(tok)) {
          score += 9;
          hitToken = true;
        }
        if (manualHaystack.includes(tok)) {
          score += 8;
          hitToken = true;
        }
        if (bodyNorm.includes(tok)) {
          score += 5;
          hitToken = true;
        }
        if (hitToken) matchedTokens += 1;
      }

      if (tokens.length > 0 && matchedTokens === 0 && score === 0) {
        continue;
      }

      // Bonus if all query tokens matched
      if (tokens.length > 1 && matchedTokens === tokens.length) {
        score += 24;
      }

      // Pinpoint exact page inside chapter.pages if available
      let matchedPage = chapter.pageStart;
      let matchedSnippet: string | undefined;

      if (chapter.pages && chapter.pages.length > 0) {
        for (const pg of chapter.pages) {
          const pgText = pg.paragraphs.join(' ');
          const pgNorm = normalizeQuery(pgText);
          if (pgNorm.includes(normQuery) || tokens.some((tok) => pgNorm.includes(tok))) {
            matchedPage = pg.pageNumber;
            const matchIdx = pgNorm.indexOf(normQuery) >= 0
              ? pgNorm.indexOf(normQuery)
              : tokens.map((tok) => pgNorm.indexOf(tok)).find((idx) => idx >= 0) ?? 0;
            const start = Math.max(0, matchIdx - 48);
            const end = Math.min(pgText.length, matchIdx + 135);
            matchedSnippet =
              (start > 0 ? '…' : '') + pgText.slice(start, end).trim() + (end < pgText.length ? '…' : '');
            break;
          }
        }
      }

      if (score > 0) {
        hits.push({
          manual,
          chapter,
          matchedPage,
          score,
          matchedSnippet,
        });
      }
    }
  }

  return hits.sort((a, b) => b.score - a.score || a.matchedPage - b.matchedPage);
}
