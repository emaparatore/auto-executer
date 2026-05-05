function createPlansHandlers(deps) {
  const {
    listPlans,
    getPlanById,
    readState,
    writeState,
    syncCoreState,
    renderPlansList,
    renderPlanDetail,
    scrollWorkspaceToTop,
    resetPlanUiEditingState,
    activatePlanListItem
  } = deps;

  async function loadPlans() {
    const plans = await listPlans();
    writeState({ plans });
    syncCoreState({ plans }, 'plans.handlers:loadPlans');

    const state = readState();
    if (state.currentSection === 'plans') {
      renderPlansList();
    }
  }

  async function selectPlan(id) {
    const state = readState();
    if (state.currentSection !== 'plans') return;

    activatePlanListItem(id);
    const currentPlan = await getPlanById(id);
    writeState({ currentPlan });
    syncCoreState({ currentPlan }, 'plans.handlers:selectPlan');
    resetPlanUiEditingState();
    renderPlanDetail();
    scrollWorkspaceToTop();
  }

  return {
    loadPlans,
    selectPlan
  };
}

export { createPlansHandlers };
