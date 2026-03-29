// Supabase Configuration - Data & Storage only
// Authentication is handled by Firebase
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.0/+esm';

const SUPABASE_URL = 'https://shzxqulhxwmjdipjkwqe.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_l5VdADKMm4fwADcrpZn-VQ_xATGQb7w';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Realtime subscriptions
export function subscribeToMessages(roomId, callback) {
  return supabase
    .channel(`room-${roomId}`)
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${roomId}` },
      callback
    )
    .subscribe();
}

export function subscribeToOnlineStatus(callback) {
  return supabase
    .channel('online-status')
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'chat_users' },
      callback
    )
    .subscribe();
}

export function subscribeToReports(callback) {
  return supabase
    .channel('reports')
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'chat_reports' },
      callback
    )
    .subscribe();
}
