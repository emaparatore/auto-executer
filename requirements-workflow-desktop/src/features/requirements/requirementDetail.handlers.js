function createRequirementDetailHandlers(deps) {
  const { readState, writeState, syncCoreState, renderRequirementDetail, showToast, uiState } = deps;

  function getRequirementContext() {
    const state = readState();
    return {
      currentRequirement: state.currentRequirement,
      currentSection: state.currentSection
    };
  }

  function requireRequirementsSection() {
    const { currentRequirement, currentSection } = getRequirementContext();
    if (!currentRequirement || currentSection !== 'requirements') return null;
    return currentRequirement;
  }

  function setCurrentRequirement(nextRequirement, reason) {
    writeState({ currentRequirement: nextRequirement });
    syncCoreState({ currentRequirement: nextRequirement }, reason);
  }

  async function refreshRequirement(requirementId, reason) {
    const [updatedRequirementRes] = await Promise.all([
      fetch(`/api/requirements/${encodeURIComponent(requirementId)}`, { cache: 'no-store' }),
      typeof deps.loadRequirements === 'function' ? deps.loadRequirements() : Promise.resolve()
    ]);
    if (!updatedRequirementRes.ok) throw new Error('Unable to refresh requirement');
    const updatedRequirement = await updatedRequirementRes.json();
    setCurrentRequirement(updatedRequirement, reason);
    document.querySelector(`.plan-item[data-id="${CSS.escape(requirementId)}"]`)?.classList.add('active');
    return updatedRequirement;
  }

  function enableRequirementOverviewEdit() {
    const currentRequirement = requireRequirementsSection();
    if (!currentRequirement || uiState.requirementOverview.isUpdating) return;
    if (uiState.requirementOverview.isEditing) return;
    uiState.requirementOverview.isEditing = true;
    renderRequirementDetail();
  }

  function enableRequirementOverviewEditFromEvent(event) {
    event.stopPropagation();
    enableRequirementOverviewEdit();
  }

  function cancelRequirementOverviewEdit() {
    const currentRequirement = requireRequirementsSection();
    if (!currentRequirement || uiState.requirementOverview.isUpdating) return;
    if (!uiState.requirementOverview.isEditing) return;
    uiState.requirementOverview.isEditing = false;
    renderRequirementDetail();
  }

  function cancelRequirementOverviewEditFromEvent(event) {
    event.stopPropagation();
    cancelRequirementOverviewEdit();
  }

  async function saveRequirementOverview() {
    const currentRequirement = requireRequirementsSection();
    if (!currentRequirement || !uiState.requirementOverview.isEditing || uiState.requirementOverview.isUpdating) return;
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

      await refreshRequirement(requirementId, 'requirementDetail.handlers:saveRequirementOverview:refreshRequirement');
      uiState.requirementOverview.isEditing = false;
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
    const currentRequirement = requireRequirementsSection();
    if (!currentRequirement || uiState.requirementCurrentState.isUpdating) return;
    if (uiState.requirementCurrentState.isEditing) return;
    uiState.requirementCurrentState.isEditing = true;
    renderRequirementDetail();
  }

  function enableRequirementCurrentStateEditFromEvent(event) {
    event.stopPropagation();
    enableRequirementCurrentStateEdit();
  }

  function cancelRequirementCurrentStateEdit() {
    const currentRequirement = requireRequirementsSection();
    if (!currentRequirement || uiState.requirementCurrentState.isUpdating) return;
    if (!uiState.requirementCurrentState.isEditing) return;
    uiState.requirementCurrentState.isEditing = false;
    renderRequirementDetail();
  }

  function cancelRequirementCurrentStateEditFromEvent(event) {
    event.stopPropagation();
    cancelRequirementCurrentStateEdit();
  }

  async function saveRequirementCurrentState() {
    const currentRequirement = requireRequirementsSection();
    if (!currentRequirement || !uiState.requirementCurrentState.isEditing || uiState.requirementCurrentState.isUpdating) return;
    const rows = Array.from(document.querySelectorAll('#requirement-current-state-body tr'));
    if (!rows.length) return showToast('Aggiungi almeno una riga per il current state', 'error');

    const parsed = rows
      .map(row => {
        const area = String(row.querySelector('[data-field="area"]')?.value || '').trim();
        const status = String(row.querySelector('[data-field="status"]')?.value || '').trim();
        const notes = String(row.querySelector('[data-field="notes"]')?.value || '').trim();
        return { area, status, notes };
      })
      .filter(item => item.area || item.status || item.notes);

    if (!parsed.length) return showToast('Inserisci almeno una riga compilata', 'error');
    if (parsed.some(item => !item.area || !item.status || !item.notes)) {
      return showToast('Compila Area, Status e Notes per ogni riga', 'error');
    }

    const previousCurrentState = Array.isArray(currentRequirement.currentState) ? currentRequirement.currentState : [];
    currentRequirement.currentState = parsed;
    uiState.requirementCurrentState.isUpdating = true;
    renderRequirementDetail();

    try {
      const requirementId = currentRequirement.document?.id || currentRequirement.id;
      if (!requirementId) throw new Error('Requirement ID non trovato');
      const res = await fetch(`/api/requirements/${encodeURIComponent(requirementId)}/current-state`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentState: parsed })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Unable to update requirement current state');
      }

      await refreshRequirement(requirementId, 'requirementDetail.handlers:saveRequirementCurrentState:refreshRequirement');
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

  function saveRequirementCurrentStateFromEvent(event) {
    event.stopPropagation();
    saveRequirementCurrentState();
  }

  function addRequirementCurrentStateRow() {
    const currentRequirement = requireRequirementsSection();
    if (!currentRequirement || !uiState.requirementCurrentState.isEditing || uiState.requirementCurrentState.isUpdating) return;
    const body = document.getElementById('requirement-current-state-body');
    if (!body) return;
    body.insertAdjacentHTML(
      'beforeend',
      `
        <tr>
          <td><input type="text" class="plan-notes-input current-state-input" data-field="area" value=""></td>
          <td><input type="text" class="plan-notes-input current-state-input" data-field="status" value=""></td>
          <td><textarea class="plan-notes-input current-state-input current-state-notes-input" data-field="notes" rows="2"></textarea></td>
          <td class="current-state-row-actions">
            <button type="button" class="open-question-btn is-secondary current-state-row-remove" onclick="removeRequirementCurrentStateRowFromEvent(event)">Rimuovi</button>
          </td>
        </tr>
      `
    );
  }

  function addRequirementCurrentStateRowFromEvent(event) {
    event.stopPropagation();
    addRequirementCurrentStateRow();
  }

  function removeRequirementCurrentStateRow(targetRow) {
    const currentRequirement = requireRequirementsSection();
    if (!currentRequirement || !uiState.requirementCurrentState.isEditing || uiState.requirementCurrentState.isUpdating) return;
    const rows = Array.from(document.querySelectorAll('#requirement-current-state-body tr'));
    if (rows.length <= 1) return showToast('Deve rimanere almeno una riga', 'error');
    if (!targetRow) return;
    targetRow.remove();
  }

  function removeRequirementCurrentStateRowFromEvent(event) {
    event.stopPropagation();
    removeRequirementCurrentStateRow(event.currentTarget?.closest('tr'));
  }

  function enableRequirementNotesEdit() {
    const currentRequirement = requireRequirementsSection();
    if (!currentRequirement || uiState.requirementNotes.isUpdating) return;
    if (uiState.requirementNotes.isEditing) return;
    uiState.requirementNotes.isEditing = true;
    renderRequirementDetail();
  }

  function enableRequirementNotesEditFromEvent(event) {
    event.stopPropagation();
    enableRequirementNotesEdit();
  }

  function cancelRequirementNotesEdit() {
    const currentRequirement = requireRequirementsSection();
    if (!currentRequirement || uiState.requirementNotes.isUpdating) return;
    if (!uiState.requirementNotes.isEditing) return;
    uiState.requirementNotes.isEditing = false;
    renderRequirementDetail();
  }

  function cancelRequirementNotesEditFromEvent(event) {
    event.stopPropagation();
    cancelRequirementNotesEdit();
  }

  async function saveRequirementNotes() {
    const currentRequirement = requireRequirementsSection();
    if (!currentRequirement || !uiState.requirementNotes.isEditing || uiState.requirementNotes.isUpdating) return;
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
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: parsed })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Unable to update requirement notes');
      }

      await refreshRequirement(requirementId, 'requirementDetail.handlers:saveRequirementNotes:refreshRequirement');
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

  return {
    enableRequirementOverviewEditFromEvent,
    cancelRequirementOverviewEditFromEvent,
    saveRequirementOverviewFromEvent,
    enableRequirementCurrentStateEditFromEvent,
    cancelRequirementCurrentStateEditFromEvent,
    addRequirementCurrentStateRowFromEvent,
    removeRequirementCurrentStateRowFromEvent,
    saveRequirementCurrentStateFromEvent,
    enableRequirementNotesEditFromEvent,
    cancelRequirementNotesEditFromEvent,
    saveRequirementNotesFromEvent
  };
}

export { createRequirementDetailHandlers };
