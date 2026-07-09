import { state, reducedMotion } from './state.js';
import { project, magColor, magRadius } from './utils.js';

const svgns = 'http://www.w3.org/2000/svg';
const FEED_URL = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_week.geojson';
const REFRESH_MS = 90000;
const TRACE_WINDOW_MS = 12 * 60 * 1000;
const AGE_SPAN_MS = 7 * 24 * 3600000;
const COLOR_TEXT = '#e8e2d3';

let statusEl;

export function initQuakes() {
  statusEl = document.getElementById('status');
  tick();
  setInterval(tick, REFRESH_MS);
  setInterval(updateStatus, 1000);
  setupSeismograph();
}

function spawnRipple(q) {
  const [x, y] = project(q.lon, q.lat);
  const r = document.createElementNS(svgns, 'circle');
  r.setAttribute('cx', x); r.setAttribute('cy', y); r.setAttribute('r', magRadius(q.mag));
  r.setAttribute('class', 'ring ripple'); r.setAttribute('stroke', magColor(q.mag));
  state.layers.rings.appendChild(r);
  setTimeout(() => r.remove(), 1400);
}

function addQuakeDot(q) {
  const [x, y] = project(q.lon, q.lat);
  const c = document.createElementNS(svgns, 'circle');
  c.setAttribute('cx', x); c.setAttribute('cy', y); c.setAttribute('r', magRadius(q.mag));
  c.setAttribute('fill', magColor(q.mag));
  c.setAttribute('class', 'quake arrive' + (q.mag >= 4.5 ? ' pulse' : ''));
  c.setAttribute('tabindex', '0');
  c.addEventListener('click', (e) => { e.stopPropagation(); state.selection = { type: 'quake', id: q.id }; state.onUpdate(); });
  state.layers.quakes.appendChild(c);
  state.known.set(q.id, { el: c, data: q });
  if (!state.firstLoad) spawnRipple(q);
}

function applyAgeFade() {
  const now = Date.now();
  state.known.forEach(v => {
    const fade = Math.max(0.35, 1 - (now - v.data.time) / AGE_SPAN_MS * 0.65);
    v.el.setAttribute('fill-opacity', fade.toFixed(2));
  });
}

function updateStrongestRing() {
  const old = state.layers.rings.querySelector('.ring.strongest');
  if (old) old.remove();
  if (!state.allQuakes.length) return;
  const s = state.allQuakes.reduce((a, b) => (b.mag > a.mag ? b : a));
  const [x, y] = project(s.lon, s.lat);
  const ring = document.createElementNS(svgns, 'circle');
  ring.setAttribute('cx', x); ring.setAttribute('cy', y); ring.setAttribute('r', magRadius(s.mag) + 3);
  ring.setAttribute('class', 'ring strongest');
  state.layers.rings.appendChild(ring);
}

function reconcile(features) {
  const fresh = features.map(f => ({
    id: f.id,
    mag: (f.properties && f.properties.mag != null) ? f.properties.mag : 0,
    place: (f.properties && f.properties.place) || 'unknown location',
    time: f.properties ? f.properties.time : Date.now(),
    depth: (f.geometry && f.geometry.coordinates[2]) || 0,
    lon: f.geometry.coordinates[0], lat: f.geometry.coordinates[1]
  })).filter(q => !isNaN(q.lon) && !isNaN(q.lat) && !isNaN(q.time));

  const freshIds = new Set(fresh.map(q => q.id));
  state.known.forEach((v, id) => { if (!freshIds.has(id)) { v.el.remove(); state.known.delete(id); } });
  fresh.forEach(q => { if (!state.known.has(q.id)) addQuakeDot(q); });

  state.allQuakes = fresh;
  state.firstLoad = false;
  updateStrongestRing();
  applyAgeFade();
  if (state.selection && state.selection.type === 'quake' && !state.known.has(state.selection.id)) state.selection = null;
  state.onUpdate();
  if (reducedMotion) drawSeismo();
}

async function tick() {
  try {
    const res = await fetch(FEED_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error('bad response ' + res.status);
    const data = await res.json();
    reconcile(data.features || []);
    state.lastFetchAt = Date.now();
    state.fetchFailed = false;
  } catch (e) {
    state.fetchFailed = true;
  }
  updateStatus();
}

function updateStatus() {
  if (!statusEl) return;
  if (state.fetchFailed && !state.lastFetchAt) { statusEl.textContent = 'connecting…'; return; }
  if (state.fetchFailed) { statusEl.textContent = 'connection lost \u2014 retrying…'; return; }
  if (!state.lastFetchAt) { statusEl.textContent = 'reading the feed…'; return; }
  statusEl.textContent = 'updated ' + Math.max(0, Math.floor((Date.now() - state.lastFetchAt) / 1000)) + 's ago';
}

// --- seismograph strip ---
let canvas, ctx;
function ambient(t) { return Math.sin(t / 4200) * 0.5 + Math.sin(t / 1300 + 1.2) * 0.3 + Math.sin(t / 530 + 2.4) * 0.15; }

function drawSeismo() {
  if (!canvas) return;
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (!w || !h) return;
  ctx.clearRect(0, 0, w, h);
  const now = Date.now(), midY = h / 2;
  const relevant = state.allQuakes.filter(q => now - q.time < TRACE_WINDOW_MS + 80000);
  ctx.strokeStyle = COLOR_TEXT; ctx.lineWidth = 1.3; ctx.beginPath();
  for (let x = 0; x <= w; x += 2) {
    const t = now - TRACE_WINDOW_MS * (1 - x / w);
    let y = midY + (reducedMotion ? 0 : ambient(t) * 3.2);
    for (const q of relevant) {
      const dt = t - q.time;
      if (Math.abs(dt) < 80000) {
        const amp = Math.min(h * 0.42, q.mag * 6.5);
        y += amp * Math.exp(-Math.abs(dt) / 22000) * Math.sin(dt / 2600) * (dt >= 0 ? 1 : 0.35);
      }
    }
    y = Math.max(2, Math.min(h - 2, y));
    x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.stroke();
}

function setupSeismograph() {
  canvas = document.getElementById('seismo');
  ctx = canvas.getContext('2d');
  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawSeismo();
  }
  window.addEventListener('resize', resize);
  resize();
  let lastDraw = 0;
  function loop(ts) { if (!lastDraw || ts - lastDraw > 50) { drawSeismo(); lastDraw = ts; } requestAnimationFrame(loop); }
  if (!reducedMotion) requestAnimationFrame(loop);
}
