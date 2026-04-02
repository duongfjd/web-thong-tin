'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Report } from '@/types';

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [action, setAction] = useState<'approve' | 'reject' | 'ban'>('approve');

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const { data, error } = await supabase
          .from('reports')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setReports(data || []);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, []);

  const handleReview = async () => {
    if (!selectedReport) return;

    try {
      await supabase
        .from('reports')
        .update({
          status: 'reviewed',
          admin_notes: reviewNotes,
        })
        .eq('id', selectedReport.id);

      setReports((prev) =>
        prev.map((r) =>
          r.id === selectedReport.id
            ? { ...r, status: 'reviewed', admin_notes: reviewNotes }
            : r
        )
      );

      setSelectedReport(null);
      setReviewNotes('');
    } catch (error) {
      console.error('Failed to review report:', error);
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-foreground mb-8">Reports Management</h1>

      <div className="grid grid-cols-3 gap-8">
        {/* Reports List */}
        <div className="col-span-2">
          {loading ? (
            <div className="text-muted-foreground">Loading reports...</div>
          ) : (
            <div className="space-y-2">
              {reports.map((report) => (
                <div
                  key={report.id}
                  onClick={() => setSelectedReport(report)}
                  className={`p-4 rounded-lg border cursor-pointer transition ${
                    selectedReport?.id === report.id
                      ? 'bg-primary/10 border-primary'
                      : 'bg-card border-border hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-foreground">
                        {report.report_type.toUpperCase()} Report
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {report.reason}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        report.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-900'
                          : report.status === 'reviewed'
                          ? 'bg-blue-100 text-blue-900'
                          : 'bg-green-100 text-green-900'
                      }`}
                    >
                      {report.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Review Panel */}
        {selectedReport && (
          <div className="col-span-1">
            <div className="bg-card border border-border rounded-lg p-6 sticky top-20">
              <h2 className="text-xl font-semibold text-foreground mb-4">Review Report</h2>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground">Type</label>
                  <p className="text-muted-foreground">{selectedReport.report_type}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground">Reason</label>
                  <p className="text-muted-foreground text-sm">{selectedReport.reason}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Admin Notes
                  </label>
                  <textarea
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder="Add notes about your review..."
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    rows={4}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Action
                  </label>
                  <select
                    value={action}
                    onChange={(e) => setAction(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="approve">Approve (No Action)</option>
                    <option value="reject">Reject (Invalid Report)</option>
                    <option value="ban">Ban User</option>
                  </select>
                </div>

                <button
                  onClick={handleReview}
                  className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition"
                >
                  Submit Review
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
