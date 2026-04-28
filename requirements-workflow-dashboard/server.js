import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3500;

const PLANS_DIR = path.join(__dirname, '..', 'docs', 'plans');
const REQUIREMENTS_DIR = path.join(__dirname, '..', 'docs', 'requirements');
const TASK_STATUSES = ['pending', 'in_progress', 'completed', 'skipped', 'cancelled'];
const STORY_STATUSES = ['in_progress', 'completed'];

app.use(express.json());
app.use(express.static(__dirname));

function getPlanFilePath(planId) {
  return path.join(PLANS_DIR, `${planId}.json`);
}

function readPlanById(planId) {
  const filePath = getPlanFilePath(planId);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  return { filePath, data };
}

function writePlan(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf-8');
}

function getRequirementFilePath(requirementId) {
  return path.join(REQUIREMENTS_DIR, `${requirementId}.json`);
}

function readRequirementById(requirementId) {
  const filePath = getRequirementFilePath(requirementId);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  return { filePath, data };
}

function getRequirementsFiles() {
  if (!fs.existsSync(REQUIREMENTS_DIR)) return [];
  return fs
    .readdirSync(REQUIREMENTS_DIR)
    .filter(file => file.endsWith('.json') && file !== 'requirements.schema.json');
}

function validateStatus(status, allowedStatuses) {
  return typeof status === 'string' && allowedStatuses.includes(status);
}

function touchPlan(data) {
  data.lastUpdated = new Date().toISOString().slice(0, 10);
}

function parseStoryTaskIds(tasksValue) {
  if (Array.isArray(tasksValue)) {
    return tasksValue.map(value => String(value).trim()).filter(Boolean);
  }
  if (typeof tasksValue !== 'string') return [];
  return tasksValue.split(',').map(value => value.trim()).filter(Boolean);
}

function normalizeStoryStatus(status) {
  const value = String(status || '').trim().toLowerCase();
  if (value === 'completed' || value === 'done') return 'completed';
  return 'in_progress';
}

function computeStoryStatusFromTasks(story, tasksById) {
  const taskIds = parseStoryTaskIds(story?.tasks);
  if (!taskIds.length) return 'in_progress';
  const allCompleted = taskIds.every(taskId => tasksById.get(taskId)?.status === 'completed');
  return allCompleted ? 'completed' : 'in_progress';
}

function recomputeStoriesFromTasks(data) {
  if (!Array.isArray(data?.stories)) return false;

  const tasksById = new Map((data.tasks || []).map(task => [task.id, task]));
  let hasChanges = false;

  for (const story of data.stories) {
    const nextStatus = computeStoryStatusFromTasks(story, tasksById);
    if (normalizeStoryStatus(story.status) !== nextStatus) {
      story.status = nextStatus;
      hasChanges = true;
    }
  }

  return hasChanges;
}

app.get('/api/plans', (req, res) => {
  const files = fs.readdirSync(PLANS_DIR).filter(f => f.endsWith('.json'));
  const plans = files.map(file => {
    const data = JSON.parse(fs.readFileSync(path.join(PLANS_DIR, file), 'utf-8'));
    return {
      id: data.id,
      title: data.title,
      status: data.status,
      created: data.created,
      lastUpdated: data.lastUpdated,
      requirements: data.requirements,
      storiesCount: data.stories?.length || 0,
      tasksCount: data.tasks?.length || 0,
      decisionsCount: data.decisions?.length || 0
    };
  });
  res.json(plans);
});

app.get('/api/plans/:id', (req, res) => {
  const plan = readPlanById(req.params.id);
  if (!plan) {
    return res.status(404).json({ error: 'Plan not found' });
  }
  res.json(plan.data);
});

app.get('/api/requirements', (req, res) => {
  const files = getRequirementsFiles();
  const requirements = files.map(file => {
    const data = JSON.parse(fs.readFileSync(path.join(REQUIREMENTS_DIR, file), 'utf-8'));
    const document = data.document || {};

    return {
      id: document.id,
      title: document.title,
      status: document.status || 'draft',
      sourcePath: document.sourcePath || null,
      version: document.version || null,
      functionalCount: (data.functionalRequirements || []).length,
      nonFunctionalCount: (data.nonFunctionalRequirements || []).length,
      storiesCount: (data.userStories || []).length,
      decisionsCount: (data.architecturalDecisions || []).length,
      openQuestionsCount: (data.openQuestions || []).length
    };
  });

  res.json(requirements);
});

app.get('/api/requirements/:id', (req, res) => {
  const requirement = readRequirementById(req.params.id);
  if (!requirement) {
    return res.status(404).json({ error: 'Requirement not found' });
  }

  res.json(requirement.data);
});

app.patch('/api/plans/:id/tasks/:taskId/status', (req, res) => {
  const plan = readPlanById(req.params.id);
  if (!plan) {
    return res.status(404).json({ error: 'Plan not found' });
  }

  const { status } = req.body || {};
  if (!validateStatus(status, TASK_STATUSES)) {
    return res.status(400).json({ error: `Invalid status. Allowed: ${TASK_STATUSES.join(', ')}` });
  }

  const { filePath, data } = plan;
  const task = (data.tasks || []).find(t => t.id === req.params.taskId);

  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  task.status = status;
  const storiesChanged = recomputeStoriesFromTasks(data);
  touchPlan(data);
  writePlan(filePath, data);

  res.json({
    ok: true,
    task,
    stories: data.stories || [],
    storiesChanged,
    lastUpdated: data.lastUpdated
  });
});

app.patch('/api/plans/:id/stories/:storyId/status', (req, res) => {
  const plan = readPlanById(req.params.id);
  if (!plan) {
    return res.status(404).json({ error: 'Plan not found' });
  }

  const { status } = req.body || {};
  if (!validateStatus(status, STORY_STATUSES)) {
    return res.status(400).json({ error: `Invalid status. Allowed: ${STORY_STATUSES.join(', ')}` });
  }

  const { filePath, data } = plan;
  const story = (data.stories || []).find(s => s.id === req.params.storyId);

  if (!story) {
    return res.status(404).json({ error: 'Story not found' });
  }

  story.status = status;
  touchPlan(data);
  writePlan(filePath, data);

  res.json({ ok: true, story, lastUpdated: data.lastUpdated });
});

app.get('/api/search', (req, res) => {
  const query = (req.query.q || '').toLowerCase();
  if (!query) return res.json([]);
  
  const files = fs.readdirSync(PLANS_DIR).filter(f => f.endsWith('.json'));
  const results = [];
  
  for (const file of files) {
    const data = JSON.parse(fs.readFileSync(path.join(PLANS_DIR, file), 'utf-8'));
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
    
    if (matches.length > 0) {
      results.push({ plan: data.id, matches });
    }
  }

  const requirementFiles = getRequirementsFiles();

  for (const file of requirementFiles) {
    const data = JSON.parse(fs.readFileSync(path.join(REQUIREMENTS_DIR, file), 'utf-8'));
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

    if (matches.length > 0) {
      results.push({ plan: requirementId, domain: 'requirement', matches });
    }
  }
  
  res.json(results);
});

app.listen(PORT, () => {
  console.log(`Plans viewer: http://localhost:${PORT}`);
});
