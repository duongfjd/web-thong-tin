-- Chat V3 - Supabase PostgreSQL Schema
-- Run these commands in your Supabase SQL Editor

-- 1. Create chat_rooms table
CREATE TABLE IF NOT EXISTS chat_rooms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT DEFAULT '💬',
  "order" INT DEFAULT 999,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id BIGSERIAL PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_name TEXT NOT NULL,
  text TEXT,
  image_url TEXT,
  reply_to JSONB,
  mentions TEXT[],
  pinned_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Create chat_users table
CREATE TABLE IF NOT EXISTS chat_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'moderator')),
  is_online BOOLEAN DEFAULT false,
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. Create chat_reports table
CREATE TABLE IF NOT EXISTS chat_reports (
  id BIGSERIAL PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  message_id BIGINT REFERENCES chat_messages(id) ON DELETE CASCADE,
  reported_by_uid UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_by_name TEXT NOT NULL,
  reported_user_name TEXT NOT NULL,
  message_text TEXT,
  reason TEXT NOT NULL,
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 5. Create chat_bans table
CREATE TABLE IF NOT EXISTS chat_bans (
  id BIGSERIAL PRIMARY KEY,
  user_name TEXT NOT NULL,
  reason TEXT,
  banned_until TIMESTAMP WITH TIME ZONE NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security (RLS)
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_bans ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Anyone can read rooms
CREATE POLICY "chat_rooms_readable_by_all" ON chat_rooms
  FOR SELECT USING (true);

-- RLS Policy: Anyone can read messages
CREATE POLICY "chat_messages_readable_by_all" ON chat_messages
  FOR SELECT USING (true);

-- RLS Policy: Authenticated users can insert messages
CREATE POLICY "chat_messages_insertable_by_auth" ON chat_messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- RLS Policy: Users can delete their own messages
CREATE POLICY "chat_messages_deletable_by_owner" ON chat_messages
  FOR DELETE USING (auth.uid() = sender_id);

-- RLS Policy: Users can update (pin) their own and others' messages (for admins)
CREATE POLICY "chat_messages_updatable_by_owner_or_admin" ON chat_messages
  FOR UPDATE USING (
    auth.uid() = sender_id OR 
    (SELECT role FROM chat_users WHERE id = auth.uid()) = 'admin'
  );

-- RLS Policy: Anyone can read users
CREATE POLICY "chat_users_readable_by_all" ON chat_users
  FOR SELECT USING (true);

-- RLS Policy: Users can update their own profile
CREATE POLICY "chat_users_updatable_by_self" ON chat_users
  FOR UPDATE USING (auth.uid() = id);

-- RLS Policy: Authenticated users can insert users
CREATE POLICY "chat_users_insertable_by_auth" ON chat_users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policy: Authenticated users can create reports
CREATE POLICY "chat_reports_insertable_by_auth" ON chat_reports
  FOR INSERT WITH CHECK (auth.uid() = reported_by_uid);

-- RLS Policy: Reports readable by admins
CREATE POLICY "chat_reports_readable_by_admins" ON chat_reports
  FOR SELECT USING (
    (SELECT role FROM chat_users WHERE id = auth.uid()) = 'admin'
  );

-- RLS Policy: Admins can update reports
CREATE POLICY "chat_reports_updatable_by_admins" ON chat_reports
  FOR UPDATE USING (
    (SELECT role FROM chat_users WHERE id = auth.uid()) = 'admin'
  );

-- RLS Policy: Bans readable by all (for enforcement)
CREATE POLICY "chat_bans_readable_by_all" ON chat_bans
  FOR SELECT USING (true);

-- RLS Policy: Admins can create bans
CREATE POLICY "chat_bans_insertable_by_admins" ON chat_bans
  FOR INSERT WITH CHECK (
    auth.uid() = created_by AND
    (SELECT role FROM chat_users WHERE id = auth.uid()) = 'admin'
  );

-- Create indexes for performance
CREATE INDEX idx_chat_messages_room_id ON chat_messages(room_id);
CREATE INDEX idx_chat_messages_sender_id ON chat_messages(sender_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at DESC);
CREATE INDEX idx_chat_reports_room_id ON chat_reports(room_id);
CREATE INDEX idx_chat_reports_resolved ON chat_reports(resolved);
CREATE INDEX idx_chat_bans_user_name ON chat_bans(user_name);
CREATE INDEX idx_chat_bans_banned_until ON chat_bans(banned_until);

-- Insert default rooms
INSERT INTO chat_rooms (id, name, description, icon, "order") VALUES
  ('general', 'general', 'Phòng thảo luận chung cho cộng đồng', '💬', 1),
  ('dev', 'dev', 'Thảo luận về lập trình và công nghệ', '💻', 2),
  ('giai-tri', 'giai-tri', 'Chia sẻ giải trí và thư giãn', '🎮', 3)
ON CONFLICT (id) DO NOTHING;

-- Create function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_chat_rooms_updated_at BEFORE UPDATE ON chat_rooms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_messages_updated_at BEFORE UPDATE ON chat_messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_users_updated_at BEFORE UPDATE ON chat_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- SETUP STEPS:
-- 1. Run all commands above in Supabase SQL Editor
-- 2. Create Storage bucket named "chat-images"
--    - Go to Storage → New bucket → Name: chat-images → Public → Create
-- 3. Promote admin user by running:
--    UPDATE chat_users SET role = 'admin' WHERE id = '<user-uuid>';
--    (Get the user UUID from auth.users table after user signs up)
