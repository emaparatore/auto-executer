function renderRequirementsListTemplate(filteredRequirements, deps) {
  const { escapeHtml, formatStatus } = deps;
  return filteredRequirements.map((req) => `
    <div class="plan-item" data-id="${escapeHtml(req.id)}" onclick="selectRequirementByEncodedId('${encodeURIComponent(req.id)}')">
      <div class="plan-item-header">
        <span class="plan-item-id">${escapeHtml(req.id)}</span>
        <span class="plan-item-status status-${escapeHtml(req.status || 'pending')}">${formatStatus(req.status || 'pending')}</span>
      </div>
      <div class="plan-item-title">${escapeHtml(req.title || req.id)}</div>
      <div class="plan-item-meta">
        <span>${req.functionalCount || 0} RF</span>
        <span>${req.nonFunctionalCount || 0} RNF</span>
        <span>${req.storiesCount || 0} US</span>
      </div>
    </div>
  `).join('');
}

export { renderRequirementsListTemplate };
