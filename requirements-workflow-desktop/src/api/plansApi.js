import { getJson } from '/src/api/http.js';

function listPlans() {
  return getJson('/api/plans', { cache: 'no-store' });
}

function getPlanById(planId) {
  return getJson(`/api/plans/${encodeURIComponent(planId)}`, { cache: 'no-store' });
}

export { listPlans, getPlanById };
