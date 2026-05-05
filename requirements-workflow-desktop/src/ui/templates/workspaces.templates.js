function renderWorkspaceOptionsTemplate(workspaces, selectedKey, deps) {
  const { escapeHtml } = deps;
  return workspaces.map((item) => `
    <button type="button" class="workspace-select-option${item.key === selectedKey ? ' is-current' : ''}" data-workspace-key="${escapeHtml(item.key)}" role="option" aria-selected="${item.key === selectedKey ? 'true' : 'false'}">${escapeHtml(item.label)}</button>
  `).join('');
}

function renderWorkspaceManageListTemplate(workspaces, currentKey, pendingWorkspaceDeleteKey, deps) {
  const { escapeHtml } = deps;
  return workspaces.map((item) => `
    <div class="workspace-manage-item" data-key="${escapeHtml(item.key)}">
      <div class="workspace-manage-row">
        <div class="workspace-manage-main">
          <input class="search-input" value="${escapeHtml(item.label)}" data-workspace-label-input="${escapeHtml(item.key)}" data-original-label="${escapeHtml(item.label)}">
          <div class="workspace-manage-path" title="${escapeHtml(item.rootDir || '')}">${escapeHtml(item.rootDir || '')}</div>
        </div>
        <div class="workspace-manage-actions">
          <button type="button" class="workspace-icon-btn is-success workspace-save-btn" data-workspace-save="${escapeHtml(item.key)}" style="display:none" aria-label="Salva nome workspace" title="Salva nome workspace">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"></path></svg>
          </button>
          <button type="button" class="workspace-icon-btn is-danger" data-workspace-delete="${escapeHtml(item.key)}" ${item.key === currentKey ? 'title="Elimina workspace corrente"' : 'title="Elimina workspace"'} aria-label="Elimina workspace">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"></polyline><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"></path><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
          </button>
        </div>
      </div>
      ${pendingWorkspaceDeleteKey === item.key ? `
        <div class="workspace-delete-confirm" data-workspace-delete-confirm="${escapeHtml(item.key)}">
          <div class="workspace-delete-confirm-text">Confermi eliminazione workspace <strong>${escapeHtml(item.label)}</strong>?</div>
          <div class="workspace-manage-actions">
            <button type="button" class="open-question-btn is-danger" data-workspace-delete-confirm-yes="${escapeHtml(item.key)}">Si, elimina</button>
            <button type="button" class="open-question-btn is-secondary" data-workspace-delete-confirm-no="${escapeHtml(item.key)}">Annulla</button>
          </div>
        </div>
      ` : ''}
    </div>
  `).join('');
}

export { renderWorkspaceOptionsTemplate, renderWorkspaceManageListTemplate };
