import type { VPTransaction, UserStats, StudySession, AchievementRecord, RevisionItem } from '../types/index.ts';

// Pure deterministic SHA-256 implementation (works identically in Node.js, Web, and Android Capacitor WebView)
const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

function rotr(n: number, x: number): number {
  return (x >>> n) | (x << (32 - n));
}

export function sha256Hex(ascii: string): string {
  const utf8 = unescape(encodeURIComponent(ascii));
  const words: number[] = [];
  const asciiBitLength = utf8.length * 8;

  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;

  for (let i = 0; i < utf8.length; i++) {
    words[i >> 2] |= (utf8.charCodeAt(i) & 0xff) << (24 - (i % 4) * 8);
  }
  words[utf8.length >> 2] |= 0x80 << (24 - (utf8.length % 4) * 8);
  words[(((utf8.length + 8) >> 6) << 4) + 15] = asciiBitLength;

  const w = new Uint32Array(64);
  for (let j = 0; j < words.length; j += 16) {
    for (let i = 0; i < 16; i++) {
      w[i] = words[j + i] | 0;
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(7, w[i - 15]) ^ rotr(18, w[i - 15]) ^ (w[i - 15] >>> 3);
      const s1 = rotr(17, w[i - 2]) ^ rotr(19, w[i - 2]) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let h = h7;

    for (let i = 0; i < 64; i++) {
      const S1 = rotr(6, e) ^ rotr(11, e) ^ rotr(25, e);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + K[i] + w[i]) | 0;
      const S0 = rotr(2, a) ^ rotr(13, a) ^ rotr(22, a);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) | 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) | 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) | 0;
    }

    h0 = (h0 + a) | 0;
    h1 = (h1 + b) | 0;
    h2 = (h2 + c) | 0;
    h3 = (h3 + d) | 0;
    h4 = (h4 + e) | 0;
    h5 = (h5 + f) | 0;
    h6 = (h6 + g) | 0;
    h7 = (h7 + h) | 0;
  }

  const toHex = (n: number) => (n >>> 0).toString(16).padStart(8, '0');
  return (
    toHex(h0) +
    toHex(h1) +
    toHex(h2) +
    toHex(h3) +
    toHex(h4) +
    toHex(h5) +
    toHex(h6) +
    toHex(h7)
  );
}

/**
 * Generates a salted, stretched SHA-256 password hash (`svh2$<salt>$<digest>`)
 * that is 100% compatible across Node.js, Web browsers, and Android APK WebViews.
 */
export function hashPortablePassword(password: string, customSalt?: string): string {
  const salt =
    customSalt ||
    sha256Hex(`${Date.now()}_${Math.random()}_svh_salt`).slice(0, 32);
  let digest = sha256Hex(`svh_pepper_v2:${salt}:${password}`);
  for (let i = 0; i < 600; i++) {
    digest = sha256Hex(`${digest}:${salt}:${i}`);
  }
  return `svh2$${salt}$${digest}`;
}

export function verifyPortablePassword(password: string, storedHash: string): boolean {
  if (!storedHash || !storedHash.startsWith('svh2$')) return false;
  const parts = storedHash.split('$');
  if (parts.length !== 3) return false;
  const salt = parts[1];
  const expected = hashPortablePassword(password, salt);
  return expected === storedHash;
}

/**
 * Deterministic salted hash by username so accounts synced between Web and APK
 * can verify credentials reliably.
 */
export function hashDeterministicAccountPassword(usernameLower: string, password: string): string {
  const deterministicSalt = sha256Hex(`svh_account_salt_v2:${usernameLower.trim().toLowerCase()}`).slice(0, 32);
  return hashPortablePassword(password, deterministicSalt);
}

/**
 * Vault Points (VP) Rules:
 * +1 VP valid completed question
 * +20 VP completed 60-minute Focus Study
 * +10 VP after 5 valid Exam/Exam-Oriented questions
 * +40 VP after 20 valid Exam/Exam-Oriented questions
 * +2 VP qualifying daily usage
 */
export const VP_PER_QUESTION = 1;
export const VP_PER_FOCUS_MINUTE = 0;
export const VP_BONUS_PER_60_MIN_SESSION = 20;
export const VP_BONUS_EXAM_5_QUESTIONS = 10;
export const VP_BONUS_EXAM_20_QUESTIONS = 40;
export const VP_DAILY_USAGE_REWARD = 2;

// Aliases used by server.ts backend
export const VP_REWARD_PER_QUESTION = VP_PER_QUESTION;
export const VP_REWARD_PER_FOCUS_MINUTE = VP_PER_FOCUS_MINUTE;
export const VP_REWARD_60_MIN_BONUS = VP_BONUS_PER_60_MIN_SESSION;
export const VP_REWARD_EXAM_5 = VP_BONUS_EXAM_5_QUESTIONS;
export const VP_REWARD_EXAM_20 = VP_BONUS_EXAM_20_QUESTIONS;
export const VP_REWARD_DAILY_USAGE = VP_DAILY_USAGE_REWARD;

export function calculateVaultPointsBreakdown(
  userStats?: Partial<UserStats> | Record<string, unknown> | null,
  existingTransactions?: Array<Record<string, unknown> | Partial<VPTransaction>>
): {
  vaultPoints: number;
  questionVp: number;
  focusMinuteVp: number;
  focusBonusVp: number;
  sixtyMinBonusCount: number;
  examBonusVp: number;
  dailyUsageVp: number;
  vpTransactions: VPTransaction[];
} {
  const stats = (userStats || {}) as Partial<UserStats>;
  const userId = String(stats.userId || 'usr_default');
  const normalizedTxs: VPTransaction[] = Array.isArray(existingTransactions)
    ? existingTransactions.map((tx, idx) => ({
        id: String(tx.id || `vptx_${idx}`),
        userId: String(tx.userId || userId),
        timestamp: String(tx.timestamp || new Date().toISOString()),
        amount: Number(tx.amount) || 0,
        reason: String(tx.reason || 'Vault Points Earned'),
        category:
          tx.category === 'question'
            ? 'question'
            : tx.category === 'focus_bonus_60m'
            ? 'focus_bonus_60m'
            : tx.category === 'exam_bonus_5q'
            ? 'exam_bonus_5q'
            : tx.category === 'exam_bonus_20q'
            ? 'exam_bonus_20q'
            : tx.category === 'daily_usage'
            ? 'daily_usage'
            : 'focus_minutes',
        relatedId: String(
          tx.relatedId ||
            (tx as Record<string, unknown>).relatedEntityId ||
            tx.id ||
            `rel_${idx}`
        ),
      }))
    : Array.isArray(stats.vpTransactions)
    ? stats.vpTransactions
    : [];

  return reconcileUserVpState({
    userId,
    existingTransactions: normalizedTxs,
    questionsAttempted: Number(stats.questionsAttempted) || 0,
    studySessions: Array.isArray(stats.studySessions) ? stats.studySessions : [],
    dailyActivity: stats.dailyActivity,
  });
}

export function calculateFocusSessionVp(durationMinutes: number): {
  minuteVp: number;
  bonusVp: number;
  totalVp: number;
  bonusCount: number;
} {
  const validMinutes = Math.max(0, Math.floor(Number(durationMinutes) || 0));
  const minuteVp = validMinutes * VP_PER_FOCUS_MINUTE;
  const bonusCount = validMinutes >= 60 ? Math.floor(validMinutes / 60) : 0;
  const bonusVp = bonusCount * VP_BONUS_PER_60_MIN_SESSION;
  return {
    minuteVp,
    bonusVp,
    totalVp: minuteVp + bonusVp,
    bonusCount,
  };
}

/**
 * Recomputes a user's VP breakdown from their verified VPTransaction ledger,
 * ensuring backfilled historical real questions/sessions are accurately reflected
 * without ever double-counting or inventing fake points.
 */
export function reconcileUserVpState(params: {
  userId: string;
  existingTransactions?: VPTransaction[];
  questionsAttempted?: number;
  studySessions?: StudySession[];
  dailyActivity?: Record<string, { questionsSolved: number; studyMinutes: number; vpEarned?: number }>;
  createdAt?: string;
}): {
  vaultPoints: number;
  questionVp: number;
  focusMinuteVp: number;
  focusBonusVp: number;
  sixtyMinBonusCount: number;
  examBonusVp: number;
  dailyUsageVp: number;
  vpTransactions: VPTransaction[];
} {
  const {
    userId,
    existingTransactions = [],
    questionsAttempted = 0,
    studySessions = [],
    dailyActivity = {},
    createdAt,
  } = params;

  const txMap = new Map<string, VPTransaction>();
  for (const tx of existingTransactions) {
    if (tx && tx.id && typeof tx.amount === 'number' && tx.amount > 0) {
      txMap.set(tx.id, tx);
    }
  }

  // Ensure any real historical studySessions that don't yet have a ledger entry are recorded once deterministically
  for (const sess of studySessions) {
    if (!sess || !sess.id) continue;
    const mins = Math.max(0, Math.floor(Number(sess.durationMinutes) || 0));
    if (mins <= 0) continue;
    const { minuteVp, bonusVp } = calculateFocusSessionVp(mins);
    const minTxId = `vp_focus_min_${userId}_${sess.id}`;
    if (!txMap.has(minTxId) && minuteVp > 0) {
      txMap.set(minTxId, {
        id: minTxId,
        userId,
        timestamp: sess.timestamp || createdAt || new Date().toISOString(),
        amount: minuteVp,
        reason: `Verified Focus Session (${mins} min${sess.subject ? ` · ${sess.subject}` : ''})`,
        category: 'focus_minutes',
        relatedId: sess.id,
        subject: sess.subject,
        topic: sess.topic,
      });
    }
    if (bonusVp > 0) {
      const bonusTxId = `vp_focus_bonus60_${userId}_${sess.id}`;
      if (!txMap.has(bonusTxId)) {
        txMap.set(bonusTxId, {
          id: bonusTxId,
          userId,
          timestamp: sess.timestamp || createdAt || new Date().toISOString(),
          amount: bonusVp,
          reason: `Completed 60-Minute Focus Study (+${bonusVp} VP)`,
          category: 'focus_bonus_60m',
          relatedId: sess.id,
          subject: sess.subject,
          topic: sess.topic,
        });
      }
    }
  }

  // Check total question VP in ledger vs real questionsAttempted
  let currentQuestionTxCount = 0;
  for (const tx of txMap.values()) {
    if (tx.category === 'question') {
      currentQuestionTxCount += Math.max(1, Math.round(tx.amount / Math.max(1, VP_PER_QUESTION)));
    }
  }

  // If the user has real historical questionsAttempted prior to VP ledger creation, backfill deterministically once
  const missingHistoricalQuestions = Math.max(0, Math.floor(questionsAttempted) - currentQuestionTxCount);
  if (missingHistoricalQuestions > 0) {
    const backfillId = `vp_q_historical_backfill_${userId}`;
    const existingBackfill = txMap.get(backfillId);
    if (!existingBackfill) {
      txMap.set(backfillId, {
        id: backfillId,
        userId,
        timestamp: createdAt || new Date().toISOString(),
        amount: missingHistoricalQuestions * VP_PER_QUESTION,
        reason: `Completed ${missingHistoricalQuestions} Valid ${
          missingHistoricalQuestions === 1 ? 'Question' : 'Questions'
        }`,
        category: 'question',
        relatedId: 'historical_practice',
      });
    }
  }

  // Ensure exam-oriented milestones (+10 VP after 5 valid Exam/Exam-Oriented questions, +40 VP after 20 valid Exam/Exam-Oriented questions)
  if (questionsAttempted >= 5) {
    const exam5Id = `vp_exam_milestone_5q_${userId}`;
    const hasExam5 = Array.from(txMap.values()).some(
      (tx) => tx.category === 'exam_bonus_5q' || tx.id === exam5Id
    );
    if (!hasExam5) {
      txMap.set(exam5Id, {
        id: exam5Id,
        userId,
        timestamp: createdAt || new Date().toISOString(),
        amount: VP_BONUS_EXAM_5_QUESTIONS,
        reason: 'Completed 5 Valid Exam/Exam-Oriented Questions (+10 VP)',
        category: 'exam_bonus_5q',
        relatedId: 'exam_milestone_5q',
      });
    }
  }

  if (questionsAttempted >= 20) {
    const exam20Id = `vp_exam_milestone_20q_${userId}`;
    const hasExam20 = Array.from(txMap.values()).some(
      (tx) => tx.category === 'exam_bonus_20q' || tx.id === exam20Id
    );
    if (!hasExam20) {
      txMap.set(exam20Id, {
        id: exam20Id,
        userId,
        timestamp: createdAt || new Date().toISOString(),
        amount: VP_BONUS_EXAM_20_QUESTIONS,
        reason: 'Completed 20 Valid Exam/Exam-Oriented Questions (+40 VP)',
        category: 'exam_bonus_20q',
        relatedId: 'exam_milestone_20q',
      });
    }
  }

  // Ensure qualifying daily usage (+2 VP per active study day)
  if (dailyActivity && typeof dailyActivity === 'object') {
    for (const [dateKey, act] of Object.entries(dailyActivity)) {
      if (act && ((act.questionsSolved || 0) > 0 || (act.studyMinutes || 0) > 0)) {
        const dailyTxId = `vp_daily_usage_${userId}_${dateKey}`;
        const hasDayTx = Array.from(txMap.values()).some(
          (tx) =>
            tx.id === dailyTxId ||
            (tx.category === 'daily_usage' && tx.relatedId === dateKey)
        );
        if (!hasDayTx) {
          txMap.set(dailyTxId, {
            id: dailyTxId,
            userId,
            timestamp: `${dateKey}T12:00:00.000Z`,
            amount: VP_DAILY_USAGE_REWARD,
            reason: `Qualifying Daily Usage (${dateKey}) (+2 VP)`,
            category: 'daily_usage',
            relatedId: dateKey,
          });
        }
      }
    }
  }

  let questionVp = 0;
  let focusMinuteVp = 0;
  let focusBonusVp = 0;
  let sixtyMinBonusCount = 0;
  let examBonusVp = 0;
  let dailyUsageVp = 0;

  const sortedTransactions = Array.from(txMap.values()).sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  for (const tx of sortedTransactions) {
    if (tx.category === 'question') {
      questionVp += tx.amount;
    } else if (tx.category === 'focus_minutes') {
      focusMinuteVp += tx.amount;
    } else if (tx.category === 'focus_bonus_60m') {
      focusBonusVp += tx.amount;
      sixtyMinBonusCount += Math.max(1, Math.floor(tx.amount / VP_BONUS_PER_60_MIN_SESSION));
    } else if (tx.category === 'exam_bonus_5q' || tx.category === 'exam_bonus_20q') {
      examBonusVp += tx.amount;
    } else if (tx.category === 'daily_usage') {
      dailyUsageVp += tx.amount;
    }
  }

  const vaultPoints = questionVp + focusMinuteVp + focusBonusVp + examBonusVp + dailyUsageVp;

  return {
    vaultPoints,
    questionVp,
    focusMinuteVp,
    focusBonusVp,
    sixtyMinBonusCount,
    examBonusVp,
    dailyUsageVp,
    vpTransactions: sortedTransactions,
  };
}

export function detectClientDevicePlatform(userAgent?: string): string {
  const ua =
    userAgent ||
    (typeof navigator !== 'undefined' ? navigator.userAgent : '') ||
    '';
  const isCapacitor =
    typeof window !== 'undefined' &&
    Boolean(
      (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.() ||
        ua.includes('Capacitor') ||
        window.location?.protocol === 'capacitor:' ||
        (window.location?.origin === 'https://localhost' && /Android/i.test(ua))
    );

  if (isCapacitor) return 'Android APK';
  if (/iPad|Tablet|PlayBook|Silk/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua))) {
    return 'Tablet Web';
  }
  if (/Android|iPhone|iPod|Mobile/i.test(ua)) {
    return 'Mobile Web';
  }
  return 'Desktop Web';
}

export function mergeUserStatsSafely(
  existing: Partial<UserStats> | undefined | null,
  incoming: Partial<UserStats> | undefined | null
): Partial<UserStats> {
  const base = existing || {};
  const next = incoming || {};

  // Never overwrite real progress with 0/empty defaults on login or session restore
  const questionsAttempted = Math.max(
    Number(base.questionsAttempted) || 0,
    Number(next.questionsAttempted) || 0
  );
  const correctAnswers = Math.max(
    Number(base.correctAnswers) || 0,
    Number(next.correctAnswers) || 0
  );
  const incorrectAnswers = Math.max(
    Number(base.incorrectAnswers) || 0,
    Number(next.incorrectAnswers) || 0
  );
  const totalStudyMinutes = Math.max(
    Number(base.totalStudyMinutes) || 0,
    Number(next.totalStudyMinutes) || 0
  );

  // Merge studySessions by id
  const sessionMap = new Map<string, StudySession>();
  for (const s of base.studySessions || []) {
    if (s?.id) sessionMap.set(s.id, s);
  }
  for (const s of next.studySessions || []) {
    if (s?.id) sessionMap.set(s.id, s);
  }
  const studySessions = Array.from(sessionMap.values());

  // Merge practiceHistory by id
  const practiceMap = new Map<string, NonNullable<UserStats['practiceHistory']>[number]>();
  for (const p of base.practiceHistory || []) {
    if (p?.id) practiceMap.set(p.id, p);
  }
  for (const p of next.practiceHistory || []) {
    if (p?.id) practiceMap.set(p.id, p);
  }
  const practiceHistory = Array.from(practiceMap.values());

  // Merge tasks — if incoming explicitly passes tasks array from user interaction, use incoming if base was empty or next has tasks
  const tasks =
    next.tasks !== undefined
      ? next.tasks.length > 0 || (base.tasks?.length || 0) === 0
        ? next.tasks
        : base.tasks || []
      : base.tasks || [];

  // Merge vpTransactions by id
  const txMap = new Map<string, VPTransaction>();
  for (const tx of base.vpTransactions || []) {
    if (tx?.id) txMap.set(tx.id, tx);
  }
  for (const tx of next.vpTransactions || []) {
    if (tx?.id) txMap.set(tx.id, tx);
  }
  const vpTransactions = Array.from(txMap.values()).sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const seenQuestionIds = Array.from(
    new Set([...(base.seenQuestionIds || []), ...(next.seenQuestionIds || [])])
  );

  const topicsStudied = Array.from(
    new Set([...(base.topicsStudied || []), ...(next.topicsStudied || [])])
  );

  const bookmarkedItemIds =
    next.bookmarkedItemIds !== undefined
      ? next.bookmarkedItemIds
      : base.bookmarkedItemIds || [];

  const completedNoteIds = Array.from(
    new Set([...(base.completedNoteIds || []), ...(next.completedNoteIds || [])])
  );

  const readBookIds = Array.from(
    new Set([...(base.readBookIds || []), ...(next.readBookIds || [])])
  );

  const subjectsStudied: Record<string, number> = { ...(base.subjectsStudied || {}) };
  if (next.subjectsStudied) {
    for (const [sub, mins] of Object.entries(next.subjectsStudied)) {
      subjectsStudied[sub] = Math.max(subjectsStudied[sub] || 0, Number(mins) || 0);
    }
  }

  const chapterProgress = {
    ...(base.chapterProgress || {}),
    ...(next.chapterProgress || {}),
  };

  const streakCurrent = Math.max(
    Number(base.streak?.current) || 0,
    Number(next.streak?.current) || 0
  );
  const streakLastDate =
    next.streak?.lastActiveDate || base.streak?.lastActiveDate || '';

  // Merge revisionSchedule by deterministic id without duplicates
  const revMap = new Map<string, RevisionItem>();
  for (const r of base.revisionSchedule || []) {
    if (r?.id) revMap.set(r.id, r);
  }
  for (const r of next.revisionSchedule || []) {
    if (!r?.id) continue;
    const prevRev = revMap.get(r.id);
    if (!prevRev || (r.repetitionStage || 0) >= (prevRev.repetitionStage || 0)) {
      revMap.set(r.id, r);
    }
  }
  const revisionSchedule = Array.from(revMap.values());

  // Merge unlockedAchievements preserving earliest unlock timestamp
  const unlockedAchievements: Record<string, string> = {
    ...(base.unlockedAchievements || {}),
    ...(next.unlockedAchievements || {}),
  };

  const activeStudyPlan =
    next.activeStudyPlan !== undefined
      ? next.activeStudyPlan
      : base.activeStudyPlan || null;

  return {
    ...base,
    ...next,
    name: (next.name || base.name || '').trim(),
    selectedGoals:
      next.selectedGoals && next.selectedGoals.length > 0
        ? next.selectedGoals
        : base.selectedGoals || [],
    activeGoal: next.activeGoal || base.activeGoal || '',
    questionsAttempted,
    correctAnswers,
    incorrectAnswers,
    totalStudyMinutes,
    studySessions,
    practiceHistory,
    tasks,
    vpTransactions,
    seenQuestionIds,
    topicsStudied,
    bookmarkedItemIds,
    completedNoteIds,
    readBookIds,
    subjectsStudied,
    chapterProgress,
    revisionSchedule,
    unlockedAchievements,
    activeStudyPlan,
    streak: {
      current: streakCurrent,
      lastActiveDate: streakLastDate,
    },
  };
}

export const SPACED_REPETITION_INTERVAL_DAYS = [1, 3, 7, 14, 30];

/**
 * Evaluates and verifies real achievement unlocks strictly from actual user activity.
 * Never unlocks an achievement unless its condition is genuinely met.
 */
export function evaluateVerifiedAchievements(
  stats: Partial<UserStats>,
  nowIso = new Date().toISOString()
): {
  achievements: AchievementRecord[];
  unlockedAchievements: Record<string, string>;
  newlyUnlocked: AchievementRecord[];
} {
  const questionsAttempted = Math.max(0, Number(stats.questionsAttempted) || 0);
  const studySessions = Array.isArray(stats.studySessions) ? stats.studySessions : [];
  const totalStudyMinutes = Math.max(0, Number(stats.totalStudyMinutes) || 0);
  const maxSingleFocusMinutes = studySessions.reduce(
    (max, s) => Math.max(max, Number(s?.durationMinutes) || 0),
    0
  );
  const sixtyMinSessions = Math.max(
    Number(stats.sixtyMinBonusCount) || 0,
    studySessions.filter((s) => (Number(s?.durationMinutes) || 0) >= 60).length
  );
  const streakDays = Math.max(0, Number(stats.streak?.current) || 0);
  const vaultPoints = Math.max(
    0,
    Number(stats.vaultPoints) ||
      questionsAttempted * VP_PER_QUESTION + totalStudyMinutes
  );

  const existingUnlocked: Record<string, string> = {
    ...(stats.unlockedAchievements || {}),
  };

  const definitions: Array<{
    id: string;
    title: string;
    description: string;
    category: AchievementRecord['category'];
    current: number;
    target: number;
  }> = [
    {
      id: 'ach_first_question',
      title: 'First Question Solved',
      description: 'Complete your first practice MCQ question.',
      category: 'practice',
      current: Math.min(1, questionsAttempted),
      target: 1,
    },
    {
      id: 'ach_questions_10',
      title: '10 Questions Milestone',
      description: 'Solve 10 verified practice questions.',
      category: 'practice',
      current: Math.min(10, questionsAttempted),
      target: 10,
    },
    {
      id: 'ach_questions_50',
      title: '50 Questions Scholar',
      description: 'Solve 50 verified practice questions.',
      category: 'practice',
      current: Math.min(50, questionsAttempted),
      target: 50,
    },
    {
      id: 'ach_first_focus',
      title: 'First Focus Session',
      description: 'Complete and log your first real study focus session.',
      category: 'focus',
      current: Math.min(1, studySessions.length),
      target: 1,
    },
    {
      id: 'ach_focus_60m',
      title: '60-Minute Deep Focus',
      description: 'Complete a continuous 60-minute study focus session.',
      category: 'focus',
      current: sixtyMinSessions > 0 ? 60 : Math.min(60, maxSingleFocusMinutes),
      target: 60,
    },
    {
      id: 'ach_streak_3d',
      title: '3-Day Study Streak',
      description: 'Maintain an active study streak for 3 consecutive days.',
      category: 'streak',
      current: Math.min(3, streakDays),
      target: 3,
    },
    {
      id: 'ach_streak_7d',
      title: '7-Day Consistency Champion',
      description: 'Maintain an active study streak for 7 consecutive days.',
      category: 'streak',
      current: Math.min(7, streakDays),
      target: 7,
    },
    {
      id: 'ach_vp_100',
      title: '100 Vault Points',
      description: 'Earn 100 verified Vault Points from study and practice.',
      category: 'vp',
      current: Math.min(100, vaultPoints),
      target: 100,
    },
    {
      id: 'ach_vp_500',
      title: '500 Vault Points Master',
      description: 'Earn 500 verified Vault Points.',
      category: 'vp',
      current: Math.min(500, vaultPoints),
      target: 500,
    },
  ];

  const newlyUnlocked: AchievementRecord[] = [];
  const updatedUnlocked: Record<string, string> = {};

  const achievements: AchievementRecord[] = definitions.map((def) => {
    const isConditionMet = def.current >= def.target;
    let unlockedAt: string | null = null;
    if (isConditionMet) {
      unlockedAt = existingUnlocked[def.id] || nowIso;
      updatedUnlocked[def.id] = unlockedAt;
    }
    const record: AchievementRecord = {
      id: def.id,
      title: def.title,
      description: def.description,
      category: def.category,
      unlocked: isConditionMet,
      unlockedAt,
      progressCurrent: def.current,
      progressTarget: def.target,
    };
    if (isConditionMet && !existingUnlocked[def.id]) {
      newlyUnlocked.push(record);
    }
    return record;
  });

  return {
    achievements,
    unlockedAchievements: updatedUnlocked,
    newlyUnlocked,
  };
}

/**
 * Generates and reconciles a real Spaced Repetition & Smart Revision schedule
 * strictly from real studied topics, practice history, chapter progress, and mistakes.
 * Never fabricates topics if the user has no real study activity.
 */
export function computeSmartRevisionSchedule(
  stats: Partial<UserStats>,
  nowMs = Date.now()
): RevisionItem[] {
  const existingList = Array.isArray(stats.revisionSchedule) ? stats.revisionSchedule : [];
  const byId = new Map<string, RevisionItem>();
  for (const item of existingList) {
    if (item && item.id) {
      byId.set(item.id, { ...item });
    }
  }

  const nowIso = new Date(nowMs).toISOString();
  const makeId = (subject: string, topic: string) =>
    `rev_${`${subject}_${topic}`.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 90)}`;

  // 1. From real recentMistakes
  const mistakesByTopic = new Map<string, { subject: string; topic: string; count: number; lastDate: string }>();
  for (const m of stats.recentMistakes || []) {
    if (!m?.topic) continue;
    const key = makeId(m.subject || 'General', m.topic);
    const cur = mistakesByTopic.get(key);
    mistakesByTopic.set(key, {
      subject: m.subject || 'General',
      topic: m.topic,
      count: (cur?.count || 0) + 1,
      lastDate: m.date || nowIso,
    });
  }

  for (const [id, info] of mistakesByTopic.entries()) {
    const existing = byId.get(id);
    if (!existing) {
      byId.set(id, {
        id,
        subject: info.subject,
        topic: info.topic,
        reason: `${info.count} recent mistake${info.count > 1 ? 's' : ''} recorded in practice`,
        mistakesCount: info.count,
        repetitionStage: 0,
        intervalDays: 1,
        lastStudiedAt: info.lastDate,
        lastRevisedAt: null,
        nextReviewAt: nowIso, // Due immediately for mistake review
        status: 'Due Now',
      });
    } else {
      existing.mistakesCount = Math.max(existing.mistakesCount || 0, info.count);
    }
  }

  // 2. From real topicPerformance / chapterProgress
  if (stats.topicPerformance) {
    for (const [topicKey, perf] of Object.entries(stats.topicPerformance)) {
      if (!perf || perf.attempted < 1) continue;
      const parts = topicKey.includes('::') ? topicKey.split('::') : ['General', topicKey];
      const subject = parts.length > 1 ? parts[0] : (stats.activeGoal || 'Core Subject');
      const topic = parts.length > 1 ? parts[1] : topicKey;
      const id = makeId(subject, topic);
      const existing = byId.get(id);
      const isWeak = perf.accuracy < 65;
      const initialInterval = isWeak ? 1 : 3;
      const nextDue = new Date(nowMs + (isWeak ? 0 : initialInterval * 86400000)).toISOString();

      if (!existing) {
        byId.set(id, {
          id,
          subject,
          topic,
          reason: isWeak
            ? `Low practice accuracy (${perf.accuracy}% across ${perf.attempted} Qs)`
            : `Practiced topic (${perf.accuracy}% accuracy across ${perf.attempted} Qs)`,
          accuracy: perf.accuracy,
          questionsSolved: perf.attempted,
          repetitionStage: isWeak ? 0 : 1,
          intervalDays: initialInterval,
          lastStudiedAt: nowIso,
          lastRevisedAt: null,
          nextReviewAt: nextDue,
          status: isWeak ? 'Due Now' : 'Scheduled',
        });
      } else {
        existing.accuracy = perf.accuracy;
        existing.questionsSolved = perf.attempted;
      }
    }
  }

  if (stats.chapterProgress) {
    for (const [chapTitle, prog] of Object.entries(stats.chapterProgress)) {
      if (!prog || prog.questionsSolved < 1) continue;
      const subject = stats.activeGoal || 'Core Subject';
      const id = makeId(subject, chapTitle);
      if (!byId.has(id)) {
        const isWeak = prog.accuracy < 65;
        byId.set(id, {
          id,
          subject,
          topic: chapTitle,
          reason: isWeak
            ? `Chapter accuracy ${prog.accuracy}% (${prog.questionsSolved} Qs solved)`
            : `Chapter practiced (${prog.accuracy}% accuracy)`,
          accuracy: prog.accuracy,
          questionsSolved: prog.questionsSolved,
          repetitionStage: isWeak ? 0 : 1,
          intervalDays: isWeak ? 1 : 3,
          lastStudiedAt: nowIso,
          lastRevisedAt: null,
          nextReviewAt: isWeak ? nowIso : new Date(nowMs + 3 * 86400000).toISOString(),
          status: isWeak ? 'Due Now' : 'Scheduled',
        });
      }
    }
  }

  // 3. From real studySessions
  for (const sess of stats.studySessions || []) {
    if (!sess?.topic || (Number(sess.durationMinutes) || 0) < 1) continue;
    const id = makeId(sess.subject || 'General', sess.topic);
    if (!byId.has(id)) {
      const studiedDate = sess.date ? new Date(sess.date).getTime() : nowMs;
      const safeStudiedMs = isNaN(studiedDate) ? nowMs : studiedDate;
      const nextReviewMs = safeStudiedMs + 86400000; // +1 day initial spaced repetition
      byId.set(id, {
        id,
        subject: sess.subject || 'General',
        topic: sess.topic,
        reason: `Studied for ${sess.durationMinutes} min in Focus Session`,
        repetitionStage: 1,
        intervalDays: 1,
        lastStudiedAt: new Date(safeStudiedMs).toISOString(),
        lastRevisedAt: null,
        nextReviewAt: new Date(nextReviewMs).toISOString(),
        status: nextReviewMs <= nowMs ? 'Due Now' : 'Scheduled',
      });
    }
  }

  // Update status based on current time
  const result = Array.from(byId.values()).map((item) => {
    const dueMs = new Date(item.nextReviewAt).getTime();
    const isDue = !isNaN(dueMs) && dueMs <= nowMs;
    const status: RevisionItem['status'] =
      item.repetitionStage >= 5 && !isDue
        ? 'Mastered'
        : isDue
        ? 'Due Now'
        : 'Scheduled';
    return {
      ...item,
      status,
    };
  });

  // Sort: Due Now first, then earliest nextReviewAt
  return result.sort((a, b) => {
    if (a.status === 'Due Now' && b.status !== 'Due Now') return -1;
    if (b.status === 'Due Now' && a.status !== 'Due Now') return 1;
    return (a.nextReviewAt || '').localeCompare(b.nextReviewAt || '');
  });
}

/**
 * Advances a revision item to the next spaced repetition interval when the user completes a revision.
 */
export function advanceRevisionItemStage(
  schedule: RevisionItem[],
  revisionId: string,
  nowMs = Date.now()
): RevisionItem[] {
  const nowIso = new Date(nowMs).toISOString();
  return schedule.map((item) => {
    if (item.id !== revisionId) return item;
    const nextStage = Math.min(5, (item.repetitionStage || 0) + 1);
    const intervalDays =
      SPACED_REPETITION_INTERVAL_DAYS[
        Math.min(nextStage - 1, SPACED_REPETITION_INTERVAL_DAYS.length - 1)
      ] || 7;
    const nextReviewAt = new Date(nowMs + intervalDays * 86400000).toISOString();
    return {
      ...item,
      repetitionStage: nextStage,
      intervalDays,
      lastRevisedAt: nowIso,
      nextReviewAt,
      status: nextStage >= 5 ? 'Mastered' : 'Scheduled',
    };
  });
}

