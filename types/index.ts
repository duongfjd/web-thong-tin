export type User = {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  location?: string;
  website?: string;
  followersCount: number;
  followingCount: number;
  role: 'user' | 'moderator' | 'admin';
  createdAt: string;
  updatedAt: string;
};

export type Post = {
  id: string;
  authorId: string;
  author?: User;
  content: string;
  imageUrls?: string[];
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  visibility: 'public' | 'friends' | 'private';
  createdAt: string;
  updatedAt: string;
};

export type Comment = {
  id: string;
  postId: string;
  authorId: string;
  author?: User;
  content: string;
  likesCount: number;
  createdAt: string;
  updatedAt: string;
};

export type Like = {
  id: string;
  userId: string;
  postId?: string;
  commentId?: string;
  createdAt: string;
};

export type Follow = {
  id: string;
  followerId: string;
  followingId: string;
  createdAt: string;
};

export type Notification = {
  id: string;
  userId: string;
  type: 'like' | 'comment' | 'follow' | 'message' | 'mention';
  relatedPostId?: string;
  relatedUserId?: string;
  isRead: boolean;
  createdAt: string;
};

export type Message = {
  id: string;
  senderId: string;
  recipientId: string;
  content: string;
  isRead: boolean;
  createdAt: string;
};

export type Payment = {
  id: string;
  userId: string;
  amount: number;
  status: 'paid' | 'pending' | 'failed';
  stripeSessionId?: string;
  createdAt: string;
};

export type Report = {
  id: string;
  reporterUserId: string;
  reportType: 'user' | 'post' | 'comment';
  relatedUserId?: string;
  relatedPostId?: string;
  reason: string;
  status: 'pending' | 'reviewed' | 'resolved';
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
};
