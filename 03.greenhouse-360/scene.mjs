// The greenhouse as data: what the build draws in the room and what the page re-draws as the 360° video.
// Pure: no imports; inlined into the page as-is. World cm, x along the house, y across it, z up.

export const GH = { x0: -275, x1: 110, y0: -280, y1: 0, eave: 210, ridge: 292, bay: 55 };
export const GH_DOOR = { y0: -112, y1: -58 }; // in the +x gable
export const BENCHES = [
  { x0: -250, x1: 70, y0: -262, y1: -214, z: 84 },
  { x0: -205, x1: 40, y0: -166, y1: -116, z: 84 },
  { x0: -250, x1: 70, y0: -56, y1: -20, z: 84 },
];
// Plants on the benches: [x, y, foliage radius, kind] (kind 0 leafy, 1 flowering, 2 seedling tray).
export const PLANTS = (() => {
  const out = [];
  BENCHES.forEach((b, i) => {
    const n = Math.floor((b.x1 - b.x0 - 20) / 34);
    for (let j = 0; j <= n; j++) {
      const x = b.x0 + 14 + j * 34 + (i % 2 ? 10 : 0);
      if (x > b.x1 - 10) continue;
      const y = (b.y0 + b.y1) / 2 + (j % 2 ? 7 : -7) * (b.y1 - b.y0 > 40 ? 1 : 0.4);
      out.push([x, y, 9 + ((i * 7 + j * 5) % 3) * 2.5, (i + j) % 3]);
    }
  });
  return out;
})();
// Tall palms in pots on the floor, and baskets hanging from the rafters.
export const PALMS = [[-258, -140, 150], [92, -24, 130], [92, -262, 140]];
export const BASKETS = [[-150, -140, 230], [-60, -140, 236], [20, -140, 230], [-110, -72, 225]];

// The path the camera operator walks, in at the door, down one aisle, back up the other, out again.
export const PATH = [[150, -85], [70, -85], [-228, -88], [-230, -190], [60, -190], [88, -150], [100, -100], [150, -85]];
export const CAM_Z = 232; // the 360 camera on its pole, held above the head
export const WALK_SPEED = 64; // cm/s
export function pathLength() {
  let s = 0;
  for (let i = 1; i < PATH.length; i++) s += Math.hypot(PATH[i][0] - PATH[i - 1][0], PATH[i][1] - PATH[i - 1][1]);
  return s;
}
export function pathAt(s) {
  let left = Math.max(0, s);
  for (let i = 1; i < PATH.length; i++) {
    const [a, b] = [PATH[i - 1], PATH[i]];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (left <= l || i === PATH.length - 1) {
      const u = Math.min(1, left / l);
      return { pos: [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u], heading: (Math.atan2(b[0] - a[0], -(b[1] - a[1])) * 180) / Math.PI };
    }
    left -= l;
  }
}
// When the camera first comes within reach of each plant: that is when the learner first sees it on the video.
export function firstSeen(reach = 150) {
  const total = pathLength();
  return PLANTS.map(([x, y]) => {
    for (let s = 0; s <= total; s += 5) {
      const p = pathAt(s).pos;
      if (Math.hypot(p[0] - x, p[1] - y) < reach) return s / WALK_SPEED;
    }
    return total / WALK_SPEED;
  });
}

// ---------- the 360° video: what the camera sees from c, looking toward yaw (degrees, 0 = -y like a heading) ----------
const GV = Math.PI / 180;
function gvProject(c, yaw, p) {
  const dx = p[0] - c[0], dy = p[1] - c[1], dz = p[2] - c[2];
  const d = Math.hypot(dx, dy) || 0.001;
  // Heading of the point as a person standing at c would turn to face it.
  const head = Math.atan2(dx, -dy) / GV;
  let az = ((head - yaw + 540) % 360) - 180; // + to the viewer's left? no: heading grows turning toward +x
  az = -az; // on screen, a point to the right of where you look sits right
  return { az, el: Math.atan2(dz, d) / GV, d };
}
const gvF = (v) => (Math.round(v * 10) / 10).toString();
// Region in the screen's own coordinates: { x0, x1, y0, y1 } (y down). fov in degrees across.
export function greenhouseView(c, yaw, region, fov, pitch = -30) {
  const K = (region.x1 - region.x0) / fov;
  const cx = (region.x0 + region.x1) / 2, cy = (region.y0 + region.y1) / 2;
  const sx = (az) => cx + az * K, sy = (el) => cy - (el - pitch) * K;
  const lim = fov / 2 + 25;
  const items = [];
  const poly = (pts3, cls, depthBias = 0) => {
    const pr = pts3.map((p) => gvProject(c, yaw, p));
    // Unwrap round the first point so a shape that straddles the back seam stays whole.
    let prev = pr[0].az;
    for (const q of pr) { while (q.az - prev > 180) q.az -= 360; while (q.az - prev < -180) q.az += 360; prev = q.az; }
    if (pr.every((q) => Math.abs(q.az) > lim)) return;
    const d = pr.reduce((s, q) => s + q.d, 0) / pr.length;
    items.push([d - depthBias, '<path class="' + cls + '" d="M' + pr.map((q) => gvF(sx(q.az)) + " " + gvF(sy(q.el))).join("L") + 'Z"/>']);
  };
  const line = (pts3, cls, width) => {
    const pr = pts3.map((p) => gvProject(c, yaw, p));
    let prev = pr[0].az;
    for (const q of pr) { while (q.az - prev > 180) q.az -= 360; while (q.az - prev < -180) q.az += 360; prev = q.az; }
    if (pr.every((q) => Math.abs(q.az) > lim)) return;
    const d = Math.min(...pr.map((q) => q.d));
    const w = Math.max(0.6, Math.min(8, (width / d) * 57 * K));
    items.push([d, '<path class="' + cls + '" stroke-width="' + gvF(w) + '" d="M' + pr.map((q) => gvF(sx(q.az)) + " " + gvF(sy(q.el))).join("L") + '"/>']);
  };
  const blob = (p, r, cls) => {
    const q = gvProject(c, yaw, p);
    if (Math.abs(q.az) > lim) return;
    const R = Math.max(0.8, (Math.atan2(r, q.d) / GV) * K);
    items.push([q.d, '<circle class="' + cls + '" cx="' + gvF(sx(q.az)) + '" cy="' + gvF(sy(q.el)) + '" r="' + gvF(R) + '"/>']);
  };
  const seg = (a, b, n) => Array.from({ length: n + 1 }, (_, i) => [a[0] + (b[0] - a[0]) * (i / n), a[1] + (b[1] - a[1]) * (i / n), a[2] + (b[2] - a[2]) * (i / n)]);
  // Frame: posts on both long walls, rafters up to the ridge, the ridge and eaves.
  for (let x = GH.x0; x <= GH.x1 + 0.1; x += GH.bay) {
    for (const y of [GH.y0, GH.y1]) line([[x, y, 18], [x, y, GH.eave]], "gv-frame", 5);
    const mid = (GH.y0 + GH.y1) / 2;
    line([...seg([x, GH.y0, GH.eave], [x, mid, GH.ridge], 8), ...seg([x, mid, GH.ridge], [x, GH.y1, GH.eave], 8).slice(1)], "gv-frame", 4);
  }
  for (const y of [GH.y0, GH.y1]) line(seg([GH.x0, y, GH.eave], [GH.x1, y, GH.eave], 24), "gv-frame", 5);
  line(seg([GH.x0, (GH.y0 + GH.y1) / 2, GH.ridge], [GH.x1, (GH.y0 + GH.y1) / 2, GH.ridge], 24), "gv-frame", 6);
  for (const y of [GH.y0, GH.y1]) line(seg([GH.x0, y, 90], [GH.x1, y, 90], 24), "gv-rail", 3);
  // Benches: top and the faces turned to the camera.
  for (const b of BENCHES) {
    const top = [...seg([b.x0, b.y0, b.z], [b.x1, b.y0, b.z], 18), ...seg([b.x1, b.y0, b.z], [b.x1, b.y1, b.z], 4), ...seg([b.x1, b.y1, b.z], [b.x0, b.y1, b.z], 18), ...seg([b.x0, b.y1, b.z], [b.x0, b.y0, b.z], 4)];
    const faces = [];
    if (c[1] > b.y1) faces.push([[b.x0, b.y1], [b.x1, b.y1]]);
    if (c[1] < b.y0) faces.push([[b.x1, b.y0], [b.x0, b.y0]]);
    if (c[0] > b.x1) faces.push([[b.x1, b.y1], [b.x1, b.y0]]);
    if (c[0] < b.x0) faces.push([[b.x0, b.y0], [b.x0, b.y1]]);
    for (const [a, e] of faces) poly([...seg([a[0], a[1], b.z], [e[0], e[1], b.z], 18), ...seg([e[0], e[1], 26], [a[0], a[1], 26], 18)], "gv-bench-side", 2);
    poly(top, "gv-bench", 1);
  }
  PLANTS.forEach(([x, y, r, kind]) => {
    const b = BENCHES.find((q) => x >= q.x0 && x <= q.x1 && y >= q.y0 && y <= q.y1) || BENCHES[0];
    blob([x, y, b.z + 6], 6, "gv-pot");
    const leaf = kind === 1 ? "gv-flower" : kind === 2 ? "gv-leaf2" : "gv-leaf";
    blob([x - r * 0.4, y, b.z + 10 + r * 0.6], r * 0.7, leaf);
    blob([x + r * 0.4, y, b.z + 10 + r * 0.6], r * 0.7, leaf);
    blob([x, y, b.z + 12 + r * 1.0], r * 0.75, leaf);
    if (kind === 1) blob([x + r * 0.3, y, b.z + 14 + r * 1.3], r * 0.35, "gv-bloom");
  });
  for (const [x, y, h] of PALMS) {
    line([[x, y, 0], [x, y, h]], "gv-trunk", 7);
    for (let i = 0; i < 6; i++) {
      const a = i * 60 * GV;
      line([[x, y, h], [x + Math.cos(a) * 40, y + Math.sin(a) * 40, h - 22]], "gv-frond", 9);
    }
  }
  for (const [x, y, z] of BASKETS) { line([[x, y, GH.ridge - 20], [x, y, z + 14]], "gv-wire", 1); blob([x, y, z], 14, "gv-leaf"); }
  items.sort((a, b) => b[0] - a[0]);
  // Glass roof light above the horizon, gravel floor below it.
  const bg = '<path class="gv-sky" d="M' + region.x0 + " " + region.y0 + "H" + region.x1 + "V" + gvF(Math.max(region.y0, Math.min(region.y1, sy(0)))) + "H" + region.x0 + 'Z"/><path class="gv-ground" d="M' + region.x0 + " " + gvF(Math.max(region.y0, Math.min(region.y1, sy(0)))) + "H" + region.x1 + "V" + region.y1 + "H" + region.x0 + 'Z"/>';
  return bg + items.map((i) => i[1]).join("");
}
