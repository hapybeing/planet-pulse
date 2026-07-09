import { state } from './state.js';
import { project } from './utils.js';

const svgns = 'http://www.w3.org/2000/svg';
const ISS_URL = 'https://api.wheretheiss.at/v1/satellites/25544';
const ISS_MS = 5000;

export function initISS() {
  fetchISS();
  setInterval(fetchISS, ISS_MS);
}

async function fetchISS() {
  try {
    const res = await fetch(ISS_URL);
    if (!res.ok) throw new Error('bad response');
    const d = await res.json();
    state.iss = { lat: d.latitude, lon: d.longitude, alt: d.altitude, vel: d.velocity, visibility: d.visibility };
    renderISS();
    if (state.selection && state.selection.type === 'iss') state.onUpdate();
  } catch (e) { /* skip this cycle, keep last known position */ }
}

function renderISS() {
  state.layers.iss.innerHTML = '';
  if (!state.iss) return;
  const [x, y] = project(state.iss.lon, state.iss.lat);
  const ring = document.createElementNS(svgns, 'circle');
  ring.setAttribute('cx', x); ring.setAttribute('cy', y); ring.setAttribute('r', 9);
  ring.setAttribute('class', 'iss-ring'); ring.setAttribute('pointer-events', 'none');
  const c = document.createElementNS(svgns, 'circle');
  c.setAttribute('cx', x); c.setAttribute('cy', y); c.setAttribute('r', 4.5);
  c.setAttribute('class', 'iss-marker'); c.setAttribute('tabindex', '0');
  c.addEventListener('click', (e) => { e.stopPropagation(); state.selection = { type: 'iss' }; state.onUpdate(); });
  state.layers.iss.appendChild(ring);
  state.layers.iss.appendChild(c);
}
