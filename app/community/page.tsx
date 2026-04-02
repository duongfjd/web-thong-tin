'use client';

import { useState } from 'react';
import Link from 'next/link';

interface Post {
  id: string;
  author: {
    id: string;
    name: string;
    avatar: string;
  };
  content: string;
  timestamp: string;
  likes: number;
  comments: number;
  liked?: boolean;
}

export default function CommunityPage() {
  const [posts] = useState<Post[]>([
    {
      id: '1',
      author: {
        id: 'user1',
        name: 'John Doe',
        avatar: 'JD',
      },
      content: 'Just launched my new project! So excited to see how the community responds. Check it out and let me know your thoughts! 🚀',
      timestamp: '2 hours ago',
      likes: 24,
      comments: 5,
      liked: false,
    },
    {
      id: '2',
      author: {
        id: 'user2',
        name: 'Jane Smith',
        avatar: 'JS',
      },
      content: 'Sharing some tips on improving your design skills. Read the full article on my blog!',
      timestamp: '4 hours ago',
      likes: 45,
      comments: 12,
      liked: false,
    },
  ]);

  const [liked, setLiked] = useState<Record<string, boolean>>({});

  return (
    <div className="space-y-6">
      {/* Create Post */}
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex gap-4">
          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold flex-shrink-0">
            U
          </div>
          <div className="flex-1">
            <textarea
              placeholder="What's on your mind?"
              className="w-full px-4 py-2 rounded-lg border border-input bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
              rows={3}
            />
            <div className="mt-4 flex justify-end">
              <button className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition">
                Post
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Posts Feed */}
      {posts.map((post) => (
        <div key={post.id} className="bg-card border border-border rounded-lg p-6 hover:border-primary/30 transition">
          <div className="flex gap-4 mb-4">
            <div className="w-12 h-12 rounded-full bg-secondary/20 flex items-center justify-center text-secondary font-semibold flex-shrink-0">
              {post.author.avatar}
            </div>
            <div className="flex-1">
              <Link
                href={`/profile/${post.author.id}`}
                className="font-semibold text-foreground hover:text-primary transition"
              >
                {post.author.name}
              </Link>
              <p className="text-xs text-muted-foreground">{post.timestamp}</p>
            </div>
          </div>

          <p className="text-foreground mb-6 leading-relaxed">{post.content}</p>

          <div className="flex items-center gap-4 text-sm text-muted-foreground border-t border-border pt-4">
            <button
              onClick={() => setLiked({ ...liked, [post.id]: !liked[post.id] })}
              className={`flex items-center gap-2 hover:text-primary transition ${
                liked[post.id] ? 'text-primary' : ''
              }`}
            >
              <span>❤️</span>
              <span>{post.likes + (liked[post.id] ? 1 : 0)}</span>
            </button>
            <Link
              href={`/community/${post.id}`}
              className="flex items-center gap-2 hover:text-primary transition"
            >
              <span>💬</span>
              <span>{post.comments}</span>
            </Link>
            <button className="flex items-center gap-2 hover:text-primary transition ml-auto">
              <span>⭐</span>
              <span>Share</span>
            </button>
          </div>
        </div>
      ))}

      {/* Load More */}
      <div className="text-center py-8">
        <button className="px-6 py-2 border border-border text-foreground rounded-lg hover:bg-muted transition">
          Load More Posts
        </button>
      </div>
    </div>
  );
}
