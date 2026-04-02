import { z } from 'zod';

// Auth Schemas
export const SignUpSchema = z.object({
  displayName: z.string().min(2, 'Display name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// Post Schemas
export const CreatePostSchema = z.object({
  content: z.string().min(1, 'Post content cannot be empty').max(5000, 'Post is too long'),
  imageUrls: z.array(z.string().url()).optional(),
  visibility: z.enum(['public', 'friends', 'private']).default('public'),
});

export const UpdatePostSchema = CreatePostSchema.partial();

// Comment Schemas
export const CreateCommentSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty').max(1000, 'Comment is too long'),
});

// User Profile Schemas
export const UpdateProfileSchema = z.object({
  displayName: z.string().min(2).max(255).optional(),
  bio: z.string().max(500).optional(),
  location: z.string().max(255).optional(),
  website: z.string().url().optional().or(z.literal('')),
  avatarUrl: z.string().url().optional(),
});

// Message Schemas
export const SendMessageSchema = z.object({
  content: z.string().min(1, 'Message cannot be empty').max(1000),
});

// Report Schemas
export const CreateReportSchema = z.object({
  reportType: z.enum(['user', 'post', 'comment']),
  relatedUserId: z.string().uuid().optional(),
  relatedPostId: z.string().uuid().optional(),
  reason: z.string().min(10, 'Please provide a detailed reason').max(1000),
});

export type SignUpInput = z.infer<typeof SignUpSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type CreatePostInput = z.infer<typeof CreatePostSchema>;
export type UpdatePostInput = z.infer<typeof UpdatePostSchema>;
export type CreateCommentInput = z.infer<typeof CreateCommentSchema>;
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;
export type SendMessageInput = z.infer<typeof SendMessageSchema>;
export type CreateReportInput = z.infer<typeof CreateReportSchema>;
