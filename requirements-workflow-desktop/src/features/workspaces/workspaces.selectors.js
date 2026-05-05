function getWorkspaceList(payload) {
  return Array.isArray(payload?.workspaces) ? payload.workspaces : [];
}

function getCurrentWorkspaceKey(currentWorkspace, payload) {
  return currentWorkspace?.key || payload?.currentWorkspaceKey || '';
}

export { getWorkspaceList, getCurrentWorkspaceKey };
