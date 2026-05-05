import { createPlansHandlers } from '/src/features/plans/plans.handlers.js';
import { filterPlansByStatuses, getPlanStatuses } from '/src/features/plans/plans.selectors.js';

function createPlansController(deps) {
  const handlers = createPlansHandlers(deps);

  function getStatusesForPlans(plans, statusSortOrder) {
    return getPlanStatuses(plans, statusSortOrder);
  }

  function getFilteredPlans(plans, enabledStatuses) {
    return filterPlansByStatuses(plans, enabledStatuses);
  }

  return {
    ...handlers,
    getStatusesForPlans,
    getFilteredPlans
  };
}

export { createPlansController };
