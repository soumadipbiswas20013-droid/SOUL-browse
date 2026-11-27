const Database = require('better-sqlite3');

function createStorage(dbPath, safeStorage) {
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      avatar TEXT,
      accent TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS bookmarks (
      id TEXT PRIMARY KEY,
      profile_id TEXT NOT NULL,
      parent_id TEXT,
      title TEXT NOT NULL,
      url TEXT,
      is_folder INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS history (
      id TEXT PRIMARY KEY,
      profile_id TEXT NOT NULL,
      url TEXT NOT NULL,
      title TEXT NOT NULL,
      visited_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS downloads (
      id TEXT PRIMARY KEY,
      filename TEXT NOT NULL,
      url TEXT NOT NULL,
      mime_type TEXT,
      total_bytes INTEGER DEFAULT 0,
      received_bytes INTEGER DEFAULT 0,
      state TEXT NOT NULL,
      save_path TEXT,
      started_at INTEGER NOT NULL,
      completed_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS site_permissions (
      origin TEXT NOT NULL,
      permission TEXT NOT NULL,
      decision TEXT NOT NULL,
      PRIMARY KEY (origin, permission)
    );

    CREATE TABLE IF NOT EXISTS credentials (
      id TEXT PRIMARY KEY,
      profile_id TEXT NOT NULL,
      origin TEXT NOT NULL,
      username TEXT NOT NULL,
      encrypted_secret BLOB NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  const hasDefault = db.prepare('SELECT id FROM profiles WHERE id = ?').get('default');
  if (!hasDefault) {
    db.prepare('INSERT INTO profiles (id, name, avatar, accent, created_at) VALUES (?, ?, ?, ?, ?)')
      .run('default', 'Soumadip', 'orbital', '#4A8DFF', Date.now());
  }

  return {
    getSettings() {
      const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('global');
      return row ? JSON.parse(row.value) : { askBeforeDownloading: false };
    },
    saveSettings(next) {
      db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
        .run('global', JSON.stringify(next));
    },
    getSitePermission(origin, permission) {
      const row = db.prepare('SELECT decision FROM site_permissions WHERE origin = ? AND permission = ?').get(origin, permission);
      return row ? row.decision : null;
    },
    addHistoryEntry(profileId, { url, title }) {
      const id = `hist_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      db.prepare('INSERT INTO history (id, profile_id, url, title, visited_at) VALUES (?, ?, ?, ?, ?)')
        .run(id, profileId, url, title, Date.now());
    },
    clearHistory(profileId, cutoffTimestamp = 0) {
      db.prepare('DELETE FROM history WHERE profile_id = ? AND visited_at >= ?').run(profileId, cutoffTimestamp);
    },
    upsertDownload(record) {
      db.prepare(`
        INSERT OR REPLACE INTO downloads
        (id, filename, url, mime_type, total_bytes, received_bytes, state, save_path, started_at, completed_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        record.id,
        record.filename,
        record.url,
        record.mimeType || '',
        record.totalBytes || 0,
        record.receivedBytes || 0,
        record.state,
        record.savePath || '',
        record.startedAt,
        record.completedAt || null
      );
    },
    saveCredential(profileId, { id, origin, username, password }) {
      if (!safeStorage || !safeStorage.isEncryptionAvailable()) {
        throw new Error('OS credential encryption is unavailable on this machine.');
      }
      const encrypted = safeStorage.encryptString(password);
      db.prepare(`
        INSERT OR REPLACE INTO credentials (id, profile_id, origin, username, encrypted_secret, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(id, profileId, origin, username, encrypted, Date.now());
    },
    listCredentials(profileId) {
      const rows = db.prepare('SELECT id, origin, username, encrypted_secret, updated_at FROM credentials WHERE profile_id = ?').all(profileId);
      return rows.map((row) => ({
        id: row.id,
        origin: row.origin,
        username: row.username,
        password: safeStorage && safeStorage.isEncryptionAvailable()
          ? safeStorage.decryptString(row.encrypted_secret)
          : '',
        updatedAt: row.updated_at,
      }));
    },
    deleteCredential(profileId, id) {
      db.prepare('DELETE FROM credentials WHERE profile_id = ? AND id = ?').run(profileId, id);
    },
    getState(profileId) {
      return {
        bookmarks: db.prepare('SELECT * FROM bookmarks WHERE profile_id = ? ORDER BY sort_order ASC').all(profileId),
        history: db.prepare('SELECT * FROM history WHERE profile_id = ? ORDER BY visited_at DESC LIMIT 500').all(profileId),
        downloads: db.prepare('SELECT * FROM downloads ORDER BY started_at DESC LIMIT 200').all(),
        profiles: db.prepare('SELECT * FROM profiles ORDER BY created_at ASC').all(),
      };
    },
    saveBookmark(profileId, b) {
      db.prepare(`
        INSERT OR REPLACE INTO bookmarks (id, profile_id, parent_id, title, url, is_folder, sort_order, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(b.id, profileId, b.parentId || null, b.title, b.url || '', b.isFolder ? 1 : 0, b.sortOrder || 0, b.createdAt || Date.now());
    },
    deleteBookmark(profileId, id) {
      db.prepare('DELETE FROM bookmarks WHERE profile_id = ? AND id = ?').run(profileId, id);
    },
  };
}

module.exports = { createStorage };
