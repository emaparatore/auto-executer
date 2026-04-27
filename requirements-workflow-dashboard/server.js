import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3500;

const PLANS_DIR = path.join(__dirname, '..', 'docs', 'plans');
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

function validateStatus(status, allowedStatuses) {
  return typeof status === 'string' && allowedStatuses.includes(status);
}

function touchPlan(data) {
  data.lastUpdated = new Date().toISOString().slice(0, 10);
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
  touchPlan(data);
  writePlan(filePath, data);

  res.json({ ok: true, task, lastUpdated: data.lastUpdated });
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
  
  res.json(results);
});

app.listen(PORT, () => {
  console.log(`Plans viewer: http://localhost:${PORT}`);
});
