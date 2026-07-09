import { state } from './state.js';
import { project, haversineKm } from './utils.js';

const svgns = 'http://www.w3.org/2000/svg';

export function initLocation() {
  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      state.myLoc = { lat: pos.coords.latitude, lon: pos.coords.longitude };
      renderMe();
      state.onUpdate();
    },
    () => { /* denied or unavailable — app works fine without it */ },
    { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 }
  );
}

function renderMe() {
  state.layers.you.innerHTML = '';
  if (!state.myLoc) return;
  const [x, y] = project(state.myLoc.lon, state.myLoc.lat);
  const ring = document.createElementNS(svgns, 'circle');
  ring.setAttribute('cx', x); ring.setAttribute('cy', y); ring.setAttribute('r', 9);
  ring.setAttribute('class', 'you-ring'); ring.setAttribute('pointer-events', 'none');
  const c = document.createElementNS(svgns, 'circle');
  c.setAttribute('cx', x); c.setAttribute('cy', y); c.setAttribute('r', 4);
  c.setAttribute('class', 'you-marker'); c.setAttribute('pointer-events', 'none');
  state.layers.you.appendChild(ring);
  state.layers.you.appendChild(c);
}

export function nearestQuake() {
  if (!state.allQuakes.length || !state.myLoc) return null;
  const { lat, lon } = state.myLoc;
  return state.allQuakes.reduce((a, b) =>
    haversineKm(lat, lon, b.lat, b.lon) < haversineKm(lat, lon, a.lat, a.lon) ? b : a
  );
}
