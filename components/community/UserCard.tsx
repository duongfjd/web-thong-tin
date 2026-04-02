'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { User } from '@/types';

interface UserCardProps {
  user: User;
  onFollow?: (userId: string) => void;
}

export function UserCard({ user, onFollow }: UserCardProps) {
  const [isFollowing, setIsFollowing] = useState(false);

  const handleFollow = () => {
    setIsFollowing(!isFollowing);
    onFollow?.(user.id);
  };

  return (
    <Link href={`/profile/${user.id}`}>
      <div className="bg-card border border-border rounded-lg p-6 hover:border-primary/30 transition cursor-pointer">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold">
            {user.displayName?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground">{user.displayName}</h3>
            <p className="text-xs text-muted-foreground">{user.followers_count} followers</p>
          </div>
        </div>

        {user.bio && <p className="text-sm text-foreground mb-4">{user.bio}</p>}

        <button
          onClick={(e) => {
            e.preventDefault();
            handleFollow();
          }}
          className={`w-full py-2 rounded-lg font-medium transition ${
            isFollowing
              ? 'bg-muted text-foreground hover:bg-muted/80'
              : 'bg-primary text-primary-foreground hover:bg-primary/90'
          }`}
        >
          {isFollowing ? 'Following' : 'Follow'}
        </button>
      </div>
    </Link>
  );
}
