'use client';

import Link from 'next/link';
import { useState } from 'react';

interface Conversation {
  id: string;
  user: string;
  lastMessage: string;
  timestamp: string;
  unread: boolean;
}

export default function MessagesPage() {
  const [conversations] = useState<Conversation[]>([
    {
      id: '1',
      user: 'John Doe',
      lastMessage: 'See you tomorrow!',
      timestamp: '2:30 PM',
      unread: true,
    },
    {
      id: '2',
      user: 'Jane Smith',
      lastMessage: 'Thanks for the feedback',
      timestamp: '1:15 PM',
      unread: false,
    },
  ]);

  return (
    <div className="max-w-2xl mx-auto py-8">
      <h1 className="text-3xl font-bold text-foreground mb-8">Messages</h1>

      <div className="space-y-2">
        {conversations.map((conversation) => (
          <Link key={conversation.id} href={`/messages/${conversation.id}`}>
            <div className={`p-4 rounded-lg border transition cursor-pointer ${
              conversation.unread
                ? 'bg-primary/5 border-primary/20'
                : 'bg-background border-border'
            } hover:border-primary/50`}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-foreground">{conversation.user}</h3>
                <span className="text-xs text-muted-foreground">{conversation.timestamp}</span>
              </div>
              <p className={`text-sm ${conversation.unread ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                {conversation.lastMessage}
              </p>
            </div>
          </Link>
        ))}
      </div>

      {conversations.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No conversations yet</p>
        </div>
      )}
    </div>
  );
}
