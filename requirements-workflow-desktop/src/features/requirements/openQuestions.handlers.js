function createOpenQuestionsHandlers(deps) {
  const { readState, writeState, syncCoreState, renderRequirementDetail, showToast, uiState } = deps;
  const OPEN_QUESTION_STATUSES = Array.isArray(deps.OPEN_QUESTION_STATUSES)
    ? deps.OPEN_QUESTION_STATUSES
    : ['open', 'resolved'];

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

  function enableOpenQuestionEdit(questionId) {
    const currentRequirement = requireRequirementsSection();
    if (!currentRequirement || uiState.openQuestion.isUpdating) return;
    if (!questionId) return;
    if (uiState.openQuestion.editingId === questionId) return;
    uiState.openQuestion.editingId = questionId;
    renderRequirementDetail();
  }

  function enableOpenQuestionEditByEncodedId(encodedQuestionId) {
    enableOpenQuestionEdit(decodeURIComponent(encodedQuestionId));
  }

  function cancelOpenQuestionEdit() {
    const currentRequirement = requireRequirementsSection();
    if (!currentRequirement || uiState.openQuestion.isUpdating) return;
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
    const currentRequirement = requireRequirementsSection();
    if (!currentRequirement || uiState.openQuestion.isUpdating) return;
    const question = (currentRequirement.openQuestions || []).find(item => item.id === questionId);
    if (!question) return;

    const answerEl = document.getElementById(`open-question-answer-${questionId}`);
    const statusEl = document.getElementById(`open-question-status-${questionId}`);
    if (!answerEl || !statusEl) return;

    const answer = String(answerEl.value || '').trim();
    const status = String(statusEl.value || '').trim();
    if (!OPEN_QUESTION_STATUSES.includes(status)) return showToast('Status open question non valido', 'error');

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

      await refreshRequirement(requirementId, 'openQuestions.handlers:saveOpenQuestion:refreshRequirement');
      uiState.openQuestion.editingId = null;
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
    const currentRequirement = requireRequirementsSection();
    if (!currentRequirement || uiState.openQuestion.isUpdating) return;
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
    const currentRequirement = requireRequirementsSection();
    if (!currentRequirement || !uiState.openQuestion.creating || uiState.openQuestion.isUpdating) return;
    const input = document.getElementById('new-open-question-id');
    const id = String(input?.value || '').trim();
    if (!id) return showToast('ID open question obbligatorio', 'error');
    if ((currentRequirement?.openQuestions || []).some(item => String(item?.id || '') === id)) {
      return showToast('ID open question gia presente', 'error');
    }
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
    const currentRequirement = requireRequirementsSection();
    if (!currentRequirement || uiState.openQuestion.isUpdating) return;
    const requirementId = currentRequirement.document?.id;
    if (!requirementId) return;

    const createdOpenQuestionId = String(uiState.openQuestion.newId || '').trim();
    const question = String(document.getElementById('new-open-question-question')?.value || '').trim();
    const answer = 'Non definito nel documento; richiesta conferma.';
    const status = 'open';

    if (!uiState.openQuestion.newId) return showToast('ID open question obbligatorio', 'error');
    if ((currentRequirement?.openQuestions || []).some(item => String(item?.id || '') === uiState.openQuestion.newId)) {
      return showToast('ID open question gia presente', 'error');
    }
    if (!question) return showToast('Question obbligatoria', 'error');

    uiState.openQuestion.isUpdating = true;
    renderRequirementDetail();

    try {
      const res = await fetch(`/api/requirements/${encodeURIComponent(requirementId)}/open-questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: uiState.openQuestion.newId, question, answer, status })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Unable to create open question');
      }

      await refreshRequirement(requirementId, 'openQuestions.handlers:createOpenQuestion:refreshRequirement');
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
    const currentRequirement = requireRequirementsSection();
    if (!currentRequirement || uiState.openQuestion.isUpdating) return;
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
    if (uiState.functionalRequirement.modalReturnFocusEl && typeof uiState.functionalRequirement.modalReturnFocusEl.focus === 'function') {
      uiState.functionalRequirement.modalReturnFocusEl.focus();
    }
  }

  async function confirmDeleteOpenQuestionFromEvent(event) {
    event.stopPropagation();
    const currentRequirement = requireRequirementsSection();
    if (!currentRequirement || !uiState.openQuestion.deletingId || uiState.openQuestion.isUpdating) return;
    const requirementId = currentRequirement.document?.id;
    const questionId = uiState.openQuestion.deletingId;
    if (!requirementId) return;

    uiState.openQuestion.isUpdating = true;
    renderRequirementDetail();

    try {
      const res = await fetch(`/api/requirements/${encodeURIComponent(requirementId)}/open-questions/${encodeURIComponent(questionId)}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Unable to delete open question');
      }

      await refreshRequirement(requirementId, 'openQuestions.handlers:confirmDeleteOpenQuestion:refreshRequirement');
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

  return {
    enableOpenQuestionEditByEncodedId,
    cancelOpenQuestionEditFromEvent,
    handleOpenQuestionCardKeydown,
    saveOpenQuestionByEncodedIds,
    enableOpenQuestionCreateFromEvent,
    proceedCreateOpenQuestionFromEvent,
    backCreateOpenQuestionFromEvent,
    cancelCreateOpenQuestionFromEvent,
    createOpenQuestionFromEvent,
    requestDeleteOpenQuestionByEncodedIds,
    closeDeleteOpenQuestionModalFromEvent,
    confirmDeleteOpenQuestionFromEvent
  };
}

export { createOpenQuestionsHandlers };
