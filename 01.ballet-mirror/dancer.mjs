// Drawing the dancer. Pure: no imports. The build passes the kit's iso/depthOf; the page uses the kit's globals.
// Needs model.mjs (BONES, BALLS, HEAD_R, mirrorView) in scope when inlined; the build strips this import line.
import { BONES, BALLS, HEAD_R, mirrorView } from "./model.mjs";

const dnF = (v) => (Math.round(v * 10) / 10).toString();
const dnPt = (p) => dnF(p[0]) + " " + dnF(p[1]);

// The kit light (from the left and above) as a screen direction.
const DN_LIGHT = (() => { const l = [-1, -0.62]; const n = Math.hypot(l[0], l[1]); return [l[0] / n, l[1] / n]; })();

function dnCapsule(a, b, s) {
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy);
  if (L < 0.05) return dnCircle(a, s);
  const nx = (-dy / L) * s, ny = (dx / L) * s;
  const r = dnF(s);
  return "M" + dnPt([a[0] + nx, a[1] + ny]) + "L" + dnPt([b[0] + nx, b[1] + ny]) + "A" + r + " " + r + " 0 0 0 " + dnPt([b[0] - nx, b[1] - ny]) +
    "L" + dnPt([a[0] - nx, a[1] - ny]) + "A" + r + " " + r + " 0 0 0 " + dnPt([a[0] + nx, a[1] + ny]) + "Z";
}
function dnCircle(c, s) {
  const r = dnF(s);
  return "M" + dnPt([c[0] - s, c[1]]) + "A" + r + " " + r + " 0 1 0 " + dnPt([c[0] + s, c[1]]) + "A" + r + " " + r + " 0 1 0 " + dnPt([c[0] - s, c[1]]) + "Z";
}
// Offset across a capsule toward the light, as a screen vector of unit length (or less when the light runs along it).
function dnSide(a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
  const ux = dx / L, uy = dy / L;
  const along = DN_LIGHT[0] * ux + DN_LIGHT[1] * uy;
  return [DN_LIGHT[0] - along * ux, DN_LIGHT[1] - along * uy];
}

// A turned-wood mannequin: every limb a capsule, every joint a ball, sorted far to near.
// place: [X, Y] world position of the pelvis on the floor; the dancer faces -y, so her right is -x.
// extras: [{ at: world point, svg }] sorted in with the body parts (a headset, a phone, a microphone).
export function mannequinSvg(J, place, P, isoFn, depthFn, heading = 0, lift = 0, extras = []) {
  // Screen px per world unit: a ball of radius r projects to a circle of radius r * scale.
  const scale = Math.abs(isoFn([0, 0, 1], P)[1] - isoFn([0, 0, 0], P)[1]) / Math.cos(((P.elevation || 30) * Math.PI) / 180);
  // heading 0 faces -y (her right is -x); positive turns her toward +x.
  const h = (heading * Math.PI) / 180;
  const fw = [Math.sin(h), -Math.cos(h)], rt = [-Math.cos(h), -Math.sin(h)];
  const world = (p) => [place[0] + p[0] * rt[0] + p[1] * fw[0], place[1] + p[0] * rt[1] + p[1] * fw[1], p[2] + lift];
  const items = [];
  for (const [from, to, r] of BONES) {
    const A = world(J[from]), B = world(J[to]);
    const a = isoFn(A, P), b = isoFn(B, P), s = r * scale;
    const mid = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2, (A[2] + B[2]) / 2];
    const side = dnSide(a, b);
    const offs = (p, t) => [p[0] + side[0] * s * t, p[1] + side[1] * s * t];
    const body = dnCapsule(a, b, s);
    const shine = dnCapsule(offs(a, 0.42), offs(b, 0.42), s * 0.42);
    const shade = dnCapsule(offs(a, -0.5), offs(b, -0.5), s * 0.42);
    items.push([depthFn(mid, P), '<g class="mq-part"><path class="mq-body" d="' + body + '"/><path class="mq-shade" d="' + shade + '"/><path class="mq-shine" d="' + shine + '"/><path class="mq-edge" d="' + body + '"/></g>']);
  }
  const ball = (C, r, bias) => {
    const c = isoFn(C, P), s = r * scale;
    const sh = [c[0] + DN_LIGHT[0] * s * 0.34, c[1] + DN_LIGHT[1] * s * 0.34];
    const dk = [c[0] - DN_LIGHT[0] * s * 0.42, c[1] - DN_LIGHT[1] * s * 0.42];
    items.push([depthFn(C, P) + bias, '<g class="mq-part"><path class="mq-body" d="' + dnCircle(c, s) + '"/><path class="mq-shade" d="' + dnCircle(dk, s * 0.5) + '"/><path class="mq-shine" d="' + dnCircle(sh, s * 0.5) + '"/><path class="mq-edge" d="' + dnCircle(c, s) + '"/></g>']);
  };
  for (const [name, r] of BALLS) ball(world(J[name]), r, 0.6);
  const head = world(J.head);
  ball(head, HEAD_R, 0.4);
  // A bun at the back of the head: behind it and a little up.
  const neck = world(J.neck);
  const up = [head[0] - neck[0], head[1] - neck[1], head[2] - neck[2]];
  const n = Math.hypot(up[0], up[1], up[2]) || 1;
  ball([head[0] - fw[0] * 7.5 + up[0] / n * 6, head[1] - fw[1] * 7.5 + up[1] / n * 6, head[2] + up[2] / n * 6 - 1], 4.6, 0.8);
  for (const e of extras) items.push([depthFn(e.at, P) + (e.bias || 0), e.svg]);
  items.sort((p, q) => p[0] - q[0]);
  return items.map((item) => item[1]).join("");
}

// The dancer as a video shows her on a panel face, in the face plane's own coordinates (u along world x, v = -z).
// mirror: true shows her right on the viewer's right. cx: the panel centre in world x. floor: the image's floor height.
export function screenFigureSvg(J, { yaw = 0, mirror = true, cx: centre = 0, shift = 0, floor = 0, scale = 1, cls = "vx" }) {
  const cx = centre + shift;
  const a = (yaw * Math.PI) / 180;
  const toward = (p) => p[0] * Math.sin(a) + p[1] * Math.cos(a);
  const at = (p) => {
    const [mx, my] = mirrorView(p, yaw);
    const x = mirror ? mx : -mx;
    return [cx - x * scale, -(floor + my * scale)];
  };
  // A lit rim round the whole silhouette (every rim under every body), and the limbs on the far side a shade darker,
  // so the two legs and arms read apart without drawing lines inside the figure.
  const rim = 1.1 * scale;
  const mid = toward(J.pelvis);
  const rims = [], parts = [];
  for (const [from, to, r] of BONES) {
    const p = at(J[from]), q = at(J[to]);
    const d = "M" + dnPt(p) + "L" + dnPt(q);
    const depthOf2 = (toward(J[from]) + toward(J[to])) / 2;
    const far = depthOf2 < mid - 4 && from !== "pelvis" && from !== "waist" ? ' class="' + cls + '-far"' : "";
    rims.push('<path class="' + cls + '-rim" d="' + d + '" stroke-width="' + dnF(r * 2 * scale + rim) + '"/>');
    parts.push([depthOf2, '<path' + far + ' d="' + d + '" stroke-width="' + dnF(r * 2 * scale - rim * 0.4) + '"/>']);
  }
  const head = at(J.head);
  rims.push('<circle class="' + cls + '-rim" cx="' + dnF(head[0]) + '" cy="' + dnF(head[1]) + '" r="' + dnF(HEAD_R * scale + rim / 2) + '"/>');
  parts.push([toward(J.head), '<circle class="' + cls + '-head" cx="' + dnF(head[0]) + '" cy="' + dnF(head[1]) + '" r="' + dnF(HEAD_R * scale - rim * 0.2) + '"/>']);
  parts.sort((p, q) => p[0] - q[0]);
  // A soft contact shadow under the feet in the video.
  const feet = [at(J.toeR), at(J.toeL), at(J.ankleR), at(J.ankleL)].filter((p) => -p[1] < floor + 14 * scale);
  const xs = feet.length ? feet.map((p) => p[0]) : [cx];
  const sx0 = Math.min(...xs) - 10 * scale, sx1 = Math.max(...xs) + 10 * scale;
  const shadow = '<ellipse class="' + cls + '-floor" cx="' + dnF((sx0 + sx1) / 2) + '" cy="' + dnF(-floor) + '" rx="' + dnF((sx1 - sx0) / 2) + '" ry="' + dnF(3.2 * scale) + '"/>';
  return shadow + '<g class="' + cls + '-limbs">' + rims.join("") + parts.map((p) => p[1]).join("") + "</g>";
}
