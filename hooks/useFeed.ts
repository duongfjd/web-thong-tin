'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Post } from '@/types';

interface UseFeedOptions {
  limit?: number;
  page?: number;
  userId?: string;
}

export function useFeed(options: UseFeedOptions = {}) {
  const { limit = 10, page = 1, userId } = options;
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('posts')
        .select('*, author:users(id, display_name, avatar_url)')
        .eq('visibility', 'public')
        .order('created_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

      if (userId) {
        query = query.eq('author_id', userId);
      }

      const { data, error: queryError } = await query;

      if (queryError) throw queryError;

      setPosts(data || []);
      setHasMore((data?.length || 0) === limit);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [limit, page, userId]);

  useEffect(() => {
    fetchPosts();

    // Subscribe to real-time updates
    const subscription = supabase
      .from('posts')
      .on('*', (payload) => {
        if (payload.eventType === 'INSERT') {
          setPosts((prev) => [payload.new as Post, ...prev]);
        } else if (payload.eventType === 'DELETE') {
          setPosts((prev) => prev.filter((p) => p.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchPosts]);

  return { posts, loading, error, hasMore, refetch: fetchPosts };
}
