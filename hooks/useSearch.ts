'use client';

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface SearchResults {
  posts: any[];
  users: any[];
}

export function useSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults>({ posts: [], users: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (searchQuery: string) => {
    if (!searchQuery || searchQuery.length < 2) {
      setResults({ posts: [], users: [] });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [postsResult, usersResult] = await Promise.all([
        supabase
          .from('posts')
          .select('*, author:users(id, display_name)')
          .ilike('content', `%${searchQuery}%`)
          .limit(10),
        supabase
          .from('users')
          .select('id, display_name, email, avatar_url')
          .ilike('display_name', `%${searchQuery}%`)
          .limit(10),
      ]);

      if (postsResult.error) throw postsResult.error;
      if (usersResult.error) throw usersResult.error;

      setResults({
        posts: postsResult.data || [],
        users: usersResult.data || [],
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const debounce = useCallback((callback: Function, delay: number) => {
    let timeoutId: NodeJS.Timeout;
    return (args: any) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => callback(args), delay);
    };
  }, []);

  useEffect(() => {
    const debouncedSearch = debounce(search, 300);
    debouncedSearch(query);
  }, [query, search, debounce]);

  return { query, setQuery, results, loading, error };
}
