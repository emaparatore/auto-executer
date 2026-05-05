const DEFAULT_STATE = {
  planEditing: {
    isPlanNotesEditing: false,
    isPlanNotesUpdating: false,
    isPlanObjectiveEditing: false,
    isPlanObjectiveUpdating: false,
    isPlanPhasesEditing: false,
    isPlanPhasesUpdating: false,
    editingPlanPhases: [],
    editingPlanDecisionId: null,
    isPlanDecisionUpdating: false,
    creatingPlanDecision: false,
    creatingPlanDecisionStep: 'id',
    newPlanDecisionId: '',
    newPlanDecisionDescription: '',
    newPlanDecisionRationale: '',
    deletingPlanDecisionId: null,
    deletePlanDecisionModalReturnFocusEl: null
  },
  requirementEditing: {
    isRequirementOverviewEditing: false,
    isRequirementOverviewUpdating: false,
    isRequirementCurrentStateEditing: false,
    isRequirementCurrentStateUpdating: false,
    isRequirementNotesEditing: false,
    isRequirementNotesUpdating: false,
    editingFunctionalRequirementId: null,
    isFunctionalRequirementUpdating: false,
    creatingFunctionalRequirement: false,
    creatingFunctionalRequirementStep: 'id',
    newFunctionalRequirementId: '',
    newFunctionalRequirementTitle: '',
    newFunctionalRequirementDescription: '',
    deletingFunctionalRequirementId: null,
    deleteModalReturnFocusEl: null,
    editingNonFunctionalRequirementId: null,
    isNonFunctionalRequirementUpdating: false,
    creatingNonFunctionalRequirement: false,
    creatingNonFunctionalRequirementStep: 'id',
    newNonFunctionalRequirementId: '',
    newNonFunctionalRequirementTitle: '',
    newNonFunctionalRequirementDescription: '',
    deletingNonFunctionalRequirementId: null,
    deleteNonFunctionalModalReturnFocusEl: null
  },
  storyEditing: {
    editingStoryId: null,
    isStoryUpdating: false,
    creatingStory: false,
    creatingStoryStep: 'id',
    newStoryId: '',
    deletingStoryId: null,
    editingAcceptanceStoryId: null,
    isAcceptanceUpdating: false,
    acceptanceFocusTarget: null
  },
  taskEditing: {
    editingTaskDodId: null,
    isTaskDodUpdating: false,
    taskDodFocusTarget: null,
    editingTaskNotesId: null,
    isTaskNotesUpdating: false,
    editingTaskImplementationNotesId: null,
    isTaskImplementationNotesUpdating: false,
    editingTaskField: null,
    isTaskFieldUpdating: false,
    openTaskNotesIds: new Set(),
    taskFocusTarget: null
  },
  openQuestionEditing: {
    editingOpenQuestionId: null,
    isOpenQuestionUpdating: false,
    creatingOpenQuestion: false,
    creatingOpenQuestionStep: 'id',
    newOpenQuestionId: '',
    newOpenQuestionQuestion: '',
    newOpenQuestionAnswer: 'Non definito nel documento; richiesta conferma.',
    newOpenQuestionStatus: 'open',
    deletingOpenQuestionId: null
  },
  filterState: {
    sectionStatusFilters: {
      plans: new Set(),
      requirements: new Set()
    },
    sectionStatusCatalog: {
      plans: new Set(),
      requirements: new Set()
    }
  }
};

const state = {
  planEditing: { ...DEFAULT_STATE.planEditing },
  requirementEditing: { ...DEFAULT_STATE.requirementEditing },
  storyEditing: { ...DEFAULT_STATE.storyEditing },
  taskEditing: {
    ...DEFAULT_STATE.taskEditing,
    openTaskNotesIds: new Set(DEFAULT_STATE.taskEditing.openTaskNotesIds)
  },
  openQuestionEditing: { ...DEFAULT_STATE.openQuestionEditing },
  filterState: {
    sectionStatusFilters: {
      plans: new Set(DEFAULT_STATE.filterState.sectionStatusFilters.plans),
      requirements: new Set(DEFAULT_STATE.filterState.sectionStatusFilters.requirements)
    },
    sectionStatusCatalog: {
      plans: new Set(DEFAULT_STATE.filterState.sectionStatusCatalog.plans),
      requirements: new Set(DEFAULT_STATE.filterState.sectionStatusCatalog.requirements)
    }
  }
};

function getState() {
  return state;
}

function get(feature, key) {
  if (key !== undefined) {
    return state[feature]?.[key];
  }
  return state[feature];
}

function set(feature, keyOrPatch, value) {
  if (!state[feature]) return;

  if (typeof keyOrPatch === 'object' && keyOrPatch !== null) {
    Object.assign(state[feature], keyOrPatch);
    return;
  }

  if (value !== undefined) {
    state[feature][keyOrPatch] = value;
  }
}

function resetFeature(featureName) {
  if (!DEFAULT_STATE[featureName]) return;
  const defaults = DEFAULT_STATE[featureName];

  for (const key of Object.keys(defaults)) {
    if (defaults[key] instanceof Set) {
      state[featureName][key] = new Set(defaults[key]);
    } else if (Array.isArray(defaults[key])) {
      state[featureName][key] = [];
    } else if (typeof defaults[key] === 'object' && defaults[key] !== null) {
      state[featureName][key] = JSON.parse(JSON.stringify(defaults[key]));
    } else {
      state[featureName][key] = defaults[key];
    }
  }
}

function resetAll() {
  for (const feature of Object.keys(DEFAULT_STATE)) {
    resetFeature(feature);
  }
}

function isTaskFieldEditing(taskId, field) {
  const editing = state.taskEditing.editingTaskField;
  return editing?.taskId === taskId && editing?.field === field;
}

const uiState = {
  getState,
  get,
  set,
  resetFeature,
  resetAll,
  isTaskFieldEditing,

  planNotes: {
    get isEditing() { return state.planEditing.isPlanNotesEditing; },
    set isEditing(v) { state.planEditing.isPlanNotesEditing = v; },
    get isUpdating() { return state.planEditing.isPlanNotesUpdating; },
    set isUpdating(v) { state.planEditing.isPlanNotesUpdating = v; }
  },
  planObjective: {
    get isEditing() { return state.planEditing.isPlanObjectiveEditing; },
    set isEditing(v) { state.planEditing.isPlanObjectiveEditing = v; },
    get isUpdating() { return state.planEditing.isPlanObjectiveUpdating; },
    set isUpdating(v) { state.planEditing.isPlanObjectiveUpdating = v; }
  },
  planPhases: {
    get isEditing() { return state.planEditing.isPlanPhasesEditing; },
    set isEditing(v) { state.planEditing.isPlanPhasesEditing = v; },
    get isUpdating() { return state.planEditing.isPlanPhasesUpdating; },
    set isUpdating(v) { state.planEditing.isPlanPhasesUpdating = v; },
    get items() { return state.planEditing.editingPlanPhases; },
    set items(v) { state.planEditing.editingPlanPhases = v; }
  },
  planDecision: {
    get editingId() { return state.planEditing.editingPlanDecisionId; },
    set editingId(v) { state.planEditing.editingPlanDecisionId = v; },
    get isUpdating() { return state.planEditing.isPlanDecisionUpdating; },
    set isUpdating(v) { state.planEditing.isPlanDecisionUpdating = v; },
    get creating() { return state.planEditing.creatingPlanDecision; },
    set creating(v) { state.planEditing.creatingPlanDecision = v; },
    get createStep() { return state.planEditing.creatingPlanDecisionStep; },
    set createStep(v) { state.planEditing.creatingPlanDecisionStep = v; },
    get newId() { return state.planEditing.newPlanDecisionId; },
    set newId(v) { state.planEditing.newPlanDecisionId = v; },
    get newDescription() { return state.planEditing.newPlanDecisionDescription; },
    set newDescription(v) { state.planEditing.newPlanDecisionDescription = v; },
    get newRationale() { return state.planEditing.newPlanDecisionRationale; },
    set newRationale(v) { state.planEditing.newPlanDecisionRationale = v; },
    get deletingId() { return state.planEditing.deletingPlanDecisionId; },
    set deletingId(v) { state.planEditing.deletingPlanDecisionId = v; },
    get modalReturnFocusEl() { return state.planEditing.deletePlanDecisionModalReturnFocusEl; },
    set modalReturnFocusEl(v) { state.planEditing.deletePlanDecisionModalReturnFocusEl = v; }
  },
  requirementOverview: {
    get isEditing() { return state.requirementEditing.isRequirementOverviewEditing; },
    set isEditing(v) { state.requirementEditing.isRequirementOverviewEditing = v; },
    get isUpdating() { return state.requirementEditing.isRequirementOverviewUpdating; },
    set isUpdating(v) { state.requirementEditing.isRequirementOverviewUpdating = v; }
  },
  requirementCurrentState: {
    get isEditing() { return state.requirementEditing.isRequirementCurrentStateEditing; },
    set isEditing(v) { state.requirementEditing.isRequirementCurrentStateEditing = v; },
    get isUpdating() { return state.requirementEditing.isRequirementCurrentStateUpdating; },
    set isUpdating(v) { state.requirementEditing.isRequirementCurrentStateUpdating = v; }
  },
  requirementNotes: {
    get isEditing() { return state.requirementEditing.isRequirementNotesEditing; },
    set isEditing(v) { state.requirementEditing.isRequirementNotesEditing = v; },
    get isUpdating() { return state.requirementEditing.isRequirementNotesUpdating; },
    set isUpdating(v) { state.requirementEditing.isRequirementNotesUpdating = v; }
  },
  functionalRequirement: {
    get editingId() { return state.requirementEditing.editingFunctionalRequirementId; },
    set editingId(v) { state.requirementEditing.editingFunctionalRequirementId = v; },
    get isUpdating() { return state.requirementEditing.isFunctionalRequirementUpdating; },
    set isUpdating(v) { state.requirementEditing.isFunctionalRequirementUpdating = v; },
    get creating() { return state.requirementEditing.creatingFunctionalRequirement; },
    set creating(v) { state.requirementEditing.creatingFunctionalRequirement = v; },
    get createStep() { return state.requirementEditing.creatingFunctionalRequirementStep; },
    set createStep(v) { state.requirementEditing.creatingFunctionalRequirementStep = v; },
    get newId() { return state.requirementEditing.newFunctionalRequirementId; },
    set newId(v) { state.requirementEditing.newFunctionalRequirementId = v; },
    get newTitle() { return state.requirementEditing.newFunctionalRequirementTitle; },
    set newTitle(v) { state.requirementEditing.newFunctionalRequirementTitle = v; },
    get newDescription() { return state.requirementEditing.newFunctionalRequirementDescription; },
    set newDescription(v) { state.requirementEditing.newFunctionalRequirementDescription = v; },
    get deletingId() { return state.requirementEditing.deletingFunctionalRequirementId; },
    set deletingId(v) { state.requirementEditing.deletingFunctionalRequirementId = v; },
    get modalReturnFocusEl() { return state.requirementEditing.deleteModalReturnFocusEl; },
    set modalReturnFocusEl(v) { state.requirementEditing.deleteModalReturnFocusEl = v; }
  },
  nonFunctionalRequirement: {
    get editingId() { return state.requirementEditing.editingNonFunctionalRequirementId; },
    set editingId(v) { state.requirementEditing.editingNonFunctionalRequirementId = v; },
    get isUpdating() { return state.requirementEditing.isNonFunctionalRequirementUpdating; },
    set isUpdating(v) { state.requirementEditing.isNonFunctionalRequirementUpdating = v; },
    get creating() { return state.requirementEditing.creatingNonFunctionalRequirement; },
    set creating(v) { state.requirementEditing.creatingNonFunctionalRequirement = v; },
    get createStep() { return state.requirementEditing.creatingNonFunctionalRequirementStep; },
    set createStep(v) { state.requirementEditing.creatingNonFunctionalRequirementStep = v; },
    get newId() { return state.requirementEditing.newNonFunctionalRequirementId; },
    set newId(v) { state.requirementEditing.newNonFunctionalRequirementId = v; },
    get newTitle() { return state.requirementEditing.newNonFunctionalRequirementTitle; },
    set newTitle(v) { state.requirementEditing.newNonFunctionalRequirementTitle = v; },
    get newDescription() { return state.requirementEditing.newNonFunctionalRequirementDescription; },
    set newDescription(v) { state.requirementEditing.newNonFunctionalRequirementDescription = v; },
    get deletingId() { return state.requirementEditing.deletingNonFunctionalRequirementId; },
    set deletingId(v) { state.requirementEditing.deletingNonFunctionalRequirementId = v; },
    get modalReturnFocusEl() { return state.requirementEditing.deleteNonFunctionalModalReturnFocusEl; },
    set modalReturnFocusEl(v) { state.requirementEditing.deleteNonFunctionalModalReturnFocusEl = v; }
  },
  story: {
    get editingId() { return state.storyEditing.editingStoryId; },
    set editingId(v) { state.storyEditing.editingStoryId = v; },
    get isUpdating() { return state.storyEditing.isStoryUpdating; },
    set isUpdating(v) { state.storyEditing.isStoryUpdating = v; },
    get creating() { return state.storyEditing.creatingStory; },
    set creating(v) { state.storyEditing.creatingStory = v; },
    get createStep() { return state.storyEditing.creatingStoryStep; },
    set createStep(v) { state.storyEditing.creatingStoryStep = v; },
    get newId() { return state.storyEditing.newStoryId; },
    set newId(v) { state.storyEditing.newStoryId = v; },
    get deletingId() { return state.storyEditing.deletingStoryId; },
    set deletingId(v) { state.storyEditing.deletingStoryId = v; }
  },
  acceptance: {
    get editingStoryId() { return state.storyEditing.editingAcceptanceStoryId; },
    set editingStoryId(v) { state.storyEditing.editingAcceptanceStoryId = v; },
    get isUpdating() { return state.storyEditing.isAcceptanceUpdating; },
    set isUpdating(v) { state.storyEditing.isAcceptanceUpdating = v; },
    get focusTarget() { return state.storyEditing.acceptanceFocusTarget; },
    set focusTarget(v) { state.storyEditing.acceptanceFocusTarget = v; }
  },
  taskDod: {
    get editingId() { return state.taskEditing.editingTaskDodId; },
    set editingId(v) { state.taskEditing.editingTaskDodId = v; },
    get isUpdating() { return state.taskEditing.isTaskDodUpdating; },
    set isUpdating(v) { state.taskEditing.isTaskDodUpdating = v; },
    get focusTarget() { return state.taskEditing.taskDodFocusTarget; },
    set focusTarget(v) { state.taskEditing.taskDodFocusTarget = v; }
  },
  taskNotes: {
    get editingId() { return state.taskEditing.editingTaskNotesId; },
    set editingId(v) { state.taskEditing.editingTaskNotesId = v; },
    get isUpdating() { return state.taskEditing.isTaskNotesUpdating; },
    set isUpdating(v) { state.taskEditing.isTaskNotesUpdating = v; },
    get openIds() { return state.taskEditing.openTaskNotesIds; },
    set openIds(v) { state.taskEditing.openTaskNotesIds = v; }
  },
  taskImplementationNotes: {
    get editingId() { return state.taskEditing.editingTaskImplementationNotesId; },
    set editingId(v) { state.taskEditing.editingTaskImplementationNotesId = v; },
    get isUpdating() { return state.taskEditing.isTaskImplementationNotesUpdating; },
    set isUpdating(v) { state.taskEditing.isTaskImplementationNotesUpdating = v; }
  },
  taskField: {
    get editing() { return state.taskEditing.editingTaskField; },
    set editing(v) { state.taskEditing.editingTaskField = v; },
    get isUpdating() { return state.taskEditing.isTaskFieldUpdating; },
    set isUpdating(v) { state.taskEditing.isTaskFieldUpdating = v; }
  },
  task: {
    get focusTarget() { return state.taskEditing.taskFocusTarget; },
    set focusTarget(v) { state.taskEditing.taskFocusTarget = v; }
  },
  openQuestion: {
    get editingId() { return state.openQuestionEditing.editingOpenQuestionId; },
    set editingId(v) { state.openQuestionEditing.editingOpenQuestionId = v; },
    get isUpdating() { return state.openQuestionEditing.isOpenQuestionUpdating; },
    set isUpdating(v) { state.openQuestionEditing.isOpenQuestionUpdating = v; },
    get creating() { return state.openQuestionEditing.creatingOpenQuestion; },
    set creating(v) { state.openQuestionEditing.creatingOpenQuestion = v; },
    get createStep() { return state.openQuestionEditing.creatingOpenQuestionStep; },
    set createStep(v) { state.openQuestionEditing.creatingOpenQuestionStep = v; },
    get newId() { return state.openQuestionEditing.newOpenQuestionId; },
    set newId(v) { state.openQuestionEditing.newOpenQuestionId = v; },
    get newQuestion() { return state.openQuestionEditing.newOpenQuestionQuestion; },
    set newQuestion(v) { state.openQuestionEditing.newOpenQuestionQuestion = v; },
    get newAnswer() { return state.openQuestionEditing.newOpenQuestionAnswer; },
    set newAnswer(v) { state.openQuestionEditing.newOpenQuestionAnswer = v; },
    get newStatus() { return state.openQuestionEditing.newOpenQuestionStatus; },
    set newStatus(v) { state.openQuestionEditing.newOpenQuestionStatus = v; },
    get deletingId() { return state.openQuestionEditing.deletingOpenQuestionId; },
    set deletingId(v) { state.openQuestionEditing.deletingOpenQuestionId = v; }
  },
  filters: {
    getStatusFilters(section) { return state.filterState.sectionStatusFilters[section] || new Set(); },
    setStatusFilters(section, v) { state.filterState.sectionStatusFilters[section] = v; },
    getStatusCatalog(section) { return state.filterState.sectionStatusCatalog[section] || new Set(); },
    setStatusCatalog(section, v) { state.filterState.sectionStatusCatalog[section] = v; }
  }
};

export { uiState, DEFAULT_STATE };
