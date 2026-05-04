import fs from 'fs';
import path from 'path';

export function createPlansRepository(getCurrentWorkspace) {
  function getPlansDir() {
    const workspace = getCurrentWorkspace();
    if (!workspace) return null;
    return workspace.plansDir;
  }

  function listPlanFiles() {
    const plansDir = getPlansDir();
    if (!plansDir || !fs.existsSync(plansDir)) return [];
    return fs.readdirSync(plansDir).filter(file => file.endsWith('.json'));
  }

  function readPlanById(planId) {
    const plansDir = getPlansDir();
    if (!plansDir) return null;
    const filePath = path.join(plansDir, `${planId}.json`);
    if (!fs.existsSync(filePath)) return null;
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    return { filePath, data };
  }

  function readPlanFile(fileName) {
    const plansDir = getPlansDir();
    if (!plansDir) return null;
    const filePath = path.join(plansDir, fileName);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    return { filePath, data };
  }

  function writePlan(filePath, data) {
    fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf-8');
  }

  return { listPlanFiles, readPlanById, readPlanFile, writePlan };
}
