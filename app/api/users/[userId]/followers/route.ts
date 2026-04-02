import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { data: followers, error } = await supabase
      .from('follows')
      .select('follower:users(id, display_name, avatar_url)')
      .eq('following_id', params.userId);

    if (error) throw error;

    const followersList = followers?.map((f: any) => f.follower) || [];

    return NextResponse.json({
      success: true,
      data: followersList,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
