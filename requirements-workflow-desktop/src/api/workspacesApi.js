import { deleteJson, getJson, patchJson, postJson } from '/src/api/http.js';

function listWorkspaces() {
  return getJson('/api/workspaces', { cache: 'no-store' });
}

function getCurrentWorkspace() {
  return getJson('/api/workspace/current', { cache: 'no-store' });
}

function createWorkspace(payload) {
  return postJson('/api/workspaces', payload);
}

function updateWorkspaceLabel(key, label) {
  return patchJson(`/api/workspaces/${encodeURIComponent(key)}`, { label });
}

function deleteWorkspace(key) {
  return deleteJson(`/api/workspaces/${encodeURIComponent(key)}`);
}

function selectWorkspace(key) {
  return postJson('/api/workspace/select', { key });
}

function pickWorkspaceFolder() {
  return postJson('/api/workspaces/pick-folder');
}

export {
  listWorkspaces,
  getCurrentWorkspace,
  createWorkspace,
  updateWorkspaceLabel,
  deleteWorkspace,
  selectWorkspace,
  pickWorkspaceFolder
};
