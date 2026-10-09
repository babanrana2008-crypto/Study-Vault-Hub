import { UserStats } from '../types';

export interface VPRankTier {
  level: number;
  title: string;
  minVP: number;
  nextMinVP: number | null;
  badgeColor: string;
  accentText: string;
  description: string;
}

export interface VPMilestoneItem {
  id: string;
  title: string;
  description: string;
  category: 'Practice' | 'Focus' | 'Consistency' | 'Mastery';
  vpReward: number;
  currentValue: number;
  targetValue: number;
  unitLabel: string;
  unit?: string;
  unlocked: boolean;
  progressPercent: number;
}

export interface RealVPActivityItem {
  id: string;
  title: string;
  subtitle: string;
  vpEarned: number;
  timestamp: string;
  category: 'focus' | 'practice' | 'test' | 'streak';
}

export interface VPBreakdownSummary {
  totalVP: number;
  practiceVP: number;
  studyTimeVP: number;
  streakVP: number;
  normalQuestionVP: number;
  testModeQuestionVP: number;
  streakMilestoneVP: number;
  tasksAndNotesVP: number;
  communityVP: number;
  milestonesBonusVP: number;
  fiveMinStudyBlocks: number;
  normalQuestionsSolvedCount: number;
  testModeCorrectCount: number;
  fiveDayStreakCount: number;
  currentTier: VPRankTier;
  nextTier: VPRankTier | null;
  tierProgressPercent: number;
  vpNeededForNextTier: number;
  milestones: VPMilestoneItem[];
  unlockedMilestonesCount: number;
  recentActivities: RealVPActivityItem[];
}

export const VP_RANK_TIERS: VPRankTier[] = [
  {
    level: 1,
    title: 'Novice Scholar',
    minVP: 0,
    nextMinVP: 100,
    badgeColor: 'bg-[#131b2e] border-[#d4af37]/35 text-[#d4af37]',
    accentText: 'text-[#d4af37]',
    description: 'Beginning your academic journey in Study Vault Hub (< 100 VP).',
  },
  {
    level: 2,
    title: 'NEET Contender',
    minVP: 100,
    nextMinVP: 500,
    badgeColor: 'bg-[#131b2e] border-amber-500/45 text-amber-300',
    accentText: 'text-amber-400',
    description: 'Building consistent daily study and practice momentum (100 - 499 VP).',
  },
  {
    level: 3,
    title: 'Master Educator',
    minVP: 500,
    nextMinVP: null,
    badgeColor: 'bg-[#131b2e] border-emerald-400/60 text-emerald-300',
    accentText: 'text-emerald-400',
    description: 'Elite mastery across chapters, tests, revision, and peer mentorship (500+ VP).',
  },
];

export function getAcademicStanding(vpPoints: number): 'Novice Scholar' | 'NEET Contender' | 'Master Educator' {
  const safeVP = Math.max(0, Math.floor(Number(vpPoints) || 0));
  if (safeVP >= 500) return 'Master Educator';
  if (safeVP >= 100) return 'NEET Contender';
  return 'Novice Scholar';
}

export function getVPRankTier(vpPoints: number): {
  currentTier: VPRankTier;
  nextTier: VPRankTier | null;
  tierProgressPercent: number;
  vpNeededForNextTier: number;
} {
  const safeVP = Math.max(0, Math.floor(vpPoints));
  let currentIndex = 0;
  for (let i = VP_RANK_TIERS.length - 1; i >= 0; i--) {
    if (safeVP >= VP_RANK_TIERS[i].minVP) {
      currentIndex = i;
      break;
    }
  }

  const currentTier = VP_RANK_TIERS[currentIndex];
  const nextTier = currentIndex < VP_RANK_TIERS.length - 1 ? VP_RANK_TIERS[currentIndex + 1] : null;

  if (!nextTier) {
    return {
      currentTier,
      nextTier: null,
      tierProgressPercent: 100,
      vpNeededForNextTier: 0,
    };
  }

  const span = Math.max(1, nextTier.minVP - currentTier.minVP);
  const gainedInTier = Math.max(0, safeVP - currentTier.minVP);
  const tierProgressPercent = Math.min(100, Math.round((gainedInTier / span) * 100));
  const vpNeededForNextTier = Math.max(0, nextTier.minVP - safeVP);

  return {
    currentTier,
    nextTier,
    tierProgressPercent,
    vpNeededForNextTier,
  };
}

export function computeUserVPMilestones(
  stats: Partial<UserStats>,
  communityCounts?: { postsCount?: number; repliesCount?: number }
): VPMilestoneItem[] {
  const questionsAttempted = Math.max(0, Number(stats.questionsAttempted) || 0);
  const correctAnswers = Math.max(0, Number(stats.correctAnswers) || 0);
  const totalStudyMinutes = Math.max(0, Number(stats.totalStudyMinutes) || 0);
  const streakDays = Math.max(0, Number(stats.streak?.current) || 0);
  const completedTasksCount = Array.isArray(stats.tasks)
    ? stats.tasks.filter((t) => t && t.completed).length
    : 0;
  const completedNotesCount = Array.isArray(stats.completedNoteIds)
    ? stats.completedNoteIds.length
    : 0;
  const accuracy =
    questionsAttempted > 0 ? Math.round((correctAnswers / questionsAttempted) * 100) : 0;
  const firstStepCount = correctAnswers > 0 || totalStudyMinutes >= 5 ? 1 : 0;
  const communityActions =
    (communityCounts?.postsCount || 0) + (communityCounts?.repliesCount || 0);

  const rawList: Array<Omit<VPMilestoneItem, 'unlocked' | 'progressPercent'>> = [
    {
      id: 'ms_first_step',
      title: 'First Step in the Vault',
      description: 'Solve your first question or complete 5 minutes of focused study.',
      category: 'Consistency',
      vpReward: 10,
      currentValue: firstStepCount,
      targetValue: 1,
      unitLabel: 'action',
    },
    {
      id: 'ms_solver_10',
      title: 'Problem Solver I (10 Solved)',
      description: 'Successfully solve 10 practice questions across your target subjects.',
      category: 'Practice',
      vpReward: 20,
      currentValue: correctAnswers,
      targetValue: 10,
      unitLabel: 'correct',
    },
    {
      id: 'ms_solver_50',
      title: 'Dedicated Challenger (50 Solved)',
      description: 'Successfully solve 50 questions to build exam speed and confidence.',
      category: 'Practice',
      vpReward: 100,
      currentValue: correctAnswers,
      targetValue: 50,
      unitLabel: 'correct',
    },
    {
      id: 'ms_solver_100',
      title: 'Century Marksman (100 Solved)',
      description: 'Successfully solve 100 questions with verified solutions.',
      category: 'Practice',
      vpReward: 200,
      currentValue: correctAnswers,
      targetValue: 100,
      unitLabel: 'correct',
    },
    {
      id: 'ms_accuracy_80',
      title: 'Precision Ace (80%+)',
      description: 'Maintain at least 80% accuracy after solving 10 or more questions.',
      category: 'Mastery',
      vpReward: 50,
      currentValue: questionsAttempted >= 10 ? accuracy : questionsAttempted,
      targetValue: questionsAttempted >= 10 ? 80 : 10,
      unitLabel: questionsAttempted >= 10 ? '% accuracy' : 'MCQs needed',
    },
    {
      id: 'ms_focus_60',
      title: 'Deep Focus Scholar (60 Mins)',
      description: 'Log 60 minutes (12 × 5-min blocks) of verified study sessions.',
      category: 'Focus',
      vpReward: 120,
      currentValue: totalStudyMinutes,
      targetValue: 60,
      unitLabel: 'mins',
    },
    {
      id: 'ms_focus_300',
      title: 'Marathon Aspirant (5 Hours)',
      description: 'Accumulate 300 minutes (5 hours) of verified focused study time.',
      category: 'Focus',
      vpReward: 600,
      currentValue: totalStudyMinutes,
      targetValue: 300,
      unitLabel: 'mins',
    },
    {
      id: 'ms_streak_5',
      title: '5-Day Study Streak Milestone',
      description: 'Maintain an active study streak for 5 consecutive days (+20 VP).',
      category: 'Consistency',
      vpReward: 20,
      currentValue: streakDays,
      targetValue: 5,
      unitLabel: 'days',
    },
    {
      id: 'ms_streak_10',
      title: '10-Day Unstoppable Streak',
      description: 'Maintain an active study streak for 10 consecutive days (+40 VP total).',
      category: 'Consistency',
      vpReward: 40,
      currentValue: streakDays,
      targetValue: 10,
      unitLabel: 'days',
    },
    {
      id: 'ms_notes_tasks',
      title: 'Revision & Planner Pro',
      description: 'Complete at least 5 study tasks or high-yield revision notes.',
      category: 'Mastery',
      vpReward: 50,
      currentValue: completedTasksCount + completedNotesCount + communityActions,
      targetValue: 5,
      unitLabel: 'completed',
    },
  ];

  return rawList.map((item) => {
    const isAccuracyMilestone = item.id === 'ms_accuracy_80';
    const unlocked = isAccuracyMilestone
      ? questionsAttempted >= 10 && accuracy >= 80
      : item.currentValue >= item.targetValue;
    const progressPercent = unlocked
      ? 100
      : Math.min(99, Math.max(0, Math.round((item.currentValue / Math.max(1, item.targetValue)) * 100)));

    return {
      ...item,
      unit: item.unitLabel,
      unlocked,
      progressPercent,
    };
  });
}

export function getVPRankInfo(vpPoints: number) {
  const tier = getVPRankTier(vpPoints);
  return {
    currentTier: tier.currentTier,
    nextTier: tier.nextTier,
    progressPercent: tier.tierProgressPercent,
    vpNeededForNext: tier.vpNeededForNextTier,
    tierProgressPercent: tier.tierProgressPercent,
    vpNeededForNextTier: tier.vpNeededForNextTier,
  };
}

export function evaluateUserMilestones(
  stats: Partial<UserStats>,
  _totalVP?: number,
  communityCounts?: { postsCount?: number; repliesCount?: number }
): VPMilestoneItem[] {
  return computeUserVPMilestones(stats, communityCounts);
}

export function calculateUserVPBreakdown(
  stats: Partial<UserStats>,
  communityCounts?: { postsCount?: number; repliesCount?: number }
): VPBreakdownSummary {
  const totalCorrectAnswers = Math.max(0, Number(stats.correctAnswers) || 0);
  const totalStudyMinutes = Math.max(0, Number(stats.totalStudyMinutes) || 0);
  const streakDays = Math.max(0, Number(stats.streak?.current) || 0);
  const maxFiveDayMilestoneTracked = Math.max(
    0,
    Number(stats.highestFiveDayStreakMilestone) || 0
  );

  const practiceHistory = Array.isArray(stats.practiceHistory) ? stats.practiceHistory : [];
  const studySessions = Array.isArray(stats.studySessions) ? stats.studySessions : [];

  // Separate Test Mode correct answers (5 VP each) from Normal Practice correct answers (2 VP each)
  const rawTestModeCorrect = practiceHistory.reduce(
    (sum, entry) => sum + Math.max(0, Number(entry?.correctCount) || 0),
    0
  );
  const testModeCorrectCount = Math.min(totalCorrectAnswers, rawTestModeCorrect);
  const normalQuestionsSolvedCount = Math.max(0, totalCorrectAnswers - testModeCorrectCount);

  // 1. 10 VP — every 5 minutes of genuine active study/focus time
  const fiveMinStudyBlocks = Math.floor(totalStudyMinutes / 5);
  const studyTimeVP = fiveMinStudyBlocks * 10;

  // 2. 2 VP — for every normal question successfully solved
  const normalQuestionVP = normalQuestionsSolvedCount * 2;

  // 3. 5 VP — for every correctly answered question in Test Mode
  const testModeQuestionVP = testModeCorrectCount * 5;

  // 4. 20 VP — after maintaining each 5-day study streak milestone (non-duplicative)
  const currentFiveDayMilestones = Math.floor(streakDays / 5);
  const fiveDayStreakCount = Math.max(currentFiveDayMilestones, maxFiveDayMilestoneTracked);
  const streakMilestoneVP = fiveDayStreakCount * 20;

  const practiceVP = normalQuestionVP + testModeQuestionVP;
  const streakVP = streakMilestoneVP;
  const tasksAndNotesVP = 0;
  const communityVP = 0;
  const milestonesBonusVP = 0;

  const milestones = computeUserVPMilestones(stats, communityCounts);
  const unlockedMilestones = milestones.filter((m) => m.unlocked);

  const computedStudyVP = studyTimeVP + normalQuestionVP + testModeQuestionVP + streakMilestoneVP;
  const persistedVP = Math.max(
    0,
    Math.floor(Number(stats.vpPoints) || 0),
    Math.floor(Number(stats.vaultPoints) || 0)
  );
  const totalVP = Math.max(computedStudyVP, persistedVP);
  const tierInfo = getVPRankTier(totalVP);

  // Build real recent VP activity log from real sessions, tests, and solved questions (never fake)
  const recentActivities: RealVPActivityItem[] = [];

  for (const session of studySessions.slice(0, 6)) {
    const mins = Math.max(0, Number(session?.durationMinutes) || 0);
    const vp = Math.floor(mins / 5) * 10;
    if (vp > 0) {
      recentActivities.push({
        id: `act_focus_${session.id}`,
        title: `Focused Study: ${session.subject}`,
        subtitle: `${mins} mins (${session.topic || 'Focus Session'})`,
        vpEarned: vp,
        timestamp: session.date
          ? `${session.date}${session.timestamp ? ` · ${session.timestamp}` : ''}`
          : session.timestamp || 'Recorded',
        category: 'focus',
      });
    }
  }

  for (const test of practiceHistory.slice(0, 6)) {
    const correct = Math.max(0, Number(test?.correctCount) || 0);
    const vp = correct * 5;
    if (vp > 0) {
      recentActivities.push({
        id: `act_test_${test.id}`,
        title: `Test Mode: ${test.subject}`,
        subtitle: `${correct}/${test.totalQuestions} correct (${test.accuracy}% accuracy)`,
        vpEarned: vp,
        timestamp: test.date || 'Completed',
        category: 'test',
      });
    }
  }

  if (normalQuestionsSolvedCount > 0) {
    recentActivities.push({
      id: 'act_normal_mcqs',
      title: 'Normal Questions Solved',
      subtitle: `${normalQuestionsSolvedCount} solved (${normalQuestionVP} VP earned)`,
      vpEarned: normalQuestionVP,
      timestamp: 'Verified Practice',
      category: 'practice',
    });
  }

  if (fiveDayStreakCount > 0) {
    recentActivities.push({
      id: 'act_streak_milestone',
      title: `${fiveDayStreakCount * 5}-Day Study Streak Milestone`,
      subtitle: `${fiveDayStreakCount} × 5-day streak reward (20 VP each)`,
      vpEarned: streakMilestoneVP,
      timestamp: `${streakDays}d Current Streak`,
      category: 'streak',
    });
  }

  return {
    totalVP,
    practiceVP,
    studyTimeVP,
    streakVP,
    normalQuestionVP,
    testModeQuestionVP,
    streakMilestoneVP,
    tasksAndNotesVP,
    communityVP,
    milestonesBonusVP,
    fiveMinStudyBlocks,
    normalQuestionsSolvedCount,
    testModeCorrectCount,
    fiveDayStreakCount,
    currentTier: tierInfo.currentTier,
    nextTier: tierInfo.nextTier,
    tierProgressPercent: tierInfo.tierProgressPercent,
    vpNeededForNextTier: tierInfo.vpNeededForNextTier,
    milestones,
    unlockedMilestonesCount: unlockedMilestones.length,
    recentActivities: recentActivities.slice(0, 8),
  };
}
