export type ActiveSection = 'home' | 'books' | 'notes' | 'practice' | 'tracker' | 'community' | 'profile' | 'prep';

export interface CommunityPost {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl?: string | null;
  subject: string;
  content: string;
  messageText?: string;
  timestamp?: string | number;
  replies?: CommunityReply[];
  postType?: 'doubt' | 'chat';
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
  messageText?: string;
  timestamp?: string | number;
  imageUrl?: string;
  createdAt: string;
}

export interface CommunityChatMessage {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl?: string | null;
  content: string;
  messageText?: string;
  timestamp?: string | number;
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
  createdAt?: string;
  category?: string;
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

export interface AISmartStudyBlock {
  id: string;
  dayOrPhase: string;
  subject: string;
  chapterOrTopic: string;
  activityType: 'Concept Revision' | 'MCQ Practice' | 'NCERT Reading' | 'Formula & Short Notes' | 'Mock & Mistake Review' | string;
  durationMinutes: number;
  priority: 'High' | 'Medium' | 'Normal';
  keyTakeawayOrTip?: string;
  actionableTip?: string;
  completed?: boolean;
}

export interface AISmartRevisionPlan {
  id: string;
  title: string;
  examGoal: string;
  dailyTargetMinutes: number;
  focusSummary: string;
  createdAt: string;
  blocks: AISmartStudyBlock[];
  generatedAt?: string;
  goal?: string;
  timeframe?: string;
  dailyHours?: number;
  focusMode?: string;
  planTitle?: string;
  strategySummary?: string;
  studyBlocks?: AISmartStudyBlock[];
  keyRevisionTips?: string[];
}

export interface CommunityLeaderboardEntry {
  userId: string;
  displayName: string;
  profilePhotoUrl?: string | null;
  activeGoal?: string | null;
  vpPoints: number;
  rankTitle: string;
  rankLevel?: number;
  rankBadgeColor?: string;
  questionsAttempted?: number;
  correctAnswers?: number;
  totalStudyMinutes?: number;
  streakDays?: number;
  postsCount: number;
  repliesCount: number;
  chatCount?: number;
  milestonesUnlocked: number;
  totalMilestones?: number;
  nextMilestoneVp?: number;
  lastActiveAt?: string;
}

export interface VPTransaction {
  id: string;
  userId?: string;
  amount: number;
  reason: string;
  timestamp: string;
  category?: string;
  relatedId?: string;
  subject?: string;
  topic?: string;
}

export interface LoginSessionRecord {
  sessionId?: string;
  event?: 'login' | 'logout';
  timestamp?: string;
  loginAt?: string;
  logoutAt?: string | null;
  devicePlatform?: string | null;
  deviceId?: string;
}

export interface ActiveDeviceRecord {
  deviceId: string;
  platformType: 'Web' | 'APK';
  deviceInfo: string;
  lastActive: string;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username?: string | null;
  displayName: string;
  profilePhotoUrl?: string | null;
  activeGoal?: string | null;
  vaultPoints: number;
  questionsSolved: number;
  studyMinutes: number;
  streakDays: number;
}

export interface AchievementRecord {
  id: string;
  title: string;
  description: string;
  category?: 'practice' | 'focus' | 'streak' | 'vp' | string;
  unlocked?: boolean;
  unlockedAt?: string | null;
  progressCurrent?: number;
  progressTarget?: number;
  vpReward?: number;
}

export interface RevisionItem {
  id: string;
  subject: string;
  topic: string;
  dueDate?: string;
  completed?: boolean;
  intervalDays?: number;
  reason?: string;
  mistakesCount?: number;
  accuracy?: number;
  questionsSolved?: number;
  repetitionStage?: number;
  lastStudiedAt?: string;
  lastRevisedAt?: string | null;
  nextReviewAt?: string;
  status?: 'Due Now' | 'Scheduled' | 'Mastered' | string;
}

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
  focusMinutes?: number;
  streakDays?: number;
  vpPoints?: number;
  vaultPoints?: number;
  questionVp?: number;
  focusMinuteVp?: number;
  focusBonusVp?: number;
  examBonusVp?: number;
  dailyUsageVp?: number;
  sixtyMinBonusCount?: number;
  svhAiUsageCount?: number;
  highestFiveDayStreakMilestone?: number;
  aiRevisionPlan?: AISmartRevisionPlan | null;
  aiSmartRevisionPlan?: AISmartRevisionPlan | null;
  activeStudyPlan?: AISmartRevisionPlan | null;
  vpTransactions?: VPTransaction[];
  activityHistory?: Array<Record<string, unknown>>;
  dailyActivity?: Record<string, { questionsSolved: number; studyMinutes: number; vpEarned?: number }>;
  seenQuestionIds?: string[];
  revisionSchedule?: RevisionItem[];
  unlockedAchievements?: Record<string, string>;
  recentMistakes?: Array<{ id?: string; subject: string; topic: string; question: string; timestamp?: string; date?: string }>;
  subjectPerformance?: Record<string, { attempted?: number; correct?: number; accuracy?: number }>;
  topicPerformance?: Record<string, { attempted: number; correct?: number; accuracy: number }>;
  lastLoginAt?: string | null;
  lastLogoutAt?: string | null;
  loginCount?: number;
  logoutCount?: number;
  loginHistory?: LoginSessionRecord[];
  lastDevicePlatform?: string | null;
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
    minutes?: number;
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
  completedChapterIds?: string[];
  readBookIds: string[];
  savedNCERTBookIds?: string[];
}

