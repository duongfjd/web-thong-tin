'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalPosts: 0,
    totalReports: 0,
    pendingReports: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [users, posts, reports] = await Promise.all([
          supabase.from('users').select('id', { count: 'exact' }),
          supabase.from('posts').select('id', { count: 'exact' }),
          supabase.from('reports').select('id', { count: 'exact' }),
        ]);

        const pendingReports = await supabase
          .from('reports')
          .select('id', { count: 'exact' })
          .eq('status', 'pending');

        setStats({
          totalUsers: users.count || 0,
          totalPosts: posts.count || 0,
          totalReports: reports.count || 0,
          pendingReports: pendingReports.count || 0,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const StatCard = ({ title, value, subtitle }: any) => (
    <div className="bg-card border border-border rounded-lg p-6">
      <h3 className="text-sm font-medium text-muted-foreground mb-2">{title}</h3>
      <div className="text-3xl font-bold text-foreground">{value}</div>
      {subtitle && <p className="text-xs text-muted-foreground mt-2">{subtitle}</p>}
    </div>
  );

  return (
    <div>
      <h1 className="text-3xl font-bold text-foreground mb-8">Admin Dashboard</h1>

      {loading ? (
        <div className="text-muted-foreground">Loading statistics...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title="Total Users" value={stats.totalUsers} />
          <StatCard title="Total Posts" value={stats.totalPosts} />
          <StatCard
            title="Reports"
            value={stats.pendingReports}
            subtitle={`of ${stats.totalReports} total`}
          />
          <StatCard
            title="Pending Reports"
            value={stats.pendingReports}
            subtitle="Awaiting review"
          />
        </div>
      )}

      <div className="mt-8 bg-card border border-border rounded-lg p-6">
        <h2 className="text-xl font-semibold text-foreground mb-4">Recent Activity</h2>
        <p className="text-muted-foreground">Activity log coming soon</p>
      </div>
    </div>
  );
}
