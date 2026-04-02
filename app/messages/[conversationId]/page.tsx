'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import type { Message } from '@/types';

export default function ConversationPage() {
  const params = useParams();
  const conversationId = params.conversationId as string;

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [otherUser, setOtherUser] = useState<any>(null);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .or(
            `and(sender_id.eq.${conversationId},recipient_id.eq.${conversationId}),and(sender_id.eq.${conversationId},recipient_id.eq.${conversationId})`
          )
          .order('created_at', { ascending: true });

        if (error) throw error;
        setMessages(data || []);

        // Fetch other user info
        const { data: userData } = await supabase
          .from('users')
          .select('*')
          .eq('id', conversationId)
          .single();

        setOtherUser(userData);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, [conversationId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      const { user } = await supabase.auth.getUser();
      if (!user) return;

      const { data: message, error } = await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          recipient_id: conversationId,
          content: newMessage,
        })
        .select()
        .single();

      if (error) throw error;

      setMessages([...messages, message]);
      setNewMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Loading conversation...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto h-screen flex flex-col">
      {/* Header */}
      <div className="bg-card border-b border-border p-4 flex items-center justify-between">
        <Link
          href={`/profile/${otherUser?.id}`}
          className="font-semibold text-foreground hover:text-primary transition"
        >
          {otherUser?.display_name}
        </Link>
        <Link
          href="/messages"
          className="text-sm text-muted-foreground hover:text-foreground transition"
        >
          Back
        </Link>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${
              msg.sender_id === conversationId ? 'justify-start' : 'justify-end'
            }`}
          >
            <div
              className={`max-w-xs px-4 py-2 rounded-lg ${
                msg.sender_id === conversationId
                  ? 'bg-muted text-foreground'
                  : 'bg-primary text-primary-foreground'
              }`}
            >
              <p className="break-words">{msg.content}</p>
              <p className="text-xs opacity-70 mt-1">
                {new Date(msg.created_at).toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <form
        onSubmit={handleSendMessage}
        className="bg-card border-t border-border p-4 flex gap-2"
      >
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 px-4 py-2 rounded-lg border border-input bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        />
        <button
          type="submit"
          disabled={!newMessage.trim()}
          className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 transition"
        >
          Send
        </button>
      </form>
    </div>
  );
}
