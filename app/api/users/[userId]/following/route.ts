import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { data: following, error } = await supabase
      .from('follows')
      .select('following:users(id, display_name, avatar_url)')
      .eq('follower_id', params.userId);

    if (error) throw error;

    const followingList = following?.map((f: any) => f.following) || [];

    return NextResponse.json({
      success: true,
      data: followingList,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
