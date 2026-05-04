import fs from 'fs';
import path from 'path';

function buildWorkspaceKey(label) {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `ws-${Date.now()}`;
}

export function createWorkspaceService(repository) {
  function getWorkspaceCatalog() {
    return repository.getWorkspaceCatalog();
  }

  function getCurrentWorkspace() {
    const active = repository.getCurrentWorkspaceRow();
    if (!active) return null;
    return {
      ...active,
      plansDir: path.join(active.rootDir, 'plans'),
      requirementsDir: path.join(active.rootDir, 'requirements')
    };
  }

  function createWorkspace(label, projectRootDir) {
    const docsDir = path.join(projectRootDir, 'docs');
    const plansDir = path.join(docsDir, 'plans');
    const requirementsDir = path.join(docsDir, 'requirements');

    if (!fs.existsSync(docsDir) || !fs.statSync(docsDir).isDirectory()) {
      throw new Error('Cartella docs non trovata. Crea docs/plans e docs/requirements e riprova.');
    }
    if (!fs.existsSync(plansDir) || !fs.statSync(plansDir).isDirectory()) {
      throw new Error('Cartella docs/plans non trovata. Creala e riprova ad aggiungere il workspace.');
    }
    if (!fs.existsSync(requirementsDir) || !fs.statSync(requirementsDir).isDirectory()) {
      throw new Error('Cartella docs/requirements non trovata. Creala e riprova ad aggiungere il workspace.');
    }

    const key = buildWorkspaceKey(label);
    const list = repository.getWorkspaceCatalog();
    if (list.some(item => item.key === key || path.resolve(item.rootDir) === docsDir)) {
      const conflict = new Error('Workspace gia presente.');
      conflict.code = 'conflict';
      throw conflict;
    }

    repository.insertWorkspace({ key, label, rootDir: docsDir });
    return { key, label };
  }

  function selectWorkspace(key) {
    const selected = repository.findWorkspaceByKey(key);
    if (!selected) return null;
    repository.setCurrentWorkspace(selected.key);
    return { key: selected.key, label: selected.label };
  }

  function renameWorkspace(key, label) {
    const item = repository.findWorkspaceByKey(key);
    if (!item) return null;
    repository.updateWorkspaceLabel(key, label);
    return { key, label };
  }

  function removeWorkspace(key) {
    const item = repository.findWorkspaceByKey(key);
    if (!item) return null;
    repository.deleteWorkspace(key);
    if (item.isCurrent) {
      const next = repository.findFirstWorkspaceKey();
      if (next) repository.setCurrentWorkspace(next);
    }
    return { currentWorkspaceKey: repository.findCurrentWorkspaceKey() };
  }

  return {
    getWorkspaceCatalog,
    getCurrentWorkspace,
    createWorkspace,
    selectWorkspace,
    renameWorkspace,
    removeWorkspace
  };
}
