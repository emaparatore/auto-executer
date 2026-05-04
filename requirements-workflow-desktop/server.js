import express from 'express';
import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { createWorkspaceRepository } from './src/server/repositories/workspace.repository.js';
import { createWorkspaceService } from './src/server/services/workspace.service.js';
import { createWorkspacesRouter } from './src/server/routes/workspaces.routes.js';
import { createPlansRepository } from './src/server/repositories/plans.repository.js';
import { createPlansService } from './src/server/services/plans.service.js';
import { createPlansRouter } from './src/server/routes/plans.routes.js';
import { createRequirementsRepository } from './src/server/repositories/requirements.repository.js';
import { createRequirementsService } from './src/server/services/requirements.service.js';
import { createRequirementsRouter } from './src/server/routes/requirements.routes.js';
import { createSearchService } from './src/server/services/search.service.js';
import { createSearchRouter } from './src/server/routes/search.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT || 3500);
const HOST = String(process.env.HOST || '127.0.0.1');

const WORKSPACES_DB_FILE = process.env.WORKSPACES_DB_FILE
  ? path.resolve(process.env.WORKSPACES_DB_FILE)
  : path.join(__dirname, 'workspaces.db');

app.use(express.json());
app.use(express.static(__dirname));

const db = new Database(WORKSPACES_DB_FILE);
db.exec('CREATE TABLE IF NOT EXISTS workspaces (key TEXT PRIMARY KEY, label TEXT NOT NULL, root_dir TEXT NOT NULL, is_current INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)');
const workspaceRepository = createWorkspaceRepository(db);
const workspaceService = createWorkspaceService(workspaceRepository);
const plansRepository = createPlansRepository(() => workspaceService.getCurrentWorkspace());
const plansService = createPlansService(plansRepository);
const requirementsRepository = createRequirementsRepository(() => workspaceService.getCurrentWorkspace());
const requirementsService = createRequirementsService(requirementsRepository);
const searchService = createSearchService(() => workspaceService.getCurrentWorkspace(), getRequirementsFiles);

function getRequirementsFiles() {
  const workspace = workspaceService.getCurrentWorkspace();
  if (!workspace) return [];
  const requirementsDir = workspace.requirementsDir;
  if (!requirementsDir) return [];
  if (!fs.existsSync(requirementsDir)) return [];
  return fs
    .readdirSync(requirementsDir)
    .filter(file => file.endsWith('.json') && file !== 'requirements.schema.json');
}

app.use('/api', createWorkspacesRouter(workspaceService));
app.use('/api', createPlansRouter(plansService));
app.use('/api', createRequirementsRouter(requirementsService));
app.use('/api', createSearchRouter(searchService));



















app.listen(PORT, HOST, () => {
  console.log(`Plans viewer: http://${HOST}:${PORT}`);
  console.log(`Workspace DB: ${WORKSPACES_DB_FILE}`);
});
