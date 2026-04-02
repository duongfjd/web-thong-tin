'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function SettingsPage() {
  const [formData, setFormData] = useState({
    displayName: 'John Doe',
    bio: '',
    location: '',
    website: '',
    email: 'john@example.com',
    notifications: true,
    emailDigest: false,
    darkMode: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement actual settings update
    console.log('Saving settings:', formData);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <Link href="/community" className="text-primary hover:underline text-sm">
          ← Back to feed
        </Link>
      </div>

      <h1 className="text-3xl font-bold text-foreground mb-8">Settings</h1>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Profile Settings */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-xl font-semibold text-foreground mb-6">Profile Settings</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Display Name
              </label>
              <input
                type="text"
                value={formData.displayName}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Bio
              </label>
              <textarea
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                rows={4}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Location
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Website
              </label>
              <input
                type="url"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-xl font-semibold text-foreground mb-6">Notifications</h2>
          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.notifications}
                onChange={(e) => setFormData({ ...formData, notifications: e.target.checked })}
                className="rounded"
              />
              <span className="text-foreground">Push notifications</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.emailDigest}
                onChange={(e) => setFormData({ ...formData, emailDigest: e.target.checked })}
                className="rounded"
              />
              <span className="text-foreground">Email digest</span>
            </label>
          </div>
        </div>

        {/* Appearance Settings */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-xl font-semibold text-foreground mb-6">Appearance</h2>
          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.darkMode}
                onChange={(e) => setFormData({ ...formData, darkMode: e.target.checked })}
                className="rounded"
              />
              <span className="text-foreground">Dark mode</span>
            </label>
          </div>
        </div>

        {/* Save Button */}
        <button
          type="submit"
          className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition"
        >
          Save Changes
        </button>
      </form>
    </div>
  );
}
