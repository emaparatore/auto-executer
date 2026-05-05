import { getCurrentWorkspaceKey, getWorkspaceList } from '/src/features/workspaces/workspaces.selectors.js';

function createWorkspacesHandlers(deps) {
  const {
    listWorkspaces,
    getCurrentWorkspace,
    createWorkspace,
    updateWorkspaceLabel,
    deleteWorkspace,
    selectWorkspace,
    readState,
    writeState,
    syncCoreState,
    renderWorkspaceOptions,
    renderWorkspaceManageModal,
    reloadCurrentWorkspaceData,
    setWorkspaceUiDisabled,
    showToast,
    setWorkspaceModalError
  } = deps;

  async function loadWorkspaceState() {
    const [workspacesPayload, currentPayload] = await Promise.all([listWorkspaces(), getCurrentWorkspace()]);
    const list = getWorkspaceList(workspacesPayload);
    const currentWorkspace = currentPayload?.workspace || null;
    const hasWorkspaceConfigured = list.length > 0;

    writeState({ currentWorkspace, hasWorkspaceConfigured });
    syncCoreState({ currentWorkspace, hasWorkspaceConfigured }, 'workspaces.handlers:loadWorkspaceState');
    renderWorkspaceOptions(list, currentWorkspace?.key || list[0]?.key || '');

    if (!list.length) {
      showToast('Nessun workspace caricato. Aggiungine uno con +');
    }
  }

  async function createWorkspaceFromModal(label, rootDir) {
    if (!label || !rootDir) {
      setWorkspaceModalError('Compila nome e percorso della cartella progetto.');
      return false;
    }
    setWorkspaceModalError('');
    await createWorkspace({ label, rootDir });
    await loadWorkspaceState();
    await reloadCurrentWorkspaceData();
    showToast('Workspace caricato');
    return true;
  }

  async function openWorkspaceManageModal() {
    const payload = await listWorkspaces();
    const state = readState();
    const workspaces = getWorkspaceList(payload);
    const currentKey = getCurrentWorkspaceKey(state.currentWorkspace, payload);
    renderWorkspaceManageModal(workspaces, currentKey, state.pendingWorkspaceDeleteKey);
  }

  async function renameWorkspace(key, label) {
    if (!label) {
      showToast('Nome workspace obbligatorio', 'error');
      return;
    }
    await updateWorkspaceLabel(key, label);
    await loadWorkspaceState();
    await openWorkspaceManageModal();
    showToast('Workspace rinominato');
  }

  async function requestDeleteWorkspace(key) {
    writeState({ pendingWorkspaceDeleteKey: key });
    await openWorkspaceManageModal();
  }

  async function cancelDeleteWorkspace() {
    writeState({ pendingWorkspaceDeleteKey: null });
    await openWorkspaceManageModal();
  }

  async function confirmDeleteWorkspace(key) {
    await deleteWorkspace(key);
    writeState({ pendingWorkspaceDeleteKey: null });
    await loadWorkspaceState();
    await reloadCurrentWorkspaceData();
    await openWorkspaceManageModal();
    showToast('Workspace eliminato');
  }

  async function selectWorkspaceByKey(workspaceKey) {
    const state = readState();
    if (!workspaceKey || state.isSwitchingWorkspace) return;

    writeState({ isSwitchingWorkspace: true });
    setWorkspaceUiDisabled(true);
    try {
      const payload = await selectWorkspace(workspaceKey);
      const currentWorkspace = payload.workspace;
      writeState({ currentWorkspace });
      syncCoreState({ currentWorkspace }, 'workspaces.handlers:selectWorkspaceByKey');
      await reloadCurrentWorkspaceData();
      showToast(`Workspace attivo: ${currentWorkspace.label}`);
    } finally {
      writeState({ isSwitchingWorkspace: false });
      setWorkspaceUiDisabled(false);
    }
  }

  return {
    loadWorkspaceState,
    createWorkspaceFromModal,
    openWorkspaceManageModal,
    renameWorkspace,
    requestDeleteWorkspace,
    cancelDeleteWorkspace,
    confirmDeleteWorkspace,
    selectWorkspaceByKey
  };
}

export { createWorkspacesHandlers };
