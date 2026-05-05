function getPlanStatus(item) {
  return String(item?.status || 'pending').trim().toLowerCase();
}

function getPlanStatuses(plans, statusSortOrder) {
  const statuses = Array.from(new Set((plans || []).map(getPlanStatus).filter(Boolean)));
  const orderMap = new Map((statusSortOrder || []).map((status, index) => [status, index]));

  return statuses.sort((a, b) => {
    const aRank = orderMap.has(a) ? orderMap.get(a) : Number.MAX_SAFE_INTEGER;
    const bRank = orderMap.has(b) ? orderMap.get(b) : Number.MAX_SAFE_INTEGER;
    if (aRank !== bRank) return aRank - bRank;
    return a.localeCompare(b);
  });
}

function filterPlansByStatuses(plans, enabledStatuses) {
  return (plans || []).filter((item) => (enabledStatuses || new Set()).has(getPlanStatus(item)));
}

function buildPhasesForEditor(plan) {
  const planPhases = Array.isArray(plan?.phases) ? plan.phases : [];
  const tasks = Array.isArray(plan?.tasks) ? plan.tasks : [];
  const tasksById = new Map(tasks.map(task => [String(task.id), task]));

  return planPhases
    .map(phase => {
      const title = String(phase?.title || '').trim();
      if (!title) return null;

      const fromPhaseList = Array.isArray(phase?.tasks)
        ? phase.tasks.map(taskId => String(taskId).trim()).filter(Boolean)
        : [];
      const fromTaskField = tasks
        .filter(task => String(task?.phase || '').trim() === title)
        .map(task => String(task.id));

      const mergedTaskIds = Array.from(new Set([...fromPhaseList, ...fromTaskField]))
        .filter(taskId => tasksById.has(taskId));

      return { title, tasks: mergedTaskIds };
    })
    .filter(Boolean);
}

export { getPlanStatus, getPlanStatuses, filterPlansByStatuses, buildPhasesForEditor };
