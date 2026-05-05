import { createWorkspacesHandlers } from '/src/features/workspaces/workspaces.handlers.js';

function createWorkspacesController(deps) {
  return createWorkspacesHandlers(deps);
}

export { createWorkspacesController };
