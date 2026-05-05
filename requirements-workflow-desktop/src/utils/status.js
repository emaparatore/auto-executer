const STATUS_LABELS = {
  in_progress: 'In Progress',
  completed: 'Completed',
  pending: 'Pending',
  skipped: 'Skipped',
  cancelled: 'Cancelled',
  draft: 'Draft',
  in_review: 'In Review',
  approved: 'Approved',
  implemented: 'Implemented'
};

function formatStatus(status) {
  return STATUS_LABELS[status] || status;
}

function normalizeStoryStatus(status) {
  const value = String(status || '').trim().toLowerCase();
  if (value === 'completed' || value === 'done') return 'completed';
  if (value === 'in_progress' || value === 'in progress') return 'in_progress';
  return 'in_progress';
}

export { formatStatus, normalizeStoryStatus };
