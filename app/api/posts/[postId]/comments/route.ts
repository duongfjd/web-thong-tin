import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { CreateCommentSchema } from '@/lib/validators';

export async function GET(
  request: NextRequest,
  { params }: { params: { postId: string } }
) {
  try {
    const { data: comments, error } = await supabase
      .from('comments')
      .select('*, author:users(id, display_name, email)')
      .eq('post_id', params.postId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: comments || [],
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { postId: string } }
) {
  try {
    const body = await request.json();
    const { user } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const validatedData = CreateCommentSchema.parse(body);

    const { data: comment, error } = await supabase
      .from('comments')
      .insert({
        post_id: params.postId,
        author_id: user.id,
        ...validatedData,
      })
      .select('*, author:users(id, display_name)')
      .single();

    if (error) throw error;

    // Update post comment count
    await supabase
      .from('posts')
      .update({ comments_count: supabase.raw('comments_count + 1') })
      .eq('id', params.postId);

    // Create notification
    const { data: post } = await supabase
      .from('posts')
      .select('author_id')
      .eq('id', params.postId)
      .single();

    if (post && post.author_id !== user.id) {
      await supabase.from('notifications').insert({
        user_id: post.author_id,
        type: 'comment',
        related_post_id: params.postId,
        related_user_id: user.id,
      });
    }

    return NextResponse.json({
      success: true,
      data: comment,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.status || 500 }
    );
  }
}
