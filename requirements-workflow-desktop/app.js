import { getCurrentDateIso } from '/src/utils/date.js';
import { escapeHtml } from '/src/utils/html.js';
import { formatStatus, normalizeStoryStatus } from '/src/utils/status.js';
import { createStore } from '/src/state/store.js';
import { listPlans, getPlanById } from '/src/api/plansApi.js';
import { listRequirements, getRequirementById } from '/src/api/requirementsApi.js';
import {
  listWorkspaces,
  getCurrentWorkspace,
  createWorkspace,
  updateWorkspaceLabel,
  deleteWorkspace,
  selectWorkspace,
  pickWorkspaceFolder
} from '/src/api/workspacesApi.js';
import { renderStatusFiltersTemplate } from '/src/ui/templates/common.templates.js';
import { renderPlansListTemplate } from '/src/ui/templates/plans.templates.js';
import { renderRequirementsListTemplate } from '/src/ui/templates/requirements.templates.js';
import { renderWorkspaceOptionsTemplate, renderWorkspaceManageListTemplate } from '/src/ui/templates/workspaces.templates.js';
import { renderPlansListSection } from '/src/ui/renderers/plans.renderer.js';
import { renderRequirementsListSection, renderStatusFiltersSection } from '/src/ui/renderers/requirements.renderer.js';
import { renderWorkspaceOptionsSection, renderWorkspaceManageListSection } from '/src/ui/renderers/workspaces.renderer.js';
import { setTabVisibility, activateTabByName } from '/src/ui/renderers/tabs.renderer.js';
import { renderPlanDetailRenderer } from '/src/ui/renderers/planDetail.renderer.js';
import { uiState } from '/src/state/uiState.js';
import { createPlansController } from '/src/features/plans/plans.controller.js';
import { createRequirementsController } from '/src/features/requirements/requirements.controller.js';
import { createWorkspacesController } from '/src/features/workspaces/workspaces.controller.js';

let plans = [];
let requirements = [];
let currentPlan = null;
let currentRequirement = null;
let currentSection = 'plans';
let searchDebounceTimer = null;
let toastTimer = null;
uiState.openQuestion.newAnswer = 'Non definito nel documento; richiesta conferma.';
let currentWorkspace = null;
let isSwitchingWorkspace = false;
let hasWorkspaceConfigured = false;
let pendingWorkspaceDeleteKey = null;

function readCoreState() {
  return {
    plans,
    requirements,
    currentPlan,
    currentRequirement,
    currentSection,
    currentWorkspace,
    hasWorkspaceConfigured,
    pendingWorkspaceDeleteKey,
    isSwitchingWorkspace
  };
}

function writeCoreState(patch) {
  if (Object.prototype.hasOwnProperty.call(patch, 'plans')) plans = patch.plans;
  if (Object.prototype.hasOwnProperty.call(patch, 'requirements')) requirements = patch.requirements;
  if (Object.prototype.hasOwnProperty.call(patch, 'currentPlan')) currentPlan = patch.currentPlan;
  if (Object.prototype.hasOwnProperty.call(patch, 'currentRequirement')) currentRequirement = patch.currentRequirement;
  if (Object.prototype.hasOwnProperty.call(patch, 'currentSection')) currentSection = patch.currentSection;
  if (Object.prototype.hasOwnProperty.call(patch, 'currentWorkspace')) currentWorkspace = patch.currentWorkspace;
  if (Object.prototype.hasOwnProperty.call(patch, 'hasWorkspaceConfigured')) hasWorkspaceConfigured = patch.hasWorkspaceConfigured;
  if (Object.prototype.hasOwnProperty.call(patch, 'pendingWorkspaceDeleteKey')) pendingWorkspaceDeleteKey = patch.pendingWorkspaceDeleteKey;
  if (Object.prototype.hasOwnProperty.call(patch, 'isSwitchingWorkspace')) isSwitchingWorkspace = patch.isSwitchingWorkspace;
}

function resetPlanUiEditingState() {
  uiState.resetFeature('planEditing');
}

function activatePlanListItem(id) {
  document.querySelectorAll('.plan-item').forEach((el) => el.classList.remove('active'));
  document.querySelector(`.plan-item[data-id="${CSS.escape(id)}"]`)?.classList.add('active');
}

function resetRequirementUiEditingState() {
  uiState.resetFeature('requirementEditing');
}

function activateRequirementListItem(id) {
  document.querySelectorAll('.plan-item').forEach((el) => el.classList.remove('active'));
  document.querySelector(`.plan-item[data-id="${CSS.escape(id)}"]`)?.classList.add('active');
}

const plansController = createPlansController({
  listPlans,
  getPlanById,
  readState: readCoreState,
  writeState: writeCoreState,
  syncCoreState,
  renderPlansList: () => renderPlansList(),
  renderPlanDetail: () => renderPlanDetail(),
  scrollWorkspaceToTop,
  resetPlanUiEditingState,
  activatePlanListItem
});

const requirementsController = createRequirementsController({
  listRequirements,
  getRequirementById,
  readState: readCoreState,
  writeState: writeCoreState,
  syncCoreState,
  renderRequirementsList: () => renderRequirementsList(),
  renderRequirementDetail: () => renderRequirementDetail(),
  scrollWorkspaceToTop,
  resetRequirementUiEditingState,
  activateRequirementListItem
});

const workspacesController = createWorkspacesController({
  listWorkspaces,
  getCurrentWorkspace,
  createWorkspace,
  updateWorkspaceLabel,
  deleteWorkspace,
  selectWorkspace,
  readState: readCoreState,
  writeState: writeCoreState,
  syncCoreState,
  renderWorkspaceOptions,
  renderWorkspaceManageModal: (workspaces, currentKey, pendingKey) => {
    const modal = document.getElementById('workspaceManageModal');
    const list = document.getElementById('workspaceManageList');
    if (!modal || !list) return;
    renderWorkspaceManageListSection({
      list,
      workspaces,
      currentKey,
      pendingWorkspaceDeleteKey: pendingKey,
      renderWorkspaceManageListTemplate: (items, selected, pending) => renderWorkspaceManageListTemplate(items, selected, pending, { escapeHtml })
    });
    modal.style.display = 'flex';
  },
  reloadCurrentWorkspaceData,
  setWorkspaceUiDisabled,
  showToast,
  setWorkspaceModalError
});

const INITIAL_APP_STATE = {
  plans: [],
  requirements: [],
  currentPlan: null,
  currentRequirement: null,
  currentSection: 'plans',
  currentWorkspace: null,
  hasWorkspaceConfigured: false
};

const appStore = createStore(INITIAL_APP_STATE);

function syncCoreState(patch, reason) {
  appStore.updateState(patch, { reason });
}

window.__appStore = appStore;
window.__appStateTransitions = [];
appStore.subscribe((nextState, previousState, meta) => {
  window.__appStateTransitions.push({
    at: meta.timestamp,
    reason: meta.reason || 'unknown',
    changedKeys: meta.changedKeys,
    next: meta.changedKeys.reduce((acc, key) => {
      acc[key] = nextState[key];
      return acc;
    }, {}),
    previous: meta.changedKeys.reduce((acc, key) => {
      acc[key] = previousState[key];
      return acc;
    }, {})
  });
  if (window.__appStateTransitions.length > 200) {
    window.__appStateTransitions.shift();
  }
});

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
  return uiState.taskField.editing?.taskId === taskId && uiState.taskField.editing?.field === field;
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
  await plansController.loadPlans();
}

async function loadRequirements() {
  await requirementsController.loadRequirements();
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
  renderWorkspaceOptionsSection({
    menu,
    value,
    workspaces,
    selectedKey,
    renderWorkspaceOptionsTemplate: (items, key) => renderWorkspaceOptionsTemplate(items, key, { escapeHtml })
  });
}

async function reloadCurrentWorkspaceData() {
  currentPlan = null;
  currentRequirement = null;
  syncCoreState({ currentPlan, currentRequirement }, 'reloadCurrentWorkspaceData:resetSelection');
  await Promise.all([loadPlans(), loadRequirements()]);
  setSection(currentSection || 'plans');
}

async function loadWorkspaceState() {
  await workspacesController.loadWorkspaceState();
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
  try {
    const created = await workspacesController.createWorkspaceFromModal(label, rootDir);
    if (created) closeWorkspaceModalFromEvent(event);
  } catch (error) {
    setWorkspaceModalError(error.message);
    showToast(error.message, 'error');
  }
}

async function openWorkspaceManageModal() {
  await workspacesController.openWorkspaceManageModal();
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
    await workspacesController.renameWorkspace(key, label);
    return;
  }
  if (deleteBtn) {
    const key = deleteBtn.dataset.workspaceDelete;
    await workspacesController.requestDeleteWorkspace(key);
    return;
  }
  const cancelDeleteBtn = event.target.closest('[data-workspace-delete-confirm-no]');
  if (cancelDeleteBtn) {
    await workspacesController.cancelDeleteWorkspace();
    return;
  }
  const confirmDeleteBtn = event.target.closest('[data-workspace-delete-confirm-yes]');
  if (confirmDeleteBtn) {
    const key = confirmDeleteBtn.dataset.workspaceDeleteConfirmYes;
    await workspacesController.confirmDeleteWorkspace(key);
  }
}

async function selectWorkspaceByKey(workspaceKey) {
  if (!workspaceKey || isSwitchingWorkspace) return;
  const value = document.getElementById('workspaceSelectValue');
  const previousValue = currentWorkspace?.key || '';
  try {
    await workspacesController.selectWorkspaceByKey(workspaceKey);
  } catch (error) {
    if (value && currentWorkspace?.label) value.textContent = currentWorkspace.label;
    renderWorkspaceOptions((await listWorkspaces()).workspaces || [], previousValue);
    showToast(error.message, 'error');
  }
}

function renderPlansList() {
  const container = document.getElementById('plansList');
  renderStatusFilters();
  const filteredPlans = getFilteredItems('plans');
  renderPlansListSection({
    container,
    plans,
    requirements,
    filteredPlans,
    counts: {
      plansSwitchCount: document.getElementById('plansSwitchCount'),
      requirementsSwitchCount: document.getElementById('requirementsSwitchCount')
    },
    renderPlansListTemplate: (items) => renderPlansListTemplate(items, { escapeHtml, formatStatus })
  });
}

function renderRequirementsList() {
  const container = document.getElementById('plansList');
  renderStatusFilters();
  const filteredRequirements = getFilteredItems('requirements');
  renderRequirementsListSection({
    container,
    plans,
    requirements,
    filteredRequirements,
    counts: {
      plansSwitchCount: document.getElementById('plansSwitchCount'),
      requirementsSwitchCount: document.getElementById('requirementsSwitchCount')
    },
    renderRequirementsListTemplate: (items) => renderRequirementsListTemplate(items, { escapeHtml, formatStatus })
  });
}

function getStatusesForSection(section) {
  if (section === 'plans') {
    return plansController.getStatusesForPlans(plans, STATUS_SORT_ORDER);
  }
  if (section === 'requirements') {
    return requirementsController.getStatusesForRequirements(requirements, STATUS_SORT_ORDER);
  }
  return [];
}

function syncSectionFilterState(section, statuses) {
  const current = uiState.filters.getStatusFilters(section) || new Set();
  const catalog = uiState.filters.getStatusCatalog(section) || new Set();
  if (!current.size) {
    uiState.filters.setStatusFilters(section, new Set(statuses));
    uiState.filters.setStatusCatalog(section, new Set(statuses));
    return;
  }

  const next = new Set(Array.from(current).filter(status => statuses.includes(status)));
  statuses.forEach(status => {
    if (!catalog.has(status)) next.add(status);
  });

  uiState.filters.setStatusCatalog(section, new Set(statuses));
  uiState.filters.setStatusFilters(section, next);
}

function getFilteredItems(section) {
  if (section === 'plans') {
    return plansController.getFilteredPlans(plans, uiState.filters.getStatusFilters(section) || new Set());
  }
  if (section === 'requirements') {
    return requirementsController.getFilteredRequirements(requirements, uiState.filters.getStatusFilters(section) || new Set());
  }
  return [];
}

function renderStatusFilters() {
  const filtersRoot = document.getElementById('statusFilters');
  if (!filtersRoot) return;

  const statuses = getStatusesForSection(currentSection);
  syncSectionFilterState(currentSection, statuses);

  const activeSet = uiState.filters.getStatusFilters(currentSection) || new Set();
  renderStatusFiltersSection({
    filtersRoot,
    statuses,
    activeSet,
    renderStatusFiltersTemplate: (statusList, set) => renderStatusFiltersTemplate(statusList, set, { escapeHtml, formatStatus })
  });
}

async function selectPlan(id) {
  await plansController.selectPlan(id);
}

function renderPlanDetail() {
  syncCoreState({ currentPlan }, 'renderPlanDetail');
  renderPlanDetailRenderer({
    plan: currentPlan,
    escapeHtml,
    formatStatus,
    normalizeStoryStatus,
    ADD_ICON_SVG,
    TASK_STATUSES,
    showDetail,
    configurePlanTabs,
    restoreTaskDodFocusIfNeeded,
    buildRightNav
  });
}

async function selectRequirement(id) {
  await requirementsController.selectRequirement(id);
}

function scrollWorkspaceToTop() {
  const contentEl = document.querySelector('.content');
  contentEl?.scrollTo({ top: 0, behavior: 'instant' });
}

function renderRequirementDetail() {
  syncCoreState({ currentRequirement }, 'renderRequirementDetail');
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
  const overviewSection = uiState.requirementOverview.isEditing
    ? `
      <div class="section-card">
        <div class="task-dod-title">
          <span>Overview</span>
          <span class="task-dod-hint">Edit mode attiva</span>
        </div>
        <div class="plan-notes-form">
          <textarea id="requirement-overview-input" class="plan-notes-input" rows="6" ${uiState.requirementOverview.isUpdating ? 'disabled' : ''}>${escapeHtml(currentOverview)}</textarea>
          <div class="plan-notes-actions">
            <button type="button" class="open-question-btn" onclick="saveRequirementOverviewFromEvent(event)" ${uiState.requirementOverview.isUpdating ? 'disabled' : ''}>Salva</button>
            <button type="button" class="open-question-btn is-secondary" onclick="cancelRequirementOverviewEditFromEvent(event)" ${uiState.requirementOverview.isUpdating ? 'disabled' : ''}>Annulla</button>
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
  const currentStateSection = uiState.requirementCurrentState.isEditing
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
                    <td><input type="text" class="plan-notes-input current-state-input" data-field="area" value="${escapeHtml(row?.area || '')}" ${uiState.requirementCurrentState.isUpdating ? 'disabled' : ''}></td>
                    <td><input type="text" class="plan-notes-input current-state-input" data-field="status" value="${escapeHtml(row?.status || '')}" ${uiState.requirementCurrentState.isUpdating ? 'disabled' : ''}></td>
                    <td><textarea class="plan-notes-input current-state-input current-state-notes-input" data-field="notes" rows="2" ${uiState.requirementCurrentState.isUpdating ? 'disabled' : ''}>${escapeHtml(row?.notes || '')}</textarea></td>
                    <td class="current-state-row-actions">
                      <button type="button" class="open-question-btn is-secondary current-state-row-remove" onclick="removeRequirementCurrentStateRowFromEvent(event)" ${uiState.requirementCurrentState.isUpdating ? 'disabled' : ''}>Rimuovi</button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          <div class="current-state-toolbar">
            <button type="button" class="open-question-btn is-secondary" onclick="addRequirementCurrentStateRowFromEvent(event)" ${uiState.requirementCurrentState.isUpdating ? 'disabled' : ''}>+ Riga</button>
          </div>
          <div class="plan-notes-actions">
            <button type="button" class="open-question-btn" onclick="saveRequirementCurrentStateFromEvent(event)" ${uiState.requirementCurrentState.isUpdating ? 'disabled' : ''}>Salva</button>
            <button type="button" class="open-question-btn is-secondary" onclick="cancelRequirementCurrentStateEditFromEvent(event)" ${uiState.requirementCurrentState.isUpdating ? 'disabled' : ''}>Annulla</button>
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
  const requirementNotesSection = uiState.requirementNotes.isEditing
    ? `
      <div class="section-card">
        <div class="task-dod-title">
          <span>Notes</span>
        </div>
        <div class="plan-notes-form">
          <textarea id="requirement-notes-input" class="plan-notes-input" rows="10" ${uiState.requirementNotes.isUpdating ? 'disabled' : ''}>${escapeHtml(requirementNotes)}</textarea>
          <div class="plan-notes-actions">
            <button type="button" class="open-question-btn" onclick="saveRequirementNotesFromEvent(event)" ${uiState.requirementNotes.isUpdating ? 'disabled' : ''}>Salva</button>
            <button type="button" class="open-question-btn is-secondary" onclick="cancelRequirementNotesEditFromEvent(event)" ${uiState.requirementNotes.isUpdating ? 'disabled' : ''}>Annulla</button>
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
        <div class="task-header"><span class="task-id">${escapeHtml(story.id)}</span>${uiState.story.editingId !== story.id ? `<span class="inline-actions"><button type="button" class="icon-action-btn" onclick="enableStoryEditByEncodedId(event, '${encodeURIComponent(story.id)}')">✎</button><button type="button" class="icon-action-btn" onclick="requestDeleteStoryByEncodedId(event, '${encodeURIComponent(story.id)}')"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"></polyline><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"></path><path d="M19 6l-1 14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1L5 6"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg></button></span>` : ''}</div>
        ${uiState.story.editingId === story.id ? renderStoryEditForm(story) : `<div class="task-title">${escapeHtml(story.title || '')}</div>
        <div class="task-context-row"><span class="task-context-label">As a</span><span class="task-context-values">${escapeHtml(story.asA || '')}</span></div>
        <div class="task-context-row"><span class="task-context-label">I want</span><span class="task-context-values">${escapeHtml(story.iWant || '')}</span></div>
        <div class="task-context-row"><span class="task-context-label">So that</span><span class="task-context-values">${escapeHtml(story.soThat || '')}</span></div>`}
        ${uiState.story.editingId === story.id ? '' : `<div
          class="task-dod${uiState.acceptance.editingStoryId === story.id ? ' is-editing' : ''}${uiState.acceptance.isUpdating ? ' is-busy' : ''}"
          data-story-id="${encodeURIComponent(story.id)}"
          role="button"
          tabindex="0"
          aria-label="Apri modalita modifica acceptance criteria"
          aria-expanded="${uiState.acceptance.editingStoryId === story.id ? 'true' : 'false'}"
          onclick="enableAcceptanceEditByEncodedId('${encodeURIComponent(story.id)}')"
          onkeydown="handleAcceptanceRegionKeydown(event, '${encodeURIComponent(story.id)}')">
          <div class="task-dod-title">
            <span>Acceptance Criteria:</span>
            <span class="task-dod-hint">${uiState.acceptance.editingStoryId === story.id ? 'Edit mode attiva' : 'Clicca per modificare'}</span>
            ${uiState.acceptance.editingStoryId === story.id ? `<button type="button" class="task-dod-exit" onclick="disableAcceptanceEditFromEvent(event)">Fine modifica</button>` : ''}
          </div>
          ${(story.acceptanceCriteria || []).map((ac, index) => uiState.acceptance.editingStoryId === story.id
            ? `
              <button type="button" class="task-dod-item task-dod-toggle${ac.checked ? ' is-completed' : ''}" onclick="toggleAcceptanceCriterionByEncodedIds(event, '${encodeURIComponent(doc.id || '')}', '${encodeURIComponent(story.id)}', ${index}, ${ac.checked ? 'false' : 'true'})" onkeydown="handleAcceptanceItemKeydown(event)" ${uiState.acceptance.isUpdating ? 'disabled' : ''}>
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

  document.getElementById('openQuestionsList').innerHTML = `<div class="section-title-row compact"><div class="section-title">Open questions</div><button type="button" class="icon-action-btn is-add" onclick="enableOpenQuestionCreateFromEvent(event)" ${uiState.openQuestion.isUpdating ? 'disabled' : ''}>${ADD_ICON_SVG}</button></div>${uiState.openQuestion.creating ? `
      <div class="task-item compact">
        <div class="task-header"><span class="task-id">Nuova open question</span></div>
        <div class="plan-notes-form">
          ${uiState.openQuestion.createStep === 'id' ? `
            <label class="open-question-label" for="new-open-question-id">ID</label>
            <input id="new-open-question-id" type="text" class="plan-notes-input compact-input" value="${escapeHtml(uiState.openQuestion.newId)}" ${uiState.openQuestion.isUpdating ? 'disabled' : ''}>
            <div class="plan-notes-actions"><button type="button" class="open-question-btn" onclick="proceedCreateOpenQuestionFromEvent(event)" ${uiState.openQuestion.isUpdating ? 'disabled' : ''}>Avanti</button><button type="button" class="open-question-btn is-secondary" onclick="cancelCreateOpenQuestionFromEvent(event)" ${uiState.openQuestion.isUpdating ? 'disabled' : ''}>Annulla</button></div>
          ` : `
            <div class="task-header task-header-tight"><span class="task-id">ID: ${escapeHtml(uiState.openQuestion.newId)}</span></div>
            <label class="open-question-label" for="new-open-question-question">Question</label>
            <input id="new-open-question-question" type="text" class="plan-notes-input compact-input" value="${escapeHtml(uiState.openQuestion.newQuestion)}" ${uiState.openQuestion.isUpdating ? 'disabled' : ''}>
            <div class="plan-notes-actions"><button type="button" class="open-question-btn" onclick="createOpenQuestionFromEvent(event)" ${uiState.openQuestion.isUpdating ? 'disabled' : ''}>Salva</button><button type="button" class="open-question-btn is-secondary" onclick="backCreateOpenQuestionFromEvent(event)" ${uiState.openQuestion.isUpdating ? 'disabled' : ''}>Indietro</button><button type="button" class="open-question-btn is-secondary" onclick="cancelCreateOpenQuestionFromEvent(event)" ${uiState.openQuestion.isUpdating ? 'disabled' : ''}>Annulla</button></div>
          `}
        </div>
      </div>
    ` : ''}${openQuestions.length
    ? openQuestions.map(q => `
      <div
        id="anchor-openq-${escapeHtml(q.id || '')}"
        class="task-item open-question-item${uiState.openQuestion.editingId === q.id ? ' is-editing' : ''}${uiState.openQuestion.isUpdating ? ' is-busy' : ''}"
        role="button"
        tabindex="0"
        aria-label="Apri modalita modifica open question"
        aria-expanded="${uiState.openQuestion.editingId === q.id ? 'true' : 'false'}"
        onclick="enableOpenQuestionEditByEncodedId('${encodeURIComponent(q.id || '')}')"
        onkeydown="handleOpenQuestionCardKeydown(event, '${encodeURIComponent(q.id || '')}')">
        <div class="task-header">
          <span class="task-id">${escapeHtml(q.id || '-')}</span>
          <span class="inline-actions">
            ${uiState.openQuestion.editingId !== q.id ? `<button type="button" class="icon-action-btn" onclick="requestDeleteOpenQuestionByEncodedIds(event, '${encodeURIComponent(doc.id || '')}', '${encodeURIComponent(q.id || '')}')" aria-label="Elimina open question" title="Elimina open question" ${uiState.openQuestion.isUpdating ? 'disabled' : ''}><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"></polyline><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"></path><path d="M19 6l-1 14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1L5 6"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg></button>` : ''}
            <span class="plan-item-status status-${q.status === 'resolved' ? 'completed' : 'pending'}">${q.status === 'resolved' ? 'Resolved' : 'Open'}</span>
          </span>
        </div>
        <div class="task-title">${escapeHtml(q.question || '')}</div>
        ${uiState.openQuestion.editingId === q.id ? `
          <div class="open-question-form" onclick="event.stopPropagation()">
            <label class="open-question-label" for="open-question-answer-${escapeHtml(q.id || '')}">Answer</label>
            <textarea
              id="open-question-answer-${escapeHtml(q.id || '')}"
              class="open-question-answer"
              rows="4"
              ${uiState.openQuestion.isUpdating ? 'disabled' : ''}
            >${escapeHtml(q.answer || '')}</textarea>
            <label class="open-question-label" for="open-question-status-${escapeHtml(q.id || '')}">Status</label>
            <select
              id="open-question-status-${escapeHtml(q.id || '')}"
              class="open-question-status"
              ${uiState.openQuestion.isUpdating ? 'disabled' : ''}>
              ${OPEN_QUESTION_STATUSES.map(status => `<option value="${status}"${status === q.status ? ' selected' : ''}>${status === 'resolved' ? 'Resolved' : 'Open'}</option>`).join('')}
            </select>
            <div class="open-question-actions">
              <button type="button" class="open-question-btn" onclick="saveOpenQuestionByEncodedIds(event, '${encodeURIComponent(doc.id || '')}', '${encodeURIComponent(q.id || '')}')" ${uiState.openQuestion.isUpdating ? 'disabled' : ''}>Salva</button>
              <button type="button" class="open-question-btn is-secondary" onclick="cancelOpenQuestionEditFromEvent(event)" ${uiState.openQuestion.isUpdating ? 'disabled' : ''}>Annulla</button>
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
      <button type="button" class="icon-action-btn is-add" onclick="enableCreateFunctionalRequirementFromEvent(event)" aria-label="Aggiungi requisito funzionale" title="Aggiungi requisito funzionale" ${uiState.functionalRequirement.isUpdating ? 'disabled' : ''}>${ADD_ICON_SVG}</button>
    </div>
    ${uiState.functionalRequirement.creating ? `
      <div class="task-item compact">
        <div class="task-header"><span class="task-id">Nuovo requisito funzionale</span></div>
        <div class="plan-notes-form">
          ${uiState.functionalRequirement.createStep === 'id' ? `
            <label class="open-question-label" for="new-functional-requirement-id">ID</label>
            <input id="new-functional-requirement-id" type="text" class="plan-notes-input compact-input" value="${escapeHtml(uiState.functionalRequirement.newId)}" ${uiState.functionalRequirement.isUpdating ? 'disabled' : ''}>
            <div class="plan-notes-actions">
              <button type="button" class="open-question-btn" onclick="proceedCreateFunctionalRequirementFromEvent(event)" ${uiState.functionalRequirement.isUpdating ? 'disabled' : ''}>Avanti</button>
              <button type="button" class="open-question-btn is-secondary" onclick="cancelCreateFunctionalRequirementFromEvent(event)" ${uiState.functionalRequirement.isUpdating ? 'disabled' : ''}>Annulla</button>
            </div>
          ` : `
            <div class="task-header task-header-tight"><span class="task-id">ID: ${escapeHtml(uiState.functionalRequirement.newId)}</span></div>
            <label class="open-question-label" for="new-functional-requirement-title">Titolo</label>
            <input id="new-functional-requirement-title" type="text" class="plan-notes-input compact-input" value="${escapeHtml(uiState.functionalRequirement.newTitle)}" ${uiState.functionalRequirement.isUpdating ? 'disabled' : ''}>
            <label class="open-question-label" for="new-functional-requirement-description">Descrizione</label>
            <textarea id="new-functional-requirement-description" class="plan-notes-input" rows="3" ${uiState.functionalRequirement.isUpdating ? 'disabled' : ''}>${escapeHtml(uiState.functionalRequirement.newDescription)}</textarea>
            <div class="plan-notes-actions">
              <button type="button" class="open-question-btn" onclick="createFunctionalRequirementFromEvent(event)" ${uiState.functionalRequirement.isUpdating ? 'disabled' : ''}>Salva</button>
              <button type="button" class="open-question-btn is-secondary" onclick="backCreateFunctionalRequirementFromEvent(event)" ${uiState.functionalRequirement.isUpdating ? 'disabled' : ''}>Indietro</button>
              <button type="button" class="open-question-btn is-secondary" onclick="cancelCreateFunctionalRequirementFromEvent(event)" ${uiState.functionalRequirement.isUpdating ? 'disabled' : ''}>Annulla</button>
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
        ${isFunctional && uiState.functionalRequirement.editingId !== item.id ? `<span class="inline-actions"><button type="button" class="icon-action-btn" onclick="editFunctionalRequirementByEncodedId(event, '${encodeURIComponent(item.id || '')}')" aria-label="Modifica requisito funzionale" title="Modifica requisito funzionale" ${uiState.functionalRequirement.isUpdating ? 'disabled' : ''}>✎</button><button type="button" class="icon-action-btn" onclick="requestDeleteFunctionalRequirementByEncodedId(event, '${encodeURIComponent(item.id || '')}')" aria-label="Elimina requisito funzionale" title="Elimina requisito funzionale" ${uiState.functionalRequirement.isUpdating ? 'disabled' : ''}><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"></polyline><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"></path><path d="M19 6l-1 14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1L5 6"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg></button></span>` : ''}
      </div>
      ${isFunctional && uiState.functionalRequirement.editingId === item.id ? `
        <div class="plan-notes-form">
          <label class="open-question-label" for="functional-title-${encodeURIComponent(item.id || '')}">Titolo</label>
          <input id="functional-title-${encodeURIComponent(item.id || '')}" type="text" class="plan-notes-input compact-input" value="${escapeHtml(item.title || '')}" ${uiState.functionalRequirement.isUpdating ? 'disabled' : ''}>
          <label class="open-question-label" for="functional-description-${encodeURIComponent(item.id || '')}">Descrizione</label>
          <textarea id="functional-description-${encodeURIComponent(item.id || '')}" class="plan-notes-input" rows="3" ${uiState.functionalRequirement.isUpdating ? 'disabled' : ''}>${escapeHtml(item.description || '')}</textarea>
          <div class="plan-notes-actions">
            <button type="button" class="open-question-btn" onclick="saveFunctionalRequirementByEncodedId(event, '${encodeURIComponent(item.id || '')}')" ${uiState.functionalRequirement.isUpdating ? 'disabled' : ''}>Salva</button>
            <button type="button" class="open-question-btn is-secondary" onclick="cancelFunctionalRequirementEditFromEvent(event)" ${uiState.functionalRequirement.isUpdating ? 'disabled' : ''}>Annulla</button>
          </div>
        </div>
      ` : `<div class="task-title">${escapeHtml(item.title || '')}</div><div class="task-what">${escapeHtml(item.description || '')}</div>`}
    </div>
  `).join('')}</div>${isFunctional ? renderDeleteFunctionalRequirementModal() : ''}`;
}

function renderDeleteFunctionalRequirementModal() {
  if (!uiState.functionalRequirement.deletingId) return '';
  return `
    <div class="confirm-modal-overlay" onclick="closeDeleteFunctionalRequirementModalFromEvent(event)">
      <div class="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="delete-functional-title" aria-describedby="delete-functional-text" tabindex="-1" onclick="event.stopPropagation()" onkeydown="handleDeleteFunctionalRequirementModalKeydown(event)">
        <button type="button" class="confirm-modal-close" aria-label="Chiudi modal" title="Chiudi" onclick="closeDeleteFunctionalRequirementModalFromEvent(event)">×</button>
        <div class="confirm-modal-title" id="delete-functional-title">Conferma eliminazione</div>
        <div class="confirm-modal-text" id="delete-functional-text">Vuoi eliminare il requisito funzionale <strong>${escapeHtml(uiState.functionalRequirement.deletingId)}</strong>?</div>
        <div class="plan-notes-actions confirm-modal-actions">
          <button type="button" class="open-question-btn is-danger" data-modal-focus="first" onclick="confirmDeleteFunctionalRequirementFromEvent(event)" ${uiState.functionalRequirement.isUpdating ? 'disabled' : ''}>Elimina</button>
          <button type="button" class="open-question-btn is-secondary" data-modal-focus="last" onclick="closeDeleteFunctionalRequirementModalFromEvent(event)" ${uiState.functionalRequirement.isUpdating ? 'disabled' : ''}>Annulla</button>
        </div>
      </div>
    </div>
  `;
}

function enableCreateFunctionalRequirement() {
  if (!currentRequirement || currentSection !== 'requirements' || uiState.functionalRequirement.isUpdating) return;
  uiState.functionalRequirement.creating = true;
  uiState.functionalRequirement.newId = 'RF-';
  uiState.functionalRequirement.createStep = 'id';
  uiState.functionalRequirement.newTitle = '';
  uiState.functionalRequirement.newDescription = '';
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
  uiState.functionalRequirement.creating = false;
  uiState.functionalRequirement.newId = '';
  uiState.functionalRequirement.createStep = 'id';
  uiState.functionalRequirement.newTitle = '';
  uiState.functionalRequirement.newDescription = '';
  renderRequirementDetail();
}

function proceedCreateFunctionalRequirement() {
  if (!currentRequirement || currentSection !== 'requirements' || uiState.functionalRequirement.isUpdating) return;
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
  uiState.functionalRequirement.newId = functionalId;
  uiState.functionalRequirement.createStep = 'details';
  renderRequirementDetail();
  setTimeout(() => document.getElementById('new-functional-requirement-title')?.focus(), 0);
}

function proceedCreateFunctionalRequirementFromEvent(event) {
  event.stopPropagation();
  proceedCreateFunctionalRequirement();
}

function backCreateFunctionalRequirementFromEvent(event) {
  event.stopPropagation();
  if (!currentRequirement || currentSection !== 'requirements' || uiState.functionalRequirement.isUpdating) return;
  const titleEl = document.getElementById('new-functional-requirement-title');
  const descriptionEl = document.getElementById('new-functional-requirement-description');
  uiState.functionalRequirement.newTitle = String(titleEl?.value || '').trim();
  uiState.functionalRequirement.newDescription = String(descriptionEl?.value || '').trim();
  uiState.functionalRequirement.createStep = 'id';
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
  if (!currentRequirement || currentSection !== 'requirements' || uiState.functionalRequirement.isUpdating) return;
  const requirementId = currentRequirement.document?.id || currentRequirement.id;
  if (!requirementId) return;
  const functionalId = String(uiState.functionalRequirement.newId || '').trim();
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
  uiState.functionalRequirement.newTitle = title;
  uiState.functionalRequirement.newDescription = description;

  uiState.functionalRequirement.isUpdating = true;
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
    syncCoreState({ currentRequirement }, 'createFunctionalRequirementFromEvent:refreshRequirement');
    uiState.functionalRequirement.creating = false;
    uiState.functionalRequirement.newId = '';
    uiState.functionalRequirement.createStep = 'id';
    uiState.functionalRequirement.newTitle = '';
    uiState.functionalRequirement.newDescription = '';
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
    uiState.functionalRequirement.isUpdating = false;
    renderRequirementDetail();
  }
}

function createFunctionalRequirementFromEvent(event) {
  event.stopPropagation();
  createFunctionalRequirement();
}

function editFunctionalRequirement(functionalId) {
  if (!currentRequirement || currentSection !== 'requirements' || !functionalId || uiState.functionalRequirement.isUpdating) return;
  uiState.functionalRequirement.editingId = functionalId;
  renderRequirementDetail();
}

function cancelFunctionalRequirementEditFromEvent(event) {
  event.stopPropagation();
  uiState.functionalRequirement.editingId = null;
  renderRequirementDetail();
}

async function saveFunctionalRequirement(functionalId) {
  if (!currentRequirement || currentSection !== 'requirements' || !functionalId || uiState.functionalRequirement.isUpdating) return;
  const requirementId = currentRequirement.document?.id || currentRequirement.id;
  if (!requirementId) return;
  const titleEl = document.getElementById(`functional-title-${encodeURIComponent(functionalId)}`);
  const descriptionEl = document.getElementById(`functional-description-${encodeURIComponent(functionalId)}`);
  const title = String(titleEl?.value || '');
  const description = String(descriptionEl?.value || '');

  uiState.functionalRequirement.isUpdating = true;
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
    syncCoreState({ currentRequirement }, 'saveFunctionalRequirementByEncodedId:refreshRequirement');
    uiState.functionalRequirement.editingId = null;
    document.querySelector(`.plan-item[data-id="${CSS.escape(requirementId)}"]`)?.classList.add('active');
    renderRequirementDetail();
    showToast('Requisito funzionale aggiornato');
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    uiState.functionalRequirement.isUpdating = false;
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
  if (!currentRequirement || currentSection !== 'requirements' || !functionalId || uiState.functionalRequirement.isUpdating) return;
  const requirementId = currentRequirement.document?.id || currentRequirement.id;
  if (!requirementId) return;

  uiState.functionalRequirement.isUpdating = true;
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
    syncCoreState({ currentRequirement }, 'confirmDeleteFunctionalRequirementFromEvent:refreshRequirement');
    if (uiState.functionalRequirement.editingId === functionalId) uiState.functionalRequirement.editingId = null;
    document.querySelector(`.plan-item[data-id="${CSS.escape(requirementId)}"]`)?.classList.add('active');
    renderRequirementDetail();
    showToast('Requisito funzionale eliminato');
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    uiState.functionalRequirement.isUpdating = false;
    renderRequirementDetail();
  }
}

function deleteFunctionalRequirementByEncodedId(event, encodedFunctionalId) {
  event.stopPropagation();
  deleteFunctionalRequirement(decodeURIComponent(encodedFunctionalId));
}

function requestDeleteFunctionalRequirement(functionalId) {
  if (!currentRequirement || currentSection !== 'requirements' || !functionalId || uiState.functionalRequirement.isUpdating) return;
  uiState.functionalRequirement.modalReturnFocusEl = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  uiState.functionalRequirement.deletingId = functionalId;
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
  if (uiState.functionalRequirement.isUpdating) return;
  uiState.functionalRequirement.deletingId = null;
  renderRequirementDetail();
  if (uiState.functionalRequirement.modalReturnFocusEl && typeof uiState.functionalRequirement.modalReturnFocusEl.focus === 'function') {
    setTimeout(() => uiState.functionalRequirement.modalReturnFocusEl?.focus(), 0);
  }
  uiState.functionalRequirement.modalReturnFocusEl = null;
}

function closeDeleteFunctionalRequirementModalFromEvent(event) {
  event.stopPropagation();
  closeDeleteFunctionalRequirementModal();
}

function confirmDeleteFunctionalRequirementFromEvent(event) {
  event.stopPropagation();
  const functionalId = uiState.functionalRequirement.deletingId;
  if (!functionalId) return;
  uiState.functionalRequirement.deletingId = null;
  deleteFunctionalRequirement(functionalId);
}

function handleDeleteFunctionalRequirementModalKeydown(event) {
  if (!uiState.functionalRequirement.deletingId) return;
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
      <button type="button" class="icon-action-btn is-add" onclick="enableCreateNonFunctionalRequirementFromEvent(event)" aria-label="Aggiungi requisito non funzionale" title="Aggiungi requisito non funzionale" ${uiState.nonFunctionalRequirement.isUpdating ? 'disabled' : ''}>${ADD_ICON_SVG}</button>
    </div>
    ${uiState.nonFunctionalRequirement.creating ? `
      <div class="task-item compact">
        <div class="task-header"><span class="task-id">Nuovo requisito non funzionale</span></div>
        <div class="plan-notes-form">
          ${uiState.nonFunctionalRequirement.createStep === 'id' ? `
            <label class="open-question-label" for="new-non-functional-requirement-id">ID</label>
            <input id="new-non-functional-requirement-id" type="text" class="plan-notes-input compact-input" value="${escapeHtml(uiState.nonFunctionalRequirement.newId)}" ${uiState.nonFunctionalRequirement.isUpdating ? 'disabled' : ''}>
            <div class="plan-notes-actions">
              <button type="button" class="open-question-btn" onclick="proceedCreateNonFunctionalRequirementFromEvent(event)" ${uiState.nonFunctionalRequirement.isUpdating ? 'disabled' : ''}>Avanti</button>
              <button type="button" class="open-question-btn is-secondary" onclick="cancelCreateNonFunctionalRequirementFromEvent(event)" ${uiState.nonFunctionalRequirement.isUpdating ? 'disabled' : ''}>Annulla</button>
            </div>
          ` : `
            <div class="task-header task-header-tight"><span class="task-id">ID: ${escapeHtml(uiState.nonFunctionalRequirement.newId)}</span></div>
            <label class="open-question-label" for="new-non-functional-requirement-title">Titolo</label>
            <input id="new-non-functional-requirement-title" type="text" class="plan-notes-input compact-input" value="${escapeHtml(uiState.nonFunctionalRequirement.newTitle)}" ${uiState.nonFunctionalRequirement.isUpdating ? 'disabled' : ''}>
            <label class="open-question-label" for="new-non-functional-requirement-description">Descrizione</label>
            <textarea id="new-non-functional-requirement-description" class="plan-notes-input" rows="3" ${uiState.nonFunctionalRequirement.isUpdating ? 'disabled' : ''}>${escapeHtml(uiState.nonFunctionalRequirement.newDescription)}</textarea>
            <div class="plan-notes-actions">
              <button type="button" class="open-question-btn" onclick="createNonFunctionalRequirementFromEvent(event)" ${uiState.nonFunctionalRequirement.isUpdating ? 'disabled' : ''}>Salva</button>
              <button type="button" class="open-question-btn is-secondary" onclick="backCreateNonFunctionalRequirementFromEvent(event)" ${uiState.nonFunctionalRequirement.isUpdating ? 'disabled' : ''}>Indietro</button>
              <button type="button" class="open-question-btn is-secondary" onclick="cancelCreateNonFunctionalRequirementFromEvent(event)" ${uiState.nonFunctionalRequirement.isUpdating ? 'disabled' : ''}>Annulla</button>
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
        ${uiState.nonFunctionalRequirement.editingId !== item.id ? `<span class="inline-actions"><button type="button" class="icon-action-btn" onclick="editNonFunctionalRequirementByEncodedId(event, '${encodeURIComponent(item.id || '')}')" aria-label="Modifica requisito non funzionale" title="Modifica requisito non funzionale" ${uiState.nonFunctionalRequirement.isUpdating ? 'disabled' : ''}>✎</button><button type="button" class="icon-action-btn" onclick="requestDeleteNonFunctionalRequirementByEncodedId(event, '${encodeURIComponent(item.id || '')}')" aria-label="Elimina requisito non funzionale" title="Elimina requisito non funzionale" ${uiState.nonFunctionalRequirement.isUpdating ? 'disabled' : ''}><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"></polyline><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"></path><path d="M19 6l-1 14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1L5 6"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg></button></span>` : ''}
      </div>
      ${uiState.nonFunctionalRequirement.editingId === item.id ? `
        <div class="plan-notes-form">
          <label class="open-question-label" for="non-functional-title-${encodeURIComponent(item.id || '')}">Titolo</label>
          <input id="non-functional-title-${encodeURIComponent(item.id || '')}" type="text" class="plan-notes-input compact-input" value="${escapeHtml(item.title || '')}" ${uiState.nonFunctionalRequirement.isUpdating ? 'disabled' : ''}>
          <label class="open-question-label" for="non-functional-description-${encodeURIComponent(item.id || '')}">Descrizione</label>
          <textarea id="non-functional-description-${encodeURIComponent(item.id || '')}" class="plan-notes-input" rows="3" ${uiState.nonFunctionalRequirement.isUpdating ? 'disabled' : ''}>${escapeHtml(item.description || '')}</textarea>
          <div class="plan-notes-actions">
            <button type="button" class="open-question-btn" onclick="saveNonFunctionalRequirementByEncodedId(event, '${encodeURIComponent(item.id || '')}')" ${uiState.nonFunctionalRequirement.isUpdating ? 'disabled' : ''}>Salva</button>
            <button type="button" class="open-question-btn is-secondary" onclick="cancelNonFunctionalRequirementEditFromEvent(event)" ${uiState.nonFunctionalRequirement.isUpdating ? 'disabled' : ''}>Annulla</button>
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
      <button type="button" class="icon-action-btn is-add" onclick="enableCreatePlanDecisionFromEvent(event)" aria-label="Aggiungi decision" title="Aggiungi decision" ${uiState.planDecision.isUpdating ? 'disabled' : ''}>${ADD_ICON_SVG}</button>
    </div>
    ${uiState.planDecision.creating ? `
      <div class="task-item compact">
        <div class="task-header"><span class="task-id">Nuova decision</span></div>
        <div class="plan-notes-form">
          ${uiState.planDecision.createStep === 'id' ? `
            <label class="open-question-label" for="new-plan-decision-id">ID</label>
            <input id="new-plan-decision-id" type="text" class="plan-notes-input compact-input" value="${escapeHtml(uiState.planDecision.newId)}" ${uiState.planDecision.isUpdating ? 'disabled' : ''}>
            <div class="plan-notes-actions">
              <button type="button" class="open-question-btn" onclick="proceedCreatePlanDecisionFromEvent(event)" ${uiState.planDecision.isUpdating ? 'disabled' : ''}>Avanti</button>
              <button type="button" class="open-question-btn is-secondary" onclick="cancelCreatePlanDecisionFromEvent(event)" ${uiState.planDecision.isUpdating ? 'disabled' : ''}>Annulla</button>
            </div>
          ` : `
            <div class="task-header task-header-tight"><span class="task-id">ID: ${escapeHtml(uiState.planDecision.newId)}</span></div>
            <label class="open-question-label" for="new-plan-decision-description">Description / Choice</label>
            <textarea id="new-plan-decision-description" class="plan-notes-input" rows="3" ${uiState.planDecision.isUpdating ? 'disabled' : ''}>${escapeHtml(uiState.planDecision.newDescription)}</textarea>
            <label class="open-question-label" for="new-plan-decision-rationale">Rationale</label>
            <textarea id="new-plan-decision-rationale" class="plan-notes-input" rows="3" ${uiState.planDecision.isUpdating ? 'disabled' : ''}>${escapeHtml(uiState.planDecision.newRationale)}</textarea>
            <div class="plan-notes-actions">
              <button type="button" class="open-question-btn" onclick="createPlanDecisionFromEvent(event)" ${uiState.planDecision.isUpdating ? 'disabled' : ''}>Salva</button>
              <button type="button" class="open-question-btn is-secondary" onclick="backCreatePlanDecisionFromEvent(event)" ${uiState.planDecision.isUpdating ? 'disabled' : ''}>Indietro</button>
              <button type="button" class="open-question-btn is-secondary" onclick="cancelCreatePlanDecisionFromEvent(event)" ${uiState.planDecision.isUpdating ? 'disabled' : ''}>Annulla</button>
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
          ${uiState.planDecision.editingId !== itemId ? `<span class="inline-actions"><button type="button" class="icon-action-btn" onclick="editPlanDecisionByEncodedId(event, '${encodeURIComponent(itemId)}')" aria-label="Modifica decision" title="Modifica decision" ${uiState.planDecision.isUpdating ? 'disabled' : ''}>✎</button><button type="button" class="icon-action-btn" onclick="requestDeletePlanDecisionByEncodedId(event, '${encodeURIComponent(itemId)}')" aria-label="Elimina decision" title="Elimina decision" ${uiState.planDecision.isUpdating ? 'disabled' : ''}><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"></polyline><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"></path><path d="M19 6l-1 14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1L5 6"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg></button></span>` : ''}
        </div>
        ${uiState.planDecision.editingId === itemId ? `
          <div class="plan-notes-form">
            <label class="open-question-label" for="plan-decision-description-${encodeURIComponent(itemId)}">Description / Choice</label>
            <textarea id="plan-decision-description-${encodeURIComponent(itemId)}" class="plan-notes-input" rows="3" ${uiState.planDecision.isUpdating ? 'disabled' : ''}>${escapeHtml(item.description || item.choice || '')}</textarea>
            <label class="open-question-label" for="plan-decision-rationale-${encodeURIComponent(itemId)}">Rationale</label>
            <textarea id="plan-decision-rationale-${encodeURIComponent(itemId)}" class="plan-notes-input" rows="3" ${uiState.planDecision.isUpdating ? 'disabled' : ''}>${escapeHtml(item.rationale || item.motivation || '')}</textarea>
            <div class="plan-notes-actions">
              <button type="button" class="open-question-btn" onclick="savePlanDecisionByEncodedId(event, '${encodeURIComponent(itemId)}')" ${uiState.planDecision.isUpdating ? 'disabled' : ''}>Salva</button>
              <button type="button" class="open-question-btn is-secondary" onclick="cancelPlanDecisionEditFromEvent(event)" ${uiState.planDecision.isUpdating ? 'disabled' : ''}>Annulla</button>
            </div>
          </div>
        ` : `<div class="task-title">${escapeHtml(item.description || item.choice || '')}</div><div class="task-what">${escapeHtml(item.rationale || item.motivation || '')}</div>${item.date ? `<div class="task-notes"><strong>Date:</strong> ${escapeHtml(item.date)}</div>` : ''}`}
      </div>
    `;
  }).join('')}</div>${renderDeletePlanDecisionModal()}`;
}

function renderDeletePlanDecisionModal() {
  if (!uiState.planDecision.deletingId) return '';
  return `
    <div class="confirm-modal-overlay" onclick="closeDeletePlanDecisionModalFromEvent(event)">
      <div class="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="delete-plan-decision-title" aria-describedby="delete-plan-decision-text" tabindex="-1" onclick="event.stopPropagation()" onkeydown="handleDeletePlanDecisionModalKeydown(event)">
        <button type="button" class="confirm-modal-close" aria-label="Chiudi modal" title="Chiudi" onclick="closeDeletePlanDecisionModalFromEvent(event)">×</button>
        <div class="confirm-modal-title" id="delete-plan-decision-title">Conferma eliminazione</div>
        <div class="confirm-modal-text" id="delete-plan-decision-text">Vuoi eliminare la decision <strong>${escapeHtml(uiState.planDecision.deletingId)}</strong>?</div>
        <div class="plan-notes-actions confirm-modal-actions">
          <button type="button" class="open-question-btn is-danger" data-modal-focus="first" onclick="confirmDeletePlanDecisionFromEvent(event)" ${uiState.planDecision.isUpdating ? 'disabled' : ''}>Elimina</button>
          <button type="button" class="open-question-btn is-secondary" data-modal-focus="last" onclick="closeDeletePlanDecisionModalFromEvent(event)" ${uiState.planDecision.isUpdating ? 'disabled' : ''}>Annulla</button>
        </div>
      </div>
    </div>
  `;
}

function enableCreatePlanDecisionFromEvent(event) { event.stopPropagation(); if (!currentPlan || currentSection !== 'plans' || uiState.planDecision.isUpdating) return; uiState.planDecision.creating = true; uiState.planDecision.createStep = 'id'; uiState.planDecision.newId = 'DEC-'; uiState.planDecision.newDescription = ''; uiState.planDecision.newRationale = ''; renderPlanDetail(); setTimeout(() => { const input = document.getElementById('new-plan-decision-id'); if (!input) return; input.focus(); input.setSelectionRange(input.value.length, input.value.length); }, 0); }
function cancelCreatePlanDecisionFromEvent(event) { event.stopPropagation(); uiState.planDecision.creating = false; uiState.planDecision.createStep = 'id'; uiState.planDecision.newId = ''; uiState.planDecision.newDescription = ''; uiState.planDecision.newRationale = ''; renderPlanDetail(); }
function proceedCreatePlanDecisionFromEvent(event) { event.stopPropagation(); if (!currentPlan || currentSection !== 'plans' || uiState.planDecision.isUpdating) return; const decisionId = String(document.getElementById('new-plan-decision-id')?.value || '').trim(); if (!decisionId) return showToast('Inserisci un ID', 'error'); if ((currentPlan.decisions || []).some(item => (item.id || item.decision) === decisionId)) return showToast('ID gia presente', 'error'); uiState.planDecision.newId = decisionId; uiState.planDecision.createStep = 'details'; renderPlanDetail(); setTimeout(() => document.getElementById('new-plan-decision-description')?.focus(), 0); }
function backCreatePlanDecisionFromEvent(event) { event.stopPropagation(); if (!currentPlan || currentSection !== 'plans' || uiState.planDecision.isUpdating) return; uiState.planDecision.newDescription = String(document.getElementById('new-plan-decision-description')?.value || '').trim(); uiState.planDecision.newRationale = String(document.getElementById('new-plan-decision-rationale')?.value || '').trim(); uiState.planDecision.createStep = 'id'; renderPlanDetail(); }
async function createPlanDecisionFromEvent(event) { event.stopPropagation(); if (!currentPlan || currentSection !== 'plans' || uiState.planDecision.isUpdating) return; const planId = currentPlan.id; if (!planId) return; const decisionId = String(uiState.planDecision.newId || '').trim(); const description = String(document.getElementById('new-plan-decision-description')?.value || '').trim(); const rationale = String(document.getElementById('new-plan-decision-rationale')?.value || '').trim(); const date = getCurrentDateIso(); if (!decisionId) return showToast('Inserisci un ID', 'error'); if (!description || !rationale) return showToast('Descrizione e rationale sono obbligatori', 'error'); uiState.planDecision.isUpdating = true; renderPlanDetail(); try { const res = await fetch(`/api/plans/${encodeURIComponent(planId)}/decisions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ decisionId, description, rationale, date }) }); if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Unable to add decision'); } const [updatedPlanRes] = await Promise.all([fetch(`/api/plans/${encodeURIComponent(planId)}`, { cache: 'no-store' }), loadPlans()]); if (!updatedPlanRes.ok) throw new Error('Unable to refresh plan after create'); currentPlan = await updatedPlanRes.json(); uiState.planDecision.creating = false; uiState.planDecision.createStep = 'id'; uiState.planDecision.newId = ''; uiState.planDecision.newDescription = ''; uiState.planDecision.newRationale = ''; renderPlanDetail(); showToast('Decision aggiunta'); } catch (error) { showToast(error.message, 'error'); } finally { uiState.planDecision.isUpdating = false; renderPlanDetail(); } }
function editPlanDecisionByEncodedId(event, encodedDecisionId) { event.stopPropagation(); if (!currentPlan || currentSection !== 'plans' || uiState.planDecision.isUpdating) return; uiState.planDecision.editingId = decodeURIComponent(encodedDecisionId); renderPlanDetail(); }
function cancelPlanDecisionEditFromEvent(event) { event.stopPropagation(); uiState.planDecision.editingId = null; renderPlanDetail(); }
async function savePlanDecisionByEncodedId(event, encodedDecisionId) { event.stopPropagation(); if (!currentPlan || currentSection !== 'plans' || uiState.planDecision.isUpdating) return; const decisionId = decodeURIComponent(encodedDecisionId); const planId = currentPlan.id; if (!planId || !decisionId) return; const description = String(document.getElementById(`plan-decision-description-${encodeURIComponent(decisionId)}`)?.value || ''); const rationale = String(document.getElementById(`plan-decision-rationale-${encodeURIComponent(decisionId)}`)?.value || ''); uiState.planDecision.isUpdating = true; renderPlanDetail(); try { const res = await fetch(`/api/plans/${encodeURIComponent(planId)}/decisions/${encodeURIComponent(decisionId)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ description, rationale }) }); if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Unable to update decision'); } const [updatedPlanRes] = await Promise.all([fetch(`/api/plans/${encodeURIComponent(planId)}`, { cache: 'no-store' }), loadPlans()]); if (!updatedPlanRes.ok) throw new Error('Unable to refresh plan after update'); currentPlan = await updatedPlanRes.json(); uiState.planDecision.editingId = null; renderPlanDetail(); showToast('Decision aggiornata'); } catch (error) { showToast(error.message, 'error'); } finally { uiState.planDecision.isUpdating = false; renderPlanDetail(); } }
function requestDeletePlanDecisionByEncodedId(event, encodedDecisionId) { event.stopPropagation(); if (!currentPlan || currentSection !== 'plans' || uiState.planDecision.isUpdating) return; uiState.planDecision.modalReturnFocusEl = document.activeElement instanceof HTMLElement ? document.activeElement : null; uiState.planDecision.deletingId = decodeURIComponent(encodedDecisionId); renderPlanDetail(); setTimeout(() => { const cancelBtn = document.querySelector('.confirm-modal [data-modal-focus="last"]'); const dialog = document.querySelector('.confirm-modal'); if (cancelBtn instanceof HTMLElement) return cancelBtn.focus(); if (dialog instanceof HTMLElement) dialog.focus(); }, 0); }
function closeDeletePlanDecisionModalFromEvent(event) { event.stopPropagation(); if (uiState.planDecision.isUpdating) return; uiState.planDecision.deletingId = null; renderPlanDetail(); if (uiState.planDecision.modalReturnFocusEl && typeof uiState.planDecision.modalReturnFocusEl.focus === 'function') setTimeout(() => uiState.planDecision.modalReturnFocusEl?.focus(), 0); uiState.planDecision.modalReturnFocusEl = null; }
async function confirmDeletePlanDecisionFromEvent(event) { event.stopPropagation(); if (!uiState.planDecision.deletingId || !currentPlan || currentSection !== 'plans' || uiState.planDecision.isUpdating) return; const decisionId = uiState.planDecision.deletingId; uiState.planDecision.deletingId = null; const planId = currentPlan.id; if (!planId) return; uiState.planDecision.isUpdating = true; renderPlanDetail(); try { const res = await fetch(`/api/plans/${encodeURIComponent(planId)}/decisions/${encodeURIComponent(decisionId)}`, { method: 'DELETE' }); if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Unable to delete decision'); } const [updatedPlanRes] = await Promise.all([fetch(`/api/plans/${encodeURIComponent(planId)}`, { cache: 'no-store' }), loadPlans()]); if (!updatedPlanRes.ok) throw new Error('Unable to refresh plan after delete'); currentPlan = await updatedPlanRes.json(); if (uiState.planDecision.editingId === decisionId) uiState.planDecision.editingId = null; renderPlanDetail(); showToast('Decision eliminata'); } catch (error) { showToast(error.message, 'error'); } finally { uiState.planDecision.isUpdating = false; renderPlanDetail(); } }
function handleDeletePlanDecisionModalKeydown(event) { if (!uiState.planDecision.deletingId) return; if (event.key === 'Escape') { event.preventDefault(); closeDeletePlanDecisionModalFromEvent(event); return; } if (event.key !== 'Tab') return; const focusable = Array.from(document.querySelectorAll('.confirm-modal button:not([disabled]), .confirm-modal [href], .confirm-modal input:not([disabled]), .confirm-modal textarea:not([disabled]), .confirm-modal select:not([disabled]), .confirm-modal [tabindex]:not([tabindex="-1"])')); if (!focusable.length) return; const first = focusable[0]; const last = focusable[focusable.length - 1]; const active = document.activeElement; if (event.shiftKey && active === first) { event.preventDefault(); last.focus(); return; } if (!event.shiftKey && active === last) { event.preventDefault(); first.focus(); } }

function renderDeleteNonFunctionalRequirementModal() {
  if (!uiState.nonFunctionalRequirement.deletingId) return '';
  return `
    <div class="confirm-modal-overlay" onclick="closeDeleteNonFunctionalRequirementModalFromEvent(event)">
      <div class="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="delete-non-functional-title" aria-describedby="delete-non-functional-text" tabindex="-1" onclick="event.stopPropagation()" onkeydown="handleDeleteNonFunctionalRequirementModalKeydown(event)">
        <button type="button" class="confirm-modal-close" aria-label="Chiudi modal" title="Chiudi" onclick="closeDeleteNonFunctionalRequirementModalFromEvent(event)">×</button>
        <div class="confirm-modal-title" id="delete-non-functional-title">Conferma eliminazione</div>
        <div class="confirm-modal-text" id="delete-non-functional-text">Vuoi eliminare il requisito non funzionale <strong>${escapeHtml(uiState.nonFunctionalRequirement.deletingId)}</strong>?</div>
        <div class="plan-notes-actions confirm-modal-actions">
          <button type="button" class="open-question-btn is-danger" data-modal-focus="first" onclick="confirmDeleteNonFunctionalRequirementFromEvent(event)" ${uiState.nonFunctionalRequirement.isUpdating ? 'disabled' : ''}>Elimina</button>
          <button type="button" class="open-question-btn is-secondary" data-modal-focus="last" onclick="closeDeleteNonFunctionalRequirementModalFromEvent(event)" ${uiState.nonFunctionalRequirement.isUpdating ? 'disabled' : ''}>Annulla</button>
        </div>
      </div>
    </div>
  `;
}

function enableCreateNonFunctionalRequirementFromEvent(event) { event.stopPropagation(); uiState.nonFunctionalRequirement.creating = true; uiState.nonFunctionalRequirement.newId = 'RNF-'; uiState.nonFunctionalRequirement.createStep = 'id'; uiState.nonFunctionalRequirement.newTitle = ''; uiState.nonFunctionalRequirement.newDescription = ''; renderRequirementDetail(); setTimeout(() => { const idInput = document.getElementById('new-non-functional-requirement-id'); if (!idInput) return; idInput.focus(); const cursor = idInput.value.length; idInput.setSelectionRange(cursor, cursor); }, 0); }
function cancelCreateNonFunctionalRequirementFromEvent(event) { event.stopPropagation(); uiState.nonFunctionalRequirement.creating = false; uiState.nonFunctionalRequirement.newId = ''; uiState.nonFunctionalRequirement.createStep = 'id'; uiState.nonFunctionalRequirement.newTitle = ''; uiState.nonFunctionalRequirement.newDescription = ''; renderRequirementDetail(); }
function proceedCreateNonFunctionalRequirementFromEvent(event) { event.stopPropagation(); if (!currentRequirement || currentSection !== 'requirements' || uiState.nonFunctionalRequirement.isUpdating) return; const idEl = document.getElementById('new-non-functional-requirement-id'); const nonFunctionalId = String(idEl?.value || '').trim(); if (!nonFunctionalId) return showToast('Inserisci un ID', 'error'); if ((currentRequirement.nonFunctionalRequirements || []).some(item => item.id === nonFunctionalId)) return showToast('ID gia presente', 'error'); uiState.nonFunctionalRequirement.newId = nonFunctionalId; uiState.nonFunctionalRequirement.createStep = 'details'; renderRequirementDetail(); setTimeout(() => document.getElementById('new-non-functional-requirement-title')?.focus(), 0); }
function backCreateNonFunctionalRequirementFromEvent(event) { event.stopPropagation(); if (!currentRequirement || currentSection !== 'requirements' || uiState.nonFunctionalRequirement.isUpdating) return; const titleEl = document.getElementById('new-non-functional-requirement-title'); const descriptionEl = document.getElementById('new-non-functional-requirement-description'); uiState.nonFunctionalRequirement.newTitle = String(titleEl?.value || '').trim(); uiState.nonFunctionalRequirement.newDescription = String(descriptionEl?.value || '').trim(); uiState.nonFunctionalRequirement.createStep = 'id'; renderRequirementDetail(); setTimeout(() => { const idInput = document.getElementById('new-non-functional-requirement-id'); if (!idInput) return; idInput.focus(); const cursor = idInput.value.length; idInput.setSelectionRange(cursor, cursor); }, 0); }
async function createNonFunctionalRequirementFromEvent(event) {
  event.stopPropagation();
  if (!currentRequirement || currentSection !== 'requirements' || uiState.nonFunctionalRequirement.isUpdating) return;
  const requirementId = currentRequirement.document?.id || currentRequirement.id;
  if (!requirementId) return;
  const nonFunctionalId = String(uiState.nonFunctionalRequirement.newId || '').trim();
  if (!nonFunctionalId) return showToast('Inserisci un ID', 'error');
  if ((currentRequirement.nonFunctionalRequirements || []).some(item => item.id === nonFunctionalId)) return showToast('ID gia presente', 'error');
  const title = String(document.getElementById('new-non-functional-requirement-title')?.value || '').trim();
  const description = String(document.getElementById('new-non-functional-requirement-description')?.value || '').trim();
  if (!title || !description) return showToast('Titolo e descrizione sono obbligatori', 'error');

  uiState.nonFunctionalRequirement.isUpdating = true;
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
    syncCoreState({ currentRequirement }, 'createNonFunctionalRequirementFromEvent:refreshRequirement');
    uiState.nonFunctionalRequirement.creating = false;
    uiState.nonFunctionalRequirement.newId = '';
    uiState.nonFunctionalRequirement.createStep = 'id';
    uiState.nonFunctionalRequirement.newTitle = '';
    uiState.nonFunctionalRequirement.newDescription = '';
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
    uiState.nonFunctionalRequirement.isUpdating = false;
    renderRequirementDetail();
  }
}
function editNonFunctionalRequirementByEncodedId(event, encodedNonFunctionalId) { event.stopPropagation(); if (!currentRequirement || currentSection !== 'requirements' || uiState.nonFunctionalRequirement.isUpdating) return; uiState.nonFunctionalRequirement.editingId = decodeURIComponent(encodedNonFunctionalId); renderRequirementDetail(); }
function cancelNonFunctionalRequirementEditFromEvent(event) { event.stopPropagation(); uiState.nonFunctionalRequirement.editingId = null; renderRequirementDetail(); }
async function saveNonFunctionalRequirementByEncodedId(event, encodedNonFunctionalId) { event.stopPropagation(); const nonFunctionalId = decodeURIComponent(encodedNonFunctionalId); if (!currentRequirement || currentSection !== 'requirements' || uiState.nonFunctionalRequirement.isUpdating) return; const requirementId = currentRequirement.document?.id || currentRequirement.id; if (!requirementId) return; const title = String(document.getElementById(`non-functional-title-${encodeURIComponent(nonFunctionalId)}`)?.value || ''); const description = String(document.getElementById(`non-functional-description-${encodeURIComponent(nonFunctionalId)}`)?.value || ''); uiState.nonFunctionalRequirement.isUpdating = true; renderRequirementDetail(); try { const res = await fetch(`/api/requirements/${encodeURIComponent(requirementId)}/non-functional-requirements/${encodeURIComponent(nonFunctionalId)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, description }) }); if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Unable to update non-functional requirement'); } const [updatedRequirementRes] = await Promise.all([fetch(`/api/requirements/${encodeURIComponent(requirementId)}`, { cache: 'no-store' }), loadRequirements()]); if (!updatedRequirementRes.ok) throw new Error('Unable to refresh requirement after update'); currentRequirement = await updatedRequirementRes.json(); uiState.nonFunctionalRequirement.editingId = null; renderRequirementDetail(); showToast('Requisito non funzionale aggiornato'); } catch (error) { showToast(error.message, 'error'); } finally { uiState.nonFunctionalRequirement.isUpdating = false; renderRequirementDetail(); } }
function requestDeleteNonFunctionalRequirementByEncodedId(event, encodedNonFunctionalId) { event.stopPropagation(); if (!currentRequirement || currentSection !== 'requirements' || uiState.nonFunctionalRequirement.isUpdating) return; uiState.nonFunctionalRequirement.modalReturnFocusEl = document.activeElement instanceof HTMLElement ? document.activeElement : null; uiState.nonFunctionalRequirement.deletingId = decodeURIComponent(encodedNonFunctionalId); renderRequirementDetail(); setTimeout(() => { const cancelBtn = document.querySelector('.confirm-modal [data-modal-focus="last"]'); const dialog = document.querySelector('.confirm-modal'); if (cancelBtn instanceof HTMLElement) return cancelBtn.focus(); if (dialog instanceof HTMLElement) dialog.focus(); }, 0); }
function closeDeleteNonFunctionalRequirementModalFromEvent(event) { event.stopPropagation(); if (uiState.nonFunctionalRequirement.isUpdating) return; uiState.nonFunctionalRequirement.deletingId = null; renderRequirementDetail(); if (uiState.nonFunctionalRequirement.modalReturnFocusEl && typeof uiState.nonFunctionalRequirement.modalReturnFocusEl.focus === 'function') setTimeout(() => uiState.nonFunctionalRequirement.modalReturnFocusEl?.focus(), 0); uiState.nonFunctionalRequirement.modalReturnFocusEl = null; }
async function confirmDeleteNonFunctionalRequirementFromEvent(event) { event.stopPropagation(); const nonFunctionalId = uiState.nonFunctionalRequirement.deletingId; if (!nonFunctionalId || !currentRequirement || currentSection !== 'requirements' || uiState.nonFunctionalRequirement.isUpdating) return; uiState.nonFunctionalRequirement.deletingId = null; const requirementId = currentRequirement.document?.id || currentRequirement.id; if (!requirementId) return; uiState.nonFunctionalRequirement.isUpdating = true; renderRequirementDetail(); try { const res = await fetch(`/api/requirements/${encodeURIComponent(requirementId)}/non-functional-requirements/${encodeURIComponent(nonFunctionalId)}`, { method: 'DELETE' }); if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Unable to delete non-functional requirement'); } const [updatedRequirementRes] = await Promise.all([fetch(`/api/requirements/${encodeURIComponent(requirementId)}`, { cache: 'no-store' }), loadRequirements()]); if (!updatedRequirementRes.ok) throw new Error('Unable to refresh requirement after delete'); currentRequirement = await updatedRequirementRes.json(); if (uiState.nonFunctionalRequirement.editingId === nonFunctionalId) uiState.nonFunctionalRequirement.editingId = null; renderRequirementDetail(); showToast('Requisito non funzionale eliminato'); } catch (error) { showToast(error.message, 'error'); } finally { uiState.nonFunctionalRequirement.isUpdating = false; renderRequirementDetail(); } }
function handleDeleteNonFunctionalRequirementModalKeydown(event) { if (!uiState.nonFunctionalRequirement.deletingId) return; if (event.key === 'Escape') { event.preventDefault(); closeDeleteNonFunctionalRequirementModalFromEvent(event); return; } if (event.key !== 'Tab') return; const focusable = Array.from(document.querySelectorAll('.confirm-modal button:not([disabled]), .confirm-modal [href], .confirm-modal input:not([disabled]), .confirm-modal textarea:not([disabled]), .confirm-modal select:not([disabled]), .confirm-modal [tabindex]:not([tabindex="-1"])')); if (!focusable.length) return; const first = focusable[0]; const last = focusable[focusable.length - 1]; const active = document.activeElement; if (event.shiftKey && active === first) { event.preventDefault(); last.focus(); return; } if (!event.shiftKey && active === last) { event.preventDefault(); first.focus(); } }

function renderStoryEditForm(story) {
  const criteria = Array.isArray(story.acceptanceCriteria) ? story.acceptanceCriteria : [];
  const criteriaRows = (criteria.length ? criteria : [{ text: '' }]).map(c => `
    <div class="criterion-row">
      <input
        type="text"
        class="plan-notes-input compact-input"
        data-criterion-input="${encodeURIComponent(story.id)}"
        value="${escapeHtml(c?.text || '')}"
        ${uiState.story.isUpdating ? 'disabled' : ''}>
      <button
        type="button"
        class="open-question-btn is-secondary"
        onclick="removeStoryCriterionFromEvent(event, '${encodeURIComponent(story.id)}')"
        ${uiState.story.isUpdating ? 'disabled' : ''}>Rimuovi</button>
    </div>
  `).join('');

  return `
    <div class="plan-notes-form">
      <label class="open-question-label" for="story-title-${encodeURIComponent(story.id)}">Titolo</label>
      <input id="story-title-${encodeURIComponent(story.id)}" type="text" class="plan-notes-input compact-input" value="${escapeHtml(story.title || '')}" ${uiState.story.isUpdating ? 'disabled' : ''}>
      <label class="open-question-label" for="story-asa-${encodeURIComponent(story.id)}">As a</label>
      <input id="story-asa-${encodeURIComponent(story.id)}" type="text" class="plan-notes-input compact-input" value="${escapeHtml(story.asA || '')}" ${uiState.story.isUpdating ? 'disabled' : ''}>
      <label class="open-question-label" for="story-iwant-${encodeURIComponent(story.id)}">I want</label>
      <input id="story-iwant-${encodeURIComponent(story.id)}" type="text" class="plan-notes-input compact-input" value="${escapeHtml(story.iWant || '')}" ${uiState.story.isUpdating ? 'disabled' : ''}>
      <label class="open-question-label" for="story-sothat-${encodeURIComponent(story.id)}">So that</label>
      <input id="story-sothat-${encodeURIComponent(story.id)}" type="text" class="plan-notes-input compact-input" value="${escapeHtml(story.soThat || '')}" ${uiState.story.isUpdating ? 'disabled' : ''}>
      <div class="task-dod-title"><span>Acceptance Criteria</span></div>
      <div id="story-criteria-${encodeURIComponent(story.id)}">${criteriaRows}</div>
      <button type="button" class="open-question-btn is-secondary" onclick="addStoryCriterionFromEvent(event, '${encodeURIComponent(story.id)}')" ${uiState.story.isUpdating ? 'disabled' : ''}>+ Criterio</button>
      <div class="plan-notes-actions">
        <button type="button" class="open-question-btn" onclick="saveStoryByEncodedId(event, '${encodeURIComponent(story.id)}')" ${uiState.story.isUpdating ? 'disabled' : ''}>Salva</button>
        <button type="button" class="open-question-btn is-secondary" onclick="cancelStoryEditFromEvent(event)" ${uiState.story.isUpdating ? 'disabled' : ''}>Annulla</button>
      </div>
    </div>
  `;
}

function renderStoryCreateBox() {
  return `<div class="section-title-row compact"><div class="section-title">User stories</div><button type="button" class="icon-action-btn is-add" onclick="enableStoryCreateFromEvent(event)" ${uiState.story.isUpdating ? 'disabled' : ''}>${ADD_ICON_SVG}</button></div>${uiState.story.creating ? `<div class="task-item"><div class="task-header"><span class="task-id">Nuova user story</span></div><div class="plan-notes-form">${uiState.story.createStep === 'id' ? `<label class="open-question-label" for="new-story-id">ID</label><input id="new-story-id" type="text" class="plan-notes-input compact-input" value="${escapeHtml(uiState.story.newId)}" ${uiState.story.isUpdating ? 'disabled' : ''}><div class="plan-notes-actions"><button type="button" class="open-question-btn" onclick="proceedStoryCreateFromEvent(event)" ${uiState.story.isUpdating ? 'disabled' : ''}>Avanti</button><button type="button" class="open-question-btn is-secondary" onclick="cancelStoryCreateFromEvent(event)" ${uiState.story.isUpdating ? 'disabled' : ''}>Annulla</button></div>` : `<div class="task-header task-header-tight"><span class="task-id">ID: ${escapeHtml(uiState.story.newId)}</span></div>${renderStoryEditForm({ id: 'new', title: '', asA: '', iWant: '', soThat: '' }).replace(`saveStoryByEncodedId(event, 'new')`, 'createStoryFromEvent(event)').replace('cancelStoryEditFromEvent(event)', 'cancelStoryCreateFromEvent(event)')}</div>`}</div></div><div class="spacer-20"></div>` : ''}`;
}
function enableStoryCreateFromEvent(event) { event.stopPropagation(); uiState.story.creating = true; uiState.story.createStep = 'id'; uiState.story.newId = 'US-'; renderRequirementDetail(); setTimeout(() => { const el = document.getElementById('new-story-id'); if (!el) return; el.focus(); el.setSelectionRange(el.value.length, el.value.length); }, 0); }
function cancelStoryCreateFromEvent(event) { event.stopPropagation(); uiState.story.creating = false; uiState.story.createStep = 'id'; uiState.story.newId = ''; renderRequirementDetail(); }
function proceedStoryCreateFromEvent(event) { event.stopPropagation(); const id = String(document.getElementById('new-story-id')?.value || '').trim(); if (!id) return showToast('Inserisci un ID', 'error'); if ((currentRequirement.userStories || []).some(s => s.id === id)) return showToast('ID gia presente', 'error'); uiState.story.newId = id; uiState.story.createStep = 'details'; renderRequirementDetail(); }
function enableStoryEditByEncodedId(event, encodedStoryId) { event.stopPropagation(); uiState.story.editingId = decodeURIComponent(encodedStoryId); renderRequirementDetail(); }
function cancelStoryEditFromEvent(event) { event.stopPropagation(); uiState.story.editingId = null; renderRequirementDetail(); }
function addStoryCriterionFromEvent(event, encodedStoryId) {
  event.stopPropagation();
  const id = decodeURIComponent(encodedStoryId);
  const container = document.getElementById(`story-criteria-${encodeURIComponent(id)}`);
  if (!container) return;
  container.insertAdjacentHTML('beforeend', `<div class="criterion-row"><input type="text" class="plan-notes-input compact-input" data-criterion-input="${encodeURIComponent(id)}" value=""><button type="button" class="open-question-btn is-secondary" onclick="removeStoryCriterionFromEvent(event, '${encodeURIComponent(id)}')">Rimuovi</button></div>`);
}
function removeStoryCriterionFromEvent(event, encodedStoryId) { event.stopPropagation(); const row = event.currentTarget?.closest('div'); const container = document.getElementById(`story-criteria-${encodedStoryId}`); if (!row || !container) return; const rows = container.querySelectorAll('[data-criterion-input]'); if (rows.length <= 1) return showToast('Deve rimanere almeno un criterio', 'error'); row.remove(); }
async function saveStoryByEncodedId(event, encodedStoryId) { event.stopPropagation(); const storyId = decodeURIComponent(encodedStoryId); const requirementId = currentRequirement.document?.id || currentRequirement.id; if (!requirementId) return; const payload = { title: String(document.getElementById(`story-title-${encodeURIComponent(storyId)}`)?.value || ''), asA: String(document.getElementById(`story-asa-${encodeURIComponent(storyId)}`)?.value || ''), iWant: String(document.getElementById(`story-iwant-${encodeURIComponent(storyId)}`)?.value || ''), soThat: String(document.getElementById(`story-sothat-${encodeURIComponent(storyId)}`)?.value || '') }; const criteria = Array.from(document.querySelectorAll(`#story-criteria-${encodeURIComponent(storyId)} [data-criterion-input]`)).map(el => String(el.value || '').trim()).filter(Boolean); if (!criteria.length) return showToast('Inserisci almeno un acceptance criterion', 'error'); payload.acceptanceCriteria = criteria; uiState.story.isUpdating = true; renderRequirementDetail(); try { const res = await fetch(`/api/requirements/${encodeURIComponent(requirementId)}/stories/${encodeURIComponent(storyId)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Unable to update story'); } const updated = await fetch(`/api/requirements/${encodeURIComponent(requirementId)}`, { cache: 'no-store' }); await loadRequirements(); currentRequirement = await updated.json(); uiState.story.editingId = null; showToast('User story aggiornata'); } catch (e) { showToast(e.message, 'error'); } finally { uiState.story.isUpdating = false; renderRequirementDetail(); } }
async function createStoryFromEvent(event) {
  event.stopPropagation();
  const requirementId = currentRequirement.document?.id || currentRequirement.id;
  if (!requirementId) return;
  const createdStoryId = String(uiState.story.newId || '').trim();
  const payload = {
    storyId: uiState.story.newId,
    title: String(document.getElementById('story-title-new')?.value || ''),
    asA: String(document.getElementById('story-asa-new')?.value || ''),
    iWant: String(document.getElementById('story-iwant-new')?.value || ''),
    soThat: String(document.getElementById('story-sothat-new')?.value || '')
  };
  const criteria = Array.from(document.querySelectorAll('#story-criteria-new [data-criterion-input]')).map(el => String(el.value || '').trim()).filter(Boolean);
  if (!criteria.length) return showToast('Inserisci almeno un acceptance criterion', 'error');
  payload.acceptanceCriteria = criteria;
  uiState.story.isUpdating = true;
  renderRequirementDetail();
  try {
    const res = await fetch(`/api/requirements/${encodeURIComponent(requirementId)}/stories`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Unable to create story'); }
    const updated = await fetch(`/api/requirements/${encodeURIComponent(requirementId)}`, { cache: 'no-store' });
    await loadRequirements();
    currentRequirement = await updated.json();
    uiState.story.creating = false;
    uiState.story.createStep = 'id';
    uiState.story.newId = '';
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
    uiState.story.isUpdating = false;
    renderRequirementDetail();
  }
}
function requestDeleteStoryByEncodedId(event, encodedStoryId) { event.stopPropagation(); uiState.story.deletingId = decodeURIComponent(encodedStoryId); renderRequirementDetail(); }
function renderDeleteStoryModal() { if (!uiState.story.deletingId) return ''; return `<div class="confirm-modal-overlay" onclick="closeDeleteStoryModalFromEvent(event)"><div class="confirm-modal" role="dialog" aria-modal="true" tabindex="-1" onclick="event.stopPropagation()"><button type="button" class="confirm-modal-close" onclick="closeDeleteStoryModalFromEvent(event)">×</button><div class="confirm-modal-title">Conferma eliminazione</div><div class="confirm-modal-text">Vuoi eliminare la user story <strong>${escapeHtml(uiState.story.deletingId)}</strong>?</div><div class="plan-notes-actions confirm-modal-actions"><button type="button" class="open-question-btn is-danger" onclick="confirmDeleteStoryFromEvent(event)">Elimina</button><button type="button" class="open-question-btn is-secondary" onclick="closeDeleteStoryModalFromEvent(event)">Annulla</button></div></div></div>`; }
function closeDeleteStoryModalFromEvent(event) { event.stopPropagation(); uiState.story.deletingId = null; renderRequirementDetail(); }
async function confirmDeleteStoryFromEvent(event) { event.stopPropagation(); const storyId = uiState.story.deletingId; if (!storyId) return; const requirementId = currentRequirement.document?.id || currentRequirement.id; if (!requirementId) return; uiState.story.deletingId = null; uiState.story.isUpdating = true; renderRequirementDetail(); try { const res = await fetch(`/api/requirements/${encodeURIComponent(requirementId)}/stories/${encodeURIComponent(storyId)}`, { method: 'DELETE' }); if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Unable to delete story'); } const updated = await fetch(`/api/requirements/${encodeURIComponent(requirementId)}`, { cache: 'no-store' }); await loadRequirements(); currentRequirement = await updated.json(); showToast('User story eliminata'); } catch (e) { showToast(e.message, 'error'); } finally { uiState.story.isUpdating = false; renderRequirementDetail(); } }

function configurePlanTabs(activeTab = 'overview') {
  setTabVisibility('overview', true);
  setTabVisibility('stories', true);
  setTabVisibility('tasks', true);
  setTabVisibility('decisions', true);
  setTabVisibility('functional', false);
  setTabVisibility('architectural-decisions', false);
  setTabVisibility('non-functional', false);
  setTabVisibility('user-stories', false);
  setTabVisibility('open-questions', false);
  const requestedTab = activeTab || 'overview';
  const requestedTabEl = document.querySelector(`.tab[data-tab="${requestedTab}"]`);
  activateTabByName(requestedTabEl && !requestedTabEl.classList.contains('hidden') ? requestedTab : 'overview');
}

function configureRequirementTabs(hasArchitecturalDecisions, activeTab = 'overview') {
  setTabVisibility('overview', true);
  setTabVisibility('stories', false);
  setTabVisibility('tasks', false);
  setTabVisibility('decisions', false);
  setTabVisibility('functional', true);
  setTabVisibility('architectural-decisions', hasArchitecturalDecisions);
  setTabVisibility('non-functional', true);
  setTabVisibility('user-stories', true);
  setTabVisibility('open-questions', true);
  const requestedTab = activeTab || 'overview';
  const requestedTabEl = document.querySelector(`.tab[data-tab="${requestedTab}"]`);
  activateTabByName(requestedTabEl && !requestedTabEl.classList.contains('hidden') ? requestedTab : 'overview');
}

function showDetail() {
  document.getElementById('welcome').style.display = 'none';
  document.getElementById('detailView').classList.add('show');
}

function setSection(section) {
  if (!hasWorkspaceConfigured || !currentWorkspace) {
    currentSection = section || 'plans';
    syncCoreState({ currentSection }, 'setSection:noWorkspace');
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
  syncCoreState({ currentSection }, 'setSection');
  const welcomeIcon = document.getElementById('welcomeIcon');
  document.querySelectorAll('.section-switch-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.section === section);
  });

  currentPlan = null;
  currentRequirement = null;
  syncCoreState({ currentPlan, currentRequirement }, 'setSection:resetSelection');
  uiState.taskDod.editingId = null;
  uiState.taskDod.focusTarget = null;
  uiState.planNotes.isEditing = false;
  uiState.planNotes.isUpdating = false;
  uiState.planObjective.isEditing = false;
  uiState.planObjective.isUpdating = false;
  uiState.planPhases.isEditing = false;
  uiState.planPhases.isUpdating = false;
  uiState.planPhases.items = [];
  uiState.taskNotes.editingId = null;
  uiState.taskNotes.isUpdating = false;
  uiState.taskImplementationNotes.editingId = null;
  uiState.taskImplementationNotes.isUpdating = false;
  uiState.taskNotes.openIds = new Set();
  uiState.taskField.editing = null;
  uiState.taskField.isUpdating = false;
  uiState.requirementOverview.isEditing = false;
  uiState.requirementOverview.isUpdating = false;
  uiState.requirementCurrentState.isEditing = false;
  uiState.requirementCurrentState.isUpdating = false;
  uiState.requirementNotes.isEditing = false;
  uiState.requirementNotes.isUpdating = false;
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
    syncCoreState({ currentPlan }, 'updateTaskStatus:refreshPlan');
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
  if (!currentPlan || currentSection !== 'plans' || uiState.taskDod.isUpdating) return;
  if (uiState.taskDod.editingId === taskId) return;
  uiState.taskDod.editingId = taskId;
  renderPlanDetail();
}

function disableTaskDodEdit() {
  if (!currentPlan || currentSection !== 'plans' || uiState.taskDod.isUpdating) return;
  if (!uiState.taskDod.editingId) return;
  uiState.taskDod.editingId = null;
  uiState.taskDod.focusTarget = null;
  renderPlanDetail();
}

function disableTaskDodEditFromEvent(event) {
  event.stopPropagation();
  disableTaskDodEdit();
}

function enablePlanNotesEdit() {
  if (!currentPlan || currentSection !== 'plans' || uiState.planNotes.isUpdating) return;
  if (uiState.planNotes.isEditing) return;
  uiState.planNotes.isEditing = true;
  renderPlanDetail();
}

function enablePlanObjectiveEdit() {
  if (!currentPlan || currentSection !== 'plans' || uiState.planObjective.isUpdating) return;
  if (uiState.planObjective.isEditing) return;
  uiState.planObjective.isEditing = true;
  renderPlanDetail();
}

function enablePlanObjectiveEditFromEvent(event) {
  event.stopPropagation();
  enablePlanObjectiveEdit();
}

function cancelPlanObjectiveEdit() {
  if (!currentPlan || currentSection !== 'plans' || uiState.planObjective.isUpdating) return;
  if (!uiState.planObjective.isEditing) return;
  uiState.planObjective.isEditing = false;
  renderPlanDetail();
}

function cancelPlanObjectiveEditFromEvent(event) {
  event.stopPropagation();
  cancelPlanObjectiveEdit();
}

async function savePlanObjective() {
  if (!currentPlan || currentSection !== 'plans' || !uiState.planObjective.isEditing || uiState.planObjective.isUpdating) return;
  const objectiveEl = document.getElementById('plan-objective-input');
  if (!objectiveEl) return;

  const objective = String(objectiveEl.value || '');
  const previousObjective = currentPlan.objective || '';

  currentPlan.objective = objective;
  uiState.planObjective.isUpdating = true;
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
    syncCoreState({ currentPlan }, 'savePlanObjectiveFromEvent:refreshPlan');
    uiState.planObjective.isEditing = false;
    document.querySelector(`.plan-item[data-id="${CSS.escape(currentPlan.id)}"]`)?.classList.add('active');
    renderPlanDetail();
    showToast('Objective piano salvato');
  } catch (error) {
    currentPlan.objective = previousObjective;
    renderPlanDetail();
    showToast(error.message, 'error');
  } finally {
    uiState.planObjective.isUpdating = false;
    renderPlanDetail();
  }
}

function savePlanObjectiveFromEvent(event) {
  event.stopPropagation();
  savePlanObjective();
}

function enablePlanPhasesEdit() {
  if (!currentPlan || currentSection !== 'plans' || uiState.planPhases.isUpdating) return;
  if (uiState.planPhases.isEditing) return;
  uiState.planPhases.items = buildPhasesForEditor(currentPlan);
  if (!uiState.planPhases.items.length) {
    uiState.planPhases.items = [{ title: '', tasks: [] }];
  }
  uiState.planPhases.isEditing = true;
  renderPlanDetail();
}

function addPlanPhase() {
  if (!currentPlan || currentSection !== 'plans' || !uiState.planPhases.isEditing || uiState.planPhases.isUpdating) return;
  uiState.planPhases.items = [...uiState.planPhases.items, { title: '', tasks: [] }];
  renderPlanDetail();
}

function addPlanPhaseFromEvent(event) {
  event.stopPropagation();
  addPlanPhase();
}

function removePlanPhase(index) {
  if (!currentPlan || currentSection !== 'plans' || !uiState.planPhases.isEditing || uiState.planPhases.isUpdating) return;
  uiState.planPhases.items = uiState.planPhases.items.filter((_, currentIndex) => currentIndex !== index);
  if (!uiState.planPhases.items.length) uiState.planPhases.items = [{ title: '', tasks: [] }];
  renderPlanDetail();
}

function removePlanPhaseFromEvent(event, index) {
  event.stopPropagation();
  removePlanPhase(index);
}

function updatePlanPhaseTitle(index, value) {
  if (!currentPlan || currentSection !== 'plans' || !uiState.planPhases.isEditing || uiState.planPhases.isUpdating) return;
  if (!uiState.planPhases.items[index]) return;
  uiState.planPhases.items[index].title = String(value || '');
}

function updatePlanPhaseTitleFromEvent(event, index) {
  event.stopPropagation();
  updatePlanPhaseTitle(index, event.target.value);
}

function togglePlanPhaseTask(index, taskId) {
  if (!currentPlan || currentSection !== 'plans' || !uiState.planPhases.isEditing || uiState.planPhases.isUpdating) return;
  const phase = uiState.planPhases.items[index];
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
  if (!currentPlan || currentSection !== 'plans' || uiState.planPhases.isUpdating) return;
  if (!uiState.planPhases.isEditing) return;
  uiState.planPhases.isEditing = false;
  uiState.planPhases.items = [];
  renderPlanDetail();
}

function cancelPlanPhasesEditFromEvent(event) {
  event.stopPropagation();
  cancelPlanPhasesEdit();
}

async function savePlanPhases() {
  if (!currentPlan || currentSection !== 'plans' || !uiState.planPhases.isEditing || uiState.planPhases.isUpdating) return;
  const previousPhases = Array.isArray(currentPlan.phases) ? currentPlan.phases : [];
  const phases = uiState.planPhases.items
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
  uiState.planPhases.isUpdating = true;
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
    syncCoreState({ currentPlan }, 'savePlanPhasesFromEvent:refreshPlan');
    uiState.planPhases.isEditing = false;
    uiState.planPhases.items = [];
    document.querySelector(`.plan-item[data-id="${CSS.escape(currentPlan.id)}"]`)?.classList.add('active');
    renderPlanDetail();
    showToast('Phases piano salvate');
  } catch (error) {
    currentPlan.phases = previousPhases;
    renderPlanDetail();
    showToast(error.message, 'error');
  } finally {
    uiState.planPhases.isUpdating = false;
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
  if (!currentPlan || currentSection !== 'plans' || uiState.planNotes.isUpdating) return;
  if (!uiState.planNotes.isEditing) return;
  uiState.planNotes.isEditing = false;
  renderPlanDetail();
}

function cancelPlanNotesEditFromEvent(event) {
  event.stopPropagation();
  cancelPlanNotesEdit();
}

async function savePlanNotes() {
  if (!currentPlan || currentSection !== 'plans' || !uiState.planNotes.isEditing || uiState.planNotes.isUpdating) return;
  const notesEl = document.getElementById('plan-notes-input');
  if (!notesEl) return;

  const notes = String(notesEl.value || '');
  const previousNotes = currentPlan.notes || '';

  currentPlan.notes = notes;
  uiState.planNotes.isUpdating = true;
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
    syncCoreState({ currentPlan }, 'savePlanNotesFromEvent:refreshPlan');
    uiState.planNotes.isEditing = false;
    document.querySelector(`.plan-item[data-id="${CSS.escape(currentPlan.id)}"]`)?.classList.add('active');
    renderPlanDetail();
    showToast('Note piano salvate');
  } catch (error) {
    currentPlan.notes = previousNotes;
    renderPlanDetail();
    showToast(error.message, 'error');
  } finally {
    uiState.planNotes.isUpdating = false;
    renderPlanDetail();
  }
}

function savePlanNotesFromEvent(event) {
  event.stopPropagation();
  savePlanNotes();
}

function enableTaskFieldEdit(taskId, field) {
  if (!currentPlan || currentSection !== 'plans' || uiState.taskField.isUpdating) return;
  if (!taskId || !field) return;
  if (field === 'phase' && !(Array.isArray(currentPlan.phases) && currentPlan.phases.some(phase => String(phase?.title || '').trim()))) {
    showToast('Nessuna phase disponibile nel piano', 'error');
    return;
  }
  uiState.taskField.editing = { taskId, field };
  renderPlanDetail();
}

function enableTaskFieldEditByEncodedId(event, encodedTaskId, field) {
  event.stopPropagation();
  enableTaskFieldEdit(decodeURIComponent(encodedTaskId), field);
}

function cancelTaskFieldEdit() {
  if (!uiState.taskField.editing || uiState.taskField.isUpdating) return;
  uiState.taskField.editing = null;
  renderPlanDetail();
}

function cancelTaskFieldEditFromEvent(event) {
  event.stopPropagation();
  cancelTaskFieldEdit();
}

async function saveTaskField(planId, taskId, field) {
  if (!currentPlan || currentSection !== 'plans' || uiState.taskField.isUpdating) return;
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

    uiState.taskField.isUpdating = true;
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
      syncCoreState({ currentPlan }, 'saveTaskFieldByEncodedIds:refreshPlan');
      uiState.taskField.editing = null;
      document.querySelector(`.plan-item[data-id="${CSS.escape(planId)}"]`)?.classList.add('active');
      renderPlanDetail();
      showToast('Campi task salvati');
    } catch (error) {
      task.title = previousTitle;
      task.whatToDo = previousWhatToDo;
      renderPlanDetail();
      showToast(error.message, 'error');
    } finally {
      uiState.taskField.isUpdating = false;
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

  uiState.taskField.isUpdating = true;
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
    syncCoreState({ currentPlan }, 'saveTaskFieldByEncodedIds:metaRefreshPlan');
    uiState.taskField.editing = null;
    document.querySelector(`.plan-item[data-id="${CSS.escape(planId)}"]`)?.classList.add('active');
    renderPlanDetail();
    showToast('Campo task salvato');
  } catch (error) {
    task[field] = previousValue;
    renderPlanDetail();
    showToast(error.message, 'error');
  } finally {
    uiState.taskField.isUpdating = false;
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
  if (!currentPlan || currentSection !== 'plans' || uiState.taskNotes.isUpdating) return;
  if (!taskId || uiState.taskNotes.editingId === taskId) return;
  uiState.taskNotes.editingId = taskId;
  uiState.taskNotes.openIds.add(taskId);
  renderPlanDetail();
}

function enableTaskImplementationNotesEdit(taskId) {
  if (!currentPlan || currentSection !== 'plans' || uiState.taskImplementationNotes.isUpdating) return;
  if (!taskId || uiState.taskImplementationNotes.editingId === taskId) return;
  uiState.taskImplementationNotes.editingId = taskId;
  uiState.taskNotes.openIds.add(taskId);
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
  if (!currentPlan || currentSection !== 'plans' || uiState.taskNotes.isUpdating) return;
  if (!uiState.taskNotes.editingId) return;
  uiState.taskNotes.editingId = null;
  renderPlanDetail();
}

function cancelTaskNotesEditFromEvent(event) {
  event.stopPropagation();
  cancelTaskNotesEdit();
}

function cancelTaskImplementationNotesEdit() {
  if (!currentPlan || currentSection !== 'plans' || uiState.taskImplementationNotes.isUpdating) return;
  if (!uiState.taskImplementationNotes.editingId) return;
  uiState.taskImplementationNotes.editingId = null;
  renderPlanDetail();
}

function cancelTaskImplementationNotesEditFromEvent(event) {
  event.stopPropagation();
  cancelTaskImplementationNotesEdit();
}

async function saveTaskNotes(planId, taskId) {
  if (!currentPlan || currentSection !== 'plans' || uiState.taskNotes.isUpdating) return;
  const task = (currentPlan.tasks || []).find(item => item.id === taskId);
  if (!task) return;

  const notesEl = document.getElementById(`task-notes-${taskId}`);
  if (!notesEl) return;

  const notes = String(notesEl.value || '');
  const previousNotes = task.notes || '';

  task.notes = notes;
  uiState.taskNotes.isUpdating = true;
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
    syncCoreState({ currentPlan }, 'saveTaskNotesByEncodedIds:refreshPlan');
    uiState.taskNotes.openIds.add(taskId);
    uiState.taskNotes.editingId = null;
    document.querySelector(`.plan-item[data-id="${CSS.escape(planId)}"]`)?.classList.add('active');
    renderPlanDetail();
    showToast('Note task salvate');
  } catch (error) {
    task.notes = previousNotes;
    renderPlanDetail();
    showToast(error.message, 'error');
  } finally {
    uiState.taskNotes.isUpdating = false;
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
  if (!currentPlan || currentSection !== 'plans' || uiState.taskImplementationNotes.isUpdating) return;
  const task = (currentPlan.tasks || []).find(item => item.id === taskId);
  if (!task) return;

  const implementationNotesEl = document.getElementById(`task-implementation-notes-${taskId}`);
  if (!implementationNotesEl) return;

  const implementationNotes = String(implementationNotesEl.value || '');
  const previousImplementationNotes = task.implementationNotes || '';

  task.implementationNotes = implementationNotes;
  uiState.taskImplementationNotes.isUpdating = true;
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
    syncCoreState({ currentPlan }, 'saveTaskImplementationNotesByEncodedIds:refreshPlan');
    uiState.taskNotes.openIds.add(taskId);
    uiState.taskImplementationNotes.editingId = null;
    document.querySelector(`.plan-item[data-id="${CSS.escape(planId)}"]`)?.classList.add('active');
    renderPlanDetail();
    showToast('Implementation notes task salvate');
  } catch (error) {
    task.implementationNotes = previousImplementationNotes;
    renderPlanDetail();
    showToast(error.message, 'error');
  } finally {
    uiState.taskImplementationNotes.isUpdating = false;
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
    uiState.taskNotes.openIds.add(taskId);
  } else {
    uiState.taskNotes.openIds.delete(taskId);
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
  if (!currentPlan || currentSection !== 'plans' || uiState.taskDod.isUpdating) return;

  const task = (currentPlan.tasks || []).find(item => item.id === taskId);
  const criterion = task?.definitionOfDone?.[criterionIndex];
  if (!task || !criterion) return;

  const previousCompleted = Boolean(criterion.completed);
  uiState.taskDod.focusTarget = { taskId, criterionIndex };
  criterion.completed = completed;
  uiState.taskDod.isUpdating = true;
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
    syncCoreState({ currentPlan }, 'toggleTaskDodItemByEncodedIds:refreshPlan');
    document.querySelector(`.plan-item[data-id="${CSS.escape(planId)}"]`)?.classList.add('active');
    renderPlanDetail();
    showToast('Definition of Done aggiornata');
  } catch (error) {
    criterion.completed = previousCompleted;
    renderPlanDetail();
    showToast(error.message, 'error');
  } finally {
    uiState.taskDod.isUpdating = false;
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
  if (uiState.acceptance.editingStoryId === storyId) return;
  uiState.acceptance.editingStoryId = storyId;
  renderRequirementDetail();
}

function disableAcceptanceEdit() {
  if (!currentRequirement || currentSection !== 'requirements') return;
  if (!uiState.acceptance.editingStoryId) return;
  uiState.acceptance.editingStoryId = null;
  uiState.acceptance.focusTarget = null;
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
  if (!currentRequirement || currentSection !== 'requirements' || uiState.acceptance.isUpdating) return;

  const story = (currentRequirement.userStories || []).find(item => item.id === storyId);
  const criterion = story?.acceptanceCriteria?.[criterionIndex];
  if (!story || !criterion) return;

  const previousChecked = Boolean(criterion.checked);
  uiState.acceptance.focusTarget = { storyId, criterionIndex };
  criterion.checked = checked;
  uiState.acceptance.isUpdating = true;
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
    syncCoreState({ currentRequirement }, 'toggleAcceptanceCriterionByEncodedIds:refreshRequirement');
    document.querySelector(`.plan-item[data-id="${CSS.escape(requirementId)}"]`)?.classList.add('active');
    renderRequirementDetail();
    showToast('Acceptance criterion salvato');
  } catch (error) {
    criterion.checked = previousChecked;
    renderRequirementDetail();
    showToast(error.message, 'error');
  } finally {
    uiState.acceptance.isUpdating = false;
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
  if (!currentRequirement || currentSection !== 'requirements' || uiState.requirementOverview.isUpdating) return;
  if (uiState.requirementOverview.isEditing) return;
  uiState.requirementOverview.isEditing = true;
  renderRequirementDetail();
}

function enableRequirementOverviewEditFromEvent(event) {
  event.stopPropagation();
  enableRequirementOverviewEdit();
}

function cancelRequirementOverviewEdit() {
  if (!currentRequirement || currentSection !== 'requirements' || uiState.requirementOverview.isUpdating) return;
  if (!uiState.requirementOverview.isEditing) return;
  uiState.requirementOverview.isEditing = false;
  renderRequirementDetail();
}

function cancelRequirementOverviewEditFromEvent(event) {
  event.stopPropagation();
  cancelRequirementOverviewEdit();
}

async function saveRequirementOverview() {
  if (!currentRequirement || currentSection !== 'requirements' || !uiState.requirementOverview.isEditing || uiState.requirementOverview.isUpdating) return;
  const overviewEl = document.getElementById('requirement-overview-input');
  if (!overviewEl) return;

  const overview = String(overviewEl.value || '');
  const previousOverview = typeof currentRequirement.overview === 'string' ? currentRequirement.overview : '';

  currentRequirement.overview = overview;
  uiState.requirementOverview.isUpdating = true;
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
    syncCoreState({ currentRequirement }, 'saveRequirementOverviewFromEvent:refreshRequirement');
    uiState.requirementOverview.isEditing = false;
    document.querySelector(`.plan-item[data-id="${CSS.escape(requirementId)}"]`)?.classList.add('active');
    renderRequirementDetail();
    showToast('Overview requirement salvata');
  } catch (error) {
    currentRequirement.overview = previousOverview;
    renderRequirementDetail();
    showToast(error.message, 'error');
  } finally {
    uiState.requirementOverview.isUpdating = false;
    renderRequirementDetail();
  }
}

function saveRequirementOverviewFromEvent(event) {
  event.stopPropagation();
  saveRequirementOverview();
}

function enableRequirementCurrentStateEdit() {
  if (!currentRequirement || currentSection !== 'requirements' || uiState.requirementCurrentState.isUpdating) return;
  if (uiState.requirementCurrentState.isEditing) return;
  uiState.requirementCurrentState.isEditing = true;
  renderRequirementDetail();
}

function enableRequirementCurrentStateEditFromEvent(event) {
  event.stopPropagation();
  enableRequirementCurrentStateEdit();
}

function cancelRequirementCurrentStateEdit() {
  if (!currentRequirement || currentSection !== 'requirements' || uiState.requirementCurrentState.isUpdating) return;
  if (!uiState.requirementCurrentState.isEditing) return;
  uiState.requirementCurrentState.isEditing = false;
  renderRequirementDetail();
}

function cancelRequirementCurrentStateEditFromEvent(event) {
  event.stopPropagation();
  cancelRequirementCurrentStateEdit();
}

async function saveRequirementCurrentState() {
  if (!currentRequirement || currentSection !== 'requirements' || !uiState.requirementCurrentState.isEditing || uiState.requirementCurrentState.isUpdating) return;
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
  uiState.requirementCurrentState.isUpdating = true;
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
    syncCoreState({ currentRequirement }, 'saveRequirementCurrentStateFromEvent:refreshRequirement');
    uiState.requirementCurrentState.isEditing = false;
    renderRequirementDetail();
    showToast('Current state requirement salvato');
  } catch (error) {
    currentRequirement.currentState = previousCurrentState;
    renderRequirementDetail();
    showToast(error.message, 'error');
  } finally {
    uiState.requirementCurrentState.isUpdating = false;
    renderRequirementDetail();
  }
}

function addRequirementCurrentStateRow() {
  if (!currentRequirement || currentSection !== 'requirements' || !uiState.requirementCurrentState.isEditing || uiState.requirementCurrentState.isUpdating) return;
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
  if (!currentRequirement || currentSection !== 'requirements' || !uiState.requirementCurrentState.isEditing || uiState.requirementCurrentState.isUpdating) return;
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
  if (!currentRequirement || currentSection !== 'requirements' || uiState.requirementNotes.isUpdating) return;
  if (uiState.requirementNotes.isEditing) return;
  uiState.requirementNotes.isEditing = true;
  renderRequirementDetail();
}

function enableRequirementNotesEditFromEvent(event) {
  event.stopPropagation();
  enableRequirementNotesEdit();
}

function cancelRequirementNotesEdit() {
  if (!currentRequirement || currentSection !== 'requirements' || uiState.requirementNotes.isUpdating) return;
  if (!uiState.requirementNotes.isEditing) return;
  uiState.requirementNotes.isEditing = false;
  renderRequirementDetail();
}

function cancelRequirementNotesEditFromEvent(event) {
  event.stopPropagation();
  cancelRequirementNotesEdit();
}

async function saveRequirementNotes() {
  if (!currentRequirement || currentSection !== 'requirements' || !uiState.requirementNotes.isEditing || uiState.requirementNotes.isUpdating) return;
  const notesEl = document.getElementById('requirement-notes-input');
  if (!notesEl) return;
  const value = String(notesEl.value || '').trim();
  const parsed = value.length ? value : null;

  const previousNotes = typeof currentRequirement.notes === 'string' ? currentRequirement.notes : null;
  currentRequirement.notes = parsed;
  uiState.requirementNotes.isUpdating = true;
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
    syncCoreState({ currentRequirement }, 'saveRequirementNotesFromEvent:refreshRequirement');
    uiState.requirementNotes.isEditing = false;
    renderRequirementDetail();
    showToast('Notes requirement salvate');
  } catch (error) {
    currentRequirement.notes = previousNotes;
    renderRequirementDetail();
    showToast(error.message, 'error');
  } finally {
    uiState.requirementNotes.isUpdating = false;
    renderRequirementDetail();
  }
}

function saveRequirementNotesFromEvent(event) {
  event.stopPropagation();
  saveRequirementNotes();
}

function enableOpenQuestionEdit(questionId) {
  if (!currentRequirement || currentSection !== 'requirements' || uiState.openQuestion.isUpdating) return;
  if (!questionId) return;
  if (uiState.openQuestion.editingId === questionId) return;
  uiState.openQuestion.editingId = questionId;
  renderRequirementDetail();
}

function enableOpenQuestionEditByEncodedId(encodedQuestionId) {
  enableOpenQuestionEdit(decodeURIComponent(encodedQuestionId));
}

function cancelOpenQuestionEdit() {
  if (!currentRequirement || currentSection !== 'requirements' || uiState.openQuestion.isUpdating) return;
  if (!uiState.openQuestion.editingId) return;
  uiState.openQuestion.editingId = null;
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
  if (!currentRequirement || currentSection !== 'requirements' || uiState.openQuestion.isUpdating) return;
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
  uiState.openQuestion.isUpdating = true;
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
    syncCoreState({ currentRequirement }, 'saveOpenQuestionByEncodedIds:refreshRequirement');
    uiState.openQuestion.editingId = null;
    document.querySelector(`.plan-item[data-id="${CSS.escape(requirementId)}"]`)?.classList.add('active');
    renderRequirementDetail();
    showToast('Open question salvata');
  } catch (error) {
    question.answer = previousAnswer;
    question.status = previousStatus;
    renderRequirementDetail();
    showToast(error.message, 'error');
  } finally {
    uiState.openQuestion.isUpdating = false;
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
  if (!currentRequirement || currentSection !== 'requirements' || uiState.openQuestion.isUpdating) return;
  uiState.openQuestion.creating = true;
  uiState.openQuestion.createStep = 'id';
  uiState.openQuestion.newId = 'OQ-';
  uiState.openQuestion.newQuestion = '';
  uiState.openQuestion.newAnswer = 'Non definito nel documento; richiesta conferma.';
  uiState.openQuestion.newStatus = 'open';
  uiState.openQuestion.editingId = null;
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
  if (!uiState.openQuestion.creating || uiState.openQuestion.isUpdating) return;
  const input = document.getElementById('new-open-question-id');
  const id = String(input?.value || '').trim();
  if (!id) return showToast('ID open question obbligatorio', 'error');
  if ((currentRequirement?.openQuestions || []).some(item => String(item?.id || '') === id)) return showToast('ID open question gia presente', 'error');
  uiState.openQuestion.newId = id;
  uiState.openQuestion.createStep = 'details';
  renderRequirementDetail();
}

function backCreateOpenQuestionFromEvent(event) {
  event.stopPropagation();
  if (!uiState.openQuestion.creating || uiState.openQuestion.isUpdating) return;
  const questionEl = document.getElementById('new-open-question-question');
  uiState.openQuestion.newQuestion = String(questionEl?.value || '').trim();
  uiState.openQuestion.newAnswer = 'Non definito nel documento; richiesta conferma.';
  uiState.openQuestion.newStatus = 'open';
  uiState.openQuestion.createStep = 'id';
  renderRequirementDetail();
}

function cancelCreateOpenQuestionFromEvent(event) {
  event.stopPropagation();
  if (uiState.openQuestion.isUpdating) return;
  uiState.openQuestion.creating = false;
  uiState.openQuestion.createStep = 'id';
  uiState.openQuestion.newId = '';
  uiState.openQuestion.newQuestion = '';
  uiState.openQuestion.newAnswer = 'Non definito nel documento; richiesta conferma.';
  uiState.openQuestion.newStatus = 'open';
  renderRequirementDetail();
}

async function createOpenQuestionFromEvent(event) {
  event.stopPropagation();
  if (!currentRequirement || currentSection !== 'requirements' || uiState.openQuestion.isUpdating) return;
  const requirementId = currentRequirement.document?.id;
  if (!requirementId) return;
  const createdOpenQuestionId = String(uiState.openQuestion.newId || '').trim();
  const question = String(document.getElementById('new-open-question-question')?.value || '').trim();
  const answer = 'Non definito nel documento; richiesta conferma.';
  const status = 'open';
  if (!uiState.openQuestion.newId) return showToast('ID open question obbligatorio', 'error');
  if ((currentRequirement?.openQuestions || []).some(item => String(item?.id || '') === uiState.openQuestion.newId)) return showToast('ID open question gia presente', 'error');
  if (!question) return showToast('Question obbligatoria', 'error');
  uiState.openQuestion.isUpdating = true;
  renderRequirementDetail();
  try {
    const res = await fetch(`/api/requirements/${encodeURIComponent(requirementId)}/open-questions`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: uiState.openQuestion.newId, question, answer, status })
    });
    if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Unable to create open question'); }
    const [updatedRequirementRes] = await Promise.all([fetch(`/api/requirements/${encodeURIComponent(requirementId)}`, { cache: 'no-store' }), loadRequirements()]);
    if (!updatedRequirementRes.ok) throw new Error('Unable to refresh requirement after open question create');
    currentRequirement = await updatedRequirementRes.json();
    syncCoreState({ currentRequirement }, 'createOpenQuestionFromEvent:refreshRequirement');
    uiState.openQuestion.creating = false;
    uiState.openQuestion.createStep = 'id';
    uiState.openQuestion.newId = '';
    uiState.openQuestion.newQuestion = '';
    uiState.openQuestion.newAnswer = 'Non definito nel documento; richiesta conferma.';
    uiState.openQuestion.newStatus = 'open';
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
    uiState.openQuestion.isUpdating = false;
    renderRequirementDetail();
  }
}

function requestDeleteOpenQuestionByEncodedIds(event, encodedRequirementId, encodedQuestionId) {
  event.stopPropagation();
  if (!currentRequirement || currentSection !== 'requirements' || uiState.openQuestion.isUpdating) return;
  const requirementId = decodeURIComponent(encodedRequirementId);
  const questionId = decodeURIComponent(encodedQuestionId);
  if (!requirementId || !questionId) return;
  uiState.openQuestion.deletingId = questionId;
  uiState.functionalRequirement.modalReturnFocusEl = event.currentTarget || null;
  renderRequirementDetail();
}

function closeDeleteOpenQuestionModalFromEvent(event) {
  event.stopPropagation();
  uiState.openQuestion.deletingId = null;
  renderRequirementDetail();
  if (uiState.functionalRequirement.modalReturnFocusEl && typeof uiState.functionalRequirement.modalReturnFocusEl.focus === 'function') uiState.functionalRequirement.modalReturnFocusEl.focus();
}

async function confirmDeleteOpenQuestionFromEvent(event) {
  event.stopPropagation();
  if (!currentRequirement || !uiState.openQuestion.deletingId || uiState.openQuestion.isUpdating) return;
  const requirementId = currentRequirement.document?.id;
  const questionId = uiState.openQuestion.deletingId;
  if (!requirementId) return;
  uiState.openQuestion.isUpdating = true;
  renderRequirementDetail();
  try {
    const res = await fetch(`/api/requirements/${encodeURIComponent(requirementId)}/open-questions/${encodeURIComponent(questionId)}`, { method: 'DELETE' });
    if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Unable to delete open question'); }
    const [updatedRequirementRes] = await Promise.all([fetch(`/api/requirements/${encodeURIComponent(requirementId)}`, { cache: 'no-store' }), loadRequirements()]);
    if (!updatedRequirementRes.ok) throw new Error('Unable to refresh requirement after open question delete');
    currentRequirement = await updatedRequirementRes.json();
    syncCoreState({ currentRequirement }, 'confirmDeleteOpenQuestionFromEvent:refreshRequirement');
    uiState.openQuestion.deletingId = null;
    uiState.openQuestion.editingId = null;
    renderRequirementDetail();
    showToast('Open question eliminata');
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    uiState.openQuestion.isUpdating = false;
    renderRequirementDetail();
  }
}

function renderDeleteOpenQuestionModal() {
  if (!uiState.openQuestion.deletingId) return '';
  return `<div class="confirm-modal-overlay" onclick="closeDeleteOpenQuestionModalFromEvent(event)"><div class="confirm-modal" role="dialog" aria-modal="true" tabindex="-1" onclick="event.stopPropagation()"><button type="button" class="confirm-modal-close" onclick="closeDeleteOpenQuestionModalFromEvent(event)">x</button><div class="confirm-modal-title">Conferma eliminazione</div><div class="confirm-modal-text">Vuoi eliminare la open question <strong>${escapeHtml(uiState.openQuestion.deletingId)}</strong>?</div><div class="plan-notes-actions confirm-modal-actions"><button type="button" class="open-question-btn is-danger" onclick="confirmDeleteOpenQuestionFromEvent(event)">Elimina</button><button type="button" class="open-question-btn is-secondary" onclick="closeDeleteOpenQuestionModalFromEvent(event)">Annulla</button></div></div></div>`;
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
  if (!uiState.acceptance.focusTarget || !uiState.acceptance.editingStoryId) return;
  if (uiState.acceptance.editingStoryId !== uiState.acceptance.focusTarget.storyId) return;

  const { storyId, criterionIndex } = uiState.acceptance.focusTarget;
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
  if (!uiState.taskDod.focusTarget || !uiState.taskDod.editingId) return;
  if (uiState.taskDod.editingId !== uiState.taskDod.focusTarget.taskId) return;

  const { taskId, criterionIndex } = uiState.taskDod.focusTarget;
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
    const payload = await pickWorkspaceFolder();
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

  const currentSet = uiState.filters.getStatusFilters(currentSection) || new Set();
  if (target.checked) {
    currentSet.add(status);
  } else {
    currentSet.delete(status);
  }
  uiState.filters.setStatusFilters(currentSection, currentSet);

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
