function getRequirementStatus(item) {
  return String(item?.status || 'pending').trim().toLowerCase();
}

function getRequirementStatuses(requirements, statusSortOrder) {
  const statuses = Array.from(new Set((requirements || []).map(getRequirementStatus).filter(Boolean)));
  const orderMap = new Map((statusSortOrder || []).map((status, index) => [status, index]));

  return statuses.sort((a, b) => {
    const aRank = orderMap.has(a) ? orderMap.get(a) : Number.MAX_SAFE_INTEGER;
    const bRank = orderMap.has(b) ? orderMap.get(b) : Number.MAX_SAFE_INTEGER;
    if (aRank !== bRank) return aRank - bRank;
    return a.localeCompare(b);
  });
}

function filterRequirementsByStatuses(requirements, enabledStatuses) {
  return (requirements || []).filter((item) => (enabledStatuses || new Set()).has(getRequirementStatus(item)));
}

export { getRequirementStatus, getRequirementStatuses, filterRequirementsByStatuses };
