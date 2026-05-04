function derivePlanStatusFromTasks(tasks) {
  const taskList = Array.isArray(tasks) ? tasks : [];
  const normalizedStatuses = taskList.map(task => {
    const value = String(task?.status || '').trim().toLowerCase();
    if (value === 'completed' || value === 'done') return 'completed';
    if (value === 'in_progress' || value === 'in progress') return 'in_progress';
    return value || 'pending';
  });
  if (normalizedStatuses.length > 0 && normalizedStatuses.every(status => status === 'completed')) return 'completed';
  if (normalizedStatuses.some(status => status === 'completed')) return 'in_progress';
  if (normalizedStatuses.some(status => status === 'in_progress')) return 'in_progress';
  return 'pending';
}

function syncPlanStatusWithTasks(data) {
  const nextStatus = derivePlanStatusFromTasks(data?.tasks);
  const currentStatus = String(data?.status || '').trim().toLowerCase();
  if (currentStatus !== nextStatus) {
    data.status = nextStatus;
    return true;
  }
  return false;
}

export function createPlansService(repository) {
  const TASK_STATUSES = ['pending', 'in_progress', 'completed', 'skipped', 'cancelled'];
  const STORY_STATUSES = ['in_progress', 'completed'];

  function validateStatus(status, allowedStatuses) {
    return typeof status === 'string' && allowedStatuses.includes(status);
  }

  function parseStoryTaskIds(tasksValue) {
    if (Array.isArray(tasksValue)) return tasksValue.map(value => String(value).trim()).filter(Boolean);
    if (typeof tasksValue !== 'string') return [];
    return tasksValue.split(',').map(value => value.trim()).filter(Boolean);
  }

  function normalizeStoryStatus(status) {
    const value = String(status || '').trim().toLowerCase();
    if (value === 'completed' || value === 'done') return 'completed';
    return 'in_progress';
  }

  function computeStoryStatusFromTasks(story, tasksById) {
    const taskIds = parseStoryTaskIds(story?.tasks);
    if (!taskIds.length) return 'in_progress';
    const allCompleted = taskIds.every(taskId => tasksById.get(taskId)?.status === 'completed');
    return allCompleted ? 'completed' : 'in_progress';
  }

  function recomputeStoriesFromTasks(data) {
    if (!Array.isArray(data?.stories)) return false;
    const tasksById = new Map((data.tasks || []).map(task => [task.id, task]));
    let hasChanges = false;
    for (const story of data.stories) {
      const nextStatus = computeStoryStatusFromTasks(story, tasksById);
      if (normalizeStoryStatus(story.status) !== nextStatus) {
        story.status = nextStatus;
        hasChanges = true;
      }
    }
    return hasChanges;
  }

  function deriveTaskStatusFromDefinitionOfDone(definitionOfDone) {
    const items = Array.isArray(definitionOfDone) ? definitionOfDone : [];
    if (!items.length) return 'pending';
    const completedCount = items.filter(item => Boolean(item?.completed)).length;
    if (completedCount === 0) return 'pending';
    if (completedCount === items.length) return 'completed';
    return 'in_progress';
  }

  function normalizeUniqueStringArray(values) {
    if (!Array.isArray(values)) return null;
    const result = [];
    const seen = new Set();
    for (const value of values) {
      const normalized = String(value || '').trim();
      if (!normalized || seen.has(normalized)) continue;
      seen.add(normalized);
      result.push(normalized);
    }
    return result;
  }
  function touchPlan(data) {
    data.lastUpdated = new Date().toISOString();
  }

  function listPlans() {
    const files = repository.listPlanFiles();
    return files.map(file => {
      const { filePath, data } = repository.readPlanFile(file);
      if (syncPlanStatusWithTasks(data)) repository.writePlan(filePath, data);
      return {
        id: data.id,
        title: data.title,
        status: data.status || 'pending',
        created: data.created,
        lastUpdated: data.lastUpdated,
        requirements: data.requirements,
        storiesCount: data.stories?.length || 0,
        tasksCount: data.tasks?.length || 0,
        decisionsCount: data.decisions?.length || 0
      };
    });
  }

  function getPlanById(id) {
    const plan = repository.readPlanById(id);
    if (!plan) return null;
    if (syncPlanStatusWithTasks(plan.data)) repository.writePlan(plan.filePath, plan.data);
    return plan.data;
  }

  function createDecision(planId, payload) {
    const plan = repository.readPlanById(planId);
    if (!plan) return { error: 'Plan not found', status: 404 };
    const { decisionId, description, rationale } = payload || {};
    if (typeof decisionId !== 'string') return { error: 'Invalid payload. "decisionId" must be a string.', status: 400 };
    const normalizedId = decisionId.trim();
    const normalizedDescription = String(description || '').trim();
    const normalizedRationale = String(rationale || '').trim();
    if (!normalizedId) return { error: 'decisionId is required.', status: 400 };
    if (!normalizedDescription || !normalizedRationale) return { error: 'Description and rationale are required.', status: 400 };
    const decisions = Array.isArray(plan.data.decisions) ? plan.data.decisions : [];
    if (decisions.some(item => (item.id || item.decision) === normalizedId)) return { error: 'Decision ID already exists.', status: 409 };
    const item = { id: normalizedId, description: normalizedDescription, rationale: normalizedRationale, date: new Date().toISOString().slice(0, 10) };
    plan.data.decisions = [...decisions, item];
    repository.writePlan(plan.filePath, plan.data);
    return { status: 201, item };
  }

  function updateDecision(planId, decisionId, payload) {
    const plan = repository.readPlanById(planId);
    if (!plan) return { error: 'Plan not found', status: 404 };
    const { description, rationale } = payload || {};
    if (typeof description !== 'string' || typeof rationale !== 'string') {
      return { error: 'Invalid payload. "description" and "rationale" must be strings.', status: 400 };
    }
    const normalizedDescription = description.trim();
    const normalizedRationale = rationale.trim();
    if (!normalizedDescription || !normalizedRationale) return { error: 'Description and rationale are required.', status: 400 };
    const item = (plan.data.decisions || []).find(entry => (entry.id || entry.decision) === decisionId);
    if (!item) return { error: 'Decision not found', status: 404 };
    item.description = normalizedDescription;
    item.rationale = normalizedRationale;
    repository.writePlan(plan.filePath, plan.data);
    return { status: 200, item };
  }

  function deleteDecision(planId, decisionId) {
    const plan = repository.readPlanById(planId);
    if (!plan) return { error: 'Plan not found', status: 404 };
    const decisions = Array.isArray(plan.data.decisions) ? plan.data.decisions : [];
    const nextDecisions = decisions.filter(entry => (entry.id || entry.decision) !== decisionId);
    if (nextDecisions.length === decisions.length) return { error: 'Decision not found', status: 404 };
    plan.data.decisions = nextDecisions;
    repository.writePlan(plan.filePath, plan.data);
    return { status: 200 };
  }

  function updateNotes(planId, payload) {
    const plan = repository.readPlanById(planId);
    if (!plan) return { error: 'Plan not found', status: 404 };
    const { notes } = payload || {};
    if (typeof notes !== 'string') return { error: 'Invalid payload. "notes" must be a string.', status: 400 };
    plan.data.notes = notes.trim();
    touchPlan(plan.data);
    repository.writePlan(plan.filePath, plan.data);
    return { status: 200, planId: plan.data.id, notes: plan.data.notes, lastUpdated: plan.data.lastUpdated };
  }

  function updateObjective(planId, payload) {
    const plan = repository.readPlanById(planId);
    if (!plan) return { error: 'Plan not found', status: 404 };
    const { objective } = payload || {};
    if (typeof objective !== 'string') return { error: 'Invalid payload. "objective" must be a string.', status: 400 };
    plan.data.objective = objective.trim();
    touchPlan(plan.data);
    repository.writePlan(plan.filePath, plan.data);
    return { status: 200, planId: plan.data.id, objective: plan.data.objective, lastUpdated: plan.data.lastUpdated };
  }

  function updatePhases(planId, payload) {
    const plan = repository.readPlanById(planId);
    if (!plan) return { error: 'Plan not found', status: 404 };
    const { phases } = payload || {};
    if (!Array.isArray(phases)) return { error: 'Invalid payload. "phases" must be an array.', status: 400 };

    const normalizedPhases = [];
    const tasksById = new Map((plan.data.tasks || []).map(task => [String(task.id), task]));
    const assignedTaskIds = new Set();

    for (const phase of phases) {
      if (!phase || typeof phase !== 'object') return { error: 'Invalid payload. Each phase must be an object.', status: 400 };
      const title = String(phase.title || '').trim();
      if (!title) return { error: 'Invalid payload. Each phase must include a non-empty "title".', status: 400 };
      const tasks = Array.isArray(phase.tasks) ? phase.tasks.map(taskId => String(taskId).trim()).filter(Boolean) : [];
      const validTasks = [];
      for (const taskId of tasks) {
        if (!tasksById.has(taskId)) continue;
        if (assignedTaskIds.has(taskId)) continue;
        assignedTaskIds.add(taskId);
        validTasks.push(taskId);
      }
      normalizedPhases.push({ title, tasks: validTasks });
    }

    plan.data.phases = normalizedPhases;
    const phaseByTaskId = new Map();
    for (const phase of normalizedPhases) {
      for (const taskId of phase.tasks) phaseByTaskId.set(taskId, phase.title);
    }
    for (const task of plan.data.tasks || []) {
      task.phase = phaseByTaskId.get(String(task.id)) || '';
    }

    touchPlan(plan.data);
    repository.writePlan(plan.filePath, plan.data);
    return { status: 200, planId: plan.data.id, phases: plan.data.phases, lastUpdated: plan.data.lastUpdated };
  }

  function updateTaskStatus(planId, taskId, payload) {
    const plan = repository.readPlanById(planId);
    if (!plan) return { status: 404, error: 'Plan not found' };
    const { status } = payload || {};
    if (!validateStatus(status, TASK_STATUSES)) return { status: 400, error: `Invalid status. Allowed: ${TASK_STATUSES.join(', ')}` };
    const task = (plan.data.tasks || []).find(t => t.id === taskId);
    if (!task) return { status: 404, error: 'Task not found' };
    task.status = status;
    const storiesChanged = recomputeStoriesFromTasks(plan.data);
    syncPlanStatusWithTasks(plan.data);
    touchPlan(plan.data);
    repository.writePlan(plan.filePath, plan.data);
    return { status: 200, task, planStatus: plan.data.status, stories: plan.data.stories || [], storiesChanged, lastUpdated: plan.data.lastUpdated };
  }

  function updateTaskDod(planId, taskId, index, payload) {
    const plan = repository.readPlanById(planId);
    if (!plan) return { status: 404, error: 'Plan not found' };
    const { completed } = payload || {};
    if (typeof completed !== 'boolean') return { status: 400, error: 'Invalid payload. "completed" must be a boolean.' };
    const criterionIndex = Number.parseInt(index, 10);
    if (!Number.isInteger(criterionIndex) || criterionIndex < 0) return { status: 400, error: 'Invalid Definition of Done index' };
    const task = (plan.data.tasks || []).find(t => t.id === taskId);
    if (!task) return { status: 404, error: 'Task not found' };
    if (!Array.isArray(task.definitionOfDone) || !task.definitionOfDone[criterionIndex]) return { status: 404, error: 'Definition of Done item not found' };
    task.definitionOfDone[criterionIndex].completed = completed;
    task.status = deriveTaskStatusFromDefinitionOfDone(task.definitionOfDone);
    const storiesChanged = recomputeStoriesFromTasks(plan.data);
    syncPlanStatusWithTasks(plan.data);
    touchPlan(plan.data);
    repository.writePlan(plan.filePath, plan.data);
    return { status: 200, taskId: task.id, criterionIndex, completed, taskStatus: task.status, planStatus: plan.data.status, stories: plan.data.stories || [], storiesChanged, lastUpdated: plan.data.lastUpdated };
  }

  function updateStoryStatus(planId, storyId, payload) {
    const plan = repository.readPlanById(planId);
    if (!plan) return { status: 404, error: 'Plan not found' };
    const { status } = payload || {};
    if (!validateStatus(status, STORY_STATUSES)) return { status: 400, error: `Invalid status. Allowed: ${STORY_STATUSES.join(', ')}` };
    const story = (plan.data.stories || []).find(s => s.id === storyId);
    if (!story) return { status: 404, error: 'Story not found' };
    story.status = status;
    touchPlan(plan.data);
    repository.writePlan(plan.filePath, plan.data);
    return { status: 200, story, lastUpdated: plan.data.lastUpdated };
  }

  function updateTaskTextField(planId, taskId, payload, field, payloadKey, errorLabel) {
    const plan = repository.readPlanById(planId);
    if (!plan) return { status: 404, error: 'Plan not found' };
    const value = payload?.[payloadKey];
    if (typeof value !== 'string') return { status: 400, error: `Invalid payload. "${payloadKey}" must be a string.` };
    const task = (plan.data.tasks || []).find(t => t.id === taskId);
    if (!task) return { status: 404, error: 'Task not found' };
    task[field] = value.trim();
    touchPlan(plan.data);
    repository.writePlan(plan.filePath, plan.data);
    return { status: 200, planId: plan.data.id, taskId: task.id, value: task[field], key: errorLabel, lastUpdated: plan.data.lastUpdated };
  }

  function updateTaskNotes(planId, taskId, payload) {
    return updateTaskTextField(planId, taskId, payload, 'notes', 'notes', 'notes');
  }

  function updateTaskImplementationNotes(planId, taskId, payload) {
    return updateTaskTextField(planId, taskId, payload, 'implementationNotes', 'implementationNotes', 'implementationNotes');
  }

  function updateTaskTitle(planId, taskId, payload) {
    return updateTaskTextField(planId, taskId, payload, 'title', 'title', 'title');
  }

  function updateTaskWhatToDo(planId, taskId, payload) {
    return updateTaskTextField(planId, taskId, payload, 'whatToDo', 'whatToDo', 'whatToDo');
  }

  function updateTaskPhase(planId, taskId, payload) {
    const plan = repository.readPlanById(planId);
    if (!plan) return { status: 404, error: 'Plan not found' };
    const { phase } = payload || {};
    if (typeof phase !== 'string') return { status: 400, error: 'Invalid payload. "phase" must be a string.' };
    const task = (plan.data.tasks || []).find(t => t.id === taskId);
    if (!task) return { status: 404, error: 'Task not found' };
    const phaseTitle = phase.trim();
    const phases = Array.isArray(plan.data.phases) ? plan.data.phases : [];
    const targetPhase = phases.find(item => String(item?.title || '').trim() === phaseTitle);
    if (!targetPhase) return { status: 400, error: 'Invalid phase. Select an existing plan phase.' };
    for (const currentPhase of phases) {
      if (!Array.isArray(currentPhase.tasks)) currentPhase.tasks = [];
      currentPhase.tasks = currentPhase.tasks.map(taskRef => String(taskRef).trim()).filter(Boolean).filter(taskRef => taskRef !== task.id);
    }
    targetPhase.tasks.push(task.id);
    task.phase = phaseTitle;
    touchPlan(plan.data);
    repository.writePlan(plan.filePath, plan.data);
    return { status: 200, planId: plan.data.id, taskId: task.id, phase: task.phase, lastUpdated: plan.data.lastUpdated };
  }

  function updateTaskStringArray(planId, taskId, payload, key) {
    const plan = repository.readPlanById(planId);
    if (!plan) return { status: 404, error: 'Plan not found' };
    const normalized = normalizeUniqueStringArray(payload?.[key]);
    if (!normalized) return { status: 400, error: `Invalid payload. "${key}" must be an array of strings.` };
    const task = (plan.data.tasks || []).find(t => t.id === taskId);
    if (!task) return { status: 404, error: 'Task not found' };
    task[key] = normalized;
    touchPlan(plan.data);
    repository.writePlan(plan.filePath, plan.data);
    return { status: 200, planId: plan.data.id, taskId: task.id, value: task[key], key, lastUpdated: plan.data.lastUpdated };
  }

  function updateTaskFiles(planId, taskId, payload) { return updateTaskStringArray(planId, taskId, payload, 'files'); }
  function updateTaskEndpoints(planId, taskId, payload) { return updateTaskStringArray(planId, taskId, payload, 'endpoints'); }

  function updateTaskDependsOn(planId, taskId, payload) {
    const plan = repository.readPlanById(planId);
    if (!plan) return { status: 404, error: 'Plan not found' };
    const dependsOn = normalizeUniqueStringArray(payload?.dependsOn);
    if (!dependsOn) return { status: 400, error: 'Invalid payload. "dependsOn" must be an array of strings.' };
    const task = (plan.data.tasks || []).find(t => t.id === taskId);
    if (!task) return { status: 404, error: 'Task not found' };
    if (dependsOn.includes(task.id)) return { status: 400, error: 'A task cannot depend on itself.' };
    const existingTaskIds = new Set((plan.data.tasks || []).map(t => t.id));
    const invalidTaskIds = dependsOn.filter(depId => !existingTaskIds.has(depId));
    if (invalidTaskIds.length) return { status: 400, error: `Invalid task IDs in dependsOn: ${invalidTaskIds.join(', ')}` };
    task.dependsOn = dependsOn;
    touchPlan(plan.data);
    repository.writePlan(plan.filePath, plan.data);
    return { status: 200, planId: plan.data.id, taskId: task.id, dependsOn: task.dependsOn, lastUpdated: plan.data.lastUpdated };
  }

  return { listPlans, getPlanById, createDecision, updateDecision, deleteDecision, updateNotes, updateObjective, updatePhases, updateTaskStatus, updateTaskDod, updateStoryStatus, updateTaskNotes, updateTaskImplementationNotes, updateTaskTitle, updateTaskPhase, updateTaskWhatToDo, updateTaskFiles, updateTaskEndpoints, updateTaskDependsOn };
}
