'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function FollowingPage() {
  const params = useParams();
  const userId = params.userId as string;
  const [following, setFollowing] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFollowing = async () => {
      try {
        const { data, error } = await supabase
          .from('follows')
          .select('following:users(id, display_name, avatar_url)')
          .eq('follower_id', userId);

        if (error) throw error;
        setFollowing(data?.map((f: any) => f.following) || []);
      } finally {
        setLoading(false);
      }
    };

    fetchFollowing();
  }, [userId]);

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Loading following...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Link href={`/profile/${userId}`} className="text-sm text-muted-foreground hover:text-foreground mb-6">
        ← Back to Profile
      </Link>

      <h1 className="text-3xl font-bold text-foreground mb-8">Following</h1>

      <div className="space-y-2">
        {following.length === 0 ? (
          <p className="text-center py-12 text-muted-foreground">Not following anyone yet</p>
        ) : (
          following.map((user) => (
            <Link key={user.id} href={`/profile/${user.id}`}>
              <div className="bg-card border border-border rounded-lg p-4 hover:border-primary/30 transition cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold flex-shrink-0">
                    {user.display_name?.charAt(0).toUpperCase()}
                  </div>
                  <h3 className="font-semibold text-foreground">{user.display_name}</h3>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
