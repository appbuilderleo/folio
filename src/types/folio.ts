export type SchoolCycle = 'all' | '1-6' | '7-9' | '10-12';

export type PaymentOperator = 'mpesa' | 'emola';

export type ReaderTheme = 'paper' | 'sepia' | 'night';

export interface ManualPage {
  pageNumber: number;
  paragraphs: string[];
  rawText?: string;
}

export interface ManualChapter {
  id: string;
  manualId: string;
  title: string;
  unitLabel?: string;
  pageStart: number;
  pageEnd: number;
  summary: string;
  keyTakeaways: string[];
  keywords: string[];
  previewParagraphs: string[];
  paragraphs: string[];
  pages?: ManualPage[];
  readingMinutes: number;
}

export interface Manual {
  id: string;
  title: string;
  subject: string;
  grade: string; // e.g. "10.ª Classe"
  gradeNumber: number; // 1..12
  cycle: Exclude<SchoolCycle, 'all'>;
  publisher: string;
  year?: string;
  totalPages: number;
  priceMt: number;
  sourceType: 'catalog' | 'pdf_upload';
  fileName?: string;
  fileSizeBytes?: number;
  defaultUnlocked?: boolean;
  createdAt: string;
  chapters: ManualChapter[];
}

export interface SearchHit {
  manual: Manual;
  chapter: ManualChapter;
  matchedPage: number;
  score: number;
  matchedSnippet?: string;
}

export interface UnlockReceipt {
  manualId: string;
  operator: PaymentOperator;
  phone: string;
  amountMt: number;
  reference: string;
  unlockedAt: string;
  syncedOffline: boolean;
}

export interface BookmarkEntry {
  manualId: string;
  chapterId: string;
  pageNumber: number;
  savedAt: string;
}

export interface DissectionProgress {
  stage: 'reading' | 'cleaning' | 'structuring' | 'summarizing' | 'saving' | 'done';
  percent: number;
  currentPage?: number;
  totalPages?: number;
  detail: string;
}
