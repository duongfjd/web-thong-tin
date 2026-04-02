import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if post exists
    const { data: post } = await supabase
      .from('posts')
      .select('author_id')
      .eq('id', params.id)
      .single();

    if (!post) {
      return NextResponse.json(
        { success: false, error: 'Post not found' },
        { status: 404 }
      );
    }

    // Create like
    const { error } = await supabase
      .from('likes')
      .insert({
        user_id: user.id,
        post_id: params.id,
      });

    if (error) throw error;

    // Increment likes count
    await supabase
      .from('posts')
      .update({ likes_count: supabase.raw('likes_count + 1') })
      .eq('id', params.id);

    // Create notification if not self-like
    if (post.author_id !== user.id) {
      await supabase.from('notifications').insert({
        user_id: post.author_id,
        type: 'like',
        related_post_id: params.id,
        related_user_id: user.id,
      });
    }

    return NextResponse.json({
      success: true,
      data: { liked: true },
    });
  } catch (error: any) {
    if (error.code === '23505') {
      // Already liked
      return NextResponse.json(
        { success: false, error: 'Already liked this post' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.status || 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Delete like
    const { error } = await supabase
      .from('likes')
      .delete()
      .eq('user_id', user.id)
      .eq('post_id', params.id);

    if (error) throw error;

    // Decrement likes count
    await supabase
      .from('posts')
      .update({ likes_count: supabase.raw('GREATEST(0, likes_count - 1)') })
      .eq('id', params.id);

    return NextResponse.json({
      success: true,
      data: { liked: false },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.status || 500 }
    );
  }
}
