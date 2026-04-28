let plans = [];
let requirements = [];
let currentPlan = null;
let currentRequirement = null;
let currentSection = 'plans';
let searchDebounceTimer = null;

const TASK_STATUSES = ['pending', 'in_progress', 'completed', 'skipped', 'cancelled'];

async function loadPlans() {
  const res = await fetch('/api/plans');
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

  const res = await fetch(`/api/plans/${encodeURIComponent(id)}`);
  currentPlan = await res.json();
  renderPlanDetail();
}

function renderPlanDetail() {
  const p = currentPlan;
  const tasks = Array.isArray(p.tasks) ? p.tasks : [];
  const activeTab = document.querySelector('.tab.active')?.dataset.tab || 'overview';

  showDetail();
  configurePlanTabs(activeTab);

  document.getElementById('detailId').textContent = p.id;
  document.getElementById('detailTitle').textContent = p.title;
  document.getElementById('detailStatus').textContent = formatStatus(p.status);
  document.getElementById('detailStatus').className = `plan-item-status status-${p.status}`;
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

  document.getElementById('overviewContent').innerHTML = `
    <div class="overview-sections">
      ${p.objective ? `<div class="section-card"><div class="section-title">Objective</div><div class="section-body">${escapeHtml(p.objective)}</div></div>` : ''}
      ${p.targetArchitecture ? `<div class="section-card"><div class="section-title">Target Architecture</div><div class="section-body">${escapeHtml(p.targetArchitecture)}</div></div>` : ''}
      ${phasesChips ? `<div class="section-card"><div class="section-title">Phases</div>${phasesChips}</div>` : ''}
      ${p.notes ? `<div class="section-card"><div class="section-title">Notes</div><div class="section-body">${escapeHtml(p.notes)}</div></div>` : ''}
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

  document.getElementById('tasksList').innerHTML = tasks.map(t => `
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
      ${t.title ? `<div class="task-title">${escapeHtml(t.title)}</div>` : ''}
      ${t.phase ? `<div class="task-phase"><span class="task-context-label">Phase</span><span class="task-phase-value">${escapeHtml(t.phase)}</span></div>` : ''}
      ${t.files?.length ? `<div class="task-context-row"><span class="task-context-label">Files</span><span class="task-context-values">${t.files.map(f => `<code>${escapeHtml(f)}</code>`).join(', ')}</span></div>` : ''}
      ${t.endpoints?.length ? `<div class="task-context-row"><span class="task-context-label">Endpoints</span><span class="task-context-values">${t.endpoints.map(e => `<code>${escapeHtml(e)}</code>`).join(', ')}</span></div>` : ''}
      ${t.whatToDo ? `<div class="task-what">${escapeHtml(t.whatToDo)}</div>` : ''}
      ${t.dependsOn?.length ? `<div class="task-depends-on"><span class="task-context-label">Depends on</span><span class="task-context-values">${t.dependsOn.map(item => `<code>${escapeHtml(item)}</code>`).join(', ')}</span></div>` : ''}
      ${t.definitionOfDone?.length ? `
        <div class="task-dod">
          <div class="task-dod-title">Definition of Done:</div>
          ${t.definitionOfDone.map(d => `
            <div class="task-dod-item${d.completed ? ' is-completed' : ''}">
              <span class="task-dod-bullet">${d.completed ? '✓' : '○'}</span>
              <span>${escapeHtml(d.description)}</span>
            </div>
          `).join('')}
        </div>
      ` : ''}
      ${(t.implementationNotes || t.notes) ? `
        <details class="summary-block">
          <summary>Notes</summary>
          ${t.implementationNotes ? `<div class="task-notes"><strong>Implementation Notes:</strong><br>${escapeHtml(t.implementationNotes)}</div>` : ''}
          ${t.notes ? `<div class="task-notes"><strong>Notes:</strong><br>${escapeHtml(t.notes)}</div>` : ''}
        </details>
      ` : ''}
    </div>
  `).join('') || '<p class="empty-state">No tasks defined</p>';

  document.getElementById('decisionsList').innerHTML = p.decisions?.map(d => `
    <tr>
      <td>${escapeHtml(d.id || d.decision || '')}</td>
      <td>${escapeHtml(d.description || d.choice || '')}</td>
      <td>${escapeHtml(d.rationale || d.motivation || '')}</td>
      <td>${escapeHtml(d.date || '')}</td>
    </tr>
  `).join('') || '<tr><td colspan="4" class="empty-state" style="text-align:center">No decisions recorded</td></tr>';
}

async function selectRequirement(id) {
  if (currentSection !== 'requirements') return;
  document.querySelectorAll('.plan-item').forEach(el => el.classList.remove('active'));
  document.querySelector(`.plan-item[data-id="${CSS.escape(id)}"]`)?.classList.add('active');

  const res = await fetch(`/api/requirements/${encodeURIComponent(id)}`);
  currentRequirement = await res.json();
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

  showDetail();
  configureRequirementTabs(decisions.length > 0);

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
        <div class="task-dod">
          <div class="task-dod-title">Acceptance Criteria:</div>
          ${(story.acceptanceCriteria || []).map(ac => `
            <div class="task-dod-item${ac.checked ? ' is-completed' : ''}">
              <span class="task-dod-bullet">${ac.checked ? '✓' : '○'}</span>
              <span>${escapeHtml(ac.text || '')}</span>
            </div>
          `).join('') || '<div class="task-dod-item"><span class="task-dod-bullet">○</span><span>No acceptance criteria</span></div>'}
        </div>
      </div>
    `).join('')
    : '<p class="empty-state">No user stories</p>';

  document.getElementById('openQuestionsList').innerHTML = openQuestions.length
    ? openQuestions.map(q => `
      <div class="task-item">
        <div class="task-header">
          <span class="task-id">${escapeHtml(q.id || '-')}</span>
          <span class="plan-item-status status-${q.status === 'resolved' ? 'completed' : 'pending'}">${q.status === 'resolved' ? 'Resolved' : 'Open'}</span>
        </div>
        <div class="task-title">${escapeHtml(q.question || '')}</div>
        <div class="task-what">${escapeHtml(q.answer || '')}</div>
      </div>
    `).join('')
    : '<p class="empty-state">No open questions</p>';
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

function configureRequirementTabs(hasArchitecturalDecisions) {
  toggleTab('overview', true);
  toggleTab('stories', false);
  toggleTab('tasks', false);
  toggleTab('decisions', false);
  toggleTab('functional', true);
  toggleTab('architectural-decisions', hasArchitecturalDecisions);
  toggleTab('non-functional', true);
  toggleTab('user-stories', true);
  toggleTab('open-questions', true);
  activateTab('overview');
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

    const updated = await res.json();
    const task = currentPlan.tasks?.find(t => t.id === taskId);
    if (task) task.status = updated.task.status;
    if (Array.isArray(updated.stories)) currentPlan.stories = updated.stories;
    currentPlan.lastUpdated = updated.lastUpdated || currentPlan.lastUpdated;

    const planCard = plans.find(p => p.id === currentPlan.id);
    if (planCard) planCard.lastUpdated = currentPlan.lastUpdated;

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
window.openSearchResult = openSearchResult;

Promise.all([loadPlans(), loadRequirements()]).then(() => {
  setSection('plans');
});
