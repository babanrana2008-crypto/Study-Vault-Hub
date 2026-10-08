export type ActiveSection = 'home' | 'books' | 'notes' | 'practice' | 'tracker' | 'community' | 'profile' | 'prep';

export interface CommunityPost {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl?: string | null;
  subject: string;
  content: string;
  imageUrl?: string;
  createdAt: string;
  replyCount: number;
}

export interface CommunityReply {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl?: string | null;
  content: string;
  imageUrl?: string;
  createdAt: string;
}

export interface CommunityChatMessage {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl?: string | null;
  content: string;
  subjectTag?: string;
  createdAt: string;
}

export type Subject = string;

export interface BookChapter {
  id: string;
  number: number;
  title: string;
  pageRange: string;
  summary: string;
  keyConcepts: string[];
}

export interface Book {
  id: string;
  title: string;
  author: string;
  subject: string;
  targetStreams: string[]; // e.g. ['NEET', 'Class 12 Board', 'General Study']
  edition: string;
  rating: number;
  totalChapters: number;
  pages: number;
  level: string;
  coverImage?: string;
  accentColor: string;
  description: string;
  chapters: BookChapter[];
  downloadSize: string;
}

export interface StudyNote {
  id: string;
  title: string;
  subject: string;
  targetStreams: string[];
  category: string;
  readTime: string;
  highWeightage: boolean;
  examRelevance: string;
  summary: string;
  content: {
    overview: string;
    keyTakeaways: string[];
    formulasOrMechanisms?: { label: string; formula: string; note?: string }[];
    examTips: string;
  };
  lastUpdated: string;
}

export interface MCQQuestion {
  id: string;
  subject: string;
  targetStreams: string[];
  topic: string;
  difficulty: 'Easy' | 'Moderate' | 'Hard';
  year?: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  hint: string;
}

export interface HighYieldTopic {
  id: string;
  subject: string;
  targetStream: string;
  chapter: string;
  weightagePercent: number;
  expectedQuestions: number;
  difficultyLevel: 'High' | 'Medium' | 'Foundational';
  status: 'Mastered' | 'In Progress' | 'To Revise';
}

export interface MnemonicItem {
  id: string;
  subject: string;
  targetStream: string;
  title: string;
  acronym: string;
  standsFor: string[];
  explanation: string;
}

export interface StudyTask {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string;
  subject?: string;
  chapter?: string;
  targetMinutes?: number;
  deadline?: string;
  priority?: 'High' | 'Medium' | 'Normal';
}

export interface StudySession {
  id: string;
  subject: string;
  topic: string;
  durationMinutes: number;
  timestamp: string;
  date?: string;
  studyGoal?: string;
  targetDurationMinutes?: number;
}

export interface ExamCountdownConfig {
  examName: string;
  examDate: string;
  targetNote?: string;
  updatedAt: string;
}

export interface PracticeHistoryEntry {
  id: string;
  date: string;
  subject: string;
  mode: 'Practice' | 'Timed Test';
  totalQuestions: number;
  correctCount: number;
  wrongCount: number;
  score: number;
  accuracy: number;
}

export interface SyllabusTopic {
  id: string;
  name: string;
  highYield?: boolean;
}

export interface SyllabusChapter {
  id: string;
  number: number;
  name: string;
  unitName: string;
  subject: string;
  classLevel: 'Class 10' | 'Class 11' | 'Class 12';
  stream?: string;
  topics: SyllabusTopic[];
  expectedWeightage?: string;
  ncertChapterCode?: string;
}

export interface SyllabusUnit {
  id: string;
  unitNumber: number;
  name: string;
  chapters: SyllabusChapter[];
}

export interface SyllabusSubject {
  id: string;
  name: string;
  code?: string;
  units: SyllabusUnit[];
}

export interface NCERTChapterRef {
  chapterNumber: number;
  title: string;
  code: string;
  pdfUrl: string;
  directViewerUrl: string;
  summary?: string;
  keyPoints?: string[];
}

export interface NCERTBook {
  id: string;
  title: string;
  code: string; // e.g. jemh1, keph1, lebo1
  classLevel: 'Class 10' | 'Class 11' | 'Class 12';
  stream: 'Science' | 'Commerce' | 'Humanities' | 'General';
  subject: string;
  edition: string;
  totalChapters: number;
  officialPortalUrl: string;
  coverImage?: string;
  chapters: NCERTChapterRef[];
  description: string;
}

export type ThemePreference = 'light' | 'dark' | 'system';

export interface SVHAIButtonPosition {
  xRatio: number;
  yRatio: number;
}

export type UserRole = 'student' | 'owner';

export interface UserStats {
  userId?: string;
  username?: string;
  role?: UserRole;
  name: string;
  profilePhotoUrl?: string | null;
  svhAiButtonPosition?: SVHAIButtonPosition | null;
  hasCompletedSetup: boolean;
  themePreference?: ThemePreference;
  examCountdown?: ExamCountdownConfig | null;
  // Multi-exam goals
  selectedGoals: string[];
  activeGoal: string;
  customGoals: string[];
  targetScore?: number;
  targetCollegeOrInstitution?: string;
  // Quantitative tracking (starts at real 0, never fake)
  questionsAttempted: number;
  correctAnswers: number;
  incorrectAnswers: number;
  totalStudyMinutes: number;
  streak: {
    current: number;
    lastActiveDate: string;
  };
  // Goals
  dailyGoals: {
    studyMinutes: number;
    questionCount: number;
    taskCount: number;
  };
  // History collections
  tasks: StudyTask[];
  studySessions: StudySession[];
  practiceHistory: PracticeHistoryEntry[];
  topicsStudied: string[];
  subjectsStudied: Record<string, number>;
  // Chapter progress tracking
  chapterProgress?: Record<string, { completed: boolean; questionsSolved: number; accuracy: number }>;
  // Bookmarks
  bookmarkedItemIds: string[];
  completedNoteIds: string[];
  readBookIds: string[];
  savedNCERTBookIds?: string[];
}

