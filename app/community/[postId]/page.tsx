'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import type { Post, Comment } from '@/types';

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const postId = params.postId as string;

  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const { data: postData, error: postError } = await supabase
          .from('posts')
          .select('*, author:users(id, display_name, avatar_url)')
          .eq('id', postId)
          .single();

        if (postError) throw postError;
        setPost(postData);

        // Fetch comments
        const { data: commentsData, error: commentsError } = await supabase
          .from('comments')
          .select('*, author:users(id, display_name)')
          .eq('post_id', postId)
          .order('created_at', { ascending: false });

        if (commentsError) throw commentsError;
        setComments(commentsData || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [postId]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      const { user } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/login');
        return;
      }

      const { data: comment, error } = await supabase
        .from('comments')
        .insert({
          post_id: postId,
          author_id: user.id,
          content: newComment,
        })
        .select()
        .single();

      if (error) throw error;

      setComments([comment, ...comments]);
      setNewComment('');

      // Update post comment count
      if (post) {
        setPost({ ...post, commentsCount: post.comments_count + 1 });
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Loading post...</p>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Post not found</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Post */}
      <div className="bg-card border border-border rounded-lg p-6 mb-8">
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
            <p className="text-xs text-muted-foreground">
              {new Date(post.created_at).toLocaleDateString()}
            </p>
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
                className="rounded-lg w-full h-48 object-cover"
              />
            ))}
          </div>
        )}

        <div className="flex items-center gap-4 text-sm text-muted-foreground border-t border-border pt-4">
          <span>❤️ {post.likes_count} likes</span>
          <span>💬 {post.comments_count} comments</span>
          <span>⭐ {post.shares_count} shares</span>
        </div>
      </div>

      {/* Add Comment */}
      <form onSubmit={handleAddComment} className="bg-card border border-border rounded-lg p-6 mb-8">
        <h3 className="font-semibold text-foreground mb-4">Add a Comment</h3>
        <div className="flex gap-4">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold flex-shrink-0">
            U
          </div>
          <div className="flex-1">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="What do you think?"
              className="w-full px-4 py-2 rounded-lg border border-input bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
              rows={3}
            />
            <div className="mt-3 flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition disabled:opacity-50"
                disabled={!newComment.trim()}
              >
                Comment
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Comments */}
      <div className="space-y-4">
        <h3 className="font-semibold text-foreground">Comments</h3>
        {comments.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No comments yet</p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="bg-card border border-border rounded-lg p-4">
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center text-secondary font-semibold flex-shrink-0">
                  {comment.author?.display_name?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <Link
                    href={`/profile/${comment.author?.id}`}
                    className="font-semibold text-foreground hover:text-primary transition"
                  >
                    {comment.author?.display_name}
                  </Link>
                  <p className="text-foreground text-sm mt-1">{comment.content}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {new Date(comment.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
