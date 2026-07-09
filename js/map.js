import { state, reducedMotion } from './state.js';
import { MAP_W, MAP_H, project, deg2rad, rad2deg, pathFromLonLat } from './utils.js';

const svgns = 'http://www.w3.org/2000/svg';
const LAND_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/land-110m.json';

export function initMap(svg) {
  ['bg', 'land', 'night', 'grid', 'quakes', 'iss', 'you', 'rings'].forEach(name => {
    const g = document.createElementNS(svgns, 'g');
    g.setAttribute('id', 'layer-' + name);
    svg.appendChild(g);
    state.layers[name] = g;
  });

  const ocean = document.createElementNS(svgns, 'rect');
  ocean.setAttribute('x', 0); ocean.setAttribute('y', 0);
  ocean.setAttribute('width', MAP_W); ocean.setAttribute('height', MAP_H);
  ocean.setAttribute('fill', 'url(#oceanGrad)');
  ocean.addEventListener('click', () => { state.selection = null; state.onUpdate(); });
  state.layers.bg.appendChild(ocean);

  buildGrid();
  loadLand();
  renderNight();
  if (!reducedMotion) setInterval(renderNight, 60000);
  else setInterval(renderNight, 300000);
}

function buildGrid() {
  const grid = state.layers.grid;
  for (let lon = -180; lon <= 180; lon += 30) {
    const [x] = project(lon, 0);
    const l = document.createElementNS(svgns, 'line');
    l.setAttribute('x1', x); l.setAttribute('x2', x); l.setAttribute('y1', 0); l.setAttribute('y2', MAP_H);
    l.setAttribute('class', 'grid-line' + (lon === 0 ? ' strong' : ''));
    grid.appendChild(l);
  }
  for (let lat = -90; lat <= 90; lat += 30) {
    const [, y] = project(0, lat);
    const l = document.createElementNS(svgns, 'line');
    l.setAttribute('y1', y); l.setAttribute('y2', y); l.setAttribute('x1', 0); l.setAttribute('x2', MAP_W);
    l.setAttribute('class', 'grid-line' + (lat === 0 ? ' strong' : ''));
    grid.appendChild(l);
  }
  [-180, -90, 0, 90, 180].forEach(lon => {
    const [x] = project(lon, 90);
    const t = document.createElementNS(svgns, 'text');
    t.setAttribute('x', Math.min(Math.max(x + 3, 2), MAP_W - 24)); t.setAttribute('y', 11);
    t.setAttribute('class', 'grid-label'); t.textContent = lon + '\u00B0';
    grid.appendChild(t);
  });
  [-60, -30, 0, 30, 60].forEach(lat => {
    const [, y] = project(0, lat);
    const t = document.createElementNS(svgns, 'text');
    t.setAttribute('x', 3); t.setAttribute('y', y - 3);
    t.setAttribute('class', 'grid-label'); t.textContent = lat + '\u00B0';
    grid.appendChild(t);
  });
}

async function loadLand() {
  try {
    if (typeof topojson === 'undefined') throw new Error('topojson script did not load');
    const res = await fetch(LAND_URL);
    if (!res.ok) throw new Error('bad response ' + res.status);
    const topo = await res.json();
    const key = Object.keys(topo.objects)[0];
    const geo = topojson.feature(topo, topo.objects[key]);
    const feats = geo.features || [geo];
    const frag = document.createDocumentFragment();
    feats.forEach(f => {
      const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
      polys.forEach(poly => poly.forEach(ring => {
        const p = document.createElementNS(svgns, 'path');
        p.setAttribute('d', pathFromLonLat(ring));
        p.setAttribute('class', 'land');
        frag.appendChild(p);
      }));
    });
    state.layers.land.appendChild(frag);
  } catch (e) {
    console.warn('continent outlines unavailable, showing grid only:', e.message);
  }
}

function computeNightPolygon(date) {
  const dayOfYear = Math.floor((date - Date.UTC(date.getUTCFullYear(), 0, 1)) / 86400000) + 1;
  const decl = 23.44 * Math.sin((2 * Math.PI / 365.25) * (dayOfYear - 81));
  const utcH = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
  let subLon = (12 - utcH) * 15; subLon = ((subLon + 180) % 360 + 360) % 360 - 180;
  const tanDecl = Math.tan(deg2rad(decl)) || 1e-6;
  const pts = [];
  for (let lon = -180; lon <= 180; lon += 2) {
    const H = deg2rad(lon - subLon);
    pts.push([lon, rad2deg(Math.atan(-Math.cos(H) / tanDecl))]);
  }
  const nightPole = decl >= 0 ? -90 : 90;
  pts.push([180, nightPole]); pts.push([-180, nightPole]);
  return pts;
}

export function renderNight() {
  state.layers.night.innerHTML = '';
  const p = document.createElementNS(svgns, 'path');
  p.setAttribute('d', pathFromLonLat(computeNightPolygon(new Date())));
  p.setAttribute('class', 'night');
  p.setAttribute('pointer-events', 'none');
  state.layers.night.appendChild(p);
}
