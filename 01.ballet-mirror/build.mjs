// 현장몰입 모듈 · 투명 LED 발레 거울 — anatomy figure build.
// node build.mjs [--light]
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as M from "./model.mjs";
import * as DN from "./dancer.mjs";

const SKILL = process.env.ANATOMY_SKILL || "C:/Users/user/.claude/skills/anatomy";
const k = await import(pathToFileURL(join(SKILL, "kit/iso-kit.mjs")).href);
const G = await import(pathToFileURL(join(SKILL, "kit/lathe.mjs")).href);
const { kitScript } = await import(pathToFileURL(join(SKILL, "scripts/inline-kit.mjs")).href);

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--light") ? "light" : "dark";

// ---------- world (cm) ----------
const WIDTH = 600;
const HEIGHT = 390;
const STAGE = { x: -150, y: -150, w: 720, d: 375, r: 3 };
const STAGE_H = 40;
const PANEL_W = 150;
const PANELS = [0, 1, 2].map((i) => ({ i, x0: i * PANEL_W, cx: i * PANEL_W + PANEL_W / 2 }));
const WALL_X1 = PANEL_W * 3;
const RAIL = { x: -4, y: -16, w: WALL_X1 + 8, d: 24, r: 2 };
const Z_RAIL = 12;
const Z_TOP = 262;
const HEADER = { x: -4, y: -12, w: WALL_X1 + 8, d: 16, r: 2 };
const SCREEN = { inset: 4, z0: 16, z1: 258 };
const IMG_FLOOR = 19; // where the video's floor sits on the panel (life size: feet near stage level)
const LEARNER = [75, 80]; // pelvis over this floor point, facing the wall (-y)
const BOX_Y = 9;
const BOX_D = 10;
const BOX_FRONT = BOX_Y + BOX_D;
const CAMERA = { at: [-70, -110], z: 135 }; // rear camera behind the transparent wall
const CAM_TARGET = [LEARNER[0], LEARNER[1], 122];
const TABLE = { x: 262, y: 160, w: 76, d: 46, r: 2 };
const TABLE_Z = 70;
const LAPTOP = { x: 280, y: 171, w: 34, d: 23, r: 1.2 };
const BARRE = { x: -66, y0: 64, y1: 204, z: 106.6, r: 2.6, stands: [80, 188] };
const CASE = { x: 512, y: 84, w: 52, d: 40, r: 2 };
const CASE_H = 46;
const PRO_YAW = 18; // the VX clip was filmed a little to the dancer's right

const P = k.fitProjection(
  [...k.boxCorners(STAGE, -STAGE_H, 0), [0, -16, Z_TOP + 10], [WALL_X1, 8, Z_TOP + 10], [CAMERA.at[0], CAMERA.at[1], 150]],
  WIDTH,
  HEIGHT,
  { pad: 22, azimuth: 68 },
);
const KS = G.scaleOf(P);

const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const Dots = (points, style) => k.dotsSvg(points, style);
const depth = (p) => k.depthOf(p, P);
const planeOf = (y) => k.sideMatrix([0, y], 0, P, "left");
const v3 = {
  add: (a, b, s = 1) => [a[0] + b[0] * s, a[1] + b[1] * s, a[2] + b[2] * s],
  sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  unit: (a) => { const n = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / n, a[1] / n, a[2] / n]; },
  cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
};
const f1 = (n) => (Math.round(n * 1000) / 1000).toString();
// A transform that maps local (x, y) to the plane through o spanned by u (x) and v (up = -y), like sideMatrix.
function planeMatrix(o, u, v) {
  const O = at(o), U = at(v3.add(o, u)), V = at(v3.add(o, v, -1));
  return `matrix(${f1(U[0] - O[0])} ${f1(U[1] - O[1])} ${f1(V[0] - O[0])} ${f1(V[1] - O[1])} ${f1(O[0])} ${f1(O[1])})`;
}
const rectPath = (x0, y0, x1, y1, r = 0) => k.pathOf(k.roundedPlan({ x: x0, y: y0, w: x1 - x0, d: y1 - y0, r }, r ? 4 : 1), true);
const byDepth = (points) => [...points].sort((a, b) => depth([a[0], a[1], 0]) - depth([b[0], b[1], 0]));

// ---------- stage (무대단상) ----------
function stage() {
  const out = [`<path class="iso-halo" d="${k.haloOf(STAGE, -STAGE_H, STAGE_H, P)}"/>`];
  const seamsX = [];
  for (let x = STAGE.x + 122; x < STAGE.x + STAGE.w - 20; x += 122) seamsX.push(x);
  const seamY = STAGE.y + 205;
  const front = STAGE.y + STAGE.d;
  const right = STAGE.x + STAGE.w;
  const inner = [
    ...seamsX.map((x) => k.segment([x, front, 0], [x, front, -STAGE_H], P)),
    k.segment([right, seamY, 0], [right, seamY, -STAGE_H], P),
  ].join("");
  // The skirt band and kick line wrap the visible corners.
  const skirt = k.sideSeam(STAGE, -STAGE_H + 6, P, 3);
  out.push(S(k.slabOf(STAGE, -STAGE_H, STAGE_H, P, 3, 1.2), { tone: "lo", inner: L(inner, { tone: "faint" }) + L(skirt, { tone: "faint" }) }));
  // Deck joints run edge to edge across the top.
  out.push(L(seamsX.map((x) => k.lineOnTop([x, STAGE.y], [x, front], 0, P)).join("") + k.lineOnTop([STAGE.x, seamY], [right, seamY], 0, P), { tone: "faint" }));
  // Deck screws: four per deck corner, where the joints cross the edges.
  const screws = [];
  for (const x of [STAGE.x, ...seamsX, right]) for (const y of [STAGE.y, seamY, front]) {
    const sx = Math.min(Math.max(x, STAGE.x + 5), right - 5);
    const sy = Math.min(Math.max(y, STAGE.y + 5), front - 5);
    for (const dx of x === STAGE.x ? [0] : x === right ? [0] : [-5, 5]) for (const dy of y === STAGE.y ? [0] : y === front ? [0] : [-5, 5]) screws.push(at([sx + dx, sy + dy, 0]));
  }
  out.push(Dots(screws, { size: 0.45, tone: "lo" }));
  // Load-rating plate at the front left: 단상 안전하중 확인.
  const plate = { x: STAGE.x + 14, y: front - 16, w: 46, d: 10, r: 1.2 };
  out.push(S(k.slabOf(plate, 0, 0.8, P, 3), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(plate, 1.4), 0.8, P, 3), { tone: "faint" }));
  out.push(L([32, 24, 28].map((w, i) => k.lineOnTop([plate.x + 4, plate.y + 2.6 + i * 2.4], [plate.x + 4 + w, plate.y + 2.6 + i * 2.4], 0.8, P)).join(""), { tone: "lo", free: true }));
  out.push(Dots([at([plate.x + 2.4, plate.y + plate.d / 2, 0.8]), at([plate.x + plate.w - 2.4, plate.y + plate.d / 2, 0.8])], { size: 0.45 }));
  return out.join("");
}

// Spike tape: where the learner stands, in front of panel 1.
function spike() {
  const [x, y] = LEARNER;
  const a = { x: x - 14, y: y + 3, w: 28, d: 2.6, r: 0.3 };
  const b = { x: x - 1.3, y: y + 5.6, w: 2.6, d: 9, r: 0.3 };
  return [b, a].map((plan) => S(k.slabOf(plan, 0, 0.3, P, 1), { tone: "mid", crease: "none" })).join("");
}

// ---------- cables ----------
// Round each corner of a polyline with a short arc, then project.
function rounded(points, radius = 7) {
  const out = [points[0]];
  for (let i = 1; i < points.length - 1; i++) {
    const [a, b, c] = [points[i - 1], points[i], points[i + 1]];
    const ab = v3.sub(b, a), bc = v3.sub(c, b);
    const la = Math.hypot(...ab), lb = Math.hypot(...bc);
    const r = Math.min(radius, la * 0.45, lb * 0.45);
    const p0 = v3.add(b, v3.unit(ab), -r), p1 = v3.add(b, v3.unit(bc), r);
    for (let t = 0; t <= 1.0001; t += 1 / 6) {
      const q = [0, 1, 2].map((j) => (1 - t) * (1 - t) * p0[j] + 2 * (1 - t) * t * b[j] + t * t * p1[j]);
      out.push(q);
    }
  }
  out.push(points[points.length - 1]);
  return out;
}
const CABLES = {
  vx1: { tone: "blue", route: [[284, 171, 73.9], [284, 162.5, 73.3], [284, 159.6, 72], [284, 159.6, 0.6], [284, 35, 0.6], [75, 35, 0.6], [75, BOX_FRONT + 3.5, 0.6], [75, BOX_FRONT + 0.6, 5]] },
  vx2: { tone: "blue", route: [[290, 171, 73.9], [290, 162.5, 73.3], [290, 159.6, 72], [290, 159.6, 0.6], [290, 28, 0.6], [225, 28, 0.6], [225, BOX_FRONT + 3.5, 0.6], [225, BOX_FRONT + 0.6, 5]] },
  cam: { tone: "red", route: null },
};
function camFrame() {
  const o = [CAMERA.at[0], CAMERA.at[1], CAMERA.z];
  const a = v3.unit(v3.sub(CAM_TARGET, o));
  const u = v3.unit(v3.cross([0, 0, 1], a));
  const v = v3.cross(a, u);
  return G.frameOf(o, a, u, v);
}
const CF = camFrame();
const camPoint = (s, u, v) => v3.add(v3.add(v3.add(CF.o, CF.a, s), CF.u, u), CF.v, v);
{
  const back = camPoint(-16.5, 0, -3);
  CABLES.cam.route = [back, v3.add(back, [0, 0, -6]), [back[0] - 3, back[1] + 1, back[2] - 13], [-86, -104, 104], [-86, -104, 0.6], [-86, -40, 0.6], [482, -40, 0.6], [482, 28, 0.6], [375, 28, 0.6], [375, BOX_FRONT + 3.5, 0.6], [375, BOX_FRONT + 0.6, 5]];
}
const cablePath = (route) => k.pathOf(rounded(route).map(at));
function cables(which) {
  return which.map((name) => {
    const { tone, route } = CABLES[name];
    const d = cablePath(route);
    return `<g data-cable="${name}">${L(d, { tone: "mid", className: "cord" })}${L(d, { tone, flow: true, className: "pulse" })}</g>`;
  }).join("");
}
// Gaffer tape holding the cables to the deck.
function tapes() {
  const strips = [
    { x: 279, y: 92, w: 16, d: 4 }, { x: 279, y: 52, w: 16, d: 4 },
    { x: 160, y: 31, w: 4, d: 8 }, { x: 110, y: 31, w: 4, d: 8 }, { x: 250, y: 24, w: 4, d: 8 },
    { x: 478, y: 0, w: 8, d: 4 }, { x: 430, y: 24, w: 4, d: 8 }, { x: -90, y: -70, w: 8, d: 4 },
  ];
  return byDepth(strips.map((s) => [s.x + s.w / 2, s.y + s.d / 2, s])).map(([, , s]) => S(k.slabOf({ ...s, r: 0.4 }, 0, 0.35, P, 1), { tone: "lo", crease: "none" })).join("");
}

// ---------- the transparent LED wall ----------
function wall() {
  const out = [];
  // Ground track the panels stand in.
  out.push(`<path class="iso-halo" d="${k.haloOf(RAIL, 0, 8, P)}"/>`);
  out.push(S(k.slabOf(RAIL, 0, Z_RAIL, P, 3, 0.6), { tone: "mid", inner: L(k.sideSeam(RAIL, 4, P, 3), { tone: "faint" }) }));
  out.push(Dots(PANELS.flatMap(({ x0 }) => [at([x0 + 12, 4, Z_RAIL]), at([x0 + PANEL_W - 12, 4, Z_RAIL])]), { size: 0.45 }));
  // Panels, far to near (all at the same depth plane, left to right is far to near here).
  for (const p of PANELS) out.push(panel(p));
  // Header beam tying the panel tops together, with a clamp over every joint.
  out.push(S(k.slabOf(HEADER, Z_TOP, 6, P, 3, 0.6), { tone: "mid" }));
  for (const x of [0, PANEL_W, PANEL_W * 2, WALL_X1]) {
    out.push(S(k.slabOf({ x: x - 6, y: -13, w: 12, d: 18, r: 1 }, Z_TOP + 6, 3, P, 2, 0.4), { tone: "mid" }));
    out.push(Dots([at([x - 3, 1, Z_TOP + 9]), at([x + 3, 1, Z_TOP + 9])], { size: 0.45 }));
  }
  return out.join("");
}

function panel({ i, x0, cx }) {
  const out = [];
  const frame = { x: x0 + 0.6, y: -7, w: PANEL_W - 1.2, d: 7, r: 0.8 };
  out.push(S(k.slabOf(frame, Z_RAIL, Z_TOP - Z_RAIL, P, 2, 0.4), { tone: "mid" }));
  const u0 = x0 + SCREEN.inset, u1 = x0 + PANEL_W - SCREEN.inset;
  const glass = rectPath(u0, -SCREEN.z1, u1, -SCREEN.z0, 1);
  const strips = [];
  for (let u = u0 + 1.75; u < u1; u += 3.5) strips.push(`M${u.toFixed(2)} ${-SCREEN.z1}V${-SCREEN.z0}`);
  // Cabinet joints every 50 cm, edge to edge across the frame face.
  const seams = [];
  const gaps = [];
  for (let z = Z_RAIL + 50; z < Z_TOP - 10; z += 50) {
    seams.push(`M${x0 + 0.6} ${-z}H${u0}M${u1} ${-z}H${x0 + PANEL_W - 0.6}`);
    gaps.push(`M${u0} ${-z}H${u1}`);
  }
  const floorLine = `M${u0} ${-IMG_FLOOR}H${u1}`;
  out.push(
    `<g transform="${planeOf(0)}">`,
    `<clipPath id="led-${i}"><path d="${glass}"/></clipPath>`,
    `<path class="led-glass" d="${glass}"/>`,
    `<g clip-path="url(#led-${i})">`,
    `<path class="led-studio" d="${rectPath(u0, -SCREEN.z1, u1, -IMG_FLOOR)}"/>`,
    `<path class="led-horizon" d="${floorLine}"/>`,
    `<g class="${i === 2 ? "cam" : "vx"}" data-screen="${i}"></g>`,
    `<path class="led-strips" d="${strips.join("")}"/>`,
    `<path class="led-gap" d="${gaps.join("")}"/>`,
    `</g>`,
    L(seams.join(""), { tone: "faint" }),
    i === 0 ? `<path class="iso-line led-mirror" data-tone="lit" d="${glass}"/>` : L(glass, { tone: "lo" }),
    `</g>`,
  );
  // Receiving-card box on the deck in front of the panel: its input, a status lamp, vents on top.
  const box = { x: cx - 15, y: BOX_Y, w: 30, d: BOX_D, r: 1.4 };
  out.push(S(k.slabOf(box, 0, 12, P, 3, 0.5), { tone: "mid" }));
  out.push(L([-9, -6, -3].map((dx) => k.planOutline({ x: cx + dx - 0.6, y: BOX_Y + 2.4, w: 1.2, d: 5.2, r: 0.6 }, 12, P, 3)).join(""), { tone: "faint" }));
  out.push(Dots([at([cx + 6, BOX_Y + 2.2, 12]), at([cx + 12, BOX_Y + 2.2, 12])], { size: 0.4 }));
  out.push(`<g data-lamp="${i}">${Dots([at([cx + 10, BOX_FRONT, 9])], { size: 0.75, tone: "hi" })}</g>`);
  out.push(L(k.sideRing([cx, BOX_FRONT, 5], 2.4, "y", P), { tone: "lo" }));
  return out.join("");
}

// Front feet of the stands at every panel joint, with levelling pads.
function feet() {
  const out = [];
  for (const x of [0, PANEL_W, PANEL_W * 2, WALL_X1]) {
    out.push(S(k.cylinder(x, 19, 3.2, 0, 1.6, P, 18), { tone: "lo" }));
    out.push(S(k.slabOf({ x: x - 3.5, y: 8, w: 7, d: 14, r: 1 }, 1.6, 4.4, P, 2, 0.4), { tone: "mid" }));
    out.push(Dots([at([x, 19, 6])], { size: 0.45 }));
  }
  return out.join("");
}

// Plugs seated in each box input; the cable ends under them.
function plugs() {
  return PANELS.map(({ cx }) => S(G.disc(0, 4.2, 2, G.frameAlong([cx, BOX_FRONT, 5], [0, 1, 0]), P), { tone: "mid" }) + S(G.disc(4.2, 5.4, 1.2, G.frameAlong([cx, BOX_FRONT, 5], [0, 1, 0]), P), { tone: "lo" })).join("");
}

// ---------- rear camera on its tripod (behind the wall, filming through panel 1) ----------
function rearCamera() {
  const [cx, cy] = CAMERA.at;
  const out = [`<path class="iso-halo" d="${k.haloOf({ x: cx - 34, y: cy - 34, w: 68, d: 68, r: 34 }, 0, 4, P)}"/>`];
  const legs = [100, 220, 340].map((deg) => {
    const a = (deg * Math.PI) / 180;
    const top = [cx + 5.5 * Math.cos(a), cy + 5.5 * Math.sin(a), 93];
    const foot = [cx + 44 * Math.cos(a), cy + 44 * Math.sin(a), 1.6];
    const dir = v3.unit(v3.sub(foot, top));
    const len = Math.hypot(...v3.sub(foot, top));
    const F = G.frameAlong(top, dir);
    const svg = [
      S(G.disc(0, len * 0.55, 1.6, F, P), { tone: "mid" }),
      S(G.disc(len * 0.55 + 2.6, len - 1.6, 1.15, F, P), { tone: "mid" }),
      S(G.disc(len * 0.55, len * 0.55 + 2.6, 2.3, F, P), { tone: "lo" }),
      S(k.cylinder(foot[0], foot[1], 2.4, 0, 1.6, P, 16), { tone: "lo" }),
    ];
    return [depth(v3.add(top, dir, len / 2)), svg.join("")];
  }).sort((p, q) => p[0] - q[0]);
  const hub = depth([cx, cy, 60]);
  for (const [d, svg] of legs) if (d < hub) out.push(svg);
  out.push(S(k.cylinder(cx, cy, 7, 91, 6, P, 28, 0.5), { tone: "mid" }));
  out.push(S(k.cylinder(cx, cy, 2.3, 97, 24, P, 18), { tone: "mid" }));
  out.push(S(k.cylinder(cx, cy, 3.6, 107, 3, P, 18), { tone: "lo" }));
  for (const [d, svg] of legs) if (d >= hub) out.push(svg);
  // Pan head and its handle, reaching back and down.
  out.push(S(k.cylinder(cx, cy, 5, 121, 5, P, 24, 0.4), { tone: "mid" }));
  out.push(S(k.slabOf({ x: cx - 6, y: cy - 6, w: 12, d: 12, r: 1.5 }, 126, 2, P, 2, 0.4), { tone: "lo" }));
  const back = v3.unit([-CF.a[0], -CF.a[1], 0]);
  const handleDir = v3.unit(v3.add(back, [0, 0, -0.55]));
  const HF = G.frameAlong([cx, cy, 123.5], handleDir);
  out.push(S(G.disc(4.6, 30, 1, HF, P), { tone: "mid" }));
  out.push(S(G.disc(30, 40, 1.7, HF, P), { tone: "lo" }));
  out.push(camera());
  return out.join("");
}

function camera() {
  const out = [];
  // Body: a chamfered box along the aim.
  const body = [[-5.5, -5], [-4, -6.5], [4, -6.5], [5.5, -5], [5.5, 5], [4, 6.5], [-4, 6.5], [-5.5, 5]];
  // Eyecup and viewfinder at the back, drawn first (it is the far end).
  const vfF = G.frameOf(camPoint(0, -1.5, 4), CF.a, CF.u, CF.v);
  out.push(S(G.disc(-21, -16, 1.9, vfF, P), { tone: "lo" }));
  out.push(S(G.prismOf(CF, body, -16, 10, P), { tone: "mid" }));
  // Top handle on two posts, with a shotgun mic in a clip at its front.
  const post = [[-1.2, 6.5], [1.2, 6.5], [1.2, 9.5], [-1.2, 9.5]];
  out.push(S(G.prismOf(CF, post, -11, -8, P), { tone: "mid" }));
  out.push(S(G.prismOf(CF, post, 4, 7, P), { tone: "mid" }));
  out.push(S(G.prismOf(CF, [[-1.6, 9.5], [1.6, 9.5], [1.6, 12], [-1.6, 12]], -13, 9, P), { tone: "mid" }));
  const micF = G.frameOf(camPoint(0, 0, 14.4), CF.a, CF.u, CF.v);
  out.push(S(G.prismOf(CF, [[-1, 12], [1, 12], [1, 13.2], [-1, 13.2]], 4.5, 6.5, P), { tone: "lo" }));
  out.push(S(G.disc(-2, 16, 1.25, micF, P), { tone: "lo" }));
  out.push(L(G.circleOf(micF, 16, 0.7, P), { tone: "faint" }));
  // Flip-out monitor on the visible side.
  out.push(S(G.prismOf(CF, [[5.5, -3.5], [6.6, -3.5], [6.6, 4], [5.5, 4]], -9, 2, P), { tone: "lo" }));
  // Lens: mount, focus ring (knurled), zoom ring, hood.
  const lens = [[10, 4.6], [12, 4.6], [12, 5.4], [22, 5.4], [22, 4.9], [25, 4.9], [25, 6.2], [30, 6.9]];
  out.push(S(G.solidOf(lens, CF, P), { tone: "mid" }));
  const ribs = G.ribsOf(CF, 13, 21, 5.4, 40, P, { fade: [0.1, 0.55], seams: true });
  out.push(k.fadedSvg(ribs, { tone: "lo" }));
  out.push(`<path class="cam-glass" d="${G.circleOf(CF, 30, 5.8, P)}"/>`);
  out.push(L(G.circleOf(CF, 30, 4.2, P), { tone: "faint" }));
  // Tally lamp: recording.
  out.push(`<g class="tally">${Dots([at(camPoint(8.5, 2.6, 6.5))], { size: 0.9, tone: "hi" })}</g>`);
  return out.join("");
}

// ---------- the portable barre (발레 바) ----------
function barre() {
  const out = [`<path class="iso-halo" d="${k.haloOf({ x: BARRE.x - 26, y: BARRE.y0, w: 52, d: BARRE.y1 - BARRE.y0, r: 20 }, 0, 4, P)}"/>`];
  for (const y of BARRE.stands) {
    const base = { x: BARRE.x - 26, y: y - 3.5, w: 52, d: 7, r: 2 };
    out.push(S(k.cylinder(base.x + 3, y, 3.4, 0, 1.4, P, 16), { tone: "lo" }));
    out.push(S(k.cylinder(base.x + base.w - 3, y, 3.4, 0, 1.4, P, 16), { tone: "lo" }));
    out.push(S(k.slabOf(base, 1.4, 3.6, P, 3, 0.4), { tone: "mid" }));
    out.push(S(k.cylinder(BARRE.x, y, 4.6, 5, 3, P, 24, 0.4), { tone: "mid" }));
    out.push(S(k.cylinder(BARRE.x, y, 2.4, 8, 60, P, 20), { tone: "mid" }));
    // Height-adjust collar with a thumb screw toward the viewer.
    out.push(S(k.cylinder(BARRE.x, y, 3.4, 66, 5, P, 20, 0.3), { tone: "lo" }));
    out.push(S(k.cylinder(BARRE.x, y, 1.9, 71, 29, P, 16), { tone: "mid" }));
    const tv = k.towardViewer(P);
    const TF = G.frameAlong([BARRE.x + tv[0] * 3.4, y + tv[1] * 3.4, 68.5], [tv[0], tv[1], 0]);
    out.push(S(G.disc(0, 2, 0.8, TF, P), { tone: "lo" }));
    out.push(S(G.disc(2, 4.2, 2, TF, P), { tone: "mid" }));
    // Saddle the rail rests in.
    out.push(S(k.slabOf({ x: BARRE.x - 4, y: y - 3, w: 8, d: 6, r: 1 }, 100, 3.4, P, 2, 0.3), { tone: "mid" }));
  }
  const RF = G.frameAlong([BARRE.x, BARRE.y0, BARRE.z], [0, 1, 0]);
  const len = BARRE.y1 - BARRE.y0;
  out.push(S(G.solidOf([[0, 2.2, 1], [0.8, 2.8, 1], [3, 3, 1], [3, BARRE.r], [len - 3, BARRE.r], [len - 3, 3, 1], [len - 0.8, 2.8, 1], [len, 2.2, 1]], RF, P), { tone: "hi" }));
  return out.join("");
}

// ---------- instructor's table with the laptop (VX video play) ----------
const LID_TILT = 14; // degrees back from vertical
const LID = { w: LAPTOP.w, h: 22 };
const lidUp = [0, -Math.sin((LID_TILT * Math.PI) / 180), Math.cos((LID_TILT * Math.PI) / 180)];
const lidO = [LAPTOP.x, LAPTOP.y + 0.6, TABLE_Z + 3 + 1.7];
const LID_M = planeMatrix(v3.add(lidO, v3.cross([1, 0, 0], lidUp), -0.01), [1, 0, 0], lidUp);
function table() {
  const out = [`<path class="iso-halo" d="${k.haloOf(TABLE, 0, 6, P)}"/>`];
  const legs = byDepth(k.corners(TABLE, 4));
  for (const [x, y] of legs) {
    out.push(S(k.cylinder(x, y, 2.2, 0, 1.4, P, 14), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 1.5, 1.4, TABLE_Z - 1.4, P, 14), { tone: "mid" }));
  }
  // Lower shelf between the legs.
  out.push(S(k.slabOf(k.insetPlan(TABLE, 3), 20, 1.4, P, 2, 0.3), { tone: "lo" }));
  out.push(S(k.slabOf(TABLE, TABLE_Z, 3, P, 3, 0.8), { tone: "mid" }));
  out.push(laptop());
  return out.join("");
}
function laptop() {
  const out = [];
  const z = TABLE_Z + 3;
  out.push(S(k.slabOf(LAPTOP, z, 1.7, P, 3, 0.4), { tone: "mid" }));
  // Keys: five rows of tiny caps, and the trackpad.
  const keys = [];
  for (let r = 0; r < 5; r++) for (let c = 0; c < 13; c++) keys.push(k.planOutline({ x: LAPTOP.x + 2.6 + c * 2.25, y: LAPTOP.y + 2.2 + r * 2.2, w: 1.8, d: 1.7, r: 0.3 }, z + 1.7, P, 1));
  out.push(L(keys.join(""), { tone: "faint" }));
  out.push(L(k.planOutline({ x: LAPTOP.x + 11, y: LAPTOP.y + 14.2, w: 12, d: 7, r: 0.8 }, z + 1.7, P, 2), { tone: "lo" }));
  // Lid: a thin plate leaning back from the hinge, screen toward the instructor.
  const n = v3.cross(lidUp, [1, 0, 0]);
  const LF = G.frameOf(lidO, n, [1, 0, 0], lidUp);
  out.push(S(G.prismOf(LF, [[0, 0], [LID.w, 0], [LID.w, LID.h], [0, LID.h]], -0.9, 0, P), { tone: "mid" }));
  out.push(S(k.slabOf({ x: LAPTOP.x + 6, y: LAPTOP.y - 0.2, w: LAPTOP.w - 12, d: 1.6, r: 0.6 }, z + 1.2, 1.6, P, 2), { tone: "lo" }));
  // Screen in the lid plane: the VX clip, its four segments and the playhead.
  const sx0 = 1.4, sx1 = LID.w - 1.4, sy0 = -LID.h + 1.4, sy1 = -1.4;
  const blocks = M.SEGMENTS.map((_, i) => {
    const w = (sx1 - sx0 - 3 - 1.2 * 3) / 4;
    const x = sx0 + 1.5 + i * (w + 1.2);
    return `<path class="ui-seg" data-seg="${i}" d="${rectPath(x, -4.6, x + w, -2.8, 0.3)}"/>`;
  }).join("");
  out.push(
    `<g transform="${LID_M}">`,
    `<clipPath id="lid-clip"><path d="${rectPath(sx0, sy0, sx1, sy1, 0.5)}"/></clipPath>`,
    `<path class="led-glass" d="${rectPath(sx0, sy0, sx1, sy1, 0.5)}"/>`,
    `<g clip-path="url(#lid-clip)">`,
    `<path class="led-studio" d="${rectPath(sx0, sy0, sx1, -6.6)}"/>`,
    `<g class="vx" data-screen="laptop"></g>`,
    blocks,
    `<path class="ui-head" data-part="playhead" d="M${sx0 + 1.5} -5.4V-2"/>`,
    `</g>`,
    `<path class="iso-line" data-tone="lo" d="${rectPath(sx0, sy0, sx1, sy1, 0.5)}"/>`,
    `</g>`,
  );
  return out.join("");
}

// ---------- front PTZ camera on its flight case (전체 촬영) ----------
function ptz() {
  const out = [`<path class="iso-halo" d="${k.haloOf(CASE, 0, 8, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(CASE, 5))) out.push(S(k.cylinder(x, y, 2.6, 0, 1.6, P, 14), { tone: "lo" }));
  const lid = CASE_H - 12;
  out.push(S(k.slabOf(CASE, 1.6, CASE_H - 1.6, P, 3, 0.8), { tone: "mid", inner: L(k.sideSeam(CASE, lid, P, 3), { tone: "lo" }) + L(k.sideSeam(CASE, 6, P, 3), { tone: "faint" }) }));
  // Ball corners on the lid, latches across the seam, a handle on the side.
  for (const [x, y] of byDepth(k.corners(CASE, 3.2))) out.push(S(k.slabOf({ x: x - 3.2, y: y - 3.2, w: 6.4, d: 6.4, r: 2 }, CASE_H - 3, 3.2, P, 3), { tone: "lo" }));
  const front = CASE.y + CASE.d, right = CASE.x + CASE.w;
  for (const x of [CASE.x + 12, CASE.x + CASE.w - 12]) out.push(S(k.slabOf({ x: x - 3, y: front, w: 6, d: 1, r: 0.4 }, lid - 4, 8, P, 1, 0.3), { tone: "lo" }));
  out.push(S(k.slabOf({ x: right, y: CASE.y + 12, w: 1.2, d: 16, r: 0.5 }, lid - 12, 4, P, 2), { tone: "lo" }));
  out.push(S(k.slabOf({ x: right + 1.2, y: CASE.y + 13.5, w: 1.6, d: 13, r: 0.6 }, lid - 11.2, 2.4, P, 2), { tone: "mid" }));
  // The PTZ: base, turning yoke, head aimed at the whole wall.
  const [px, py] = [CASE.x + CASE.w / 2, CASE.y + CASE.d / 2];
  const z = CASE_H;
  out.push(S(k.slabOf({ x: px - 11, y: py - 11, w: 22, d: 22, r: 3 }, z, 6, P, 4, 0.6), { tone: "mid" }));
  out.push(S(k.cylinder(px, py, 9, z + 6, 3, P, 32, 0.4), { tone: "lo" }));
  const aim = v3.unit(v3.sub([WALL_X1 / 3, 0, 125], [px, py, z + 22]));
  const yawU = v3.unit(v3.cross([0, 0, 1], aim));
  const flat = v3.unit([aim[0], aim[1], 0]);
  const HF = G.frameOf([px, py, z + 22], aim, yawU, v3.cross(aim, yawU));
  const YF = G.frameOf([px, py, z + 9], [0, 0, 1], yawU, v3.cross([0, 0, 1], yawU));
  const arm = (side) => G.prismOf(YF, [[side * 9.6, -4], [side * 7.6, -4], [side * 7.6, 4], [side * 9.6, 4]], 0, 18, P);
  const armNear = depth(v3.add([px, py, z], yawU, 8.6)) > depth(v3.add([px, py, z], yawU, -8.6)) ? 1 : -1;
  out.push(S(k.cylinder(px, py, 7.5, z + 9, 2.5, P, 28), { tone: "mid" }));
  out.push(S(arm(-armNear), { tone: "mid" }));
  const headBox = [[-6.8, -4.6], [-5.4, -6], [5.4, -6], [6.8, -4.6], [6.8, 4.6], [5.4, 6], [-5.4, 6], [-6.8, 4.6]];
  out.push(S(G.prismOf(HF, headBox, -10, 7, P), { tone: "mid" }));
  out.push(S(G.solidOf([[7, 5.2], [9.5, 5.2], [9.5, 4.4], [11, 4.4]], HF, P), { tone: "lo" }));
  out.push(`<path class="cam-glass" d="${G.circleOf(HF, 11, 3.6, P)}"/>`);
  out.push(S(G.disc(-1.5, 1.5, 7.6, G.frameOf([px, py, z + 22], yawU, aim, v3.cross(yawU, aim)), P), { tone: "lo" }));
  out.push(S(arm(armNear), { tone: "mid" }));
  out.push(`<g class="tally">${Dots([at(v3.add(v3.add([px, py, z + 22], aim, -2), [0, 0, 1], 7.3))], { size: 0.9, tone: "hi" })}</g>`);
  void flat;
  return out.join("");
}

// ---------- the learner (live) ----------
const START_SEG = 2;
const START_T = 3.2;
const proFlat = M.poseAt(START_SEG, START_T);
const J0 = M.skeleton(proFlat);
function learner() {
  const [x, y] = LEARNER;
  return `<path class="iso-halo" d="${k.haloOf({ x: x - 22, y: y - 20, w: 44, d: 40, r: 20 }, 0, 3, P)}"/><g data-part="learner">${DN.mannequinSvg(J0, LEARNER, P, k.iso, k.depthOf)}</g>`;
}

// ---------- assemble ----------
const free = [
  [depth([BARRE.x, (BARRE.y0 + BARRE.y1) / 2, 0]), barre()],
  [depth([LEARNER[0], LEARNER[1], 0]), learner()],
  [depth([TABLE.x + TABLE.w / 2, TABLE.y + TABLE.d / 2, 0]), `<g data-part="laptop-hit">${table()}</g>`],
  [depth([CASE.x + CASE.w / 2, CASE.y + CASE.d / 2, 0]), ptz()],
].sort((a, b) => a[0] - b[0]).map((x) => x[1]);

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "현장몰입 모듈 스튜디오: 단상 위에 3분할 투명 LED 벽이 서 있다. 1번 패널은 전문 발레리나의 VX 영상을 좌우 반전해 실제 크기로, 2번 패널은 같은 영상의 원본을, 3번 패널은 벽 뒤 카메라가 투명 LED를 통해 찍은 실습자의 모습을 반전해 보여 준다. 실습자는 1번 패널 앞에 서서 발레리나를 거울처럼 따라 한다. 교수자의 노트북이 VX 영상을 재생하고, 앞쪽 PTZ 카메라가 전체를 촬영한다.",
  body: [stage(), spike(), cables(["cam", "vx1", "vx2"]), tapes(), rearCamera(), wall(), feet(), plugs(), ...free],
});

const SEG_NAMES = M.SEGMENTS.map((s) => s.name);
const camYaw = (() => {
  // The rear camera's heading round the learner, in her own frame (r = -x, f = -y).
  const dx = CAMERA.at[0] - LEARNER[0], dy = CAMERA.at[1] - LEARNER[1];
  return (Math.atan2(-dx, -dy) * 180) / Math.PI;
})();

const strip = (file) => readFileSync(join(HERE, file), "utf8").replace(/^import .*$/gm, "").replace(/^export /gm, "");
const live = `
${strip("model.mjs")}
${strip("dancer.mjs")}
const P = ${JSON.stringify(P)};
const LEARNER = ${JSON.stringify(LEARNER)};
const PANEL_CX = ${JSON.stringify(PANELS.map((p) => p.cx))};
const IMG_FLOOR = ${IMG_FLOOR}, PRO_YAW = ${PRO_YAW}, CAM_YAW = ${camYaw.toFixed(2)};
const SEG_NAMES = ${JSON.stringify(SEG_NAMES)};
const START = { seg: ${START_SEG}, t: ${START_T} };
const PLAY = { x0: ${1.4 + 1.5}, x1: ${LID.w - 1.4 - 1.5} };
${readFileSync(join(HERE, "live.js"), "utf8")}
`;

const css = `<style>
.iso{--led-glass:#07090d;--led-studio:#10141c;--led-line:#1c2230;--vx:#6f9dff;--vx-edge:#a9c4ff;--vx-far:#4f7ee0;--cam:#ff9a5c;--cam-edge:#ffc39e;--cam-far:#e07a3c;--ui-seg:#253047}
.iso[data-theme="light"]{--led-glass:#1b1f27;--led-studio:#232937;--led-line:#2e3545;--vx:#6f9dff;--vx-edge:#a9c4ff;--vx-far:#4f7ee0;--cam:#ff9a5c;--cam-edge:#ffc39e;--cam-far:#e07a3c;--ui-seg:#38445e}
.led-glass{fill:var(--led-glass)}
.iso-svg .vx-limbs path,.iso-svg .cam-limbs path,.iso-svg .vx-limbs circle,.iso-svg .cam-limbs circle,.iso-svg .led-strips,.iso-svg .led-gap,.iso-svg .led-horizon,.iso-svg .ui-head{vector-effect:none}
.led-studio{fill:var(--led-studio)}
.led-horizon{fill:none;stroke:var(--led-line);stroke-width:.8}
.led-strips{fill:none;stroke:#000;stroke-opacity:.28;stroke-width:1.3}
.led-mirror{stroke-width:1.1px}
.led-gap{fill:none;stroke:#000;stroke-opacity:.55;stroke-width:.9}
.vx-rim,.cam-rim{stroke-linecap:round}
path.vx-rim{stroke:var(--vx-edge)}
path.cam-rim{stroke:var(--cam-edge)}
circle.vx-rim{fill:var(--vx-edge)}
circle.cam-rim{fill:var(--cam-edge)}
.iso-plate-corner{font-family:"Pretendard","Malgun Gothic","Apple SD Gothic Neo",ui-sans-serif,system-ui,sans-serif;font-size:11.5px;letter-spacing:0}
path.vx-far{stroke:var(--vx-far)}
path.cam-far{stroke:var(--cam-far)}
.vx-limbs,.cam-limbs{fill:none;stroke-linecap:round;stroke-linejoin:round}
.vx-limbs{stroke:var(--vx)}
.cam-limbs{stroke:var(--cam)}
.vx-head{fill:var(--vx);stroke:none}
.cam-head{fill:var(--cam);stroke:none}
.vx-floor,.cam-floor{fill:#000;opacity:.45}
.vx-limbs path{filter:none}
.ui-seg{fill:var(--ui-seg)}
.ui-seg[data-on]{fill:var(--vx)}
.ui-head{fill:none;stroke:#fff;stroke-width:.35}
.cam-glass{fill:var(--anatomy-shade-0)}
.cord{stroke-width:1.5px}
.pulse{stroke-width:1px}
.tally .iso-dots circle{fill:var(--anatomy-red)}
[data-lamp] .iso-dots circle{fill:var(--anatomy-green)}
.mq-body{fill:var(--anatomy-shade-2)}
.mq-shade{fill:var(--anatomy-shade-0);opacity:.9}
.mq-shine{fill:var(--anatomy-lit-top)}
.mq-edge{fill:none;stroke:var(--anatomy-hi);stroke-width:var(--anatomy-weight);vector-effect:non-scaling-stroke;stroke-linejoin:round}
.lm-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
.iso-stage{touch-action:pan-y}
.iso-stage:focus{outline:none}
.iso-stage:focus-visible{outline:1px solid var(--anatomy-muted);outline-offset:6px}
[data-part="laptop-hit"]{cursor:pointer}
</style>`;

const body =
  css +
  k.plateHtml({
    fig: "Fig 1",
    title: "현장몰입 모듈 · 투명 LED 발레 거울",
    hint: "1–4 키 또는 노트북 클릭 · 시범 구간 선택",
    readout: "",
    keys: [
      { mark: "lit", label: "1번 패널: 전문 발레리나 VX 영상, 좌우 반전 · 실제 크기 (실습자의 거울)" },
      { mark: "blue", label: "VX 영상 출력: 교수자 노트북 → 1번(반전) · 2번(원본) 패널" },
      { mark: "red", label: "카메라 출력: 투명 LED 후방 카메라 → 3번 패널 (실습자, 반전)" },
      { mark: "raised", label: "실습자: 1번 패널 앞 표시 위치에서 동작을 따라 함" },
    ],
    caption:
      "단상 위에 투명 LED 벽(150 cm 패널 3장)이 서 있다. 교수자가 노트북에서 시범 구간을 고르면 같은 VX 영상이 2번 패널에는 원본으로, 1번 패널에는 좌우 반전된 실제 크기로 송출된다. 그래서 1번 패널 앞에 선 실습자는 발레리나가 비친 거울 앞에 선 셈이 된다. 투명 LED는 뒤에서 보면 비쳐 보이므로, 벽 뒤 카메라가 패널을 통해 실습자의 정면을 찍고 그 영상을 반전해 3번 패널에 띄운다. 실습자는 1번 패널의 시범과 3번 패널의 자기 동작을 나란히 비교한다. 앞쪽 PTZ 카메라는 전체 장면을 촬영한다. 레이아웃은 3분할이며 필요에 따라 바꿀 수 있다.",
    body: `<div class="iso-stage" tabindex="0" role="group" aria-label="현장몰입 모듈. 1부터 4까지 눌러 시범 구간을 고릅니다.">${svg}<span class="lm-sr" role="status" aria-live="polite" data-status></span></div>`,
  });

const name = theme === "light" ? "ballet-mirror-light.html" : "ballet-mirror.html";
writeFileSync(join(HERE, name), k.pageHtml({ title: "현장몰입 모듈 · 투명 LED 발레 거울", theme, body, script: kitScript() + live, width: 760 }));
console.log("wrote", name, "scale", KS.toFixed(3), "camYaw", camYaw.toFixed(1));
