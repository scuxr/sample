// Small held objects drawn in world space: a headset, a phone, hand controllers, a microphone.
// Pure: inlined into the page; the build passes the kit's iso. Faces are shaded by the kit's light, as extrude does.

const GR = Math.PI / 180;
function grCam(P) {
  const a = (P.azimuth || 45) * GR, e = (P.elevation || 30) * GR;
  const V = [Math.cos(a) * Math.cos(e), Math.sin(a) * Math.cos(e), Math.sin(e)];
  const l = [-Math.sin(a), Math.cos(a), 1.2];
  const n = Math.hypot(l[0], l[1], l[2]);
  return { V, Lt: [l[0] / n, l[1] / n, l[2] / n] };
}
const grDot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const grF = (v) => (Math.round(v * 10) / 10).toString();

// An oriented box: centre c, unit axes [ax, ay, az], half sizes [hx, hy, hz]. cls tints it; faceSvg(name, corners2d)
// may add markup on a face ("front" is +ay, "top" is +az).
export function boxSvg(c, axes, half, P, isoFn, { cls = "gear", faceSvg = null } = {}) {
  const { V, Lt } = grCam(P);
  const corner = (sx, sy, sz) => [0, 1, 2].map((j) => c[j] + axes[0][j] * half[0] * sx + axes[1][j] * half[1] * sy + axes[2][j] * half[2] * sz);
  const faces = [
    ["right", axes[0], [[1, -1, -1], [1, 1, -1], [1, 1, 1], [1, -1, 1]]],
    ["left", axes[0].map((v) => -v), [[-1, 1, -1], [-1, -1, -1], [-1, -1, 1], [-1, 1, 1]]],
    ["front", axes[1], [[1, 1, -1], [-1, 1, -1], [-1, 1, 1], [1, 1, 1]]],
    ["back", axes[1].map((v) => -v), [[-1, -1, -1], [1, -1, -1], [1, -1, 1], [-1, -1, 1]]],
    ["top", axes[2], [[-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]]],
    ["bottom", axes[2].map((v) => -v), [[-1, 1, -1], [1, 1, -1], [1, -1, -1], [-1, -1, -1]]],
  ];
  const out = [];
  const hull = [];
  for (const [name, n, cs] of faces) {
    if (grDot(n, V) <= 1e-4) continue;
    const pts = cs.map(([a, b, d]) => isoFn(corner(a, b, d), P));
    hull.push(...pts);
    const lit = grDot(n, Lt);
    const shade = name === "top" ? "top" : String(Math.max(0, Math.min(3, Math.floor(((lit + 1) / 2) * 4))));
    const d = "M" + pts.map((p) => grF(p[0]) + " " + grF(p[1])).join("L") + "Z";
    out.push('<path class="' + cls + '-face" data-shade="' + shade + '" d="' + d + '"/>');
    if (faceSvg) out.push(faceSvg(name, pts) || "");
  }
  // Outline: the convex hull of the visible faces.
  const h = grHull(hull);
  out.push('<path class="' + cls + '-edge" d="M' + h.map((p) => grF(p[0]) + " " + grF(p[1])).join("L") + 'Z"/>');
  return out.join("");
}
function grHull(points) {
  const p = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (p.length < 3) return p;
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower = [], upper = [];
  for (const q of p) { while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop(); lower.push(q); }
  for (const q of p.slice().reverse()) { while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop(); upper.push(q); }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}

// The frame a person's head or hands face: heading 0 faces -y (as mannequinSvg), pitch tips the forward axis down.
export function facingAxes(heading, pitch = 0) {
  const h = heading * GR, p = pitch * GR;
  const fw = [Math.sin(h) * Math.cos(p), -Math.cos(h) * Math.cos(p), -Math.sin(p)];
  const rt = [-Math.cos(h), -Math.sin(h), 0];
  const up = [rt[1] * fw[2] - rt[2] * fw[1], rt[2] * fw[0] - rt[0] * fw[2], rt[0] * fw[1] - rt[1] * fw[0]];
  // rt x fw points down for a right-handed set with rt to her right; flip so up is up.
  const s = up[2] < 0 ? -1 : 1;
  return { fw, rt, up: up.map((v) => v * s) };
}
// Body-local point (as model.mjs: r right, f forward, z up) to the world, for a person at place facing heading.
export function toWorld(p, place, heading, lift = 0) {
  const h = heading * GR;
  const fw = [Math.sin(h), -Math.cos(h)], rt = [-Math.cos(h), -Math.sin(h)];
  return [place[0] + p[0] * rt[0] + p[1] * fw[0], place[1] + p[0] * rt[1] + p[1] * fw[1], p[2] + lift];
}
