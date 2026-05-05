function createStore(initialState = {}) {
  let state = { ...initialState };
  const listeners = new Set();

  function getState() {
    return state;
  }

  function updateState(patchOrUpdater, meta = {}) {
    const patch = typeof patchOrUpdater === 'function'
      ? patchOrUpdater(state)
      : patchOrUpdater;
    const safePatch = patch && typeof patch === 'object' ? patch : {};
    const nextState = { ...state, ...safePatch };
    const changedKeys = Object.keys(safePatch).filter((key) => state[key] !== nextState[key]);
    if (!changedKeys.length) {
      return state;
    }

    const previousState = state;
    state = nextState;
    listeners.forEach((listener) => {
      listener(state, previousState, {
        changedKeys,
        timestamp: new Date().toISOString(),
        ...meta
      });
    });
    return state;
  }

  function resetState(nextInitialState = {}) {
    const previousState = state;
    state = { ...nextInitialState };
    listeners.forEach((listener) => {
      listener(state, previousState, {
        changedKeys: Object.keys(state),
        timestamp: new Date().toISOString(),
        reason: 'resetState'
      });
    });
    return state;
  }

  function subscribe(listener) {
    if (typeof listener !== 'function') {
      return () => {};
    }
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  return {
    getState,
    updateState,
    resetState,
    subscribe
  };
}

export { createStore };
