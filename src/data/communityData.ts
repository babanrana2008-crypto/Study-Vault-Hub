import { CommunityPost, CommunityReport } from '../types/community';

export const INITIAL_COMMUNITY_POSTS: CommunityPost[] = [
  {
    id: 'post_1',
    subject: 'Physics',
    title: 'Pure Rolling on Inclined Plane: Direction of friction force?',
    content:
      'Can someone clarify why friction acts upwards along the incline during pure rolling down an inclined plane? If gravity is pulling down, shouldn\'t friction oppose the motion? Also what happens when the body rolls up?',
    imageUrl: '',
    authorId: 'user_aarav',
    authorName: 'Aarav Sharma',
    authorAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80',
    authorRole: 'Student',
    createdAt: new Date(Date.now() - 3600000 * 3).toISOString(), // 3 hours ago
    likes: 14,
    likedBy: ['user_priya', 'user_neha'],
    replyCount: 2,
    isSolved: true,
    replies: [
      {
        id: 'reply_1_1',
        postId: 'post_1',
        authorId: 'user_soumyadip',
        authorName: 'Soumyadip Rana',
        authorAvatar: '',
        authorRole: 'Founder & Creator',
        content:
          'Great question! When a body rolls down an incline, the component of gravity mg*sin(θ) tries to accelerate the center of mass linearly downward. This linear acceleration would cause slipping at the contact point. To prevent slipping and provide angular acceleration (α = a/R), static friction MUST act UPWARD along the incline. This upward friction creates a clockwise torque about the center of mass, producing the necessary angular acceleration for pure rolling.',
        createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
        likes: 9,
        likedBy: ['user_aarav', 'user_priya']
      },
      {
        id: 'reply_1_2',
        postId: 'post_1',
        authorId: 'user_priya',
        authorName: 'Priya Patel',
        authorAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80',
        authorRole: 'Top Contributor',
        content:
          'To add to that: even when rolling UP the incline, friction STILL acts UPWARD along the incline! This is because gravity decelerates the center of mass, and friction provides torque to decelerate rotation at the exact same rate (a = Rα).',
        createdAt: new Date(Date.now() - 3600000 * 1).toISOString(),
        likes: 6,
        likedBy: ['user_aarav']
      }
    ]
  },
  {
    id: 'post_2',
    subject: 'Chemistry',
    title: 'Why is ortho-nitrophenol steam volatile while para-nitrophenol has higher boiling point?',
    content:
      'In Organic Chemistry class 12, NCERT states that o-nitrophenol is steam volatile and can be separated from p-nitrophenol by steam distillation. What is the fundamental intermolecular difference causing this?',
    imageUrl: '',
    authorId: 'user_rohit',
    authorName: 'Rohit Verma',
    authorAvatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=120&q=80',
    authorRole: 'Student',
    createdAt: new Date(Date.now() - 3600000 * 7).toISOString(),
    likes: 19,
    likedBy: ['user_ananya', 'user_soumyadip'],
    replyCount: 1,
    isSolved: true,
    replies: [
      {
        id: 'reply_2_1',
        postId: 'post_2',
        authorId: 'user_ananya',
        authorName: 'Dr. Ananya Sen',
        authorAvatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=120&q=80',
        authorRole: 'Top Contributor',
        content:
          'It is entirely due to the type of Hydrogen Bonding!\n1. Ortho-nitrophenol exhibits INTRAmolecular H-bonding between the phenolic -OH group and the adjacent -NO2 oxygen. This forms a stable 6-membered chelate ring, preventing molecules from associating with each other. Hence it has low boiling point and high steam volatility.\n2. Para-nitrophenol cannot form intramolecular bonds due to steric distance; it forms strong INTERmolecular H-bonds with neighboring molecules, resulting in higher association, much higher boiling point, and no steam volatility.',
        createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
        likes: 15,
        likedBy: ['user_rohit', 'user_aarav']
      }
    ]
  },
  {
    id: 'post_3',
    subject: 'Biology',
    title: 'Dihybrid Cross Test Cross Ratio vs Incomplete Dominance ratio',
    content:
      'Quick doubt for NEET 2026: What are the exact phenotypic and genotypic ratios in Incomplete Dominance (Mirabilis jalapa) in F2 generation? Do they match?',
    imageUrl: '',
    authorId: 'user_sneha',
    authorName: 'Sneha Mukherjee',
    authorAvatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=120&q=80',
    authorRole: 'Student',
    createdAt: new Date(Date.now() - 3600000 * 18).toISOString(),
    likes: 8,
    likedBy: ['user_sneha'],
    replyCount: 1,
    isSolved: false,
    replies: [
      {
        id: 'reply_3_1',
        postId: 'post_3',
        authorId: 'user_soumyadip',
        authorName: 'Soumyadip Rana',
        authorAvatar: '',
        authorRole: 'Founder & Creator',
        content:
          'Yes, they are uniquely identical! In Incomplete Dominance (e.g., 4 O\'clock plant Mirabilis jalapa / Snapdragon Antirrhinum):\n- Phenotypic ratio = 1 Red : 2 Pink : 1 White (1:2:1)\n- Genotypic ratio = 1 RR : 2 Rr : 1 rr (1:2:1)\nThis is a classic NEET question because in standard Mendelian monohybrid crosses, phenotypic ratio is 3:1 while genotypic is 1:2:1.',
        createdAt: new Date(Date.now() - 3600000 * 16).toISOString(),
        likes: 11,
        likedBy: ['user_sneha', 'user_rohit']
      }
    ]
  },
  {
    id: 'post_4',
    subject: 'Mathematics',
    title: 'Definite Integral with King\'s Property shortcut?',
    content:
      'When integrating ∫[0 to π/2] (sin^n x / (sin^n x + cos^n x)) dx, is the answer always π/4 regardless of n? Does this also apply when n is fractional or negative?',
    imageUrl: '',
    authorId: 'user_vikram',
    authorName: 'Vikram Joshi',
    authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80',
    authorRole: 'Student',
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    likes: 22,
    likedBy: ['user_vikram', 'user_aarav'],
    replyCount: 1,
    isSolved: true,
    replies: [
      {
        id: 'reply_4_1',
        postId: 'post_4',
        authorId: 'user_soumyadip',
        authorName: 'Soumyadip Rana',
        authorAvatar: '',
        authorRole: 'Founder & Creator',
        content:
          'Yes! By applying King\'s Property: ∫[a to b] f(x)dx = ∫[a to b] f(a + b - x)dx.\nHere, f(π/2 - x) transforms sin^n x into cos^n x. Adding I + I gives 2I = ∫[0 to π/2] 1 dx = π/2 => I = π/4.\nThis holds for ANY real number n (positive, negative, zero, fractional, or transcendental), as long as the denominator does not vanish on the interval [0, π/2]!',
        createdAt: new Date(Date.now() - 3600000 * 22).toISOString(),
        likes: 18,
        likedBy: ['user_vikram']
      }
    ]
  }
];

const COMMUNITY_STORAGE_KEY = 'study_vault_community_posts_v1';
const REPORTS_STORAGE_KEY = 'study_vault_community_reports_v1';
const RESTRICTED_STORAGE_KEY = 'study_vault_restricted_users_v1';

// Cross-tab broadcast channel for real-time synchronization
let broadcastChannel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    broadcastChannel = new BroadcastChannel('study_vault_community_sync');
  }
} catch {
  // Graceful fallback
}

export function loadCommunityPosts(): CommunityPost[] {
  try {
    const raw = localStorage.getItem(COMMUNITY_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error loading community posts:', err);
  }
  // Default seed
  saveCommunityPosts(INITIAL_COMMUNITY_POSTS, false);
  return INITIAL_COMMUNITY_POSTS;
}

export function saveCommunityPosts(posts: CommunityPost[], broadcast = true): void {
  try {
    localStorage.setItem(COMMUNITY_STORAGE_KEY, JSON.stringify(posts));
    if (broadcast && broadcastChannel) {
      broadcastChannel.postMessage({ type: 'POSTS_UPDATED', timestamp: Date.now() });
    }
  } catch (err) {
    console.error('Error saving community posts:', err);
  }
}

export function loadCommunityReports(): CommunityReport[] {
  try {
    const raw = localStorage.getItem(REPORTS_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Error loading reports:', err);
  }
  return [];
}

export function saveCommunityReport(report: CommunityReport): void {
  try {
    const current = loadCommunityReports();
    current.unshift(report);
    localStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(current));
  } catch (err) {
    console.error('Error saving report:', err);
  }
}

export function deleteCommunityReport(reportId: string): void {
  try {
    const current = loadCommunityReports().filter((r) => r.id !== reportId);
    localStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(current));
  } catch (err) {
    console.error('Error deleting report:', err);
  }
}

export function getRestrictedUsers(): string[] {
  try {
    const raw = localStorage.getItem(RESTRICTED_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // fallback
  }
  return [];
}

export function toggleUserRestriction(userId: string): boolean {
  try {
    const list = getRestrictedUsers();
    let updated: string[];
    let isNowRestricted = false;
    if (list.includes(userId)) {
      updated = list.filter((id) => id !== userId);
    } else {
      updated = [...list, userId];
      isNowRestricted = true;
    }
    localStorage.setItem(RESTRICTED_STORAGE_KEY, JSON.stringify(updated));
    return isNowRestricted;
  } catch {
    return false;
  }
}

export function subscribeToCommunityUpdates(callback: () => void): () => void {
  const handleStorage = (e: StorageEvent) => {
    if (e.key === COMMUNITY_STORAGE_KEY) {
      callback();
    }
  };

  const handleBroadcast = (e: MessageEvent) => {
    if (e.data?.type === 'POSTS_UPDATED') {
      callback();
    }
  };

  window.addEventListener('storage', handleStorage);
  if (broadcastChannel) {
    broadcastChannel.addEventListener('message', handleBroadcast);
  }

  return () => {
    window.removeEventListener('storage', handleStorage);
    if (broadcastChannel) {
      broadcastChannel.removeEventListener('message', handleBroadcast);
    }
  };
}
