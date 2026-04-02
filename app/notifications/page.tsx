'use client';

import Link from 'next/link';

interface Notification {
  id: string;
  type: 'like' | 'comment' | 'follow';
  user: string;
  message: string;
  timestamp: string;
  read: boolean;
}

export default function NotificationsPage() {
  const notifications: Notification[] = [
    {
      id: '1',
      type: 'like',
      user: 'John Doe',
      message: 'liked your post',
      timestamp: '5 minutes ago',
      read: false,
    },
    {
      id: '2',
      type: 'comment',
      user: 'Jane Smith',
      message: 'commented on your post',
      timestamp: '1 hour ago',
      read: false,
    },
    {
      id: '3',
      type: 'follow',
      user: 'Mike Johnson',
      message: 'started following you',
      timestamp: '2 hours ago',
      read: true,
    },
  ];

  return (
    <div className="max-w-2xl mx-auto py-8">
      <h1 className="text-3xl font-bold text-foreground mb-8">Notifications</h1>

      <div className="space-y-2">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`p-4 rounded-lg border transition ${
              notification.read
                ? 'bg-background border-border'
                : 'bg-primary/5 border-primary/20'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <Link href={`/profile/${notification.user}`} className="font-semibold text-foreground hover:text-primary transition">
                  {notification.user}
                </Link>
                <p className="text-sm text-muted-foreground">{notification.message}</p>
              </div>
              <span className="text-xs text-muted-foreground">{notification.timestamp}</span>
            </div>
          </div>
        ))}
      </div>

      {notifications.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No notifications yet</p>
        </div>
      )}
    </div>
  );
}
