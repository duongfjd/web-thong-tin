'use client';

import Link from 'next/link';
import { useState } from 'react';

interface UserProfile {
  id: string;
  name: string;
  username: string;
  bio: string;
  avatar: string;
  followers: number;
  following: number;
  posts: number;
  website?: string;
  location?: string;
  joinedDate: string;
}

export default function ProfilePage({ params }: { params: { userId: string } }) {
  const [profile] = useState<UserProfile>({
    id: params.userId,
    name: 'John Doe',
    username: '@johndoe',
    bio: 'Passionate about technology, design, and building things',
    avatar: 'JD',
    followers: 1234,
    following: 567,
    posts: 89,
    website: 'https://johndoe.com',
    location: 'San Francisco, CA',
    joinedDate: 'January 2023',
  });

  const [isFollowing, setIsFollowing] = useState(false);

  return (
    <div className="max-w-2xl mx-auto">
      {/* Cover Photo */}
      <div className="h-32 bg-gradient-to-r from-primary to-secondary rounded-lg mb-8" />

      {/* Profile Info */}
      <div className="bg-card border border-border rounded-lg p-6 -mt-16 relative mb-8">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-end gap-4">
            <div className="w-32 h-32 rounded-full bg-primary/20 flex items-center justify-center text-4xl font-bold text-primary border-4 border-card">
              {profile.avatar}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{profile.name}</h1>
              <p className="text-muted-foreground">{profile.username}</p>
            </div>
          </div>
          <button
            onClick={() => setIsFollowing(!isFollowing)}
            className={`px-6 py-2 rounded-full font-semibold transition ${
              isFollowing
                ? 'bg-muted text-foreground hover:bg-muted/80'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            }`}
          >
            {isFollowing ? 'Following' : 'Follow'}
          </button>
        </div>

        <p className="text-foreground mb-4">{profile.bio}</p>

        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-6">
          {profile.location && (
            <div>📍 {profile.location}</div>
          )}
          {profile.website && (
            <Link href={profile.website} className="text-primary hover:underline">
              🔗 {profile.website}
            </Link>
          )}
          <div>📅 Joined {profile.joinedDate}</div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 pt-6 border-t border-border">
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground">{profile.posts}</div>
            <div className="text-xs text-muted-foreground">Posts</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground">{profile.following}</div>
            <div className="text-xs text-muted-foreground">Following</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground">{profile.followers}</div>
            <div className="text-xs text-muted-foreground">Followers</div>
          </div>
        </div>
      </div>

      {/* Posts */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-foreground">Recent Posts</h2>
        <div className="text-center py-12 bg-card border border-border rounded-lg">
          <p className="text-muted-foreground">No posts yet</p>
        </div>
      </div>
    </div>
  );
}
