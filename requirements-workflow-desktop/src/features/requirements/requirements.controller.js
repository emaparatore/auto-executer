import { createRequirementsHandlers } from '/src/features/requirements/requirements.handlers.js';
import { createRequirementDetailHandlers } from '/src/features/requirements/requirementDetail.handlers.js';
import { createStoriesHandlers } from '/src/features/requirements/stories.handlers.js';
import { createSubRequirementsHandlers } from '/src/features/requirements/subRequirements.handlers.js';
import { createOpenQuestionsHandlers } from '/src/features/requirements/openQuestions.handlers.js';
import { filterRequirementsByStatuses, getRequirementStatuses } from '/src/features/requirements/requirements.selectors.js';

function createRequirementsController(deps) {
  const handlers = createRequirementsHandlers(deps);
  const detailHandlers = createRequirementDetailHandlers(deps);
  const storiesHandlers = createStoriesHandlers(deps);
  const subRequirementsHandlers = createSubRequirementsHandlers(deps);
  const openQuestionsHandlers = createOpenQuestionsHandlers(deps);

  function getStatusesForRequirements(requirements, statusSortOrder) {
    return getRequirementStatuses(requirements, statusSortOrder);
  }

  function getFilteredRequirements(requirements, enabledStatuses) {
    return filterRequirementsByStatuses(requirements, enabledStatuses);
  }

  return {
    ...handlers,
    ...detailHandlers,
    ...storiesHandlers,
    ...subRequirementsHandlers,
    ...openQuestionsHandlers,
    getStatusesForRequirements,
    getFilteredRequirements
  };
}

export { createRequirementsController };
