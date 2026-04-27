let plans = [];
let currentPlan = null;
let searchDebounceTimer = null;

const TASK_STATUSES = ['pending', 'in_progress', 'completed', 'skipped', 'cancelled'];

async function loadPlans() {
  const res = await fetch('/api/plans');
  plans = await res.json();

  document.getElementById('plansCount').textContent = `(${plans.length})`;
  renderPlansList();
}

function renderPlansList() {
  const container = document.getElementById('plansList');
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

async function selectPlan(id) {
  document.querySelectorAll('.plan-item').forEach(el => el.classList.remove('active'));
  document.querySelector(`.plan-item[data-id="${CSS.escape(id)}"]`)?.classList.add('active');

  const res = await fetch(`/api/plans/${encodeURIComponent(id)}`);
  currentPlan = await res.json();
  renderDetail();
}

function renderDetail() {
  const p = currentPlan;
  const tasks = Array.isArray(p.tasks) ? p.tasks : [];

  document.getElementById('welcome').style.display = 'none';
  document.getElementById('detailView').classList.add('show');

  document.getElementById('detailId').textContent = p.id;
  document.getElementById('detailTitle').textContent = p.title;
  document.getElementById('detailStatus').textContent = formatStatus(p.status);
  document.getElementById('detailStatus').className = `plan-item-status status-${p.status}`;
  document.getElementById('detailCreated').textContent = p.created || 'N/A';
  document.getElementById('detailLastUpdated').textContent = p.lastUpdated || 'N/A';
  document.getElementById('detailRequirements').textContent = p.requirements || 'None';

  const storiesDone = p.stories?.filter(s => normalizeStoryStatus(s.status) === 'completed').length || 0;
  const tasksDone = tasks.filter(t => t.status === 'completed').length;
  const tasksTotal = tasks.length;

  document.getElementById('overviewCount').textContent = `${storiesDone}/${p.stories?.length || 0}`;
  document.getElementById('storiesCount').textContent = p.stories?.length || 0;
  document.getElementById('tasksCount').textContent = `${tasksDone}/${tasksTotal}`;
  document.getElementById('decisionsCount').textContent = p.decisions?.length || 0;

  document.getElementById('statsGrid').innerHTML = `
    <div class="stat-card"><div class="stat-value">${p.stories?.length || 0}</div><div class="stat-label">Stories</div></div>
    <div class="stat-card"><div class="stat-value">${storiesDone}</div><div class="stat-label">Stories Done</div></div>
    <div class="stat-card"><div class="stat-value">${tasksTotal}</div><div class="stat-label">Tasks</div></div>
    <div class="stat-card"><div class="stat-value">${tasksDone}</div><div class="stat-label">Tasks Done</div></div>
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
      ${p.objective ? `
        <div class="section-card">
          <div class="section-title">Objective</div>
          <div class="section-body">${escapeHtml(p.objective)}</div>
        </div>
      ` : ''}
      ${p.targetArchitecture ? `
        <div class="section-card">
          <div class="section-title">Target Architecture</div>
          <div class="section-body">${escapeHtml(p.targetArchitecture)}</div>
        </div>
      ` : ''}
      ${phasesChips ? `
        <div class="section-card">
          <div class="section-title">Phases</div>
          ${phasesChips}
        </div>
      ` : ''}
      ${p.notes ? `
        <div class="section-card">
          <div class="section-title">Notes</div>
          <div class="section-body">${escapeHtml(p.notes)}</div>
        </div>
      ` : ''}
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
      ${t.title ? `<div class="task-what"><strong>${escapeHtml(t.title)}</strong></div>` : ''}
      ${t.phase ? `<div class="task-notes">Phase: ${escapeHtml(t.phase)}</div>` : ''}
      ${t.files?.length ? `<div class="task-notes">Files: ${t.files.map(f => `<code>${escapeHtml(f)}</code>`).join(', ')}</div>` : ''}
      ${t.endpoints?.length ? `<div class="task-notes">Endpoints: ${t.endpoints.map(e => `<code>${escapeHtml(e)}</code>`).join(', ')}</div>` : ''}
      ${t.whatToDo ? `<div class="task-what">${escapeHtml(t.whatToDo)}</div>` : ''}
      ${t.dependsOn?.length ? `<div class="task-depends-on">Depends on: ${t.dependsOn.map(item => escapeHtml(item)).join(', ')}</div>` : ''}
      ${t.definitionOfDone?.length ? `
        <div class="task-dod">
          <div class="task-dod-title">Definition of Done:</div>
          ${t.definitionOfDone.map(d => `<div>• ${escapeHtml(d.description)} ${d.completed ? '✓' : '○'}</div>`).join('')}
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

function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatStatus(status) {
  const map = {
    in_progress: 'In Progress',
    completed: 'Completed',
    pending: 'Pending',
    skipped: 'Skipped',
    cancelled: 'Cancelled'
  };
  return map[status] || status;
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

async function updateTaskStatus(taskId, status, dropdownRoot) {
  if (!currentPlan) return;

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
    if (Array.isArray(updated.stories)) {
      currentPlan.stories = updated.stories;
    }
    currentPlan.lastUpdated = updated.lastUpdated || currentPlan.lastUpdated;

    const planCard = plans.find(p => p.id === currentPlan.id);
    if (planCard) {
      planCard.lastUpdated = currentPlan.lastUpdated;
    }

    renderDetail();
  } catch (error) {
    if (previousStatus) setStatusSelectClass(dropdownRoot, previousStatus);
    alert(error.message);
  } finally {
    dropdownRoot.classList.remove('is-updating');
  }
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

document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('show'));
    tab.classList.add('active');
    document.getElementById(`tab-${tab.dataset.tab}`).classList.add('show');
  });
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

async function runSearch(query) {
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
        <div class="search-result-item" onclick="selectPlanByEncodedId('${encodeURIComponent(r.plan)}')">
          <span class="search-result-type type-${escapeHtml(m.type)}">${escapeHtml(m.type)}</span>
          ${escapeHtml(m.text)}
        </div>
      `).join('')}
    </div>
  `).join('');
  searchResults.classList.add('show');
}

document.addEventListener('click', e => {
  if (!e.target.closest('.search-box')) {
    searchResults.classList.remove('show');
  }

  if (!e.target.closest('.task-status-dropdown')) {
    closeAllTaskStatusDropdowns();
  }
});

window.selectPlan = selectPlan;
window.handleTaskStatusChange = handleTaskStatusChange;
window.selectPlanByEncodedId = selectPlanByEncodedId;
window.handleTaskStatusChangeByEncodedId = handleTaskStatusChangeByEncodedId;
window.toggleTaskStatusDropdown = toggleTaskStatusDropdown;

loadPlans();
