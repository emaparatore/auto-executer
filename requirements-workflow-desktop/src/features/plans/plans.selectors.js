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

export { getPlanStatus, getPlanStatuses, filterPlansByStatuses };
