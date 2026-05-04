import express from 'express';

export function createSearchRouter(searchService) {
  const router = express.Router();

  router.get('/search', (req, res) => {
    res.json(searchService.search(req.query.q));
  });

  return router;
}
