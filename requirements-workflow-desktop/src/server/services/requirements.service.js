export function createRequirementsService(repository) {
  const OPEN_QUESTION_STATUSES = ['open', 'resolved'];

  function validateStatus(status, allowedStatuses) {
    return typeof status === 'string' && allowedStatuses.includes(status);
  }
  function listRequirements() {
    const files = repository.listRequirementFiles();
    return files.map(file => {
      const { data } = repository.readRequirementFile(file);
      const document = data.document || {};
      return {
        id: document.id,
        title: document.title,
        status: document.status || 'draft',
        sourcePath: document.sourcePath || null,
        version: document.version || null,
        functionalCount: (data.functionalRequirements || []).length,
        nonFunctionalCount: (data.nonFunctionalRequirements || []).length,
        storiesCount: (data.userStories || []).length,
        decisionsCount: (data.architecturalDecisions || []).length,
        openQuestionsCount: (data.openQuestions || []).length
      };
    });
  }

  function getRequirementById(id) {
    const requirement = repository.readRequirementById(id);
    return requirement ? requirement.data : null;
  }

  function updateOverview(id, payload) {
    const requirement = repository.readRequirementById(id);
    if (!requirement) return { status: 404, error: 'Requirement not found' };
    const { overview } = payload || {};
    if (typeof overview !== 'string') return { status: 400, error: 'Invalid payload. "overview" must be a string.' };
    requirement.data.overview = overview.trim();
    repository.writeRequirement(requirement.filePath, requirement.data);
    return { status: 200, requirementId: requirement.data.document?.id || id, overview: requirement.data.overview };
  }

  function updateCurrentState(id, payload) {
    const requirement = repository.readRequirementById(id);
    if (!requirement) return { status: 404, error: 'Requirement not found' };
    const { currentState } = payload || {};
    if (!Array.isArray(currentState) || !currentState.every(row => row && typeof row === 'object')) {
      return { status: 400, error: 'Invalid payload. "currentState" must be an array of objects.' };
    }
    requirement.data.currentState = currentState;
    repository.writeRequirement(requirement.filePath, requirement.data);
    return { status: 200, requirementId: requirement.data.document?.id || id, currentState: requirement.data.currentState };
  }

  function updateNotes(id, payload) {
    const requirement = repository.readRequirementById(id);
    if (!requirement) return { status: 404, error: 'Requirement not found' };
    const { notes } = payload || {};
    if (notes !== null && notes !== undefined && typeof notes !== 'string') {
      return { status: 400, error: 'Invalid payload. "notes" must be a string or null.' };
    }
    requirement.data.notes = notes ?? null;
    repository.writeRequirement(requirement.filePath, requirement.data);
    return { status: 200, requirementId: requirement.data.document?.id || id, notes: requirement.data.notes };
  }

  function createFunctionalRequirement(id, payload) {
    const requirement = repository.readRequirementById(id);
    if (!requirement) return { status: 404, error: 'Requirement not found' };
    const { functionalId, title, description } = payload || {};
    if (typeof functionalId !== 'string') return { status: 400, error: 'Invalid payload. "functionalId" must be a string.' };
    const normalizedId = functionalId.trim();
    if (!normalizedId) return { status: 400, error: 'functionalId is required.' };
    if (typeof title !== 'string' || typeof description !== 'string') return { status: 400, error: 'Invalid payload. "title" and "description" must be strings.' };
    const normalizedTitle = title.trim();
    const normalizedDescription = description.trim();
    if (!normalizedTitle || !normalizedDescription) return { status: 400, error: 'Title and description are required.' };
    const list = Array.isArray(requirement.data.functionalRequirements) ? requirement.data.functionalRequirements : [];
    if (list.some(item => item.id === normalizedId)) return { status: 409, error: 'Functional requirement ID already exists.' };
    const item = { id: normalizedId, title: normalizedTitle, description: normalizedDescription };
    requirement.data.functionalRequirements = [...list, item];
    repository.writeRequirement(requirement.filePath, requirement.data);
    return { status: 201, item };
  }

  function updateFunctionalRequirement(id, functionalId, payload) {
    const requirement = repository.readRequirementById(id);
    if (!requirement) return { status: 404, error: 'Requirement not found' };
    const { title, description } = payload || {};
    if (typeof title !== 'string' || typeof description !== 'string') return { status: 400, error: 'Invalid payload. "title" and "description" must be strings.' };
    const normalizedTitle = title.trim();
    const normalizedDescription = description.trim();
    if (!normalizedTitle || !normalizedDescription) return { status: 400, error: 'Title and description are required.' };
    const item = (requirement.data.functionalRequirements || []).find(entry => entry.id === functionalId);
    if (!item) return { status: 404, error: 'Functional requirement not found' };
    item.title = normalizedTitle;
    item.description = normalizedDescription;
    repository.writeRequirement(requirement.filePath, requirement.data);
    return { status: 200, item };
  }

  function deleteFunctionalRequirement(id, functionalId) {
    const requirement = repository.readRequirementById(id);
    if (!requirement) return { status: 404, error: 'Requirement not found' };
    const list = Array.isArray(requirement.data.functionalRequirements) ? requirement.data.functionalRequirements : [];
    const nextList = list.filter(entry => entry.id !== functionalId);
    if (nextList.length === list.length) return { status: 404, error: 'Functional requirement not found' };
    requirement.data.functionalRequirements = nextList;
    repository.writeRequirement(requirement.filePath, requirement.data);
    return { status: 200 };
  }

  function createNonFunctionalRequirement(id, payload) {
    const requirement = repository.readRequirementById(id);
    if (!requirement) return { status: 404, error: 'Requirement not found' };
    const { nonFunctionalId, title, description } = payload || {};
    if (typeof nonFunctionalId !== 'string' || typeof title !== 'string' || typeof description !== 'string') {
      return { status: 400, error: 'Invalid payload. "nonFunctionalId", "title" and "description" must be strings.' };
    }
    const normalizedId = nonFunctionalId.trim();
    const normalizedTitle = title.trim();
    const normalizedDescription = description.trim();
    if (!normalizedId || !normalizedTitle || !normalizedDescription) return { status: 400, error: 'nonFunctionalId, title and description are required.' };
    const list = Array.isArray(requirement.data.nonFunctionalRequirements) ? requirement.data.nonFunctionalRequirements : [];
    if (list.some(item => item.id === normalizedId)) return { status: 409, error: 'Non-functional requirement ID already exists.' };
    const item = { id: normalizedId, title: normalizedTitle, description: normalizedDescription };
    requirement.data.nonFunctionalRequirements = [...list, item];
    repository.writeRequirement(requirement.filePath, requirement.data);
    return { status: 201, item };
  }

  function updateNonFunctionalRequirement(id, nonFunctionalId, payload) {
    const requirement = repository.readRequirementById(id);
    if (!requirement) return { status: 404, error: 'Requirement not found' };
    const { title, description } = payload || {};
    if (typeof title !== 'string' || typeof description !== 'string') return { status: 400, error: 'Invalid payload. "title" and "description" must be strings.' };
    const normalizedTitle = title.trim();
    const normalizedDescription = description.trim();
    if (!normalizedTitle || !normalizedDescription) return { status: 400, error: 'Title and description are required.' };
    const item = (requirement.data.nonFunctionalRequirements || []).find(entry => entry.id === nonFunctionalId);
    if (!item) return { status: 404, error: 'Non-functional requirement not found' };
    item.title = normalizedTitle;
    item.description = normalizedDescription;
    repository.writeRequirement(requirement.filePath, requirement.data);
    return { status: 200, item };
  }

  function deleteNonFunctionalRequirement(id, nonFunctionalId) {
    const requirement = repository.readRequirementById(id);
    if (!requirement) return { status: 404, error: 'Requirement not found' };
    const list = Array.isArray(requirement.data.nonFunctionalRequirements) ? requirement.data.nonFunctionalRequirements : [];
    const nextList = list.filter(entry => entry.id !== nonFunctionalId);
    if (nextList.length === list.length) return { status: 404, error: 'Non-functional requirement not found' };
    requirement.data.nonFunctionalRequirements = nextList;
    repository.writeRequirement(requirement.filePath, requirement.data);
    return { status: 200 };
  }

  function toggleStoryAcceptance(id, storyId, index, payload) {
    const requirement = repository.readRequirementById(id);
    if (!requirement) return { status: 404, error: 'Requirement not found' };
    const { checked } = payload || {};
    if (typeof checked !== 'boolean') return { status: 400, error: 'Invalid payload. "checked" must be a boolean.' };
    const criterionIndex = Number.parseInt(index, 10);
    if (!Number.isInteger(criterionIndex) || criterionIndex < 0) return { status: 400, error: 'Invalid acceptance criterion index' };
    const story = (requirement.data.userStories || []).find(item => item.id === storyId);
    if (!story) return { status: 404, error: 'User story not found' };
    if (!Array.isArray(story.acceptanceCriteria) || !story.acceptanceCriteria[criterionIndex]) return { status: 404, error: 'Acceptance criterion not found' };
    story.acceptanceCriteria[criterionIndex].checked = checked;
    repository.writeRequirement(requirement.filePath, requirement.data);
    return { status: 200, storyId: story.id, criterionIndex, checked };
  }

  function createStory(id, payload) {
    const requirement = repository.readRequirementById(id);
    if (!requirement) return { status: 404, error: 'Requirement not found' };
    const { storyId, title, asA, iWant, soThat, acceptanceCriteria } = payload || {};
    if ([storyId, title, asA, iWant, soThat].some(v => typeof v !== 'string')) return { status: 400, error: 'Invalid payload. storyId, title, asA, iWant, soThat must be strings.' };
    const normalizedId = storyId.trim();
    const normalizedTitle = title.trim();
    const normalizedAsA = asA.trim();
    const normalizedIWant = iWant.trim();
    const normalizedSoThat = soThat.trim();
    if (!normalizedId || !normalizedTitle || !normalizedAsA || !normalizedIWant || !normalizedSoThat) return { status: 400, error: 'All fields are required.' };
    const list = Array.isArray(requirement.data.userStories) ? requirement.data.userStories : [];
    if (list.some(item => item.id === normalizedId)) return { status: 409, error: 'Story ID already exists.' };
    const criteriaInput = Array.isArray(acceptanceCriteria) ? acceptanceCriteria : [];
    const normalizedCriteria = criteriaInput.map(value => String(value || '').trim()).filter(Boolean).map(text => ({ text, checked: false }));
    if (!normalizedCriteria.length) return { status: 400, error: 'At least one acceptance criterion is required.' };
    const item = { id: normalizedId, title: normalizedTitle, asA: normalizedAsA, iWant: normalizedIWant, soThat: normalizedSoThat, acceptanceCriteria: normalizedCriteria };
    requirement.data.userStories = [...list, item];
    repository.writeRequirement(requirement.filePath, requirement.data);
    return { status: 201, item };
  }

  function updateStory(id, storyId, payload) {
    const requirement = repository.readRequirementById(id);
    if (!requirement) return { status: 404, error: 'Requirement not found' };
    const { title, asA, iWant, soThat, acceptanceCriteria } = payload || {};
    if ([title, asA, iWant, soThat].some(v => typeof v !== 'string') || !Array.isArray(acceptanceCriteria)) return { status: 400, error: 'Invalid payload. title, asA, iWant, soThat must be strings and acceptanceCriteria must be array.' };
    const normalizedTitle = title.trim();
    const normalizedAsA = asA.trim();
    const normalizedIWant = iWant.trim();
    const normalizedSoThat = soThat.trim();
    if (!normalizedTitle || !normalizedAsA || !normalizedIWant || !normalizedSoThat) return { status: 400, error: 'All fields are required.' };
    const normalizedCriteriaText = acceptanceCriteria.map(value => String(value || '').trim()).filter(Boolean);
    if (!normalizedCriteriaText.length) return { status: 400, error: 'At least one acceptance criterion is required.' };
    const item = (requirement.data.userStories || []).find(entry => entry.id === storyId);
    if (!item) return { status: 404, error: 'User story not found' };
    item.title = normalizedTitle;
    item.asA = normalizedAsA;
    item.iWant = normalizedIWant;
    item.soThat = normalizedSoThat;
    const oldCriteria = Array.isArray(item.acceptanceCriteria) ? item.acceptanceCriteria : [];
    item.acceptanceCriteria = normalizedCriteriaText.map((text, idx) => {
      const old = oldCriteria[idx];
      if (old && String(old.text || '').trim() === text) return { text, checked: Boolean(old.checked) };
      return { text, checked: false };
    });
    repository.writeRequirement(requirement.filePath, requirement.data);
    return { status: 200, item };
  }

  function deleteStory(id, storyId) {
    const requirement = repository.readRequirementById(id);
    if (!requirement) return { status: 404, error: 'Requirement not found' };
    const list = Array.isArray(requirement.data.userStories) ? requirement.data.userStories : [];
    const nextList = list.filter(entry => entry.id !== storyId);
    if (nextList.length === list.length) return { status: 404, error: 'User story not found' };
    requirement.data.userStories = nextList;
    repository.writeRequirement(requirement.filePath, requirement.data);
    return { status: 200 };
  }

  function createOpenQuestion(id, payload) {
    const requirement = repository.readRequirementById(id);
    if (!requirement) return { status: 404, error: 'Requirement not found' };
    const { id: questionId, question, answer, status } = payload || {};
    if (typeof questionId !== 'string' || typeof question !== 'string' || typeof answer !== 'string') return { status: 400, error: 'Invalid payload. "id", "question" and "answer" must be strings.' };
    if (!validateStatus(status, OPEN_QUESTION_STATUSES)) return { status: 400, error: `Invalid status. Allowed: ${OPEN_QUESTION_STATUSES.join(', ')}` };
    const normalizedId = questionId.trim();
    const normalizedQuestion = question.trim();
    const normalizedAnswer = answer.trim();
    if (!normalizedId || !normalizedQuestion) return { status: 400, error: '"id" and "question" are required.' };
    const list = Array.isArray(requirement.data.openQuestions) ? requirement.data.openQuestions : [];
    if (list.some(item => item.id === normalizedId)) return { status: 409, error: 'Open question ID already exists' };
    const item = { id: normalizedId, question: normalizedQuestion, answer: normalizedAnswer, status };
    requirement.data.openQuestions = [...list, item];
    repository.writeRequirement(requirement.filePath, requirement.data);
    return { status: 201, item };
  }

  function updateOpenQuestion(id, questionId, payload) {
    const requirement = repository.readRequirementById(id);
    if (!requirement) return { status: 404, error: 'Requirement not found' };
    const { answer, status } = payload || {};
    if (typeof answer !== 'string') return { status: 400, error: 'Invalid payload. "answer" must be a string.' };
    if (!validateStatus(status, OPEN_QUESTION_STATUSES)) return { status: 400, error: `Invalid status. Allowed: ${OPEN_QUESTION_STATUSES.join(', ')}` };
    const question = (requirement.data.openQuestions || []).find(item => item.id === questionId);
    if (!question) return { status: 404, error: 'Open question not found' };
    question.answer = answer.trim();
    question.status = status;
    repository.writeRequirement(requirement.filePath, requirement.data);
    return { status: 200, questionId: question.id, answer: question.answer, statusValue: question.status };
  }

  function deleteOpenQuestion(id, questionId) {
    const requirement = repository.readRequirementById(id);
    if (!requirement) return { status: 404, error: 'Requirement not found' };
    const list = Array.isArray(requirement.data.openQuestions) ? requirement.data.openQuestions : [];
    const nextList = list.filter(item => item.id !== questionId);
    if (nextList.length === list.length) return { status: 404, error: 'Open question not found' };
    requirement.data.openQuestions = nextList;
    repository.writeRequirement(requirement.filePath, requirement.data);
    return { status: 200 };
  }

  return {
    listRequirements,
    getRequirementById,
    updateOverview,
    updateCurrentState,
    updateNotes,
    createFunctionalRequirement,
    updateFunctionalRequirement,
    deleteFunctionalRequirement,
    createNonFunctionalRequirement,
    updateNonFunctionalRequirement,
    deleteNonFunctionalRequirement
    ,toggleStoryAcceptance
    ,createStory
    ,updateStory
    ,deleteStory
    ,createOpenQuestion
    ,updateOpenQuestion
    ,deleteOpenQuestion
  };
}
