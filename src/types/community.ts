export interface CommunityReply {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  authorRole?: 'Founder & Creator' | 'Admin' | 'Top Contributor' | 'Student';
  content: string;
  createdAt: string;
  likes: number;
  likedBy: string[];
}

export interface CommunityPost {
  id: string;
  subject: string; // 'Physics' | 'Chemistry' | 'Biology' | 'Mathematics' | 'General'
  title: string;
  content: string;
  imageUrl?: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  authorRole?: 'Founder & Creator' | 'Admin' | 'Top Contributor' | 'Student';
  createdAt: string;
  likes: number;
  likedBy: string[];
  replyCount: number;
  replies: CommunityReply[];
  isSolved?: boolean;
}

export interface CommunityReport {
  id: string;
  targetType: 'post' | 'comment';
  targetId: string;
  targetSnippet: string;
  reason: string;
  reportedBy: string;
  reportedAt: string;
}
