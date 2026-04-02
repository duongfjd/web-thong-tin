'use client';

import Link from 'next/link';
import { useState } from 'react';
import { formatDate } from '@/lib/utils';
import type { Post } from '@/types';

interface PostCardProps {
  post: Post;
  onLike?: (postId: string) => void;
  onDelete?: (postId: string) => void;
}

export function PostCard({ post, onLike, onDelete }: PostCardProps) {
  const [isLiked, setIsLiked] = useState(false);

  const handleLike = () => {
    setIsLiked(!isLiked);
    onLike?.(post.id);
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6 hover:border-primary/30 transition">
      <div className="flex gap-4 mb-4">
        <div className="w-12 h-12 rounded-full bg-secondary/20 flex items-center justify-center text-secondary font-semibold flex-shrink-0">
          {post.author?.display_name?.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1">
          <Link
            href={`/profile/${post.author?.id}`}
            className="font-semibold text-foreground hover:text-primary transition"
          >
            {post.author?.display_name}
          </Link>
          <p className="text-xs text-muted-foreground">{formatDate(post.created_at)}</p>
        </div>
      </div>

      <p className="text-foreground mb-6 leading-relaxed">{post.content}</p>

      {post.image_urls && post.image_urls.length > 0 && (
        <div className="grid grid-cols-2 gap-2 mb-6">
          {post.image_urls.map((url, i) => (
            <img
              key={i}
              src={url}
              alt="Post image"
              className="rounded-lg w-full h-40 object-cover"
            />
          ))}
        </div>
      )}

      <div className="flex items-center gap-4 text-sm text-muted-foreground border-t border-border pt-4">
        <button
          onClick={handleLike}
          className={`flex items-center gap-2 hover:text-primary transition ${
            isLiked ? 'text-primary' : ''
          }`}
        >
          <span>❤️</span>
          <span>{post.likes_count + (isLiked ? 1 : 0)}</span>
        </button>
        <Link
          href={`/community/${post.id}`}
          className="flex items-center gap-2 hover:text-primary transition"
        >
          <span>💬</span>
          <span>{post.comments_count}</span>
        </Link>
        <button className="flex items-center gap-2 hover:text-primary transition ml-auto">
          <span>⭐</span>
          <span>Share</span>
        </button>
      </div>
    </div>
  );
}
