function createPlanDetailsHandlers(deps) {
  const {
    readState,
    writeState,
    syncCoreState,
    renderPlanDetail,
    showToast,
    getCurrentDateIso,
    buildPhasesForEditor,
    loadPlans,
    formatStatus
  } = deps;

  function getPlanContext() {
    const state = readState();
    return {
      currentPlan: state.currentPlan,
      currentSection: state.currentSection
    };
  }

  function setCurrentPlan(nextPlan, reason) {
    writeState({ currentPlan: nextPlan });
    syncCoreState({ currentPlan: nextPlan }, reason);
  }

  function requirePlansSection() {
    const { currentPlan, currentSection } = getPlanContext();
    if (!currentPlan || currentSection !== 'plans') return null;
    return currentPlan;
  }

  function enablePlanNotesEdit() {
    const currentPlan = requirePlansSection();
    if (!currentPlan || deps.uiState.planNotes.isUpdating) return;
    if (deps.uiState.planNotes.isEditing) return;
    deps.uiState.planNotes.isEditing = true;
    renderPlanDetail();
  }

  function enablePlanNotesEditFromEvent(event) {
    event.stopPropagation();
    enablePlanNotesEdit();
  }

  function cancelPlanNotesEdit() {
    const currentPlan = requirePlansSection();
    if (!currentPlan || deps.uiState.planNotes.isUpdating) return;
    if (!deps.uiState.planNotes.isEditing) return;
    deps.uiState.planNotes.isEditing = false;
    renderPlanDetail();
  }

  function cancelPlanNotesEditFromEvent(event) {
    event.stopPropagation();
    cancelPlanNotesEdit();
  }

  async function savePlanNotes() {
    const currentPlan = requirePlansSection();
    if (!currentPlan || !deps.uiState.planNotes.isEditing || deps.uiState.planNotes.isUpdating) return;
    const notesEl = document.getElementById('plan-notes-input');
    if (!notesEl) return;

    const notes = String(notesEl.value || '');
    const previousNotes = currentPlan.notes || '';
    currentPlan.notes = notes;
    deps.uiState.planNotes.isUpdating = true;
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

      if (!updatedPlanRes.ok) throw new Error('Unable to refresh plan after notes update');
      const refreshedPlan = await updatedPlanRes.json();
      setCurrentPlan(refreshedPlan, 'planDetails.handlers:savePlanNotes:refreshPlan');
      deps.uiState.planNotes.isEditing = false;
      document.querySelector(`.plan-item[data-id="${CSS.escape(refreshedPlan.id)}"]`)?.classList.add('active');
      renderPlanDetail();
      showToast('Note piano salvate');
    } catch (error) {
      currentPlan.notes = previousNotes;
      renderPlanDetail();
      showToast(error.message, 'error');
    } finally {
      deps.uiState.planNotes.isUpdating = false;
      renderPlanDetail();
    }
  }

  function savePlanNotesFromEvent(event) {
    event.stopPropagation();
    savePlanNotes();
  }

  function enablePlanObjectiveEdit() {
    const currentPlan = requirePlansSection();
    if (!currentPlan || deps.uiState.planObjective.isUpdating) return;
    if (deps.uiState.planObjective.isEditing) return;
    deps.uiState.planObjective.isEditing = true;
    renderPlanDetail();
  }

  function enablePlanObjectiveEditFromEvent(event) {
    event.stopPropagation();
    enablePlanObjectiveEdit();
  }

  function cancelPlanObjectiveEdit() {
    const currentPlan = requirePlansSection();
    if (!currentPlan || deps.uiState.planObjective.isUpdating) return;
    if (!deps.uiState.planObjective.isEditing) return;
    deps.uiState.planObjective.isEditing = false;
    renderPlanDetail();
  }

  function cancelPlanObjectiveEditFromEvent(event) {
    event.stopPropagation();
    cancelPlanObjectiveEdit();
  }

  async function savePlanObjective() {
    const currentPlan = requirePlansSection();
    if (!currentPlan || !deps.uiState.planObjective.isEditing || deps.uiState.planObjective.isUpdating) return;
    const objectiveEl = document.getElementById('plan-objective-input');
    if (!objectiveEl) return;

    const objective = String(objectiveEl.value || '');
    const previousObjective = currentPlan.objective || '';
    currentPlan.objective = objective;
    deps.uiState.planObjective.isUpdating = true;
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

      if (!updatedPlanRes.ok) throw new Error('Unable to refresh plan after objective update');
      const refreshedPlan = await updatedPlanRes.json();
      setCurrentPlan(refreshedPlan, 'planDetails.handlers:savePlanObjective:refreshPlan');
      deps.uiState.planObjective.isEditing = false;
      document.querySelector(`.plan-item[data-id="${CSS.escape(refreshedPlan.id)}"]`)?.classList.add('active');
      renderPlanDetail();
      showToast('Objective piano salvato');
    } catch (error) {
      currentPlan.objective = previousObjective;
      renderPlanDetail();
      showToast(error.message, 'error');
    } finally {
      deps.uiState.planObjective.isUpdating = false;
      renderPlanDetail();
    }
  }

  function savePlanObjectiveFromEvent(event) {
    event.stopPropagation();
    savePlanObjective();
  }

  function enablePlanPhasesEdit() {
    const currentPlan = requirePlansSection();
    if (!currentPlan || deps.uiState.planPhases.isUpdating) return;
    if (deps.uiState.planPhases.isEditing) return;

    deps.uiState.planPhases.items = buildPhasesForEditor(currentPlan);
    if (!deps.uiState.planPhases.items.length) {
      deps.uiState.planPhases.items = [{ title: '', tasks: [] }];
    }
    deps.uiState.planPhases.isEditing = true;
    renderPlanDetail();
  }

  function enablePlanPhasesEditFromEvent(event) {
    event.stopPropagation();
    enablePlanPhasesEdit();
  }

  function cancelPlanPhasesEdit() {
    const currentPlan = requirePlansSection();
    if (!currentPlan || deps.uiState.planPhases.isUpdating) return;
    if (!deps.uiState.planPhases.isEditing) return;
    deps.uiState.planPhases.isEditing = false;
    deps.uiState.planPhases.items = [];
    renderPlanDetail();
  }

  function cancelPlanPhasesEditFromEvent(event) {
    event.stopPropagation();
    cancelPlanPhasesEdit();
  }

  function addPlanPhase() {
    const currentPlan = requirePlansSection();
    if (!currentPlan || !deps.uiState.planPhases.isEditing || deps.uiState.planPhases.isUpdating) return;
    deps.uiState.planPhases.items = [...deps.uiState.planPhases.items, { title: '', tasks: [] }];
    renderPlanDetail();
  }

  function addPlanPhaseFromEvent(event) {
    event.stopPropagation();
    addPlanPhase();
  }

  function removePlanPhase(index) {
    const currentPlan = requirePlansSection();
    if (!currentPlan || !deps.uiState.planPhases.isEditing || deps.uiState.planPhases.isUpdating) return;
    deps.uiState.planPhases.items = deps.uiState.planPhases.items.filter((_, currentIndex) => currentIndex !== index);
    if (!deps.uiState.planPhases.items.length) deps.uiState.planPhases.items = [{ title: '', tasks: [] }];
    renderPlanDetail();
  }

  function removePlanPhaseFromEvent(event, index) {
    event.stopPropagation();
    removePlanPhase(index);
  }

  function updatePlanPhaseTitle(index, value) {
    const currentPlan = requirePlansSection();
    if (!currentPlan || !deps.uiState.planPhases.isEditing || deps.uiState.planPhases.isUpdating) return;
    if (!deps.uiState.planPhases.items[index]) return;
    deps.uiState.planPhases.items[index].title = String(value || '');
  }

  function updatePlanPhaseTitleFromEvent(event, index) {
    event.stopPropagation();
    updatePlanPhaseTitle(index, event.target.value);
  }

  function togglePlanPhaseTask(index, taskId) {
    const currentPlan = requirePlansSection();
    if (!currentPlan || !deps.uiState.planPhases.isEditing || deps.uiState.planPhases.isUpdating) return;
    const phase = deps.uiState.planPhases.items[index];
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

  async function savePlanPhases() {
    const currentPlan = requirePlansSection();
    if (!currentPlan || !deps.uiState.planPhases.isEditing || deps.uiState.planPhases.isUpdating) return;
    const previousPhases = Array.isArray(currentPlan.phases) ? currentPlan.phases : [];

    const phases = deps.uiState.planPhases.items
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
    deps.uiState.planPhases.isUpdating = true;
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

      if (!updatedPlanRes.ok) throw new Error('Unable to refresh plan after phases update');
      const refreshedPlan = await updatedPlanRes.json();
      setCurrentPlan(refreshedPlan, 'planDetails.handlers:savePlanPhases:refreshPlan');
      deps.uiState.planPhases.isEditing = false;
      deps.uiState.planPhases.items = [];
      document.querySelector(`.plan-item[data-id="${CSS.escape(refreshedPlan.id)}"]`)?.classList.add('active');
      renderPlanDetail();
      showToast('Phases piano salvate');
    } catch (error) {
      currentPlan.phases = previousPhases;
      renderPlanDetail();
      showToast(error.message, 'error');
    } finally {
      deps.uiState.planPhases.isUpdating = false;
      renderPlanDetail();
    }
  }

  function savePlanPhasesFromEvent(event) {
    event.stopPropagation();
    savePlanPhases();
  }

  function closeAllTaskStatusDropdowns() {
    document.querySelectorAll('.task-status-dropdown.is-open').forEach(dropdown => {
      dropdown.classList.remove('is-open');
    });
  }

  function setStatusSelectClass(controlRoot, status) {
    if (!controlRoot) return;

    const trigger = controlRoot.querySelector('.task-status-trigger');
    const label = controlRoot.querySelector('.task-status-label');
    const options = controlRoot.querySelectorAll('.task-status-option');

    (deps.TASK_STATUSES || []).forEach(taskStatus => {
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

  async function updateTaskStatus(taskId, status, dropdownRoot) {
    const currentPlan = requirePlansSection();
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

      await res.json();

      const [planDetailRes] = await Promise.all([
        fetch(`/api/plans/${encodeURIComponent(currentPlan.id)}`, { cache: 'no-store' }),
        loadPlans()
      ]);

      if (!planDetailRes.ok) throw new Error('Unable to refresh plan after status update');
      const refreshedPlan = await planDetailRes.json();
      setCurrentPlan(refreshedPlan, 'planDetails.handlers:updateTaskStatus:refreshPlan');
      document.querySelector(`.plan-item[data-id="${CSS.escape(refreshedPlan.id)}"]`)?.classList.add('active');
      renderPlanDetail();
    } catch (error) {
      if (previousStatus) setStatusSelectClass(dropdownRoot, previousStatus);
      alert(error.message);
    } finally {
      dropdownRoot.classList.remove('is-updating');
    }
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

  function toggleTaskStatusDropdown(triggerEl) {
    const dropdownRoot = triggerEl.closest('.task-status-dropdown');
    if (!dropdownRoot || dropdownRoot.classList.contains('is-updating')) return;

    const willOpen = !dropdownRoot.classList.contains('is-open');
    closeAllTaskStatusDropdowns();
    if (willOpen) dropdownRoot.classList.add('is-open');
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
    const currentPlan = requirePlansSection();
    if (!currentPlan || deps.uiState.taskDod.isUpdating) return;
    if (deps.uiState.taskDod.editingId === taskId) return;
    deps.uiState.taskDod.editingId = taskId;
    renderPlanDetail();
  }

  function enableTaskDodEditByEncodedId(encodedTaskId) {
    enableTaskDodEdit(decodeURIComponent(encodedTaskId));
  }

  function disableTaskDodEdit() {
    const currentPlan = requirePlansSection();
    if (!currentPlan || deps.uiState.taskDod.isUpdating) return;
    if (!deps.uiState.taskDod.editingId) return;
    deps.uiState.taskDod.editingId = null;
    deps.uiState.taskDod.focusTarget = null;
    renderPlanDetail();
  }

  function disableTaskDodEditFromEvent(event) {
    event.stopPropagation();
    disableTaskDodEdit();
  }

  function handleTaskDodRegionKeydown(event, encodedTaskId) {
    if (event.target !== event.currentTarget) return;
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    enableTaskDodEditByEncodedId(encodedTaskId);
  }

  async function toggleTaskDodItem(planId, taskId, criterionIndex, completed) {
    const currentPlan = requirePlansSection();
    if (!currentPlan || deps.uiState.taskDod.isUpdating) return;

    const task = (currentPlan.tasks || []).find(item => item.id === taskId);
    const criterion = task?.definitionOfDone?.[criterionIndex];
    if (!task || !criterion) return;

    const previousCompleted = Boolean(criterion.completed);
    deps.uiState.taskDod.focusTarget = { taskId, criterionIndex };
    criterion.completed = completed;
    deps.uiState.taskDod.isUpdating = true;
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
      if (!updatedPlanRes.ok) throw new Error('Unable to refresh plan after Definition of Done update');
      const refreshedPlan = await updatedPlanRes.json();
      setCurrentPlan(refreshedPlan, 'planDetails.handlers:toggleTaskDodItem:refreshPlan');
      document.querySelector(`.plan-item[data-id="${CSS.escape(planId)}"]`)?.classList.add('active');
      renderPlanDetail();
      showToast('Definition of Done aggiornata');
    } catch (error) {
      criterion.completed = previousCompleted;
      renderPlanDetail();
      showToast(error.message, 'error');
    } finally {
      deps.uiState.taskDod.isUpdating = false;
      renderPlanDetail();
    }
  }

  function toggleTaskDodItemByEncodedIds(event, encodedPlanId, encodedTaskId, criterionIndex, completed) {
    event.stopPropagation();
    const planId = decodeURIComponent(encodedPlanId);
    const taskId = decodeURIComponent(encodedTaskId);
    toggleTaskDodItem(planId, taskId, Number(criterionIndex), completed);
  }

  function enableTaskFieldEdit(taskId, field) {
    const currentPlan = requirePlansSection();
    if (!currentPlan || deps.uiState.taskField.isUpdating) return;
    if (!taskId || !field) return;

    if (field === 'phase' && !(Array.isArray(currentPlan.phases) && currentPlan.phases.some(phase => String(phase?.title || '').trim()))) {
      showToast('Nessuna phase disponibile nel piano', 'error');
      return;
    }
    deps.uiState.taskField.editing = { taskId, field };
    renderPlanDetail();
  }

  function enableTaskFieldEditByEncodedId(event, encodedTaskId, field) {
    event.stopPropagation();
    enableTaskFieldEdit(decodeURIComponent(encodedTaskId), field);
  }

  function cancelTaskFieldEdit() {
    if (!deps.uiState.taskField.editing || deps.uiState.taskField.isUpdating) return;
    deps.uiState.taskField.editing = null;
    renderPlanDetail();
  }

  function cancelTaskFieldEditFromEvent(event) {
    event.stopPropagation();
    cancelTaskFieldEdit();
  }

  async function saveTaskField(planId, taskId, field) {
    const currentPlan = requirePlansSection();
    if (!currentPlan || deps.uiState.taskField.isUpdating) return;
    const task = (currentPlan.tasks || []).find(item => item.id === taskId);
    if (!task) return;

    let endpoint = '';
    let body = {};
    const previousValue = task[field];

    if (field === 'primary') {
      const titleInputEl = document.getElementById(`task-title-${taskId}`);
      const whatToDoTextareaEl = document.getElementById(`task-whatToDo-${taskId}`);
      if (!titleInputEl || !whatToDoTextareaEl) return;

      const title = String(titleInputEl.value || '');
      const whatToDo = String(whatToDoTextareaEl.value || '');
      const previousTitle = task.title;
      const previousWhatToDo = task.whatToDo;
      task.title = title;
      task.whatToDo = whatToDo;

      deps.uiState.taskField.isUpdating = true;
      renderPlanDetail();

      try {
        const [titleRes, whatToDoRes] = await Promise.all([
          fetch(`/api/plans/${encodeURIComponent(planId)}/tasks/${encodeURIComponent(taskId)}/title`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title })
          }),
          fetch(`/api/plans/${encodeURIComponent(planId)}/tasks/${encodeURIComponent(taskId)}/what-to-do`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ whatToDo })
          })
        ]);

        if (!titleRes.ok || !whatToDoRes.ok) {
          const titleErr = !titleRes.ok ? await titleRes.json().catch(() => ({})) : null;
          const whatErr = !whatToDoRes.ok ? await whatToDoRes.json().catch(() => ({})) : null;
          throw new Error(titleErr?.error || whatErr?.error || 'Unable to update task fields');
        }

        const [updatedPlanRes] = await Promise.all([
          fetch(`/api/plans/${encodeURIComponent(planId)}`, { cache: 'no-store' }),
          loadPlans()
        ]);

        if (!updatedPlanRes.ok) throw new Error('Unable to refresh plan after task field update');
        const refreshedPlan = await updatedPlanRes.json();
        setCurrentPlan(refreshedPlan, 'planDetails.handlers:saveTaskField:refreshPlan');
        deps.uiState.taskField.editing = null;
        document.querySelector(`.plan-item[data-id="${CSS.escape(planId)}"]`)?.classList.add('active');
        renderPlanDetail();
        showToast('Campi task salvati');
      } catch (error) {
        task.title = previousTitle;
        task.whatToDo = previousWhatToDo;
        renderPlanDetail();
        showToast(error.message, 'error');
      } finally {
        deps.uiState.taskField.isUpdating = false;
        renderPlanDetail();
      }
      return;
    } else if (field === 'title' || field === 'phase') {
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
    } else if (field === 'endpoints') {
      const textareaEl = document.getElementById(`task-endpoints-${taskId}`);
      if (!textareaEl) return;
      body.endpoints = String(textareaEl.value || '').split('\n').map(value => value.trim()).filter(Boolean);
      task.endpoints = body.endpoints;
      endpoint = 'endpoints';
    } else if (field === 'dependsOn') {
      const editorEl = document.getElementById(`task-depends-on-editor-${taskId}`);
      if (!editorEl) return;
      body.dependsOn = Array.from(editorEl.querySelectorAll('input[type="checkbox"]:checked')).map(el => el.value);
      task.dependsOn = body.dependsOn;
      endpoint = 'depends-on';
    } else {
      return;
    }

    deps.uiState.taskField.isUpdating = true;
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

      if (!updatedPlanRes.ok) throw new Error('Unable to refresh plan after task field update');
      const refreshedPlan = await updatedPlanRes.json();
      setCurrentPlan(refreshedPlan, 'planDetails.handlers:saveTaskField:metaRefreshPlan');
      deps.uiState.taskField.editing = null;
      document.querySelector(`.plan-item[data-id="${CSS.escape(planId)}"]`)?.classList.add('active');
      renderPlanDetail();
      showToast('Campo task salvato');
    } catch (error) {
      task[field] = previousValue;
      renderPlanDetail();
      showToast(error.message, 'error');
    } finally {
      deps.uiState.taskField.isUpdating = false;
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
    const currentPlan = requirePlansSection();
    if (!currentPlan || deps.uiState.taskNotes.isUpdating) return;
    if (!taskId || deps.uiState.taskNotes.editingId === taskId) return;
    deps.uiState.taskNotes.editingId = taskId;
    deps.uiState.taskNotes.openIds.add(taskId);
    renderPlanDetail();
  }

  function enableTaskImplementationNotesEdit(taskId) {
    const currentPlan = requirePlansSection();
    if (!currentPlan || deps.uiState.taskImplementationNotes.isUpdating) return;
    if (!taskId || deps.uiState.taskImplementationNotes.editingId === taskId) return;
    deps.uiState.taskImplementationNotes.editingId = taskId;
    deps.uiState.taskNotes.openIds.add(taskId);
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
    const currentPlan = requirePlansSection();
    if (!currentPlan || deps.uiState.taskNotes.isUpdating) return;
    if (!deps.uiState.taskNotes.editingId) return;
    deps.uiState.taskNotes.editingId = null;
    renderPlanDetail();
  }

  function cancelTaskNotesEditFromEvent(event) {
    event.stopPropagation();
    cancelTaskNotesEdit();
  }

  function cancelTaskImplementationNotesEdit() {
    const currentPlan = requirePlansSection();
    if (!currentPlan || deps.uiState.taskImplementationNotes.isUpdating) return;
    if (!deps.uiState.taskImplementationNotes.editingId) return;
    deps.uiState.taskImplementationNotes.editingId = null;
    renderPlanDetail();
  }

  function cancelTaskImplementationNotesEditFromEvent(event) {
    event.stopPropagation();
    cancelTaskImplementationNotesEdit();
  }

  async function saveTaskNotes(planId, taskId) {
    const currentPlan = requirePlansSection();
    if (!currentPlan || deps.uiState.taskNotes.isUpdating) return;
    const task = (currentPlan.tasks || []).find(item => item.id === taskId);
    if (!task) return;

    const notesEl = document.getElementById(`task-notes-${taskId}`);
    if (!notesEl) return;

    const notes = String(notesEl.value || '');
    const previousNotes = task.notes || '';
    task.notes = notes;
    deps.uiState.taskNotes.isUpdating = true;
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

      if (!updatedPlanRes.ok) throw new Error('Unable to refresh plan after task notes update');
      const refreshedPlan = await updatedPlanRes.json();
      setCurrentPlan(refreshedPlan, 'planDetails.handlers:saveTaskNotes:refreshPlan');
      deps.uiState.taskNotes.openIds.add(taskId);
      deps.uiState.taskNotes.editingId = null;
      document.querySelector(`.plan-item[data-id="${CSS.escape(planId)}"]`)?.classList.add('active');
      renderPlanDetail();
      showToast('Note task salvate');
    } catch (error) {
      task.notes = previousNotes;
      renderPlanDetail();
      showToast(error.message, 'error');
    } finally {
      deps.uiState.taskNotes.isUpdating = false;
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
    const currentPlan = requirePlansSection();
    if (!currentPlan || deps.uiState.taskImplementationNotes.isUpdating) return;
    const task = (currentPlan.tasks || []).find(item => item.id === taskId);
    if (!task) return;

    const implementationNotesEl = document.getElementById(`task-implementation-notes-${taskId}`);
    if (!implementationNotesEl) return;

    const implementationNotes = String(implementationNotesEl.value || '');
    const previousImplementationNotes = task.implementationNotes || '';
    task.implementationNotes = implementationNotes;
    deps.uiState.taskImplementationNotes.isUpdating = true;
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

      if (!updatedPlanRes.ok) throw new Error('Unable to refresh plan after task implementation notes update');
      const refreshedPlan = await updatedPlanRes.json();
      setCurrentPlan(refreshedPlan, 'planDetails.handlers:saveTaskImplementationNotes:refreshPlan');
      deps.uiState.taskNotes.openIds.add(taskId);
      deps.uiState.taskImplementationNotes.editingId = null;
      document.querySelector(`.plan-item[data-id="${CSS.escape(planId)}"]`)?.classList.add('active');
      renderPlanDetail();
      showToast('Implementation notes task salvate');
    } catch (error) {
      task.implementationNotes = previousImplementationNotes;
      renderPlanDetail();
      showToast(error.message, 'error');
    } finally {
      deps.uiState.taskImplementationNotes.isUpdating = false;
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
      deps.uiState.taskNotes.openIds.add(taskId);
    } else {
      deps.uiState.taskNotes.openIds.delete(taskId);
    }
  }

  function handleTaskNotesDetailsToggleByEncodedId(event, encodedTaskId) {
    const taskId = decodeURIComponent(encodedTaskId);
    handleTaskNotesDetailsToggle(taskId, event.currentTarget);
  }

  function enableCreatePlanDecisionFromEvent(event) {
    event.stopPropagation();
    const currentPlan = requirePlansSection();
    if (!currentPlan || deps.uiState.planDecision.isUpdating) return;

    deps.uiState.planDecision.creating = true;
    deps.uiState.planDecision.createStep = 'id';
    deps.uiState.planDecision.newId = 'DEC-';
    deps.uiState.planDecision.newDescription = '';
    deps.uiState.planDecision.newRationale = '';
    renderPlanDetail();
    setTimeout(() => {
      const input = document.getElementById('new-plan-decision-id');
      if (!input) return;
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    }, 0);
  }

  function cancelCreatePlanDecisionFromEvent(event) {
    event.stopPropagation();
    deps.uiState.planDecision.creating = false;
    deps.uiState.planDecision.createStep = 'id';
    deps.uiState.planDecision.newId = '';
    deps.uiState.planDecision.newDescription = '';
    deps.uiState.planDecision.newRationale = '';
    renderPlanDetail();
  }

  function proceedCreatePlanDecisionFromEvent(event) {
    event.stopPropagation();
    const currentPlan = requirePlansSection();
    if (!currentPlan || deps.uiState.planDecision.isUpdating) return;

    const decisionId = String(document.getElementById('new-plan-decision-id')?.value || '').trim();
    if (!decisionId) return showToast('Inserisci un ID', 'error');
    if ((currentPlan.decisions || []).some(item => (item.id || item.decision) === decisionId)) return showToast('ID gia presente', 'error');
    deps.uiState.planDecision.newId = decisionId;
    deps.uiState.planDecision.createStep = 'details';
    renderPlanDetail();
    setTimeout(() => document.getElementById('new-plan-decision-description')?.focus(), 0);
  }

  function backCreatePlanDecisionFromEvent(event) {
    event.stopPropagation();
    const currentPlan = requirePlansSection();
    if (!currentPlan || deps.uiState.planDecision.isUpdating) return;

    deps.uiState.planDecision.newDescription = String(document.getElementById('new-plan-decision-description')?.value || '').trim();
    deps.uiState.planDecision.newRationale = String(document.getElementById('new-plan-decision-rationale')?.value || '').trim();
    deps.uiState.planDecision.createStep = 'id';
    renderPlanDetail();
  }

  async function createPlanDecisionFromEvent(event) {
    event.stopPropagation();
    const currentPlan = requirePlansSection();
    if (!currentPlan || deps.uiState.planDecision.isUpdating) return;
    const planId = currentPlan.id;
    if (!planId) return;

    const decisionId = String(deps.uiState.planDecision.newId || '').trim();
    const description = String(document.getElementById('new-plan-decision-description')?.value || '').trim();
    const rationale = String(document.getElementById('new-plan-decision-rationale')?.value || '').trim();
    const date = getCurrentDateIso();
    if (!decisionId) return showToast('Inserisci un ID', 'error');
    if (!description || !rationale) return showToast('Descrizione e rationale sono obbligatori', 'error');

    deps.uiState.planDecision.isUpdating = true;
    renderPlanDetail();

    try {
      const res = await fetch(`/api/plans/${encodeURIComponent(planId)}/decisions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decisionId, description, rationale, date })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Unable to add decision');
      }

      const [updatedPlanRes] = await Promise.all([
        fetch(`/api/plans/${encodeURIComponent(planId)}`, { cache: 'no-store' }),
        loadPlans()
      ]);
      if (!updatedPlanRes.ok) throw new Error('Unable to refresh plan after create');
      const refreshedPlan = await updatedPlanRes.json();
      setCurrentPlan(refreshedPlan, 'planDetails.handlers:createPlanDecision:refreshPlan');

      deps.uiState.planDecision.creating = false;
      deps.uiState.planDecision.createStep = 'id';
      deps.uiState.planDecision.newId = '';
      deps.uiState.planDecision.newDescription = '';
      deps.uiState.planDecision.newRationale = '';
      renderPlanDetail();
      showToast('Decision aggiunta');
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      deps.uiState.planDecision.isUpdating = false;
      renderPlanDetail();
    }
  }

  function editPlanDecisionByEncodedId(event, encodedDecisionId) {
    event.stopPropagation();
    const currentPlan = requirePlansSection();
    if (!currentPlan || deps.uiState.planDecision.isUpdating) return;
    deps.uiState.planDecision.editingId = decodeURIComponent(encodedDecisionId);
    renderPlanDetail();
  }

  function cancelPlanDecisionEditFromEvent(event) {
    event.stopPropagation();
    deps.uiState.planDecision.editingId = null;
    renderPlanDetail();
  }

  async function savePlanDecisionByEncodedId(event, encodedDecisionId) {
    event.stopPropagation();
    const currentPlan = requirePlansSection();
    if (!currentPlan || deps.uiState.planDecision.isUpdating) return;

    const decisionId = decodeURIComponent(encodedDecisionId);
    const planId = currentPlan.id;
    if (!planId || !decisionId) return;
    const description = String(document.getElementById(`plan-decision-description-${encodeURIComponent(decisionId)}`)?.value || '');
    const rationale = String(document.getElementById(`plan-decision-rationale-${encodeURIComponent(decisionId)}`)?.value || '');

    deps.uiState.planDecision.isUpdating = true;
    renderPlanDetail();

    try {
      const res = await fetch(`/api/plans/${encodeURIComponent(planId)}/decisions/${encodeURIComponent(decisionId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, rationale })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Unable to update decision');
      }

      const [updatedPlanRes] = await Promise.all([
        fetch(`/api/plans/${encodeURIComponent(planId)}`, { cache: 'no-store' }),
        loadPlans()
      ]);
      if (!updatedPlanRes.ok) throw new Error('Unable to refresh plan after update');
      const refreshedPlan = await updatedPlanRes.json();
      setCurrentPlan(refreshedPlan, 'planDetails.handlers:savePlanDecision:refreshPlan');
      deps.uiState.planDecision.editingId = null;
      renderPlanDetail();
      showToast('Decision aggiornata');
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      deps.uiState.planDecision.isUpdating = false;
      renderPlanDetail();
    }
  }

  function requestDeletePlanDecisionByEncodedId(event, encodedDecisionId) {
    event.stopPropagation();
    const currentPlan = requirePlansSection();
    if (!currentPlan || deps.uiState.planDecision.isUpdating) return;

    deps.uiState.planDecision.modalReturnFocusEl = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    deps.uiState.planDecision.deletingId = decodeURIComponent(encodedDecisionId);
    renderPlanDetail();
    setTimeout(() => {
      const cancelBtn = document.querySelector('.confirm-modal [data-modal-focus="last"]');
      const dialog = document.querySelector('.confirm-modal');
      if (cancelBtn instanceof HTMLElement) return cancelBtn.focus();
      if (dialog instanceof HTMLElement) dialog.focus();
    }, 0);
  }

  function closeDeletePlanDecisionModalFromEvent(event) {
    event.stopPropagation();
    if (deps.uiState.planDecision.isUpdating) return;
    deps.uiState.planDecision.deletingId = null;
    renderPlanDetail();
    if (deps.uiState.planDecision.modalReturnFocusEl && typeof deps.uiState.planDecision.modalReturnFocusEl.focus === 'function') {
      setTimeout(() => deps.uiState.planDecision.modalReturnFocusEl?.focus(), 0);
    }
    deps.uiState.planDecision.modalReturnFocusEl = null;
  }

  async function confirmDeletePlanDecisionFromEvent(event) {
    event.stopPropagation();
    const currentPlan = requirePlansSection();
    if (!deps.uiState.planDecision.deletingId || !currentPlan || deps.uiState.planDecision.isUpdating) return;

    const decisionId = deps.uiState.planDecision.deletingId;
    deps.uiState.planDecision.deletingId = null;
    const planId = currentPlan.id;
    if (!planId) return;

    deps.uiState.planDecision.isUpdating = true;
    renderPlanDetail();

    try {
      const res = await fetch(`/api/plans/${encodeURIComponent(planId)}/decisions/${encodeURIComponent(decisionId)}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Unable to delete decision');
      }

      const [updatedPlanRes] = await Promise.all([
        fetch(`/api/plans/${encodeURIComponent(planId)}`, { cache: 'no-store' }),
        loadPlans()
      ]);
      if (!updatedPlanRes.ok) throw new Error('Unable to refresh plan after delete');
      const refreshedPlan = await updatedPlanRes.json();
      setCurrentPlan(refreshedPlan, 'planDetails.handlers:confirmDeletePlanDecision:refreshPlan');
      if (deps.uiState.planDecision.editingId === decisionId) deps.uiState.planDecision.editingId = null;
      renderPlanDetail();
      showToast('Decision eliminata');
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      deps.uiState.planDecision.isUpdating = false;
      renderPlanDetail();
    }
  }

  function handleDeletePlanDecisionModalKeydown(event) {
    if (!deps.uiState.planDecision.deletingId) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closeDeletePlanDecisionModalFromEvent(event);
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
    closeAllTaskStatusDropdowns,
    handleTaskStatusChangeByEncodedId,
    toggleTaskStatusDropdown,
    toggleTaskPhaseDropdown,
    handleTaskPhaseSelectByEncodedId,
    enableTaskDodEditByEncodedId,
    disableTaskDodEditFromEvent,
    handleTaskDodRegionKeydown,
    toggleTaskDodItemByEncodedIds,
    enablePlanNotesEditFromEvent,
    cancelPlanNotesEditFromEvent,
    savePlanNotesFromEvent,
    enablePlanObjectiveEditFromEvent,
    cancelPlanObjectiveEditFromEvent,
    savePlanObjectiveFromEvent,
    enablePlanPhasesEditFromEvent,
    cancelPlanPhasesEditFromEvent,
    savePlanPhasesFromEvent,
    addPlanPhaseFromEvent,
    removePlanPhaseFromEvent,
    updatePlanPhaseTitleFromEvent,
    togglePlanPhaseTaskByEncodedId,
    enableTaskFieldEditByEncodedId,
    cancelTaskFieldEditFromEvent,
    saveTaskFieldByEncodedIds,
    enableTaskNotesEditByEncodedId,
    cancelTaskNotesEditFromEvent,
    saveTaskNotesByEncodedIds,
    enableTaskImplementationNotesEditByEncodedId,
    cancelTaskImplementationNotesEditFromEvent,
    saveTaskImplementationNotesByEncodedIds,
    handleTaskNotesDetailsToggleByEncodedId,
    enableCreatePlanDecisionFromEvent,
    cancelCreatePlanDecisionFromEvent,
    proceedCreatePlanDecisionFromEvent,
    backCreatePlanDecisionFromEvent,
    createPlanDecisionFromEvent,
    editPlanDecisionByEncodedId,
    cancelPlanDecisionEditFromEvent,
    savePlanDecisionByEncodedId,
    requestDeletePlanDecisionByEncodedId,
    closeDeletePlanDecisionModalFromEvent,
    confirmDeletePlanDecisionFromEvent,
    handleDeletePlanDecisionModalKeydown
  };
}

export { createPlanDetailsHandlers };
