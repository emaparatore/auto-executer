import { getCurrentDateIso } from '/src/utils/date.js';
import { escapeHtml } from '/src/utils/html.js';
import { formatStatus, normalizeStoryStatus } from '/src/utils/status.js';
import { TASK_STATUSES, STATUS_SORT_ORDER } from '/src/utils/constants.js';
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
import { renderRequirementDetailRenderer } from '/src/ui/renderers/requirementDetail.renderer.js';
import { uiState } from '/src/state/uiState.js';
import { createPlansController } from '/src/features/plans/plans.controller.js';
import { createRequirementsController } from '/src/features/requirements/requirements.controller.js';
import { createWorkspacesController } from '/src/features/workspaces/workspaces.controller.js';
import { buildPhasesForEditor } from '/src/features/plans/plans.selectors.js';

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

const OPEN_QUESTION_STATUSES = ['open', 'resolved'];

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

const plansDeps = {
  listPlans,
  getPlanById,
  readState: readCoreState,
  writeState: writeCoreState,
  syncCoreState,
  renderPlansList: () => renderPlansList(),
  renderPlanDetail: () => renderPlanDetail(),
  scrollWorkspaceToTop,
  resetPlanUiEditingState,
  activatePlanListItem,
  uiState,
  showToast,
  getCurrentDateIso,
  buildPhasesForEditor,
  loadPlans: null,
  TASK_STATUSES: null,
  formatStatus
};

const plansController = createPlansController(plansDeps);
plansDeps.loadPlans = () => plansController.loadPlans();

const requirementsDeps = {
  listRequirements,
  getRequirementById,
  readState: readCoreState,
  writeState: writeCoreState,
  syncCoreState,
  renderRequirementsList: () => renderRequirementsList(),
  renderRequirementDetail: () => renderRequirementDetail(),
  scrollWorkspaceToTop,
  resetRequirementUiEditingState,
  activateRequirementListItem,
  uiState,
  showToast,
  OPEN_QUESTION_STATUSES,
  loadRequirements: null
};

const requirementsController = createRequirementsController(requirementsDeps);
requirementsDeps.loadRequirements = () => requirementsController.loadRequirements();

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

const ADD_ICON_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>';
plansDeps.TASK_STATUSES = TASK_STATUSES;

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

  renderRequirementDetailRenderer({
    requirement: currentRequirement,
    escapeHtml,
    formatStatus,
    ADD_ICON_SVG,
    OPEN_QUESTION_STATUSES,
    showDetail,
    configureRequirementTabs,
    restoreAcceptanceFocusIfNeeded,
    buildRightNav
  });
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

function selectPlanByEncodedId(encodedPlanId) {
  return selectPlan(decodeURIComponent(encodedPlanId));
}

function selectRequirementByEncodedId(encodedRequirementId) {
  return selectRequirement(decodeURIComponent(encodedRequirementId));
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
    plansController.closeAllTaskStatusDropdowns();
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
window.handleTaskStatusChangeByEncodedId = plansController.handleTaskStatusChangeByEncodedId;
window.toggleTaskStatusDropdown = plansController.toggleTaskStatusDropdown;
window.toggleTaskPhaseDropdown = plansController.toggleTaskPhaseDropdown;
window.handleTaskPhaseSelectByEncodedId = plansController.handleTaskPhaseSelectByEncodedId;
window.openSearchResult = openSearchResult;
window.enableTaskDodEditByEncodedId = plansController.enableTaskDodEditByEncodedId;
window.disableTaskDodEditFromEvent = plansController.disableTaskDodEditFromEvent;
window.handleTaskDodRegionKeydown = plansController.handleTaskDodRegionKeydown;
window.toggleTaskDodItemByEncodedIds = plansController.toggleTaskDodItemByEncodedIds;
window.enablePlanNotesEditFromEvent = plansController.enablePlanNotesEditFromEvent;
window.cancelPlanNotesEditFromEvent = plansController.cancelPlanNotesEditFromEvent;
window.savePlanNotesFromEvent = plansController.savePlanNotesFromEvent;
window.enablePlanObjectiveEditFromEvent = plansController.enablePlanObjectiveEditFromEvent;
window.cancelPlanObjectiveEditFromEvent = plansController.cancelPlanObjectiveEditFromEvent;
window.savePlanObjectiveFromEvent = plansController.savePlanObjectiveFromEvent;
window.enablePlanPhasesEditFromEvent = plansController.enablePlanPhasesEditFromEvent;
window.cancelPlanPhasesEditFromEvent = plansController.cancelPlanPhasesEditFromEvent;
window.savePlanPhasesFromEvent = plansController.savePlanPhasesFromEvent;
window.addPlanPhaseFromEvent = plansController.addPlanPhaseFromEvent;
window.removePlanPhaseFromEvent = plansController.removePlanPhaseFromEvent;
window.updatePlanPhaseTitleFromEvent = plansController.updatePlanPhaseTitleFromEvent;
window.togglePlanPhaseTaskByEncodedId = plansController.togglePlanPhaseTaskByEncodedId;
window.enableTaskFieldEditByEncodedId = plansController.enableTaskFieldEditByEncodedId;
window.cancelTaskFieldEditFromEvent = plansController.cancelTaskFieldEditFromEvent;
window.saveTaskFieldByEncodedIds = plansController.saveTaskFieldByEncodedIds;
window.enableTaskNotesEditByEncodedId = plansController.enableTaskNotesEditByEncodedId;
window.cancelTaskNotesEditFromEvent = plansController.cancelTaskNotesEditFromEvent;
window.saveTaskNotesByEncodedIds = plansController.saveTaskNotesByEncodedIds;
window.enableTaskImplementationNotesEditByEncodedId = plansController.enableTaskImplementationNotesEditByEncodedId;
window.cancelTaskImplementationNotesEditFromEvent = plansController.cancelTaskImplementationNotesEditFromEvent;
window.saveTaskImplementationNotesByEncodedIds = plansController.saveTaskImplementationNotesByEncodedIds;
window.handleTaskNotesDetailsToggleByEncodedId = plansController.handleTaskNotesDetailsToggleByEncodedId;
window.enableCreatePlanDecisionFromEvent = plansController.enableCreatePlanDecisionFromEvent;
window.cancelCreatePlanDecisionFromEvent = plansController.cancelCreatePlanDecisionFromEvent;
window.proceedCreatePlanDecisionFromEvent = plansController.proceedCreatePlanDecisionFromEvent;
window.backCreatePlanDecisionFromEvent = plansController.backCreatePlanDecisionFromEvent;
window.createPlanDecisionFromEvent = plansController.createPlanDecisionFromEvent;
window.editPlanDecisionByEncodedId = plansController.editPlanDecisionByEncodedId;
window.cancelPlanDecisionEditFromEvent = plansController.cancelPlanDecisionEditFromEvent;
window.savePlanDecisionByEncodedId = plansController.savePlanDecisionByEncodedId;
window.requestDeletePlanDecisionByEncodedId = plansController.requestDeletePlanDecisionByEncodedId;
window.closeDeletePlanDecisionModalFromEvent = plansController.closeDeletePlanDecisionModalFromEvent;
window.confirmDeletePlanDecisionFromEvent = plansController.confirmDeletePlanDecisionFromEvent;
window.handleDeletePlanDecisionModalKeydown = plansController.handleDeletePlanDecisionModalKeydown;
window.enableAcceptanceEditByEncodedId = requirementsController.enableAcceptanceEditByEncodedId;
window.toggleAcceptanceCriterionByEncodedIds = requirementsController.toggleAcceptanceCriterionByEncodedIds;
window.disableAcceptanceEditFromEvent = requirementsController.disableAcceptanceEditFromEvent;
window.handleAcceptanceRegionKeydown = requirementsController.handleAcceptanceRegionKeydown;
window.handleAcceptanceItemKeydown = handleAcceptanceItemKeydown;
window.enableOpenQuestionEditByEncodedId = requirementsController.enableOpenQuestionEditByEncodedId;
window.cancelOpenQuestionEditFromEvent = requirementsController.cancelOpenQuestionEditFromEvent;
window.handleOpenQuestionCardKeydown = requirementsController.handleOpenQuestionCardKeydown;
window.saveOpenQuestionByEncodedIds = requirementsController.saveOpenQuestionByEncodedIds;
window.enableRequirementOverviewEditFromEvent = requirementsController.enableRequirementOverviewEditFromEvent;
window.cancelRequirementOverviewEditFromEvent = requirementsController.cancelRequirementOverviewEditFromEvent;
window.saveRequirementOverviewFromEvent = requirementsController.saveRequirementOverviewFromEvent;
window.enableRequirementCurrentStateEditFromEvent = requirementsController.enableRequirementCurrentStateEditFromEvent;
window.cancelRequirementCurrentStateEditFromEvent = requirementsController.cancelRequirementCurrentStateEditFromEvent;
window.saveRequirementCurrentStateFromEvent = requirementsController.saveRequirementCurrentStateFromEvent;
window.addRequirementCurrentStateRowFromEvent = requirementsController.addRequirementCurrentStateRowFromEvent;
window.removeRequirementCurrentStateRowFromEvent = requirementsController.removeRequirementCurrentStateRowFromEvent;
window.enableRequirementNotesEditFromEvent = requirementsController.enableRequirementNotesEditFromEvent;
window.cancelRequirementNotesEditFromEvent = requirementsController.cancelRequirementNotesEditFromEvent;
window.saveRequirementNotesFromEvent = requirementsController.saveRequirementNotesFromEvent;
window.enableCreateFunctionalRequirementFromEvent = requirementsController.enableCreateFunctionalRequirementFromEvent;
window.editFunctionalRequirementByEncodedId = requirementsController.editFunctionalRequirementByEncodedId;
window.requestDeleteFunctionalRequirementByEncodedId = requirementsController.requestDeleteFunctionalRequirementByEncodedId;
window.saveFunctionalRequirementByEncodedId = requirementsController.saveFunctionalRequirementByEncodedId;
window.cancelFunctionalRequirementEditFromEvent = requirementsController.cancelFunctionalRequirementEditFromEvent;
window.deleteFunctionalRequirementByEncodedId = requirementsController.deleteFunctionalRequirementByEncodedId;
window.closeDeleteFunctionalRequirementModalFromEvent = requirementsController.closeDeleteFunctionalRequirementModalFromEvent;
window.confirmDeleteFunctionalRequirementFromEvent = requirementsController.confirmDeleteFunctionalRequirementFromEvent;
window.handleDeleteFunctionalRequirementModalKeydown = requirementsController.handleDeleteFunctionalRequirementModalKeydown;
window.enableCreateNonFunctionalRequirementFromEvent = requirementsController.enableCreateNonFunctionalRequirementFromEvent;
window.editNonFunctionalRequirementByEncodedId = requirementsController.editNonFunctionalRequirementByEncodedId;
window.requestDeleteNonFunctionalRequirementByEncodedId = requirementsController.requestDeleteNonFunctionalRequirementByEncodedId;
window.saveNonFunctionalRequirementByEncodedId = requirementsController.saveNonFunctionalRequirementByEncodedId;
window.cancelNonFunctionalRequirementEditFromEvent = requirementsController.cancelNonFunctionalRequirementEditFromEvent;
window.closeDeleteNonFunctionalRequirementModalFromEvent = requirementsController.closeDeleteNonFunctionalRequirementModalFromEvent;
window.confirmDeleteNonFunctionalRequirementFromEvent = requirementsController.confirmDeleteNonFunctionalRequirementFromEvent;
window.handleDeleteNonFunctionalRequirementModalKeydown = requirementsController.handleDeleteNonFunctionalRequirementModalKeydown;
window.enableStoryCreateFromEvent = requirementsController.enableStoryCreateFromEvent;
window.cancelStoryCreateFromEvent = requirementsController.cancelStoryCreateFromEvent;
window.proceedStoryCreateFromEvent = requirementsController.proceedStoryCreateFromEvent;
window.enableStoryEditByEncodedId = requirementsController.enableStoryEditByEncodedId;
window.cancelStoryEditFromEvent = requirementsController.cancelStoryEditFromEvent;
window.saveStoryByEncodedId = requirementsController.saveStoryByEncodedId;
window.createStoryFromEvent = requirementsController.createStoryFromEvent;
window.requestDeleteStoryByEncodedId = requirementsController.requestDeleteStoryByEncodedId;
window.closeDeleteStoryModalFromEvent = requirementsController.closeDeleteStoryModalFromEvent;
window.confirmDeleteStoryFromEvent = requirementsController.confirmDeleteStoryFromEvent;
window.addStoryCriterionFromEvent = requirementsController.addStoryCriterionFromEvent;
window.removeStoryCriterionFromEvent = requirementsController.removeStoryCriterionFromEvent;
window.enableOpenQuestionCreateFromEvent = requirementsController.enableOpenQuestionCreateFromEvent;
window.proceedCreateOpenQuestionFromEvent = requirementsController.proceedCreateOpenQuestionFromEvent;
window.backCreateOpenQuestionFromEvent = requirementsController.backCreateOpenQuestionFromEvent;
window.cancelCreateOpenQuestionFromEvent = requirementsController.cancelCreateOpenQuestionFromEvent;
window.createOpenQuestionFromEvent = requirementsController.createOpenQuestionFromEvent;
window.requestDeleteOpenQuestionByEncodedIds = requirementsController.requestDeleteOpenQuestionByEncodedIds;
window.closeDeleteOpenQuestionModalFromEvent = requirementsController.closeDeleteOpenQuestionModalFromEvent;
window.confirmDeleteOpenQuestionFromEvent = requirementsController.confirmDeleteOpenQuestionFromEvent;

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
