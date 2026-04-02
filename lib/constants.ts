// App constants
export const APP_NAME = 'Community Platform';
export const APP_DESCRIPTION = 'Connect, share, and grow together in our modern social community platform';
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// Pagination
export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 100;

// File upload
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

// Post limits
export const MAX_POST_LENGTH = 5000;
export const MIN_POST_LENGTH = 1;
export const MAX_COMMENT_LENGTH = 1000;
export const MIN_COMMENT_LENGTH = 1;

// User limits
export const MAX_BIO_LENGTH = 500;
export const MAX_DISPLAY_NAME_LENGTH = 255;

// Time constants
export const DEBOUNCE_DELAY = 300; // ms
export const POLLING_INTERVAL = 5000; // ms
export const SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours

// Error messages
export const ERROR_MESSAGES = {
  UNAUTHORIZED: 'Please sign in to continue',
  FORBIDDEN: 'You do not have permission to perform this action',
  NOT_FOUND: 'The requested resource was not found',
  SERVER_ERROR: 'An error occurred. Please try again later',
  NETWORK_ERROR: 'Network error. Please check your connection',
} as const;

// Success messages
export const SUCCESS_MESSAGES = {
  POST_CREATED: 'Post created successfully',
  POST_UPDATED: 'Post updated successfully',
  POST_DELETED: 'Post deleted successfully',
  PROFILE_UPDATED: 'Profile updated successfully',
  FOLLOWED: 'User followed successfully',
  UNFOLLOWED: 'User unfollowed successfully',
} as const;

// Notification types
export const NOTIFICATION_TYPES = {
  LIKE: 'like',
  COMMENT: 'comment',
  FOLLOW: 'follow',
  MESSAGE: 'message',
  MENTION: 'mention',
} as const;

// User roles
export const USER_ROLES = {
  USER: 'user',
  MODERATOR: 'moderator',
  ADMIN: 'admin',
} as const;

// Post visibility
export const POST_VISIBILITY = {
  PUBLIC: 'public',
  FRIENDS: 'friends',
  PRIVATE: 'private',
} as const;

// Report status
export const REPORT_STATUS = {
  PENDING: 'pending',
  REVIEWED: 'reviewed',
  RESOLVED: 'resolved',
} as const;
