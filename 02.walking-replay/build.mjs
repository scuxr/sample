// 공간확장 모듈 · 모델 워킹 리플레이 — anatomy figure build.
// node build.mjs [--light]
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as M from "../01.ballet-mirror/model.mjs";
import * as DN from "../01.ballet-mirror/dancer.mjs";
import * as W from "./walk.mjs";
import * as PU from "./padui.mjs";

const SKILL = process.env.ANATOMY_SKILL || "C:/Users/user/.claude/skills/anatomy";
const k = await import(pathToFileURL(join(SKILL, "kit/iso-kit.mjs")).href);
const G = await import(pathToFileURL(join(SKILL, "kit/lathe.mjs")).href);
const { kitScript } = await import(pathToFileURL(join(SKILL, "scripts/inline-kit.mjs")).href);

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--light") ? "light" : "dark";

// ---------- world (cm) ----------
const WIDTH = 600;
const HEIGHT = 400;
const STAGE = { x: -130, y: -150, w: 700, d: 450, r: 3 };
const STAGE_H = 40;
const PANEL_W = 225;
const PANELS = [0, 1].map((i) => ({ i, x0: i * PANEL_W, cx: i * PANEL_W + PANEL_W / 2 }));
const WALL_X1 = PANEL_W * 2;
const RAIL = { x: -4, y: -16, w: WALL_X1 + 8, d: 24, r: 2 };
const Z_RAIL = 12;
const Z_TOP = 262;
const HEADER = { x: -4, y: -12, w: WALL_X1 + 8, d: 16, r: 2 };
const SCREEN = { inset: 4, z0: 16, z1: 258 };
const IMG_FLOOR = 19;
const BOX_Y = 9;
const BOX_D = 10;
const BOX_FRONT = BOX_Y + BOX_D;
const RUNWAY = { x: 180, y: 46, w: 90, d: 196, r: 2 };
const RUNWAY_H = W.RUN.z;
const CAMS = {
  front: { at: [225, 278], z: 132, target: [225, 120, 112] },
  side: null, // the PTZ on its case, below
  rear: { at: [-72, -104], z: 136, target: [225, 140, 110] },
};
const CASE = { x: 470, y: 108, w: 52, d: 40, r: 2 };
const CASE_H = 46;
const PTZ_AT = [CASE.x + CASE.w / 2, CASE.y + CASE.d / 2];
const RECORDER = { x: 330, y: 170, w: 46, d: 34, r: 2 };
const RECORDER_H = 36;
const STAND_SPOT = { at: [38, 170], heading: 44 };
const TEACHER = { at: [-16, 206], heading: 74 };
const PORTS = { front: 340, rear: 350, side: 360 };
const INSET = { x: 12, y: 104, scale: 4.3 };

const P = k.fitProjection(
  [...k.boxCorners(STAGE, -STAGE_H, 0), [0, -16, Z_TOP + 10], [WALL_X1, 8, Z_TOP + 10]],
  WIDTH,
  HEIGHT,
  { pad: 20, azimuth: 66 },
);

const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const Dots = (points, style) => k.dotsSvg(points, style);
const depth = (p) => k.depthOf(p, P);
const planeOf = (y) => k.sideMatrix([0, y], 0, P, "left");
const v3 = {
  add: (a, b, s = 1) => [a[0] + b[0] * s, a[1] + b[1] * s, a[2] + b[2] * s],
  sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  mul: (a, s) => [a[0] * s, a[1] * s, a[2] * s],
  unit: (a) => { const n = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / n, a[1] / n, a[2] / n]; },
  cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
};
const f1 = (n) => (Math.round(n * 1000) / 1000).toString();
function planeMatrix(o, u, v) {
  const O = at(o), U = at(v3.add(o, u)), V = at(v3.add(o, v, -1));
  return `matrix(${f1(U[0] - O[0])} ${f1(U[1] - O[1])} ${f1(V[0] - O[0])} ${f1(V[1] - O[1])} ${f1(O[0])} ${f1(O[1])})`;
}
const rectPath = (x0, y0, x1, y1, r = 0) => k.pathOf(k.roundedPlan({ x: x0, y: y0, w: x1 - x0, d: y1 - y0, r }, r ? 4 : 1), true);
const byDepth = (points) => [...points].sort((a, b) => depth([a[0], a[1], 0]) - depth([b[0], b[1], 0]));

// ---------- stage ----------
function stage() {
  const out = [`<path class="iso-halo" d="${k.haloOf(STAGE, -STAGE_H, STAGE_H, P)}"/>`];
  const seamsX = [];
  for (let x = STAGE.x + 122; x < STAGE.x + STAGE.w - 20; x += 122) seamsX.push(x);
  const front = STAGE.y + STAGE.d;
  const right = STAGE.x + STAGE.w;
  const seamYs = [STAGE.y + 150, STAGE.y + 300];
  const inner = [...seamsX.map((x) => k.segment([x, front, 0], [x, front, -STAGE_H], P)), ...seamYs.map((y) => k.segment([right, y, 0], [right, y, -STAGE_H], P))].join("");
  out.push(S(k.slabOf(STAGE, -STAGE_H, STAGE_H, P, 3, 1.2), { tone: "lo", inner: L(inner, { tone: "faint" }) + L(k.sideSeam(STAGE, -STAGE_H + 6, P, 3), { tone: "faint" }) }));
  out.push(L(seamsX.map((x) => k.lineOnTop([x, STAGE.y], [x, front], 0, P)).join("") + seamYs.map((y) => k.lineOnTop([STAGE.x, y], [right, y], 0, P)).join(""), { tone: "faint" }));
  const screws = [];
  for (const x of [STAGE.x, ...seamsX, right]) for (const y of [STAGE.y, ...seamYs, front]) {
    const sx = Math.min(Math.max(x, STAGE.x + 5), right - 5);
    const sy = Math.min(Math.max(y, STAGE.y + 5), front - 5);
    for (const dx of x === STAGE.x || x === right ? [0] : [-5, 5]) for (const dy of y === STAGE.y || y === front ? [0] : [-5, 5]) screws.push(at([sx + dx, sy + dy, 0]));
  }
  out.push(Dots(screws, { size: 0.45, tone: "lo" }));
  const plate = { x: STAGE.x + 14, y: front - 16, w: 46, d: 10, r: 1.2 };
  out.push(S(k.slabOf(plate, 0, 0.8, P, 3), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(plate, 1.4), 0.8, P, 3), { tone: "faint" }));
  out.push(L([32, 24, 28].map((w, i) => k.lineOnTop([plate.x + 4, plate.y + 2.6 + i * 2.4], [plate.x + 4 + w, plate.y + 2.6 + i * 2.4], 0.8, P)).join(""), { tone: "lo", free: true }));
  // Where the model waits beside the instructor: a small spike cross.
  const [sx, sy] = STAND_SPOT.at;
  out.push(S(k.slabOf({ x: sx - 9, y: sy + 5, w: 18, d: 2.4, r: 0.3 }, 0, 0.3, P, 1), { tone: "mid", crease: "none" }));
  return out.join("");
}

// ---------- the short runway ----------
function runway() {
  const R = RUNWAY;
  const out = [`<path class="iso-halo" d="${k.haloOf(R, 0, 6, P)}"/>`];
  out.push(S(k.slabOf(R, 0, RUNWAY_H, P, 3, 0.8), { tone: "mid", inner: L(k.sideSeam(R, 3, P, 3), { tone: "faint" }) }));
  out.push(L([R.y + 65, R.y + 130].map((y) => k.lineOnTop([R.x, y], [R.x + R.w, y], RUNWAY_H, P)).join(""), { tone: "faint" }));
  out.push(L(k.planOutline(k.insetPlan(R, 4), RUNWAY_H, P, 3), { tone: "lo" }));
  const cx = R.x + R.w / 2;
  // Start mark by the wall, turn mark at the front end.
  out.push(S(k.slabOf({ x: cx - 10, y: W.RUN.y0 - 6, w: 20, d: 2.6, r: 0.3 }, RUNWAY_H, 0.3, P, 1), { tone: "mid", crease: "none" }));
  out.push(S(k.slabOf({ x: cx - 15, y: W.RUN.y1 + 8, w: 30, d: 2.6, r: 0.3 }, RUNWAY_H, 0.3, P, 1), { tone: "mid", crease: "none" }));
  out.push(S(k.slabOf({ x: cx - 1.3, y: W.RUN.y1 - 4, w: 2.6, d: 12, r: 0.3 }, RUNWAY_H, 0.3, P, 1), { tone: "mid", crease: "none" }));
  // A low step on the near side, where the model gets on and off.
  const step = { x: R.x - 16, y: 70, w: 16, d: 34, r: 1.5 };
  out.push(S(k.slabOf(step, 0, RUNWAY_H / 2, P, 2, 0.5), { tone: "mid" }));
  return out.join("");
}

// ---------- cables ----------
function rounded(points, radius = 7) {
  const out = [points[0]];
  for (let i = 1; i < points.length - 1; i++) {
    const [a, b, c] = [points[i - 1], points[i], points[i + 1]];
    const ab = v3.sub(b, a), bc = v3.sub(c, b);
    const r = Math.min(radius, Math.hypot(...ab) * 0.45, Math.hypot(...bc) * 0.45);
    const p0 = v3.add(b, v3.unit(ab), -r), p1 = v3.add(b, v3.unit(bc), r);
    for (let t = 0; t <= 1.0001; t += 1 / 6) out.push([0, 1, 2].map((j) => (1 - t) * (1 - t) * p0[j] + 2 * (1 - t) * t * b[j] + t * t * p1[j]));
  }
  out.push(points[points.length - 1]);
  return out;
}
const RX = RECORDER.x + RECORDER.w;
const RF = RECORDER.y + RECORDER.d;
const port = (x) => [[x, RF + 3.5, 0.6], [x, RF + 0.6, 8]];
const CABLES = {
  outL: { tone: "blue", route: [[RX + 0.3, 178, 10], [RX + 6, 178, 8], [RX + 6, 178, 0.6], [RX + 6, 35, 0.6], [PANELS[0].cx, 35, 0.6], [PANELS[0].cx, BOX_FRONT + 3.5, 0.6], [PANELS[0].cx, BOX_FRONT + 0.6, 5]] },
  outR: { tone: "blue", route: [[RX + 0.3, 186, 10], [RX + 12, 186, 8], [RX + 12, 186, 0.6], [RX + 12, 28, 0.6], [PANELS[1].cx, 28, 0.6], [PANELS[1].cx, BOX_FRONT + 3.5, 0.6], [PANELS[1].cx, BOX_FRONT + 0.6, 5]] },
  front: { tone: "red", route: [[236, CAMS.front.at[1] + 2, 98], [236, CAMS.front.at[1] + 2, 0.6], [PORTS.front, CAMS.front.at[1] + 2, 0.6], ...port(PORTS.front)] },
  side: { tone: "red", route: [[CASE.x + 6, CASE.y + CASE.d + 0.3, 4], [CASE.x + 6, CASE.y + CASE.d + 6, 0.6], [CASE.x + 6, 224, 0.6], [PORTS.side, 224, 0.6], ...port(PORTS.side)] },
  rear: { tone: "red", route: [[-84, -98, 104], [-84, -98, 0.6], [-84, -40, 0.6], [544, -40, 0.6], [544, 238, 0.6], [PORTS.rear, 238, 0.6], ...port(PORTS.rear)] },
};
function cables() {
  return Object.entries(CABLES).map(([name, { tone, route }]) => {
    const d = k.pathOf(rounded(route).map(at));
    return `<g data-cable="${name}">${L(d, { tone: "mid", className: "cord" })}${L(d, { tone, flow: true, className: "pulse" })}</g>`;
  }).join("");
}
function tapes() {
  const strips = [
    { x: RX + 2, y: 110, w: 14, d: 4 }, { x: 290, y: 31, w: 4, d: 8 }, { x: 140, y: 24, w: 4, d: 14 }, { x: 60, y: 31, w: 4, d: 8 },
    { x: 290, y: CAMS.front.at[1] - 2, w: 4, d: 8 }, { x: 410, y: 220, w: 4, d: 8 }, { x: 540, y: 60, w: 8, d: 4 }, { x: 440, y: 234, w: 4, d: 8 }, { x: -88, y: -70, w: 8, d: 4 },
  ];
  return byDepth(strips.map((s) => [s.x + s.w / 2, s.y + s.d / 2, s])).map(([, , s]) => S(k.slabOf({ ...s, r: 0.4 }, 0, 0.35, P, 1), { tone: "lo", crease: "none" })).join("");
}

// ---------- the transparent LED wall, split in two ----------
function wall() {
  const out = [`<path class="iso-halo" d="${k.haloOf(RAIL, 0, 8, P)}"/>`];
  out.push(S(k.slabOf(RAIL, 0, Z_RAIL, P, 3, 0.6), { tone: "mid", inner: L(k.sideSeam(RAIL, 4, P, 3), { tone: "faint" }) }));
  for (const p of PANELS) out.push(panel(p));
  out.push(S(k.slabOf(HEADER, Z_TOP, 6, P, 3, 0.6), { tone: "mid" }));
  for (const x of [0, PANEL_W, WALL_X1]) {
    out.push(S(k.slabOf({ x: x - 6, y: -13, w: 12, d: 18, r: 1 }, Z_TOP + 6, 3, P, 2, 0.4), { tone: "mid" }));
    out.push(Dots([at([x - 3, 1, Z_TOP + 9]), at([x + 3, 1, Z_TOP + 9])], { size: 0.45 }));
  }
  return out.join("");
}
const OSD = { barY: -(SCREEN.z0 + 9) };
function panel({ i, x0, cx }) {
  const out = [];
  out.push(S(k.slabOf({ x: x0 + 0.6, y: -7, w: PANEL_W - 1.2, d: 7, r: 0.8 }, Z_RAIL, Z_TOP - Z_RAIL, P, 2, 0.4), { tone: "mid" }));
  const u0 = x0 + SCREEN.inset, u1 = x0 + PANEL_W - SCREEN.inset;
  const glass = rectPath(u0, -SCREEN.z1, u1, -SCREEN.z0, 1);
  const strips = [];
  for (let u = u0 + 1.75; u < u1; u += 3.5) strips.push(`M${u.toFixed(2)} ${-SCREEN.z1}V${-SCREEN.z0}`);
  const seams = [], gaps = [];
  for (let z = Z_RAIL + 50; z < Z_TOP - 10; z += 50) {
    seams.push(`M${x0 + 0.6} ${-z}H${u0}M${u1} ${-z}H${x0 + PANEL_W - 0.6}`);
    gaps.push(`M${u0} ${-z}H${u1}`);
  }
  const bar0 = u0 + 14, bar1 = u1 - 14;
  const osd = [
    `<text class="osd" data-osd="title" x="${u0 + 10}" y="${-(SCREEN.z1 - 15)}" font-size="9.5">${i === 0 ? "기초 연습 영상" : "방금 촬영한 영상"}</text>`,
    `<text class="osd osd-angle" data-osd="angle" x="${u1 - 10}" y="${-(SCREEN.z1 - 15)}" font-size="8" text-anchor="end">측면 카메라</text>`,
    `<path class="osd-track" d="M${bar0} ${OSD.barY}H${bar1}"/>`,
    `<path class="osd-done" data-osd="done" d="M${bar0} ${OSD.barY}H${bar0}"/>`,
    `<circle class="osd-knob" data-osd="knob" cx="${bar0}" cy="${OSD.barY}" r="2.4"/>`,
    `<text class="osd osd-time" data-osd="time" x="${u1 - 10}" y="${OSD.barY - 5}" font-size="7" text-anchor="end">00:00.0</text>`,
  ].join("");
  out.push(
    `<g transform="${planeOf(0)}" data-panel="${i}" data-bar="${bar0} ${bar1}">`,
    `<clipPath id="led-${i}"><path d="${glass}"/></clipPath>`,
    `<path class="led-glass" d="${glass}"/>`,
    `<g clip-path="url(#led-${i})">`,
    `<path class="led-studio" d="${rectPath(u0, -SCREEN.z1, u1, -IMG_FLOOR)}"/>`,
    `<path class="led-horizon" d="M${u0} ${-IMG_FLOOR}H${u1}"/>`,
    `<g data-screen="${i}"></g>`,
    osd,
    `<path class="led-strips" d="${strips.join("")}"/>`,
    `<path class="led-gap" d="${gaps.join("")}"/>`,
    `</g>`,
    L(seams.join(""), { tone: "faint" }),
    i === 0 ? L(glass, { tone: "lo" }) : `<path class="iso-line led-mirror" data-tone="lit" d="${glass}"/>`,
    `</g>`,
  );
  const box = { x: cx - 15, y: BOX_Y, w: 30, d: BOX_D, r: 1.4 };
  out.push(S(k.slabOf(box, 0, 12, P, 3, 0.5), { tone: "mid" }));
  out.push(L([-9, -6, -3].map((dx) => k.planOutline({ x: cx + dx - 0.6, y: BOX_Y + 2.4, w: 1.2, d: 5.2, r: 0.6 }, 12, P, 3)).join(""), { tone: "faint" }));
  out.push(Dots([at([cx + 6, BOX_Y + 2.2, 12]), at([cx + 12, BOX_Y + 2.2, 12])], { size: 0.4 }));
  out.push(`<g data-lamp="${i}">${Dots([at([cx + 10, BOX_FRONT, 9])], { size: 0.75, tone: "hi" })}</g>`);
  out.push(L(k.sideRing([cx, BOX_FRONT, 5], 2.4, "y", P), { tone: "lo" }));
  return out.join("");
}
function feet() {
  return [0, PANEL_W, WALL_X1].map((x) => S(k.cylinder(x, 19, 3.2, 0, 1.6, P, 18), { tone: "lo" }) + S(k.slabOf({ x: x - 3.5, y: 8, w: 7, d: 14, r: 1 }, 1.6, 4.4, P, 2, 0.4), { tone: "mid" }) + Dots([at([x, 19, 6])], { size: 0.45 })).join("");
}
function plugs() {
  return PANELS.map(({ cx }) => {
    const F = G.frameAlong([cx, BOX_FRONT, 5], [0, 1, 0]);
    return S(G.disc(0, 4.2, 2, F, P), { tone: "mid" }) + S(G.disc(4.2, 5.4, 1.2, F, P), { tone: "lo" });
  }).join("");
}

// ---------- replay recorder (Replay 장치) ----------
function recorder() {
  const R = RECORDER;
  const out = [`<path class="iso-halo" d="${k.haloOf(R, 0, 6, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(R, 5))) out.push(S(k.cylinder(x, y, 2.6, 0, 1.6, P, 14), { tone: "lo" }));
  out.push(S(k.slabOf(R, 1.6, RECORDER_H - 1.6, P, 3, 0.8), { tone: "mid", inner: L(k.sideSeam(R, 19, P, 3), { tone: "faint" }) }));
  const fy = R.y + R.d;
  const decks = [8, 23].map((z) => [
    `<path class="iso-line" data-tone="lo" d="${rectPath(R.x + 3, -(z + 7.6), R.x + R.w - 3, -z, 0.8)}"/>`,
    `<path class="deck-screen" d="${rectPath(R.x + 6, -(z + 6), R.x + 20, -(z + 1.6), 0.4)}"/>`,
    ...[0, 1, 2].map((j) => `<path class="iso-line" data-tone="lo" d="${rectPath(R.x + 24 + j * 4.2, -(z + 6.2), R.x + 27 + j * 4.2, -(z + 4), 0.4)}"/>`),
  ].join(""));
  out.push(`<g transform="${planeOf(fy)}">${decks.join("")}</g>`);
  out.push(`<g class="rec-lamp">${Dots([at([R.x + R.w - 6, fy, 12.6]), at([R.x + R.w - 6, fy, 27.6])], { size: 0.75, tone: "hi" })}</g>`);
  for (const x of Object.values(PORTS)) {
    out.push(L(k.sideRing([x, fy, 8], 2, "y", P), { tone: "lo" }));
    out.push(S(G.disc(0, 3.6, 1.8, G.frameAlong([x, fy, 8], [0, 1, 0]), P), { tone: "mid" }));
  }
  for (const y of [178, 186]) out.push(S(G.disc(0, 3.6, 1.8, G.frameAlong([RX, y, 10], [1, 0, 0]), P), { tone: "mid" }));
  out.push(Dots(k.corners(R, 3).map(([x, y]) => at([x, y, RECORDER_H])), { size: 0.45 }));
  return out.join("");
}

// ---------- tripod cameras (front at the runway end, rear behind the transparent wall) ----------
function camFrameOf(o, target) {
  const a = v3.unit(v3.sub(target, o));
  const u = v3.unit(v3.cross([0, 0, 1], a));
  return G.frameOf(o, a, u, v3.cross(a, u));
}
function tripodCamera({ at: [cx, cy], z, target }, legAngles) {
  const CF = camFrameOf([cx, cy, z], target);
  const camPoint = (s, u, v) => v3.add(v3.add(v3.add(CF.o, CF.a, s), CF.u, u), CF.v, v);
  const out = [`<path class="iso-halo" d="${k.haloOf({ x: cx - 30, y: cy - 30, w: 60, d: 60, r: 30 }, 0, 4, P)}"/>`];
  const legs = legAngles.map((deg) => {
    const a = (deg * Math.PI) / 180;
    const top = [cx + 5.5 * Math.cos(a), cy + 5.5 * Math.sin(a), z - 42];
    const foot = [cx + 30 * Math.cos(a), cy + 30 * Math.sin(a), 1.6];
    const dir = v3.unit(v3.sub(foot, top));
    const len = Math.hypot(...v3.sub(foot, top));
    const F = G.frameAlong(top, dir);
    const svg = S(G.disc(0, len * 0.55, 1.6, F, P), { tone: "mid" }) + S(G.disc(len * 0.55 + 2.6, len - 1.6, 1.15, F, P), { tone: "mid" }) + S(G.disc(len * 0.55, len * 0.55 + 2.6, 2.3, F, P), { tone: "lo" }) + S(k.cylinder(foot[0], foot[1], 2.4, 0, 1.6, P, 16), { tone: "lo" });
    return [depth(v3.add(top, dir, len / 2)), svg];
  }).sort((p, q) => p[0] - q[0]);
  const hub = depth([cx, cy, 60]);
  for (const [d, svg] of legs) if (d < hub) out.push(svg);
  out.push(S(k.cylinder(cx, cy, 7, z - 44, 6, P, 28, 0.5), { tone: "mid" }));
  out.push(S(k.cylinder(cx, cy, 2.3, z - 38, 24, P, 18), { tone: "mid" }));
  for (const [d, svg] of legs) if (d >= hub) out.push(svg);
  out.push(S(k.cylinder(cx, cy, 5, z - 14, 5, P, 24, 0.4), { tone: "mid" }));
  out.push(S(k.slabOf({ x: cx - 6, y: cy - 6, w: 12, d: 12, r: 1.5 }, z - 9, 2, P, 2, 0.4), { tone: "lo" }));
  const body = [[-5.5, -5], [-4, -6.5], [4, -6.5], [5.5, -5], [5.5, 5], [4, 6.5], [-4, 6.5], [-5.5, 5]];
  const parts = [
    S(G.disc(-21, -16, 1.9, G.frameOf(camPoint(0, -1.5, 4), CF.a, CF.u, CF.v), P), { tone: "lo" }),
    S(G.prismOf(CF, body, -16, 10, P), { tone: "mid" }),
    S(G.prismOf(CF, [[-1.2, 6.5], [1.2, 6.5], [1.2, 9.5], [-1.2, 9.5]], -11, -8, P), { tone: "mid" }),
    S(G.prismOf(CF, [[-1.2, 6.5], [1.2, 6.5], [1.2, 9.5], [-1.2, 9.5]], 4, 7, P), { tone: "mid" }),
    S(G.prismOf(CF, [[-1.6, 9.5], [1.6, 9.5], [1.6, 12], [-1.6, 12]], -13, 9, P), { tone: "mid" }),
    S(G.prismOf(CF, [[5.5, -3.5], [6.6, -3.5], [6.6, 4], [5.5, 4]], -9, 2, P), { tone: "lo" }),
    S(G.solidOf([[10, 4.6], [12, 4.6], [12, 5.4], [22, 5.4], [22, 4.9], [25, 4.9], [25, 6.2], [30, 6.9]], CF, P), { tone: "mid" }),
    k.fadedSvg(G.ribsOf(CF, 13, 21, 5.4, 40, P, { fade: [0.1, 0.55], seams: true }), { tone: "lo" }),
  ];
  // Looking away from the viewer, the lens is behind the body; looking toward the viewer, the body is behind the lens.
  if (depth(CF.a) - depth([0, 0, 0]) < 0) parts.unshift(parts.splice(6, 2).join(""));
  out.push(...parts);
  out.push(`<g class="tally">${Dots([at(camPoint(-6, 0, 6.6))], { size: 0.9, tone: "hi" })}</g>`);
  return out.join("");
}

// ---------- side camera: PTZ on its flight case ----------
function ptz() {
  const out = [`<path class="iso-halo" d="${k.haloOf(CASE, 0, 8, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(CASE, 5))) out.push(S(k.cylinder(x, y, 2.6, 0, 1.6, P, 14), { tone: "lo" }));
  const lid = CASE_H - 12;
  out.push(S(k.slabOf(CASE, 1.6, CASE_H - 1.6, P, 3, 0.8), { tone: "mid", inner: L(k.sideSeam(CASE, lid, P, 3), { tone: "lo" }) + L(k.sideSeam(CASE, 6, P, 3), { tone: "faint" }) }));
  for (const [x, y] of byDepth(k.corners(CASE, 3.2))) out.push(S(k.slabOf({ x: x - 3.2, y: y - 3.2, w: 6.4, d: 6.4, r: 2 }, CASE_H - 3, 3.2, P, 3), { tone: "lo" }));
  const front = CASE.y + CASE.d, right = CASE.x + CASE.w;
  for (const x of [CASE.x + 16, CASE.x + CASE.w - 12]) out.push(S(k.slabOf({ x: x - 3, y: front, w: 6, d: 1, r: 0.4 }, lid - 4, 8, P, 1, 0.3), { tone: "lo" }));
  out.push(S(k.slabOf({ x: right, y: CASE.y + 12, w: 1.2, d: 16, r: 0.5 }, lid - 12, 4, P, 2), { tone: "lo" }));
  out.push(S(k.slabOf({ x: right + 1.2, y: CASE.y + 13.5, w: 1.6, d: 13, r: 0.6 }, lid - 11.2, 2.4, P, 2), { tone: "mid" }));
  const [px, py] = PTZ_AT;
  const z = CASE_H;
  out.push(S(k.slabOf({ x: px - 11, y: py - 11, w: 22, d: 22, r: 3 }, z, 6, P, 4, 0.6), { tone: "mid" }));
  out.push(S(k.cylinder(px, py, 9, z + 6, 3, P, 32, 0.4), { tone: "lo" }));
  const aim = v3.unit(v3.sub([RUNWAY.x + RUNWAY.w / 2, RUNWAY.y + RUNWAY.d / 2, 100], [px, py, z + 22]));
  const yawU = v3.unit(v3.cross([0, 0, 1], aim));
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
  return out.join("");
}

// ---------- the instructor and her pad ----------
const HOLD = { tilt: 3, nod: 16, R: { thigh: [4, 70], shin: [4, 70], foot: [66, 40] }, L: { thigh: [2, 100], shin: [2, 100], foot: [66, 40] }, RA: { upper: [22, 15], fore: [78, -32] }, LA: { upper: [22, 15], fore: [78, -32] } };
const TH = (TEACHER.heading * Math.PI) / 180;
const T_FW = [Math.sin(TH), -Math.cos(TH), 0], T_RT = [-Math.cos(TH), -Math.sin(TH), 0];
const tWorld = (p) => [TEACHER.at[0] + p[0] * T_RT[0] + p[1] * T_FW[0], TEACHER.at[1] + p[0] * T_RT[1] + p[1] * T_FW[1], p[2]];
const J_HOLD = M.skeleton(M.flatten(HOLD));
const PADF = (() => {
  const wR = tWorld(J_HOLD.wristR), wL = tWorld(J_HOLD.wristL);
  const mid = v3.add(v3.mul(v3.add(wR, wL), 0.5), T_FW, 3);
  const tilt = (40 * Math.PI) / 180;
  const along = v3.add(v3.mul(T_FW, Math.cos(tilt)), [0, 0, Math.sin(tilt)]);
  const right = v3.mul(T_RT, -1); // her left-to-right as she looks at it
  const o = v3.add(v3.add(mid, right, -PU.PAD.w / 2), along, -PU.PAD.h / 2 + 2);
  return { o, right, along, normal: v3.cross(right, along) };
})();
const padPoint = ([x, y], lift = 0) => v3.add(v3.add(v3.add(PADF.o, PADF.right, x), PADF.along, -y), PADF.normal, lift);
// The left hand holds the pad; the right hand reaches over it. Pick the right-arm pose whose wrist sits nearest
// a point just above the pad's control strip, so the finger only has to dip to touch.
const HOVER = padPoint([18, -5], 7);
const RA_HOVER = (() => {
  let best = null;
  for (let e1 = 10; e1 <= 70; e1 += 4) for (let p1 = -20; p1 <= 60; p1 += 5) for (let e2 = 40; e2 <= 120; e2 += 5) for (let p2 = -90; p2 <= 20; p2 += 5) {
    const pose = { ...HOLD, RA: { upper: [e1, p1], fore: [e2, p2] } };
    const w = tWorld(M.skeleton(M.flatten(pose)).wristR);
    const d = Math.hypot(...v3.sub(w, HOVER));
    if (!best || d < best.d) best = { d, ra: [e1, p1, e2, p2] };
  }
  return best;
})();
const TEACHER_FLAT = M.flatten({ ...HOLD, RA: { upper: [RA_HOVER.ra[0], RA_HOVER.ra[1]], fore: [RA_HOVER.ra[2], RA_HOVER.ra[3]] } });
function teacherSlot() {
  const pad = S(G.prismOf(G.frameOf(PADF.o, PADF.normal, PADF.right, PADF.along), [[0, 0], [PU.PAD.w, 0], [PU.PAD.w, PU.PAD.h], [0, PU.PAD.h]], -0.8, 0, P), { tone: "mid" });
  const M2 = planeMatrix(v3.add(PADF.o, PADF.normal, 0.02), PADF.right, PADF.along);
  return [
    `<path class="iso-halo" d="${k.haloOf({ x: TEACHER.at[0] - 20, y: TEACHER.at[1] - 18, w: 40, d: 36, r: 18 }, 0, 3, P)}"/>`,
    `<g data-part="teacher"></g>`,
    pad,
    `<g data-part="pad-ui" transform="${M2}"></g>`,
    `<path class="iso-line" data-tone="lo" transform="${M2}" d="${rectPath(1, -PU.PAD.h + 1, PU.PAD.w - 1, -1, 1)}"/>`,
    `<g data-part="finger"></g>`,
  ].join("");
}

// ---------- the enlarged pad (picture in picture, top left) ----------
function inset() {
  const { w, h } = PU.PAD;
  return `<g class="inset" transform="translate(${INSET.x} ${INSET.y}) scale(${INSET.scale})">
<path class="inset-shadow" d="${rectPath(0.3, -h + 0.5, w + 0.3, 0.5, 1.6)}"/>
<path class="inset-bezel" d="${rectPath(0, -h, w, 0, 1.6)}"/>
<g data-part="inset-ui"></g>
<path class="inset-edge" d="${rectPath(0, -h, w, 0, 1.6)}"/>
<circle class="inset-cam" cx="${w / 2}" cy="${-h + 0.5}" r="0.22"/>
<text class="inset-title" x="0" y="${-h - 1.2}" font-size="1.5">교수자 패드 화면</text>
</g>`;
}

// ---------- assemble ----------
const slots = [
  ["recorder", [RECORDER.x + RECORDER.w / 2, RECORDER.y + RECORDER.d / 2, 0], recorder()],
  ["ptz", [...PTZ_AT, 0], ptz()],
  ["front", [...CAMS.front.at, 0], tripodCamera(CAMS.front, [30, 150, 270])],
  ["teacher", [...TEACHER.at, 0], teacherSlot()],
].map(([name, c, svg]) => [depth(c), `<g data-slot="${name}" data-depth="${depth(c).toFixed(2)}">${svg}</g>`]).sort((a, b) => a[0] - b[0]);

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label: "공간확장 모듈 스튜디오: 투명 LED 벽을 둘로 나눠 왼쪽에는 모델 실습자의 기초 연습 영상을, 오른쪽에는 방금 런웨이에서 찍은 영상을 같은 걸음에 맞춰 리플레이한다. 정면(런웨이 끝), 측면(PTZ), 후면(투명 LED 뒤) 카메라 세 대가 리플레이 장치로 들어가고, 교수자가 패드로 카메라 각도와 재생 구간을 고른다.",
  body: [stage(), cables(), tapes(), `<g data-slot="rear">${tripodCamera(CAMS.rear, [100, 220, 340])}</g>`, wall(), feet(), plugs(), runway(), `<g data-layer="free">${slots.map((s) => s[1]).join("")}<g data-part="learner"></g></g>`, inset()],
});

// ---------- live ----------
const strip = (file) => readFileSync(join(HERE, file), "utf8").replace(/^import .*$/gm, "").replace(/^export /gm, "");
const camPositions = { front: CAMS.front.at, side: PTZ_AT, rear: CAMS.rear.at };
const live = `
${strip("../01.ballet-mirror/model.mjs")}
${strip("../01.ballet-mirror/dancer.mjs")}
${strip("walk.mjs")}
${strip("padui.mjs")}
const P = ${JSON.stringify(P)};
const CAM_POS = ${JSON.stringify([camPositions.front, camPositions.side, camPositions.rear])};
const PANEL_CX = ${JSON.stringify(PANELS.map((p) => p.cx))};
const IMG_FLOOR = ${IMG_FLOOR};
const STAND_SPOT = ${JSON.stringify(STAND_SPOT)};
const TEACHER = ${JSON.stringify(TEACHER)};
const TEACHER_FLAT = ${JSON.stringify(TEACHER_FLAT)};
const PADF = ${JSON.stringify(PADF)};
const RUN_EDGE = ${RUNWAY.x};
const STEP = { x0: ${RUNWAY.x - 16}, x1: ${RUNWAY.x} };
const BAR_Y = ${OSD.barY};
${readFileSync(join(HERE, "live.js"), "utf8")}
`;

const css = `<style>
.iso{--led-glass:#07090d;--led-studio:#10141c;--led-line:#1c2230;--old:#b9c1cf;--old-edge:#eef1f6;--old-far:#8e97a8;--new:#6f9dff;--new-edge:#a9c4ff;--new-far:#4f7ee0;--osd:#c9d2e3;--pad-bezel:#16191f}
.iso[data-theme="light"]{--led-glass:#1b1f27;--led-studio:#232937;--led-line:#2e3545;--pad-bezel:#2a2e36}
.led-glass{fill:var(--led-glass)}
.led-studio{fill:var(--led-studio)}
.iso-svg .old-limbs path,.iso-svg .new-limbs path,.iso-svg .old-limbs circle,.iso-svg .new-limbs circle,.iso-svg .led-strips,.iso-svg .led-gap,.iso-svg .led-horizon,.iso-svg .osd-track,.iso-svg .osd-done,.iso-svg .inset path,.iso-svg .inset circle,.iso-svg [data-part="pad-ui"] path,.iso-svg [data-part="pad-ui"] circle{vector-effect:none}
.led-horizon{fill:none;stroke:var(--led-line);stroke-width:.8}
.led-strips{fill:none;stroke:#000;stroke-opacity:.28;stroke-width:1.3}
.led-gap{fill:none;stroke:#000;stroke-opacity:.55;stroke-width:.9}
.led-mirror{stroke-width:1.1px}
.old-limbs,.new-limbs{fill:none;stroke-linecap:round;stroke-linejoin:round}
.old-limbs{stroke:var(--old)} .new-limbs{stroke:var(--new)}
path.old-rim{stroke:var(--old-edge)} path.new-rim{stroke:var(--new-edge)}
circle.old-rim{fill:var(--old-edge)} circle.new-rim{fill:var(--new-edge)}
path.old-far{stroke:var(--old-far)} path.new-far{stroke:var(--new-far)}
.old-head{fill:var(--old)} .new-head{fill:var(--new)}
.old-floor,.new-floor{fill:#000;opacity:.45}
[data-screen].dim{opacity:.45}
.osd{fill:var(--osd);font-family:"Pretendard","Malgun Gothic",ui-sans-serif,sans-serif;font-weight:600}
.osd-angle{font-weight:400;opacity:.8}
.osd-time{font-family:var(--anatomy-mono);font-weight:400}
.osd[data-rec]{fill:#ff6b6b}
.osd-track{fill:none;stroke:#fff;stroke-opacity:.25;stroke-width:1.6;stroke-linecap:round}
.osd-done{fill:none;stroke:var(--osd);stroke-width:1.6;stroke-linecap:round}
.osd-knob{fill:#fff}
.pad-screen{fill:var(--led-glass)}
.pad-pill{fill:#2b3345} .pad-pill.on{fill:var(--new)}
.pad-pill-text{fill:#aeb7c9;font-family:"Pretendard","Malgun Gothic",sans-serif} .pad-pill-text.on{fill:#fff;font-weight:700}
.pad-label{fill:#c9d2e3;font-family:"Pretendard","Malgun Gothic",sans-serif;font-weight:600}
.pad-time{fill:#aeb7c9;font-family:var(--anatomy-mono)}
.pad-play{fill:#2b3345} .pad-play.on{fill:var(--new)}
.pad-glyph{fill:none;stroke:#fff;stroke-width:.35;stroke-linecap:round} .pad-glyph-fill{fill:#fff}
.pad-track{fill:none;stroke:#fff;stroke-opacity:.25;stroke-width:.45;stroke-linecap:round}
.pad-done{fill:none;stroke:var(--new);stroke-width:.45;stroke-linecap:round}
.pad-knob{fill:#fff}
.pad-touch{fill:none;stroke:#fff;stroke-width:.3}
.inset-bezel{fill:var(--pad-bezel)} .inset-shadow{fill:#000;opacity:.18;filter:blur(1px)}
.inset-edge{fill:none;stroke:var(--anatomy-mid);stroke-width:.12}
.inset-cam{fill:#000}
.inset-title{fill:var(--anatomy-muted);font-family:"Pretendard","Malgun Gothic",sans-serif;font-weight:600}
.inset-finger{fill:#f2e6dc;stroke:#6b5a4e;stroke-width:.12;opacity:.92}
.finger{fill:var(--anatomy-shade-2);stroke:var(--anatomy-hi);stroke-width:var(--anatomy-weight);vector-effect:non-scaling-stroke}
.deck-screen{fill:var(--led-glass)}
.cam-glass{fill:var(--anatomy-shade-0)}
.cord{stroke-width:1.5px} .pulse{stroke-width:1px}
.tally .iso-dots circle,.rec-lamp .iso-dots circle{fill:var(--anatomy-red);transition:opacity .3s}
.iso-svg:not([data-rec]) .tally .iso-dots circle,.iso-svg:not([data-rec]) .rec-lamp .iso-dots circle{opacity:.18}
[data-lamp] .iso-dots circle{fill:var(--anatomy-green)}
.mq-body{fill:var(--anatomy-shade-2)}
.mq-shade{fill:var(--anatomy-shade-0);opacity:.9}
.mq-shine{fill:var(--anatomy-lit-top)}
.mq-edge{fill:none;stroke:var(--anatomy-hi);stroke-width:var(--anatomy-weight);vector-effect:non-scaling-stroke;stroke-linejoin:round}
.iso-plate-corner{font-family:"Pretendard","Malgun Gothic","Apple SD Gothic Neo",ui-sans-serif,system-ui,sans-serif;font-size:11.5px;letter-spacing:0}
.wr-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
.iso-stage{touch-action:pan-y}
.iso-stage:focus{outline:none}
.iso-stage:focus-visible{outline:1px solid var(--anatomy-muted);outline-offset:6px}
[data-slot="teacher"],.inset{cursor:pointer}
</style>`;

const body = css + k.plateHtml({
  fig: "Fig 2",
  title: "공간확장 모듈 · 모델 워킹 리플레이",
  hint: "1·2·3 각도 · 스페이스 재생 · ←→ 구간 · 패드 클릭",
  readout: "",
  keys: [
    { mark: "dim", label: "왼쪽 패널: 실습자가 기초 연습 때 찍은 워킹 영상" },
    { mark: "lit", label: "오른쪽 패널: 방금 런웨이에서 찍은 워킹 영상 (같은 걸음에 맞춰 재생)" },
    { mark: "red", label: "카메라 입력: 정면(런웨이 끝) · 측면(PTZ) · 후면(투명 LED 뒤) → 리플레이 장치" },
    { mark: "blue", label: "리플레이 출력: 리플레이 장치 → 왼쪽 · 오른쪽 패널" },
    { mark: "raised", label: "교수자 패드: 카메라 각도와 재생 구간을 고르고 함께 본다 (왼쪽 위는 패드 화면 확대)" },
  ],
  caption: "실습자가 벽 앞 짧은 런웨이를 걸어 나갔다 돌아오는 동안 정면·측면·후면 카메라가 워킹을 녹화한다. 후면 카메라는 투명 LED 뒤에서 패널을 통해 찍는다. 돌아온 실습자는 교수자 옆에 서고, 교수자가 패드에서 카메라 각도를 고른 뒤 재생하면 투명 LED 왼쪽에는 기초 연습 때의 영상이, 오른쪽에는 방금 찍은 영상이 같은 걸음에 맞춰 좌우 반전 없이 재생된다. 굽은 어깨와 숙인 시선, 짧은 보폭이 펴진 자세와 긴 보폭으로 바뀐 과정을 나란히 보며 변화를 체감한다.",
  body: `<div class="iso-stage" tabindex="0" role="group" aria-label="공간확장 모듈. 1, 2, 3으로 카메라 각도, 스페이스로 재생, 좌우 화살표로 구간을 고릅니다.">${svg}<span class="wr-sr" role="status" aria-live="polite" data-status></span></div>`,
});

const name = theme === "light" ? "walking-replay-light.html" : "walking-replay.html";
writeFileSync(join(HERE, name), k.pageHtml({ title: "공간확장 모듈 · 모델 워킹 리플레이", theme, body, script: kitScript() + live, width: 760 }));
console.log("wrote", name, "hover reach", RA_HOVER.d.toFixed(1), "cm");
