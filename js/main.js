import { state } from './state.js';
import { initMap } from './map.js';
import { initQuakes } from './quakes.js';
import { initISS } from './iss.js';
import { initLocation, nearestQuake } from './location.js';
import { escapeHtml, timeAgo, haversineKm, bearingDeg, compassDir } from './utils.js';

const svg = document.getElementById('map');
const footerEl = document.getElementById('footer');

function bindBack() {
  const b = document.getElementById('back-btn');
  if (b) b.addEventListener('click', () => { state.selection = null; renderFooter(); });
}

function renderFooter() {
  const sel = state.selection;

  if (sel && sel.type === 'quake' && state.known.has(sel.id)) {
    const q = state.known.get(sel.id).data;
    footerEl.innerHTML = '<span class="label">M ' + q.mag.toFixed(1) + ' \u00B7 ' + escapeHtml(q.place) +
      ' \u00B7 ' + timeAgo(q.time) + ' \u00B7 depth ' + Math.round(q.depth) + 'km</span>' +
      '<button class="close-btn" id="back-btn">overview</button>';
    bindBack(); return;
  }
  if (sel && sel.type === 'iss' && state.iss) {
    footerEl.innerHTML = '<span class="label">ISS \u00B7 altitude ' + Math.round(state.iss.alt) + 'km \u00B7 ' +
      Math.round(state.iss.vel) + 'km/h \u00B7 ' + state.iss.visibility + '</span>' +
      '<button class="close-btn" id="back-btn">overview</button>';
    bindBack(); return;
  }
  if (!state.allQuakes.length) {
    footerEl.innerHTML = '<span class="label">' +
      (state.lastFetchAt ? 'no quakes reported this week (rare!)' : 'reading the feed…') + '</span>';
    return;
  }
  const strongest = state.allQuakes.reduce((a, b) => (b.mag > a.mag ? b : a));
  let text = state.allQuakes.length + ' quakes \u00B7 past week \u00B7 strongest M ' +
    strongest.mag.toFixed(1) + ' near ' + escapeHtml(strongest.place);
  const near = nearestQuake();
  if (near && state.myLoc) {
    const d = haversineKm(state.myLoc.lat, state.myLoc.lon, near.lat, near.lon);
    text += ' \u00B7 nearest to you: ' + Math.round(d) + 'km ' +
      compassDir(bearingDeg(state.myLoc.lat, state.myLoc.lon, near.lat, near.lon));
  }
  footerEl.innerHTML = '<span class="label">' + text + '</span>';
}

state.onUpdate = renderFooter;

initMap(svg);
initQuakes();
initISS();
initLocation();
renderFooter();
