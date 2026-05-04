import express from 'express';

export function createRequirementsRouter(requirementsService) {
  const router = express.Router();

  router.get('/requirements', (req, res) => {
    res.json(requirementsService.listRequirements());
  });

  router.get('/requirements/:id', (req, res) => {
    const data = requirementsService.getRequirementById(req.params.id);
    if (!data) return res.status(404).json({ error: 'Requirement not found' });
    return res.json(data);
  });

  router.patch('/requirements/:id/overview', (req, res) => {
    const result = requirementsService.updateOverview(req.params.id, req.body);
    if (result.error) return res.status(result.status).json({ error: result.error });
    return res.json({ ok: true, requirementId: result.requirementId, overview: result.overview });
  });

  router.patch('/requirements/:id/current-state', (req, res) => {
    const result = requirementsService.updateCurrentState(req.params.id, req.body);
    if (result.error) return res.status(result.status).json({ error: result.error });
    return res.json({ ok: true, requirementId: result.requirementId, currentState: result.currentState });
  });

  router.patch('/requirements/:id/notes', (req, res) => {
    const result = requirementsService.updateNotes(req.params.id, req.body);
    if (result.error) return res.status(result.status).json({ error: result.error });
    return res.json({ ok: true, requirementId: result.requirementId, notes: result.notes });
  });

  router.post('/requirements/:id/functional-requirements', (req, res) => {
    const result = requirementsService.createFunctionalRequirement(req.params.id, req.body);
    if (result.error) return res.status(result.status).json({ error: result.error });
    return res.status(result.status).json({ ok: true, item: result.item });
  });

  router.patch('/requirements/:id/functional-requirements/:functionalId', (req, res) => {
    const result = requirementsService.updateFunctionalRequirement(req.params.id, req.params.functionalId, req.body);
    if (result.error) return res.status(result.status).json({ error: result.error });
    return res.json({ ok: true, item: result.item });
  });

  router.delete('/requirements/:id/functional-requirements/:functionalId', (req, res) => {
    const result = requirementsService.deleteFunctionalRequirement(req.params.id, req.params.functionalId);
    if (result.error) return res.status(result.status).json({ error: result.error });
    return res.json({ ok: true });
  });

  router.post('/requirements/:id/non-functional-requirements', (req, res) => {
    const result = requirementsService.createNonFunctionalRequirement(req.params.id, req.body);
    if (result.error) return res.status(result.status).json({ error: result.error });
    return res.status(result.status).json({ ok: true, item: result.item });
  });

  router.patch('/requirements/:id/non-functional-requirements/:nonFunctionalId', (req, res) => {
    const result = requirementsService.updateNonFunctionalRequirement(req.params.id, req.params.nonFunctionalId, req.body);
    if (result.error) return res.status(result.status).json({ error: result.error });
    return res.json({ ok: true, item: result.item });
  });

  router.delete('/requirements/:id/non-functional-requirements/:nonFunctionalId', (req, res) => {
    const result = requirementsService.deleteNonFunctionalRequirement(req.params.id, req.params.nonFunctionalId);
    if (result.error) return res.status(result.status).json({ error: result.error });
    return res.json({ ok: true });
  });

  router.patch('/requirements/:id/stories/:storyId/acceptance/:index', (req, res) => {
    const result = requirementsService.toggleStoryAcceptance(req.params.id, req.params.storyId, req.params.index, req.body);
    if (result.error) return res.status(result.status).json({ error: result.error });
    return res.json({ ok: true, storyId: result.storyId, criterionIndex: result.criterionIndex, checked: result.checked });
  });

  router.post('/requirements/:id/stories', (req, res) => {
    const result = requirementsService.createStory(req.params.id, req.body);
    if (result.error) return res.status(result.status).json({ error: result.error });
    return res.status(result.status).json({ ok: true, item: result.item });
  });

  router.patch('/requirements/:id/stories/:storyId', (req, res) => {
    const result = requirementsService.updateStory(req.params.id, req.params.storyId, req.body);
    if (result.error) return res.status(result.status).json({ error: result.error });
    return res.json({ ok: true, item: result.item });
  });

  router.delete('/requirements/:id/stories/:storyId', (req, res) => {
    const result = requirementsService.deleteStory(req.params.id, req.params.storyId);
    if (result.error) return res.status(result.status).json({ error: result.error });
    return res.json({ ok: true });
  });

  router.post('/requirements/:id/open-questions', (req, res) => {
    const result = requirementsService.createOpenQuestion(req.params.id, req.body);
    if (result.error) return res.status(result.status).json({ error: result.error });
    return res.status(result.status).json({ ok: true, item: result.item });
  });

  router.patch('/requirements/:id/open-questions/:questionId', (req, res) => {
    const result = requirementsService.updateOpenQuestion(req.params.id, req.params.questionId, req.body);
    if (result.error) return res.status(result.status).json({ error: result.error });
    return res.json({ ok: true, questionId: result.questionId, answer: result.answer, status: result.statusValue });
  });

  router.delete('/requirements/:id/open-questions/:questionId', (req, res) => {
    const result = requirementsService.deleteOpenQuestion(req.params.id, req.params.questionId);
    if (result.error) return res.status(result.status).json({ error: result.error });
    return res.json({ ok: true });
  });

  return router;
}
