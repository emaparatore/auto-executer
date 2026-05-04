import fs from 'fs';
import path from 'path';

export function createSearchService(getCurrentWorkspace, listRequirementFiles) {
  function search(queryRaw) {
    const query = String(queryRaw || '').toLowerCase();
    if (!query) return [];

    const activeWorkspace = getCurrentWorkspace();
    if (!activeWorkspace) return [];

    const plansDir = activeWorkspace.plansDir;
    const requirementsDir = activeWorkspace.requirementsDir;
    const files = fs.existsSync(plansDir) ? fs.readdirSync(plansDir).filter(f => f.endsWith('.json')) : [];
    const results = [];

    for (const file of files) {
      const data = JSON.parse(fs.readFileSync(path.join(plansDir, file), 'utf-8'));
      const matches = [];
      if (data.id?.toLowerCase().includes(query) || data.title?.toLowerCase().includes(query)) {
        matches.push({ type: 'plan', id: data.id, text: data.title });
      }
      for (const story of data.stories || []) {
        if (story.id?.toLowerCase().includes(query) || story.description?.toLowerCase().includes(query)) {
          matches.push({ type: 'story', id: story.id, text: `${story.id}: ${story.description}`, plan: data.id });
        }
      }
      for (const task of data.tasks || []) {
        const what = task.whatToDo || '';
        const title = task.title || '';
        if (task.id?.toLowerCase().includes(query) || what.toLowerCase().includes(query) || title.toLowerCase().includes(query)) {
          const preview = (title || what).substring(0, 80);
          matches.push({ type: 'task', id: task.id, text: `${task.id}: ${preview}${preview.length === 80 ? '...' : ''}`, plan: data.id });
        }
      }
      if (matches.length > 0) results.push({ plan: data.id, matches });
    }

    const requirementFiles = listRequirementFiles();
    for (const file of requirementFiles) {
      const data = JSON.parse(fs.readFileSync(path.join(requirementsDir, file), 'utf-8'));
      const document = data.document || {};
      const matches = [];
      const requirementId = document.id || file.replace('.json', '');

      if ((requirementId || '').toLowerCase().includes(query) || (document.title || '').toLowerCase().includes(query)) {
        matches.push({ type: 'requirement', id: requirementId, text: document.title || requirementId });
      }
      for (const item of data.functionalRequirements || []) {
        if ((item.id || '').toLowerCase().includes(query) || (item.title || '').toLowerCase().includes(query) || (item.description || '').toLowerCase().includes(query)) {
          matches.push({ type: 'rf', id: item.id, text: `${item.id}: ${item.title || item.description || ''}` });
        }
      }
      for (const item of data.nonFunctionalRequirements || []) {
        if ((item.id || '').toLowerCase().includes(query) || (item.title || '').toLowerCase().includes(query) || (item.description || '').toLowerCase().includes(query)) {
          matches.push({ type: 'rnf', id: item.id, text: `${item.id}: ${item.title || item.description || ''}` });
        }
      }
      for (const story of data.userStories || []) {
        const combined = `${story.asA || ''} ${story.iWant || ''} ${story.soThat || ''}`.toLowerCase();
        if ((story.id || '').toLowerCase().includes(query) || (story.title || '').toLowerCase().includes(query) || combined.includes(query)) {
          matches.push({ type: 'user-story', id: story.id, text: `${story.id}: ${story.title || story.iWant || ''}` });
        }
      }
      for (const question of data.openQuestions || []) {
        if ((question.id || '').toLowerCase().includes(query) || (question.question || '').toLowerCase().includes(query) || (question.answer || '').toLowerCase().includes(query)) {
          matches.push({ type: 'open-question', id: question.id, text: `${question.id}: ${question.question || ''}` });
        }
      }
      if (matches.length > 0) results.push({ plan: requirementId, domain: 'requirement', matches });
    }

    return results;
  }

  return { search };
}
