import express from 'express';

export function createPlansRouter(plansService) {
  const router = express.Router();

  router.get('/plans', (req, res) => {
    res.json(plansService.listPlans());
  });

  router.get('/plans/:id', (req, res) => {
    const plan = plansService.getPlanById(req.params.id);
    if (!plan) return res.status(404).json({ error: 'Plan not found' });
    return res.json(plan);
  });

  router.post('/plans/:id/decisions', (req, res) => {
    const result = plansService.createDecision(req.params.id, req.body);
    if (result.error) return res.status(result.status).json({ error: result.error });
    return res.status(result.status).json({ ok: true, item: result.item });
  });

  router.patch('/plans/:id/decisions/:decisionId', (req, res) => {
    const result = plansService.updateDecision(req.params.id, req.params.decisionId, req.body);
    if (result.error) return res.status(result.status).json({ error: result.error });
    return res.json({ ok: true, item: result.item });
  });

  router.delete('/plans/:id/decisions/:decisionId', (req, res) => {
    const result = plansService.deleteDecision(req.params.id, req.params.decisionId);
    if (result.error) return res.status(result.status).json({ error: result.error });
    return res.json({ ok: true });
  });

  router.patch('/plans/:id/notes', (req, res) => {
    const result = plansService.updateNotes(req.params.id, req.body);
    if (result.error) return res.status(result.status).json({ error: result.error });
    return res.json({ ok: true, planId: result.planId, notes: result.notes, lastUpdated: result.lastUpdated });
  });

  router.patch('/plans/:id/objective', (req, res) => {
    const result = plansService.updateObjective(req.params.id, req.body);
    if (result.error) return res.status(result.status).json({ error: result.error });
    return res.json({ ok: true, planId: result.planId, objective: result.objective, lastUpdated: result.lastUpdated });
  });

  router.patch('/plans/:id/phases', (req, res) => {
    const result = plansService.updatePhases(req.params.id, req.body);
    if (result.error) return res.status(result.status).json({ error: result.error });
    return res.json({ ok: true, planId: result.planId, phases: result.phases, lastUpdated: result.lastUpdated });
  });

  router.patch('/plans/:id/tasks/:taskId/status', (req, res) => {
    const result = plansService.updateTaskStatus(req.params.id, req.params.taskId, req.body);
    if (result.error) return res.status(result.status).json({ error: result.error });
    return res.json({ ok: true, task: result.task, status: result.planStatus, stories: result.stories, storiesChanged: result.storiesChanged, lastUpdated: result.lastUpdated });
  });

  router.patch('/plans/:id/tasks/:taskId/dod/:index', (req, res) => {
    const result = plansService.updateTaskDod(req.params.id, req.params.taskId, req.params.index, req.body);
    if (result.error) return res.status(result.status).json({ error: result.error });
    return res.json({ ok: true, taskId: result.taskId, criterionIndex: result.criterionIndex, completed: result.completed, taskStatus: result.taskStatus, planStatus: result.planStatus, stories: result.stories, storiesChanged: result.storiesChanged, lastUpdated: result.lastUpdated });
  });

  router.patch('/plans/:id/stories/:storyId/status', (req, res) => {
    const result = plansService.updateStoryStatus(req.params.id, req.params.storyId, req.body);
    if (result.error) return res.status(result.status).json({ error: result.error });
    return res.json({ ok: true, story: result.story, lastUpdated: result.lastUpdated });
  });

  router.patch('/plans/:id/tasks/:taskId/notes', (req, res) => {
    const result = plansService.updateTaskNotes(req.params.id, req.params.taskId, req.body);
    if (result.error) return res.status(result.status).json({ error: result.error });
    return res.json({ ok: true, planId: result.planId, taskId: result.taskId, notes: result.value, lastUpdated: result.lastUpdated });
  });

  router.patch('/plans/:id/tasks/:taskId/implementation-notes', (req, res) => {
    const result = plansService.updateTaskImplementationNotes(req.params.id, req.params.taskId, req.body);
    if (result.error) return res.status(result.status).json({ error: result.error });
    return res.json({ ok: true, planId: result.planId, taskId: result.taskId, implementationNotes: result.value, lastUpdated: result.lastUpdated });
  });

  router.patch('/plans/:id/tasks/:taskId/title', (req, res) => {
    const result = plansService.updateTaskTitle(req.params.id, req.params.taskId, req.body);
    if (result.error) return res.status(result.status).json({ error: result.error });
    return res.json({ ok: true, planId: result.planId, taskId: result.taskId, title: result.value, lastUpdated: result.lastUpdated });
  });

  router.patch('/plans/:id/tasks/:taskId/phase', (req, res) => {
    const result = plansService.updateTaskPhase(req.params.id, req.params.taskId, req.body);
    if (result.error) return res.status(result.status).json({ error: result.error });
    return res.json({ ok: true, planId: result.planId, taskId: result.taskId, phase: result.phase, lastUpdated: result.lastUpdated });
  });

  router.patch('/plans/:id/tasks/:taskId/what-to-do', (req, res) => {
    const result = plansService.updateTaskWhatToDo(req.params.id, req.params.taskId, req.body);
    if (result.error) return res.status(result.status).json({ error: result.error });
    return res.json({ ok: true, planId: result.planId, taskId: result.taskId, whatToDo: result.value, lastUpdated: result.lastUpdated });
  });

  router.patch('/plans/:id/tasks/:taskId/files', (req, res) => {
    const result = plansService.updateTaskFiles(req.params.id, req.params.taskId, req.body);
    if (result.error) return res.status(result.status).json({ error: result.error });
    return res.json({ ok: true, planId: result.planId, taskId: result.taskId, files: result.value, lastUpdated: result.lastUpdated });
  });

  router.patch('/plans/:id/tasks/:taskId/endpoints', (req, res) => {
    const result = plansService.updateTaskEndpoints(req.params.id, req.params.taskId, req.body);
    if (result.error) return res.status(result.status).json({ error: result.error });
    return res.json({ ok: true, planId: result.planId, taskId: result.taskId, endpoints: result.value, lastUpdated: result.lastUpdated });
  });

  router.patch('/plans/:id/tasks/:taskId/depends-on', (req, res) => {
    const result = plansService.updateTaskDependsOn(req.params.id, req.params.taskId, req.body);
    if (result.error) return res.status(result.status).json({ error: result.error });
    return res.json({ ok: true, planId: result.planId, taskId: result.taskId, dependsOn: result.dependsOn, lastUpdated: result.lastUpdated });
  });

  return router;
}
