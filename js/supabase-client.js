/* ================================================================
   supabase-client.js — Supabase JS Client wrapper
   Uses @supabase/supabase-js v2 via CDN
   ================================================================ */

const SUPABASE_URL  = 'https://osgylcwbikatamrtisaq.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zZ3lsY3diaWthdGFtcnRpc2FxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA4NjI1NTIsImV4cCI6MjEwNjQzODU1Mn0.vf0IGiyAE3YYfVqLNd50VN_HdfmDSj-nf-qfIcSj7gQ';

// supabase global is injected by CDN script in index.html
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

/* ── DB — unified CRUD API (mirrors old IndexedDB wrapper) ── */
const DB = (() => {

  // ── Auth shortcuts ─────────────────────
  async function getUser() {
    const { data: { user } } = await _supabase.auth.getUser();
    return user;
  }

  function userId() {
    // Returns cached user id synchronously (safe after auth check)
    return _supabase.auth.getSession().then(({ data }) => data?.session?.user?.id);
  }

  // ── Generic helpers ────────────────────
  async function getAll(table) {
    const { data, error } = await _supabase.from(table).select('*').order('created_at', { ascending: false });
    if (error) { console.error(`DB.getAll(${table})`, error); return []; }
    return data || [];
  }

  async function getById(table, id) {
    const { data, error } = await _supabase.from(table).select('*').eq('id', id).single();
    if (error) return null;
    return data;
  }

  async function put(table, record) {
    // Upsert: insert or update based on id
    const { data, error } = await _supabase.from(table).upsert(record).select().single();
    if (error) { console.error(`DB.put(${table})`, error); throw error; }
    return data;
  }

  async function del(table, id) {
    const { error } = await _supabase.from(table).delete().eq('id', id);
    if (error) { console.error(`DB.del(${table})`, error); throw error; }
  }

  async function getByIndex(table, column, value) {
    const { data, error } = await _supabase.from(table).select('*').eq(column, value);
    if (error) return [];
    return data || [];
  }

  async function getByIndexRange(table, column, lower, upper) {
    const { data, error } = await _supabase
      .from(table).select('*')
      .gte(column, lower)
      .lte(column, upper);
    if (error) return [];
    return data || [];
  }

  // ── Settings ───────────────────────────
  async function getSetting(key, defaultVal = null) {
    const { data } = await _supabase.from('settings').select('value').eq('key', key).single();
    return data ? data.value : defaultVal;
  }

  async function setSetting(key, value) {
    const { error } = await _supabase.from('settings').upsert({ key, value });
    if (error) console.error('setSetting', error);
  }

  // ── Auth shortcuts ─────────────────────
  async function open() {
    // In Supabase mode, "open" = verify session exists
    const { data: { session } } = await _supabase.auth.getSession();
    return !!session;
  }

  return {
    open,
    getAll, getById, put, del,
    getByIndex, getByIndexRange,
    getSetting, setSetting,
    getUser,
  };
})();

/* Expose _supabase for direct use if needed */
const SB = _supabase;
