import express from 'express';
import path from 'path';
import { execFileSync } from 'child_process';

export function createWorkspacesRouter(workspaceService) {
  const router = express.Router();

  router.get('/workspaces', (req, res) => {
    const workspaces = workspaceService.getWorkspaceCatalog().map(item => ({ key: item.key, label: item.label, rootDir: item.rootDir }));
    const current = workspaceService.getCurrentWorkspace();
    res.json({ workspaces, currentWorkspaceKey: current?.key || null });
  });

  router.get('/workspace/current', (req, res) => {
    const active = workspaceService.getCurrentWorkspace();
    res.json({ workspace: active ? { key: active.key, label: active.label } : null });
  });

  router.post('/workspace/select', (req, res) => {
    const key = String(req.body?.key || '').trim();
    const selected = workspaceService.selectWorkspace(key);
    if (!selected) return res.status(404).json({ error: 'Workspace not found' });
    return res.json({ ok: true, workspace: selected });
  });

  router.post('/workspaces', (req, res) => {
    const label = String(req.body?.label || '').trim();
    const projectRootDir = path.resolve(String(req.body?.rootDir || '').trim());
    if (!label || !projectRootDir) return res.status(400).json({ error: 'label e rootDir sono obbligatori.' });
    try {
      const workspace = workspaceService.createWorkspace(label, projectRootDir);
      return res.status(201).json({ ok: true, workspace });
    } catch (error) {
      if (error?.code === 'conflict') return res.status(409).json({ error: error.message });
      return res.status(400).json({ error: error?.message || 'Errore creazione workspace.' });
    }
  });

  router.post('/workspaces/pick-folder', (req, res) => {
    if (process.platform !== 'win32') {
      return res.status(400).json({ error: 'Selezione grafica cartella disponibile solo su Windows.' });
    }
    try {
      const script = "Add-Type -AssemblyName System.Windows.Forms; $dialog = New-Object System.Windows.Forms.FolderBrowserDialog; $dialog.Description = 'Seleziona la cartella progetto'; $dialog.ShowNewFolderButton = $false; $result = $dialog.ShowDialog(); if ($result -eq [System.Windows.Forms.DialogResult]::OK) { Write-Output $dialog.SelectedPath }";
      const selectedPath = String(execFileSync('powershell', ['-NoProfile', '-STA', '-Command', script], { encoding: 'utf-8' }) || '').trim();
      if (!selectedPath) return res.status(400).json({ error: 'Nessuna cartella selezionata.' });
      return res.json({ ok: true, path: selectedPath });
    } catch {
      return res.status(500).json({ error: 'Impossibile aprire il selettore cartella.' });
    }
  });

  router.patch('/workspaces/:key', (req, res) => {
    const key = String(req.params.key || '').trim();
    const label = String(req.body?.label || '').trim();
    if (!key || !label) return res.status(400).json({ error: 'key e label sono obbligatori.' });
    const workspace = workspaceService.renameWorkspace(key, label);
    if (!workspace) return res.status(404).json({ error: 'Workspace non trovato.' });
    return res.json({ ok: true, workspace });
  });

  router.delete('/workspaces/:key', (req, res) => {
    const key = String(req.params.key || '').trim();
    const result = workspaceService.removeWorkspace(key);
    if (!result) return res.status(404).json({ error: 'Workspace non trovato.' });
    return res.json({ ok: true, currentWorkspaceKey: result.currentWorkspaceKey || null });
  });

  return router;
}
