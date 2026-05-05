function renderPlansListSection(params) {
  const {
    container,
    plans,
    requirements,
    filteredPlans,
    counts,
    renderPlansListTemplate
  } = params;

  counts.plansSwitchCount.textContent = `(${plans.length})`;
  counts.requirementsSwitchCount.textContent = `(${requirements.length})`;

  if (!filteredPlans.length) {
    container.innerHTML = '<div class="empty-state empty-state-padded">No plans match the selected status filters.</div>';
    return;
  }

  container.innerHTML = renderPlansListTemplate(filteredPlans);
}

export { renderPlansListSection };
