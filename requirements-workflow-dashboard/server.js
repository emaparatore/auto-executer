import express from 'express';
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3500;

const WORKSPACES_DB_FILE = path.join(__dirname, 'workspaces.db');
const TASK_STATUSES = ['pending', 'in_progress', 'completed', 'skipped', 'cancelled'];
const STORY_STATUSES = ['in_progress', 'completed'];
const OPEN_QUESTION_STATUSES = ['open', 'resolved'];

app.use(express.json());
app.use(express.static(__dirname));

const db = new Database(WORKSPACES_DB_FILE);
db.exec('CREATE TABLE IF NOT EXISTS workspaces (key TEXT PRIMARY KEY, label TEXT NOT NULL, root_dir TEXT NOT NULL, is_current INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)');

function clearCurrentWorkspaceFlag() {
  db.prepare('UPDATE workspaces SET is_current = 0 WHERE is_current = 1').run();
}

function getWorkspaceCatalog() {
  return db.prepare('SELECT key, label, root_dir as rootDir, is_current as isCurrent FROM workspaces ORDER BY created_at ASC').all();
}

function getCurrentWorkspace() {
  const active = db.prepare('SELECT key, label, root_dir as rootDir FROM workspaces WHERE is_current = 1 LIMIT 1').get() || null;
  if (!active) return null;
  return {
    ...active,
    plansDir: path.join(active.rootDir, 'plans'),
    requirementsDir: path.join(active.rootDir, 'requirements')
  };
}

function getPlanFilePath(planId) {
  const workspace = getCurrentWorkspace();
  if (!workspace) return null;
  return path.join(workspace.plansDir, `${planId}.json`);
}

function readPlanById(planId) {
  const filePath = getPlanFilePath(planId);
  if (!filePath) return null;
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
  const workspace = getCurrentWorkspace();
  if (!workspace) return null;
  return path.join(workspace.requirementsDir, `${requirementId}.json`);
}

function readRequirementById(requirementId) {
  const filePath = getRequirementFilePath(requirementId);
  if (!filePath) return null;
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  return { filePath, data };
}

function writeRequirement(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf-8');
}

function getRequirementsFiles() {
  const workspace = getCurrentWorkspace();
  if (!workspace) return [];
  const requirementsDir = workspace.requirementsDir;
  if (!requirementsDir) return [];
  if (!fs.existsSync(requirementsDir)) return [];
  return fs
    .readdirSync(requirementsDir)
    .filter(file => file.endsWith('.json') && file !== 'requirements.schema.json');
}

app.get('/api/workspaces', (req, res) => {
  const workspaces = getWorkspaceCatalog().map(item => ({ key: item.key, label: item.label, rootDir: item.rootDir }));
  const currentWorkspace = db.prepare('SELECT key FROM workspaces WHERE is_current = 1 LIMIT 1').get();
  res.json({ workspaces, currentWorkspaceKey: currentWorkspace?.key || null });
});

app.get('/api/workspace/current', (req, res) => {
  const active = getCurrentWorkspace();
  res.json({ workspace: active ? { key: active.key, label: active.label } : null });
});

app.post('/api/workspace/select', (req, res) => {
  const key = String(req.body?.key || '').trim();
  const workspaces = getWorkspaceCatalog();
  const selected = workspaces.find(item => item.key === key);
  if (!selected) return res.status(404).json({ error: 'Workspace not found' });
  clearCurrentWorkspaceFlag();
  db.prepare('UPDATE workspaces SET is_current = 1, updated_at = ? WHERE key = ?').run(new Date().toISOString(), selected.key);
  res.json({ ok: true, workspace: { key: selected.key, label: selected.label } });
});

app.post('/api/workspaces', (req, res) => {
  const label = String(req.body?.label || '').trim();
  const projectRootDir = path.resolve(String(req.body?.rootDir || '').trim());
  if (!label || !projectRootDir) return res.status(400).json({ error: 'label e rootDir sono obbligatori.' });
  const docsDir = path.join(projectRootDir, 'docs');
  const plansDir = path.join(docsDir, 'plans');
  const requirementsDir = path.join(docsDir, 'requirements');
  if (!fs.existsSync(docsDir) || !fs.statSync(docsDir).isDirectory()) {
    return res.status(400).json({ error: 'Cartella docs non trovata. Crea docs/plans e docs/requirements e riprova.' });
  }
  if (!fs.existsSync(plansDir) || !fs.statSync(plansDir).isDirectory()) {
    return res.status(400).json({ error: 'Cartella docs/plans non trovata. Creala e riprova ad aggiungere il workspace.' });
  }
  if (!fs.existsSync(requirementsDir) || !fs.statSync(requirementsDir).isDirectory()) {
    return res.status(400).json({ error: 'Cartella docs/requirements non trovata. Creala e riprova ad aggiungere il workspace.' });
  }

  const state = { workspaces: getWorkspaceCatalog() };
  const key = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `ws-${Date.now()}`;
  if (state.workspaces.some(item => item.key === key || path.resolve(item.rootDir) === docsDir)) {
    return res.status(409).json({ error: 'Workspace gia presente.' });
  }
  clearCurrentWorkspaceFlag();
  const now = new Date().toISOString();
  db.prepare('INSERT INTO workspaces (key, label, root_dir, is_current, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?)').run(key, label, docsDir, now, now);
  res.status(201).json({ ok: true, workspace: { key, label } });
});

app.post('/api/workspaces/pick-folder', (req, res) => {
  if (process.platform !== 'win32') {
    return res.status(400).json({ error: 'Selezione grafica cartella disponibile solo su Windows.' });
  }
  try {
    const script = "Add-Type -AssemblyName System.Windows.Forms; $dialog = New-Object System.Windows.Forms.FolderBrowserDialog; $dialog.Description = 'Seleziona la cartella progetto'; $dialog.ShowNewFolderButton = $false; $result = $dialog.ShowDialog(); if ($result -eq [System.Windows.Forms.DialogResult]::OK) { Write-Output $dialog.SelectedPath }";
    const selectedPath = String(execFileSync('powershell', ['-NoProfile', '-STA', '-Command', script], { encoding: 'utf-8' }) || '').trim();
    if (!selectedPath) {
      return res.status(400).json({ error: 'Nessuna cartella selezionata.' });
    }
    res.json({ ok: true, path: selectedPath });
  } catch {
    res.status(500).json({ error: 'Impossibile aprire il selettore cartella.' });
  }
});

app.patch('/api/workspaces/:key', (req, res) => {
  const key = String(req.params.key || '').trim();
  const label = String(req.body?.label || '').trim();
  if (!key || !label) return res.status(400).json({ error: 'key e label sono obbligatori.' });
  const item = db.prepare('SELECT key FROM workspaces WHERE key = ?').get(key);
  if (!item) return res.status(404).json({ error: 'Workspace non trovato.' });
  db.prepare('UPDATE workspaces SET label = ?, updated_at = ? WHERE key = ?').run(label, new Date().toISOString(), key);
  res.json({ ok: true, workspace: { key, label } });
});

app.delete('/api/workspaces/:key', (req, res) => {
  const key = String(req.params.key || '').trim();
  const exists = db.prepare('SELECT is_current as isCurrent FROM workspaces WHERE key = ?').get(key);
  if (!exists) return res.status(404).json({ error: 'Workspace non trovato.' });
  db.prepare('DELETE FROM workspaces WHERE key = ?').run(key);
  if (exists.isCurrent) {
    const next = db.prepare('SELECT key FROM workspaces ORDER BY created_at ASC LIMIT 1').get();
    if (next) db.prepare('UPDATE workspaces SET is_current = 1, updated_at = ? WHERE key = ?').run(new Date().toISOString(), next.key);
  }
  const current = db.prepare('SELECT key FROM workspaces WHERE is_current = 1 LIMIT 1').get();
  res.json({ ok: true, currentWorkspaceKey: current?.key || null });
});

function validateStatus(status, allowedStatuses) {
  return typeof status === 'string' && allowedStatuses.includes(status);
}

function touchPlan(data) {
  data.lastUpdated = new Date().toISOString();
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

function derivePlanStatusFromTasks(tasks) {
  const taskList = Array.isArray(tasks) ? tasks : [];
  const normalizedStatuses = taskList.map(task => {
    const value = String(task?.status || '').trim().toLowerCase();
    if (value === 'completed' || value === 'done') return 'completed';
    if (value === 'in_progress' || value === 'in progress') return 'in_progress';
    return value || 'pending';
  });

  if (normalizedStatuses.length > 0 && normalizedStatuses.every(status => status === 'completed')) return 'completed';
  if (normalizedStatuses.some(status => status === 'completed')) return 'in_progress';
  if (normalizedStatuses.some(status => status === 'in_progress')) return 'in_progress';
  return 'pending';
}

function syncPlanStatusWithTasks(data) {
  const nextStatus = derivePlanStatusFromTasks(data?.tasks);
  const currentStatus = String(data?.status || '').trim().toLowerCase();
  if (currentStatus !== nextStatus) {
    data.status = nextStatus;
    return true;
  }
  return false;
}

function deriveTaskStatusFromDefinitionOfDone(definitionOfDone) {
  const items = Array.isArray(definitionOfDone) ? definitionOfDone : [];
  if (!items.length) return 'pending';

  const completedCount = items.filter(item => Boolean(item?.completed)).length;
  if (completedCount === 0) return 'pending';
  if (completedCount === items.length) return 'completed';
  return 'in_progress';
}

function normalizeUniqueStringArray(values) {
  if (!Array.isArray(values)) return null;
  const result = [];
  const seen = new Set();
  for (const value of values) {
    const normalized = String(value || '').trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(normalized);
  }
  return result;
}

app.get('/api/plans', (req, res) => {
  const workspace = getCurrentWorkspace();
  if (!workspace) return res.json([]);
  const plansDir = workspace.plansDir;
  if (!fs.existsSync(plansDir)) return res.json([]);
  const files = fs.readdirSync(plansDir).filter(f => f.endsWith('.json'));
  const plans = files.map(file => {
    const filePath = path.join(plansDir, file);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    if (syncPlanStatusWithTasks(data)) {
      writePlan(filePath, data);
    }
    return {
      id: data.id,
      title: data.title,
      status: data.status || 'pending',
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
  if (syncPlanStatusWithTasks(plan.data)) {
    writePlan(plan.filePath, plan.data);
  }
  res.json(plan.data);
});

app.post('/api/plans/:id/decisions', (req, res) => {
  const plan = readPlanById(req.params.id);
  if (!plan) return res.status(404).json({ error: 'Plan not found' });

  const { decisionId, description, rationale } = req.body || {};
  if (typeof decisionId !== 'string') {
    return res.status(400).json({ error: 'Invalid payload. "decisionId" must be a string.' });
  }

  const normalizedId = decisionId.trim();
  const normalizedDescription = String(description || '').trim();
  const normalizedRationale = String(rationale || '').trim();
  const today = new Date().toISOString().slice(0, 10);

  if (!normalizedId) return res.status(400).json({ error: 'decisionId is required.' });
  if (!normalizedDescription || !normalizedRationale) {
    return res.status(400).json({ error: 'Description and rationale are required.' });
  }

  const { filePath, data } = plan;
  const decisions = Array.isArray(data.decisions) ? data.decisions : [];
  if (decisions.some(item => (item.id || item.decision) === normalizedId)) {
    return res.status(409).json({ error: 'Decision ID already exists.' });
  }

  const newDecision = {
    id: normalizedId,
    description: normalizedDescription,
    rationale: normalizedRationale,
    date: today
  };

  data.decisions = [...decisions, newDecision];
  writePlan(filePath, data);
  res.status(201).json({ ok: true, item: newDecision });
});

app.patch('/api/plans/:id/decisions/:decisionId', (req, res) => {
  const plan = readPlanById(req.params.id);
  if (!plan) return res.status(404).json({ error: 'Plan not found' });

  const { description, rationale } = req.body || {};
  if (typeof description !== 'string' || typeof rationale !== 'string') {
    return res.status(400).json({ error: 'Invalid payload. "description" and "rationale" must be strings.' });
  }

  const normalizedDescription = description.trim();
  const normalizedRationale = rationale.trim();
  if (!normalizedDescription || !normalizedRationale) {
    return res.status(400).json({ error: 'Description and rationale are required.' });
  }

  const { filePath, data } = plan;
  const item = (data.decisions || []).find(entry => (entry.id || entry.decision) === req.params.decisionId);
  if (!item) return res.status(404).json({ error: 'Decision not found' });

  item.description = normalizedDescription;
  item.rationale = normalizedRationale;

  writePlan(filePath, data);
  res.json({ ok: true, item });
});

app.delete('/api/plans/:id/decisions/:decisionId', (req, res) => {
  const plan = readPlanById(req.params.id);
  if (!plan) return res.status(404).json({ error: 'Plan not found' });

  const { filePath, data } = plan;
  const decisions = Array.isArray(data.decisions) ? data.decisions : [];
  const nextDecisions = decisions.filter(entry => (entry.id || entry.decision) !== req.params.decisionId);
  if (nextDecisions.length === decisions.length) {
    return res.status(404).json({ error: 'Decision not found' });
  }

  data.decisions = nextDecisions;
  writePlan(filePath, data);
  res.json({ ok: true });
});

app.get('/api/requirements', (req, res) => {
  const activeWorkspace = getCurrentWorkspace();
  if (!activeWorkspace) return res.json([]);
  const requirementsDir = activeWorkspace.requirementsDir;
  const files = getRequirementsFiles();
  const requirements = files.map(file => {
    const data = JSON.parse(fs.readFileSync(path.join(requirementsDir, file), 'utf-8'));
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

app.patch('/api/requirements/:id/overview', (req, res) => {
  const requirement = readRequirementById(req.params.id);
  if (!requirement) {
    return res.status(404).json({ error: 'Requirement not found' });
  }

  const { overview } = req.body || {};
  if (typeof overview !== 'string') {
    return res.status(400).json({ error: 'Invalid payload. "overview" must be a string.' });
  }

  const { filePath, data } = requirement;
  data.overview = overview.trim();
  writeRequirement(filePath, data);

  res.json({
    ok: true,
    requirementId: data.document?.id || req.params.id,
    overview: data.overview
  });
});

app.patch('/api/requirements/:id/current-state', (req, res) => {
  const requirement = readRequirementById(req.params.id);
  if (!requirement) {
    return res.status(404).json({ error: 'Requirement not found' });
  }

  const { currentState } = req.body || {};
  if (!Array.isArray(currentState) || !currentState.every(row => row && typeof row === 'object')) {
    return res.status(400).json({ error: 'Invalid payload. "currentState" must be an array of objects.' });
  }

  const { filePath, data } = requirement;
  data.currentState = currentState;
  writeRequirement(filePath, data);

  res.json({
    ok: true,
    requirementId: data.document?.id || req.params.id,
    currentState: data.currentState
  });
});

app.patch('/api/requirements/:id/notes', (req, res) => {
  const requirement = readRequirementById(req.params.id);
  if (!requirement) {
    return res.status(404).json({ error: 'Requirement not found' });
  }

  const { notes } = req.body || {};
  if (notes !== null && notes !== undefined && typeof notes !== 'string') {
    return res.status(400).json({ error: 'Invalid payload. "notes" must be a string or null.' });
  }

  const { filePath, data } = requirement;
  data.notes = notes ?? null;
  writeRequirement(filePath, data);

  res.json({
    ok: true,
    requirementId: data.document?.id || req.params.id,
    notes: data.notes
  });
});

app.post('/api/requirements/:id/functional-requirements', (req, res) => {
  const requirement = readRequirementById(req.params.id);
  if (!requirement) return res.status(404).json({ error: 'Requirement not found' });

  const { functionalId, title, description } = req.body || {};
  if (typeof functionalId !== 'string') {
    return res.status(400).json({ error: 'Invalid payload. "functionalId" must be a string.' });
  }

  const normalizedId = functionalId.trim();
  if (!normalizedId) {
    return res.status(400).json({ error: 'functionalId is required.' });
  }
  if (typeof title !== 'string' || typeof description !== 'string') {
    return res.status(400).json({ error: 'Invalid payload. "title" and "description" must be strings.' });
  }
  const normalizedTitle = title.trim();
  const normalizedDescription = description.trim();
  if (!normalizedTitle || !normalizedDescription) {
    return res.status(400).json({ error: 'Title and description are required.' });
  }

  const { filePath, data } = requirement;
  const functionalRequirements = Array.isArray(data.functionalRequirements) ? data.functionalRequirements : [];
  if (functionalRequirements.some(item => item.id === normalizedId)) {
    return res.status(409).json({ error: 'Functional requirement ID already exists.' });
  }

  const newRequirement = {
    id: normalizedId,
    title: normalizedTitle,
    description: normalizedDescription
  };

  data.functionalRequirements = [...functionalRequirements, newRequirement];
  writeRequirement(filePath, data);
  res.status(201).json({ ok: true, item: newRequirement });
});

app.patch('/api/requirements/:id/functional-requirements/:functionalId', (req, res) => {
  const requirement = readRequirementById(req.params.id);
  if (!requirement) return res.status(404).json({ error: 'Requirement not found' });

  const { title, description } = req.body || {};
  if (typeof title !== 'string' || typeof description !== 'string') {
    return res.status(400).json({ error: 'Invalid payload. "title" and "description" must be strings.' });
  }

  const normalizedTitle = title.trim();
  const normalizedDescription = description.trim();
  if (!normalizedTitle || !normalizedDescription) {
    return res.status(400).json({ error: 'Title and description are required.' });
  }

  const { filePath, data } = requirement;
  const item = (data.functionalRequirements || []).find(entry => entry.id === req.params.functionalId);
  if (!item) return res.status(404).json({ error: 'Functional requirement not found' });

  item.title = normalizedTitle;
  item.description = normalizedDescription;
  writeRequirement(filePath, data);
  res.json({ ok: true, item });
});

app.delete('/api/requirements/:id/functional-requirements/:functionalId', (req, res) => {
  const requirement = readRequirementById(req.params.id);
  if (!requirement) return res.status(404).json({ error: 'Requirement not found' });

  const { filePath, data } = requirement;
  const list = Array.isArray(data.functionalRequirements) ? data.functionalRequirements : [];
  const nextList = list.filter(entry => entry.id !== req.params.functionalId);
  if (nextList.length === list.length) {
    return res.status(404).json({ error: 'Functional requirement not found' });
  }

  data.functionalRequirements = nextList;
  writeRequirement(filePath, data);
  res.json({ ok: true });
});

app.post('/api/requirements/:id/non-functional-requirements', (req, res) => {
  const requirement = readRequirementById(req.params.id);
  if (!requirement) return res.status(404).json({ error: 'Requirement not found' });
  const { nonFunctionalId, title, description } = req.body || {};
  if (typeof nonFunctionalId !== 'string' || typeof title !== 'string' || typeof description !== 'string') {
    return res.status(400).json({ error: 'Invalid payload. "nonFunctionalId", "title" and "description" must be strings.' });
  }
  const normalizedId = nonFunctionalId.trim();
  const normalizedTitle = title.trim();
  const normalizedDescription = description.trim();
  if (!normalizedId || !normalizedTitle || !normalizedDescription) {
    return res.status(400).json({ error: 'nonFunctionalId, title and description are required.' });
  }
  const { filePath, data } = requirement;
  const list = Array.isArray(data.nonFunctionalRequirements) ? data.nonFunctionalRequirements : [];
  if (list.some(item => item.id === normalizedId)) return res.status(409).json({ error: 'Non-functional requirement ID already exists.' });
  const newRequirement = { id: normalizedId, title: normalizedTitle, description: normalizedDescription };
  data.nonFunctionalRequirements = [...list, newRequirement];
  writeRequirement(filePath, data);
  res.status(201).json({ ok: true, item: newRequirement });
});

app.patch('/api/requirements/:id/non-functional-requirements/:nonFunctionalId', (req, res) => {
  const requirement = readRequirementById(req.params.id);
  if (!requirement) return res.status(404).json({ error: 'Requirement not found' });
  const { title, description } = req.body || {};
  if (typeof title !== 'string' || typeof description !== 'string') {
    return res.status(400).json({ error: 'Invalid payload. "title" and "description" must be strings.' });
  }
  const normalizedTitle = title.trim();
  const normalizedDescription = description.trim();
  if (!normalizedTitle || !normalizedDescription) {
    return res.status(400).json({ error: 'Title and description are required.' });
  }
  const { filePath, data } = requirement;
  const item = (data.nonFunctionalRequirements || []).find(entry => entry.id === req.params.nonFunctionalId);
  if (!item) return res.status(404).json({ error: 'Non-functional requirement not found' });
  item.title = normalizedTitle;
  item.description = normalizedDescription;
  writeRequirement(filePath, data);
  res.json({ ok: true, item });
});

app.delete('/api/requirements/:id/non-functional-requirements/:nonFunctionalId', (req, res) => {
  const requirement = readRequirementById(req.params.id);
  if (!requirement) return res.status(404).json({ error: 'Requirement not found' });
  const { filePath, data } = requirement;
  const list = Array.isArray(data.nonFunctionalRequirements) ? data.nonFunctionalRequirements : [];
  const nextList = list.filter(entry => entry.id !== req.params.nonFunctionalId);
  if (nextList.length === list.length) return res.status(404).json({ error: 'Non-functional requirement not found' });
  data.nonFunctionalRequirements = nextList;
  writeRequirement(filePath, data);
  res.json({ ok: true });
});

app.patch('/api/requirements/:id/stories/:storyId/acceptance/:index', (req, res) => {
  const requirement = readRequirementById(req.params.id);
  if (!requirement) {
    return res.status(404).json({ error: 'Requirement not found' });
  }

  const { checked } = req.body || {};
  if (typeof checked !== 'boolean') {
    return res.status(400).json({ error: 'Invalid payload. "checked" must be a boolean.' });
  }

  const criterionIndex = Number.parseInt(req.params.index, 10);
  if (!Number.isInteger(criterionIndex) || criterionIndex < 0) {
    return res.status(400).json({ error: 'Invalid acceptance criterion index' });
  }

  const { filePath, data } = requirement;
  const story = (data.userStories || []).find(item => item.id === req.params.storyId);
  if (!story) {
    return res.status(404).json({ error: 'User story not found' });
  }

  if (!Array.isArray(story.acceptanceCriteria) || !story.acceptanceCriteria[criterionIndex]) {
    return res.status(404).json({ error: 'Acceptance criterion not found' });
  }

  story.acceptanceCriteria[criterionIndex].checked = checked;
  writeRequirement(filePath, data);

  res.json({
    ok: true,
    storyId: story.id,
    criterionIndex,
    checked
  });
});

app.post('/api/requirements/:id/stories', (req, res) => {
  const requirement = readRequirementById(req.params.id);
  if (!requirement) return res.status(404).json({ error: 'Requirement not found' });
  const { storyId, title, asA, iWant, soThat, acceptanceCriteria } = req.body || {};
  if ([storyId, title, asA, iWant, soThat].some(v => typeof v !== 'string')) {
    return res.status(400).json({ error: 'Invalid payload. storyId, title, asA, iWant, soThat must be strings.' });
  }
  const normalizedId = storyId.trim();
  const normalizedTitle = title.trim();
  const normalizedAsA = asA.trim();
  const normalizedIWant = iWant.trim();
  const normalizedSoThat = soThat.trim();
  if (!normalizedId || !normalizedTitle || !normalizedAsA || !normalizedIWant || !normalizedSoThat) {
    return res.status(400).json({ error: 'All fields are required.' });
  }
  const { filePath, data } = requirement;
  const list = Array.isArray(data.userStories) ? data.userStories : [];
  if (list.some(item => item.id === normalizedId)) return res.status(409).json({ error: 'Story ID already exists.' });
  const criteriaInput = Array.isArray(acceptanceCriteria) ? acceptanceCriteria : [];
  const normalizedCriteria = criteriaInput
    .map(value => String(value || '').trim())
    .filter(Boolean)
    .map(text => ({ text, checked: false }));
  if (!normalizedCriteria.length) return res.status(400).json({ error: 'At least one acceptance criterion is required.' });
  const item = { id: normalizedId, title: normalizedTitle, asA: normalizedAsA, iWant: normalizedIWant, soThat: normalizedSoThat, acceptanceCriteria: normalizedCriteria };
  data.userStories = [...list, item];
  writeRequirement(filePath, data);
  res.status(201).json({ ok: true, item });
});

app.patch('/api/requirements/:id/stories/:storyId', (req, res) => {
  const requirement = readRequirementById(req.params.id);
  if (!requirement) return res.status(404).json({ error: 'Requirement not found' });
  const { title, asA, iWant, soThat, acceptanceCriteria } = req.body || {};
  if ([title, asA, iWant, soThat].some(v => typeof v !== 'string') || !Array.isArray(acceptanceCriteria)) {
    return res.status(400).json({ error: 'Invalid payload. title, asA, iWant, soThat must be strings and acceptanceCriteria must be array.' });
  }
  const normalizedTitle = title.trim();
  const normalizedAsA = asA.trim();
  const normalizedIWant = iWant.trim();
  const normalizedSoThat = soThat.trim();
  if (!normalizedTitle || !normalizedAsA || !normalizedIWant || !normalizedSoThat) {
    return res.status(400).json({ error: 'All fields are required.' });
  }
  const normalizedCriteriaText = acceptanceCriteria.map(value => String(value || '').trim()).filter(Boolean);
  if (!normalizedCriteriaText.length) return res.status(400).json({ error: 'At least one acceptance criterion is required.' });
  const { filePath, data } = requirement;
  const item = (data.userStories || []).find(entry => entry.id === req.params.storyId);
  if (!item) return res.status(404).json({ error: 'User story not found' });
  item.title = normalizedTitle;
  item.asA = normalizedAsA;
  item.iWant = normalizedIWant;
  item.soThat = normalizedSoThat;
  const oldCriteria = Array.isArray(item.acceptanceCriteria) ? item.acceptanceCriteria : [];
  item.acceptanceCriteria = normalizedCriteriaText.map((text, index) => {
    const old = oldCriteria[index];
    if (old && String(old.text || '').trim() === text) return { text, checked: Boolean(old.checked) };
    return { text, checked: false };
  });
  writeRequirement(filePath, data);
  res.json({ ok: true, item });
});

app.delete('/api/requirements/:id/stories/:storyId', (req, res) => {
  const requirement = readRequirementById(req.params.id);
  if (!requirement) return res.status(404).json({ error: 'Requirement not found' });
  const { filePath, data } = requirement;
  const list = Array.isArray(data.userStories) ? data.userStories : [];
  const nextList = list.filter(entry => entry.id !== req.params.storyId);
  if (nextList.length === list.length) return res.status(404).json({ error: 'User story not found' });
  data.userStories = nextList;
  writeRequirement(filePath, data);
  res.json({ ok: true });
});

app.post('/api/requirements/:id/open-questions', (req, res) => {
  const requirement = readRequirementById(req.params.id);
  if (!requirement) return res.status(404).json({ error: 'Requirement not found' });
  const { id, question, answer, status } = req.body || {};
  if (typeof id !== 'string' || typeof question !== 'string' || typeof answer !== 'string') {
    return res.status(400).json({ error: 'Invalid payload. "id", "question" and "answer" must be strings.' });
  }
  if (!validateStatus(status, OPEN_QUESTION_STATUSES)) {
    return res.status(400).json({ error: `Invalid status. Allowed: ${OPEN_QUESTION_STATUSES.join(', ')}` });
  }
  const normalizedId = id.trim();
  const normalizedQuestion = question.trim();
  const normalizedAnswer = answer.trim();
  if (!normalizedId || !normalizedQuestion) {
    return res.status(400).json({ error: '"id" and "question" are required.' });
  }
  const { filePath, data } = requirement;
  const list = Array.isArray(data.openQuestions) ? data.openQuestions : [];
  if (list.some(item => item.id === normalizedId)) {
    return res.status(409).json({ error: 'Open question ID already exists' });
  }
  const item = { id: normalizedId, question: normalizedQuestion, answer: normalizedAnswer, status };
  data.openQuestions = [...list, item];
  writeRequirement(filePath, data);
  res.status(201).json({ ok: true, item });
});

app.patch('/api/requirements/:id/open-questions/:questionId', (req, res) => {
  const requirement = readRequirementById(req.params.id);
  if (!requirement) {
    return res.status(404).json({ error: 'Requirement not found' });
  }

  const { answer, status } = req.body || {};
  if (typeof answer !== 'string') {
    return res.status(400).json({ error: 'Invalid payload. "answer" must be a string.' });
  }

  if (!validateStatus(status, OPEN_QUESTION_STATUSES)) {
    return res.status(400).json({ error: `Invalid status. Allowed: ${OPEN_QUESTION_STATUSES.join(', ')}` });
  }

  const { filePath, data } = requirement;
  const question = (data.openQuestions || []).find(item => item.id === req.params.questionId);
  if (!question) {
    return res.status(404).json({ error: 'Open question not found' });
  }

  question.answer = answer.trim();
  question.status = status;
  writeRequirement(filePath, data);

  res.json({
    ok: true,
    questionId: question.id,
    answer: question.answer,
    status: question.status
  });
});

app.delete('/api/requirements/:id/open-questions/:questionId', (req, res) => {
  const requirement = readRequirementById(req.params.id);
  if (!requirement) return res.status(404).json({ error: 'Requirement not found' });
  const { filePath, data } = requirement;
  const list = Array.isArray(data.openQuestions) ? data.openQuestions : [];
  const nextList = list.filter(item => item.id !== req.params.questionId);
  if (nextList.length === list.length) return res.status(404).json({ error: 'Open question not found' });
  data.openQuestions = nextList;
  writeRequirement(filePath, data);
  res.json({ ok: true });
});

app.patch('/api/plans/:id/notes', (req, res) => {
  const plan = readPlanById(req.params.id);
  if (!plan) {
    return res.status(404).json({ error: 'Plan not found' });
  }

  const { notes } = req.body || {};
  if (typeof notes !== 'string') {
    return res.status(400).json({ error: 'Invalid payload. "notes" must be a string.' });
  }

  const { filePath, data } = plan;
  data.notes = notes.trim();
  touchPlan(data);
  writePlan(filePath, data);

  res.json({
    ok: true,
    planId: data.id,
    notes: data.notes,
    lastUpdated: data.lastUpdated
  });
});

app.patch('/api/plans/:id/objective', (req, res) => {
  const plan = readPlanById(req.params.id);
  if (!plan) {
    return res.status(404).json({ error: 'Plan not found' });
  }

  const { objective } = req.body || {};
  if (typeof objective !== 'string') {
    return res.status(400).json({ error: 'Invalid payload. "objective" must be a string.' });
  }

  const { filePath, data } = plan;
  data.objective = objective.trim();
  touchPlan(data);
  writePlan(filePath, data);

  res.json({
    ok: true,
    planId: data.id,
    objective: data.objective,
    lastUpdated: data.lastUpdated
  });
});

app.patch('/api/plans/:id/phases', (req, res) => {
  const plan = readPlanById(req.params.id);
  if (!plan) {
    return res.status(404).json({ error: 'Plan not found' });
  }

  const { phases } = req.body || {};
  if (!Array.isArray(phases)) {
    return res.status(400).json({ error: 'Invalid payload. "phases" must be an array.' });
  }

  const normalizedPhases = [];
  const tasksById = new Map((plan.data.tasks || []).map(task => [String(task.id), task]));
  const assignedTaskIds = new Set();

  for (const phase of phases) {
    if (!phase || typeof phase !== 'object') {
      return res.status(400).json({ error: 'Invalid payload. Each phase must be an object.' });
    }

    const title = String(phase.title || '').trim();
    if (!title) {
      return res.status(400).json({ error: 'Invalid payload. Each phase must include a non-empty "title".' });
    }

    const tasks = Array.isArray(phase.tasks)
      ? phase.tasks.map(taskId => String(taskId).trim()).filter(Boolean)
      : [];

    const validTasks = [];
    for (const taskId of tasks) {
      if (!tasksById.has(taskId)) continue;
      if (assignedTaskIds.has(taskId)) continue;
      assignedTaskIds.add(taskId);
      validTasks.push(taskId);
    }

    normalizedPhases.push({ title, tasks: validTasks });
  }

  const { filePath, data } = plan;
  data.phases = normalizedPhases;

  const phaseByTaskId = new Map();
  for (const phase of normalizedPhases) {
    for (const taskId of phase.tasks) {
      phaseByTaskId.set(taskId, phase.title);
    }
  }

  for (const task of data.tasks || []) {
    const nextPhase = phaseByTaskId.get(String(task.id)) || '';
    task.phase = nextPhase;
  }

  touchPlan(data);
  writePlan(filePath, data);

  res.json({
    ok: true,
    planId: data.id,
    phases: data.phases,
    lastUpdated: data.lastUpdated
  });
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
  syncPlanStatusWithTasks(data);
  touchPlan(data);
  writePlan(filePath, data);

  res.json({
    ok: true,
    task,
    status: data.status,
    stories: data.stories || [],
    storiesChanged,
    lastUpdated: data.lastUpdated
  });
});

app.patch('/api/plans/:id/tasks/:taskId/dod/:index', (req, res) => {
  const plan = readPlanById(req.params.id);
  if (!plan) {
    return res.status(404).json({ error: 'Plan not found' });
  }

  const { completed } = req.body || {};
  if (typeof completed !== 'boolean') {
    return res.status(400).json({ error: 'Invalid payload. "completed" must be a boolean.' });
  }

  const criterionIndex = Number.parseInt(req.params.index, 10);
  if (!Number.isInteger(criterionIndex) || criterionIndex < 0) {
    return res.status(400).json({ error: 'Invalid Definition of Done index' });
  }

  const { filePath, data } = plan;
  const task = (data.tasks || []).find(t => t.id === req.params.taskId);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  if (!Array.isArray(task.definitionOfDone) || !task.definitionOfDone[criterionIndex]) {
    return res.status(404).json({ error: 'Definition of Done item not found' });
  }

  task.definitionOfDone[criterionIndex].completed = completed;
  task.status = deriveTaskStatusFromDefinitionOfDone(task.definitionOfDone);
  const storiesChanged = recomputeStoriesFromTasks(data);
  syncPlanStatusWithTasks(data);
  touchPlan(data);
  writePlan(filePath, data);

  res.json({
    ok: true,
    taskId: task.id,
    criterionIndex,
    completed,
    taskStatus: task.status,
    planStatus: data.status,
    stories: data.stories || [],
    storiesChanged,
    lastUpdated: data.lastUpdated
  });
});

app.patch('/api/plans/:id/tasks/:taskId/notes', (req, res) => {
  const plan = readPlanById(req.params.id);
  if (!plan) {
    return res.status(404).json({ error: 'Plan not found' });
  }

  const { notes } = req.body || {};
  if (typeof notes !== 'string') {
    return res.status(400).json({ error: 'Invalid payload. "notes" must be a string.' });
  }

  const { filePath, data } = plan;
  const task = (data.tasks || []).find(t => t.id === req.params.taskId);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  task.notes = notes.trim();
  touchPlan(data);
  writePlan(filePath, data);

  res.json({
    ok: true,
    planId: data.id,
    taskId: task.id,
    notes: task.notes,
    lastUpdated: data.lastUpdated
  });
});

app.patch('/api/plans/:id/tasks/:taskId/implementation-notes', (req, res) => {
  const plan = readPlanById(req.params.id);
  if (!plan) {
    return res.status(404).json({ error: 'Plan not found' });
  }

  const { implementationNotes } = req.body || {};
  if (typeof implementationNotes !== 'string') {
    return res.status(400).json({ error: 'Invalid payload. "implementationNotes" must be a string.' });
  }

  const { filePath, data } = plan;
  const task = (data.tasks || []).find(t => t.id === req.params.taskId);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  task.implementationNotes = implementationNotes.trim();
  touchPlan(data);
  writePlan(filePath, data);

  res.json({
    ok: true,
    planId: data.id,
    taskId: task.id,
    implementationNotes: task.implementationNotes,
    lastUpdated: data.lastUpdated
  });
});

app.patch('/api/plans/:id/tasks/:taskId/title', (req, res) => {
  const plan = readPlanById(req.params.id);
  if (!plan) return res.status(404).json({ error: 'Plan not found' });

  const { title } = req.body || {};
  if (typeof title !== 'string') {
    return res.status(400).json({ error: 'Invalid payload. "title" must be a string.' });
  }

  const { filePath, data } = plan;
  const task = (data.tasks || []).find(t => t.id === req.params.taskId);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  task.title = title.trim();
  touchPlan(data);
  writePlan(filePath, data);

  res.json({ ok: true, planId: data.id, taskId: task.id, title: task.title, lastUpdated: data.lastUpdated });
});

app.patch('/api/plans/:id/tasks/:taskId/phase', (req, res) => {
  const plan = readPlanById(req.params.id);
  if (!plan) return res.status(404).json({ error: 'Plan not found' });

  const { phase } = req.body || {};
  if (typeof phase !== 'string') {
    return res.status(400).json({ error: 'Invalid payload. "phase" must be a string.' });
  }

  const { filePath, data } = plan;
  const task = (data.tasks || []).find(t => t.id === req.params.taskId);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  const phaseTitle = phase.trim();
  const phases = Array.isArray(data.phases) ? data.phases : [];
  const targetPhase = phases.find(item => String(item?.title || '').trim() === phaseTitle);
  if (!targetPhase) {
    return res.status(400).json({ error: 'Invalid phase. Select an existing plan phase.' });
  }

  for (const currentPhase of phases) {
    if (!Array.isArray(currentPhase.tasks)) currentPhase.tasks = [];
    currentPhase.tasks = currentPhase.tasks.map(taskId => String(taskId).trim()).filter(Boolean).filter(taskId => taskId !== task.id);
  }

  targetPhase.tasks.push(task.id);

  task.phase = phaseTitle;
  touchPlan(data);
  writePlan(filePath, data);

  res.json({ ok: true, planId: data.id, taskId: task.id, phase: task.phase, lastUpdated: data.lastUpdated });
});

app.patch('/api/plans/:id/tasks/:taskId/what-to-do', (req, res) => {
  const plan = readPlanById(req.params.id);
  if (!plan) return res.status(404).json({ error: 'Plan not found' });

  const { whatToDo } = req.body || {};
  if (typeof whatToDo !== 'string') {
    return res.status(400).json({ error: 'Invalid payload. "whatToDo" must be a string.' });
  }

  const { filePath, data } = plan;
  const task = (data.tasks || []).find(t => t.id === req.params.taskId);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  task.whatToDo = whatToDo.trim();
  touchPlan(data);
  writePlan(filePath, data);

  res.json({ ok: true, planId: data.id, taskId: task.id, whatToDo: task.whatToDo, lastUpdated: data.lastUpdated });
});

app.patch('/api/plans/:id/tasks/:taskId/files', (req, res) => {
  const plan = readPlanById(req.params.id);
  if (!plan) return res.status(404).json({ error: 'Plan not found' });

  const files = normalizeUniqueStringArray(req.body?.files);
  if (!files) {
    return res.status(400).json({ error: 'Invalid payload. "files" must be an array of strings.' });
  }

  const { filePath, data } = plan;
  const task = (data.tasks || []).find(t => t.id === req.params.taskId);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  task.files = files;
  touchPlan(data);
  writePlan(filePath, data);

  res.json({ ok: true, planId: data.id, taskId: task.id, files: task.files, lastUpdated: data.lastUpdated });
});

app.patch('/api/plans/:id/tasks/:taskId/endpoints', (req, res) => {
  const plan = readPlanById(req.params.id);
  if (!plan) return res.status(404).json({ error: 'Plan not found' });

  const endpoints = normalizeUniqueStringArray(req.body?.endpoints);
  if (!endpoints) {
    return res.status(400).json({ error: 'Invalid payload. "endpoints" must be an array of strings.' });
  }

  const { filePath, data } = plan;
  const task = (data.tasks || []).find(t => t.id === req.params.taskId);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  task.endpoints = endpoints;
  touchPlan(data);
  writePlan(filePath, data);

  res.json({ ok: true, planId: data.id, taskId: task.id, endpoints: task.endpoints, lastUpdated: data.lastUpdated });
});

app.patch('/api/plans/:id/tasks/:taskId/depends-on', (req, res) => {
  const plan = readPlanById(req.params.id);
  if (!plan) return res.status(404).json({ error: 'Plan not found' });

  const dependsOn = normalizeUniqueStringArray(req.body?.dependsOn);
  if (!dependsOn) {
    return res.status(400).json({ error: 'Invalid payload. "dependsOn" must be an array of strings.' });
  }

  const { filePath, data } = plan;
  const task = (data.tasks || []).find(t => t.id === req.params.taskId);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  if (dependsOn.includes(task.id)) {
    return res.status(400).json({ error: 'A task cannot depend on itself.' });
  }

  const existingTaskIds = new Set((data.tasks || []).map(t => t.id));
  const invalidTaskIds = dependsOn.filter(taskId => !existingTaskIds.has(taskId));
  if (invalidTaskIds.length) {
    return res.status(400).json({ error: `Invalid task IDs in dependsOn: ${invalidTaskIds.join(', ')}` });
  }

  task.dependsOn = dependsOn;
  touchPlan(data);
  writePlan(filePath, data);

  res.json({ ok: true, planId: data.id, taskId: task.id, dependsOn: task.dependsOn, lastUpdated: data.lastUpdated });
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
  const activeWorkspace = getCurrentWorkspace();
  if (!activeWorkspace) return res.json([]);
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
    
    if (matches.length > 0) {
      results.push({ plan: data.id, matches });
    }
  }

  const requirementFiles = getRequirementsFiles();

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

    if (matches.length > 0) {
      results.push({ plan: requirementId, domain: 'requirement', matches });
    }
  }
  
  res.json(results);
});

app.listen(PORT, () => {
  console.log(`Plans viewer: http://localhost:${PORT}`);
});
