function renderRequirementsListSection(params) {
  const {
    container,
    plans,
    requirements,
    filteredRequirements,
    counts,
    renderRequirementsListTemplate
  } = params;

  counts.plansSwitchCount.textContent = `(${plans.length})`;
  counts.requirementsSwitchCount.textContent = `(${requirements.length})`;

  if (!filteredRequirements.length) {
    container.innerHTML = '<div class="empty-state empty-state-padded">No requirements match the selected status filters.</div>';
    return;
  }

  container.innerHTML = renderRequirementsListTemplate(filteredRequirements);
}

function renderStatusFiltersSection(params) {
  const { filtersRoot, statuses, activeSet, renderStatusFiltersTemplate } = params;

  if (!statuses.length) {
    filtersRoot.innerHTML = '';
    filtersRoot.classList.add('is-empty');
    return;
  }

  filtersRoot.classList.remove('is-empty');
  filtersRoot.innerHTML = renderStatusFiltersTemplate(statuses, activeSet);
}

export { renderRequirementsListSection, renderStatusFiltersSection };
