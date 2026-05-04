export function createWorkspaceRepository(db) {
  function clearCurrentWorkspaceFlag() {
    db.prepare('UPDATE workspaces SET is_current = 0 WHERE is_current = 1').run();
  }

  function getWorkspaceCatalog() {
    return db.prepare('SELECT key, label, root_dir as rootDir, is_current as isCurrent FROM workspaces ORDER BY created_at ASC').all();
  }

  function getCurrentWorkspaceRow() {
    return db.prepare('SELECT key, label, root_dir as rootDir FROM workspaces WHERE is_current = 1 LIMIT 1').get() || null;
  }

  function setCurrentWorkspace(key) {
    clearCurrentWorkspaceFlag();
    db.prepare('UPDATE workspaces SET is_current = 1, updated_at = ? WHERE key = ?').run(new Date().toISOString(), key);
  }

  function insertWorkspace({ key, label, rootDir }) {
    const now = new Date().toISOString();
    clearCurrentWorkspaceFlag();
    db.prepare('INSERT INTO workspaces (key, label, root_dir, is_current, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?)').run(key, label, rootDir, now, now);
  }

  function updateWorkspaceLabel(key, label) {
    db.prepare('UPDATE workspaces SET label = ?, updated_at = ? WHERE key = ?').run(label, new Date().toISOString(), key);
  }

  function deleteWorkspace(key) {
    return db.prepare('DELETE FROM workspaces WHERE key = ?').run(key);
  }

  function findWorkspaceByKey(key) {
    return db.prepare('SELECT key, label, root_dir as rootDir, is_current as isCurrent FROM workspaces WHERE key = ?').get(key) || null;
  }

  function findCurrentWorkspaceKey() {
    return db.prepare('SELECT key FROM workspaces WHERE is_current = 1 LIMIT 1').get()?.key || null;
  }

  function findFirstWorkspaceKey() {
    return db.prepare('SELECT key FROM workspaces ORDER BY created_at ASC LIMIT 1').get()?.key || null;
  }

  return {
    clearCurrentWorkspaceFlag,
    getWorkspaceCatalog,
    getCurrentWorkspaceRow,
    setCurrentWorkspace,
    insertWorkspace,
    updateWorkspaceLabel,
    deleteWorkspace,
    findWorkspaceByKey,
    findCurrentWorkspaceKey,
    findFirstWorkspaceKey
  };
}
