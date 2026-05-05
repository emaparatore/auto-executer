import { uiState } from '/src/state/uiState.js';

function renderDeleteFunctionalRequirementModal({ escapeHtml }) {
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

function renderRequirementItems({ items, emptyText, isFunctional = false, escapeHtml, ADD_ICON_SVG }) {
  const actions = isFunctional
    ? `
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
    `
    : '';

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
  `).join('')}</div>${isFunctional ? renderDeleteFunctionalRequirementModal({ escapeHtml }) : ''}`;
}

function renderDeleteNonFunctionalRequirementModal({ escapeHtml }) {
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

function renderNonFunctionalRequirementItems({ items, emptyText, escapeHtml, ADD_ICON_SVG }) {
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
  `).join('')}</div>${renderDeleteNonFunctionalRequirementModal({ escapeHtml })}`;
}

function renderStoryEditForm({ story, escapeHtml }) {
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

function renderStoryCreateBox({ escapeHtml, ADD_ICON_SVG }) {
  const editForm = renderStoryEditForm({
    story: { id: 'new', title: '', asA: '', iWant: '', soThat: '' },
    escapeHtml
  })
    .replace("saveStoryByEncodedId(event, 'new')", 'createStoryFromEvent(event)')
    .replace('cancelStoryEditFromEvent(event)', 'cancelStoryCreateFromEvent(event)');

  return `<div class="section-title-row compact"><div class="section-title">User stories</div><button type="button" class="icon-action-btn is-add" onclick="enableStoryCreateFromEvent(event)" ${uiState.story.isUpdating ? 'disabled' : ''}>${ADD_ICON_SVG}</button></div>${uiState.story.creating ? `<div class="task-item"><div class="task-header"><span class="task-id">Nuova user story</span></div><div class="plan-notes-form">${uiState.story.createStep === 'id' ? `<label class="open-question-label" for="new-story-id">ID</label><input id="new-story-id" type="text" class="plan-notes-input compact-input" value="${escapeHtml(uiState.story.newId)}" ${uiState.story.isUpdating ? 'disabled' : ''}><div class="plan-notes-actions"><button type="button" class="open-question-btn" onclick="proceedStoryCreateFromEvent(event)" ${uiState.story.isUpdating ? 'disabled' : ''}>Avanti</button><button type="button" class="open-question-btn is-secondary" onclick="cancelStoryCreateFromEvent(event)" ${uiState.story.isUpdating ? 'disabled' : ''}>Annulla</button></div>` : `<div class="task-header task-header-tight"><span class="task-id">ID: ${escapeHtml(uiState.story.newId)}</span></div>${editForm}</div>`}</div></div><div class="spacer-20"></div>` : ''}`;
}

function renderDeleteStoryModal({ escapeHtml }) {
  if (!uiState.story.deletingId) return '';
  return `<div class="confirm-modal-overlay" onclick="closeDeleteStoryModalFromEvent(event)"><div class="confirm-modal" role="dialog" aria-modal="true" tabindex="-1" onclick="event.stopPropagation()"><button type="button" class="confirm-modal-close" onclick="closeDeleteStoryModalFromEvent(event)">×</button><div class="confirm-modal-title">Conferma eliminazione</div><div class="confirm-modal-text">Vuoi eliminare la user story <strong>${escapeHtml(uiState.story.deletingId)}</strong>?</div><div class="plan-notes-actions confirm-modal-actions"><button type="button" class="open-question-btn is-danger" onclick="confirmDeleteStoryFromEvent(event)">Elimina</button><button type="button" class="open-question-btn is-secondary" onclick="closeDeleteStoryModalFromEvent(event)">Annulla</button></div></div></div>`;
}

function renderDeleteOpenQuestionModal({ escapeHtml }) {
  if (!uiState.openQuestion.deletingId) return '';
  return `<div class="confirm-modal-overlay" onclick="closeDeleteOpenQuestionModalFromEvent(event)"><div class="confirm-modal" role="dialog" aria-modal="true" tabindex="-1" onclick="event.stopPropagation()"><button type="button" class="confirm-modal-close" onclick="closeDeleteOpenQuestionModalFromEvent(event)">x</button><div class="confirm-modal-title">Conferma eliminazione</div><div class="confirm-modal-text">Vuoi eliminare la open question <strong>${escapeHtml(uiState.openQuestion.deletingId)}</strong>?</div><div class="plan-notes-actions confirm-modal-actions"><button type="button" class="open-question-btn is-danger" onclick="confirmDeleteOpenQuestionFromEvent(event)">Elimina</button><button type="button" class="open-question-btn is-secondary" onclick="closeDeleteOpenQuestionModalFromEvent(event)">Annulla</button></div></div></div>`;
}

export function renderRequirementDetailRenderer({
  requirement,
  escapeHtml,
  formatStatus,
  ADD_ICON_SVG,
  OPEN_QUESTION_STATUSES,
  showDetail,
  configureRequirementTabs,
  restoreAcceptanceFocusIfNeeded,
  buildRightNav
}) {
  const data = requirement;
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

  document.getElementById('functionalList').innerHTML = renderRequirementItems({ items: rf, emptyText: 'No functional requirements', isFunctional: true, escapeHtml, ADD_ICON_SVG });
  document.getElementById('nonFunctionalList').innerHTML = renderNonFunctionalRequirementItems({ items: rnf, emptyText: 'No non-functional requirements', escapeHtml, ADD_ICON_SVG });

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

  document.getElementById('userStoriesRequirementsList').innerHTML = `${renderStoryCreateBox({ escapeHtml, ADD_ICON_SVG })}${stories.length
    ? stories.map(story => `
      <div class="task-item" id="anchor-userstory-${escapeHtml(story.id)}">
        <div class="task-header"><span class="task-id">${escapeHtml(story.id)}</span>${uiState.story.editingId !== story.id ? `<span class="inline-actions"><button type="button" class="icon-action-btn" onclick="enableStoryEditByEncodedId(event, '${encodeURIComponent(story.id)}')">✎</button><button type="button" class="icon-action-btn" onclick="requestDeleteStoryByEncodedId(event, '${encodeURIComponent(story.id)}')"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"></polyline><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"></path><path d="M19 6l-1 14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1L5 6"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg></button></span>` : ''}</div>
        ${uiState.story.editingId === story.id ? renderStoryEditForm({ story, escapeHtml }) : `<div class="task-title">${escapeHtml(story.title || '')}</div>
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
    : '<p class="empty-state">No user stories</p>'}${renderDeleteStoryModal({ escapeHtml })}`;

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
    : '<p class="empty-state">No open questions</p>'}${renderDeleteOpenQuestionModal({ escapeHtml })}`;

  restoreAcceptanceFocusIfNeeded();
  buildRightNav();
}
