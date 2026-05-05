import { uiState } from '/src/state/uiState.js';

function renderPlanDetailRenderer({
  plan,
  escapeHtml,
  formatStatus,
  normalizeStoryStatus,
  ADD_ICON_SVG,
  TASK_STATUSES,
  showDetail,
  configurePlanTabs,
  restoreTaskDodFocusIfNeeded,
  buildRightNav
}) {
  const p = plan;
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
  const planPhasesSection = uiState.planPhases.isEditing
    ? `
      <div class="section-card">
        <div class="task-dod-title">
          <span>Phases</span>
          <span class="task-dod-hint">Edit mode attiva</span>
        </div>
        <div class="plan-notes-form">
          ${uiState.planPhases.items.map((phase, phaseIndex) => {
            const selectedTaskIds = Array.isArray(phase.tasks) ? phase.tasks : [];
            const taskOptions = tasks.map(task => `
              <label class="task-depends-on-option">
                <input
                  type="checkbox"
                  ${selectedTaskIds.includes(task.id) ? 'checked' : ''}
                  ${uiState.planPhases.isUpdating ? 'disabled' : ''}
                  onchange="togglePlanPhaseTaskByEncodedId(event, ${phaseIndex}, '${encodeURIComponent(task.id)}')">
                <span><code>${escapeHtml(task.id)}</code>${task.title ? ` - ${escapeHtml(task.title)}` : ''}</span>
              </label>
            `).join('');

            return `
              <div class="plan-phase-editor-row">
                <div class="plan-phase-editor-head">
                  <label class="open-question-label" for="plan-phase-title-${phaseIndex}">Fase ${phaseIndex + 1}</label>
                  <button type="button" class="icon-action-btn" onclick="removePlanPhaseFromEvent(event, ${phaseIndex})" ${uiState.planPhases.isUpdating ? 'disabled' : ''} aria-label="Rimuovi fase" title="Rimuovi fase">−</button>
                </div>
                <input
                  id="plan-phase-title-${phaseIndex}"
                  class="task-inline-input"
                  type="text"
                  value="${escapeHtml(phase.title || '')}"
                  ${uiState.planPhases.isUpdating ? 'disabled' : ''}
                  oninput="updatePlanPhaseTitleFromEvent(event, ${phaseIndex})"
                >
                <div class="task-depends-on-options">
                  ${taskOptions || '<div class="empty-state">Nessun task disponibile</div>'}
                </div>
              </div>
            `;
          }).join('')}
          <div class="plan-notes-actions">
            <button type="button" class="open-question-btn is-secondary" onclick="addPlanPhaseFromEvent(event)" ${uiState.planPhases.isUpdating ? 'disabled' : ''}>+ Fase</button>
            <button type="button" class="open-question-btn" onclick="savePlanPhasesFromEvent(event)" ${uiState.planPhases.isUpdating ? 'disabled' : ''}>Salva</button>
            <button type="button" class="open-question-btn is-secondary" onclick="cancelPlanPhasesEditFromEvent(event)" ${uiState.planPhases.isUpdating ? 'disabled' : ''}>Annulla</button>
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
  const planObjectiveSection = uiState.planObjective.isEditing
    ? `
      <div class="section-card">
        <div class="task-dod-title">
          <span>Objective</span>
          <span class="task-dod-hint">Edit mode attiva</span>
        </div>
        <div class="plan-notes-form">
          <textarea id="plan-objective-input" class="plan-notes-input" rows="5" ${uiState.planObjective.isUpdating ? 'disabled' : ''}>${escapeHtml(currentObjective)}</textarea>
          <div class="plan-notes-actions">
            <button type="button" class="open-question-btn" onclick="savePlanObjectiveFromEvent(event)" ${uiState.planObjective.isUpdating ? 'disabled' : ''}>Salva</button>
            <button type="button" class="open-question-btn is-secondary" onclick="cancelPlanObjectiveEditFromEvent(event)" ${uiState.planObjective.isUpdating ? 'disabled' : ''}>Annulla</button>
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
  const planNotesSection = uiState.planNotes.isEditing
    ? `
      <div class="section-card">
        <div class="task-dod-title">
          <span>Notes</span>
          <span class="task-dod-hint">Edit mode attiva</span>
        </div>
        <div class="plan-notes-form">
          <textarea id="plan-notes-input" class="plan-notes-input" rows="6" ${uiState.planNotes.isUpdating ? 'disabled' : ''}>${escapeHtml(currentNotes)}</textarea>
          <div class="plan-notes-actions">
            <button type="button" class="open-question-btn" onclick="savePlanNotesFromEvent(event)" ${uiState.planNotes.isUpdating ? 'disabled' : ''}>Salva</button>
            <button type="button" class="open-question-btn is-secondary" onclick="cancelPlanNotesEditFromEvent(event)" ${uiState.planNotes.isUpdating ? 'disabled' : ''}>Annulla</button>
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
          <input type="checkbox" value="${escapeHtml(candidate.id)}" ${dependsOnValue.includes(candidate.id) ? 'checked' : ''} ${uiState.taskField.isUpdating ? 'disabled' : ''}>
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
        ${uiState.isTaskFieldEditing(t.id, 'primary')
          ? `
            <div class="task-notes-form" onclick="event.stopPropagation()">
              <label class="open-question-label" for="task-title-${escapeHtml(t.id)}">Title</label>
              <input id="task-title-${escapeHtml(t.id)}" class="task-inline-input" type="text" value="${escapeHtml(titleValue)}" ${uiState.taskField.isUpdating ? 'disabled' : ''}>
              <label class="open-question-label" for="task-whatToDo-${escapeHtml(t.id)}">What to do</label>
              <textarea id="task-whatToDo-${escapeHtml(t.id)}" class="task-notes-input" rows="5" ${uiState.taskField.isUpdating ? 'disabled' : ''}>${escapeHtml(whatToDoValue)}</textarea>
              <div class="task-notes-actions">
                <button type="button" class="open-question-btn" onclick="saveTaskFieldByEncodedIds(event, '${encodeURIComponent(p.id)}', '${encodeURIComponent(t.id)}', 'primary')" ${uiState.taskField.isUpdating ? 'disabled' : ''}>Salva</button>
                <button type="button" class="open-question-btn is-secondary" onclick="cancelTaskFieldEditFromEvent(event)" ${uiState.taskField.isUpdating ? 'disabled' : ''}>Annulla</button>
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
            ${uiState.isTaskFieldEditing(t.id, 'phase')
              ? `
                <div class="task-meta-editor">
                  <input id="task-phase-${escapeHtml(t.id)}" type="hidden" value="${escapeHtml(phaseValue)}">
                  <div class="task-status-dropdown task-phase-dropdown${uiState.taskField.isUpdating ? ' is-updating' : ''}">
                    <button type="button" class="task-status-trigger task-phase-trigger" onclick="toggleTaskPhaseDropdown(this)" ${uiState.taskField.isUpdating ? 'disabled' : ''}>
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
                    <button type="button" class="open-question-btn" onclick="saveTaskFieldByEncodedIds(event, '${encodeURIComponent(p.id)}', '${encodeURIComponent(t.id)}', 'phase')" ${uiState.taskField.isUpdating ? 'disabled' : ''}>Salva</button>
                    <button type="button" class="open-question-btn is-secondary" onclick="cancelTaskFieldEditFromEvent(event)" ${uiState.taskField.isUpdating ? 'disabled' : ''}>Annulla</button>
                  </div>
                </div>
              `
              : `${phaseValue ? `<code>${escapeHtml(phaseValue)}</code>` : '<span class="task-meta-empty">-</span>'}<button type="button" class="icon-action-btn${phaseValue ? '' : ' is-add'}" onclick="enableTaskFieldEditByEncodedId(event, '${encodeURIComponent(t.id)}', 'phase')">${phaseValue ? '✎' : ADD_ICON_SVG}</button>`}
          </div>
        </div>
        <div class="task-meta-row">
          <span class="task-meta-label">Depends on</span>
          <div class="task-meta-value">
            ${uiState.isTaskFieldEditing(t.id, 'dependsOn')
              ? `
                <div class="task-meta-editor">
                  <div id="task-depends-on-editor-${escapeHtml(t.id)}" class="task-depends-on-options">${dependsOptions || '<div class="task-notes">Nessun task disponibile</div>'}</div>
                  <div class="task-notes-actions">
                    <button type="button" class="open-question-btn" onclick="saveTaskFieldByEncodedIds(event, '${encodeURIComponent(p.id)}', '${encodeURIComponent(t.id)}', 'dependsOn')" ${uiState.taskField.isUpdating ? 'disabled' : ''}>Salva</button>
                    <button type="button" class="open-question-btn is-secondary" onclick="cancelTaskFieldEditFromEvent(event)" ${uiState.taskField.isUpdating ? 'disabled' : ''}>Annulla</button>
                  </div>
                </div>
              `
              : `${dependsOnValue.length ? dependsOnValue.map(item => `<code>${escapeHtml(item)}</code>`).join(' ') : '<span class="task-meta-empty">-</span>'}<button type="button" class="icon-action-btn${dependsOnValue.length ? '' : ' is-add'}" onclick="enableTaskFieldEditByEncodedId(event, '${encodeURIComponent(t.id)}', 'dependsOn')">${dependsOnValue.length ? '✎' : ADD_ICON_SVG}</button>`}
          </div>
        </div>
        <div class="task-meta-row">
          <span class="task-meta-label">Files</span>
          <div class="task-meta-value">
            ${uiState.isTaskFieldEditing(t.id, 'files')
              ? `
                <div class="task-meta-editor">
                  <textarea id="task-files-${escapeHtml(t.id)}" class="task-notes-input" rows="4" ${uiState.taskField.isUpdating ? 'disabled' : ''}>${escapeHtml(filesValue.join('\n'))}</textarea>
                  <div class="task-notes-actions">
                    <button type="button" class="open-question-btn" onclick="saveTaskFieldByEncodedIds(event, '${encodeURIComponent(p.id)}', '${encodeURIComponent(t.id)}', 'files')" ${uiState.taskField.isUpdating ? 'disabled' : ''}>Salva</button>
                    <button type="button" class="open-question-btn is-secondary" onclick="cancelTaskFieldEditFromEvent(event)" ${uiState.taskField.isUpdating ? 'disabled' : ''}>Annulla</button>
                  </div>
                </div>
              `
              : `${filesValue.length ? filesValue.map(f => `<code>${escapeHtml(f)}</code>`).join(' ') : '<span class="task-meta-empty">-</span>'}<button type="button" class="icon-action-btn${filesValue.length ? '' : ' is-add'}" onclick="enableTaskFieldEditByEncodedId(event, '${encodeURIComponent(t.id)}', 'files')">${filesValue.length ? '✎' : ADD_ICON_SVG}</button>`}
          </div>
        </div>
        <div class="task-meta-row">
          <span class="task-meta-label">Endpoints</span>
          <div class="task-meta-value">
            ${uiState.isTaskFieldEditing(t.id, 'endpoints')
              ? `
                <div class="task-meta-editor">
                  <textarea id="task-endpoints-${escapeHtml(t.id)}" class="task-notes-input" rows="4" ${uiState.taskField.isUpdating ? 'disabled' : ''}>${escapeHtml((Array.isArray(t.endpoints) ? t.endpoints : []).join('\n'))}</textarea>
                  <div class="task-notes-actions">
                    <button type="button" class="open-question-btn" onclick="saveTaskFieldByEncodedIds(event, '${encodeURIComponent(p.id)}', '${encodeURIComponent(t.id)}', 'endpoints')" ${uiState.taskField.isUpdating ? 'disabled' : ''}>Salva</button>
                    <button type="button" class="open-question-btn is-secondary" onclick="cancelTaskFieldEditFromEvent(event)" ${uiState.taskField.isUpdating ? 'disabled' : ''}>Annulla</button>
                  </div>
                </div>
              `
              : `${t.endpoints?.length ? t.endpoints.map(e => `<code>${escapeHtml(e)}</code>`).join(' ') : '<span class="task-meta-empty">-</span>'}<button type="button" class="icon-action-btn${t.endpoints?.length ? '' : ' is-add'}" onclick="enableTaskFieldEditByEncodedId(event, '${encodeURIComponent(t.id)}', 'endpoints')">${t.endpoints?.length ? '✎' : ADD_ICON_SVG}</button>`}
          </div>
        </div>
      </div>



      ${t.definitionOfDone?.length ? `
        <div
          class="task-dod${uiState.taskDod.editingId === t.id ? ' is-editing' : ''}${uiState.taskDod.isUpdating ? ' is-busy' : ''}"
          data-task-id="${encodeURIComponent(t.id)}"
          role="button"
          tabindex="0"
          aria-label="Apri modalita modifica definition of done"
          aria-expanded="${uiState.taskDod.editingId === t.id ? 'true' : 'false'}"
          onclick="enableTaskDodEditByEncodedId('${encodeURIComponent(t.id)}')"
          onkeydown="handleTaskDodRegionKeydown(event, '${encodeURIComponent(t.id)}')">
          <div class="task-dod-title">
            <span>Definition of Done:</span>
            <span class="task-dod-hint">${uiState.taskDod.editingId === t.id ? 'Edit mode attiva' : 'Clicca per modificare'}</span>
            ${uiState.taskDod.editingId === t.id ? `<button type="button" class="task-dod-exit" onclick="disableTaskDodEditFromEvent(event)">Fine modifica</button>` : ''}
          </div>
          ${t.definitionOfDone.map((d, index) => uiState.taskDod.editingId === t.id
            ? `
              <button type="button" class="task-dod-item task-dod-toggle${d.completed ? ' is-completed' : ''}" onclick="toggleTaskDodItemByEncodedIds(event, '${encodeURIComponent(p.id)}', '${encodeURIComponent(t.id)}', ${index}, ${d.completed ? 'false' : 'true'})" onkeydown="handleAcceptanceItemKeydown(event)" ${uiState.taskDod.isUpdating ? 'disabled' : ''}>
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
      <details class="summary-block" ${uiState.taskNotes.openIds.has(t.id) || uiState.taskNotes.editingId === t.id || uiState.taskImplementationNotes.editingId === t.id ? 'open' : ''} ontoggle="handleTaskNotesDetailsToggleByEncodedId(event, '${encodeURIComponent(t.id)}')">
        <summary>Notes</summary>
        ${uiState.taskImplementationNotes.editingId === t.id ? `
          <div class="task-notes-form" onclick="event.stopPropagation()">
            <label class="open-question-label" for="task-implementation-notes-${escapeHtml(t.id)}">Implementation Notes</label>
            <textarea
              id="task-implementation-notes-${escapeHtml(t.id)}"
              class="task-notes-input"
              rows="5"
              ${uiState.taskImplementationNotes.isUpdating ? 'disabled' : ''}
            >${escapeHtml(t.implementationNotes || '')}</textarea>
            <div class="task-notes-actions">
              <button type="button" class="open-question-btn" onclick="saveTaskImplementationNotesByEncodedIds(event, '${encodeURIComponent(p.id)}', '${encodeURIComponent(t.id)}')" ${uiState.taskImplementationNotes.isUpdating ? 'disabled' : ''}>Salva</button>
              <button type="button" class="open-question-btn is-secondary" onclick="cancelTaskImplementationNotesEditFromEvent(event)" ${uiState.taskImplementationNotes.isUpdating ? 'disabled' : ''}>Annulla</button>
            </div>
          </div>
        ` : `
          <div class="task-notes-title-row">
            <strong>Implementation Notes</strong>
            <button type="button" class="icon-action-btn${t.implementationNotes ? '' : ' is-add'}" onclick="enableTaskImplementationNotesEditByEncodedId(event, '${encodeURIComponent(t.id)}')" aria-label="${t.implementationNotes ? 'Modifica implementation notes' : 'Aggiungi implementation notes'}" title="${t.implementationNotes ? 'Modifica implementation notes' : 'Aggiungi implementation notes'}">${t.implementationNotes ? '✎' : ADD_ICON_SVG}</button>
          </div>
          ${t.implementationNotes ? `<div class="task-notes">${escapeHtml(t.implementationNotes)}</div>` : ''}
        `}
        ${uiState.taskNotes.editingId === t.id ? `
          <div class="task-notes-form" onclick="event.stopPropagation()">
            <label class="open-question-label" for="task-notes-${escapeHtml(t.id)}">Task Notes</label>
            <textarea
              id="task-notes-${escapeHtml(t.id)}"
              class="task-notes-input"
              rows="5"
              ${uiState.taskNotes.isUpdating ? 'disabled' : ''}
            >${escapeHtml(t.notes || '')}</textarea>
            <div class="task-notes-actions">
              <button type="button" class="open-question-btn" onclick="saveTaskNotesByEncodedIds(event, '${encodeURIComponent(p.id)}', '${encodeURIComponent(t.id)}')" ${uiState.taskNotes.isUpdating ? 'disabled' : ''}>Salva</button>
              <button type="button" class="open-question-btn is-secondary" onclick="cancelTaskNotesEditFromEvent(event)" ${uiState.taskNotes.isUpdating ? 'disabled' : ''}>Annulla</button>
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

  document.getElementById('decisionsList').innerHTML = renderPlanDecisionItemsRenderer(Array.isArray(p.decisions) ? p.decisions : [], { escapeHtml, ADD_ICON_SVG });

  restoreTaskDodFocusIfNeeded();
  buildRightNav();
}

function renderPlanDecisionItemsRenderer(items, { escapeHtml, ADD_ICON_SVG }) {
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
  if (!items.length) return `${actions}<p class="empty-state">No decisions recorded</p>${renderDeletePlanDecisionModalRenderer({ escapeHtml })}`;
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
  }).join('')}</div>${renderDeletePlanDecisionModalRenderer({ escapeHtml })}`;
}

function renderDeletePlanDecisionModalRenderer({ escapeHtml }) {
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

export { renderPlanDetailRenderer, renderPlanDecisionItemsRenderer, renderDeletePlanDecisionModalRenderer };
