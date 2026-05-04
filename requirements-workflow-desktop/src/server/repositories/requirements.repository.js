import fs from 'fs';
import path from 'path';

export function createRequirementsRepository(getCurrentWorkspace) {
  function getRequirementsDir() {
    const workspace = getCurrentWorkspace();
    if (!workspace) return null;
    return workspace.requirementsDir;
  }

  function listRequirementFiles() {
    const requirementsDir = getRequirementsDir();
    if (!requirementsDir || !fs.existsSync(requirementsDir)) return [];
    return fs
      .readdirSync(requirementsDir)
      .filter(file => file.endsWith('.json') && file !== 'requirements.schema.json');
  }

  function readRequirementById(requirementId) {
    const requirementsDir = getRequirementsDir();
    if (!requirementsDir) return null;
    const filePath = path.join(requirementsDir, `${requirementId}.json`);
    if (!fs.existsSync(filePath)) return null;
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    return { filePath, data };
  }

  function readRequirementFile(fileName) {
    const requirementsDir = getRequirementsDir();
    if (!requirementsDir) return null;
    const filePath = path.join(requirementsDir, fileName);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    return { filePath, data };
  }

  function writeRequirement(filePath, data) {
    fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf-8');
  }

  return { listRequirementFiles, readRequirementById, readRequirementFile, writeRequirement };
}
