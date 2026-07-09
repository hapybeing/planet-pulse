// Shared mutable state. Modules import `state` and mutate its properties
// directly (never reassign the import itself — mutate properties instead).
export const state = {
  layers: {},        // svg <g> layers, populated by map.js
  known: new Map(),  // quake id -> { el, data }  (last-24h quakes only)
  allQuakes: [],      // last-24h quakes, as plain objects
  selection: null,   // { type: 'quake', id } | { type: 'iss' } | null
  lastFetchAt: null,
  fetchFailed: false,
  firstLoad: true,
  myLoc: null,        // { lat, lon }
  iss: null,          // { lat, lon, alt, vel, visibility }
  onUpdate: () => {}  // set by main.js; called whenever footer-relevant data changes
};

export const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
