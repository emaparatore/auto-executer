function renderWorkspaceOptionsSection(params) {
  const { menu, value, workspaces, selectedKey, renderWorkspaceOptionsTemplate } = params;
  menu.innerHTML = renderWorkspaceOptionsTemplate(workspaces, selectedKey);
  const current = workspaces.find((item) => item.key === selectedKey);
  value.textContent = current ? current.label : 'Seleziona workspace';
}

function renderWorkspaceManageListSection(params) {
  const {
    list,
    workspaces,
    currentKey,
    pendingWorkspaceDeleteKey,
    renderWorkspaceManageListTemplate
  } = params;

  list.innerHTML = renderWorkspaceManageListTemplate(workspaces, currentKey, pendingWorkspaceDeleteKey)
    || '<div class="empty-state empty-state-padded">Nessun workspace disponibile.</div>';
}

export { renderWorkspaceOptionsSection, renderWorkspaceManageListSection };
