export const MAP_W = 1000, MAP_H = 500;

export function project(lon, lat) {
  return [(lon + 180) / 360 * MAP_W, (90 - lat) / 180 * MAP_H];
}
export function deg2rad(d) { return d * Math.PI / 180; }
export function rad2deg(r) { return r * 180 / Math.PI; }

export function magColor(m) {
  return m >= 6 ? '#c23f2f' : m >= 4.5 ? '#c9752f' : m >= 3 ? '#c9a227' : '#5b8c5a';
}
export function magRadius(m) { return Math.max(3, Math.min(20, 3 + m * 2.1)); }

export function timeAgo(ms) {
  const s = Math.max(1, Math.floor((Date.now() - ms) / 1000));
  if (s < 60) return s + 's ago';
  const m = Math.floor(s / 60);
  if (m < 60) return m + 'm ago';
  const h = Math.floor(m / 60);
  if (h < 24) return h + 'h ' + (m % 60) + 'm ago';
  return Math.floor(h / 24) + 'd ' + (h % 24) + 'h ago';
}

export function escapeHtml(s) {
  const d = document.createElement('div');
  d.textContent = s == null ? '' : s;
  return d.innerHTML;
}

export function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371, dLat = deg2rad(lat2 - lat1), dLon = deg2rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
export function bearingDeg(lat1, lon1, lat2, lon2) {
  const p1 = deg2rad(lat1), p2 = deg2rad(lat2), dl = deg2rad(lon2 - lon1);
  const y = Math.sin(dl) * Math.cos(p2);
  const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
  return (rad2deg(Math.atan2(y, x)) + 360) % 360;
}
export function compassDir(d) {
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return dirs[Math.round(d / 22.5) % 16];
}

export function pathFromLonLat(pts) {
  return pts.map(([lon, lat], i) => {
    const [x, y] = project(lon, lat);
    return (i === 0 ? 'M' : 'L') + x.toFixed(1) + ',' + y.toFixed(1);
  }).join(' ') + ' Z';
}
