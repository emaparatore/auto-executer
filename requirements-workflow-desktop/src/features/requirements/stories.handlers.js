function createStoriesHandlers(deps) {
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

  function enableStoryCreateFromEvent(event) {
    event.stopPropagation();
    const currentRequirement = requireRequirementsSection();
    if (!currentRequirement || uiState.story.isUpdating) return;
    uiState.story.creating = true;
    uiState.story.createStep = 'id';
    uiState.story.newId = 'US-';
    renderRequirementDetail();
    setTimeout(() => {
      const el = document.getElementById('new-story-id');
      if (!el) return;
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    }, 0);
  }

  function cancelStoryCreateFromEvent(event) {
    event.stopPropagation();
    uiState.story.creating = false;
    uiState.story.createStep = 'id';
    uiState.story.newId = '';
    renderRequirementDetail();
  }

  function proceedStoryCreateFromEvent(event) {
    event.stopPropagation();
    const currentRequirement = requireRequirementsSection();
    if (!currentRequirement || uiState.story.isUpdating) return;
    const id = String(document.getElementById('new-story-id')?.value || '').trim();
    if (!id) return showToast('Inserisci un ID', 'error');
    if ((currentRequirement.userStories || []).some(s => s.id === id)) return showToast('ID gia presente', 'error');
    uiState.story.newId = id;
    uiState.story.createStep = 'details';
    renderRequirementDetail();
  }

  function enableStoryEditByEncodedId(event, encodedStoryId) {
    event.stopPropagation();
    const currentRequirement = requireRequirementsSection();
    if (!currentRequirement || uiState.story.isUpdating) return;
    uiState.story.editingId = decodeURIComponent(encodedStoryId);
    renderRequirementDetail();
  }

  function cancelStoryEditFromEvent(event) {
    event.stopPropagation();
    uiState.story.editingId = null;
    renderRequirementDetail();
  }

  function addStoryCriterionFromEvent(event, encodedStoryId) {
    event.stopPropagation();
    const id = decodeURIComponent(encodedStoryId);
    const container = document.getElementById(`story-criteria-${encodeURIComponent(id)}`);
    if (!container) return;
    container.insertAdjacentHTML(
      'beforeend',
      `<div class="criterion-row"><input type="text" class="plan-notes-input compact-input" data-criterion-input="${encodeURIComponent(id)}" value=""><button type="button" class="open-question-btn is-secondary" onclick="removeStoryCriterionFromEvent(event, '${encodeURIComponent(id)}')">Rimuovi</button></div>`
    );
  }

  function removeStoryCriterionFromEvent(event, encodedStoryId) {
    event.stopPropagation();
    const row = event.currentTarget?.closest('div');
    const container = document.getElementById(`story-criteria-${encodedStoryId}`);
    if (!row || !container) return;
    const rows = container.querySelectorAll('[data-criterion-input]');
    if (rows.length <= 1) return showToast('Deve rimanere almeno un criterio', 'error');
    row.remove();
  }

  async function saveStoryByEncodedId(event, encodedStoryId) {
    event.stopPropagation();
    const storyId = decodeURIComponent(encodedStoryId);
    const currentRequirement = requireRequirementsSection();
    if (!currentRequirement || uiState.story.isUpdating) return;
    const requirementId = currentRequirement.document?.id || currentRequirement.id;
    if (!requirementId) return;

    const payload = {
      title: String(document.getElementById(`story-title-${encodeURIComponent(storyId)}`)?.value || ''),
      asA: String(document.getElementById(`story-asa-${encodeURIComponent(storyId)}`)?.value || ''),
      iWant: String(document.getElementById(`story-iwant-${encodeURIComponent(storyId)}`)?.value || ''),
      soThat: String(document.getElementById(`story-sothat-${encodeURIComponent(storyId)}`)?.value || '')
    };
    const criteria = Array.from(document.querySelectorAll(`#story-criteria-${encodeURIComponent(storyId)} [data-criterion-input]`))
      .map(el => String(el.value || '').trim())
      .filter(Boolean);
    if (!criteria.length) return showToast('Inserisci almeno un acceptance criterion', 'error');
    payload.acceptanceCriteria = criteria;

    uiState.story.isUpdating = true;
    renderRequirementDetail();

    try {
      const res = await fetch(`/api/requirements/${encodeURIComponent(requirementId)}/stories/${encodeURIComponent(storyId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Unable to update story');
      }

      await refreshRequirement(requirementId, 'stories.handlers:saveStory:refreshRequirement');
      uiState.story.editingId = null;
      showToast('User story aggiornata');
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      uiState.story.isUpdating = false;
      renderRequirementDetail();
    }
  }

  async function createStoryFromEvent(event) {
    event.stopPropagation();
    const currentRequirement = requireRequirementsSection();
    if (!currentRequirement || uiState.story.isUpdating) return;
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

    const criteria = Array.from(document.querySelectorAll('#story-criteria-new [data-criterion-input]'))
      .map(el => String(el.value || '').trim())
      .filter(Boolean);
    if (!criteria.length) return showToast('Inserisci almeno un acceptance criterion', 'error');
    payload.acceptanceCriteria = criteria;

    uiState.story.isUpdating = true;
    renderRequirementDetail();

    try {
      const res = await fetch(`/api/requirements/${encodeURIComponent(requirementId)}/stories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Unable to create story');
      }

      await refreshRequirement(requirementId, 'stories.handlers:createStory:refreshRequirement');
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

  function requestDeleteStoryByEncodedId(event, encodedStoryId) {
    event.stopPropagation();
    const currentRequirement = requireRequirementsSection();
    if (!currentRequirement || uiState.story.isUpdating) return;
    uiState.story.deletingId = decodeURIComponent(encodedStoryId);
    renderRequirementDetail();
  }

  function closeDeleteStoryModalFromEvent(event) {
    event.stopPropagation();
    uiState.story.deletingId = null;
    renderRequirementDetail();
  }

  async function confirmDeleteStoryFromEvent(event) {
    event.stopPropagation();
    const currentRequirement = requireRequirementsSection();
    if (!currentRequirement || uiState.story.isUpdating) return;
    const storyId = uiState.story.deletingId;
    if (!storyId) return;
    const requirementId = currentRequirement.document?.id || currentRequirement.id;
    if (!requirementId) return;

    uiState.story.deletingId = null;
    uiState.story.isUpdating = true;
    renderRequirementDetail();

    try {
      const res = await fetch(`/api/requirements/${encodeURIComponent(requirementId)}/stories/${encodeURIComponent(storyId)}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Unable to delete story');
      }

      await refreshRequirement(requirementId, 'stories.handlers:confirmDeleteStory:refreshRequirement');
      showToast('User story eliminata');
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      uiState.story.isUpdating = false;
      renderRequirementDetail();
    }
  }

  async function toggleAcceptanceCriterion(requirementId, storyId, criterionIndex, checked) {
    const currentRequirement = requireRequirementsSection();
    if (!currentRequirement || uiState.acceptance.isUpdating) return;

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

      await refreshRequirement(requirementId, 'stories.handlers:toggleAcceptanceCriterion:refreshRequirement');
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

  function enableAcceptanceEditByEncodedId(encodedStoryId) {
    const currentRequirement = requireRequirementsSection();
    if (!currentRequirement) return;
    const storyId = decodeURIComponent(encodedStoryId);
    if (uiState.acceptance.editingStoryId === storyId) return;
    uiState.acceptance.editingStoryId = storyId;
    renderRequirementDetail();
  }

  function handleAcceptanceRegionKeydown(event, encodedStoryId) {
    if (event.target !== event.currentTarget) return;
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    enableAcceptanceEditByEncodedId(encodedStoryId);
  }

  function disableAcceptanceEdit() {
    const currentRequirement = requireRequirementsSection();
    if (!currentRequirement) return;
    if (!uiState.acceptance.editingStoryId) return;
    uiState.acceptance.editingStoryId = null;
    uiState.acceptance.focusTarget = null;
    renderRequirementDetail();
  }

  function disableAcceptanceEditFromEvent(event) {
    event.stopPropagation();
    disableAcceptanceEdit();
  }

  return {
    enableStoryCreateFromEvent,
    cancelStoryCreateFromEvent,
    proceedStoryCreateFromEvent,
    enableStoryEditByEncodedId,
    cancelStoryEditFromEvent,
    addStoryCriterionFromEvent,
    removeStoryCriterionFromEvent,
    saveStoryByEncodedId,
    createStoryFromEvent,
    requestDeleteStoryByEncodedId,
    closeDeleteStoryModalFromEvent,
    confirmDeleteStoryFromEvent,
    toggleAcceptanceCriterionByEncodedIds,
    enableAcceptanceEditByEncodedId,
    handleAcceptanceRegionKeydown,
    disableAcceptanceEditFromEvent
  };
}

export { createStoriesHandlers };
