function createSubRequirementsHandlers(deps) {
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

  function enableCreateFunctionalRequirement() {
    const currentRequirement = requireRequirementsSection();
    if (!currentRequirement || uiState.functionalRequirement.isUpdating) return;
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
    const currentRequirement = requireRequirementsSection();
    if (!currentRequirement || uiState.functionalRequirement.isUpdating) return;
    const idEl = document.getElementById('new-functional-requirement-id');
    const functionalId = String(idEl?.value || '').trim();
    if (!functionalId) return showToast('Inserisci un ID', 'error');
    if ((currentRequirement.functionalRequirements || []).some(item => item.id === functionalId)) {
      return showToast('ID gia presente', 'error');
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
    const currentRequirement = requireRequirementsSection();
    if (!currentRequirement || uiState.functionalRequirement.isUpdating) return;
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
    const currentRequirement = requireRequirementsSection();
    if (!currentRequirement || uiState.functionalRequirement.isUpdating) return;
    const requirementId = currentRequirement.document?.id || currentRequirement.id;
    if (!requirementId) return;
    const functionalId = String(uiState.functionalRequirement.newId || '').trim();
    if (!functionalId) return showToast('Inserisci un ID', 'error');
    if ((currentRequirement.functionalRequirements || []).some(item => item.id === functionalId)) {
      return showToast('ID gia presente', 'error');
    }

    const titleEl = document.getElementById('new-functional-requirement-title');
    const descriptionEl = document.getElementById('new-functional-requirement-description');
    const title = String(titleEl?.value || '').trim();
    const description = String(descriptionEl?.value || '').trim();
    if (!title || !description) return showToast('Titolo e descrizione sono obbligatori', 'error');

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

      await refreshRequirement(requirementId, 'subRequirements.handlers:createFunctionalRequirement:refreshRequirement');

      uiState.functionalRequirement.creating = false;
      uiState.functionalRequirement.newId = '';
      uiState.functionalRequirement.createStep = 'id';
      uiState.functionalRequirement.newTitle = '';
      uiState.functionalRequirement.newDescription = '';

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
    const currentRequirement = requireRequirementsSection();
    if (!currentRequirement || !functionalId || uiState.functionalRequirement.isUpdating) return;
    uiState.functionalRequirement.editingId = functionalId;
    renderRequirementDetail();
  }

  function editFunctionalRequirementByEncodedId(event, encodedFunctionalId) {
    event.stopPropagation();
    editFunctionalRequirement(decodeURIComponent(encodedFunctionalId));
  }

  function cancelFunctionalRequirementEditFromEvent(event) {
    event.stopPropagation();
    uiState.functionalRequirement.editingId = null;
    renderRequirementDetail();
  }

  async function saveFunctionalRequirement(functionalId) {
    const currentRequirement = requireRequirementsSection();
    if (!currentRequirement || !functionalId || uiState.functionalRequirement.isUpdating) return;
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

      await refreshRequirement(requirementId, 'subRequirements.handlers:saveFunctionalRequirement:refreshRequirement');
      uiState.functionalRequirement.editingId = null;
      renderRequirementDetail();
      showToast('Requisito funzionale aggiornato');
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      uiState.functionalRequirement.isUpdating = false;
      renderRequirementDetail();
    }
  }

  function saveFunctionalRequirementByEncodedId(event, encodedFunctionalId) {
    event.stopPropagation();
    saveFunctionalRequirement(decodeURIComponent(encodedFunctionalId));
  }

  async function deleteFunctionalRequirement(functionalId) {
    const currentRequirement = requireRequirementsSection();
    if (!currentRequirement || !functionalId || uiState.functionalRequirement.isUpdating) return;
    const requirementId = currentRequirement.document?.id || currentRequirement.id;
    if (!requirementId) return;

    uiState.functionalRequirement.isUpdating = true;
    renderRequirementDetail();

    try {
      const res = await fetch(`/api/requirements/${encodeURIComponent(requirementId)}/functional-requirements/${encodeURIComponent(functionalId)}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Unable to delete functional requirement');
      }

      await refreshRequirement(requirementId, 'subRequirements.handlers:deleteFunctionalRequirement:refreshRequirement');
      if (uiState.functionalRequirement.editingId === functionalId) uiState.functionalRequirement.editingId = null;
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
    const currentRequirement = requireRequirementsSection();
    if (!currentRequirement || !functionalId || uiState.functionalRequirement.isUpdating) return;
    uiState.functionalRequirement.modalReturnFocusEl = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    uiState.functionalRequirement.deletingId = functionalId;
    renderRequirementDetail();
    setTimeout(() => {
      const cancelBtn = document.querySelector('.confirm-modal [data-modal-focus="last"]');
      const dialog = document.querySelector('.confirm-modal');
      if (cancelBtn instanceof HTMLElement) return cancelBtn.focus();
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

  function enableCreateNonFunctionalRequirementFromEvent(event) {
    event.stopPropagation();
    const currentRequirement = requireRequirementsSection();
    if (!currentRequirement || uiState.nonFunctionalRequirement.isUpdating) return;
    uiState.nonFunctionalRequirement.creating = true;
    uiState.nonFunctionalRequirement.newId = 'RNF-';
    uiState.nonFunctionalRequirement.createStep = 'id';
    uiState.nonFunctionalRequirement.newTitle = '';
    uiState.nonFunctionalRequirement.newDescription = '';
    renderRequirementDetail();
    setTimeout(() => {
      const idInput = document.getElementById('new-non-functional-requirement-id');
      if (!idInput) return;
      idInput.focus();
      const cursor = idInput.value.length;
      idInput.setSelectionRange(cursor, cursor);
    }, 0);
  }

  function cancelCreateNonFunctionalRequirementFromEvent(event) {
    event.stopPropagation();
    uiState.nonFunctionalRequirement.creating = false;
    uiState.nonFunctionalRequirement.newId = '';
    uiState.nonFunctionalRequirement.createStep = 'id';
    uiState.nonFunctionalRequirement.newTitle = '';
    uiState.nonFunctionalRequirement.newDescription = '';
    renderRequirementDetail();
  }

  function proceedCreateNonFunctionalRequirementFromEvent(event) {
    event.stopPropagation();
    const currentRequirement = requireRequirementsSection();
    if (!currentRequirement || uiState.nonFunctionalRequirement.isUpdating) return;
    const idEl = document.getElementById('new-non-functional-requirement-id');
    const nonFunctionalId = String(idEl?.value || '').trim();
    if (!nonFunctionalId) return showToast('Inserisci un ID', 'error');
    if ((currentRequirement.nonFunctionalRequirements || []).some(item => item.id === nonFunctionalId)) {
      return showToast('ID gia presente', 'error');
    }
    uiState.nonFunctionalRequirement.newId = nonFunctionalId;
    uiState.nonFunctionalRequirement.createStep = 'details';
    renderRequirementDetail();
    setTimeout(() => document.getElementById('new-non-functional-requirement-title')?.focus(), 0);
  }

  function backCreateNonFunctionalRequirementFromEvent(event) {
    event.stopPropagation();
    const currentRequirement = requireRequirementsSection();
    if (!currentRequirement || uiState.nonFunctionalRequirement.isUpdating) return;
    const titleEl = document.getElementById('new-non-functional-requirement-title');
    const descriptionEl = document.getElementById('new-non-functional-requirement-description');
    uiState.nonFunctionalRequirement.newTitle = String(titleEl?.value || '').trim();
    uiState.nonFunctionalRequirement.newDescription = String(descriptionEl?.value || '').trim();
    uiState.nonFunctionalRequirement.createStep = 'id';
    renderRequirementDetail();
    setTimeout(() => {
      const idInput = document.getElementById('new-non-functional-requirement-id');
      if (!idInput) return;
      idInput.focus();
      const cursor = idInput.value.length;
      idInput.setSelectionRange(cursor, cursor);
    }, 0);
  }

  async function createNonFunctionalRequirementFromEvent(event) {
    event.stopPropagation();
    const currentRequirement = requireRequirementsSection();
    if (!currentRequirement || uiState.nonFunctionalRequirement.isUpdating) return;
    const requirementId = currentRequirement.document?.id || currentRequirement.id;
    if (!requirementId) return;

    const nonFunctionalId = String(uiState.nonFunctionalRequirement.newId || '').trim();
    if (!nonFunctionalId) return showToast('Inserisci un ID', 'error');
    if ((currentRequirement.nonFunctionalRequirements || []).some(item => item.id === nonFunctionalId)) {
      return showToast('ID gia presente', 'error');
    }

    const titleEl = document.getElementById('new-non-functional-requirement-title');
    const descriptionEl = document.getElementById('new-non-functional-requirement-description');
    const title = String(titleEl?.value || '').trim();
    const description = String(descriptionEl?.value || '').trim();
    if (!title || !description) return showToast('Titolo e descrizione sono obbligatori', 'error');

    uiState.nonFunctionalRequirement.newTitle = title;
    uiState.nonFunctionalRequirement.newDescription = description;
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

      await refreshRequirement(requirementId, 'subRequirements.handlers:createNonFunctionalRequirement:refreshRequirement');

      uiState.nonFunctionalRequirement.creating = false;
      uiState.nonFunctionalRequirement.newId = '';
      uiState.nonFunctionalRequirement.createStep = 'id';
      uiState.nonFunctionalRequirement.newTitle = '';
      uiState.nonFunctionalRequirement.newDescription = '';

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

  function editNonFunctionalRequirementByEncodedId(event, encodedNonFunctionalId) {
    event.stopPropagation();
    const currentRequirement = requireRequirementsSection();
    if (!currentRequirement || uiState.nonFunctionalRequirement.isUpdating) return;
    uiState.nonFunctionalRequirement.editingId = decodeURIComponent(encodedNonFunctionalId);
    renderRequirementDetail();
  }

  function cancelNonFunctionalRequirementEditFromEvent(event) {
    event.stopPropagation();
    uiState.nonFunctionalRequirement.editingId = null;
    renderRequirementDetail();
  }

  async function saveNonFunctionalRequirementByEncodedId(event, encodedNonFunctionalId) {
    event.stopPropagation();
    const nonFunctionalId = decodeURIComponent(encodedNonFunctionalId);
    const currentRequirement = requireRequirementsSection();
    if (!currentRequirement || uiState.nonFunctionalRequirement.isUpdating) return;
    const requirementId = currentRequirement.document?.id || currentRequirement.id;
    if (!requirementId) return;

    const title = String(document.getElementById(`non-functional-title-${encodeURIComponent(nonFunctionalId)}`)?.value || '');
    const description = String(document.getElementById(`non-functional-description-${encodeURIComponent(nonFunctionalId)}`)?.value || '');

    uiState.nonFunctionalRequirement.isUpdating = true;
    renderRequirementDetail();

    try {
      const res = await fetch(`/api/requirements/${encodeURIComponent(requirementId)}/non-functional-requirements/${encodeURIComponent(nonFunctionalId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Unable to update non-functional requirement');
      }

      await refreshRequirement(requirementId, 'subRequirements.handlers:saveNonFunctionalRequirement:refreshRequirement');
      uiState.nonFunctionalRequirement.editingId = null;
      renderRequirementDetail();
      showToast('Requisito non funzionale aggiornato');
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      uiState.nonFunctionalRequirement.isUpdating = false;
      renderRequirementDetail();
    }
  }

  function requestDeleteNonFunctionalRequirementByEncodedId(event, encodedNonFunctionalId) {
    event.stopPropagation();
    const currentRequirement = requireRequirementsSection();
    if (!currentRequirement || uiState.nonFunctionalRequirement.isUpdating) return;
    uiState.nonFunctionalRequirement.modalReturnFocusEl = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    uiState.nonFunctionalRequirement.deletingId = decodeURIComponent(encodedNonFunctionalId);
    renderRequirementDetail();
    setTimeout(() => {
      const cancelBtn = document.querySelector('.confirm-modal [data-modal-focus="last"]');
      const dialog = document.querySelector('.confirm-modal');
      if (cancelBtn instanceof HTMLElement) return cancelBtn.focus();
      if (dialog instanceof HTMLElement) dialog.focus();
    }, 0);
  }

  function closeDeleteNonFunctionalRequirementModalFromEvent(event) {
    event.stopPropagation();
    if (uiState.nonFunctionalRequirement.isUpdating) return;
    uiState.nonFunctionalRequirement.deletingId = null;
    renderRequirementDetail();
    if (uiState.nonFunctionalRequirement.modalReturnFocusEl && typeof uiState.nonFunctionalRequirement.modalReturnFocusEl.focus === 'function') {
      setTimeout(() => uiState.nonFunctionalRequirement.modalReturnFocusEl?.focus(), 0);
    }
    uiState.nonFunctionalRequirement.modalReturnFocusEl = null;
  }

  async function confirmDeleteNonFunctionalRequirementFromEvent(event) {
    event.stopPropagation();
    const nonFunctionalId = uiState.nonFunctionalRequirement.deletingId;
    const currentRequirement = requireRequirementsSection();
    if (!nonFunctionalId || !currentRequirement || uiState.nonFunctionalRequirement.isUpdating) return;
    uiState.nonFunctionalRequirement.deletingId = null;
    const requirementId = currentRequirement.document?.id || currentRequirement.id;
    if (!requirementId) return;

    uiState.nonFunctionalRequirement.isUpdating = true;
    renderRequirementDetail();

    try {
      const res = await fetch(`/api/requirements/${encodeURIComponent(requirementId)}/non-functional-requirements/${encodeURIComponent(nonFunctionalId)}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Unable to delete non-functional requirement');
      }

      await refreshRequirement(requirementId, 'subRequirements.handlers:deleteNonFunctionalRequirement:refreshRequirement');
      if (uiState.nonFunctionalRequirement.editingId === nonFunctionalId) uiState.nonFunctionalRequirement.editingId = null;
      renderRequirementDetail();
      showToast('Requisito non funzionale eliminato');
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      uiState.nonFunctionalRequirement.isUpdating = false;
      renderRequirementDetail();
    }
  }

  function handleDeleteNonFunctionalRequirementModalKeydown(event) {
    if (!uiState.nonFunctionalRequirement.deletingId) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closeDeleteNonFunctionalRequirementModalFromEvent(event);
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

  return {
    enableCreateFunctionalRequirementFromEvent,
    cancelCreateFunctionalRequirementFromEvent,
    proceedCreateFunctionalRequirementFromEvent,
    backCreateFunctionalRequirementFromEvent,
    createFunctionalRequirementFromEvent,
    editFunctionalRequirementByEncodedId,
    saveFunctionalRequirementByEncodedId,
    cancelFunctionalRequirementEditFromEvent,
    deleteFunctionalRequirementByEncodedId,
    requestDeleteFunctionalRequirementByEncodedId,
    closeDeleteFunctionalRequirementModalFromEvent,
    confirmDeleteFunctionalRequirementFromEvent,
    handleDeleteFunctionalRequirementModalKeydown,
    enableCreateNonFunctionalRequirementFromEvent,
    cancelCreateNonFunctionalRequirementFromEvent,
    proceedCreateNonFunctionalRequirementFromEvent,
    backCreateNonFunctionalRequirementFromEvent,
    createNonFunctionalRequirementFromEvent,
    editNonFunctionalRequirementByEncodedId,
    saveNonFunctionalRequirementByEncodedId,
    cancelNonFunctionalRequirementEditFromEvent,
    requestDeleteNonFunctionalRequirementByEncodedId,
    closeDeleteNonFunctionalRequirementModalFromEvent,
    confirmDeleteNonFunctionalRequirementFromEvent,
    handleDeleteNonFunctionalRequirementModalKeydown
  };
}

export { createSubRequirementsHandlers };
