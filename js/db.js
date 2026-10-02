/* ================================================================
   db.js — IndexedDB wrapper (PersonalOS)
   DB name: personal-os  version: 1
   Stores: sessions, worklogs, expenses, categories, budgets,
           bookmarks, snippets, clipboard, assets, settings
   ================================================================ */
const DB_NAME = 'personal-os';
const DB_VERSION = 1;

const DB = (() => {
  let _db = null;

  function open() {
    return new Promise((resolve, reject) => {
      if (_db) return resolve(_db);
      const req = indexedDB.open(DB_NAME, DB_VERSION);

      req.onupgradeneeded = (e) => {
        const db = e.target.result;

        // ── Timesheet sessions ─────────────────
        if (!db.objectStoreNames.contains('sessions')) {
          const ss = db.createObjectStore('sessions', { keyPath: 'id' });
          ss.createIndex('by_date', 'check_in_at');
          ss.createIndex('by_open', 'check_out_at');
        }

        // ── Worklogs ───────────────────────────
        if (!db.objectStoreNames.contains('worklogs')) {
          const wl = db.createObjectStore('worklogs', { keyPath: 'id' });
          wl.createIndex('by_date', 'date');
        }

        // ── Expense categories ─────────────────
        if (!db.objectStoreNames.contains('categories')) {
          db.createObjectStore('categories', { keyPath: 'id' });
        }

        // ── Expenses ───────────────────────────
        if (!db.objectStoreNames.contains('expenses')) {
          const ex = db.createObjectStore('expenses', { keyPath: 'id' });
          ex.createIndex('by_date', 'spent_on');
          ex.createIndex('by_category', 'category_id');
        }

        // ── Budgets ────────────────────────────
        if (!db.objectStoreNames.contains('budgets')) {
          const bud = db.createObjectStore('budgets', { keyPath: 'id' });
          bud.createIndex('by_month', 'month');
        }

        // ── Bookmarks ──────────────────────────
        if (!db.objectStoreNames.contains('bookmarks')) {
          const bk = db.createObjectStore('bookmarks', { keyPath: 'id' });
          bk.createIndex('by_created', 'created_at');
          bk.createIndex('by_status', 'status');
        }

        // ── Snippets (Developer Vault) ─────────
        if (!db.objectStoreNames.contains('snippets')) {
          const sn = db.createObjectStore('snippets', { keyPath: 'id' });
          sn.createIndex('by_lang', 'language');
          sn.createIndex('by_pinned', 'is_pinned');
        }

        // ── Clipboard items ────────────────────
        if (!db.objectStoreNames.contains('clipboard')) {
          const cl = db.createObjectStore('clipboard', { keyPath: 'id' });
          cl.createIndex('by_created', 'created_at');
          cl.createIndex('by_pinned', 'pinned');
        }

        // ── Settings (single record) ───────────
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };

      req.onsuccess = (e) => { _db = e.target.result; resolve(_db); };
      req.onerror   = (e) => reject(e.target.error);
    });
  }

  async function tx(storeName, mode = 'readonly') {
    const db = await open();
    return db.transaction(storeName, mode).objectStore(storeName);
  }

  function wrap(req) {
    return new Promise((res, rej) => {
      req.onsuccess = (e) => res(e.target.result);
      req.onerror   = (e) => rej(e.target.error);
    });
  }

  // ── Generic CRUD ────────────────────────
  async function getAll(store) {
    const s = await tx(store);
    return wrap(s.getAll());
  }

  async function getById(store, id) {
    const s = await tx(store);
    return wrap(s.get(id));
  }

  async function put(store, record) {
    const s = await tx(store, 'readwrite');
    return wrap(s.put(record));
  }

  async function del(store, id) {
    const s = await tx(store, 'readwrite');
    return wrap(s.delete(id));
  }

  async function getByIndex(store, indexName, value) {
    const s = await tx(store);
    const idx = s.index(indexName);
    return wrap(idx.getAll(value));
  }

  async function getByIndexRange(store, indexName, lower, upper) {
    const s = await tx(store);
    const idx = s.index(indexName);
    const range = IDBKeyRange.bound(lower, upper);
    return wrap(idx.getAll(range));
  }

  // ── Settings helpers ─────────────────────
  async function getSetting(key, defaultVal = null) {
    const rec = await getById('settings', key);
    return rec ? rec.value : defaultVal;
  }

  async function setSetting(key, value) {
    return put('settings', { key, value });
  }

  return {
    open, getAll, getById, put, del,
    getByIndex, getByIndexRange,
    getSetting, setSetting,
  };
})();
