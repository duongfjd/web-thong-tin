import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { user } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get unique conversations
    const { data: conversations, error } = await supabase
      .from('messages')
      .select('sender_id, recipient_id, content, created_at')
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    // Group by conversation partner
    const uniqueConversations = new Map();
    conversations?.forEach((msg: any) => {
      const partnerId = msg.sender_id === user.id ? msg.recipient_id : msg.sender_id;
      if (!uniqueConversations.has(partnerId)) {
        uniqueConversations.set(partnerId, msg);
      }
    });

    return NextResponse.json({
      success: true,
      data: Array.from(uniqueConversations.values()),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
