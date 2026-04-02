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

    if (user.id === params.id) {
      return NextResponse.json(
        { success: false, error: 'Cannot follow yourself' },
        { status: 400 }
      );
    }

    // Create follow relationship
    const { error } = await supabase
      .from('follows')
      .insert({
        follower_id: user.id,
        following_id: params.id,
      });

    if (error) throw error;

    // Create notification
    await supabase.from('notifications').insert({
      user_id: params.id,
      type: 'follow',
      related_user_id: user.id,
    });

    // Update follower count
    await supabase.rpc('increment_followers', {
      user_id: params.id,
    });

    return NextResponse.json({
      success: true,
      data: { following: true },
    });
  } catch (error: any) {
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

    // Delete follow relationship
    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', user.id)
      .eq('following_id', params.id);

    if (error) throw error;

    // Update follower count
    await supabase.rpc('decrement_followers', {
      user_id: params.id,
    });

    return NextResponse.json({
      success: true,
      data: { following: false },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.status || 500 }
    );
  }
}
