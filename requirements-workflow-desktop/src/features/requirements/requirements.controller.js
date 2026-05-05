import { createRequirementsHandlers } from '/src/features/requirements/requirements.handlers.js';
import { filterRequirementsByStatuses, getRequirementStatuses } from '/src/features/requirements/requirements.selectors.js';

function createRequirementsController(deps) {
  const handlers = createRequirementsHandlers(deps);

  function getStatusesForRequirements(requirements, statusSortOrder) {
    return getRequirementStatuses(requirements, statusSortOrder);
  }

  function getFilteredRequirements(requirements, enabledStatuses) {
    return filterRequirementsByStatuses(requirements, enabledStatuses);
  }

  return {
    ...handlers,
    getStatusesForRequirements,
    getFilteredRequirements
  };
}

export { createRequirementsController };
