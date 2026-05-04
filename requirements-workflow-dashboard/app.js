let plans = [];
let requirements = [];
let currentPlan = null;
let currentRequirement = null;
let currentSection = 'plans';
let searchDebounceTimer = null;
let editingAcceptanceStoryId = null;
let isAcceptanceUpdating = false;
let toastTimer = null;
let acceptanceFocusTarget = null;
let editingTaskDodId = null;
let isTaskDodUpdating = false;
let taskDodFocusTarget = null;
let isPlanNotesEditing = false;
let isPlanNotesUpdating = false;
let isPlanObjectiveEditing = false;
let isPlanObjectiveUpdating = false;
let isPlanPhasesEditing = false;
let isPlanPhasesUpdating = false;
let editingPlanPhases = [];
let editingTaskNotesId = null;
let isTaskNotesUpdating = false;
let editingTaskImplementationNotesId = null;
let isTaskImplementationNotesUpdating = false;
let openTaskNotesIds = new Set();
let editingTaskField = null;
let isTaskFieldUpdating = false;
let editingOpenQuestionId = null;
let isOpenQuestionUpdating = false;
let creatingOpenQuestion = false;
let creatingOpenQuestionStep = 'id';
let newOpenQuestionId = '';
let newOpenQuestionQuestion = '';
let newOpenQuestionAnswer = 'Non definito nel documento; richiesta conferma.';
let newOpenQuestionStatus = 'open';
let deletingOpenQuestionId = null;
let isRequirementOverviewEditing = false;
let isRequirementOverviewUpdating = false;
let isRequirementCurrentStateEditing = false;
let isRequirementCurrentStateUpdating = false;
let isRequirementNotesEditing = false;
let isRequirementNotesUpdating = false;
let editingFunctionalRequirementId = null;
let isFunctionalRequirementUpdating = false;
let creatingFunctionalRequirement = false;
let newFunctionalRequirementId = '';
let creatingFunctionalRequirementStep = 'id';
let newFunctionalRequirementTitle = '';
let newFunctionalRequirementDescription = '';
let deletingFunctionalRequirementId = null;
let deleteModalReturnFocusEl = null;
let editingNonFunctionalRequirementId = null;
let isNonFunctionalRequirementUpdating = false;
let creatingNonFunctionalRequirement = false;
let newNonFunctionalRequirementId = '';
let creatingNonFunctionalRequirementStep = 'id';
let newNonFunctionalRequirementTitle = '';
let newNonFunctionalRequirementDescription = '';
let deletingNonFunctionalRequirementId = null;
let deleteNonFunctionalModalReturnFocusEl = null;
let editingPlanDecisionId = null;
let isPlanDecisionUpdating = false;
let creatingPlanDecision = false;
let creatingPlanDecisionStep = 'id';
let newPlanDecisionId = '';
let newPlanDecisionDescription = '';
let newPlanDecisionRationale = '';
let deletingPlanDecisionId = null;
let deletePlanDecisionModalReturnFocusEl = null;
let editingStoryId = null;
let isStoryUpdating = false;
let creatingStory = false;
let creatingStoryStep = 'id';
let newStoryId = '';
let deletingStoryId = null;
let sectionStatusFilters = {
  plans: new Set(),
  requirements: new Set()
};
let sectionStatusCatalog = {
  plans: new Set(),
  requirements: new Set()
};
let currentWorkspace = null;
let isSwitchingWorkspace = false;
let hasWorkspaceConfigured = false;
let pendingWorkspaceDeleteKey = null;

const OPEN_QUESTION_STATUSES = ['open', 'resolved'];
const ADD_ICON_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>';

const TASK_STATUSES = ['pending', 'in_progress', 'completed', 'skipped', 'cancelled'];
const STATUS_SORT_ORDER = ['pending', 'draft', 'in_progress', 'in_review', 'approved', 'implemented', 'completed', 'skipped', 'cancelled'];

const WELCOME_PLAN_ICON = `
  <svg class="welcome-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"></polygon>
    <line x1="9" y1="3" x2="9" y2="18"></line>
    <line x1="15" y1="6" x2="15" y2="21"></line>
  </svg>
`;

const WELCOME_REQUIREMENT_ICON = `
  <svg class="welcome-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <rect x="9" y="2" width="6" height="4" rx="1"></rect>
    <path d="M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2"></path>
    <path d="M9 12h6"></path>
    <path d="M9 16h6"></path>
  </svg>
`;

function updateSidebarHeight() {
  const sidebar = document.querySelector('.sidebar');
  const plansList = document.querySelector('.plans-list');
  if (!sidebar || !plansList) return;

  const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
  const sidebarTop = sidebar.getBoundingClientRect().top;
  const bottomSpacing = 40;
  const availableHeight = Math.max(240, Math.floor(viewportHeight - sidebarTop - bottomSpacing));

  document.documentElement.style.setProperty('--sidebar-list-height', `${availableHeight}px`);
}

function isTaskFieldEditing(taskId, field) {
  return editingTaskField?.taskId === taskId && editingTaskField?.field === field;
}

function getCurrentDateIso() {
  return new Date().toISOString().slice(0, 10);
}

function buildPhasesForEditor(plan) {
  const planPhases = Array.isArray(plan?.phases) ? plan.phases : [];
  const tasks = Array.isArray(plan?.tasks) ? plan.tasks : [];
  const tasksById = new Map(tasks.map(task => [String(task.id), task]));

  return planPhases
    .map(phase => {
      const title = String(phase?.title || '').trim();
      if (!title) return null;

      const fromPhaseList = Array.isArray(phase?.tasks)
        ? phase.tasks.map(taskId => String(taskId).trim()).filter(Boolean)
        : [];
      const fromTaskField = tasks
        .filter(task => String(task?.phase || '').trim() === title)
        .map(task => String(task.id));

      const mergedTaskIds = Array.from(new Set([...fromPhaseList, ...fromTaskField]))
        .filter(taskId => tasksById.has(taskId));

      return { title, tasks: mergedTaskIds };
    })
    .filter(Boolean);
}

async function loadPlans() {
  const res = await fetch('/api/plans', { cache: 'no-store' });
  plans = await res.json();
  if (currentSection === 'plans') renderPlansList();
}

async function loadRequirements() {
  const res = await fetch('/api/requirements');
  requirements = await res.json();
  if (currentSection === 'requirements') renderRequirementsList();
}

async function fetchJsonOrThrow(url, options) {
  const res = await fetch(url, options);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Request failed (${res.status})`);
  }
  return res.json();
}

function setWorkspaceUiDisabled(disabled) {
  const select = document.getElementById('workspaceSelect');
  const reloadBtn = document.getElementById('workspaceReload');
  const manageBtn = document.getElementById('workspaceManage');
  const addBtn = document.getElementById('workspaceAdd');
  if (select) select.classList.toggle('is-disabled', disabled);
  if (reloadBtn) reloadBtn.disabled = disabled;
  if (manageBtn) manageBtn.disabled = disabled;
  if (addBtn) addBtn.disabled = disabled;
}

function renderWorkspaceOptions(workspaces, selectedKey) {
  const menu = document.getElementById('workspaceSelectMenu');
  const value = document.getElementById('workspaceSelectValue');
  if (!menu || !value) return;
  menu.innerHTML = workspaces.map(item => `<button type="button" class="workspace-select-option${item.key === selectedKey ? ' is-current' : ''}" data-workspace-key="${escapeHtml(item.key)}" role="option" aria-selected="${item.key === selectedKey ? 'true' : 'false'}">${escapeHtml(item.label)}</button>`).join('');
  const current = workspaces.find(item => item.key === selectedKey);
  value.textContent = current ? current.label : 'Seleziona workspace';
}

async function reloadCurrentWorkspaceData() {
  currentPlan = null;
  currentRequirement = null;
  await Promise.all([loadPlans(), loadRequirements()]);
  setSection(currentSection || 'plans');
}

async function loadWorkspaceState() {
  const [workspacesPayload, currentPayload] = await Promise.all([
    fetchJsonOrThrow('/api/workspaces', { cache: 'no-store' }),
    fetchJsonOrThrow('/api/workspace/current', { cache: 'no-store' })
  ]);
  const list = Array.isArray(workspacesPayload?.workspaces) ? workspacesPayload.workspaces : [];
  hasWorkspaceConfigured = list.length > 0;
  currentWorkspace = currentPayload?.workspace || null;
  renderWorkspaceOptions(list, currentWorkspace?.key || list[0]?.key || '');
  if (!list.length) {
    showToast('Nessun workspace caricato. Aggiungine uno con +');
  }
}

function openWorkspaceModal() {
  const modal = document.getElementById('workspaceModal');
  const errorBox = document.getElementById('workspaceModalError');
  if (!modal) return;
  if (errorBox) {
    errorBox.textContent = '';
    errorBox.classList.remove('show');
  }
  modal.style.display = 'flex';
}

function closeWorkspaceModalFromEvent(event) {
  if (event) event.stopPropagation();
  const modal = document.getElementById('workspaceModal');
  if (!modal) return;
  modal.style.display = 'none';
}

function setWorkspaceModalError(message) {
  const errorBox = document.getElementById('workspaceModalError');
  if (!errorBox) return;
  const text = String(message || '').trim();
  if (!text) {
    errorBox.textContent = '';
    errorBox.classList.remove('show');
    return;
  }
  errorBox.textContent = text;
  errorBox.classList.add('show');
}

async function createWorkspaceFromEvent(event) {
  event.stopPropagation();
  const label = String(document.getElementById('workspaceLabelInput')?.value || '').trim();
  const rootDir = String(document.getElementById('workspaceRootInput')?.value || '').trim();
  if (!label || !rootDir) {
    setWorkspaceModalError('Compila nome e percorso della cartella progetto.');
    return;
  }
  setWorkspaceModalError('');
  try {
    await fetchJsonOrThrow('/api/workspaces', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label, rootDir })
    });
    await loadWorkspaceState();
    await reloadCurrentWorkspaceData();
    closeWorkspaceModalFromEvent(event);
    showToast('Workspace caricato');
  } catch (error) {
    setWorkspaceModalError(error.message);
    showToast(error.message, 'error');
  }
}

async function openWorkspaceManageModal() {
  const modal = document.getElementById('workspaceManageModal');
  const list = document.getElementById('workspaceManageList');
  if (!modal || !list) return;
  const payload = await fetchJsonOrThrow('/api/workspaces', { cache: 'no-store' });
  const currentKey = currentWorkspace?.key || payload.currentWorkspaceKey;
  const workspaces = Array.isArray(payload.workspaces) ? payload.workspaces : [];
  list.innerHTML = workspaces.map(item => `
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
  `).join('') || '<div class="empty-state empty-state-padded">Nessun workspace disponibile.</div>';
  modal.style.display = 'flex';
}

function closeWorkspaceManageModalFromEvent(event) {
  if (event) event.stopPropagation();
  const modal = document.getElementById('workspaceManageModal');
  if (modal) modal.style.display = 'none';
  pendingWorkspaceDeleteKey = null;
}

async function handleWorkspaceManageClick(event) {
  const renameBtn = event.target.closest('[data-workspace-save]');
  const deleteBtn = event.target.closest('[data-workspace-delete]');
  if (renameBtn) {
    const key = renameBtn.dataset.workspaceSave;
    const input = document.querySelector(`[data-workspace-label-input="${CSS.escape(key)}"]`);
    const label = String(input?.value || '').trim();
    if (!label) return showToast('Nome workspace obbligatorio', 'error');
    await fetchJsonOrThrow(`/api/workspaces/${encodeURIComponent(key)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ label }) });
    await loadWorkspaceState();
    await openWorkspaceManageModal();
    showToast('Workspace rinominato');
    return;
  }
  if (deleteBtn) {
    const key = deleteBtn.dataset.workspaceDelete;
    pendingWorkspaceDeleteKey = key;
    await openWorkspaceManageModal();
    return;
  }
  const cancelDeleteBtn = event.target.closest('[data-workspace-delete-confirm-no]');
  if (cancelDeleteBtn) {
    pendingWorkspaceDeleteKey = null;
    await openWorkspaceManageModal();
    return;
  }
  const confirmDeleteBtn = event.target.closest('[data-workspace-delete-confirm-yes]');
  if (confirmDeleteBtn) {
    const key = confirmDeleteBtn.dataset.workspaceDeleteConfirmYes;
    await fetchJsonOrThrow(`/api/workspaces/${encodeURIComponent(key)}`, { method: 'DELETE' });
    pendingWorkspaceDeleteKey = null;
    await loadWorkspaceState();
    await reloadCurrentWorkspaceData();
    await openWorkspaceManageModal();
    showToast('Workspace eliminato');
  }
}

async function selectWorkspaceByKey(workspaceKey) {
  if (!workspaceKey || isSwitchingWorkspace) return;
  const value = document.getElementById('workspaceSelectValue');
  const previousValue = currentWorkspace?.key || '';
  isSwitchingWorkspace = true;
  setWorkspaceUiDisabled(true);
  try {
    const payload = await fetchJsonOrThrow('/api/workspace/select', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: workspaceKey })
    });
    currentWorkspace = payload.workspace;
    await reloadCurrentWorkspaceData();
    showToast(`Workspace attivo: ${currentWorkspace.label}`);
  } catch (error) {
    if (value && currentWorkspace?.label) value.textContent = currentWorkspace.label;
    renderWorkspaceOptions((await fetchJsonOrThrow('/api/workspaces', { cache: 'no-store' })).workspaces || [], previousValue);
    showToast(error.message, 'error');
  } finally {
    isSwitchingWorkspace = false;
    setWorkspaceUiDisabled(false);
  }
}

function renderPlansList() {
  const container = document.getElementById('plansList');
  document.getElementById('plansSwitchCount').textContent = `(${plans.length})`;
  document.getElementById('requirementsSwitchCount').textContent = `(${requirements.length})`;

  renderStatusFilters();
  const filteredPlans = getFilteredItems('plans');

  if (!filteredPlans.length) {
    container.innerHTML = '<div class="empty-state empty-state-padded">No plans match the selected status filters.</div>';
    return;
  }

  container.innerHTML = filteredPlans.map(plan => `
    <div class="plan-item" data-id="${escapeHtml(plan.id)}" onclick="selectPlanByEncodedId('${encodeURIComponent(plan.id)}')">
      <div class="plan-item-header">
        <span class="plan-item-id">${escapeHtml(plan.id)}</span>
        <span class="plan-item-status status-${escapeHtml(plan.status)}">${formatStatus(plan.status)}</span>
      </div>
      <div class="plan-item-title">${escapeHtml(plan.title)}</div>
      <div class="plan-item-meta">
        <span>${plan.storiesCount} stories</span>
        <span>${plan.tasksCount} tasks</span>
      </div>
    </div>
  `).join('');
}

function renderRequirementsList() {
  const container = document.getElementById('plansList');
  document.getElementById('plansSwitchCount').textContent = `(${plans.length})`;
  document.getElementById('requirementsSwitchCount').textContent = `(${requirements.length})`;

  renderStatusFilters();
  const filteredRequirements = getFilteredItems('requirements');

  if (!filteredRequirements.length) {
    container.innerHTML = '<div class="empty-state empty-state-padded">No requirements match the selected status filters.</div>';
    return;
  }

  container.innerHTML = filteredRequirements.map(req => `
    <div class="plan-item" data-id="${escapeHtml(req.id)}" onclick="selectRequirementByEncodedId('${encodeURIComponent(req.id)}')">
      <div class="plan-item-header">
        <span class="plan-item-id">${escapeHtml(req.id)}</span>
        <span class="plan-item-status status-${escapeHtml(req.status || 'pending')}">${formatStatus(req.status || 'pending')}</span>
      </div>
      <div class="plan-item-title">${escapeHtml(req.title || req.id)}</div>
      <div class="plan-item-meta">
        <span>${req.functionalCount || 0} RF</span>
        <span>${req.nonFunctionalCount || 0} RNF</span>
        <span>${req.storiesCount || 0} US</span>
      </div>
    </div>
  `).join('');
}

function getItemStatus(item, section) {
  if (section === 'requirements') {
    return String(item?.status || 'pending').trim().toLowerCase();
  }
  return String(item?.status || 'pending').trim().toLowerCase();
}

function getStatusesForSection(section) {
  const source = section === 'requirements' ? requirements : plans;
  const statuses = Array.from(new Set(source.map(item => getItemStatus(item, section)).filter(Boolean)));
  const orderMap = new Map(STATUS_SORT_ORDER.map((status, index) => [status, index]));

  return statuses.sort((a, b) => {
    const aRank = orderMap.has(a) ? orderMap.get(a) : Number.MAX_SAFE_INTEGER;
    const bRank = orderMap.has(b) ? orderMap.get(b) : Number.MAX_SAFE_INTEGER;
    if (aRank !== bRank) return aRank - bRank;
    return a.localeCompare(b);
  });
}

function syncSectionFilterState(section, statuses) {
  const current = sectionStatusFilters[section] || new Set();
  const catalog = sectionStatusCatalog[section] || new Set();
  if (!current.size) {
    sectionStatusFilters[section] = new Set(statuses);
    sectionStatusCatalog[section] = new Set(statuses);
    return;
  }

  const next = new Set(Array.from(current).filter(status => statuses.includes(status)));
  statuses.forEach(status => {
    if (!catalog.has(status)) next.add(status);
  });

  sectionStatusCatalog[section] = new Set(statuses);
  sectionStatusFilters[section] = next;
}

function getFilteredItems(section) {
  const source = section === 'requirements' ? requirements : plans;
  const enabledStatuses = sectionStatusFilters[section] || new Set();
  return source.filter(item => enabledStatuses.has(getItemStatus(item, section)));
}

function renderStatusFilters() {
  const filtersRoot = document.getElementById('statusFilters');
  if (!filtersRoot) return;

  const statuses = getStatusesForSection(currentSection);
  syncSectionFilterState(currentSection, statuses);

  if (!statuses.length) {
    filtersRoot.innerHTML = '';
    filtersRoot.classList.add('is-empty');
    return;
  }

  const activeSet = sectionStatusFilters[currentSection] || new Set();
  filtersRoot.classList.remove('is-empty');
  filtersRoot.innerHTML = statuses.map(status => `
    <label class="status-filter-option" title="${escapeHtml(formatStatus(status))}">
      <input type="checkbox" data-status="${escapeHtml(status)}" ${activeSet.has(status) ? 'checked' : ''}>
      <span>${escapeHtml(formatStatus(status))}</span>
    </label>
  `).join('');
}

async function selectPlan(id) {
  if (currentSection !== 'plans') return;
  document.querySelectorAll('.plan-item').forEach(el => el.classList.remove('active'));
  document.querySelector(`.plan-item[data-id="${CSS.escape(id)}"]`)?.classList.add('active');

  const res = await fetch(`/api/plans/${encodeURIComponent(id)}`, { cache: 'no-store' });
  currentPlan = await res.json();
  editingTaskDodId = null;
  taskDodFocusTarget = null;
  isPlanNotesEditing = false;
  isPlanNotesUpdating = false;
  isPlanObjectiveEditing = false;
  isPlanObjectiveUpdating = false;
  isPlanPhasesEditing = false;
  isPlanPhasesUpdating = false;
  editingPlanPhases = [];
  editingTaskNotesId = null;
  isTaskNotesUpdating = false;
  editingTaskImplementationNotesId = null;
  isTaskImplementationNotesUpdating = false;
  openTaskNotesIds = new Set();
  editingTaskField = null;
  isTaskFieldUpdating = false;
  editingPlanDecisionId = null;
  isPlanDecisionUpdating = false;
  creatingPlanDecision = false;
  creatingPlanDecisionStep = 'id';
  newPlanDecisionId = '';
  newPlanDecisionDescription = '';
  newPlanDecisionRationale = '';
  deletingPlanDecisionId = null;
  renderPlanDetail();
  scrollWorkspaceToTop();
}

function renderPlanDetail() {
  const p = currentPlan;
  const tasks = Array.isArray(p.tasks) ? p.tasks : [];
  const effectivePlanStatus = p.status || 'pending';
  const activeTab = document.querySelector('.tab.active')?.dataset.tab || 'overview';

  showDetail();
  configurePlanTabs(activeTab);

  document.getElementById('detailId').textContent = p.id;
  document.getElementById('detailTitle').textContent = p.title;
  document.getElementById('detailStatus').textContent = formatStatus(effectivePlanStatus);
  document.getElementById('detailStatus').className = `plan-item-status status-${effectivePlanStatus}`;
  document.getElementById('detailCreated').textContent = p.created || 'N/A';
  document.getElementById('detailLastUpdated').textContent = p.lastUpdated || 'N/A';
  document.getElementById('detailRequirementsLabel').textContent = 'Requirements: ';
  document.getElementById('detailRequirements').textContent = p.requirements || 'None';

  const storiesDone = p.stories?.filter(s => normalizeStoryStatus(s.status) === 'completed').length || 0;
  const tasksDone = tasks.filter(t => t.status === 'completed').length;
  const tasksTotal = tasks.length;

  document.getElementById('overviewCount').textContent = `${storiesDone}/${p.stories?.length || 0}`;
  document.getElementById('storiesCount').textContent = p.stories?.length || 0;
  document.getElementById('tasksCount').textContent = `${tasksDone}/${tasksTotal}`;
  document.getElementById('decisionsCount').textContent = p.decisions?.length || 0;

  document.getElementById('statsGrid').innerHTML = `
    <div class="stat-card stat-stories"><div class="stat-value">${p.stories?.length || 0}</div><div class="stat-label">Stories</div></div>
    <div class="stat-card stat-stories-done"><div class="stat-value">${storiesDone}</div><div class="stat-label">Stories Done</div></div>
    <div class="stat-card stat-tasks"><div class="stat-value">${tasksTotal}</div><div class="stat-label">Tasks</div></div>
    <div class="stat-card stat-tasks-done"><div class="stat-value">${tasksDone}</div><div class="stat-label">Tasks Done</div></div>
  `;

  const tasksById = new Map(tasks.map(task => [task.id, task]));
  const phases = Array.isArray(p.phases) ? p.phases : [];
  const phasesChips = phases.length
    ? `<div class="chips">${phases.map(ph => {
      const title = (ph?.title || '').trim();
      const ids = Array.isArray(ph?.tasks) ? ph.tasks : [];
      const done = ids.length ? ids.filter(id => tasksById.get(id)?.status === 'completed').length : 0;
      return `<span class="chip">${escapeHtml(title)}${ids.length ? ` (${done}/${ids.length})` : ''}</span>`;
    }).join('')}</div>`
    : '';
  const planPhasesSection = isPlanPhasesEditing
    ? `
      <div class="section-card">
        <div class="task-dod-title">
          <span>Phases</span>
          <span class="task-dod-hint">Edit mode attiva</span>
        </div>
        <div class="plan-phases-form">
          ${editingPlanPhases.map((phase, phaseIndex) => {
            const selectedTaskIds = Array.isArray(phase.tasks) ? phase.tasks : [];
            const taskOptions = tasks.map(task => `
              <label class="task-depends-on-option">
                <input
                  type="checkbox"
                  ${selectedTaskIds.includes(task.id) ? 'checked' : ''}
                  ${isPlanPhasesUpdating ? 'disabled' : ''}
                  onchange="togglePlanPhaseTaskByEncodedId(event, ${phaseIndex}, '${encodeURIComponent(task.id)}')">
                <span><code>${escapeHtml(task.id)}</code>${task.title ? ` - ${escapeHtml(task.title)}` : ''}</span>
              </label>
            `).join('');

            return `
              <div class="plan-phase-editor-row">
                <div class="plan-phase-editor-head">
                  <label class="open-question-label" for="plan-phase-title-${phaseIndex}">Fase ${phaseIndex + 1}</label>
                  <button type="button" class="icon-action-btn" onclick="removePlanPhaseFromEvent(event, ${phaseIndex})" ${isPlanPhasesUpdating ? 'disabled' : ''} aria-label="Rimuovi fase" title="Rimuovi fase">−</button>
                </div>
                <input
                  id="plan-phase-title-${phaseIndex}"
                  class="task-inline-input"
                  type="text"
                  value="${escapeHtml(phase.title || '')}"
                  ${isPlanPhasesUpdating ? 'disabled' : ''}
                  oninput="updatePlanPhaseTitleFromEvent(event, ${phaseIndex})"
                >
                <div class="task-depends-on-options">
                  ${taskOptions || '<div class="empty-state">Nessun task disponibile</div>'}
                </div>
              </div>
            `;
          }).join('')}
          <div class="plan-notes-actions">
            <button type="button" class="open-question-btn is-secondary" onclick="addPlanPhaseFromEvent(event)" ${isPlanPhasesUpdating ? 'disabled' : ''}>+ Fase</button>
            <button type="button" class="open-question-btn" onclick="savePlanPhasesFromEvent(event)" ${isPlanPhasesUpdating ? 'disabled' : ''}>Salva</button>
            <button type="button" class="open-question-btn is-secondary" onclick="cancelPlanPhasesEditFromEvent(event)" ${isPlanPhasesUpdating ? 'disabled' : ''}>Annulla</button>
          </div>
        </div>
      </div>
    `
    : `
      <div class="section-card">
        <div class="section-title-row">
          <div class="section-title">Phases</div>
          <button type="button" class="icon-action-btn${phases.length ? '' : ' is-add'}" onclick="enablePlanPhasesEditFromEvent(event)" aria-label="${phases.length ? 'Modifica phases piano' : 'Aggiungi phases piano'}" title="${phases.length ? 'Modifica phases piano' : 'Aggiungi phases piano'}">${phases.length ? '✎' : ADD_ICON_SVG}</button>
        </div>
        ${phasesChips || ''}
      </div>
    `;

  const currentNotes = typeof p.notes === 'string' ? p.notes : '';
  const currentObjective = typeof p.objective === 'string' ? p.objective : '';
  const planObjectiveSection = isPlanObjectiveEditing
    ? `
      <div class="section-card">
        <div class="task-dod-title">
          <span>Objective</span>
          <span class="task-dod-hint">Edit mode attiva</span>
        </div>
        <div class="plan-notes-form">
          <textarea id="plan-objective-input" class="plan-notes-input" rows="5" ${isPlanObjectiveUpdating ? 'disabled' : ''}>${escapeHtml(currentObjective)}</textarea>
          <div class="plan-notes-actions">
            <button type="button" class="open-question-btn" onclick="savePlanObjectiveFromEvent(event)" ${isPlanObjectiveUpdating ? 'disabled' : ''}>Salva</button>
            <button type="button" class="open-question-btn is-secondary" onclick="cancelPlanObjectiveEditFromEvent(event)" ${isPlanObjectiveUpdating ? 'disabled' : ''}>Annulla</button>
          </div>
        </div>
      </div>
    `
    : `
      <div class="section-card">
        <div class="section-title-row">
          <div class="section-title">Objective</div>
          <button type="button" class="icon-action-btn${currentObjective ? '' : ' is-add'}" onclick="enablePlanObjectiveEditFromEvent(event)" aria-label="${currentObjective ? 'Modifica objective piano' : 'Aggiungi objective piano'}" title="${currentObjective ? 'Modifica objective piano' : 'Aggiungi objective piano'}">${currentObjective ? '✎' : ADD_ICON_SVG}</button>
        </div>
        ${currentObjective ? `<div class="section-body">${escapeHtml(currentObjective)}</div>` : ''}
      </div>
    `;
  const planNotesSection = isPlanNotesEditing
    ? `
      <div class="section-card">
        <div class="task-dod-title">
          <span>Notes</span>
          <span class="task-dod-hint">Edit mode attiva</span>
        </div>
        <div class="plan-notes-form">
          <textarea id="plan-notes-input" class="plan-notes-input" rows="6" ${isPlanNotesUpdating ? 'disabled' : ''}>${escapeHtml(currentNotes)}</textarea>
          <div class="plan-notes-actions">
            <button type="button" class="open-question-btn" onclick="savePlanNotesFromEvent(event)" ${isPlanNotesUpdating ? 'disabled' : ''}>Salva</button>
            <button type="button" class="open-question-btn is-secondary" onclick="cancelPlanNotesEditFromEvent(event)" ${isPlanNotesUpdating ? 'disabled' : ''}>Annulla</button>
          </div>
        </div>
      </div>
    `
    : `
      <div class="section-card">
        <div class="section-title-row">
          <div class="section-title">Notes</div>
          <button type="button" class="icon-action-btn${currentNotes ? '' : ' is-add'}" onclick="enablePlanNotesEditFromEvent(event)" aria-label="${currentNotes ? 'Modifica note piano' : 'Aggiungi note piano'}" title="${currentNotes ? 'Modifica note piano' : 'Aggiungi note piano'}">${currentNotes ? '✎' : ADD_ICON_SVG}</button>
        </div>
        ${currentNotes ? `<div class="section-body">${escapeHtml(currentNotes)}</div>` : ''}
      </div>
    `;

  document.getElementById('overviewContent').innerHTML = `
    <div class="overview-sections reading-flow">
      <div id="anchor-overview-objective">${planObjectiveSection}</div>
      ${p.targetArchitecture ? `<div id="anchor-overview-architecture"><div class="section-card"><div class="section-title">Target Architecture</div><div class="section-body">${escapeHtml(p.targetArchitecture)}</div></div></div>` : ''}
      <div id="anchor-overview-phases">${planPhasesSection}</div>
      <div id="anchor-overview-notes">${planNotesSection}</div>
    </div>
  `;

  const storiesContent = p.stories?.map(s => {
    const storyStatus = normalizeStoryStatus(s.status);
    const taskList = Array.isArray(s.tasks) ? s.tasks.join(', ') : String(s.tasks || '');
    return `
      <div class="story-item" id="anchor-story-${escapeHtml(s.id)}">
        <div class="story-header">
          <span class="story-id">${escapeHtml(s.id)}</span>
          <span class="story-status status-${storyStatus}">${formatStatus(storyStatus)}</span>
        </div>
        <div class="story-description">${escapeHtml(s.description || '')}</div>
        <div class="story-tasks">Tasks: ${escapeHtml(taskList)}</div>
      </div>
    `;
  }).join('') || '<p class="empty-state">No stories defined</p>';
  document.getElementById('storiesList').innerHTML = `<div class="section-title-row compact"><div class="section-title">Stories</div></div>${storiesContent}`;

  const tasksContent = tasks.map(t => {
    const titleValue = String(t.title || '');
    const phaseValue = String(t.phase || '');
    const whatToDoValue = String(t.whatToDo || '');
    const filesValue = Array.isArray(t.files) ? t.files : [];
    const dependsOnValue = Array.isArray(t.dependsOn) ? t.dependsOn : [];
    const dependsOptions = tasks
      .filter(candidate => candidate.id !== t.id)
      .map(candidate => `
        <label class="task-depends-on-option">
          <input type="checkbox" value="${escapeHtml(candidate.id)}" ${dependsOnValue.includes(candidate.id) ? 'checked' : ''} ${isTaskFieldUpdating ? 'disabled' : ''}>
          <span><code>${escapeHtml(candidate.id)}</code>${candidate.title ? ` - ${escapeHtml(candidate.title)}` : ''}</span>
        </label>
      `)
      .join('');

    return `
    <div class="task-item" id="anchor-task-${escapeHtml(t.id)}">
      <div class="task-header">
        <span class="task-id">${escapeHtml(t.id)}</span>
        <div class="task-meta">
          <span class="task-size">${escapeHtml(t.size || '-')}</span>
          <div class="task-status-dropdown status-${escapeHtml(t.status)}">
            <button type="button" class="task-status-trigger status-${escapeHtml(t.status)}" onclick="toggleTaskStatusDropdown(this)">
              <span class="task-status-label">${formatStatus(t.status)}</span>
              <span class="task-status-caret">▾</span>
            </button>
            <div class="task-status-menu">
              ${TASK_STATUSES.map(status => `
                <button
                  type="button"
                  class="task-status-option status-${status}${status === t.status ? ' is-current' : ''}"
                  onclick="handleTaskStatusChangeByEncodedId('${encodeURIComponent(t.id)}', '${status}', this)">
                  ${formatStatus(status)}
                </button>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
      
      <div class="task-primary-section">
        ${isTaskFieldEditing(t.id, 'primary')
          ? `
            <div class="task-notes-form" onclick="event.stopPropagation()">
              <label class="open-question-label" for="task-title-${escapeHtml(t.id)}">Title</label>
              <input id="task-title-${escapeHtml(t.id)}" class="task-inline-input" type="text" value="${escapeHtml(titleValue)}" ${isTaskFieldUpdating ? 'disabled' : ''}>
              <label class="open-question-label" for="task-whatToDo-${escapeHtml(t.id)}">What to do</label>
              <textarea id="task-whatToDo-${escapeHtml(t.id)}" class="task-notes-input" rows="5" ${isTaskFieldUpdating ? 'disabled' : ''}>${escapeHtml(whatToDoValue)}</textarea>
              <div class="task-notes-actions">
                <button type="button" class="open-question-btn" onclick="saveTaskFieldByEncodedIds(event, '${encodeURIComponent(p.id)}', '${encodeURIComponent(t.id)}', 'primary')" ${isTaskFieldUpdating ? 'disabled' : ''}>Salva</button>
                <button type="button" class="open-question-btn is-secondary" onclick="cancelTaskFieldEditFromEvent(event)" ${isTaskFieldUpdating ? 'disabled' : ''}>Annulla</button>
              </div>
            </div>
          `
          : `
            <div class="task-primary-header">
              ${titleValue ? `<div class="task-title">${escapeHtml(titleValue)}</div>` : '<div class="task-title task-title-empty">Titolo non impostato</div>'}
              <button type="button" class="icon-action-btn" onclick="enableTaskFieldEditByEncodedId(event, '${encodeURIComponent(t.id)}', 'primary')" aria-label="Modifica titolo e what to do task" title="Modifica titolo e what to do task">✎</button>
            </div>
            <div class="task-meta-label">What to do</div>
            ${whatToDoValue ? `<div class="task-what">${escapeHtml(whatToDoValue)}</div>` : '<div class="task-what task-meta-empty">Nessun what to do impostato</div>'}
          `}
      </div>

      <div class="task-meta-section">
        <div class="task-meta-title">Task context</div>
        <div class="task-meta-row">
          <span class="task-meta-label">Phase</span>
          <div class="task-meta-value">
            ${isTaskFieldEditing(t.id, 'phase')
              ? `
                <div class="task-meta-editor">
                  <input id="task-phase-${escapeHtml(t.id)}" type="hidden" value="${escapeHtml(phaseValue)}">
                  <div class="task-status-dropdown task-phase-dropdown${isTaskFieldUpdating ? ' is-updating' : ''}">
                    <button type="button" class="task-status-trigger task-phase-trigger" onclick="toggleTaskPhaseDropdown(this)" ${isTaskFieldUpdating ? 'disabled' : ''}>
                      <span class="task-status-label">${escapeHtml(phaseValue || 'Select phase')}</span>
                      <span class="task-status-caret">▾</span>
                    </button>
                    <div class="task-status-menu">
                      ${(Array.isArray(p.phases) ? p.phases : []).map(phase => {
                        const title = String(phase?.title || '').trim();
                        if (!title) return '';
                        return `<button type="button" class="task-status-option${title === phaseValue ? ' is-current' : ''}" onclick="handleTaskPhaseSelectByEncodedId('${encodeURIComponent(t.id)}', '${encodeURIComponent(title)}', this)">${escapeHtml(title)}</button>`;
                      }).join('')}
                    </div>
                  </div>
                  <div class="task-notes-actions">
                    <button type="button" class="open-question-btn" onclick="saveTaskFieldByEncodedIds(event, '${encodeURIComponent(p.id)}', '${encodeURIComponent(t.id)}', 'phase')" ${isTaskFieldUpdating ? 'disabled' : ''}>Salva</button>
                    <button type="button" class="open-question-btn is-secondary" onclick="cancelTaskFieldEditFromEvent(event)" ${isTaskFieldUpdating ? 'disabled' : ''}>Annulla</button>
                  </div>
                </div>
              `
              : `${phaseValue ? `<code>${escapeHtml(phaseValue)}</code>` : '<span class="task-meta-empty">-</span>'}<button type="button" class="icon-action-btn${phaseValue ? '' : ' is-add'}" onclick="enableTaskFieldEditByEncodedId(event, '${encodeURIComponent(t.id)}', 'phase')">${phaseValue ? '✎' : ADD_ICON_SVG}</button>`}
          </div>
        </div>
        <div class="task-meta-row">
          <span class="task-meta-label">Depends on</span>
          <div class="task-meta-value">
            ${isTaskFieldEditing(t.id, 'dependsOn')
              ? `
                <div class="task-meta-editor">
                  <div id="task-depends-on-editor-${escapeHtml(t.id)}" class="task-depends-on-options">${dependsOptions || '<div class="task-notes">Nessun task disponibile</div>'}</div>
                  <div class="task-notes-actions">
                    <button type="button" class="open-question-btn" onclick="saveTaskFieldByEncodedIds(event, '${encodeURIComponent(p.id)}', '${encodeURIComponent(t.id)}', 'dependsOn')" ${isTaskFieldUpdating ? 'disabled' : ''}>Salva</button>
                    <button type="button" class="open-question-btn is-secondary" onclick="cancelTaskFieldEditFromEvent(event)" ${isTaskFieldUpdating ? 'disabled' : ''}>Annulla</button>
                  </div>
                </div>
              `
              : `${dependsOnValue.length ? dependsOnValue.map(item => `<code>${escapeHtml(item)}</code>`).join(' ') : '<span class="task-meta-empty">-</span>'}<button type="button" class="icon-action-btn${dependsOnValue.length ? '' : ' is-add'}" onclick="enableTaskFieldEditByEncodedId(event, '${encodeURIComponent(t.id)}', 'dependsOn')">${dependsOnValue.length ? '✎' : ADD_ICON_SVG}</button>`}
          </div>
        </div>
        <div class="task-meta-row">
          <span class="task-meta-label">Files</span>
          <div class="task-meta-value">
            ${isTaskFieldEditing(t.id, 'files')
              ? `
                <div class="task-meta-editor">
                  <textarea id="task-files-${escapeHtml(t.id)}" class="task-notes-input" rows="4" ${isTaskFieldUpdating ? 'disabled' : ''}>${escapeHtml(filesValue.join('\n'))}</textarea>
                  <div class="task-notes-actions">
                    <button type="button" class="open-question-btn" onclick="saveTaskFieldByEncodedIds(event, '${encodeURIComponent(p.id)}', '${encodeURIComponent(t.id)}', 'files')" ${isTaskFieldUpdating ? 'disabled' : ''}>Salva</button>
                    <button type="button" class="open-question-btn is-secondary" onclick="cancelTaskFieldEditFromEvent(event)" ${isTaskFieldUpdating ? 'disabled' : ''}>Annulla</button>
                  </div>
                </div>
              `
              : `${filesValue.length ? filesValue.map(f => `<code>${escapeHtml(f)}</code>`).join(' ') : '<span class="task-meta-empty">-</span>'}<button type="button" class="icon-action-btn${filesValue.length ? '' : ' is-add'}" onclick="enableTaskFieldEditByEncodedId(event, '${encodeURIComponent(t.id)}', 'files')">${filesValue.length ? '✎' : ADD_ICON_SVG}</button>`}
          </div>
        </div>
        <div class="task-meta-row">
          <span class="task-meta-label">Endpoints</span>
          <div class="task-meta-value">
            ${isTaskFieldEditing(t.id, 'endpoints')
              ? `
                <div class="task-meta-editor">
                  <textarea id="task-endpoints-${escapeHtml(t.id)}" class="task-notes-input" rows="4" ${isTaskFieldUpdating ? 'disabled' : ''}>${escapeHtml((Array.isArray(t.endpoints) ? t.endpoints : []).join('\n'))}</textarea>
                  <div class="task-notes-actions">
                    <button type="button" class="open-question-btn" onclick="saveTaskFieldByEncodedIds(event, '${encodeURIComponent(p.id)}', '${encodeURIComponent(t.id)}', 'endpoints')" ${isTaskFieldUpdating ? 'disabled' : ''}>Salva</button>
                    <button type="button" class="open-question-btn is-secondary" onclick="cancelTaskFieldEditFromEvent(event)" ${isTaskFieldUpdating ? 'disabled' : ''}>Annulla</button>
                  </div>
                </div>
              `
              : `${t.endpoints?.length ? t.endpoints.map(e => `<code>${escapeHtml(e)}</code>`).join(' ') : '<span class="task-meta-empty">-</span>'}<button type="button" class="icon-action-btn${t.endpoints?.length ? '' : ' is-add'}" onclick="enableTaskFieldEditByEncodedId(event, '${encodeURIComponent(t.id)}', 'endpoints')">${t.endpoints?.length ? '✎' : ADD_ICON_SVG}</button>`}
          </div>
        </div>
      </div>



      ${t.definitionOfDone?.length ? `
        <div
          class="task-dod${editingTaskDodId === t.id ? ' is-editing' : ''}${isTaskDodUpdating ? ' is-busy' : ''}"
          data-task-id="${encodeURIComponent(t.id)}"
          role="button"
          tabindex="0"
          aria-label="Apri modalita modifica definition of done"
          aria-expanded="${editingTaskDodId === t.id ? 'true' : 'false'}"
          onclick="enableTaskDodEditByEncodedId('${encodeURIComponent(t.id)}')"
          onkeydown="handleTaskDodRegionKeydown(event, '${encodeURIComponent(t.id)}')">
          <div class="task-dod-title">
            <span>Definition of Done:</span>
            <span class="task-dod-hint">${editingTaskDodId === t.id ? 'Edit mode attiva' : 'Clicca per modificare'}</span>
            ${editingTaskDodId === t.id ? `<button type="button" class="task-dod-exit" onclick="disableTaskDodEditFromEvent(event)">Fine modifica</button>` : ''}
          </div>
          ${t.definitionOfDone.map((d, index) => editingTaskDodId === t.id
            ? `
              <button type="button" class="task-dod-item task-dod-toggle${d.completed ? ' is-completed' : ''}" onclick="toggleTaskDodItemByEncodedIds(event, '${encodeURIComponent(p.id)}', '${encodeURIComponent(t.id)}', ${index}, ${d.completed ? 'false' : 'true'})" onkeydown="handleAcceptanceItemKeydown(event)" ${isTaskDodUpdating ? 'disabled' : ''}>
                <span class="task-dod-bullet">${d.completed ? '✓' : '○'}</span>
                <span>${escapeHtml(d.description || '')}</span>
              </button>
            `
            : `
              <div class="task-dod-item${d.completed ? ' is-completed' : ''}">
                <span class="task-dod-bullet">${d.completed ? '✓' : '○'}</span>
                <span>${escapeHtml(d.description || '')}</span>
              </div>
            `
          ).join('')}
        </div>
      ` : ''}
      <details class="summary-block" ${openTaskNotesIds.has(t.id) || editingTaskNotesId === t.id || editingTaskImplementationNotesId === t.id ? 'open' : ''} ontoggle="handleTaskNotesDetailsToggleByEncodedId(event, '${encodeURIComponent(t.id)}')">
        <summary>Notes</summary>
        ${editingTaskImplementationNotesId === t.id ? `
          <div class="task-notes-form" onclick="event.stopPropagation()">
            <label class="open-question-label" for="task-implementation-notes-${escapeHtml(t.id)}">Implementation Notes</label>
            <textarea
              id="task-implementation-notes-${escapeHtml(t.id)}"
              class="task-notes-input"
              rows="5"
              ${isTaskImplementationNotesUpdating ? 'disabled' : ''}
            >${escapeHtml(t.implementationNotes || '')}</textarea>
            <div class="task-notes-actions">
              <button type="button" class="open-question-btn" onclick="saveTaskImplementationNotesByEncodedIds(event, '${encodeURIComponent(p.id)}', '${encodeURIComponent(t.id)}')" ${isTaskImplementationNotesUpdating ? 'disabled' : ''}>Salva</button>
              <button type="button" class="open-question-btn is-secondary" onclick="cancelTaskImplementationNotesEditFromEvent(event)" ${isTaskImplementationNotesUpdating ? 'disabled' : ''}>Annulla</button>
            </div>
          </div>
        ` : `
          <div class="task-notes-title-row">
            <strong>Implementation Notes</strong>
            <button type="button" class="icon-action-btn${t.implementationNotes ? '' : ' is-add'}" onclick="enableTaskImplementationNotesEditByEncodedId(event, '${encodeURIComponent(t.id)}')" aria-label="${t.implementationNotes ? 'Modifica implementation notes' : 'Aggiungi implementation notes'}" title="${t.implementationNotes ? 'Modifica implementation notes' : 'Aggiungi implementation notes'}">${t.implementationNotes ? '✎' : ADD_ICON_SVG}</button>
          </div>
          ${t.implementationNotes ? `<div class="task-notes">${escapeHtml(t.implementationNotes)}</div>` : ''}
        `}
        ${editingTaskNotesId === t.id ? `
          <div class="task-notes-form" onclick="event.stopPropagation()">
            <label class="open-question-label" for="task-notes-${escapeHtml(t.id)}">Task Notes</label>
            <textarea
              id="task-notes-${escapeHtml(t.id)}"
              class="task-notes-input"
              rows="5"
              ${isTaskNotesUpdating ? 'disabled' : ''}
            >${escapeHtml(t.notes || '')}</textarea>
            <div class="task-notes-actions">
              <button type="button" class="open-question-btn" onclick="saveTaskNotesByEncodedIds(event, '${encodeURIComponent(p.id)}', '${encodeURIComponent(t.id)}')" ${isTaskNotesUpdating ? 'disabled' : ''}>Salva</button>
              <button type="button" class="open-question-btn is-secondary" onclick="cancelTaskNotesEditFromEvent(event)" ${isTaskNotesUpdating ? 'disabled' : ''}>Annulla</button>
            </div>
          </div>
        ` : `
          <div class="task-notes-title-row">
            <strong>Task Notes</strong>
            <button type="button" class="icon-action-btn${t.notes ? '' : ' is-add'}" onclick="enableTaskNotesEditByEncodedId(event, '${encodeURIComponent(t.id)}')" aria-label="${t.notes ? 'Modifica task notes' : 'Aggiungi task notes'}" title="${t.notes ? 'Modifica task notes' : 'Aggiungi task notes'}">${t.notes ? '✎' : ADD_ICON_SVG}</button>
          </div>
          ${t.notes ? `<div class="task-notes">${escapeHtml(t.notes)}</div>` : ''}
        `}
      </details>
    </div>
  `;
  }).join('') || '<p class="empty-state">No tasks defined</p>';
  document.getElementById('tasksList').innerHTML = `<div class="section-title-row compact"><div class="section-title">Tasks</div></div>${tasksContent}`;

  document.getElementById('decisionsList').innerHTML = renderPlanDecisionItems(Array.isArray(p.decisions) ? p.decisions : []);

  restoreTaskDodFocusIfNeeded();
  buildRightNav();
}

async function selectRequirement(id) {
  if (currentSection !== 'requirements') return;
  document.querySelectorAll('.plan-item').forEach(el => el.classList.remove('active'));
  document.querySelector(`.plan-item[data-id="${CSS.escape(id)}"]`)?.classList.add('active');

  const res = await fetch(`/api/requirements/${encodeURIComponent(id)}`);
  currentRequirement = await res.json();
  editingAcceptanceStoryId = null;
  acceptanceFocusTarget = null;
  editingOpenQuestionId = null;
  isRequirementOverviewEditing = false;
  isRequirementOverviewUpdating = false;
  isRequirementCurrentStateEditing = false;
  isRequirementCurrentStateUpdating = false;
  isRequirementNotesEditing = false;
  isRequirementNotesUpdating = false;
  editingFunctionalRequirementId = null;
  isFunctionalRequirementUpdating = false;
  creatingFunctionalRequirement = false;
  newFunctionalRequirementId = '';
  creatingFunctionalRequirementStep = 'id';
  newFunctionalRequirementTitle = '';
  newFunctionalRequirementDescription = '';
  deletingFunctionalRequirementId = null;
  editingNonFunctionalRequirementId = null;
  isNonFunctionalRequirementUpdating = false;
  creatingNonFunctionalRequirement = false;
  newNonFunctionalRequirementId = '';
  creatingNonFunctionalRequirementStep = 'id';
  newNonFunctionalRequirementTitle = '';
  newNonFunctionalRequirementDescription = '';
  deletingNonFunctionalRequirementId = null;
  editingStoryId = null;
  isStoryUpdating = false;
  creatingStory = false;
  creatingStoryStep = 'id';
  newStoryId = '';
  deletingStoryId = null;
  creatingOpenQuestion = false;
  creatingOpenQuestionStep = 'id';
  newOpenQuestionId = '';
  newOpenQuestionQuestion = '';
  newOpenQuestionAnswer = 'Non definito nel documento; richiesta conferma.';
  newOpenQuestionStatus = 'open';
  deletingOpenQuestionId = null;
  renderRequirementDetail();
  scrollWorkspaceToTop();
}

function scrollWorkspaceToTop() {
  const contentEl = document.querySelector('.content');
  contentEl?.scrollTo({ top: 0, behavior: 'instant' });
}

function renderRequirementDetail() {
  const data = currentRequirement;
  const doc = data.document || {};
  const rf = data.functionalRequirements || [];
  const rnf = data.nonFunctionalRequirements || [];
  const decisions = data.architecturalDecisions || [];
  const stories = data.userStories || [];
  const openQuestions = data.openQuestions || [];
  const activeTab = document.querySelector('.tab.active')?.dataset.tab || 'overview';

  showDetail();
  configureRequirementTabs(decisions.length > 0, activeTab);

  document.getElementById('detailId').textContent = doc.id || 'N/A';
  document.getElementById('detailTitle').textContent = doc.title || 'Requirement';
  document.getElementById('detailStatus').textContent = formatStatus(doc.status || 'draft');
  document.getElementById('detailStatus').className = `plan-item-status status-${doc.status || 'pending'}`;
  document.getElementById('detailCreated').textContent = doc.version || 'N/A';
  document.getElementById('detailLastUpdated').textContent = doc.language || 'N/A';
  document.getElementById('detailRequirementsLabel').textContent = 'Source: ';
  document.getElementById('detailRequirements').textContent = doc.sourcePath || 'N/A';

  document.getElementById('overviewCount').textContent = rf.length + rnf.length + stories.length;
  document.getElementById('functionalCount').textContent = rf.length;
  document.getElementById('architecturalDecisionsCount').textContent = decisions.length;
  document.getElementById('nonFunctionalCount').textContent = rnf.length;
  document.getElementById('userStoriesCount').textContent = stories.length;
  document.getElementById('openQuestionsCount').textContent = openQuestions.length;

  document.getElementById('statsGrid').innerHTML = `
    <div class="stat-card stat-stories"><div class="stat-value">${rf.length}</div><div class="stat-label">Functional Requirements</div></div>
    <div class="stat-card stat-tasks"><div class="stat-value">${rnf.length}</div><div class="stat-label">Non-Functional Requirements</div></div>
    <div class="stat-card stat-stories-done"><div class="stat-value">${decisions.length}</div><div class="stat-label">Architectural Decisions</div></div>
    <div class="stat-card stat-tasks-done"><div class="stat-value">${stories.length}</div><div class="stat-label">User Stories</div></div>
  `;

  const currentOverview = typeof data.overview === 'string' ? data.overview : '';
  const overviewSection = isRequirementOverviewEditing
    ? `
      <div class="section-card">
        <div class="task-dod-title">
          <span>Overview</span>
          <span class="task-dod-hint">Edit mode attiva</span>
        </div>
        <div class="plan-notes-form">
          <textarea id="requirement-overview-input" class="plan-notes-input" rows="6" ${isRequirementOverviewUpdating ? 'disabled' : ''}>${escapeHtml(currentOverview)}</textarea>
          <div class="plan-notes-actions">
            <button type="button" class="open-question-btn" onclick="saveRequirementOverviewFromEvent(event)" ${isRequirementOverviewUpdating ? 'disabled' : ''}>Salva</button>
            <button type="button" class="open-question-btn is-secondary" onclick="cancelRequirementOverviewEditFromEvent(event)" ${isRequirementOverviewUpdating ? 'disabled' : ''}>Annulla</button>
          </div>
        </div>
      </div>
    `
    : `
      <div class="section-card">
        <div class="section-title-row">
          <div class="section-title">Overview</div>
          <button type="button" class="icon-action-btn${currentOverview ? '' : ' is-add'}" onclick="enableRequirementOverviewEditFromEvent(event)" aria-label="${currentOverview ? 'Modifica overview requirement' : 'Aggiungi overview requirement'}" title="${currentOverview ? 'Modifica overview requirement' : 'Aggiungi overview requirement'}">${currentOverview ? '✎' : ADD_ICON_SVG}</button>
        </div>
        ${currentOverview ? `<div class="section-body">${escapeHtml(currentOverview)}</div>` : ''}
      </div>
    `;

  const overviewChunks = [`<div id="anchor-overview-overview">${overviewSection}</div>`];
  const currentState = Array.isArray(data.currentState) ? data.currentState : [];
  const currentStateSection = isRequirementCurrentStateEditing
    ? `
      <div class="section-card">
        <div class="task-dod-title">
          <span>Current State</span>
          <span class="task-dod-hint">Edit mode attiva</span>
        </div>
        <div class="plan-notes-form current-state-form">
          <div class="current-state-table-wrap">
            <table class="decisions-table current-state-table">
              <thead>
                <tr>
                  <th>Area</th>
                  <th>Status</th>
                  <th>Notes</th>
                  <th class="current-state-actions-col">Azioni</th>
                </tr>
              </thead>
              <tbody id="requirement-current-state-body">
                ${(currentState.length ? currentState : [{}]).map(row => `
                  <tr>
                    <td><input type="text" class="plan-notes-input current-state-input" data-field="area" value="${escapeHtml(row?.area || '')}" ${isRequirementCurrentStateUpdating ? 'disabled' : ''}></td>
                    <td><input type="text" class="plan-notes-input current-state-input" data-field="status" value="${escapeHtml(row?.status || '')}" ${isRequirementCurrentStateUpdating ? 'disabled' : ''}></td>
                    <td><textarea class="plan-notes-input current-state-input current-state-notes-input" data-field="notes" rows="2" ${isRequirementCurrentStateUpdating ? 'disabled' : ''}>${escapeHtml(row?.notes || '')}</textarea></td>
                    <td class="current-state-row-actions">
                      <button type="button" class="open-question-btn is-secondary current-state-row-remove" onclick="removeRequirementCurrentStateRowFromEvent(event)" ${isRequirementCurrentStateUpdating ? 'disabled' : ''}>Rimuovi</button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          <div class="current-state-toolbar">
            <button type="button" class="open-question-btn is-secondary" onclick="addRequirementCurrentStateRowFromEvent(event)" ${isRequirementCurrentStateUpdating ? 'disabled' : ''}>+ Riga</button>
          </div>
          <div class="plan-notes-actions">
            <button type="button" class="open-question-btn" onclick="saveRequirementCurrentStateFromEvent(event)" ${isRequirementCurrentStateUpdating ? 'disabled' : ''}>Salva</button>
            <button type="button" class="open-question-btn is-secondary" onclick="cancelRequirementCurrentStateEditFromEvent(event)" ${isRequirementCurrentStateUpdating ? 'disabled' : ''}>Annulla</button>
          </div>
        </div>
      </div>
    `
    : `
      <div class="section-card">
        <div class="section-title-row current-state-title-row">
          <div class="section-title">Current State</div>
          <button type="button" class="icon-action-btn${currentState.length ? '' : ' is-add'}" onclick="enableRequirementCurrentStateEditFromEvent(event)" aria-label="${currentState.length ? 'Modifica current state requirement' : 'Aggiungi current state requirement'}" title="${currentState.length ? 'Modifica current state requirement' : 'Aggiungi current state requirement'}">${currentState.length ? '✎' : ADD_ICON_SVG}</button>
        </div>
        ${currentState.length ? `
          <div class="current-state-table-wrap">
            <table class="decisions-table current-state-table">
              <thead>
                <tr>
                  <th>Area</th>
                  <th>Status</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                ${currentState.map(row => `
                  <tr>
                    <td>${escapeHtml(row?.area || '')}</td>
                    <td>${escapeHtml(row?.status || '')}</td>
                    <td>${escapeHtml(row?.notes || '')}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : '<p class="empty-state">Nessun current state disponibile</p>'}
      </div>
    `;
  overviewChunks.push(`<div id="anchor-overview-currentstate">${currentStateSection}</div>`);

  const requirementNotes = typeof data.notes === 'string' ? data.notes : '';
  const hasRequirementNotes = requirementNotes.trim().length > 0;
  const requirementNotesSection = isRequirementNotesEditing
    ? `
      <div class="section-card">
        <div class="task-dod-title">
          <span>Notes</span>
        </div>
        <div class="plan-notes-form">
          <textarea id="requirement-notes-input" class="plan-notes-input" rows="10" ${isRequirementNotesUpdating ? 'disabled' : ''}>${escapeHtml(requirementNotes)}</textarea>
          <div class="plan-notes-actions">
            <button type="button" class="open-question-btn" onclick="saveRequirementNotesFromEvent(event)" ${isRequirementNotesUpdating ? 'disabled' : ''}>Salva</button>
            <button type="button" class="open-question-btn is-secondary" onclick="cancelRequirementNotesEditFromEvent(event)" ${isRequirementNotesUpdating ? 'disabled' : ''}>Annulla</button>
          </div>
        </div>
      </div>
    `
    : `
      <div class="section-card">
        <div class="section-title-row">
          <div class="section-title">Notes</div>
          <button type="button" class="icon-action-btn${hasRequirementNotes ? '' : ' is-add'}" onclick="enableRequirementNotesEditFromEvent(event)" aria-label="${hasRequirementNotes ? 'Modifica notes requirement' : 'Aggiungi notes requirement'}" title="${hasRequirementNotes ? 'Modifica notes requirement' : 'Aggiungi notes requirement'}">${hasRequirementNotes ? '✎' : ADD_ICON_SVG}</button>
        </div>
        ${hasRequirementNotes ? `<div class="section-body">${escapeHtml(requirementNotes)}</div>` : ''}
      </div>
    `;
  overviewChunks.push(`<div id="anchor-overview-notes">${requirementNotesSection}</div>`);
  document.getElementById('overviewContent').innerHTML = `<div class="overview-sections reading-flow">${overviewChunks.join('') || '<p class="empty-state">No overview content</p>'}</div>`;

  document.getElementById('functionalList').innerHTML = renderRequirementItems(rf, 'No functional requirements', true);
  document.getElementById('nonFunctionalList').innerHTML = renderNonFunctionalRequirementItems(rnf, 'No non-functional requirements');

  document.getElementById('architecturalDecisionsList').innerHTML = decisions.length
    ? decisions.map(item => `
      <div class="task-item" id="anchor-archdec-${escapeHtml(item.id || '')}">
        <div class="task-header"><span class="task-id">${escapeHtml(item.id || '-')}</span></div>
        <div class="task-title">${escapeHtml(item.title || item.id || 'Decision')}</div>
        <div class="task-what">${escapeHtml(item.decision || '')}</div>
        ${item.rationale ? `<div class="task-notes"><strong>Rationale:</strong> ${escapeHtml(item.rationale)}</div>` : ''}
      </div>
    `).join('')
    : '<p class="empty-state">No architectural decisions</p>';

  document.getElementById('userStoriesRequirementsList').innerHTML = `${renderStoryCreateBox()}${stories.length
    ? stories.map(story => `
      <div class="task-item" id="anchor-userstory-${escapeHtml(story.id)}">
        <div class="task-header"><span class="task-id">${escapeHtml(story.id)}</span>${editingStoryId !== story.id ? `<span class="inline-actions"><button type="button" class="icon-action-btn" onclick="enableStoryEditByEncodedId(event, '${encodeURIComponent(story.id)}')">✎</button><button type="button" class="icon-action-btn" onclick="requestDeleteStoryByEncodedId(event, '${encodeURIComponent(story.id)}')"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"></polyline><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"></path><path d="M19 6l-1 14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1L5 6"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg></button></span>` : ''}</div>
        ${editingStoryId === story.id ? renderStoryEditForm(story) : `<div class="task-title">${escapeHtml(story.title || '')}</div>
        <div class="task-context-row"><span class="task-context-label">As a</span><span class="task-context-values">${escapeHtml(story.asA || '')}</span></div>
        <div class="task-context-row"><span class="task-context-label">I want</span><span class="task-context-values">${escapeHtml(story.iWant || '')}</span></div>
        <div class="task-context-row"><span class="task-context-label">So that</span><span class="task-context-values">${escapeHtml(story.soThat || '')}</span></div>`}
        ${editingStoryId === story.id ? '' : `<div
          class="task-dod${editingAcceptanceStoryId === story.id ? ' is-editing' : ''}${isAcceptanceUpdating ? ' is-busy' : ''}"
          data-story-id="${encodeURIComponent(story.id)}"
          role="button"
          tabindex="0"
          aria-label="Apri modalita modifica acceptance criteria"
          aria-expanded="${editingAcceptanceStoryId === story.id ? 'true' : 'false'}"
          onclick="enableAcceptanceEditByEncodedId('${encodeURIComponent(story.id)}')"
          onkeydown="handleAcceptanceRegionKeydown(event, '${encodeURIComponent(story.id)}')">
          <div class="task-dod-title">
            <span>Acceptance Criteria:</span>
            <span class="task-dod-hint">${editingAcceptanceStoryId === story.id ? 'Edit mode attiva' : 'Clicca per modificare'}</span>
            ${editingAcceptanceStoryId === story.id ? `<button type="button" class="task-dod-exit" onclick="disableAcceptanceEditFromEvent(event)">Fine modifica</button>` : ''}
          </div>
          ${(story.acceptanceCriteria || []).map((ac, index) => editingAcceptanceStoryId === story.id
            ? `
              <button type="button" class="task-dod-item task-dod-toggle${ac.checked ? ' is-completed' : ''}" onclick="toggleAcceptanceCriterionByEncodedIds(event, '${encodeURIComponent(doc.id || '')}', '${encodeURIComponent(story.id)}', ${index}, ${ac.checked ? 'false' : 'true'})" onkeydown="handleAcceptanceItemKeydown(event)" ${isAcceptanceUpdating ? 'disabled' : ''}>
                <span class="task-dod-bullet">${ac.checked ? '✓' : '○'}</span>
                <span>${escapeHtml(ac.text || '')}</span>
              </button>
            `
            : `
              <div class="task-dod-item${ac.checked ? ' is-completed' : ''}">
                <span class="task-dod-bullet">${ac.checked ? '✓' : '○'}</span>
                <span>${escapeHtml(ac.text || '')}</span>
              </div>
            `
          ).join('') || '<div class="task-dod-item"><span class="task-dod-bullet">○</span><span>No acceptance criteria</span></div>'}
        </div>`}
      </div>
    `).join('')
    : '<p class="empty-state">No user stories</p>'}${renderDeleteStoryModal()}`;

  document.getElementById('openQuestionsList').innerHTML = `<div class="section-title-row compact"><div class="section-title">Open questions</div><button type="button" class="icon-action-btn is-add" onclick="enableOpenQuestionCreateFromEvent(event)" ${isOpenQuestionUpdating ? 'disabled' : ''}>${ADD_ICON_SVG}</button></div>${creatingOpenQuestion ? `
      <div class="task-item compact">
        <div class="task-header"><span class="task-id">Nuova open question</span></div>
        <div class="plan-notes-form">
          ${creatingOpenQuestionStep === 'id' ? `
            <label class="open-question-label" for="new-open-question-id">ID</label>
            <input id="new-open-question-id" type="text" class="plan-notes-input compact-input" value="${escapeHtml(newOpenQuestionId)}" ${isOpenQuestionUpdating ? 'disabled' : ''}>
            <div class="plan-notes-actions"><button type="button" class="open-question-btn" onclick="proceedCreateOpenQuestionFromEvent(event)" ${isOpenQuestionUpdating ? 'disabled' : ''}>Avanti</button><button type="button" class="open-question-btn is-secondary" onclick="cancelCreateOpenQuestionFromEvent(event)" ${isOpenQuestionUpdating ? 'disabled' : ''}>Annulla</button></div>
          ` : `
            <div class="task-header task-header-tight"><span class="task-id">ID: ${escapeHtml(newOpenQuestionId)}</span></div>
            <label class="open-question-label" for="new-open-question-question">Question</label>
            <input id="new-open-question-question" type="text" class="plan-notes-input compact-input" value="${escapeHtml(newOpenQuestionQuestion)}" ${isOpenQuestionUpdating ? 'disabled' : ''}>
            <div class="plan-notes-actions"><button type="button" class="open-question-btn" onclick="createOpenQuestionFromEvent(event)" ${isOpenQuestionUpdating ? 'disabled' : ''}>Salva</button><button type="button" class="open-question-btn is-secondary" onclick="backCreateOpenQuestionFromEvent(event)" ${isOpenQuestionUpdating ? 'disabled' : ''}>Indietro</button><button type="button" class="open-question-btn is-secondary" onclick="cancelCreateOpenQuestionFromEvent(event)" ${isOpenQuestionUpdating ? 'disabled' : ''}>Annulla</button></div>
          `}
        </div>
      </div>
    ` : ''}${openQuestions.length
    ? openQuestions.map(q => `
      <div
        id="anchor-openq-${escapeHtml(q.id || '')}"
        class="task-item open-question-item${editingOpenQuestionId === q.id ? ' is-editing' : ''}${isOpenQuestionUpdating ? ' is-busy' : ''}"
        role="button"
        tabindex="0"
        aria-label="Apri modalita modifica open question"
        aria-expanded="${editingOpenQuestionId === q.id ? 'true' : 'false'}"
        onclick="enableOpenQuestionEditByEncodedId('${encodeURIComponent(q.id || '')}')"
        onkeydown="handleOpenQuestionCardKeydown(event, '${encodeURIComponent(q.id || '')}')">
        <div class="task-header">
          <span class="task-id">${escapeHtml(q.id || '-')}</span>
          <span class="inline-actions">
            ${editingOpenQuestionId !== q.id ? `<button type="button" class="icon-action-btn" onclick="requestDeleteOpenQuestionByEncodedIds(event, '${encodeURIComponent(doc.id || '')}', '${encodeURIComponent(q.id || '')}')" aria-label="Elimina open question" title="Elimina open question" ${isOpenQuestionUpdating ? 'disabled' : ''}><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"></polyline><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"></path><path d="M19 6l-1 14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1L5 6"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg></button>` : ''}
            <span class="plan-item-status status-${q.status === 'resolved' ? 'completed' : 'pending'}">${q.status === 'resolved' ? 'Resolved' : 'Open'}</span>
          </span>
        </div>
        <div class="task-title">${escapeHtml(q.question || '')}</div>
        ${editingOpenQuestionId === q.id ? `
          <div class="open-question-form" onclick="event.stopPropagation()">
            <label class="open-question-label" for="open-question-answer-${escapeHtml(q.id || '')}">Answer</label>
            <textarea
              id="open-question-answer-${escapeHtml(q.id || '')}"
              class="open-question-answer"
              rows="4"
              ${isOpenQuestionUpdating ? 'disabled' : ''}
            >${escapeHtml(q.answer || '')}</textarea>
            <label class="open-question-label" for="open-question-status-${escapeHtml(q.id || '')}">Status</label>
            <select
              id="open-question-status-${escapeHtml(q.id || '')}"
              class="open-question-status"
              ${isOpenQuestionUpdating ? 'disabled' : ''}>
              ${OPEN_QUESTION_STATUSES.map(status => `<option value="${status}"${status === q.status ? ' selected' : ''}>${status === 'resolved' ? 'Resolved' : 'Open'}</option>`).join('')}
            </select>
            <div class="open-question-actions">
              <button type="button" class="open-question-btn" onclick="saveOpenQuestionByEncodedIds(event, '${encodeURIComponent(doc.id || '')}', '${encodeURIComponent(q.id || '')}')" ${isOpenQuestionUpdating ? 'disabled' : ''}>Salva</button>
              <button type="button" class="open-question-btn is-secondary" onclick="cancelOpenQuestionEditFromEvent(event)" ${isOpenQuestionUpdating ? 'disabled' : ''}>Annulla</button>
            </div>
          </div>
        ` : `<div class="task-what">${escapeHtml(q.answer || '')}</div>`}
      </div>
    `).join('')
    : '<p class="empty-state">No open questions</p>'}${renderDeleteOpenQuestionModal()}`;

  restoreAcceptanceFocusIfNeeded();
  buildRightNav();
}

function renderRequirementItems(items, emptyText, isFunctional = false) {
  const actions = isFunctional ? `
    <div class="section-title-row compact">
      <div class="section-title">Requisiti funzionali</div>
      <button type="button" class="icon-action-btn is-add" onclick="enableCreateFunctionalRequirementFromEvent(event)" aria-label="Aggiungi requisito funzionale" title="Aggiungi requisito funzionale" ${isFunctionalRequirementUpdating ? 'disabled' : ''}>${ADD_ICON_SVG}</button>
    </div>
    ${creatingFunctionalRequirement ? `
      <div class="task-item compact">
        <div class="task-header"><span class="task-id">Nuovo requisito funzionale</span></div>
        <div class="plan-notes-form">
          ${creatingFunctionalRequirementStep === 'id' ? `
            <label class="open-question-label" for="new-functional-requirement-id">ID</label>
            <input id="new-functional-requirement-id" type="text" class="plan-notes-input compact-input" value="${escapeHtml(newFunctionalRequirementId)}" ${isFunctionalRequirementUpdating ? 'disabled' : ''}>
            <div class="plan-notes-actions">
              <button type="button" class="open-question-btn" onclick="proceedCreateFunctionalRequirementFromEvent(event)" ${isFunctionalRequirementUpdating ? 'disabled' : ''}>Avanti</button>
              <button type="button" class="open-question-btn is-secondary" onclick="cancelCreateFunctionalRequirementFromEvent(event)" ${isFunctionalRequirementUpdating ? 'disabled' : ''}>Annulla</button>
            </div>
          ` : `
            <div class="task-header task-header-tight"><span class="task-id">ID: ${escapeHtml(newFunctionalRequirementId)}</span></div>
            <label class="open-question-label" for="new-functional-requirement-title">Titolo</label>
            <input id="new-functional-requirement-title" type="text" class="plan-notes-input compact-input" value="${escapeHtml(newFunctionalRequirementTitle)}" ${isFunctionalRequirementUpdating ? 'disabled' : ''}>
            <label class="open-question-label" for="new-functional-requirement-description">Descrizione</label>
            <textarea id="new-functional-requirement-description" class="plan-notes-input" rows="3" ${isFunctionalRequirementUpdating ? 'disabled' : ''}>${escapeHtml(newFunctionalRequirementDescription)}</textarea>
            <div class="plan-notes-actions">
              <button type="button" class="open-question-btn" onclick="createFunctionalRequirementFromEvent(event)" ${isFunctionalRequirementUpdating ? 'disabled' : ''}>Salva</button>
              <button type="button" class="open-question-btn is-secondary" onclick="backCreateFunctionalRequirementFromEvent(event)" ${isFunctionalRequirementUpdating ? 'disabled' : ''}>Indietro</button>
              <button type="button" class="open-question-btn is-secondary" onclick="cancelCreateFunctionalRequirementFromEvent(event)" ${isFunctionalRequirementUpdating ? 'disabled' : ''}>Annulla</button>
            </div>
          `}
        </div>
      </div>
    ` : ''}
  ` : '';
  if (!items.length) return `${actions}<p class="empty-state">${emptyText}</p>`;
  return `${actions}<div class="reading-flow">${items.map(item => `
    <div class="task-item" id="anchor-func-${escapeHtml(item.id || '')}">
      <div class="task-header">
        <span class="task-id">${escapeHtml(item.id || '-')}</span>
        ${isFunctional && editingFunctionalRequirementId !== item.id ? `<span class="inline-actions"><button type="button" class="icon-action-btn" onclick="editFunctionalRequirementByEncodedId(event, '${encodeURIComponent(item.id || '')}')" aria-label="Modifica requisito funzionale" title="Modifica requisito funzionale" ${isFunctionalRequirementUpdating ? 'disabled' : ''}>✎</button><button type="button" class="icon-action-btn" onclick="requestDeleteFunctionalRequirementByEncodedId(event, '${encodeURIComponent(item.id || '')}')" aria-label="Elimina requisito funzionale" title="Elimina requisito funzionale" ${isFunctionalRequirementUpdating ? 'disabled' : ''}><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"></polyline><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"></path><path d="M19 6l-1 14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1L5 6"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg></button></span>` : ''}
      </div>
      ${isFunctional && editingFunctionalRequirementId === item.id ? `
        <div class="plan-notes-form">
          <label class="open-question-label" for="functional-title-${encodeURIComponent(item.id || '')}">Titolo</label>
          <input id="functional-title-${encodeURIComponent(item.id || '')}" type="text" class="plan-notes-input compact-input" value="${escapeHtml(item.title || '')}" ${isFunctionalRequirementUpdating ? 'disabled' : ''}>
          <label class="open-question-label" for="functional-description-${encodeURIComponent(item.id || '')}">Descrizione</label>
          <textarea id="functional-description-${encodeURIComponent(item.id || '')}" class="plan-notes-input" rows="3" ${isFunctionalRequirementUpdating ? 'disabled' : ''}>${escapeHtml(item.description || '')}</textarea>
          <div class="plan-notes-actions">
            <button type="button" class="open-question-btn" onclick="saveFunctionalRequirementByEncodedId(event, '${encodeURIComponent(item.id || '')}')" ${isFunctionalRequirementUpdating ? 'disabled' : ''}>Salva</button>
            <button type="button" class="open-question-btn is-secondary" onclick="cancelFunctionalRequirementEditFromEvent(event)" ${isFunctionalRequirementUpdating ? 'disabled' : ''}>Annulla</button>
          </div>
        </div>
      ` : `<div class="task-title">${escapeHtml(item.title || '')}</div><div class="task-what">${escapeHtml(item.description || '')}</div>`}
    </div>
  `).join('')}</div>${isFunctional ? renderDeleteFunctionalRequirementModal() : ''}`;
}

function renderDeleteFunctionalRequirementModal() {
  if (!deletingFunctionalRequirementId) return '';
  return `
    <div class="confirm-modal-overlay" onclick="closeDeleteFunctionalRequirementModalFromEvent(event)">
      <div class="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="delete-functional-title" aria-describedby="delete-functional-text" tabindex="-1" onclick="event.stopPropagation()" onkeydown="handleDeleteFunctionalRequirementModalKeydown(event)">
        <button type="button" class="confirm-modal-close" aria-label="Chiudi modal" title="Chiudi" onclick="closeDeleteFunctionalRequirementModalFromEvent(event)">×</button>
        <div class="confirm-modal-title" id="delete-functional-title">Conferma eliminazione</div>
        <div class="confirm-modal-text" id="delete-functional-text">Vuoi eliminare il requisito funzionale <strong>${escapeHtml(deletingFunctionalRequirementId)}</strong>?</div>
        <div class="plan-notes-actions confirm-modal-actions">
          <button type="button" class="open-question-btn is-danger" data-modal-focus="first" onclick="confirmDeleteFunctionalRequirementFromEvent(event)" ${isFunctionalRequirementUpdating ? 'disabled' : ''}>Elimina</button>
          <button type="button" class="open-question-btn is-secondary" data-modal-focus="last" onclick="closeDeleteFunctionalRequirementModalFromEvent(event)" ${isFunctionalRequirementUpdating ? 'disabled' : ''}>Annulla</button>
        </div>
      </div>
    </div>
  `;
}

function enableCreateFunctionalRequirement() {
  if (!currentRequirement || currentSection !== 'requirements' || isFunctionalRequirementUpdating) return;
  creatingFunctionalRequirement = true;
  newFunctionalRequirementId = 'RF-';
  creatingFunctionalRequirementStep = 'id';
  newFunctionalRequirementTitle = '';
  newFunctionalRequirementDescription = '';
  renderRequirementDetail();
  setTimeout(() => {
    const idInput = document.getElementById('new-functional-requirement-id');
    if (!idInput) return;
    idInput.focus();
    const cursor = idInput.value.length;
    idInput.setSelectionRange(cursor, cursor);
  }, 0);
}

function enableCreateFunctionalRequirementFromEvent(event) {
  event.stopPropagation();
  enableCreateFunctionalRequirement();
}

function cancelCreateFunctionalRequirementFromEvent(event) {
  event.stopPropagation();
  creatingFunctionalRequirement = false;
  newFunctionalRequirementId = '';
  creatingFunctionalRequirementStep = 'id';
  newFunctionalRequirementTitle = '';
  newFunctionalRequirementDescription = '';
  renderRequirementDetail();
}

function proceedCreateFunctionalRequirement() {
  if (!currentRequirement || currentSection !== 'requirements' || isFunctionalRequirementUpdating) return;
  const idEl = document.getElementById('new-functional-requirement-id');
  const functionalId = String(idEl?.value || '').trim();
  if (!functionalId) {
    showToast('Inserisci un ID', 'error');
    return;
  }
  if ((currentRequirement.functionalRequirements || []).some(item => item.id === functionalId)) {
    showToast('ID gia presente', 'error');
    return;
  }
  newFunctionalRequirementId = functionalId;
  creatingFunctionalRequirementStep = 'details';
  renderRequirementDetail();
  setTimeout(() => document.getElementById('new-functional-requirement-title')?.focus(), 0);
}

function proceedCreateFunctionalRequirementFromEvent(event) {
  event.stopPropagation();
  proceedCreateFunctionalRequirement();
}

function backCreateFunctionalRequirementFromEvent(event) {
  event.stopPropagation();
  if (!currentRequirement || currentSection !== 'requirements' || isFunctionalRequirementUpdating) return;
  const titleEl = document.getElementById('new-functional-requirement-title');
  const descriptionEl = document.getElementById('new-functional-requirement-description');
  newFunctionalRequirementTitle = String(titleEl?.value || '').trim();
  newFunctionalRequirementDescription = String(descriptionEl?.value || '').trim();
  creatingFunctionalRequirementStep = 'id';
  renderRequirementDetail();
  setTimeout(() => {
    const idInput = document.getElementById('new-functional-requirement-id');
    if (!idInput) return;
    idInput.focus();
    const cursor = idInput.value.length;
    idInput.setSelectionRange(cursor, cursor);
  }, 0);
}

async function createFunctionalRequirement() {
  if (!currentRequirement || currentSection !== 'requirements' || isFunctionalRequirementUpdating) return;
  const requirementId = currentRequirement.document?.id || currentRequirement.id;
  if (!requirementId) return;
  const functionalId = String(newFunctionalRequirementId || '').trim();
  if (!functionalId) {
    showToast('Inserisci un ID', 'error');
    return;
  }
  if ((currentRequirement.functionalRequirements || []).some(item => item.id === functionalId)) {
    showToast('ID gia presente', 'error');
    return;
  }
  const titleEl = document.getElementById('new-functional-requirement-title');
  const descriptionEl = document.getElementById('new-functional-requirement-description');
  const title = String(titleEl?.value || '').trim();
  const description = String(descriptionEl?.value || '').trim();
  if (!title || !description) {
    showToast('Titolo e descrizione sono obbligatori', 'error');
    return;
  }
  newFunctionalRequirementTitle = title;
  newFunctionalRequirementDescription = description;

  isFunctionalRequirementUpdating = true;
  renderRequirementDetail();

  try {
    const res = await fetch(`/api/requirements/${encodeURIComponent(requirementId)}/functional-requirements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ functionalId, title, description })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Unable to add functional requirement');
    }
    const [updatedRequirementRes] = await Promise.all([fetch(`/api/requirements/${encodeURIComponent(requirementId)}`, { cache: 'no-store' }), loadRequirements()]);
    if (!updatedRequirementRes.ok) throw new Error('Unable to refresh requirement after create');
    currentRequirement = await updatedRequirementRes.json();
    creatingFunctionalRequirement = false;
    newFunctionalRequirementId = '';
    creatingFunctionalRequirementStep = 'id';
    newFunctionalRequirementTitle = '';
    newFunctionalRequirementDescription = '';
    document.querySelector(`.plan-item[data-id="${CSS.escape(requirementId)}"]`)?.classList.add('active');
    renderRequirementDetail();
    showToast('Requisito funzionale aggiunto');
    setTimeout(() => {
      const cards = Array.from(document.querySelectorAll('#functionalList .task-item'));
      const card = cards.find(el => el.querySelector('.task-id')?.textContent?.trim() === functionalId);
      if (!card) return;
      card.scrollIntoView({ behavior: 'instant', block: 'center' });
      card.style.transition = 'box-shadow .35s ease, transform .35s ease';
      card.style.boxShadow = '0 0 0 2px rgba(82, 145, 255, 0.45)';
      card.style.transform = 'scale(1.01)';
      setTimeout(() => {
        card.style.boxShadow = '';
        card.style.transform = '';
      }, 1200);
    }, 0);
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    isFunctionalRequirementUpdating = false;
    renderRequirementDetail();
  }
}

function createFunctionalRequirementFromEvent(event) {
  event.stopPropagation();
  createFunctionalRequirement();
}

function editFunctionalRequirement(functionalId) {
  if (!currentRequirement || currentSection !== 'requirements' || !functionalId || isFunctionalRequirementUpdating) return;
  editingFunctionalRequirementId = functionalId;
  renderRequirementDetail();
}

function cancelFunctionalRequirementEditFromEvent(event) {
  event.stopPropagation();
  editingFunctionalRequirementId = null;
  renderRequirementDetail();
}

async function saveFunctionalRequirement(functionalId) {
  if (!currentRequirement || currentSection !== 'requirements' || !functionalId || isFunctionalRequirementUpdating) return;
  const requirementId = currentRequirement.document?.id || currentRequirement.id;
  if (!requirementId) return;
  const titleEl = document.getElementById(`functional-title-${encodeURIComponent(functionalId)}`);
  const descriptionEl = document.getElementById(`functional-description-${encodeURIComponent(functionalId)}`);
  const title = String(titleEl?.value || '');
  const description = String(descriptionEl?.value || '');

  isFunctionalRequirementUpdating = true;
  renderRequirementDetail();

  try {
    const res = await fetch(`/api/requirements/${encodeURIComponent(requirementId)}/functional-requirements/${encodeURIComponent(functionalId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Unable to update functional requirement');
    }
    const [updatedRequirementRes] = await Promise.all([fetch(`/api/requirements/${encodeURIComponent(requirementId)}`, { cache: 'no-store' }), loadRequirements()]);
    if (!updatedRequirementRes.ok) throw new Error('Unable to refresh requirement after update');
    currentRequirement = await updatedRequirementRes.json();
    editingFunctionalRequirementId = null;
    document.querySelector(`.plan-item[data-id="${CSS.escape(requirementId)}"]`)?.classList.add('active');
    renderRequirementDetail();
    showToast('Requisito funzionale aggiornato');
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    isFunctionalRequirementUpdating = false;
    renderRequirementDetail();
  }
}

function editFunctionalRequirementByEncodedId(event, encodedFunctionalId) {
  event.stopPropagation();
  editFunctionalRequirement(decodeURIComponent(encodedFunctionalId));
}

function saveFunctionalRequirementByEncodedId(event, encodedFunctionalId) {
  event.stopPropagation();
  saveFunctionalRequirement(decodeURIComponent(encodedFunctionalId));
}

async function deleteFunctionalRequirement(functionalId) {
  if (!currentRequirement || currentSection !== 'requirements' || !functionalId || isFunctionalRequirementUpdating) return;
  const requirementId = currentRequirement.document?.id || currentRequirement.id;
  if (!requirementId) return;

  isFunctionalRequirementUpdating = true;
  renderRequirementDetail();

  try {
    const res = await fetch(`/api/requirements/${encodeURIComponent(requirementId)}/functional-requirements/${encodeURIComponent(functionalId)}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Unable to delete functional requirement');
    }
    const [updatedRequirementRes] = await Promise.all([fetch(`/api/requirements/${encodeURIComponent(requirementId)}`, { cache: 'no-store' }), loadRequirements()]);
    if (!updatedRequirementRes.ok) throw new Error('Unable to refresh requirement after delete');
    currentRequirement = await updatedRequirementRes.json();
    if (editingFunctionalRequirementId === functionalId) editingFunctionalRequirementId = null;
    document.querySelector(`.plan-item[data-id="${CSS.escape(requirementId)}"]`)?.classList.add('active');
    renderRequirementDetail();
    showToast('Requisito funzionale eliminato');
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    isFunctionalRequirementUpdating = false;
    renderRequirementDetail();
  }
}

function deleteFunctionalRequirementByEncodedId(event, encodedFunctionalId) {
  event.stopPropagation();
  deleteFunctionalRequirement(decodeURIComponent(encodedFunctionalId));
}

function requestDeleteFunctionalRequirement(functionalId) {
  if (!currentRequirement || currentSection !== 'requirements' || !functionalId || isFunctionalRequirementUpdating) return;
  deleteModalReturnFocusEl = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  deletingFunctionalRequirementId = functionalId;
  renderRequirementDetail();
  setTimeout(() => {
    const cancelBtn = document.querySelector('.confirm-modal [data-modal-focus="last"]');
    const dialog = document.querySelector('.confirm-modal');
    if (cancelBtn instanceof HTMLElement) {
      cancelBtn.focus();
      return;
    }
    if (dialog instanceof HTMLElement) dialog.focus();
  }, 0);
}

function requestDeleteFunctionalRequirementByEncodedId(event, encodedFunctionalId) {
  event.stopPropagation();
  requestDeleteFunctionalRequirement(decodeURIComponent(encodedFunctionalId));
}

function closeDeleteFunctionalRequirementModal() {
  if (isFunctionalRequirementUpdating) return;
  deletingFunctionalRequirementId = null;
  renderRequirementDetail();
  if (deleteModalReturnFocusEl && typeof deleteModalReturnFocusEl.focus === 'function') {
    setTimeout(() => deleteModalReturnFocusEl?.focus(), 0);
  }
  deleteModalReturnFocusEl = null;
}

function closeDeleteFunctionalRequirementModalFromEvent(event) {
  event.stopPropagation();
  closeDeleteFunctionalRequirementModal();
}

function confirmDeleteFunctionalRequirementFromEvent(event) {
  event.stopPropagation();
  const functionalId = deletingFunctionalRequirementId;
  if (!functionalId) return;
  deletingFunctionalRequirementId = null;
  deleteFunctionalRequirement(functionalId);
}

function handleDeleteFunctionalRequirementModalKeydown(event) {
  if (!deletingFunctionalRequirementId) return;
  if (event.key === 'Escape') {
    event.preventDefault();
    closeDeleteFunctionalRequirementModal();
    return;
  }
  if (event.key !== 'Tab') return;
  const focusable = Array.from(document.querySelectorAll('.confirm-modal button:not([disabled]), .confirm-modal [href], .confirm-modal input:not([disabled]), .confirm-modal textarea:not([disabled]), .confirm-modal select:not([disabled]), .confirm-modal [tabindex]:not([tabindex="-1"])'));
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const active = document.activeElement;
  if (event.shiftKey && active === first) {
    event.preventDefault();
    last.focus();
    return;
  }
  if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
  }
}

function renderNonFunctionalRequirementItems(items, emptyText) {
  const actions = `
    <div class="section-title-row compact">
      <div class="section-title">Requisiti non funzionali</div>
      <button type="button" class="icon-action-btn is-add" onclick="enableCreateNonFunctionalRequirementFromEvent(event)" aria-label="Aggiungi requisito non funzionale" title="Aggiungi requisito non funzionale" ${isNonFunctionalRequirementUpdating ? 'disabled' : ''}>${ADD_ICON_SVG}</button>
    </div>
    ${creatingNonFunctionalRequirement ? `
      <div class="task-item compact">
        <div class="task-header"><span class="task-id">Nuovo requisito non funzionale</span></div>
        <div class="plan-notes-form">
          ${creatingNonFunctionalRequirementStep === 'id' ? `
            <label class="open-question-label" for="new-non-functional-requirement-id">ID</label>
            <input id="new-non-functional-requirement-id" type="text" class="plan-notes-input compact-input" value="${escapeHtml(newNonFunctionalRequirementId)}" ${isNonFunctionalRequirementUpdating ? 'disabled' : ''}>
            <div class="plan-notes-actions">
              <button type="button" class="open-question-btn" onclick="proceedCreateNonFunctionalRequirementFromEvent(event)" ${isNonFunctionalRequirementUpdating ? 'disabled' : ''}>Avanti</button>
              <button type="button" class="open-question-btn is-secondary" onclick="cancelCreateNonFunctionalRequirementFromEvent(event)" ${isNonFunctionalRequirementUpdating ? 'disabled' : ''}>Annulla</button>
            </div>
          ` : `
            <div class="task-header task-header-tight"><span class="task-id">ID: ${escapeHtml(newNonFunctionalRequirementId)}</span></div>
            <label class="open-question-label" for="new-non-functional-requirement-title">Titolo</label>
            <input id="new-non-functional-requirement-title" type="text" class="plan-notes-input compact-input" value="${escapeHtml(newNonFunctionalRequirementTitle)}" ${isNonFunctionalRequirementUpdating ? 'disabled' : ''}>
            <label class="open-question-label" for="new-non-functional-requirement-description">Descrizione</label>
            <textarea id="new-non-functional-requirement-description" class="plan-notes-input" rows="3" ${isNonFunctionalRequirementUpdating ? 'disabled' : ''}>${escapeHtml(newNonFunctionalRequirementDescription)}</textarea>
            <div class="plan-notes-actions">
              <button type="button" class="open-question-btn" onclick="createNonFunctionalRequirementFromEvent(event)" ${isNonFunctionalRequirementUpdating ? 'disabled' : ''}>Salva</button>
              <button type="button" class="open-question-btn is-secondary" onclick="backCreateNonFunctionalRequirementFromEvent(event)" ${isNonFunctionalRequirementUpdating ? 'disabled' : ''}>Indietro</button>
              <button type="button" class="open-question-btn is-secondary" onclick="cancelCreateNonFunctionalRequirementFromEvent(event)" ${isNonFunctionalRequirementUpdating ? 'disabled' : ''}>Annulla</button>
            </div>
          `}
        </div>
      </div>
    ` : ''}
  `;
  if (!items.length) return `${actions}<p class="empty-state">${emptyText}</p>`;
  return `${actions}<div class="reading-flow">${items.map(item => `
    <div class="task-item" id="anchor-nonfunc-${escapeHtml(item.id || '')}">
      <div class="task-header">
        <span class="task-id">${escapeHtml(item.id || '-')}</span>
        ${editingNonFunctionalRequirementId !== item.id ? `<span class="inline-actions"><button type="button" class="icon-action-btn" onclick="editNonFunctionalRequirementByEncodedId(event, '${encodeURIComponent(item.id || '')}')" aria-label="Modifica requisito non funzionale" title="Modifica requisito non funzionale" ${isNonFunctionalRequirementUpdating ? 'disabled' : ''}>✎</button><button type="button" class="icon-action-btn" onclick="requestDeleteNonFunctionalRequirementByEncodedId(event, '${encodeURIComponent(item.id || '')}')" aria-label="Elimina requisito non funzionale" title="Elimina requisito non funzionale" ${isNonFunctionalRequirementUpdating ? 'disabled' : ''}><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"></polyline><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"></path><path d="M19 6l-1 14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1L5 6"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg></button></span>` : ''}
      </div>
      ${editingNonFunctionalRequirementId === item.id ? `
        <div class="plan-notes-form">
          <label class="open-question-label" for="non-functional-title-${encodeURIComponent(item.id || '')}">Titolo</label>
          <input id="non-functional-title-${encodeURIComponent(item.id || '')}" type="text" class="plan-notes-input compact-input" value="${escapeHtml(item.title || '')}" ${isNonFunctionalRequirementUpdating ? 'disabled' : ''}>
          <label class="open-question-label" for="non-functional-description-${encodeURIComponent(item.id || '')}">Descrizione</label>
          <textarea id="non-functional-description-${encodeURIComponent(item.id || '')}" class="plan-notes-input" rows="3" ${isNonFunctionalRequirementUpdating ? 'disabled' : ''}>${escapeHtml(item.description || '')}</textarea>
          <div class="plan-notes-actions">
            <button type="button" class="open-question-btn" onclick="saveNonFunctionalRequirementByEncodedId(event, '${encodeURIComponent(item.id || '')}')" ${isNonFunctionalRequirementUpdating ? 'disabled' : ''}>Salva</button>
            <button type="button" class="open-question-btn is-secondary" onclick="cancelNonFunctionalRequirementEditFromEvent(event)" ${isNonFunctionalRequirementUpdating ? 'disabled' : ''}>Annulla</button>
          </div>
        </div>
      ` : `<div class="task-title">${escapeHtml(item.title || '')}</div><div class="task-what">${escapeHtml(item.description || '')}</div>`}
    </div>
  `).join('')}</div>${renderDeleteNonFunctionalRequirementModal()}`;
}

function renderPlanDecisionItems(items) {
  const actions = `
    <div class="section-title-row compact">
      <div class="section-title">Decisions</div>
      <button type="button" class="icon-action-btn is-add" onclick="enableCreatePlanDecisionFromEvent(event)" aria-label="Aggiungi decision" title="Aggiungi decision" ${isPlanDecisionUpdating ? 'disabled' : ''}>${ADD_ICON_SVG}</button>
    </div>
    ${creatingPlanDecision ? `
      <div class="task-item compact">
        <div class="task-header"><span class="task-id">Nuova decision</span></div>
        <div class="plan-notes-form">
          ${creatingPlanDecisionStep === 'id' ? `
            <label class="open-question-label" for="new-plan-decision-id">ID</label>
            <input id="new-plan-decision-id" type="text" class="plan-notes-input compact-input" value="${escapeHtml(newPlanDecisionId)}" ${isPlanDecisionUpdating ? 'disabled' : ''}>
            <div class="plan-notes-actions">
              <button type="button" class="open-question-btn" onclick="proceedCreatePlanDecisionFromEvent(event)" ${isPlanDecisionUpdating ? 'disabled' : ''}>Avanti</button>
              <button type="button" class="open-question-btn is-secondary" onclick="cancelCreatePlanDecisionFromEvent(event)" ${isPlanDecisionUpdating ? 'disabled' : ''}>Annulla</button>
            </div>
          ` : `
            <div class="task-header task-header-tight"><span class="task-id">ID: ${escapeHtml(newPlanDecisionId)}</span></div>
            <label class="open-question-label" for="new-plan-decision-description">Description / Choice</label>
            <textarea id="new-plan-decision-description" class="plan-notes-input" rows="3" ${isPlanDecisionUpdating ? 'disabled' : ''}>${escapeHtml(newPlanDecisionDescription)}</textarea>
            <label class="open-question-label" for="new-plan-decision-rationale">Rationale</label>
            <textarea id="new-plan-decision-rationale" class="plan-notes-input" rows="3" ${isPlanDecisionUpdating ? 'disabled' : ''}>${escapeHtml(newPlanDecisionRationale)}</textarea>
            <div class="plan-notes-actions">
              <button type="button" class="open-question-btn" onclick="createPlanDecisionFromEvent(event)" ${isPlanDecisionUpdating ? 'disabled' : ''}>Salva</button>
              <button type="button" class="open-question-btn is-secondary" onclick="backCreatePlanDecisionFromEvent(event)" ${isPlanDecisionUpdating ? 'disabled' : ''}>Indietro</button>
              <button type="button" class="open-question-btn is-secondary" onclick="cancelCreatePlanDecisionFromEvent(event)" ${isPlanDecisionUpdating ? 'disabled' : ''}>Annulla</button>
            </div>
          `}
        </div>
      </div>
    ` : ''}
  `;
  if (!items.length) return `${actions}<p class="empty-state">No decisions recorded</p>${renderDeletePlanDecisionModal()}`;
  return `${actions}<div class="reading-flow decisions-reading-flow">${items.map(item => {
    const itemId = item.id || item.decision || '';
    return `
      <div class="task-item" id="anchor-decision-${escapeHtml(itemId)}">
        <div class="task-header">
          <span class="task-id">${escapeHtml(itemId || '-')}</span>
          ${editingPlanDecisionId !== itemId ? `<span class="inline-actions"><button type="button" class="icon-action-btn" onclick="editPlanDecisionByEncodedId(event, '${encodeURIComponent(itemId)}')" aria-label="Modifica decision" title="Modifica decision" ${isPlanDecisionUpdating ? 'disabled' : ''}>✎</button><button type="button" class="icon-action-btn" onclick="requestDeletePlanDecisionByEncodedId(event, '${encodeURIComponent(itemId)}')" aria-label="Elimina decision" title="Elimina decision" ${isPlanDecisionUpdating ? 'disabled' : ''}><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"></polyline><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"></path><path d="M19 6l-1 14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1L5 6"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg></button></span>` : ''}
        </div>
        ${editingPlanDecisionId === itemId ? `
          <div class="plan-notes-form">
            <label class="open-question-label" for="plan-decision-description-${encodeURIComponent(itemId)}">Description / Choice</label>
            <textarea id="plan-decision-description-${encodeURIComponent(itemId)}" class="plan-notes-input" rows="3" ${isPlanDecisionUpdating ? 'disabled' : ''}>${escapeHtml(item.description || item.choice || '')}</textarea>
            <label class="open-question-label" for="plan-decision-rationale-${encodeURIComponent(itemId)}">Rationale</label>
            <textarea id="plan-decision-rationale-${encodeURIComponent(itemId)}" class="plan-notes-input" rows="3" ${isPlanDecisionUpdating ? 'disabled' : ''}>${escapeHtml(item.rationale || item.motivation || '')}</textarea>
            <div class="plan-notes-actions">
              <button type="button" class="open-question-btn" onclick="savePlanDecisionByEncodedId(event, '${encodeURIComponent(itemId)}')" ${isPlanDecisionUpdating ? 'disabled' : ''}>Salva</button>
              <button type="button" class="open-question-btn is-secondary" onclick="cancelPlanDecisionEditFromEvent(event)" ${isPlanDecisionUpdating ? 'disabled' : ''}>Annulla</button>
            </div>
          </div>
        ` : `<div class="task-title">${escapeHtml(item.description || item.choice || '')}</div><div class="task-what">${escapeHtml(item.rationale || item.motivation || '')}</div>${item.date ? `<div class="task-notes"><strong>Date:</strong> ${escapeHtml(item.date)}</div>` : ''}`}
      </div>
    `;
  }).join('')}</div>${renderDeletePlanDecisionModal()}`;
}

function renderDeletePlanDecisionModal() {
  if (!deletingPlanDecisionId) return '';
  return `
    <div class="confirm-modal-overlay" onclick="closeDeletePlanDecisionModalFromEvent(event)">
      <div class="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="delete-plan-decision-title" aria-describedby="delete-plan-decision-text" tabindex="-1" onclick="event.stopPropagation()" onkeydown="handleDeletePlanDecisionModalKeydown(event)">
        <button type="button" class="confirm-modal-close" aria-label="Chiudi modal" title="Chiudi" onclick="closeDeletePlanDecisionModalFromEvent(event)">×</button>
        <div class="confirm-modal-title" id="delete-plan-decision-title">Conferma eliminazione</div>
        <div class="confirm-modal-text" id="delete-plan-decision-text">Vuoi eliminare la decision <strong>${escapeHtml(deletingPlanDecisionId)}</strong>?</div>
        <div class="plan-notes-actions confirm-modal-actions">
          <button type="button" class="open-question-btn is-danger" data-modal-focus="first" onclick="confirmDeletePlanDecisionFromEvent(event)" ${isPlanDecisionUpdating ? 'disabled' : ''}>Elimina</button>
          <button type="button" class="open-question-btn is-secondary" data-modal-focus="last" onclick="closeDeletePlanDecisionModalFromEvent(event)" ${isPlanDecisionUpdating ? 'disabled' : ''}>Annulla</button>
        </div>
      </div>
    </div>
  `;
}

function enableCreatePlanDecisionFromEvent(event) { event.stopPropagation(); if (!currentPlan || currentSection !== 'plans' || isPlanDecisionUpdating) return; creatingPlanDecision = true; creatingPlanDecisionStep = 'id'; newPlanDecisionId = 'DEC-'; newPlanDecisionDescription = ''; newPlanDecisionRationale = ''; renderPlanDetail(); setTimeout(() => { const input = document.getElementById('new-plan-decision-id'); if (!input) return; input.focus(); input.setSelectionRange(input.value.length, input.value.length); }, 0); }
function cancelCreatePlanDecisionFromEvent(event) { event.stopPropagation(); creatingPlanDecision = false; creatingPlanDecisionStep = 'id'; newPlanDecisionId = ''; newPlanDecisionDescription = ''; newPlanDecisionRationale = ''; renderPlanDetail(); }
function proceedCreatePlanDecisionFromEvent(event) { event.stopPropagation(); if (!currentPlan || currentSection !== 'plans' || isPlanDecisionUpdating) return; const decisionId = String(document.getElementById('new-plan-decision-id')?.value || '').trim(); if (!decisionId) return showToast('Inserisci un ID', 'error'); if ((currentPlan.decisions || []).some(item => (item.id || item.decision) === decisionId)) return showToast('ID gia presente', 'error'); newPlanDecisionId = decisionId; creatingPlanDecisionStep = 'details'; renderPlanDetail(); setTimeout(() => document.getElementById('new-plan-decision-description')?.focus(), 0); }
function backCreatePlanDecisionFromEvent(event) { event.stopPropagation(); if (!currentPlan || currentSection !== 'plans' || isPlanDecisionUpdating) return; newPlanDecisionDescription = String(document.getElementById('new-plan-decision-description')?.value || '').trim(); newPlanDecisionRationale = String(document.getElementById('new-plan-decision-rationale')?.value || '').trim(); creatingPlanDecisionStep = 'id'; renderPlanDetail(); }
async function createPlanDecisionFromEvent(event) { event.stopPropagation(); if (!currentPlan || currentSection !== 'plans' || isPlanDecisionUpdating) return; const planId = currentPlan.id; if (!planId) return; const decisionId = String(newPlanDecisionId || '').trim(); const description = String(document.getElementById('new-plan-decision-description')?.value || '').trim(); const rationale = String(document.getElementById('new-plan-decision-rationale')?.value || '').trim(); const date = getCurrentDateIso(); if (!decisionId) return showToast('Inserisci un ID', 'error'); if (!description || !rationale) return showToast('Descrizione e rationale sono obbligatori', 'error'); isPlanDecisionUpdating = true; renderPlanDetail(); try { const res = await fetch(`/api/plans/${encodeURIComponent(planId)}/decisions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ decisionId, description, rationale, date }) }); if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Unable to add decision'); } const [updatedPlanRes] = await Promise.all([fetch(`/api/plans/${encodeURIComponent(planId)}`, { cache: 'no-store' }), loadPlans()]); if (!updatedPlanRes.ok) throw new Error('Unable to refresh plan after create'); currentPlan = await updatedPlanRes.json(); creatingPlanDecision = false; creatingPlanDecisionStep = 'id'; newPlanDecisionId = ''; newPlanDecisionDescription = ''; newPlanDecisionRationale = ''; renderPlanDetail(); showToast('Decision aggiunta'); } catch (error) { showToast(error.message, 'error'); } finally { isPlanDecisionUpdating = false; renderPlanDetail(); } }
function editPlanDecisionByEncodedId(event, encodedDecisionId) { event.stopPropagation(); if (!currentPlan || currentSection !== 'plans' || isPlanDecisionUpdating) return; editingPlanDecisionId = decodeURIComponent(encodedDecisionId); renderPlanDetail(); }
function cancelPlanDecisionEditFromEvent(event) { event.stopPropagation(); editingPlanDecisionId = null; renderPlanDetail(); }
async function savePlanDecisionByEncodedId(event, encodedDecisionId) { event.stopPropagation(); if (!currentPlan || currentSection !== 'plans' || isPlanDecisionUpdating) return; const decisionId = decodeURIComponent(encodedDecisionId); const planId = currentPlan.id; if (!planId || !decisionId) return; const description = String(document.getElementById(`plan-decision-description-${encodeURIComponent(decisionId)}`)?.value || ''); const rationale = String(document.getElementById(`plan-decision-rationale-${encodeURIComponent(decisionId)}`)?.value || ''); isPlanDecisionUpdating = true; renderPlanDetail(); try { const res = await fetch(`/api/plans/${encodeURIComponent(planId)}/decisions/${encodeURIComponent(decisionId)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ description, rationale }) }); if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Unable to update decision'); } const [updatedPlanRes] = await Promise.all([fetch(`/api/plans/${encodeURIComponent(planId)}`, { cache: 'no-store' }), loadPlans()]); if (!updatedPlanRes.ok) throw new Error('Unable to refresh plan after update'); currentPlan = await updatedPlanRes.json(); editingPlanDecisionId = null; renderPlanDetail(); showToast('Decision aggiornata'); } catch (error) { showToast(error.message, 'error'); } finally { isPlanDecisionUpdating = false; renderPlanDetail(); } }
function requestDeletePlanDecisionByEncodedId(event, encodedDecisionId) { event.stopPropagation(); if (!currentPlan || currentSection !== 'plans' || isPlanDecisionUpdating) return; deletePlanDecisionModalReturnFocusEl = document.activeElement instanceof HTMLElement ? document.activeElement : null; deletingPlanDecisionId = decodeURIComponent(encodedDecisionId); renderPlanDetail(); setTimeout(() => { const cancelBtn = document.querySelector('.confirm-modal [data-modal-focus="last"]'); const dialog = document.querySelector('.confirm-modal'); if (cancelBtn instanceof HTMLElement) return cancelBtn.focus(); if (dialog instanceof HTMLElement) dialog.focus(); }, 0); }
function closeDeletePlanDecisionModalFromEvent(event) { event.stopPropagation(); if (isPlanDecisionUpdating) return; deletingPlanDecisionId = null; renderPlanDetail(); if (deletePlanDecisionModalReturnFocusEl && typeof deletePlanDecisionModalReturnFocusEl.focus === 'function') setTimeout(() => deletePlanDecisionModalReturnFocusEl?.focus(), 0); deletePlanDecisionModalReturnFocusEl = null; }
async function confirmDeletePlanDecisionFromEvent(event) { event.stopPropagation(); if (!deletingPlanDecisionId || !currentPlan || currentSection !== 'plans' || isPlanDecisionUpdating) return; const decisionId = deletingPlanDecisionId; deletingPlanDecisionId = null; const planId = currentPlan.id; if (!planId) return; isPlanDecisionUpdating = true; renderPlanDetail(); try { const res = await fetch(`/api/plans/${encodeURIComponent(planId)}/decisions/${encodeURIComponent(decisionId)}`, { method: 'DELETE' }); if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Unable to delete decision'); } const [updatedPlanRes] = await Promise.all([fetch(`/api/plans/${encodeURIComponent(planId)}`, { cache: 'no-store' }), loadPlans()]); if (!updatedPlanRes.ok) throw new Error('Unable to refresh plan after delete'); currentPlan = await updatedPlanRes.json(); if (editingPlanDecisionId === decisionId) editingPlanDecisionId = null; renderPlanDetail(); showToast('Decision eliminata'); } catch (error) { showToast(error.message, 'error'); } finally { isPlanDecisionUpdating = false; renderPlanDetail(); } }
function handleDeletePlanDecisionModalKeydown(event) { if (!deletingPlanDecisionId) return; if (event.key === 'Escape') { event.preventDefault(); closeDeletePlanDecisionModalFromEvent(event); return; } if (event.key !== 'Tab') return; const focusable = Array.from(document.querySelectorAll('.confirm-modal button:not([disabled]), .confirm-modal [href], .confirm-modal input:not([disabled]), .confirm-modal textarea:not([disabled]), .confirm-modal select:not([disabled]), .confirm-modal [tabindex]:not([tabindex="-1"])')); if (!focusable.length) return; const first = focusable[0]; const last = focusable[focusable.length - 1]; const active = document.activeElement; if (event.shiftKey && active === first) { event.preventDefault(); last.focus(); return; } if (!event.shiftKey && active === last) { event.preventDefault(); first.focus(); } }

function renderDeleteNonFunctionalRequirementModal() {
  if (!deletingNonFunctionalRequirementId) return '';
  return `
    <div class="confirm-modal-overlay" onclick="closeDeleteNonFunctionalRequirementModalFromEvent(event)">
      <div class="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="delete-non-functional-title" aria-describedby="delete-non-functional-text" tabindex="-1" onclick="event.stopPropagation()" onkeydown="handleDeleteNonFunctionalRequirementModalKeydown(event)">
        <button type="button" class="confirm-modal-close" aria-label="Chiudi modal" title="Chiudi" onclick="closeDeleteNonFunctionalRequirementModalFromEvent(event)">×</button>
        <div class="confirm-modal-title" id="delete-non-functional-title">Conferma eliminazione</div>
        <div class="confirm-modal-text" id="delete-non-functional-text">Vuoi eliminare il requisito non funzionale <strong>${escapeHtml(deletingNonFunctionalRequirementId)}</strong>?</div>
        <div class="plan-notes-actions confirm-modal-actions">
          <button type="button" class="open-question-btn is-danger" data-modal-focus="first" onclick="confirmDeleteNonFunctionalRequirementFromEvent(event)" ${isNonFunctionalRequirementUpdating ? 'disabled' : ''}>Elimina</button>
          <button type="button" class="open-question-btn is-secondary" data-modal-focus="last" onclick="closeDeleteNonFunctionalRequirementModalFromEvent(event)" ${isNonFunctionalRequirementUpdating ? 'disabled' : ''}>Annulla</button>
        </div>
      </div>
    </div>
  `;
}

function enableCreateNonFunctionalRequirementFromEvent(event) { event.stopPropagation(); creatingNonFunctionalRequirement = true; newNonFunctionalRequirementId = 'RNF-'; creatingNonFunctionalRequirementStep = 'id'; newNonFunctionalRequirementTitle = ''; newNonFunctionalRequirementDescription = ''; renderRequirementDetail(); setTimeout(() => { const idInput = document.getElementById('new-non-functional-requirement-id'); if (!idInput) return; idInput.focus(); const cursor = idInput.value.length; idInput.setSelectionRange(cursor, cursor); }, 0); }
function cancelCreateNonFunctionalRequirementFromEvent(event) { event.stopPropagation(); creatingNonFunctionalRequirement = false; newNonFunctionalRequirementId = ''; creatingNonFunctionalRequirementStep = 'id'; newNonFunctionalRequirementTitle = ''; newNonFunctionalRequirementDescription = ''; renderRequirementDetail(); }
function proceedCreateNonFunctionalRequirementFromEvent(event) { event.stopPropagation(); if (!currentRequirement || currentSection !== 'requirements' || isNonFunctionalRequirementUpdating) return; const idEl = document.getElementById('new-non-functional-requirement-id'); const nonFunctionalId = String(idEl?.value || '').trim(); if (!nonFunctionalId) return showToast('Inserisci un ID', 'error'); if ((currentRequirement.nonFunctionalRequirements || []).some(item => item.id === nonFunctionalId)) return showToast('ID gia presente', 'error'); newNonFunctionalRequirementId = nonFunctionalId; creatingNonFunctionalRequirementStep = 'details'; renderRequirementDetail(); setTimeout(() => document.getElementById('new-non-functional-requirement-title')?.focus(), 0); }
function backCreateNonFunctionalRequirementFromEvent(event) { event.stopPropagation(); if (!currentRequirement || currentSection !== 'requirements' || isNonFunctionalRequirementUpdating) return; const titleEl = document.getElementById('new-non-functional-requirement-title'); const descriptionEl = document.getElementById('new-non-functional-requirement-description'); newNonFunctionalRequirementTitle = String(titleEl?.value || '').trim(); newNonFunctionalRequirementDescription = String(descriptionEl?.value || '').trim(); creatingNonFunctionalRequirementStep = 'id'; renderRequirementDetail(); setTimeout(() => { const idInput = document.getElementById('new-non-functional-requirement-id'); if (!idInput) return; idInput.focus(); const cursor = idInput.value.length; idInput.setSelectionRange(cursor, cursor); }, 0); }
async function createNonFunctionalRequirementFromEvent(event) {
  event.stopPropagation();
  if (!currentRequirement || currentSection !== 'requirements' || isNonFunctionalRequirementUpdating) return;
  const requirementId = currentRequirement.document?.id || currentRequirement.id;
  if (!requirementId) return;
  const nonFunctionalId = String(newNonFunctionalRequirementId || '').trim();
  if (!nonFunctionalId) return showToast('Inserisci un ID', 'error');
  if ((currentRequirement.nonFunctionalRequirements || []).some(item => item.id === nonFunctionalId)) return showToast('ID gia presente', 'error');
  const title = String(document.getElementById('new-non-functional-requirement-title')?.value || '').trim();
  const description = String(document.getElementById('new-non-functional-requirement-description')?.value || '').trim();
  if (!title || !description) return showToast('Titolo e descrizione sono obbligatori', 'error');

  isNonFunctionalRequirementUpdating = true;
  renderRequirementDetail();

  try {
    const res = await fetch(`/api/requirements/${encodeURIComponent(requirementId)}/non-functional-requirements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nonFunctionalId, title, description })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Unable to add non-functional requirement');
    }
    const [updatedRequirementRes] = await Promise.all([fetch(`/api/requirements/${encodeURIComponent(requirementId)}`, { cache: 'no-store' }), loadRequirements()]);
    if (!updatedRequirementRes.ok) throw new Error('Unable to refresh requirement after create');
    currentRequirement = await updatedRequirementRes.json();
    creatingNonFunctionalRequirement = false;
    newNonFunctionalRequirementId = '';
    creatingNonFunctionalRequirementStep = 'id';
    newNonFunctionalRequirementTitle = '';
    newNonFunctionalRequirementDescription = '';
    document.querySelector(`.plan-item[data-id="${CSS.escape(requirementId)}"]`)?.classList.add('active');
    renderRequirementDetail();
    showToast('Requisito non funzionale aggiunto');
    setTimeout(() => {
      const cards = Array.from(document.querySelectorAll('#nonFunctionalList .task-item'));
      const card = cards.find(el => el.querySelector('.task-id')?.textContent?.trim() === nonFunctionalId);
      if (!card) return;
      card.scrollIntoView({ behavior: 'instant', block: 'center' });
      card.style.transition = 'box-shadow .35s ease, transform .35s ease';
      card.style.boxShadow = '0 0 0 2px rgba(82, 145, 255, 0.45)';
      card.style.transform = 'scale(1.01)';
      setTimeout(() => {
        card.style.boxShadow = '';
        card.style.transform = '';
      }, 1200);
    }, 0);
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    isNonFunctionalRequirementUpdating = false;
    renderRequirementDetail();
  }
}
function editNonFunctionalRequirementByEncodedId(event, encodedNonFunctionalId) { event.stopPropagation(); if (!currentRequirement || currentSection !== 'requirements' || isNonFunctionalRequirementUpdating) return; editingNonFunctionalRequirementId = decodeURIComponent(encodedNonFunctionalId); renderRequirementDetail(); }
function cancelNonFunctionalRequirementEditFromEvent(event) { event.stopPropagation(); editingNonFunctionalRequirementId = null; renderRequirementDetail(); }
async function saveNonFunctionalRequirementByEncodedId(event, encodedNonFunctionalId) { event.stopPropagation(); const nonFunctionalId = decodeURIComponent(encodedNonFunctionalId); if (!currentRequirement || currentSection !== 'requirements' || isNonFunctionalRequirementUpdating) return; const requirementId = currentRequirement.document?.id || currentRequirement.id; if (!requirementId) return; const title = String(document.getElementById(`non-functional-title-${encodeURIComponent(nonFunctionalId)}`)?.value || ''); const description = String(document.getElementById(`non-functional-description-${encodeURIComponent(nonFunctionalId)}`)?.value || ''); isNonFunctionalRequirementUpdating = true; renderRequirementDetail(); try { const res = await fetch(`/api/requirements/${encodeURIComponent(requirementId)}/non-functional-requirements/${encodeURIComponent(nonFunctionalId)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, description }) }); if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Unable to update non-functional requirement'); } const [updatedRequirementRes] = await Promise.all([fetch(`/api/requirements/${encodeURIComponent(requirementId)}`, { cache: 'no-store' }), loadRequirements()]); if (!updatedRequirementRes.ok) throw new Error('Unable to refresh requirement after update'); currentRequirement = await updatedRequirementRes.json(); editingNonFunctionalRequirementId = null; renderRequirementDetail(); showToast('Requisito non funzionale aggiornato'); } catch (error) { showToast(error.message, 'error'); } finally { isNonFunctionalRequirementUpdating = false; renderRequirementDetail(); } }
function requestDeleteNonFunctionalRequirementByEncodedId(event, encodedNonFunctionalId) { event.stopPropagation(); if (!currentRequirement || currentSection !== 'requirements' || isNonFunctionalRequirementUpdating) return; deleteNonFunctionalModalReturnFocusEl = document.activeElement instanceof HTMLElement ? document.activeElement : null; deletingNonFunctionalRequirementId = decodeURIComponent(encodedNonFunctionalId); renderRequirementDetail(); setTimeout(() => { const cancelBtn = document.querySelector('.confirm-modal [data-modal-focus="last"]'); const dialog = document.querySelector('.confirm-modal'); if (cancelBtn instanceof HTMLElement) return cancelBtn.focus(); if (dialog instanceof HTMLElement) dialog.focus(); }, 0); }
function closeDeleteNonFunctionalRequirementModalFromEvent(event) { event.stopPropagation(); if (isNonFunctionalRequirementUpdating) return; deletingNonFunctionalRequirementId = null; renderRequirementDetail(); if (deleteNonFunctionalModalReturnFocusEl && typeof deleteNonFunctionalModalReturnFocusEl.focus === 'function') setTimeout(() => deleteNonFunctionalModalReturnFocusEl?.focus(), 0); deleteNonFunctionalModalReturnFocusEl = null; }
async function confirmDeleteNonFunctionalRequirementFromEvent(event) { event.stopPropagation(); const nonFunctionalId = deletingNonFunctionalRequirementId; if (!nonFunctionalId || !currentRequirement || currentSection !== 'requirements' || isNonFunctionalRequirementUpdating) return; deletingNonFunctionalRequirementId = null; const requirementId = currentRequirement.document?.id || currentRequirement.id; if (!requirementId) return; isNonFunctionalRequirementUpdating = true; renderRequirementDetail(); try { const res = await fetch(`/api/requirements/${encodeURIComponent(requirementId)}/non-functional-requirements/${encodeURIComponent(nonFunctionalId)}`, { method: 'DELETE' }); if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Unable to delete non-functional requirement'); } const [updatedRequirementRes] = await Promise.all([fetch(`/api/requirements/${encodeURIComponent(requirementId)}`, { cache: 'no-store' }), loadRequirements()]); if (!updatedRequirementRes.ok) throw new Error('Unable to refresh requirement after delete'); currentRequirement = await updatedRequirementRes.json(); if (editingNonFunctionalRequirementId === nonFunctionalId) editingNonFunctionalRequirementId = null; renderRequirementDetail(); showToast('Requisito non funzionale eliminato'); } catch (error) { showToast(error.message, 'error'); } finally { isNonFunctionalRequirementUpdating = false; renderRequirementDetail(); } }
function handleDeleteNonFunctionalRequirementModalKeydown(event) { if (!deletingNonFunctionalRequirementId) return; if (event.key === 'Escape') { event.preventDefault(); closeDeleteNonFunctionalRequirementModalFromEvent(event); return; } if (event.key !== 'Tab') return; const focusable = Array.from(document.querySelectorAll('.confirm-modal button:not([disabled]), .confirm-modal [href], .confirm-modal input:not([disabled]), .confirm-modal textarea:not([disabled]), .confirm-modal select:not([disabled]), .confirm-modal [tabindex]:not([tabindex="-1"])')); if (!focusable.length) return; const first = focusable[0]; const last = focusable[focusable.length - 1]; const active = document.activeElement; if (event.shiftKey && active === first) { event.preventDefault(); last.focus(); return; } if (!event.shiftKey && active === last) { event.preventDefault(); first.focus(); } }

function renderStoryEditForm(story) {
  const criteria = Array.isArray(story.acceptanceCriteria) ? story.acceptanceCriteria : [];
  const criteriaRows = (criteria.length ? criteria : [{ text: '' }]).map(c => `
    <div class="criterion-row">
      <input
        type="text"
        class="plan-notes-input compact-input"
        data-criterion-input="${encodeURIComponent(story.id)}"
        value="${escapeHtml(c?.text || '')}"
        ${isStoryUpdating ? 'disabled' : ''}>
      <button
        type="button"
        class="open-question-btn is-secondary"
        onclick="removeStoryCriterionFromEvent(event, '${encodeURIComponent(story.id)}')"
        ${isStoryUpdating ? 'disabled' : ''}>Rimuovi</button>
    </div>
  `).join('');

  return `
    <div class="plan-notes-form">
      <label class="open-question-label" for="story-title-${encodeURIComponent(story.id)}">Titolo</label>
      <input id="story-title-${encodeURIComponent(story.id)}" type="text" class="plan-notes-input compact-input" value="${escapeHtml(story.title || '')}" ${isStoryUpdating ? 'disabled' : ''}>
      <label class="open-question-label" for="story-asa-${encodeURIComponent(story.id)}">As a</label>
      <input id="story-asa-${encodeURIComponent(story.id)}" type="text" class="plan-notes-input compact-input" value="${escapeHtml(story.asA || '')}" ${isStoryUpdating ? 'disabled' : ''}>
      <label class="open-question-label" for="story-iwant-${encodeURIComponent(story.id)}">I want</label>
      <input id="story-iwant-${encodeURIComponent(story.id)}" type="text" class="plan-notes-input compact-input" value="${escapeHtml(story.iWant || '')}" ${isStoryUpdating ? 'disabled' : ''}>
      <label class="open-question-label" for="story-sothat-${encodeURIComponent(story.id)}">So that</label>
      <input id="story-sothat-${encodeURIComponent(story.id)}" type="text" class="plan-notes-input compact-input" value="${escapeHtml(story.soThat || '')}" ${isStoryUpdating ? 'disabled' : ''}>
      <div class="task-dod-title"><span>Acceptance Criteria</span></div>
      <div id="story-criteria-${encodeURIComponent(story.id)}">${criteriaRows}</div>
      <button type="button" class="open-question-btn is-secondary" onclick="addStoryCriterionFromEvent(event, '${encodeURIComponent(story.id)}')" ${isStoryUpdating ? 'disabled' : ''}>+ Criterio</button>
      <div class="plan-notes-actions">
        <button type="button" class="open-question-btn" onclick="saveStoryByEncodedId(event, '${encodeURIComponent(story.id)}')" ${isStoryUpdating ? 'disabled' : ''}>Salva</button>
        <button type="button" class="open-question-btn is-secondary" onclick="cancelStoryEditFromEvent(event)" ${isStoryUpdating ? 'disabled' : ''}>Annulla</button>
      </div>
    </div>
  `;
}

function renderStoryCreateBox() {
  return `<div class="section-title-row compact"><div class="section-title">User stories</div><button type="button" class="icon-action-btn is-add" onclick="enableStoryCreateFromEvent(event)" ${isStoryUpdating ? 'disabled' : ''}>${ADD_ICON_SVG}</button></div>${creatingStory ? `<div class="task-item"><div class="task-header"><span class="task-id">Nuova user story</span></div><div class="plan-notes-form">${creatingStoryStep === 'id' ? `<label class="open-question-label" for="new-story-id">ID</label><input id="new-story-id" type="text" class="plan-notes-input compact-input" value="${escapeHtml(newStoryId)}" ${isStoryUpdating ? 'disabled' : ''}><div class="plan-notes-actions"><button type="button" class="open-question-btn" onclick="proceedStoryCreateFromEvent(event)" ${isStoryUpdating ? 'disabled' : ''}>Avanti</button><button type="button" class="open-question-btn is-secondary" onclick="cancelStoryCreateFromEvent(event)" ${isStoryUpdating ? 'disabled' : ''}>Annulla</button></div>` : `<div class="task-header task-header-tight"><span class="task-id">ID: ${escapeHtml(newStoryId)}</span></div>${renderStoryEditForm({ id: 'new', title: '', asA: '', iWant: '', soThat: '' }).replace(`saveStoryByEncodedId(event, 'new')`, 'createStoryFromEvent(event)').replace('cancelStoryEditFromEvent(event)', 'cancelStoryCreateFromEvent(event)')}</div>`}</div></div><div class="spacer-20"></div>` : ''}`;
}
function enableStoryCreateFromEvent(event) { event.stopPropagation(); creatingStory = true; creatingStoryStep = 'id'; newStoryId = 'US-'; renderRequirementDetail(); setTimeout(() => { const el = document.getElementById('new-story-id'); if (!el) return; el.focus(); el.setSelectionRange(el.value.length, el.value.length); }, 0); }
function cancelStoryCreateFromEvent(event) { event.stopPropagation(); creatingStory = false; creatingStoryStep = 'id'; newStoryId = ''; renderRequirementDetail(); }
function proceedStoryCreateFromEvent(event) { event.stopPropagation(); const id = String(document.getElementById('new-story-id')?.value || '').trim(); if (!id) return showToast('Inserisci un ID', 'error'); if ((currentRequirement.userStories || []).some(s => s.id === id)) return showToast('ID gia presente', 'error'); newStoryId = id; creatingStoryStep = 'details'; renderRequirementDetail(); }
function enableStoryEditByEncodedId(event, encodedStoryId) { event.stopPropagation(); editingStoryId = decodeURIComponent(encodedStoryId); renderRequirementDetail(); }
function cancelStoryEditFromEvent(event) { event.stopPropagation(); editingStoryId = null; renderRequirementDetail(); }
function addStoryCriterionFromEvent(event, encodedStoryId) {
  event.stopPropagation();
  const id = decodeURIComponent(encodedStoryId);
  const container = document.getElementById(`story-criteria-${encodeURIComponent(id)}`);
  if (!container) return;
  container.insertAdjacentHTML('beforeend', `<div class="criterion-row"><input type="text" class="plan-notes-input compact-input" data-criterion-input="${encodeURIComponent(id)}" value=""><button type="button" class="open-question-btn is-secondary" onclick="removeStoryCriterionFromEvent(event, '${encodeURIComponent(id)}')">Rimuovi</button></div>`);
}
function removeStoryCriterionFromEvent(event, encodedStoryId) { event.stopPropagation(); const row = event.currentTarget?.closest('div'); const container = document.getElementById(`story-criteria-${encodedStoryId}`); if (!row || !container) return; const rows = container.querySelectorAll('[data-criterion-input]'); if (rows.length <= 1) return showToast('Deve rimanere almeno un criterio', 'error'); row.remove(); }
async function saveStoryByEncodedId(event, encodedStoryId) { event.stopPropagation(); const storyId = decodeURIComponent(encodedStoryId); const requirementId = currentRequirement.document?.id || currentRequirement.id; if (!requirementId) return; const payload = { title: String(document.getElementById(`story-title-${encodeURIComponent(storyId)}`)?.value || ''), asA: String(document.getElementById(`story-asa-${encodeURIComponent(storyId)}`)?.value || ''), iWant: String(document.getElementById(`story-iwant-${encodeURIComponent(storyId)}`)?.value || ''), soThat: String(document.getElementById(`story-sothat-${encodeURIComponent(storyId)}`)?.value || '') }; const criteria = Array.from(document.querySelectorAll(`#story-criteria-${encodeURIComponent(storyId)} [data-criterion-input]`)).map(el => String(el.value || '').trim()).filter(Boolean); if (!criteria.length) return showToast('Inserisci almeno un acceptance criterion', 'error'); payload.acceptanceCriteria = criteria; isStoryUpdating = true; renderRequirementDetail(); try { const res = await fetch(`/api/requirements/${encodeURIComponent(requirementId)}/stories/${encodeURIComponent(storyId)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Unable to update story'); } const updated = await fetch(`/api/requirements/${encodeURIComponent(requirementId)}`, { cache: 'no-store' }); await loadRequirements(); currentRequirement = await updated.json(); editingStoryId = null; showToast('User story aggiornata'); } catch (e) { showToast(e.message, 'error'); } finally { isStoryUpdating = false; renderRequirementDetail(); } }
async function createStoryFromEvent(event) {
  event.stopPropagation();
  const requirementId = currentRequirement.document?.id || currentRequirement.id;
  if (!requirementId) return;
  const createdStoryId = String(newStoryId || '').trim();
  const payload = {
    storyId: newStoryId,
    title: String(document.getElementById('story-title-new')?.value || ''),
    asA: String(document.getElementById('story-asa-new')?.value || ''),
    iWant: String(document.getElementById('story-iwant-new')?.value || ''),
    soThat: String(document.getElementById('story-sothat-new')?.value || '')
  };
  const criteria = Array.from(document.querySelectorAll('#story-criteria-new [data-criterion-input]')).map(el => String(el.value || '').trim()).filter(Boolean);
  if (!criteria.length) return showToast('Inserisci almeno un acceptance criterion', 'error');
  payload.acceptanceCriteria = criteria;
  isStoryUpdating = true;
  renderRequirementDetail();
  try {
    const res = await fetch(`/api/requirements/${encodeURIComponent(requirementId)}/stories`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Unable to create story'); }
    const updated = await fetch(`/api/requirements/${encodeURIComponent(requirementId)}`, { cache: 'no-store' });
    await loadRequirements();
    currentRequirement = await updated.json();
    creatingStory = false;
    creatingStoryStep = 'id';
    newStoryId = '';
    showToast('User story aggiunta');
    setTimeout(() => {
      const cards = Array.from(document.querySelectorAll('#userStoriesRequirementsList .task-item'));
      const card = cards.find(el => el.querySelector('.task-id')?.textContent?.trim() === createdStoryId);
      if (!card) return;
      card.scrollIntoView({ behavior: 'instant', block: 'center' });
      card.style.transition = 'box-shadow .35s ease, transform .35s ease';
      card.style.boxShadow = '0 0 0 2px rgba(82, 145, 255, 0.45)';
      card.style.transform = 'scale(1.01)';
      setTimeout(() => {
        card.style.boxShadow = '';
        card.style.transform = '';
      }, 1200);
    }, 0);
  } catch (e) {
    showToast(e.message, 'error');
  } finally {
    isStoryUpdating = false;
    renderRequirementDetail();
  }
}
function requestDeleteStoryByEncodedId(event, encodedStoryId) { event.stopPropagation(); deletingStoryId = decodeURIComponent(encodedStoryId); renderRequirementDetail(); }
function renderDeleteStoryModal() { if (!deletingStoryId) return ''; return `<div class="confirm-modal-overlay" onclick="closeDeleteStoryModalFromEvent(event)"><div class="confirm-modal" role="dialog" aria-modal="true" tabindex="-1" onclick="event.stopPropagation()"><button type="button" class="confirm-modal-close" onclick="closeDeleteStoryModalFromEvent(event)">×</button><div class="confirm-modal-title">Conferma eliminazione</div><div class="confirm-modal-text">Vuoi eliminare la user story <strong>${escapeHtml(deletingStoryId)}</strong>?</div><div class="plan-notes-actions confirm-modal-actions"><button type="button" class="open-question-btn is-danger" onclick="confirmDeleteStoryFromEvent(event)">Elimina</button><button type="button" class="open-question-btn is-secondary" onclick="closeDeleteStoryModalFromEvent(event)">Annulla</button></div></div></div>`; }
function closeDeleteStoryModalFromEvent(event) { event.stopPropagation(); deletingStoryId = null; renderRequirementDetail(); }
async function confirmDeleteStoryFromEvent(event) { event.stopPropagation(); const storyId = deletingStoryId; if (!storyId) return; const requirementId = currentRequirement.document?.id || currentRequirement.id; if (!requirementId) return; deletingStoryId = null; isStoryUpdating = true; renderRequirementDetail(); try { const res = await fetch(`/api/requirements/${encodeURIComponent(requirementId)}/stories/${encodeURIComponent(storyId)}`, { method: 'DELETE' }); if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Unable to delete story'); } const updated = await fetch(`/api/requirements/${encodeURIComponent(requirementId)}`, { cache: 'no-store' }); await loadRequirements(); currentRequirement = await updated.json(); showToast('User story eliminata'); } catch (e) { showToast(e.message, 'error'); } finally { isStoryUpdating = false; renderRequirementDetail(); } }

function configurePlanTabs(activeTab = 'overview') {
  toggleTab('overview', true);
  toggleTab('stories', true);
  toggleTab('tasks', true);
  toggleTab('decisions', true);
  toggleTab('functional', false);
  toggleTab('architectural-decisions', false);
  toggleTab('non-functional', false);
  toggleTab('user-stories', false);
  toggleTab('open-questions', false);
  const requestedTab = activeTab || 'overview';
  const requestedTabEl = document.querySelector(`.tab[data-tab="${requestedTab}"]`);
  activateTab(requestedTabEl && !requestedTabEl.classList.contains('hidden') ? requestedTab : 'overview');
}

function configureRequirementTabs(hasArchitecturalDecisions, activeTab = 'overview') {
  toggleTab('overview', true);
  toggleTab('stories', false);
  toggleTab('tasks', false);
  toggleTab('decisions', false);
  toggleTab('functional', true);
  toggleTab('architectural-decisions', hasArchitecturalDecisions);
  toggleTab('non-functional', true);
  toggleTab('user-stories', true);
  toggleTab('open-questions', true);
  const requestedTab = activeTab || 'overview';
  const requestedTabEl = document.querySelector(`.tab[data-tab="${requestedTab}"]`);
  activateTab(requestedTabEl && !requestedTabEl.classList.contains('hidden') ? requestedTab : 'overview');
}

function toggleTab(name, visible) {
  const tab = document.querySelector(`.tab[data-tab="${name}"]`);
  if (!tab) return;
  tab.classList.toggle('hidden', !visible);
}

function activateTab(name) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('show'));
  const tab = document.querySelector(`.tab[data-tab="${name}"]`);
  if (tab && !tab.classList.contains('hidden')) {
    tab.classList.add('active');
    document.getElementById(`tab-${name}`)?.classList.add('show');
  }
}

function showDetail() {
  document.getElementById('welcome').style.display = 'none';
  document.getElementById('detailView').classList.add('show');
}

function setSection(section) {
  if (!hasWorkspaceConfigured || !currentWorkspace) {
    currentSection = section || 'plans';
    document.querySelectorAll('.section-switch-tab').forEach(tab => tab.classList.toggle('active', tab.dataset.section === currentSection));
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('show'));
    document.getElementById('detailView').classList.remove('show');
    document.getElementById('welcome').style.display = 'flex';
    document.getElementById('welcomeTitle').textContent = 'Aggiungi un workspace';
    document.getElementById('welcomeText').textContent = 'Per iniziare clicca + nella sidebar e carica una cartella progetto con docs/plans e docs/requirements.';
    return;
  }
  currentSection = section;
  const welcomeIcon = document.getElementById('welcomeIcon');
  document.querySelectorAll('.section-switch-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.section === section);
  });

  currentPlan = null;
  currentRequirement = null;
  editingTaskDodId = null;
  taskDodFocusTarget = null;
  isPlanNotesEditing = false;
  isPlanNotesUpdating = false;
  isPlanObjectiveEditing = false;
  isPlanObjectiveUpdating = false;
  isPlanPhasesEditing = false;
  isPlanPhasesUpdating = false;
  editingPlanPhases = [];
  editingTaskNotesId = null;
  isTaskNotesUpdating = false;
  editingTaskImplementationNotesId = null;
  isTaskImplementationNotesUpdating = false;
  openTaskNotesIds = new Set();
  editingTaskField = null;
  isTaskFieldUpdating = false;
  isRequirementOverviewEditing = false;
  isRequirementOverviewUpdating = false;
  isRequirementCurrentStateEditing = false;
  isRequirementCurrentStateUpdating = false;
  isRequirementNotesEditing = false;
  isRequirementNotesUpdating = false;
  document.getElementById('detailView').classList.remove('show');
  document.getElementById('welcome').style.display = 'flex';
  buildRightNav();

  if (section === 'plans') {
    welcomeIcon.innerHTML = WELCOME_PLAN_ICON;
    welcomeIcon.classList.remove('is-requirement');
    welcomeIcon.classList.add('is-plan');
    document.getElementById('welcomeTitle').textContent = 'Select a plan';
    document.getElementById('welcomeText').textContent = 'Choose a plan from the sidebar to view its details, stories, and tasks.';
    document.getElementById('searchInput').placeholder = 'Search plans, stories, tasks...';
    configurePlanTabs();
    renderStatusFilters();
    renderPlansList();
  } else {
    welcomeIcon.innerHTML = WELCOME_REQUIREMENT_ICON;
    welcomeIcon.classList.remove('is-plan');
    welcomeIcon.classList.add('is-requirement');
    document.getElementById('welcomeTitle').textContent = 'Select a requirement';
    document.getElementById('welcomeText').textContent = 'Choose a requirement from the sidebar to view its details.';
    document.getElementById('searchInput').placeholder = 'Search requirements, RF, RNF, stories...';
    configureRequirementTabs(true);
    renderStatusFilters();
    renderRequirementsList();
  }
}

function normalizeStoryStatus(status) {
  const value = String(status || '').trim().toLowerCase();
  if (value === 'completed' || value === 'done') return 'completed';
  if (value === 'in_progress' || value === 'in progress') return 'in_progress';
  return 'in_progress';
}

function handleTaskStatusChange(taskId, nextStatus, optionEl) {
  const dropdownRoot = optionEl.closest('.task-status-dropdown');
  if (!dropdownRoot || dropdownRoot.classList.contains('is-updating')) return;

  dropdownRoot.classList.remove('is-open');
  setStatusSelectClass(dropdownRoot, nextStatus);
  updateTaskStatus(taskId, nextStatus, dropdownRoot);
}

function handleTaskStatusChangeByEncodedId(encodedTaskId, nextStatus, optionEl) {
  handleTaskStatusChange(decodeURIComponent(encodedTaskId), nextStatus, optionEl);
}

function selectPlanByEncodedId(encodedPlanId) {
  return selectPlan(decodeURIComponent(encodedPlanId));
}

function selectRequirementByEncodedId(encodedRequirementId) {
  return selectRequirement(decodeURIComponent(encodedRequirementId));
}

async function updateTaskStatus(taskId, status, dropdownRoot) {
  if (!currentPlan || currentSection !== 'plans') return;

  const previousStatus = currentPlan.tasks?.find(t => t.id === taskId)?.status;
  dropdownRoot.classList.add('is-updating');

  try {
    const res = await fetch(`/api/plans/${encodeURIComponent(currentPlan.id)}/tasks/${encodeURIComponent(taskId)}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Unable to update task status');
    }

    await res.json();

    const [planDetailRes] = await Promise.all([
      fetch(`/api/plans/${encodeURIComponent(currentPlan.id)}`, { cache: 'no-store' }),
      loadPlans()
    ]);

    if (!planDetailRes.ok) {
      throw new Error('Unable to refresh plan after status update');
    }

    currentPlan = await planDetailRes.json();
    document.querySelector(`.plan-item[data-id="${CSS.escape(currentPlan.id)}"]`)?.classList.add('active');
    renderPlanDetail();
  } catch (error) {
    if (previousStatus) setStatusSelectClass(dropdownRoot, previousStatus);
    alert(error.message);
  } finally {
    dropdownRoot.classList.remove('is-updating');
  }
}

function setStatusSelectClass(controlRoot, status) {
  if (!controlRoot) return;

  const trigger = controlRoot.querySelector('.task-status-trigger');
  const label = controlRoot.querySelector('.task-status-label');
  const options = controlRoot.querySelectorAll('.task-status-option');

  TASK_STATUSES.forEach(taskStatus => {
    controlRoot.classList.remove(`status-${taskStatus}`);
    trigger?.classList.remove(`status-${taskStatus}`);
  });

  controlRoot.classList.add(`status-${status}`);
  trigger?.classList.add(`status-${status}`);
  if (label) label.textContent = formatStatus(status);

  options.forEach(option => {
    option.classList.toggle('is-current', option.classList.contains(`status-${status}`));
  });
}

function toggleTaskStatusDropdown(triggerEl) {
  const dropdownRoot = triggerEl.closest('.task-status-dropdown');
  if (!dropdownRoot || dropdownRoot.classList.contains('is-updating')) return;

  const willOpen = !dropdownRoot.classList.contains('is-open');
  closeAllTaskStatusDropdowns();
  if (willOpen) dropdownRoot.classList.add('is-open');
}

function closeAllTaskStatusDropdowns() {
  document.querySelectorAll('.task-status-dropdown.is-open').forEach(dropdown => {
    dropdown.classList.remove('is-open');
  });
}

function toggleTaskPhaseDropdown(triggerEl) {
  const dropdownRoot = triggerEl.closest('.task-phase-dropdown');
  if (!dropdownRoot || dropdownRoot.classList.contains('is-updating')) return;

  const willOpen = !dropdownRoot.classList.contains('is-open');
  closeAllTaskStatusDropdowns();
  if (willOpen) dropdownRoot.classList.add('is-open');
}

function handleTaskPhaseSelect(taskId, phaseTitle, optionEl) {
  const dropdownRoot = optionEl.closest('.task-phase-dropdown');
  if (!dropdownRoot || dropdownRoot.classList.contains('is-updating')) return;

  const hiddenInput = document.getElementById(`task-phase-${taskId}`);
  const label = dropdownRoot.querySelector('.task-status-label');
  if (!hiddenInput || !label) return;

  hiddenInput.value = phaseTitle;
  label.textContent = phaseTitle;
  dropdownRoot.classList.remove('is-open');
  dropdownRoot.querySelectorAll('.task-status-option').forEach(option => option.classList.remove('is-current'));
  optionEl.classList.add('is-current');
}

function handleTaskPhaseSelectByEncodedId(encodedTaskId, encodedPhaseTitle, optionEl) {
  handleTaskPhaseSelect(decodeURIComponent(encodedTaskId), decodeURIComponent(encodedPhaseTitle), optionEl);
}

function enableTaskDodEdit(taskId) {
  if (!currentPlan || currentSection !== 'plans' || isTaskDodUpdating) return;
  if (editingTaskDodId === taskId) return;
  editingTaskDodId = taskId;
  renderPlanDetail();
}

function disableTaskDodEdit() {
  if (!currentPlan || currentSection !== 'plans' || isTaskDodUpdating) return;
  if (!editingTaskDodId) return;
  editingTaskDodId = null;
  taskDodFocusTarget = null;
  renderPlanDetail();
}

function disableTaskDodEditFromEvent(event) {
  event.stopPropagation();
  disableTaskDodEdit();
}

function enablePlanNotesEdit() {
  if (!currentPlan || currentSection !== 'plans' || isPlanNotesUpdating) return;
  if (isPlanNotesEditing) return;
  isPlanNotesEditing = true;
  renderPlanDetail();
}

function enablePlanObjectiveEdit() {
  if (!currentPlan || currentSection !== 'plans' || isPlanObjectiveUpdating) return;
  if (isPlanObjectiveEditing) return;
  isPlanObjectiveEditing = true;
  renderPlanDetail();
}

function enablePlanObjectiveEditFromEvent(event) {
  event.stopPropagation();
  enablePlanObjectiveEdit();
}

function cancelPlanObjectiveEdit() {
  if (!currentPlan || currentSection !== 'plans' || isPlanObjectiveUpdating) return;
  if (!isPlanObjectiveEditing) return;
  isPlanObjectiveEditing = false;
  renderPlanDetail();
}

function cancelPlanObjectiveEditFromEvent(event) {
  event.stopPropagation();
  cancelPlanObjectiveEdit();
}

async function savePlanObjective() {
  if (!currentPlan || currentSection !== 'plans' || !isPlanObjectiveEditing || isPlanObjectiveUpdating) return;
  const objectiveEl = document.getElementById('plan-objective-input');
  if (!objectiveEl) return;

  const objective = String(objectiveEl.value || '');
  const previousObjective = currentPlan.objective || '';

  currentPlan.objective = objective;
  isPlanObjectiveUpdating = true;
  renderPlanDetail();

  try {
    const res = await fetch(`/api/plans/${encodeURIComponent(currentPlan.id)}/objective`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ objective })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Unable to update plan objective');
    }

    const [updatedPlanRes] = await Promise.all([
      fetch(`/api/plans/${encodeURIComponent(currentPlan.id)}`, { cache: 'no-store' }),
      loadPlans()
    ]);

    if (!updatedPlanRes.ok) {
      throw new Error('Unable to refresh plan after objective update');
    }

    currentPlan = await updatedPlanRes.json();
    isPlanObjectiveEditing = false;
    document.querySelector(`.plan-item[data-id="${CSS.escape(currentPlan.id)}"]`)?.classList.add('active');
    renderPlanDetail();
    showToast('Objective piano salvato');
  } catch (error) {
    currentPlan.objective = previousObjective;
    renderPlanDetail();
    showToast(error.message, 'error');
  } finally {
    isPlanObjectiveUpdating = false;
    renderPlanDetail();
  }
}

function savePlanObjectiveFromEvent(event) {
  event.stopPropagation();
  savePlanObjective();
}

function enablePlanPhasesEdit() {
  if (!currentPlan || currentSection !== 'plans' || isPlanPhasesUpdating) return;
  if (isPlanPhasesEditing) return;
  editingPlanPhases = buildPhasesForEditor(currentPlan);
  if (!editingPlanPhases.length) {
    editingPlanPhases = [{ title: '', tasks: [] }];
  }
  isPlanPhasesEditing = true;
  renderPlanDetail();
}

function addPlanPhase() {
  if (!currentPlan || currentSection !== 'plans' || !isPlanPhasesEditing || isPlanPhasesUpdating) return;
  editingPlanPhases = [...editingPlanPhases, { title: '', tasks: [] }];
  renderPlanDetail();
}

function addPlanPhaseFromEvent(event) {
  event.stopPropagation();
  addPlanPhase();
}

function removePlanPhase(index) {
  if (!currentPlan || currentSection !== 'plans' || !isPlanPhasesEditing || isPlanPhasesUpdating) return;
  editingPlanPhases = editingPlanPhases.filter((_, currentIndex) => currentIndex !== index);
  if (!editingPlanPhases.length) editingPlanPhases = [{ title: '', tasks: [] }];
  renderPlanDetail();
}

function removePlanPhaseFromEvent(event, index) {
  event.stopPropagation();
  removePlanPhase(index);
}

function updatePlanPhaseTitle(index, value) {
  if (!currentPlan || currentSection !== 'plans' || !isPlanPhasesEditing || isPlanPhasesUpdating) return;
  if (!editingPlanPhases[index]) return;
  editingPlanPhases[index].title = String(value || '');
}

function updatePlanPhaseTitleFromEvent(event, index) {
  event.stopPropagation();
  updatePlanPhaseTitle(index, event.target.value);
}

function togglePlanPhaseTask(index, taskId) {
  if (!currentPlan || currentSection !== 'plans' || !isPlanPhasesEditing || isPlanPhasesUpdating) return;
  const phase = editingPlanPhases[index];
  if (!phase) return;
  const selectedTaskIds = Array.isArray(phase.tasks) ? phase.tasks : [];
  if (selectedTaskIds.includes(taskId)) {
    phase.tasks = selectedTaskIds.filter(id => id !== taskId);
  } else {
    phase.tasks = [...selectedTaskIds, taskId];
  }
}

function togglePlanPhaseTaskByEncodedId(event, index, encodedTaskId) {
  event.stopPropagation();
  togglePlanPhaseTask(index, decodeURIComponent(encodedTaskId));
}

function enablePlanPhasesEditFromEvent(event) {
  event.stopPropagation();
  enablePlanPhasesEdit();
}

function cancelPlanPhasesEdit() {
  if (!currentPlan || currentSection !== 'plans' || isPlanPhasesUpdating) return;
  if (!isPlanPhasesEditing) return;
  isPlanPhasesEditing = false;
  editingPlanPhases = [];
  renderPlanDetail();
}

function cancelPlanPhasesEditFromEvent(event) {
  event.stopPropagation();
  cancelPlanPhasesEdit();
}

async function savePlanPhases() {
  if (!currentPlan || currentSection !== 'plans' || !isPlanPhasesEditing || isPlanPhasesUpdating) return;
  const previousPhases = Array.isArray(currentPlan.phases) ? currentPlan.phases : [];
  const phases = editingPlanPhases
    .map(phase => ({
      title: String(phase?.title || '').trim(),
      tasks: Array.isArray(phase?.tasks) ? phase.tasks.map(taskId => String(taskId).trim()).filter(Boolean) : []
    }))
    .filter(phase => phase.title);

  if (!phases.length) {
    showToast('Aggiungi almeno una fase con titolo', 'error');
    return;
  }

  currentPlan.phases = phases;
  isPlanPhasesUpdating = true;
  renderPlanDetail();

  try {
    const res = await fetch(`/api/plans/${encodeURIComponent(currentPlan.id)}/phases`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phases })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Unable to update plan phases');
    }

    const [updatedPlanRes] = await Promise.all([
      fetch(`/api/plans/${encodeURIComponent(currentPlan.id)}`, { cache: 'no-store' }),
      loadPlans()
    ]);

    if (!updatedPlanRes.ok) {
      throw new Error('Unable to refresh plan after phases update');
    }

    currentPlan = await updatedPlanRes.json();
    isPlanPhasesEditing = false;
    editingPlanPhases = [];
    document.querySelector(`.plan-item[data-id="${CSS.escape(currentPlan.id)}"]`)?.classList.add('active');
    renderPlanDetail();
    showToast('Phases piano salvate');
  } catch (error) {
    currentPlan.phases = previousPhases;
    renderPlanDetail();
    showToast(error.message, 'error');
  } finally {
    isPlanPhasesUpdating = false;
    renderPlanDetail();
  }
}

function savePlanPhasesFromEvent(event) {
  event.stopPropagation();
  savePlanPhases();
}

function enablePlanNotesEditFromEvent(event) {
  event.stopPropagation();
  enablePlanNotesEdit();
}

function cancelPlanNotesEdit() {
  if (!currentPlan || currentSection !== 'plans' || isPlanNotesUpdating) return;
  if (!isPlanNotesEditing) return;
  isPlanNotesEditing = false;
  renderPlanDetail();
}

function cancelPlanNotesEditFromEvent(event) {
  event.stopPropagation();
  cancelPlanNotesEdit();
}

async function savePlanNotes() {
  if (!currentPlan || currentSection !== 'plans' || !isPlanNotesEditing || isPlanNotesUpdating) return;
  const notesEl = document.getElementById('plan-notes-input');
  if (!notesEl) return;

  const notes = String(notesEl.value || '');
  const previousNotes = currentPlan.notes || '';

  currentPlan.notes = notes;
  isPlanNotesUpdating = true;
  renderPlanDetail();

  try {
    const res = await fetch(`/api/plans/${encodeURIComponent(currentPlan.id)}/notes`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Unable to update plan notes');
    }

    const [updatedPlanRes] = await Promise.all([
      fetch(`/api/plans/${encodeURIComponent(currentPlan.id)}`, { cache: 'no-store' }),
      loadPlans()
    ]);

    if (!updatedPlanRes.ok) {
      throw new Error('Unable to refresh plan after notes update');
    }

    currentPlan = await updatedPlanRes.json();
    isPlanNotesEditing = false;
    document.querySelector(`.plan-item[data-id="${CSS.escape(currentPlan.id)}"]`)?.classList.add('active');
    renderPlanDetail();
    showToast('Note piano salvate');
  } catch (error) {
    currentPlan.notes = previousNotes;
    renderPlanDetail();
    showToast(error.message, 'error');
  } finally {
    isPlanNotesUpdating = false;
    renderPlanDetail();
  }
}

function savePlanNotesFromEvent(event) {
  event.stopPropagation();
  savePlanNotes();
}

function enableTaskFieldEdit(taskId, field) {
  if (!currentPlan || currentSection !== 'plans' || isTaskFieldUpdating) return;
  if (!taskId || !field) return;
  if (field === 'phase' && !(Array.isArray(currentPlan.phases) && currentPlan.phases.some(phase => String(phase?.title || '').trim()))) {
    showToast('Nessuna phase disponibile nel piano', 'error');
    return;
  }
  editingTaskField = { taskId, field };
  renderPlanDetail();
}

function enableTaskFieldEditByEncodedId(event, encodedTaskId, field) {
  event.stopPropagation();
  enableTaskFieldEdit(decodeURIComponent(encodedTaskId), field);
}

function cancelTaskFieldEdit() {
  if (!editingTaskField || isTaskFieldUpdating) return;
  editingTaskField = null;
  renderPlanDetail();
}

function cancelTaskFieldEditFromEvent(event) {
  event.stopPropagation();
  cancelTaskFieldEdit();
}

async function saveTaskField(planId, taskId, field) {
  if (!currentPlan || currentSection !== 'plans' || isTaskFieldUpdating) return;
  const task = (currentPlan.tasks || []).find(item => item.id === taskId);
  if (!task) return;

  let endpoint = '';
  let body = {};
  const previousValue = task[field];

  if (field === 'primary') {
    const titleInputEl = document.getElementById(`task-title-${taskId}`);
    const whatToDoTextareaEl = document.getElementById(`task-whatToDo-${taskId}`);
    if (!titleInputEl || !whatToDoTextareaEl) return;

    const title = String(titleInputEl.value || '');
    const whatToDo = String(whatToDoTextareaEl.value || '');
    const previousTitle = task.title;
    const previousWhatToDo = task.whatToDo;

    task.title = title;
    task.whatToDo = whatToDo;

    isTaskFieldUpdating = true;
    renderPlanDetail();

    try {
      const [titleRes, whatToDoRes] = await Promise.all([
        fetch(`/api/plans/${encodeURIComponent(planId)}/tasks/${encodeURIComponent(taskId)}/title`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title })
        }),
        fetch(`/api/plans/${encodeURIComponent(planId)}/tasks/${encodeURIComponent(taskId)}/what-to-do`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ whatToDo })
        })
      ]);

      if (!titleRes.ok || !whatToDoRes.ok) {
        const titleErr = !titleRes.ok ? await titleRes.json().catch(() => ({})) : null;
        const whatErr = !whatToDoRes.ok ? await whatToDoRes.json().catch(() => ({})) : null;
        throw new Error(titleErr?.error || whatErr?.error || 'Unable to update task fields');
      }

      const [updatedPlanRes] = await Promise.all([
        fetch(`/api/plans/${encodeURIComponent(planId)}`, { cache: 'no-store' }),
        loadPlans()
      ]);

      if (!updatedPlanRes.ok) {
        throw new Error('Unable to refresh plan after task field update');
      }

      currentPlan = await updatedPlanRes.json();
      editingTaskField = null;
      document.querySelector(`.plan-item[data-id="${CSS.escape(planId)}"]`)?.classList.add('active');
      renderPlanDetail();
      showToast('Campi task salvati');
    } catch (error) {
      task.title = previousTitle;
      task.whatToDo = previousWhatToDo;
      renderPlanDetail();
      showToast(error.message, 'error');
    } finally {
      isTaskFieldUpdating = false;
      renderPlanDetail();
    }
    return;
  } else if (field === 'title' || field === 'phase') {
    const inputEl = document.getElementById(`task-${field}-${taskId}`);
    if (!inputEl) return;
    body[field] = String(inputEl.value || '');
    task[field] = body[field];
    endpoint = field;
  } else if (field === 'whatToDo') {
    const textareaEl = document.getElementById(`task-whatToDo-${taskId}`);
    if (!textareaEl) return;
    body.whatToDo = String(textareaEl.value || '');
    task.whatToDo = body.whatToDo;
    endpoint = 'what-to-do';
  } else if (field === 'files') {
    const textareaEl = document.getElementById(`task-files-${taskId}`);
    if (!textareaEl) return;
    body.files = String(textareaEl.value || '').split('\n').map(value => value.trim()).filter(Boolean);
    task.files = body.files;
    endpoint = 'files';
  } else if (field === 'endpoints') {
    const textareaEl = document.getElementById(`task-endpoints-${taskId}`);
    if (!textareaEl) return;
    body.endpoints = String(textareaEl.value || '').split('\n').map(value => value.trim()).filter(Boolean);
    task.endpoints = body.endpoints;
    endpoint = 'endpoints';
  } else if (field === 'dependsOn') {
    const editorEl = document.getElementById(`task-depends-on-editor-${taskId}`);
    if (!editorEl) return;
    body.dependsOn = Array.from(editorEl.querySelectorAll('input[type="checkbox"]:checked')).map(el => el.value);
    task.dependsOn = body.dependsOn;
    endpoint = 'depends-on';
  } else {
    return;
  }

  isTaskFieldUpdating = true;
  renderPlanDetail();

  try {
    const res = await fetch(`/api/plans/${encodeURIComponent(planId)}/tasks/${encodeURIComponent(taskId)}/${endpoint}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Unable to update task field');
    }

    const [updatedPlanRes] = await Promise.all([
      fetch(`/api/plans/${encodeURIComponent(planId)}`, { cache: 'no-store' }),
      loadPlans()
    ]);

    if (!updatedPlanRes.ok) {
      throw new Error('Unable to refresh plan after task field update');
    }

    currentPlan = await updatedPlanRes.json();
    editingTaskField = null;
    document.querySelector(`.plan-item[data-id="${CSS.escape(planId)}"]`)?.classList.add('active');
    renderPlanDetail();
    showToast('Campo task salvato');
  } catch (error) {
    task[field] = previousValue;
    renderPlanDetail();
    showToast(error.message, 'error');
  } finally {
    isTaskFieldUpdating = false;
    renderPlanDetail();
  }
}

function saveTaskFieldByEncodedIds(event, encodedPlanId, encodedTaskId, field) {
  event.stopPropagation();
  const planId = decodeURIComponent(encodedPlanId);
  const taskId = decodeURIComponent(encodedTaskId);
  saveTaskField(planId, taskId, field);
}

function enableTaskNotesEdit(taskId) {
  if (!currentPlan || currentSection !== 'plans' || isTaskNotesUpdating) return;
  if (!taskId || editingTaskNotesId === taskId) return;
  editingTaskNotesId = taskId;
  openTaskNotesIds.add(taskId);
  renderPlanDetail();
}

function enableTaskImplementationNotesEdit(taskId) {
  if (!currentPlan || currentSection !== 'plans' || isTaskImplementationNotesUpdating) return;
  if (!taskId || editingTaskImplementationNotesId === taskId) return;
  editingTaskImplementationNotesId = taskId;
  openTaskNotesIds.add(taskId);
  renderPlanDetail();
}

function enableTaskImplementationNotesEditByEncodedId(event, encodedTaskId) {
  event.stopPropagation();
  enableTaskImplementationNotesEdit(decodeURIComponent(encodedTaskId));
}

function enableTaskNotesEditByEncodedId(event, encodedTaskId) {
  event.stopPropagation();
  enableTaskNotesEdit(decodeURIComponent(encodedTaskId));
}

function cancelTaskNotesEdit() {
  if (!currentPlan || currentSection !== 'plans' || isTaskNotesUpdating) return;
  if (!editingTaskNotesId) return;
  editingTaskNotesId = null;
  renderPlanDetail();
}

function cancelTaskNotesEditFromEvent(event) {
  event.stopPropagation();
  cancelTaskNotesEdit();
}

function cancelTaskImplementationNotesEdit() {
  if (!currentPlan || currentSection !== 'plans' || isTaskImplementationNotesUpdating) return;
  if (!editingTaskImplementationNotesId) return;
  editingTaskImplementationNotesId = null;
  renderPlanDetail();
}

function cancelTaskImplementationNotesEditFromEvent(event) {
  event.stopPropagation();
  cancelTaskImplementationNotesEdit();
}

async function saveTaskNotes(planId, taskId) {
  if (!currentPlan || currentSection !== 'plans' || isTaskNotesUpdating) return;
  const task = (currentPlan.tasks || []).find(item => item.id === taskId);
  if (!task) return;

  const notesEl = document.getElementById(`task-notes-${taskId}`);
  if (!notesEl) return;

  const notes = String(notesEl.value || '');
  const previousNotes = task.notes || '';

  task.notes = notes;
  isTaskNotesUpdating = true;
  renderPlanDetail();

  try {
    const res = await fetch(`/api/plans/${encodeURIComponent(planId)}/tasks/${encodeURIComponent(taskId)}/notes`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Unable to update task notes');
    }

    const [updatedPlanRes] = await Promise.all([
      fetch(`/api/plans/${encodeURIComponent(planId)}`, { cache: 'no-store' }),
      loadPlans()
    ]);

    if (!updatedPlanRes.ok) {
      throw new Error('Unable to refresh plan after task notes update');
    }

    currentPlan = await updatedPlanRes.json();
    openTaskNotesIds.add(taskId);
    editingTaskNotesId = null;
    document.querySelector(`.plan-item[data-id="${CSS.escape(planId)}"]`)?.classList.add('active');
    renderPlanDetail();
    showToast('Note task salvate');
  } catch (error) {
    task.notes = previousNotes;
    renderPlanDetail();
    showToast(error.message, 'error');
  } finally {
    isTaskNotesUpdating = false;
    renderPlanDetail();
  }
}

function saveTaskNotesByEncodedIds(event, encodedPlanId, encodedTaskId) {
  event.stopPropagation();
  const planId = decodeURIComponent(encodedPlanId);
  const taskId = decodeURIComponent(encodedTaskId);
  saveTaskNotes(planId, taskId);
}

async function saveTaskImplementationNotes(planId, taskId) {
  if (!currentPlan || currentSection !== 'plans' || isTaskImplementationNotesUpdating) return;
  const task = (currentPlan.tasks || []).find(item => item.id === taskId);
  if (!task) return;

  const implementationNotesEl = document.getElementById(`task-implementation-notes-${taskId}`);
  if (!implementationNotesEl) return;

  const implementationNotes = String(implementationNotesEl.value || '');
  const previousImplementationNotes = task.implementationNotes || '';

  task.implementationNotes = implementationNotes;
  isTaskImplementationNotesUpdating = true;
  renderPlanDetail();

  try {
    const res = await fetch(`/api/plans/${encodeURIComponent(planId)}/tasks/${encodeURIComponent(taskId)}/implementation-notes`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ implementationNotes })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Unable to update task implementation notes');
    }

    const [updatedPlanRes] = await Promise.all([
      fetch(`/api/plans/${encodeURIComponent(planId)}`, { cache: 'no-store' }),
      loadPlans()
    ]);

    if (!updatedPlanRes.ok) {
      throw new Error('Unable to refresh plan after task implementation notes update');
    }

    currentPlan = await updatedPlanRes.json();
    openTaskNotesIds.add(taskId);
    editingTaskImplementationNotesId = null;
    document.querySelector(`.plan-item[data-id="${CSS.escape(planId)}"]`)?.classList.add('active');
    renderPlanDetail();
    showToast('Implementation notes task salvate');
  } catch (error) {
    task.implementationNotes = previousImplementationNotes;
    renderPlanDetail();
    showToast(error.message, 'error');
  } finally {
    isTaskImplementationNotesUpdating = false;
    renderPlanDetail();
  }
}

function saveTaskImplementationNotesByEncodedIds(event, encodedPlanId, encodedTaskId) {
  event.stopPropagation();
  const planId = decodeURIComponent(encodedPlanId);
  const taskId = decodeURIComponent(encodedTaskId);
  saveTaskImplementationNotes(planId, taskId);
}

function handleTaskNotesDetailsToggle(taskId, detailsEl) {
  if (!taskId || !detailsEl) return;
  if (detailsEl.open) {
    openTaskNotesIds.add(taskId);
  } else {
    openTaskNotesIds.delete(taskId);
  }
}

function handleTaskNotesDetailsToggleByEncodedId(event, encodedTaskId) {
  const taskId = decodeURIComponent(encodedTaskId);
  handleTaskNotesDetailsToggle(taskId, event.currentTarget);
}

function enableTaskDodEditByEncodedId(encodedTaskId) {
  enableTaskDodEdit(decodeURIComponent(encodedTaskId));
}

function handleTaskDodRegionKeydown(event, encodedTaskId) {
  if (event.target !== event.currentTarget) return;
  if (event.key !== 'Enter' && event.key !== ' ') return;
  event.preventDefault();
  enableTaskDodEditByEncodedId(encodedTaskId);
}

async function toggleTaskDodItem(planId, taskId, criterionIndex, completed) {
  if (!currentPlan || currentSection !== 'plans' || isTaskDodUpdating) return;

  const task = (currentPlan.tasks || []).find(item => item.id === taskId);
  const criterion = task?.definitionOfDone?.[criterionIndex];
  if (!task || !criterion) return;

  const previousCompleted = Boolean(criterion.completed);
  taskDodFocusTarget = { taskId, criterionIndex };
  criterion.completed = completed;
  isTaskDodUpdating = true;
  renderPlanDetail();

  try {
    const res = await fetch(`/api/plans/${encodeURIComponent(planId)}/tasks/${encodeURIComponent(taskId)}/dod/${criterionIndex}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Unable to update Definition of Done item');
    }

    const [updatedPlanRes] = await Promise.all([
      fetch(`/api/plans/${encodeURIComponent(planId)}`, { cache: 'no-store' }),
      loadPlans()
    ]);

    if (!updatedPlanRes.ok) {
      throw new Error('Unable to refresh plan after Definition of Done update');
    }

    currentPlan = await updatedPlanRes.json();
    document.querySelector(`.plan-item[data-id="${CSS.escape(planId)}"]`)?.classList.add('active');
    renderPlanDetail();
    showToast('Definition of Done aggiornata');
  } catch (error) {
    criterion.completed = previousCompleted;
    renderPlanDetail();
    showToast(error.message, 'error');
  } finally {
    isTaskDodUpdating = false;
    renderPlanDetail();
  }
}

function toggleTaskDodItemByEncodedIds(event, encodedPlanId, encodedTaskId, criterionIndex, completed) {
  event.stopPropagation();
  const planId = decodeURIComponent(encodedPlanId);
  const taskId = decodeURIComponent(encodedTaskId);
  toggleTaskDodItem(planId, taskId, Number(criterionIndex), completed);
}

function enableAcceptanceEdit(storyId) {
  if (!currentRequirement || currentSection !== 'requirements') return;
  if (editingAcceptanceStoryId === storyId) return;
  editingAcceptanceStoryId = storyId;
  renderRequirementDetail();
}

function disableAcceptanceEdit() {
  if (!currentRequirement || currentSection !== 'requirements') return;
  if (!editingAcceptanceStoryId) return;
  editingAcceptanceStoryId = null;
  acceptanceFocusTarget = null;
  renderRequirementDetail();
}

function disableAcceptanceEditFromEvent(event) {
  event.stopPropagation();
  disableAcceptanceEdit();
}

function enableAcceptanceEditByEncodedId(encodedStoryId) {
  enableAcceptanceEdit(decodeURIComponent(encodedStoryId));
}

function handleAcceptanceRegionKeydown(event, encodedStoryId) {
  if (event.target !== event.currentTarget) return;
  if (event.key !== 'Enter' && event.key !== ' ') return;
  event.preventDefault();
  enableAcceptanceEditByEncodedId(encodedStoryId);
}

async function toggleAcceptanceCriterion(requirementId, storyId, criterionIndex, checked) {
  if (!currentRequirement || currentSection !== 'requirements' || isAcceptanceUpdating) return;

  const story = (currentRequirement.userStories || []).find(item => item.id === storyId);
  const criterion = story?.acceptanceCriteria?.[criterionIndex];
  if (!story || !criterion) return;

  const previousChecked = Boolean(criterion.checked);
  acceptanceFocusTarget = { storyId, criterionIndex };
  criterion.checked = checked;
  isAcceptanceUpdating = true;
  renderRequirementDetail();

  try {
    const res = await fetch(`/api/requirements/${encodeURIComponent(requirementId)}/stories/${encodeURIComponent(storyId)}/acceptance/${criterionIndex}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checked })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Unable to update acceptance criterion');
    }

    const [updatedRequirementRes] = await Promise.all([
      fetch(`/api/requirements/${encodeURIComponent(requirementId)}`, { cache: 'no-store' }),
      loadRequirements()
    ]);

    if (!updatedRequirementRes.ok) {
      throw new Error('Unable to refresh requirement after acceptance update');
    }

    currentRequirement = await updatedRequirementRes.json();
    document.querySelector(`.plan-item[data-id="${CSS.escape(requirementId)}"]`)?.classList.add('active');
    renderRequirementDetail();
    showToast('Acceptance criterion salvato');
  } catch (error) {
    criterion.checked = previousChecked;
    renderRequirementDetail();
    showToast(error.message, 'error');
  } finally {
    isAcceptanceUpdating = false;
    renderRequirementDetail();
  }
}

function toggleAcceptanceCriterionByEncodedIds(event, encodedRequirementId, encodedStoryId, criterionIndex, checked) {
  event.stopPropagation();
  const requirementId = decodeURIComponent(encodedRequirementId);
  const storyId = decodeURIComponent(encodedStoryId);
  toggleAcceptanceCriterion(requirementId, storyId, Number(criterionIndex), checked);
}

function handleAcceptanceItemKeydown(event) {
  const key = event.key;
  if (!['ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(key)) return;

  const currentBtn = event.currentTarget;
  const container = currentBtn.closest('.task-dod');
  if (!container) return;

  const items = Array.from(container.querySelectorAll('.task-dod-toggle:not([disabled])'));
  if (!items.length) return;

  const currentIndex = items.indexOf(currentBtn);
  if (currentIndex < 0) return;

  event.preventDefault();

  let nextIndex = currentIndex;
  if (key === 'ArrowDown' || key === 'ArrowRight') nextIndex = Math.min(items.length - 1, currentIndex + 1);
  if (key === 'ArrowUp' || key === 'ArrowLeft') nextIndex = Math.max(0, currentIndex - 1);
  if (key === 'Home') nextIndex = 0;
  if (key === 'End') nextIndex = items.length - 1;

  items[nextIndex]?.focus();
}

function enableRequirementOverviewEdit() {
  if (!currentRequirement || currentSection !== 'requirements' || isRequirementOverviewUpdating) return;
  if (isRequirementOverviewEditing) return;
  isRequirementOverviewEditing = true;
  renderRequirementDetail();
}

function enableRequirementOverviewEditFromEvent(event) {
  event.stopPropagation();
  enableRequirementOverviewEdit();
}

function cancelRequirementOverviewEdit() {
  if (!currentRequirement || currentSection !== 'requirements' || isRequirementOverviewUpdating) return;
  if (!isRequirementOverviewEditing) return;
  isRequirementOverviewEditing = false;
  renderRequirementDetail();
}

function cancelRequirementOverviewEditFromEvent(event) {
  event.stopPropagation();
  cancelRequirementOverviewEdit();
}

async function saveRequirementOverview() {
  if (!currentRequirement || currentSection !== 'requirements' || !isRequirementOverviewEditing || isRequirementOverviewUpdating) return;
  const overviewEl = document.getElementById('requirement-overview-input');
  if (!overviewEl) return;

  const overview = String(overviewEl.value || '');
  const previousOverview = typeof currentRequirement.overview === 'string' ? currentRequirement.overview : '';

  currentRequirement.overview = overview;
  isRequirementOverviewUpdating = true;
  renderRequirementDetail();

  try {
    const requirementId = currentRequirement.document?.id || currentRequirement.id;
    if (!requirementId) throw new Error('Requirement ID non trovato');

    const res = await fetch(`/api/requirements/${encodeURIComponent(requirementId)}/overview`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ overview })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Unable to update requirement overview');
    }

    const [updatedRequirementRes] = await Promise.all([
      fetch(`/api/requirements/${encodeURIComponent(requirementId)}`, { cache: 'no-store' }),
      loadRequirements()
    ]);

    if (!updatedRequirementRes.ok) {
      throw new Error('Unable to refresh requirement after overview update');
    }

    currentRequirement = await updatedRequirementRes.json();
    isRequirementOverviewEditing = false;
    document.querySelector(`.plan-item[data-id="${CSS.escape(requirementId)}"]`)?.classList.add('active');
    renderRequirementDetail();
    showToast('Overview requirement salvata');
  } catch (error) {
    currentRequirement.overview = previousOverview;
    renderRequirementDetail();
    showToast(error.message, 'error');
  } finally {
    isRequirementOverviewUpdating = false;
    renderRequirementDetail();
  }
}

function saveRequirementOverviewFromEvent(event) {
  event.stopPropagation();
  saveRequirementOverview();
}

function enableRequirementCurrentStateEdit() {
  if (!currentRequirement || currentSection !== 'requirements' || isRequirementCurrentStateUpdating) return;
  if (isRequirementCurrentStateEditing) return;
  isRequirementCurrentStateEditing = true;
  renderRequirementDetail();
}

function enableRequirementCurrentStateEditFromEvent(event) {
  event.stopPropagation();
  enableRequirementCurrentStateEdit();
}

function cancelRequirementCurrentStateEdit() {
  if (!currentRequirement || currentSection !== 'requirements' || isRequirementCurrentStateUpdating) return;
  if (!isRequirementCurrentStateEditing) return;
  isRequirementCurrentStateEditing = false;
  renderRequirementDetail();
}

function cancelRequirementCurrentStateEditFromEvent(event) {
  event.stopPropagation();
  cancelRequirementCurrentStateEdit();
}

async function saveRequirementCurrentState() {
  if (!currentRequirement || currentSection !== 'requirements' || !isRequirementCurrentStateEditing || isRequirementCurrentStateUpdating) return;
  const rows = Array.from(document.querySelectorAll('#requirement-current-state-body tr'));
  if (!rows.length) {
    showToast('Aggiungi almeno una riga per il current state', 'error');
    return;
  }
  const parsed = rows.map(row => {
    const area = String(row.querySelector('[data-field="area"]')?.value || '').trim();
    const status = String(row.querySelector('[data-field="status"]')?.value || '').trim();
    const notes = String(row.querySelector('[data-field="notes"]')?.value || '').trim();
    return { area, status, notes };
  }).filter(item => item.area || item.status || item.notes);
  if (!parsed.length) {
    showToast('Inserisci almeno una riga compilata', 'error');
    return;
  }
  if (parsed.some(item => !item.area || !item.status || !item.notes)) {
    showToast('Compila Area, Status e Notes per ogni riga', 'error');
    return;
  }

  const previousCurrentState = Array.isArray(currentRequirement.currentState) ? currentRequirement.currentState : [];
  currentRequirement.currentState = parsed;
  isRequirementCurrentStateUpdating = true;
  renderRequirementDetail();
  try {
    const requirementId = currentRequirement.document?.id || currentRequirement.id;
    if (!requirementId) throw new Error('Requirement ID non trovato');
    const res = await fetch(`/api/requirements/${encodeURIComponent(requirementId)}/current-state`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currentState: parsed })
    });
    if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Unable to update requirement current state'); }
    const [updatedRequirementRes] = await Promise.all([fetch(`/api/requirements/${encodeURIComponent(requirementId)}`, { cache: 'no-store' }), loadRequirements()]);
    if (!updatedRequirementRes.ok) throw new Error('Unable to refresh requirement after current state update');
    currentRequirement = await updatedRequirementRes.json();
    isRequirementCurrentStateEditing = false;
    renderRequirementDetail();
    showToast('Current state requirement salvato');
  } catch (error) {
    currentRequirement.currentState = previousCurrentState;
    renderRequirementDetail();
    showToast(error.message, 'error');
  } finally {
    isRequirementCurrentStateUpdating = false;
    renderRequirementDetail();
  }
}

function addRequirementCurrentStateRow() {
  if (!currentRequirement || currentSection !== 'requirements' || !isRequirementCurrentStateEditing || isRequirementCurrentStateUpdating) return;
  const body = document.getElementById('requirement-current-state-body');
  if (!body) return;
  body.insertAdjacentHTML('beforeend', `
    <tr>
      <td><input type="text" class="plan-notes-input current-state-input" data-field="area" value=""></td>
      <td><input type="text" class="plan-notes-input current-state-input" data-field="status" value=""></td>
      <td><textarea class="plan-notes-input current-state-input current-state-notes-input" data-field="notes" rows="2"></textarea></td>
      <td class="current-state-row-actions">
        <button type="button" class="open-question-btn is-secondary current-state-row-remove" onclick="removeRequirementCurrentStateRowFromEvent(event)">Rimuovi</button>
      </td>
    </tr>
  `);
}

function addRequirementCurrentStateRowFromEvent(event) {
  event.stopPropagation();
  addRequirementCurrentStateRow();
}

function removeRequirementCurrentStateRow(targetRow) {
  if (!currentRequirement || currentSection !== 'requirements' || !isRequirementCurrentStateEditing || isRequirementCurrentStateUpdating) return;
  const rows = Array.from(document.querySelectorAll('#requirement-current-state-body tr'));
  if (rows.length <= 1) {
    showToast('Deve rimanere almeno una riga', 'error');
    return;
  }
  if (!targetRow) return;
  targetRow.remove();
}

function removeRequirementCurrentStateRowFromEvent(event) {
  event.stopPropagation();
  removeRequirementCurrentStateRow(event.currentTarget?.closest('tr'));
}

function saveRequirementCurrentStateFromEvent(event) {
  event.stopPropagation();
  saveRequirementCurrentState();
}

function enableRequirementNotesEdit() {
  if (!currentRequirement || currentSection !== 'requirements' || isRequirementNotesUpdating) return;
  if (isRequirementNotesEditing) return;
  isRequirementNotesEditing = true;
  renderRequirementDetail();
}

function enableRequirementNotesEditFromEvent(event) {
  event.stopPropagation();
  enableRequirementNotesEdit();
}

function cancelRequirementNotesEdit() {
  if (!currentRequirement || currentSection !== 'requirements' || isRequirementNotesUpdating) return;
  if (!isRequirementNotesEditing) return;
  isRequirementNotesEditing = false;
  renderRequirementDetail();
}

function cancelRequirementNotesEditFromEvent(event) {
  event.stopPropagation();
  cancelRequirementNotesEdit();
}

async function saveRequirementNotes() {
  if (!currentRequirement || currentSection !== 'requirements' || !isRequirementNotesEditing || isRequirementNotesUpdating) return;
  const notesEl = document.getElementById('requirement-notes-input');
  if (!notesEl) return;
  const value = String(notesEl.value || '').trim();
  const parsed = value.length ? value : null;

  const previousNotes = typeof currentRequirement.notes === 'string' ? currentRequirement.notes : null;
  currentRequirement.notes = parsed;
  isRequirementNotesUpdating = true;
  renderRequirementDetail();
  try {
    const requirementId = currentRequirement.document?.id || currentRequirement.id;
    if (!requirementId) throw new Error('Requirement ID non trovato');
    const res = await fetch(`/api/requirements/${encodeURIComponent(requirementId)}/notes`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notes: parsed })
    });
    if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Unable to update requirement notes'); }
    const [updatedRequirementRes] = await Promise.all([fetch(`/api/requirements/${encodeURIComponent(requirementId)}`, { cache: 'no-store' }), loadRequirements()]);
    if (!updatedRequirementRes.ok) throw new Error('Unable to refresh requirement after notes update');
    currentRequirement = await updatedRequirementRes.json();
    isRequirementNotesEditing = false;
    renderRequirementDetail();
    showToast('Notes requirement salvate');
  } catch (error) {
    currentRequirement.notes = previousNotes;
    renderRequirementDetail();
    showToast(error.message, 'error');
  } finally {
    isRequirementNotesUpdating = false;
    renderRequirementDetail();
  }
}

function saveRequirementNotesFromEvent(event) {
  event.stopPropagation();
  saveRequirementNotes();
}

function enableOpenQuestionEdit(questionId) {
  if (!currentRequirement || currentSection !== 'requirements' || isOpenQuestionUpdating) return;
  if (!questionId) return;
  if (editingOpenQuestionId === questionId) return;
  editingOpenQuestionId = questionId;
  renderRequirementDetail();
}

function enableOpenQuestionEditByEncodedId(encodedQuestionId) {
  enableOpenQuestionEdit(decodeURIComponent(encodedQuestionId));
}

function cancelOpenQuestionEdit() {
  if (!currentRequirement || currentSection !== 'requirements' || isOpenQuestionUpdating) return;
  if (!editingOpenQuestionId) return;
  editingOpenQuestionId = null;
  renderRequirementDetail();
}

function cancelOpenQuestionEditFromEvent(event) {
  event.stopPropagation();
  cancelOpenQuestionEdit();
}

function handleOpenQuestionCardKeydown(event, encodedQuestionId) {
  if (event.target !== event.currentTarget) return;
  if (event.key !== 'Enter' && event.key !== ' ') return;
  event.preventDefault();
  enableOpenQuestionEditByEncodedId(encodedQuestionId);
}

async function saveOpenQuestion(requirementId, questionId) {
  if (!currentRequirement || currentSection !== 'requirements' || isOpenQuestionUpdating) return;
  const question = (currentRequirement.openQuestions || []).find(item => item.id === questionId);
  if (!question) return;

  const answerEl = document.getElementById(`open-question-answer-${questionId}`);
  const statusEl = document.getElementById(`open-question-status-${questionId}`);
  if (!answerEl || !statusEl) return;

  const answer = String(answerEl.value || '').trim();
  const status = String(statusEl.value || '').trim();

  if (!OPEN_QUESTION_STATUSES.includes(status)) {
    showToast('Status open question non valido', 'error');
    return;
  }

  const previousAnswer = question.answer || '';
  const previousStatus = question.status || 'open';

  question.answer = answer;
  question.status = status;
  isOpenQuestionUpdating = true;
  renderRequirementDetail();

  try {
    const res = await fetch(`/api/requirements/${encodeURIComponent(requirementId)}/open-questions/${encodeURIComponent(questionId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answer, status })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Unable to update open question');
    }

    const [updatedRequirementRes] = await Promise.all([
      fetch(`/api/requirements/${encodeURIComponent(requirementId)}`, { cache: 'no-store' }),
      loadRequirements()
    ]);

    if (!updatedRequirementRes.ok) {
      throw new Error('Unable to refresh requirement after open question update');
    }

    currentRequirement = await updatedRequirementRes.json();
    editingOpenQuestionId = null;
    document.querySelector(`.plan-item[data-id="${CSS.escape(requirementId)}"]`)?.classList.add('active');
    renderRequirementDetail();
    showToast('Open question salvata');
  } catch (error) {
    question.answer = previousAnswer;
    question.status = previousStatus;
    renderRequirementDetail();
    showToast(error.message, 'error');
  } finally {
    isOpenQuestionUpdating = false;
    renderRequirementDetail();
  }
}

function saveOpenQuestionByEncodedIds(event, encodedRequirementId, encodedQuestionId) {
  event.stopPropagation();
  const requirementId = decodeURIComponent(encodedRequirementId);
  const questionId = decodeURIComponent(encodedQuestionId);
  saveOpenQuestion(requirementId, questionId);
}

function enableOpenQuestionCreateFromEvent(event) {
  event.stopPropagation();
  if (!currentRequirement || currentSection !== 'requirements' || isOpenQuestionUpdating) return;
  creatingOpenQuestion = true;
  creatingOpenQuestionStep = 'id';
  newOpenQuestionId = 'OQ-';
  newOpenQuestionQuestion = '';
  newOpenQuestionAnswer = 'Non definito nel documento; richiesta conferma.';
  newOpenQuestionStatus = 'open';
  editingOpenQuestionId = null;
  renderRequirementDetail();
  requestAnimationFrame(() => {
    const input = document.getElementById('new-open-question-id');
    if (!input) return;
    input.focus();
    const length = input.value.length;
    input.setSelectionRange(length, length);
  });
}

function proceedCreateOpenQuestionFromEvent(event) {
  event.stopPropagation();
  if (!creatingOpenQuestion || isOpenQuestionUpdating) return;
  const input = document.getElementById('new-open-question-id');
  const id = String(input?.value || '').trim();
  if (!id) return showToast('ID open question obbligatorio', 'error');
  if ((currentRequirement?.openQuestions || []).some(item => String(item?.id || '') === id)) return showToast('ID open question gia presente', 'error');
  newOpenQuestionId = id;
  creatingOpenQuestionStep = 'details';
  renderRequirementDetail();
}

function backCreateOpenQuestionFromEvent(event) {
  event.stopPropagation();
  if (!creatingOpenQuestion || isOpenQuestionUpdating) return;
  const questionEl = document.getElementById('new-open-question-question');
  newOpenQuestionQuestion = String(questionEl?.value || '').trim();
  newOpenQuestionAnswer = 'Non definito nel documento; richiesta conferma.';
  newOpenQuestionStatus = 'open';
  creatingOpenQuestionStep = 'id';
  renderRequirementDetail();
}

function cancelCreateOpenQuestionFromEvent(event) {
  event.stopPropagation();
  if (isOpenQuestionUpdating) return;
  creatingOpenQuestion = false;
  creatingOpenQuestionStep = 'id';
  newOpenQuestionId = '';
  newOpenQuestionQuestion = '';
  newOpenQuestionAnswer = 'Non definito nel documento; richiesta conferma.';
  newOpenQuestionStatus = 'open';
  renderRequirementDetail();
}

async function createOpenQuestionFromEvent(event) {
  event.stopPropagation();
  if (!currentRequirement || currentSection !== 'requirements' || isOpenQuestionUpdating) return;
  const requirementId = currentRequirement.document?.id;
  if (!requirementId) return;
  const createdOpenQuestionId = String(newOpenQuestionId || '').trim();
  const question = String(document.getElementById('new-open-question-question')?.value || '').trim();
  const answer = 'Non definito nel documento; richiesta conferma.';
  const status = 'open';
  if (!newOpenQuestionId) return showToast('ID open question obbligatorio', 'error');
  if ((currentRequirement?.openQuestions || []).some(item => String(item?.id || '') === newOpenQuestionId)) return showToast('ID open question gia presente', 'error');
  if (!question) return showToast('Question obbligatoria', 'error');
  isOpenQuestionUpdating = true;
  renderRequirementDetail();
  try {
    const res = await fetch(`/api/requirements/${encodeURIComponent(requirementId)}/open-questions`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: newOpenQuestionId, question, answer, status })
    });
    if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Unable to create open question'); }
    const [updatedRequirementRes] = await Promise.all([fetch(`/api/requirements/${encodeURIComponent(requirementId)}`, { cache: 'no-store' }), loadRequirements()]);
    if (!updatedRequirementRes.ok) throw new Error('Unable to refresh requirement after open question create');
    currentRequirement = await updatedRequirementRes.json();
    creatingOpenQuestion = false;
    creatingOpenQuestionStep = 'id';
    newOpenQuestionId = '';
    newOpenQuestionQuestion = '';
    newOpenQuestionAnswer = 'Non definito nel documento; richiesta conferma.';
    newOpenQuestionStatus = 'open';
    renderRequirementDetail();
    showToast('Open question creata');
    setTimeout(() => {
      const cards = Array.from(document.querySelectorAll('#openQuestionsList .task-item'));
      const card = cards.find(el => el.querySelector('.task-id')?.textContent?.trim() === createdOpenQuestionId);
      if (!card) return;
      card.scrollIntoView({ behavior: 'instant', block: 'center' });
      card.style.transition = 'box-shadow .35s ease, transform .35s ease';
      card.style.boxShadow = '0 0 0 2px rgba(82, 145, 255, 0.45)';
      card.style.transform = 'scale(1.01)';
      setTimeout(() => {
        card.style.boxShadow = '';
        card.style.transform = '';
      }, 1200);
    }, 0);
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    isOpenQuestionUpdating = false;
    renderRequirementDetail();
  }
}

function requestDeleteOpenQuestionByEncodedIds(event, encodedRequirementId, encodedQuestionId) {
  event.stopPropagation();
  if (!currentRequirement || currentSection !== 'requirements' || isOpenQuestionUpdating) return;
  const requirementId = decodeURIComponent(encodedRequirementId);
  const questionId = decodeURIComponent(encodedQuestionId);
  if (!requirementId || !questionId) return;
  deletingOpenQuestionId = questionId;
  deleteModalReturnFocusEl = event.currentTarget || null;
  renderRequirementDetail();
}

function closeDeleteOpenQuestionModalFromEvent(event) {
  event.stopPropagation();
  deletingOpenQuestionId = null;
  renderRequirementDetail();
  if (deleteModalReturnFocusEl && typeof deleteModalReturnFocusEl.focus === 'function') deleteModalReturnFocusEl.focus();
}

async function confirmDeleteOpenQuestionFromEvent(event) {
  event.stopPropagation();
  if (!currentRequirement || !deletingOpenQuestionId || isOpenQuestionUpdating) return;
  const requirementId = currentRequirement.document?.id;
  const questionId = deletingOpenQuestionId;
  if (!requirementId) return;
  isOpenQuestionUpdating = true;
  renderRequirementDetail();
  try {
    const res = await fetch(`/api/requirements/${encodeURIComponent(requirementId)}/open-questions/${encodeURIComponent(questionId)}`, { method: 'DELETE' });
    if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Unable to delete open question'); }
    const [updatedRequirementRes] = await Promise.all([fetch(`/api/requirements/${encodeURIComponent(requirementId)}`, { cache: 'no-store' }), loadRequirements()]);
    if (!updatedRequirementRes.ok) throw new Error('Unable to refresh requirement after open question delete');
    currentRequirement = await updatedRequirementRes.json();
    deletingOpenQuestionId = null;
    editingOpenQuestionId = null;
    renderRequirementDetail();
    showToast('Open question eliminata');
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    isOpenQuestionUpdating = false;
    renderRequirementDetail();
  }
}

function renderDeleteOpenQuestionModal() {
  if (!deletingOpenQuestionId) return '';
  return `<div class="confirm-modal-overlay" onclick="closeDeleteOpenQuestionModalFromEvent(event)"><div class="confirm-modal" role="dialog" aria-modal="true" tabindex="-1" onclick="event.stopPropagation()"><button type="button" class="confirm-modal-close" onclick="closeDeleteOpenQuestionModalFromEvent(event)">x</button><div class="confirm-modal-title">Conferma eliminazione</div><div class="confirm-modal-text">Vuoi eliminare la open question <strong>${escapeHtml(deletingOpenQuestionId)}</strong>?</div><div class="plan-notes-actions confirm-modal-actions"><button type="button" class="open-question-btn is-danger" onclick="confirmDeleteOpenQuestionFromEvent(event)">Elimina</button><button type="button" class="open-question-btn is-secondary" onclick="closeDeleteOpenQuestionModalFromEvent(event)">Annulla</button></div></div></div>`;
}

function ensureToastEl() {
  let toastEl = document.getElementById('toastMessage');
  if (!toastEl) {
    toastEl = document.createElement('div');
    toastEl.id = 'toastMessage';
    toastEl.className = 'toast-message';
    toastEl.setAttribute('role', 'status');
    toastEl.setAttribute('aria-live', 'polite');
    document.body.appendChild(toastEl);
  }
  return toastEl;
}

function showToast(message, type = 'success') {
  const toastEl = ensureToastEl();
  toastEl.textContent = message;
  toastEl.classList.remove('is-error');
  if (type === 'error') toastEl.classList.add('is-error');
  toastEl.classList.add('show');

  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastEl.classList.remove('show');
  }, 1800);
}

function restoreAcceptanceFocusIfNeeded() {
  if (!acceptanceFocusTarget || !editingAcceptanceStoryId) return;
  if (editingAcceptanceStoryId !== acceptanceFocusTarget.storyId) return;

  const { storyId, criterionIndex } = acceptanceFocusTarget;
  requestAnimationFrame(() => {
    const editingRegion = document.querySelector('.task-dod.is-editing');
    if (!editingRegion) return;

    const items = Array.from(editingRegion.querySelectorAll('.task-dod-toggle:not([disabled])'));
    if (!items.length) return;

    const safeIndex = Math.max(0, Math.min(Number(criterionIndex) || 0, items.length - 1));
    const targetItem = items[safeIndex];
    if (!targetItem) return;

    const targetStoryId = decodeURIComponent(editingRegion.getAttribute('data-story-id') || '');
    if (targetStoryId !== storyId) return;
    targetItem.focus();
  });
}

function restoreTaskDodFocusIfNeeded() {
  if (!taskDodFocusTarget || !editingTaskDodId) return;
  if (editingTaskDodId !== taskDodFocusTarget.taskId) return;

  const { taskId, criterionIndex } = taskDodFocusTarget;
  requestAnimationFrame(() => {
    const editingRegion = document.querySelector('.task-dod.is-editing');
    if (!editingRegion) return;

    const items = Array.from(editingRegion.querySelectorAll('.task-dod-toggle:not([disabled])'));
    if (!items.length) return;

    const safeIndex = Math.max(0, Math.min(Number(criterionIndex) || 0, items.length - 1));
    const targetItem = items[safeIndex];
    if (!targetItem) return;

    const targetTaskId = decodeURIComponent(editingRegion.getAttribute('data-task-id') || '');
    if (targetTaskId !== taskId) return;
    targetItem.focus();
  });
}

async function runSearch(query) {
  const searchResults = document.getElementById('searchResults');
  if (query.length < 2) {
    searchResults.classList.remove('show');
    return;
  }

  const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
  const results = await res.json();

  if (results.length === 0) {
    searchResults.innerHTML = '<div class="empty-state empty-state-padded">No results found</div>';
    searchResults.classList.add('show');
    return;
  }

  searchResults.innerHTML = results.map(r => `
    <div class="search-result-group">
      <div class="search-result-group-title">${escapeHtml(r.plan)}</div>
      ${r.matches.map(m => `
        <div class="search-result-item" onclick="openSearchResult('${encodeURIComponent(r.plan)}', '${r.domain || 'plan'}')">
          <span class="search-result-type type-${escapeHtml(m.type)}">${escapeHtml(m.type)}</span>
          ${escapeHtml(m.text)}
        </div>
      `).join('')}
    </div>
  `).join('');
  searchResults.classList.add('show');
}

async function openSearchResult(encodedId, domain) {
  const id = decodeURIComponent(encodedId);
  if (domain === 'requirement') {
    setSection('requirements');
    await selectRequirement(id);
  } else {
    setSection('plans');
    await selectPlan(id);
  }
}

function formatStatus(status) {
  const map = {
    in_progress: 'In Progress',
    completed: 'Completed',
    pending: 'Pending',
    skipped: 'Skipped',
    cancelled: 'Cancelled',
    draft: 'Draft',
    in_review: 'In Review',
    approved: 'Approved',
    implemented: 'Implemented'
  };
  return map[status] || status;
}

function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function setDesktopSidebarCollapsed(collapsed) {
  const shouldCollapse = Boolean(collapsed);
  document.body.classList.toggle('sidebar-collapsed', shouldCollapse);

  const toggleButton = document.getElementById('sidebarToggle');
  const sidebar = document.getElementById('sidebar');
  const sidebarContent = sidebar?.querySelector('.plans-list');

  if (toggleButton) {
    toggleButton.setAttribute('aria-expanded', shouldCollapse ? 'false' : 'true');
    toggleButton.setAttribute('aria-label', shouldCollapse ? 'Apri sidebar' : 'Chiudi sidebar');
  }

  if (sidebar) {
    sidebar.setAttribute('aria-hidden', 'false');
  }

  if (sidebarContent) {
    sidebarContent.setAttribute('aria-hidden', shouldCollapse ? 'true' : 'false');
  }
}

function toggleSidebar() {
  setDesktopSidebarCollapsed(!document.body.classList.contains('sidebar-collapsed'));
}

document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    if (tab.classList.contains('hidden')) return;
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('show'));
    tab.classList.add('active');
    document.getElementById(`tab-${tab.dataset.tab}`).classList.add('show');
    const contentEl = document.querySelector('.content');
    contentEl?.scrollTo({ top: 0, behavior: 'instant' });
    buildRightNav();
  });
});

document.querySelectorAll('.section-switch-tab').forEach(btn => {
  btn.addEventListener('click', () => setSection(btn.dataset.section));
});

const searchInput = document.getElementById('searchInput');
const searchResults = document.getElementById('searchResults');
const sidebarToggle = document.getElementById('sidebarToggle');
const plansListElement = document.getElementById('plansList');
const statusFiltersElement = document.getElementById('statusFilters');
const workspaceSelect = document.getElementById('workspaceSelect');
const workspaceSelectTrigger = document.getElementById('workspaceSelectTrigger');
const workspaceSelectMenu = document.getElementById('workspaceSelectMenu');
const workspaceManage = document.getElementById('workspaceManage');
const workspaceAdd = document.getElementById('workspaceAdd');
const workspaceBrowseBtn = document.getElementById('workspaceBrowseBtn');

workspaceSelectTrigger?.addEventListener('click', () => {
  if (workspaceSelect?.classList.contains('is-disabled')) return;
  const willOpen = !workspaceSelect?.classList.contains('is-open');
  workspaceSelect?.classList.toggle('is-open', willOpen);
  workspaceSelectTrigger.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
});

workspaceSelectMenu?.addEventListener('click', event => {
  const option = event.target.closest('[data-workspace-key]');
  if (!option) return;
  const key = String(option.dataset.workspaceKey || '').trim();
  if (!key || key === currentWorkspace?.key) return;
  workspaceSelect?.classList.remove('is-open');
  workspaceSelectTrigger?.setAttribute('aria-expanded', 'false');
  selectWorkspaceByKey(key);
});

workspaceManage?.addEventListener('click', () => openWorkspaceManageModal().catch(error => showToast(error.message, 'error')));

workspaceAdd?.addEventListener('click', () => openWorkspaceModal());

workspaceBrowseBtn?.addEventListener('click', async event => {
  event.stopPropagation();
  workspaceBrowseBtn.disabled = true;
  try {
    const payload = await fetchJsonOrThrow('/api/workspaces/pick-folder', { method: 'POST' });
    const input = document.getElementById('workspaceRootInput');
    if (input && payload?.path) input.value = payload.path;
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    workspaceBrowseBtn.disabled = false;
  }
});

window.openWorkspaceModal = openWorkspaceModal;
window.closeWorkspaceModalFromEvent = closeWorkspaceModalFromEvent;
window.createWorkspaceFromEvent = createWorkspaceFromEvent;
window.closeWorkspaceManageModalFromEvent = closeWorkspaceManageModalFromEvent;

document.getElementById('workspaceManageList')?.addEventListener('click', event => {
  handleWorkspaceManageClick(event).catch(error => showToast(error.message, 'error'));
});

document.getElementById('workspaceManageList')?.addEventListener('input', event => {
  const input = event.target.closest('[data-workspace-label-input]');
  if (!input) return;
  const key = String(input.dataset.workspaceLabelInput || '').trim();
  if (!key) return;
  const original = String(input.dataset.originalLabel || '').trim();
  const current = String(input.value || '').trim();
  const saveBtn = document.querySelector(`[data-workspace-save="${CSS.escape(key)}"]`);
  if (!saveBtn) return;
  saveBtn.style.display = current && current !== original ? 'inline-flex' : 'none';
});

searchInput.addEventListener('input', e => {
  clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => {
    runSearch(e.target.value).catch(error => {
      searchResults.innerHTML = `<div class="error-state empty-state-padded">${escapeHtml(error.message)}</div>`;
      searchResults.classList.add('show');
    });
  }, 200);
});

sidebarToggle?.addEventListener('click', () => {
  toggleSidebar();
});

plansListElement?.addEventListener('click', event => {
  const item = event.target.closest('.plan-item');
  if (!item) return;
  const id = item.dataset.id;
  if (!id) return;
  if (currentSection === 'requirements') {
    selectRequirement(id);
  } else {
    selectPlan(id);
  }
});

statusFiltersElement?.addEventListener('change', event => {
  const target = event.target;
  if (!(target instanceof HTMLInputElement) || target.type !== 'checkbox') return;

  const status = String(target.dataset.status || '').trim();
  if (!status) return;

  const currentSet = sectionStatusFilters[currentSection] || new Set();
  if (target.checked) {
    currentSet.add(status);
  } else {
    currentSet.delete(status);
  }
  sectionStatusFilters[currentSection] = currentSet;

  if (currentSection === 'requirements') {
    renderRequirementsList();
  } else {
    renderPlansList();
  }
});

document.addEventListener('click', e => {
  if (!e.target.closest('.search-box')) {
    searchResults.classList.remove('show');
  }

  if (!e.target.closest('.task-status-dropdown')) {
    closeAllTaskStatusDropdowns();
  }

  if (!e.target.closest('.workspace-select')) {
    workspaceSelect?.classList.remove('is-open');
    workspaceSelectTrigger?.setAttribute('aria-expanded', 'false');
  }
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    setDesktopSidebarCollapsed(true);
  }
});

window.selectPlan = selectPlan;
window.selectPlanByEncodedId = selectPlanByEncodedId;
window.selectRequirementByEncodedId = selectRequirementByEncodedId;
window.handleTaskStatusChangeByEncodedId = handleTaskStatusChangeByEncodedId;
window.toggleTaskStatusDropdown = toggleTaskStatusDropdown;
window.toggleTaskPhaseDropdown = toggleTaskPhaseDropdown;
window.handleTaskPhaseSelectByEncodedId = handleTaskPhaseSelectByEncodedId;
window.openSearchResult = openSearchResult;
window.enableTaskDodEditByEncodedId = enableTaskDodEditByEncodedId;
window.disableTaskDodEditFromEvent = disableTaskDodEditFromEvent;
window.handleTaskDodRegionKeydown = handleTaskDodRegionKeydown;
window.toggleTaskDodItemByEncodedIds = toggleTaskDodItemByEncodedIds;
window.enablePlanNotesEditFromEvent = enablePlanNotesEditFromEvent;
window.cancelPlanNotesEditFromEvent = cancelPlanNotesEditFromEvent;
window.savePlanNotesFromEvent = savePlanNotesFromEvent;
window.enablePlanObjectiveEditFromEvent = enablePlanObjectiveEditFromEvent;
window.cancelPlanObjectiveEditFromEvent = cancelPlanObjectiveEditFromEvent;
window.savePlanObjectiveFromEvent = savePlanObjectiveFromEvent;
window.enablePlanPhasesEditFromEvent = enablePlanPhasesEditFromEvent;
window.cancelPlanPhasesEditFromEvent = cancelPlanPhasesEditFromEvent;
window.savePlanPhasesFromEvent = savePlanPhasesFromEvent;
window.addPlanPhaseFromEvent = addPlanPhaseFromEvent;
window.removePlanPhaseFromEvent = removePlanPhaseFromEvent;
window.updatePlanPhaseTitleFromEvent = updatePlanPhaseTitleFromEvent;
window.togglePlanPhaseTaskByEncodedId = togglePlanPhaseTaskByEncodedId;
window.enableTaskFieldEditByEncodedId = enableTaskFieldEditByEncodedId;
window.cancelTaskFieldEditFromEvent = cancelTaskFieldEditFromEvent;
window.saveTaskFieldByEncodedIds = saveTaskFieldByEncodedIds;
window.enableTaskNotesEditByEncodedId = enableTaskNotesEditByEncodedId;
window.cancelTaskNotesEditFromEvent = cancelTaskNotesEditFromEvent;
window.saveTaskNotesByEncodedIds = saveTaskNotesByEncodedIds;
window.enableTaskImplementationNotesEditByEncodedId = enableTaskImplementationNotesEditByEncodedId;
window.cancelTaskImplementationNotesEditFromEvent = cancelTaskImplementationNotesEditFromEvent;
window.saveTaskImplementationNotesByEncodedIds = saveTaskImplementationNotesByEncodedIds;
window.handleTaskNotesDetailsToggleByEncodedId = handleTaskNotesDetailsToggleByEncodedId;
window.enableAcceptanceEditByEncodedId = enableAcceptanceEditByEncodedId;
window.toggleAcceptanceCriterionByEncodedIds = toggleAcceptanceCriterionByEncodedIds;
window.disableAcceptanceEditFromEvent = disableAcceptanceEditFromEvent;
window.handleAcceptanceRegionKeydown = handleAcceptanceRegionKeydown;
window.handleAcceptanceItemKeydown = handleAcceptanceItemKeydown;
window.enableOpenQuestionEditByEncodedId = enableOpenQuestionEditByEncodedId;
window.cancelOpenQuestionEditFromEvent = cancelOpenQuestionEditFromEvent;
window.handleOpenQuestionCardKeydown = handleOpenQuestionCardKeydown;
window.saveOpenQuestionByEncodedIds = saveOpenQuestionByEncodedIds;
window.enableRequirementOverviewEditFromEvent = enableRequirementOverviewEditFromEvent;
window.cancelRequirementOverviewEditFromEvent = cancelRequirementOverviewEditFromEvent;
window.saveRequirementOverviewFromEvent = saveRequirementOverviewFromEvent;
window.enableRequirementCurrentStateEditFromEvent = enableRequirementCurrentStateEditFromEvent;
window.cancelRequirementCurrentStateEditFromEvent = cancelRequirementCurrentStateEditFromEvent;
window.saveRequirementCurrentStateFromEvent = saveRequirementCurrentStateFromEvent;
window.enableRequirementNotesEditFromEvent = enableRequirementNotesEditFromEvent;
window.cancelRequirementNotesEditFromEvent = cancelRequirementNotesEditFromEvent;
window.saveRequirementNotesFromEvent = saveRequirementNotesFromEvent;

const RIGHT_NAV_TAB_CONFIG = {
  tasks:                  { prefix: 'anchor-task-',      labelKey: 'id',    titleKey: 'title',    statusKey: 'status' },
  stories:                { prefix: 'anchor-story-',     labelKey: 'id',    titleKey: 'description' },
  decisions:              { prefix: 'anchor-decision-',  labelKey: 'id',    titleKey: 'description' },
  functional:             { prefix: 'anchor-func-',      labelKey: 'id',    titleKey: 'title' },
  'non-functional':       { prefix: 'anchor-nonfunc-',   labelKey: 'id',    titleKey: 'title' },
  'architectural-decisions': { prefix: 'anchor-archdec-', labelKey: 'id',   titleKey: 'title' },
  'user-stories':         { prefix: 'anchor-userstory-', labelKey: 'id',    titleKey: 'title' },
  'open-questions':       { prefix: 'anchor-openq-',     labelKey: 'id',    titleKey: 'question' },
};

function buildRightNav() {
  const navList = document.getElementById('rightNavList');
  const rightNav = document.getElementById('rightNav');
  if (!navList || !rightNav) return;

  const detailView = document.getElementById('detailView');
  if (!detailView || !detailView.classList.contains('show')) {
    rightNav.classList.remove('visible');
    return;
  }

  const activeTabName = document.querySelector('.tab.active')?.dataset.tab || 'overview';
  const items = [];

  if (activeTabName === 'overview') {
    const container = document.getElementById('tab-overview');
    if (container) {
      container.querySelectorAll('[id^="anchor-overview-"]').forEach(el => {
        const titleEl = el.querySelector('.section-title');
        const label = titleEl ? titleEl.textContent.trim() : el.id.replace('anchor-overview-', '');
        items.push({ id: el.id, label, statusClass: '' });
      });
    }
  } else {
    const config = RIGHT_NAV_TAB_CONFIG[activeTabName];
    if (!config) {
      rightNav.classList.remove('visible');
      return;
    }
    const container = document.getElementById(`tab-${activeTabName}`);
    if (container) {
      container.querySelectorAll(`[id^="${config.prefix}"]`).forEach(el => {
        const idSpan = el.querySelector('.task-id, .story-id');
        const label = idSpan ? idSpan.textContent.trim() : el.id.slice(config.prefix.length);
        const statusEl = el.querySelector('[class*="status-"]');
        let statusClass = '';
        if (statusEl) {
          const match = [...statusEl.classList].find(c => c.startsWith('status-') && c !== 'status-');
          if (match) statusClass = match;
        }
        let title = '';
        if (config.titleKey) {
          const titleEl = el.querySelector('.task-title, .story-title');
          title = titleEl ? titleEl.textContent.trim() : '';
        }
        items.push({ id: el.id, label, statusClass, title });
      });
    }
  }

  if (items.length === 0) {
    navList.innerHTML = '<li class="right-nav-empty">— empty —</li>';
  } else {
    navList.innerHTML = items.map(item => `
      <li class="right-nav-item">
        <a class="right-nav-link" href="#${item.id}" onclick="rightNavScrollTo(event,'${item.id}')">
          <span class="right-nav-id-row">
            <span class="right-nav-id">${escapeHtml(item.label)}</span>
            ${item.statusClass ? `<span class="right-nav-dot ${item.statusClass}"></span>` : ''}
          </span>
          ${item.title ? `<span class="right-nav-title">${escapeHtml(item.title)}</span>` : ''}
        </a>
      </li>
    `).join('');
  }
  rightNav.classList.add('visible');
}

function rightNavScrollTo(event, anchorId) {
  event.preventDefault();
  const target = document.getElementById(anchorId);
  const content = document.querySelector('.content');
  if (!target || !content) return;
  const contentRect = content.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  const offset = targetRect.top - contentRect.top + content.scrollTop - 80;
  content.scrollTo({ top: offset, behavior: 'instant' });

  document.querySelectorAll('.right-nav-link').forEach(l => l.classList.remove('active'));
  document.querySelector(`.right-nav-link[href="#${anchorId}"]`)?.classList.add('active');
}

window.rightNavScrollTo = rightNavScrollTo;

function hideBootLoader() {
  document.body.classList.remove('loading');
}

loadWorkspaceState()
  .then(() => Promise.all([loadPlans(), loadRequirements()]))
  .then(() => {
    updateSidebarHeight();
    window.addEventListener('resize', updateSidebarHeight);
    window.addEventListener('resize', () => {
      setDesktopSidebarCollapsed(document.body.classList.contains('sidebar-collapsed'));
    });
    setDesktopSidebarCollapsed(false);
    setSection('plans');
  })
  .catch(error => {
    const loaderText = document.querySelector('.boot-loader-text');
    if (loaderText) loaderText.textContent = `Errore caricamento: ${error.message}`;
  })
  .finally(() => {
    hideBootLoader();
  });
