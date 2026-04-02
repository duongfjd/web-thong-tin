import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const type = searchParams.get('type') || 'all';

    if (!query || query.length < 2) {
      return NextResponse.json({
        success: false,
        error: 'Search query must be at least 2 characters',
      }, { status: 400 });
    }

    const results: any = {};

    // Search posts
    if (type === 'all' || type === 'posts') {
      const { data: posts } = await supabase
        .from('posts')
        .select('*, author:users(id, display_name)')
        .eq('visibility', 'public')
        .ilike('content', `%${query}%`)
        .limit(10);

      results.posts = posts || [];
    }

    // Search users
    if (type === 'all' || type === 'users') {
      const { data: users } = await supabase
        .from('users')
        .select('id, display_name, email')
        .ilike('display_name', `%${query}%`)
        .limit(10);

      results.users = users || [];
    }

    return NextResponse.json({
      success: true,
      data: results,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
