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
  vpEarned?: number;
  bonusVpEarned?: number;
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
  topic?: string;
  mode: 'Practice' | 'Timed Test' | 'Quick 10' | 'Timed Sprint' | 'Topic Practice' | 'PYQ Practice' | 'Custom Quiz' | 'Daily Question';
  totalQuestions: number;
  correctCount: number;
  wrongCount: number;
  score: number;
  accuracy: number;
  vpEarned?: number;
}

export interface VPTransaction {
  id: string; // Deterministic idempotency grantKey
  userId: string;
  timestamp: string;
  amount: number;
  reason: string;
  category:
    | 'question'
    | 'focus_minutes'
    | 'focus_bonus_60m'
    | 'exam_bonus_5q'
    | 'exam_bonus_20q'
    | 'exam_milestone_5'
    | 'exam_milestone_20'
    | 'daily_usage';
  relatedId: string; // questionId / attemptKey or sessionId
  subject?: string;
  topic?: string;
}

export interface LoginSessionRecord {
  sessionId: string;
  loginAt: string;
  logoutAt?: string | null;
  devicePlatform: string;
  deviceId?: string;
}

export interface RevisionItem {
  id: string; // deterministic e.g. rev_physics_rotational_motion
  subject: string;
  topic: string;
  reason: string;
  accuracy?: number | null;
  questionsSolved?: number;
  mistakesCount?: number;
  repetitionStage: number; // 0 = initial, 1 = 1d, 2 = 3d, 3 = 7d, 4 = 14d, 5 = 30d
  intervalDays: number;
  lastStudiedAt: string;
  lastRevisedAt?: string | null;
  nextReviewAt: string;
  status: 'Due Now' | 'Scheduled' | 'Mastered';
}

export interface AchievementRecord {
  id: string;
  title: string;
  description: string;
  category: 'practice' | 'focus' | 'streak' | 'vp';
  unlocked: boolean;
  unlockedAt?: string | null;
  progressCurrent: number;
  progressTarget: number;
}

export interface StudyPlanItem {
  id: string;
  dayLabel: string;
  subject: string;
  topic: string;
  focusMinutes: number;
  practiceQuestions: number;
  priority: 'High' | 'Medium' | 'Normal';
  completed: boolean;
}

export interface StudyPlanRecord {
  id: string;
  createdAt: string;
  goal: string;
  summary: string;
  insufficientDataNotice?: string | null;
  items: StudyPlanItem[];
}

export interface SmartStudySessionPlan {
  id: string;
  createdAt: string;
  subject: string;
  topic: string;
  durationMinutes: number;
  objectives: string[];
  conceptSummary: string;
  keyFormulasOrPoints: string[];
  practicePrompts: string[];
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string | null;
  displayName: string;
  profilePhotoUrl?: string | null;
  activeGoal?: string | null;
  vaultPoints: number;
  questionsSolved: number;
  studyMinutes: number;
  streakDays: number;
  isCurrentUser?: boolean;
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
  // Vault Points (VP) System
  vaultPoints?: number;
  questionVp?: number;
  focusMinuteVp?: number;
  focusBonusVp?: number;
  sixtyMinBonusCount?: number;
  vpTransactions?: VPTransaction[];
  seenQuestionIds?: string[];
  // Telemetry & Session Metadata
  svhAiUsageCount?: number;
  loginCount?: number;
  logoutCount?: number;
  lastLoginAt?: string | null;
  lastLogoutAt?: string | null;
  loginHistory?: LoginSessionRecord[];
  lastDevicePlatform?: string;
  devicesUsed?: string[];
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
  subjectPerformance?: Record<string, { attempted: number; correct: number; accuracy: number }>;
  topicPerformance?: Record<string, { attempted: number; correct: number; accuracy: number }>;
  dailyActivity?: Record<string, { questionsSolved: number; studyMinutes: number; vpEarned?: number }>;
  recentMistakes?: Array<{ id: string; question: string; subject: string; topic: string; date: string }>;
  revisionSchedule?: RevisionItem[];
  unlockedAchievements?: Record<string, string>; // achievementId -> unlockedAt ISO timestamp
  activeStudyPlan?: StudyPlanRecord | null;
  // Bookmarks
  bookmarkedItemIds: string[];
  completedNoteIds: string[];
  readBookIds: string[];
  savedNCERTBookIds?: string[];
}

