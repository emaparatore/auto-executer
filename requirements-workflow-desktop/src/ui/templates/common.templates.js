function renderStatusFiltersTemplate(statuses, activeSet, deps) {
  const { escapeHtml, formatStatus } = deps;
  return statuses.map((status) => `
    <label class="status-filter-option" title="${escapeHtml(formatStatus(status))}">
      <input type="checkbox" data-status="${escapeHtml(status)}" ${activeSet.has(status) ? 'checked' : ''}>
      <span>${escapeHtml(formatStatus(status))}</span>
    </label>
  `).join('');
}

export { renderStatusFiltersTemplate };
