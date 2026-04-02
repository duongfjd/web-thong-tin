'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface PostFormProps {
  onPostCreated?: () => void;
}

export function PostForm({ onPostCreated }: PostFormProps) {
  const router = useRouter();
  const [content, setContent] = useState('');
  const [visibility, setVisibility] = useState('public');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const { user } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/login');
        return;
      }

      const { error: insertError } = await supabase
        .from('posts')
        .insert({
          author_id: user.id,
          content,
          visibility,
        });

      if (insertError) throw insertError;

      setContent('');
      setVisibility('public');
      onPostCreated?.();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What's on your mind?"
          className="w-full px-4 py-2 rounded-lg border border-input bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
          rows={4}
        />

        <div className="flex items-center justify-between">
          <select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value)}
            className="px-4 py-2 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
          >
            <option value="public">Public</option>
            <option value="friends">Friends Only</option>
            <option value="private">Private</option>
          </select>

          <button
            type="submit"
            disabled={loading || !content.trim()}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading ? 'Posting...' : 'Post'}
          </button>
        </div>

        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm">
            {error}
          </div>
        )}
      </form>
    </div>
  );
}
