import { getJson } from '/src/api/http.js';

function listRequirements() {
  return getJson('/api/requirements', { cache: 'no-store' });
}

function getRequirementById(requirementId) {
  return getJson(`/api/requirements/${encodeURIComponent(requirementId)}`, { cache: 'no-store' });
}

export { listRequirements, getRequirementById };
