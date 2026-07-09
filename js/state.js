export const state = {
  layers: {},
  known: new Map(),
  allQuakes: [],
  selection: null,
  lastFetchAt: null,
  fetchFailed: false,
  firstLoad: true,
  iss: null,
  onUpdate: () => {}
};

export const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
