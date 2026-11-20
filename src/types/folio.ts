export type SchoolCycle = 'all' | '1-6' | '7-9' | '10-12';

export type PaymentOperator = 'mpesa' | 'emola';

export type ReaderTheme = 'paper' | 'sepia' | 'night';

export type UserRole = 'student' | 'admin';

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

export interface AuthSessionState {
  user: UserProfile;
  token: string;
  activeSessions: number;
  maxSessions: number;
  evictedOldSession?: boolean;
  unlockedCurriculumIds: string[];
}

export interface TopicPage {
  pageNumber: number;
  paragraphs: string[];
}

/**
 * Lightweight 3G/4G search/discovery payload returned by GET /api/topics.
 * Strictly excludes full_text and pages so unpaid content is never leaked.
 */
export interface TopicSearchItem {
  id: string;
  curriculumId: string;
  subject: string;
  grade: string;
  gradeNumber: number;
  cycle: Exclude<SchoolCycle, 'all'>;
  unitLabel?: string;
  title: string;
  pageNumber: number;
  pageEnd: number;
  summaryHalfParagraph: string;
  previewParagraphs: string[];
  keyTakeawaysPreview: string[];
  readingMinutes: number;
  priceMt: number;
  curriculumTopicsCount: number;
  totalPages: number;
  unlocked: boolean;
}

/**
 * Protected full topic content — only delivered by GET /api/curricula/:id/content
 * after server verifies authentication + user_unlocks (or admin role).
 */
export interface UnlockedTopic {
  id: string;
  curriculumId: string;
  unitLabel?: string;
  title: string;
  pageNumber: number;
  pageEnd: number;
  summaryHalfParagraph: string;
  keyTakeaways: string[];
  keywords: string[];
  paragraphs: string[];
  pages?: TopicPage[];
  readingMinutes: number;
}

export interface UnlockedCurriculum {
  id: string;
  subject: string;
  grade: string;
  gradeNumber: number;
  cycle: Exclude<SchoolCycle, 'all'>;
  totalPages: number;
  priceMt: number;
  unlockedAt?: string;
  transactionRef?: string;
  paymentProvider?: PaymentOperator;
  topics: UnlockedTopic[];
}

export interface PreviewCurriculumInfo {
  id: string;
  subject: string;
  grade: string;
  gradeNumber: number;
  cycle: Exclude<SchoolCycle, 'all'>;
  totalPages: number;
  priceMt: number;
  topics: Array<{
    id: string;
    title: string;
    unitLabel?: string;
    pageNumber: number;
    pageEnd: number;
    readingMinutes: number;
  }>;
}

export interface UnlockReceipt {
  curriculumId: string;
  provider: PaymentOperator;
  phoneMasked: string;
  amountMt: number;
  transactionRef: string;
  unlockedAt: string;
}

export interface BookmarkEntry {
  curriculumId: string;
  topicId: string;
  subject: string;
  grade: string;
  topicTitle: string;
  pageNumber: number;
  savedAt: string;
}

export interface DissectionProgress {
  stage: 'reading' | 'ocr' | 'cleaning' | 'structuring' | 'summarizing' | 'ai_enriching' | 'saving' | 'done';
  percent: number;
  currentPage?: number;
  totalPages?: number;
  detail: string;
  ocrSnippet?: string;
}

/**
 * Admin-only DTOs for /admin panel
 */
export interface AdminTopicDraft {
  unitLabel?: string;
  title: string;
  pageNumber: number;
  pageEnd: number;
  summaryHalfParagraph: string;
  previewParagraphs: string[];
  keyTakeaways: string[];
  keywords: string[];
  paragraphs: string[];
  pages?: TopicPage[];
  readingMinutes: number;
  sourceWasOcr?: boolean;
}

export interface AdminCurriculumOverview {
  id: string;
  subject: string;
  grade: string;
  gradeNumber: number;
  cycle: Exclude<SchoolCycle, 'all'>;
  totalPages: number;
  priceMt: number;
  status: 'processing' | 'published';
  topicsCount: number;
  unlocksCount: number;
  createdAt: string;
  topicsPreview: Array<{
    id: string;
    title: string;
    pageNumber: number;
    summaryHalfParagraph: string;
  }>;
}

export interface AdminDashboardStats {
  totalCurricula: number;
  totalTopics: number;
  totalStudents: number;
  totalUnlocks: number;
  revenueMt: number;
  groqEnabled: boolean;
  groqModel?: string;
}
