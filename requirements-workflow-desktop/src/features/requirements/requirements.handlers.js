function createRequirementsHandlers(deps) {
  const {
    listRequirements,
    getRequirementById,
    readState,
    writeState,
    syncCoreState,
    renderRequirementsList,
    renderRequirementDetail,
    scrollWorkspaceToTop,
    resetRequirementUiEditingState,
    activateRequirementListItem
  } = deps;

  async function loadRequirements() {
    const requirements = await listRequirements();
    writeState({ requirements });
    syncCoreState({ requirements }, 'requirements.handlers:loadRequirements');

    const state = readState();
    if (state.currentSection === 'requirements') {
      renderRequirementsList();
    }
  }

  async function selectRequirement(id) {
    const state = readState();
    if (state.currentSection !== 'requirements') return;

    activateRequirementListItem(id);
    const currentRequirement = await getRequirementById(id);
    writeState({ currentRequirement });
    syncCoreState({ currentRequirement }, 'requirements.handlers:selectRequirement');
    resetRequirementUiEditingState();
    renderRequirementDetail();
    scrollWorkspaceToTop();
  }

  return {
    loadRequirements,
    selectRequirement
  };
}

export { createRequirementsHandlers };
