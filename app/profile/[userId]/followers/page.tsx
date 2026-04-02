'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function FollowersPage() {
  const params = useParams();
  const userId = params.userId as string;
  const [followers, setFollowers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFollowers = async () => {
      try {
        const { data, error } = await supabase
          .from('follows')
          .select('follower:users(id, display_name, avatar_url)')
          .eq('following_id', userId);

        if (error) throw error;
        setFollowers(data?.map((f: any) => f.follower) || []);
      } finally {
        setLoading(false);
      }
    };

    fetchFollowers();
  }, [userId]);

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Loading followers...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Link href={`/profile/${userId}`} className="text-sm text-muted-foreground hover:text-foreground mb-6">
        ← Back to Profile
      </Link>

      <h1 className="text-3xl font-bold text-foreground mb-8">Followers</h1>

      <div className="space-y-2">
        {followers.length === 0 ? (
          <p className="text-center py-12 text-muted-foreground">No followers yet</p>
        ) : (
          followers.map((follower) => (
            <Link key={follower.id} href={`/profile/${follower.id}`}>
              <div className="bg-card border border-border rounded-lg p-4 hover:border-primary/30 transition cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold flex-shrink-0">
                    {follower.display_name?.charAt(0).toUpperCase()}
                  </div>
                  <h3 className="font-semibold text-foreground">{follower.display_name}</h3>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
