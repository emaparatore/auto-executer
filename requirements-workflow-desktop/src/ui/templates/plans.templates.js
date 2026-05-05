function renderPlansListTemplate(filteredPlans, deps) {
  const { escapeHtml, formatStatus } = deps;
  return filteredPlans.map((plan) => `
    <div class="plan-item" data-id="${escapeHtml(plan.id)}" onclick="selectPlanByEncodedId('${encodeURIComponent(plan.id)}')">
      <div class="plan-item-header">
        <span class="plan-item-id">${escapeHtml(plan.id)}</span>
        <span class="plan-item-status status-${escapeHtml(plan.status)}">${formatStatus(plan.status)}</span>
      </div>
      <div class="plan-item-title">${escapeHtml(plan.title)}</div>
      <div class="plan-item-meta">
        <span>${plan.storiesCount} stories</span>
        <span>${plan.tasksCount} tasks</span>
      </div>
    </div>
  `).join('');
}

export { renderPlansListTemplate };
