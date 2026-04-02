import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { SendMessageSchema } from '@/lib/validators';

export async function GET(
  request: NextRequest,
  { params }: { params: { conversationId: string } }
) {
  try {
    const { user } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .or(
        `and(sender_id.eq.${user.id},recipient_id.eq.${params.conversationId}),and(sender_id.eq.${params.conversationId},recipient_id.eq.${user.id})`
      )
      .order('created_at', { ascending: true });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: messages || [],
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
  { params }: { params: { conversationId: string } }
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

    const validatedData = SendMessageSchema.parse(body);

    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        sender_id: user.id,
        recipient_id: params.conversationId,
        ...validatedData,
      })
      .select()
      .single();

    if (error) throw error;

    // Create notification
    await supabase.from('notifications').insert({
      user_id: params.conversationId,
      type: 'message',
      related_user_id: user.id,
    });

    return NextResponse.json({
      success: true,
      data: message,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.status || 500 }
    );
  }
}
