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

const OPEN_QUESTION_STATUSES = ['open', 'resolved'];

const TASK_STATUSES = ['pending', 'in_progress', 'completed', 'skipped', 'cancelled'];

function isTaskFieldEditing(taskId, field) {
  return editingTaskField?.taskId === taskId && editingTaskField?.field === field;
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

function renderPlansList() {
  const container = document.getElementById('plansList');
  document.getElementById('plansSwitchCount').textContent = `(${plans.length})`;
  document.getElementById('requirementsSwitchCount').textContent = `(${requirements.length})`;

  container.innerHTML = plans.map(plan => `
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

  container.innerHTML = requirements.map(req => `
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
  renderPlanDetail();
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
          <button type="button" class="icon-action-btn${phases.length ? '' : ' is-add'}" onclick="enablePlanPhasesEditFromEvent(event)" aria-label="${phases.length ? 'Modifica phases piano' : 'Aggiungi phases piano'}" title="${phases.length ? 'Modifica phases piano' : 'Aggiungi phases piano'}">${phases.length ? '✎' : '+'}</button>
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
          <button type="button" class="icon-action-btn${currentObjective ? '' : ' is-add'}" onclick="enablePlanObjectiveEditFromEvent(event)" aria-label="${currentObjective ? 'Modifica objective piano' : 'Aggiungi objective piano'}" title="${currentObjective ? 'Modifica objective piano' : 'Aggiungi objective piano'}">${currentObjective ? '✎' : '+'}</button>
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
          <button type="button" class="icon-action-btn${currentNotes ? '' : ' is-add'}" onclick="enablePlanNotesEditFromEvent(event)" aria-label="${currentNotes ? 'Modifica note piano' : 'Aggiungi note piano'}" title="${currentNotes ? 'Modifica note piano' : 'Aggiungi note piano'}">${currentNotes ? '✎' : '+'}</button>
        </div>
        ${currentNotes ? `<div class="section-body">${escapeHtml(currentNotes)}</div>` : ''}
      </div>
    `;

  document.getElementById('overviewContent').innerHTML = `
    <div class="overview-sections">
      ${planObjectiveSection}
      ${p.targetArchitecture ? `<div class="section-card"><div class="section-title">Target Architecture</div><div class="section-body">${escapeHtml(p.targetArchitecture)}</div></div>` : ''}
      ${planPhasesSection}
      ${planNotesSection}
    </div>
  `;

  document.getElementById('storiesList').innerHTML = p.stories?.map(s => {
    const storyStatus = normalizeStoryStatus(s.status);
    const taskList = Array.isArray(s.tasks) ? s.tasks.join(', ') : String(s.tasks || '');
    return `
      <div class="story-item">
        <div class="story-header">
          <span class="story-id">${escapeHtml(s.id)}</span>
          <span class="story-status status-${storyStatus}">${formatStatus(storyStatus)}</span>
        </div>
        <div class="story-description">${escapeHtml(s.description || '')}</div>
        <div class="story-tasks">Tasks: ${escapeHtml(taskList)}</div>
      </div>
    `;
  }).join('') || '<p class="empty-state">No stories defined</p>';

  document.getElementById('tasksList').innerHTML = tasks.map(t => {
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
    <div class="task-item">
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
      
      ${isTaskFieldEditing(t.id, 'title')
        ? `
          <div class="task-notes-form" onclick="event.stopPropagation()">
            <label class="open-question-label" for="task-title-${escapeHtml(t.id)}">Title</label>
            <input id="task-title-${escapeHtml(t.id)}" class="task-inline-input" type="text" value="${escapeHtml(titleValue)}" ${isTaskFieldUpdating ? 'disabled' : ''}>
            <div class="task-notes-actions">
              <button type="button" class="open-question-btn" onclick="saveTaskFieldByEncodedIds(event, '${encodeURIComponent(p.id)}', '${encodeURIComponent(t.id)}', 'title')" ${isTaskFieldUpdating ? 'disabled' : ''}>Salva</button>
              <button type="button" class="open-question-btn is-secondary" onclick="cancelTaskFieldEditFromEvent(event)" ${isTaskFieldUpdating ? 'disabled' : ''}>Annulla</button>
            </div>
          </div>
        `
        : `
          <div class="task-title-row">
            ${titleValue ? `<div class="task-title">${escapeHtml(titleValue)}</div>` : ''}
            <button type="button" class="icon-action-btn${titleValue ? '' : ' is-add'}" onclick="enableTaskFieldEditByEncodedId(event, '${encodeURIComponent(t.id)}', 'title')" aria-label="${titleValue ? 'Modifica titolo task' : 'Aggiungi titolo task'}" title="${titleValue ? 'Modifica titolo task' : 'Aggiungi titolo task'}">${titleValue ? '✎' : '+'}</button>
          </div>
        `}
      ${isTaskFieldEditing(t.id, 'whatToDo')
        ? `
          <div class="task-notes-form" onclick="event.stopPropagation()">
            <label class="open-question-label" for="task-whatToDo-${escapeHtml(t.id)}">What to do</label>
            <textarea id="task-whatToDo-${escapeHtml(t.id)}" class="task-notes-input" rows="5" ${isTaskFieldUpdating ? 'disabled' : ''}>${escapeHtml(whatToDoValue)}</textarea>
            <div class="task-notes-actions">
              <button type="button" class="open-question-btn" onclick="saveTaskFieldByEncodedIds(event, '${encodeURIComponent(p.id)}', '${encodeURIComponent(t.id)}', 'whatToDo')" ${isTaskFieldUpdating ? 'disabled' : ''}>Salva</button>
              <button type="button" class="open-question-btn is-secondary" onclick="cancelTaskFieldEditFromEvent(event)" ${isTaskFieldUpdating ? 'disabled' : ''}>Annulla</button>
            </div>
          </div>
        `
        : `
          <div class="task-notes-title-row"><strong>What to do</strong><button type="button" class="icon-action-btn${whatToDoValue ? '' : ' is-add'}" onclick="enableTaskFieldEditByEncodedId(event, '${encodeURIComponent(t.id)}', 'whatToDo')" aria-label="${whatToDoValue ? 'Modifica what to do task' : 'Aggiungi what to do task'}" title="${whatToDoValue ? 'Modifica what to do task' : 'Aggiungi what to do task'}">${whatToDoValue ? '✎' : '+'}</button></div>
          ${whatToDoValue ? `<div class="task-what">${escapeHtml(whatToDoValue)}</div>` : ''}
        `}

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
              : `${phaseValue ? `<code>${escapeHtml(phaseValue)}</code>` : '<span class="task-meta-empty">-</span>'}<button type="button" class="icon-action-btn${phaseValue ? '' : ' is-add'}" onclick="enableTaskFieldEditByEncodedId(event, '${encodeURIComponent(t.id)}', 'phase')">${phaseValue ? '✎' : '+'}</button>`}
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
              : `${dependsOnValue.length ? dependsOnValue.map(item => `<code>${escapeHtml(item)}</code>`).join(' ') : '<span class="task-meta-empty">-</span>'}<button type="button" class="icon-action-btn${dependsOnValue.length ? '' : ' is-add'}" onclick="enableTaskFieldEditByEncodedId(event, '${encodeURIComponent(t.id)}', 'dependsOn')">${dependsOnValue.length ? '✎' : '+'}</button>`}
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
              : `${filesValue.length ? filesValue.map(f => `<code>${escapeHtml(f)}</code>`).join(' ') : '<span class="task-meta-empty">-</span>'}<button type="button" class="icon-action-btn${filesValue.length ? '' : ' is-add'}" onclick="enableTaskFieldEditByEncodedId(event, '${encodeURIComponent(t.id)}', 'files')">${filesValue.length ? '✎' : '+'}</button>`}
          </div>
        </div>
        <div class="task-meta-row">
          <span class="task-meta-label">Endpoints</span>
          <div class="task-meta-value">${t.endpoints?.length ? t.endpoints.map(e => `<code>${escapeHtml(e)}</code>`).join(' ') : '<span class="task-meta-empty">-</span>'}</div>
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
            <button type="button" class="icon-action-btn${t.implementationNotes ? '' : ' is-add'}" onclick="enableTaskImplementationNotesEditByEncodedId(event, '${encodeURIComponent(t.id)}')" aria-label="${t.implementationNotes ? 'Modifica implementation notes' : 'Aggiungi implementation notes'}" title="${t.implementationNotes ? 'Modifica implementation notes' : 'Aggiungi implementation notes'}">${t.implementationNotes ? '✎' : '+'}</button>
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
            <button type="button" class="icon-action-btn${t.notes ? '' : ' is-add'}" onclick="enableTaskNotesEditByEncodedId(event, '${encodeURIComponent(t.id)}')" aria-label="${t.notes ? 'Modifica task notes' : 'Aggiungi task notes'}" title="${t.notes ? 'Modifica task notes' : 'Aggiungi task notes'}">${t.notes ? '✎' : '+'}</button>
          </div>
          ${t.notes ? `<div class="task-notes">${escapeHtml(t.notes)}</div>` : ''}
        `}
      </details>
    </div>
  `;
  }).join('') || '<p class="empty-state">No tasks defined</p>';

  document.getElementById('decisionsList').innerHTML = p.decisions?.map(d => `
    <tr>
      <td>${escapeHtml(d.id || d.decision || '')}</td>
      <td>${escapeHtml(d.description || d.choice || '')}</td>
      <td>${escapeHtml(d.rationale || d.motivation || '')}</td>
      <td>${escapeHtml(d.date || '')}</td>
    </tr>
  `).join('') || '<tr><td colspan="4" class="empty-state" style="text-align:center">No decisions recorded</td></tr>';

  restoreTaskDodFocusIfNeeded();
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
  renderRequirementDetail();
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

  const overviewChunks = [];
  if (data.overview) {
    overviewChunks.push(`<div class="section-card"><div class="section-title">Overview</div><div class="section-body">${escapeHtml(data.overview)}</div></div>`);
  }
  if (Array.isArray(data.currentState) && data.currentState.length) {
    overviewChunks.push(`<div class="section-card"><div class="section-title">Current State</div>${data.currentState.map(row => `<div class="story-tasks"><strong>${escapeHtml(row.area)} (${escapeHtml(row.status)})</strong>: ${escapeHtml(row.notes)}</div>`).join('')}</div>`);
  }
  if (data.domainContext) {
    overviewChunks.push(`<div class="section-card"><div class="section-title">Domain Context</div><div class="section-body">${escapeHtml(JSON.stringify(data.domainContext, null, 2))}</div></div>`);
  }
  document.getElementById('overviewContent').innerHTML = `<div class="overview-sections">${overviewChunks.join('') || '<p class="empty-state">No overview content</p>'}</div>`;

  document.getElementById('functionalList').innerHTML = renderRequirementItems(rf, 'No functional requirements');
  document.getElementById('nonFunctionalList').innerHTML = renderRequirementItems(rnf, 'No non-functional requirements');

  document.getElementById('architecturalDecisionsList').innerHTML = decisions.length
    ? decisions.map(item => `
      <div class="task-item">
        <div class="task-header"><span class="task-id">${escapeHtml(item.id || '-')}</span></div>
        <div class="task-title">${escapeHtml(item.title || item.id || 'Decision')}</div>
        <div class="task-what">${escapeHtml(item.decision || '')}</div>
        ${item.rationale ? `<div class="task-notes"><strong>Rationale:</strong> ${escapeHtml(item.rationale)}</div>` : ''}
      </div>
    `).join('')
    : '<p class="empty-state">No architectural decisions</p>';

  document.getElementById('userStoriesRequirementsList').innerHTML = stories.length
    ? stories.map(story => `
      <div class="task-item">
        <div class="task-header"><span class="task-id">${escapeHtml(story.id)}</span></div>
        <div class="task-title">${escapeHtml(story.title || '')}</div>
        <div class="task-context-row"><span class="task-context-label">As a</span><span class="task-context-values">${escapeHtml(story.asA || '')}</span></div>
        <div class="task-context-row"><span class="task-context-label">I want</span><span class="task-context-values">${escapeHtml(story.iWant || '')}</span></div>
        <div class="task-context-row"><span class="task-context-label">So that</span><span class="task-context-values">${escapeHtml(story.soThat || '')}</span></div>
        <div
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
        </div>
      </div>
    `).join('')
    : '<p class="empty-state">No user stories</p>';

  document.getElementById('openQuestionsList').innerHTML = openQuestions.length
    ? openQuestions.map(q => `
      <div
        class="task-item open-question-item${editingOpenQuestionId === q.id ? ' is-editing' : ''}${isOpenQuestionUpdating ? ' is-busy' : ''}"
        role="button"
        tabindex="0"
        aria-label="Apri modalita modifica open question"
        aria-expanded="${editingOpenQuestionId === q.id ? 'true' : 'false'}"
        onclick="enableOpenQuestionEditByEncodedId('${encodeURIComponent(q.id || '')}')"
        onkeydown="handleOpenQuestionCardKeydown(event, '${encodeURIComponent(q.id || '')}')">
        <div class="task-header">
          <span class="task-id">${escapeHtml(q.id || '-')}</span>
          <span class="plan-item-status status-${q.status === 'resolved' ? 'completed' : 'pending'}">${q.status === 'resolved' ? 'Resolved' : 'Open'}</span>
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
    : '<p class="empty-state">No open questions</p>';

  restoreAcceptanceFocusIfNeeded();
}

function renderRequirementItems(items, emptyText) {
  if (!items.length) return `<p class="empty-state">${emptyText}</p>`;
  return items.map(item => `
    <div class="task-item">
      <div class="task-header"><span class="task-id">${escapeHtml(item.id || '-')}</span></div>
      <div class="task-title">${escapeHtml(item.title || '')}</div>
      <div class="task-what">${escapeHtml(item.description || '')}</div>
    </div>
  `).join('');
}

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
  currentSection = section;
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
  document.getElementById('detailView').classList.remove('show');
  document.getElementById('welcome').style.display = 'flex';

  if (section === 'plans') {
    document.getElementById('welcomeTitle').textContent = 'Select a plan';
    document.getElementById('welcomeText').textContent = 'Choose a plan from the sidebar to view its details, stories, and tasks.';
    document.getElementById('searchInput').placeholder = 'Search plans, stories, tasks...';
    configurePlanTabs();
    renderPlansList();
  } else {
    document.getElementById('welcomeTitle').textContent = 'Select a requirement';
    document.getElementById('welcomeText').textContent = 'Choose a requirement from the sidebar to view its details.';
    document.getElementById('searchInput').placeholder = 'Search requirements, RF, RNF, stories...';
    configureRequirementTabs(true);
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

  if (field === 'title' || field === 'phase') {
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
    searchResults.innerHTML = '<div class="empty-state" style="padding:16px">No results found</div>';
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

document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    if (tab.classList.contains('hidden')) return;
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('show'));
    tab.classList.add('active');
    document.getElementById(`tab-${tab.dataset.tab}`).classList.add('show');
  });
});

document.querySelectorAll('.section-switch-tab').forEach(btn => {
  btn.addEventListener('click', () => setSection(btn.dataset.section));
});

const searchInput = document.getElementById('searchInput');
const searchResults = document.getElementById('searchResults');

searchInput.addEventListener('input', e => {
  clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => {
    runSearch(e.target.value).catch(error => {
      searchResults.innerHTML = `<div class="error-state" style="padding:16px">${escapeHtml(error.message)}</div>`;
      searchResults.classList.add('show');
    });
  }, 200);
});

document.addEventListener('click', e => {
  if (!e.target.closest('.search-box')) {
    searchResults.classList.remove('show');
  }

  if (!e.target.closest('.task-status-dropdown')) {
    closeAllTaskStatusDropdowns();
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

function hideBootLoader() {
  document.body.classList.remove('loading');
}

Promise.all([loadPlans(), loadRequirements()])
  .then(() => {
    setSection('plans');
  })
  .catch(error => {
    const loaderText = document.querySelector('.boot-loader-text');
    if (loaderText) loaderText.textContent = `Errore caricamento: ${error.message}`;
  })
  .finally(() => {
    hideBootLoader();
  });
