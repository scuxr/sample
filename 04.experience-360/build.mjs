// 경험확장 모듈 · 360° VR 공연장 체험 — anatomy figure build.
// node build.mjs [--light]
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as M from "../01.ballet-mirror/model.mjs";
import * as DN from "../01.ballet-mirror/dancer.mjs";
import * as GR from "./gear.mjs";
import { panoSvg, HORIZON } from "./pano.mjs";

const SKILL = process.env.ANATOMY_SKILL || "C:/Users/user/.claude/skills/anatomy";
const k = await import(pathToFileURL(join(SKILL, "kit/iso-kit.mjs")).href);
const G = await import(pathToFileURL(join(SKILL, "kit/lathe.mjs")).href);
const { kitScript } = await import(pathToFileURL(join(SKILL, "scripts/inline-kit.mjs")).href);

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--light") ? "light" : "dark";

// ---------- world (cm) ----------
const WIDTH = 600;
const HEIGHT = 400;
const FLOOR = { x: -220, y: -40, w: 880, d: 420, r: 3 };
const FLOOR_H = 30;
const PANEL_W = 150;
const PANELS = [0, 1, 2, 3].map((i) => ({ i, x0: i * PANEL_W }));
const WALL_X1 = PANEL_W * 4;
const RAIL = { x: -4, y: -16, w: WALL_X1 + 8, d: 24, r: 2 };
const Z_RAIL = 12;
const Z_TOP = 262;
const HEADER = { x: -4, y: -12, w: WALL_X1 + 8, d: 16, r: 2 };
const RISER = { x: -12, y: 10, w: WALL_X1 + 24, d: 86, r: 2 };
const RISER_H = 32;
const VIEW = { z0: RISER_H + 4, z1: 258 };
const MAIN = { x0: 6, x1: 414, fov: 100 };
const SIDE = { x0: 426, x1: 594, fov: 64 };
const K = (MAIN.x1 - MAIN.x0) / MAIN.fov; // cm of wall per degree of view in the HMD mirror
const SIDE_S = (SIDE.x1 - SIDE.x0) / SIDE.fov / K;
const CAM360 = { at: [300, 52], z: RISER_H, h: 125 };
const HMD = { at: [252, 206], heading: 0 };
const PHONE = { at: [372, 226], heading: 40 };
const PRESENTER = { at: [566, 168], heading: 250 };
const CHAIRS = [[38, 306, 22, true], [104, 330, 13, true], [172, 346, 5, true], [478, 338, -12, true], [544, 318, -24, false]];

const P = k.fitProjection([...k.boxCorners(FLOOR, -FLOOR_H, 0), [0, -16, Z_TOP + 10], [WALL_X1, 8, Z_TOP + 10]], WIDTH, HEIGHT, { pad: 18, azimuth: 72 });

const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const Dots = (points, style) => k.dotsSvg(points, style);
const depth = (p) => k.depthOf(p, P);
const planeOf = (y) => k.sideMatrix([0, y], 0, P, "left");
const rectPath = (x0, y0, x1, y1, r = 0) => k.pathOf(k.roundedPlan({ x: x0, y: y0, w: x1 - x0, d: y1 - y0, r }, r ? 4 : 1), true);
const byDepth = (points) => [...points].sort((a, b) => depth([a[0], a[1], 0]) - depth([b[0], b[1], 0]));
const v3 = {
  add: (a, b, s = 1) => [a[0] + b[0] * s, a[1] + b[1] * s, a[2] + b[2] * s],
  sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  unit: (a) => { const n = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / n, a[1] / n, a[2] / n]; },
};

// ---------- room floor ----------
function floor() {
  const out = [`<path class="iso-halo" d="${k.haloOf(FLOOR, -FLOOR_H, FLOOR_H, P)}"/>`];
  const seamsX = [];
  for (let x = FLOOR.x + 110; x < FLOOR.x + FLOOR.w - 20; x += 110) seamsX.push(x);
  const front = FLOOR.y + FLOOR.d, right = FLOOR.x + FLOOR.w;
  const seamYs = [FLOOR.y + 150, FLOOR.y + 300];
  const inner = [...seamsX.map((x) => k.segment([x, front, 0], [x, front, -FLOOR_H], P)), ...seamYs.map((y) => k.segment([right, y, 0], [right, y, -FLOOR_H], P))].join("");
  out.push(S(k.slabOf(FLOOR, -FLOOR_H, FLOOR_H, P, 3, 1.2), { tone: "lo", inner: L(inner, { tone: "faint" }) + L(k.sideSeam(FLOOR, -FLOOR_H + 6, P, 3), { tone: "faint" }) }));
  out.push(L(seamsX.map((x) => k.lineOnTop([x, FLOOR.y], [x, front], 0, P)).join("") + seamYs.map((y) => k.lineOnTop([FLOOR.x, y], [right, y], 0, P)).join(""), { tone: "faint" }));
  // Where the two viewers stand: a ring of tape round each spot, big enough to turn in.
  for (const v of [HMD, PHONE]) out.push(L(k.ring(v.at[0], v.at[1], 34, 0, P, 64), { tone: "lo", dashed: true }));
  return out.join("");
}

// ---------- the LED wall, laid out in two regions ----------
function wall() {
  const out = [`<path class="iso-halo" d="${k.haloOf(RAIL, 0, 8, P)}"/>`];
  out.push(S(k.slabOf(RAIL, 0, Z_RAIL, P, 3, 0.6), { tone: "mid" }));
  for (const { x0 } of PANELS) out.push(S(k.slabOf({ x: x0 + 0.6, y: -7, w: PANEL_W - 1.2, d: 7, r: 0.8 }, Z_RAIL, Z_TOP - Z_RAIL, P, 2, 0.4), { tone: "mid" }));
  const glass = rectPath(4, -VIEW.z1, WALL_X1 - 4, -Z_RAIL - 2, 1);
  const strips = [];
  for (let u = 5.75; u < WALL_X1 - 4; u += 3.5) strips.push(`M${u.toFixed(2)} ${-VIEW.z1}V${-Z_RAIL - 2}`);
  const gaps = [];
  for (let z = Z_RAIL + 50; z < Z_TOP - 10; z += 50) gaps.push(`M4 ${-z}H${WALL_X1 - 4}`);
  for (const x of [PANEL_W, PANEL_W * 2, PANEL_W * 3]) gaps.push(`M${x} ${-VIEW.z1}V${-Z_RAIL - 2}`);
  const region = (r) => rectPath(r.x0, -VIEW.z1 + 4, r.x1, -VIEW.z0, 2);
  const cM = (MAIN.x0 + MAIN.x1) / 2, cS = (SIDE.x0 + SIDE.x1) / 2;
  const zc = (VIEW.z0 + VIEW.z1) / 2;
  const span = 360 * K;
  const strip = panoSvg(K);
  const copies = `<g transform="translate(${-span} 0)">${strip}</g>${strip}<g transform="translate(${span} 0)">${strip}</g>`;
  const compass = (x, z, r, name) => `<g transform="translate(${x} ${-z})"><circle class="ui-dial" r="${r}"/><path class="ui-wedge" data-wedge="${name}" d="M0 0L${(-r * 0.92 * Math.sin(0.55)).toFixed(2)} ${(-r * 0.92 * Math.cos(0.55)).toFixed(2)}A${r * 0.92} ${r * 0.92} 0 0 1 ${(r * 0.92 * Math.sin(0.55)).toFixed(2)} ${(-r * 0.92 * Math.cos(0.55)).toFixed(2)}Z"/><circle class="ui-hub" r="${r * 0.16}"/></g>`;
  const barY = -(VIEW.z0 + 10);
  const ui = [
    compass(MAIN.x0 + 22, VIEW.z1 - 22, 12, "main"),
    `<text class="ui-title" x="${MAIN.x0 + 42}" y="${-(VIEW.z1 - 19)}" font-size="8.5">HMD 화면 미러링 · 공연장 360° VR</text>`,
    `<text class="ui-badge" x="${MAIN.x1 - 10}" y="${-(VIEW.z1 - 19)}" font-size="8" text-anchor="end">360°</text>`,
    `<path class="ui-play" d="M${MAIN.x0 + 14} ${barY - 5}L${MAIN.x0 + 23} ${barY}L${MAIN.x0 + 14} ${barY + 5}Z"/>`,
    `<path class="ui-track" d="M${MAIN.x0 + 34} ${barY}H${MAIN.x1 - 64}"/>`,
    `<path class="ui-done" data-ui="done" d="M${MAIN.x0 + 34} ${barY}H${MAIN.x0 + 34}"/>`,
    `<text class="ui-time" data-ui="time" x="${MAIN.x1 - 10}" y="${barY + 3}" font-size="7" text-anchor="end">0:00 / 3:09</text>`,
    compass(SIDE.x0 + 18, VIEW.z1 - 20, 9, "side"),
    `<text class="ui-title" x="${SIDE.x0 + 32}" y="${-(VIEW.z1 - 17.5)}" font-size="7.5">스마트폰 360° 뷰</text>`,
  ].join("");
  out.push(
    `<g transform="${planeOf(0)}" data-led data-bar="${MAIN.x0 + 34} ${MAIN.x1 - 64} ${barY}">`,
    `<radialGradient id="pv-wash-g"><stop offset="0" stop-color="#6d4fa8" stop-opacity=".45"/><stop offset="1" stop-color="#6d4fa8" stop-opacity="0"/></radialGradient><clipPath id="led-main"><path d="${region(MAIN)}"/></clipPath><clipPath id="led-side"><path d="${region(SIDE)}"/></clipPath>`,
    `<path class="led-glass" d="${glass}"/>`,
    `<g clip-path="url(#led-main)"><g transform="translate(${cM} 0)"><g data-strip="main">${copies}</g></g></g>`,
    `<g clip-path="url(#led-side)"><g transform="translate(${cS} ${-zc}) scale(${SIDE_S.toFixed(4)}) translate(0 ${zc})"><g data-strip="side">${copies}</g></g></g>`,
    `<path class="led-veil" d="${region(MAIN)}${region(SIDE)}"/>`,
    ui,
    `<path class="led-strips" d="${strips.join("")}"/>`,
    `<path class="led-gap" d="${gaps.join("")}"/>`,
    L(region(MAIN) + region(SIDE), { tone: "faint" }),
    L(glass, { tone: "lo" }),
    `</g>`,
  );
  out.push(S(k.slabOf(HEADER, Z_TOP, 6, P, 3, 0.6), { tone: "mid" }));
  for (const x of [0, PANEL_W, PANEL_W * 2, PANEL_W * 3, WALL_X1]) {
    out.push(S(k.slabOf({ x: x - 6, y: -13, w: 12, d: 18, r: 1 }, Z_TOP + 6, 3, P, 2, 0.4), { tone: "mid" }));
    out.push(Dots([at([x - 3, 1, Z_TOP + 9]), at([x + 3, 1, Z_TOP + 9])], { size: 0.45 }));
  }
  return out.join("");
}

// ---------- the wooden riser in front of the wall ----------
function riser() {
  const R = RISER;
  const out = [`<path class="iso-halo" d="${k.haloOf(R, 0, 6, P)}"/>`];
  const front = R.y + R.d;
  const planks = [];
  for (let x = R.x + 78; x < R.x + R.w - 10; x += 78) planks.push(k.segment([x, front, RISER_H], [x, front, 0], P));
  out.push(S(k.slabOf(R, 0, RISER_H, P, 3, 0.8), { tone: "mid", inner: L(planks.join("") + k.sideSeam(R, 5, P, 3), { tone: "faint" }) }));
  out.push(L([R.y + 28, R.y + 56].map((y) => k.lineOnTop([R.x, y], [R.x + R.w, y], RISER_H, P)).join(""), { tone: "faint" }));
  out.push(L(Array.from({ length: Math.floor(R.w / 78) }, (_, i) => k.lineOnTop([R.x + 78 * (i + 1), R.y], [R.x + 78 * (i + 1), front], RISER_H, P)).join(""), { tone: "faint" }));
  return out.join("");
}

// ---------- the 360° VR camera on its stand at the centre of the riser ----------
function camera360() {
  const [cx, cy] = CAM360.at;
  const z0 = CAM360.z;
  const top = z0 + CAM360.h;
  const out = [`<path class="iso-halo" d="${k.haloOf({ x: cx - 24, y: cy - 24, w: 48, d: 48, r: 24 }, z0, 4, P)}"/>`];
  const legs = [60, 180, 300].map((deg) => {
    const a = (deg * Math.PI) / 180;
    const hub = [cx + 4 * Math.cos(a), cy + 4 * Math.sin(a), z0 + 64];
    const foot = [cx + 26 * Math.cos(a), cy + 26 * Math.sin(a), z0 + 1.4];
    const dir = v3.unit(v3.sub(foot, hub));
    const len = Math.hypot(...v3.sub(foot, hub));
    const F = G.frameAlong(hub, dir);
    return [depth(v3.add(hub, dir, len / 2)), S(G.disc(0, len - 1.4, 1.2, F, P), { tone: "mid" }) + S(k.cylinder(foot[0], foot[1], 2.2, z0, 1.4, P, 14), { tone: "lo" })];
  }).sort((p, q) => p[0] - q[0]);
  const mid = depth([cx, cy, z0]);
  for (const [d, svg] of legs) if (d < mid) out.push(svg);
  out.push(S(k.cylinder(cx, cy, 5, z0 + 60, 6, P, 24, 0.4), { tone: "mid" }));
  out.push(S(k.cylinder(cx, cy, 1.6, z0 + 66, top - z0 - 74, P, 16), { tone: "mid" }));
  out.push(S(k.cylinder(cx, cy, 2.6, top - 12, 4, P, 16), { tone: "lo" }));
  for (const [d, svg] of legs) if (d >= mid) out.push(svg);
  // The camera: a ball with six fisheye lenses round its waist and one on top.
  const c = [cx, cy, top];
  const R = 11;
  const lenses = [0, 60, 120, 180, 240, 300].map((deg) => {
    const a = (deg * Math.PI) / 180;
    const n = [Math.cos(a), Math.sin(a), 0];
    const F = G.frameAlong(v3.add(c, n, R - 1.2), n);
    const svg = S(G.disc(0, 2.6, 4.2, F, P), { tone: "mid" }) + `<path class="lens-glass" d="${G.circleOf(F, 2.6, 3.1, P)}"/>`;
    return [depth(n), svg];
  });
  for (const [d, svg] of lenses) if (d < 0) out.push(svg);
  out.push(S(G.sphereOf(c, R, P), { tone: "hi", lit: true }));
  for (const [d, svg] of lenses) if (d >= 0) out.push(svg);
  const TF = G.frameAlong(v3.add(c, [0, 0, 1], R - 1.2), [0, 0, 1]);
  out.push(S(G.disc(0, 2, 3, TF, P), { tone: "mid" }) + `<path class="lens-glass" d="${G.circleOf(TF, 2, 2.2, P)}"/>`);
  out.push(`<g class="tally">${Dots([at(v3.add(c, [0.2, 0.98, -0.35], R + 0.2))], { size: 0.8, tone: "hi" })}</g>`);
  return out.join("");
}

// ---------- the grand piano and its bench ----------
function piano() {
  const body = [[-40, 116], [-40, 262], [-172, 262], [-186, 254], [-190, 240], [-178, 214], [-152, 186], [-122, 160], [-96, 138], [-74, 122], [-56, 116]];
  const out = [`<path class="iso-halo" d="${k.haloOf({ x: -190, y: 116, w: 150, d: 146, r: 40 }, 0, 6, P)}"/>`];
  for (const [x, y] of byDepth([[-52, 128], [-52, 250], [-170, 244]])) out.push(S(k.cylinder(x, y, 3.6, 0, 3, P, 18), { tone: "lo" }) + S(k.cylinder(x, y, 2.8, 3, 60, P, 18), { tone: "mid" }));
  out.push(S(k.slabOf({ x: -48, y: 182, w: 5, d: 14, r: 1 }, 6, 44, P, 2), { tone: "mid" }));
  out.push(S(k.extrude(body, 63, 26, P, { convex: false, bevel: 0.8 }), { tone: "mid", inner: L(k.ringSeam(body, 68, P), { tone: "faint" }) }));
  out.push(L(k.onTop(body.map(([x, y]) => [x + (x < -60 ? 3 : -3), y + (y > 200 ? -3 : 3)]), 89, P, true), { tone: "faint" }));
  // Keyboard: the key bed on the side facing the room, keys as lines from edge to edge.
  const kb = { x: -40, y: 122, w: 16, d: 134, r: 1 };
  out.push(S(k.slabOf(kb, 66, 6, P, 2, 0.4), { tone: "hi" }));
  const keys = [];
  for (let y = kb.y + 2.3; y < kb.y + kb.d; y += 2.3) keys.push(k.lineOnTop([kb.x, y], [kb.x + kb.w, y], 72, P));
  out.push(L(keys.join(""), { tone: "faint" }));
  out.push(S(k.slabOf({ x: -40, y: 122, w: 4, d: 134, r: 0.6 }, 72, 4, P, 2), { tone: "mid" }));
  // Bench.
  const bench = { x: -12, y: 160, w: 34, d: 56, r: 2 };
  for (const [x, y] of byDepth(k.corners(bench, 4))) out.push(S(k.cylinder(x, y, 1.8, 0, 44, P, 14), { tone: "mid" }));
  out.push(S(k.slabOf(bench, 44, 5, P, 3, 0.6), { tone: "mid" }));
  return out.join("");
}

// ---------- chairs and the seated audience ----------
const SEATED = { tilt: -3, R: { thigh: [88, 4], shin: [6, 180], foot: [68, 6] }, L: { thigh: [88, -4], shin: [6, 180], foot: [68, 6] }, RA: { upper: [22, 6], fore: [82, -14] }, LA: { upper: [22, 6], fore: [82, -14] } };
function chairUnit([x, y, h, occupied]) {
  const ax = GR.facingAxes(h);
  const fw = ax.fw, rt = ax.rt;
  const P2 = (r, f) => [x + rt[0] * r + fw[0] * f, y + rt[1] * r + fw[1] * f];
  const out = [`<path class="iso-halo" d="${k.haloOf({ x: x - 24, y: y - 24, w: 48, d: 48, r: 18 }, 0, 4, P)}"/>`];
  for (const [px, py] of byDepth([P2(-19, -18), P2(19, -18), P2(-19, 18), P2(19, 18)])) out.push(S(k.cylinder(px, py, 1.1, 0, 43, P, 12), { tone: "mid" }));
  const seatF = G.frameOf([x, y, 43], [0, 0, 1], [rt[0], rt[1], 0], [fw[0], fw[1], 0]);
  out.push(S(G.prismOf(seatF, [[-22, -21], [22, -21], [22, 21], [-22, 21]], 0, 3.2, P), { tone: "mid", className: "chair" }));
  let person = "";
  if (occupied) {
    const J = M.skeleton(M.flatten(SEATED));
    person = DN.mannequinSvg(J, P2(0, 2), P, k.iso, k.depthOf, h);
  }
  const back = [S(k.cylinder(...P2(-18, -20.5), 0.9, 46, 8, P, 10), { tone: "mid" }), S(k.cylinder(...P2(18, -20.5), 0.9, 46, 8, P, 10), { tone: "mid" })];
  const backF = G.frameOf([x, y, 0], [0, 0, 1], [rt[0], rt[1], 0], [fw[0], fw[1], 0]);
  back.push(S(G.prismOf(backF, [[-22, -23], [22, -23], [22, -20.5], [-22, -20.5]], 53, 82, P), { tone: "mid", className: "chair" }));
  return out.join("") + person + back.join("");
}

// ---------- the presenter with a microphone ----------
const MIC_POSE = { tilt: 0, nod: 4, R: { thigh: [3, 70], shin: [3, 70], foot: [66, 30] }, L: { thigh: [3, 110], shin: [3, 110], foot: [66, 40] }, RA: { upper: [42, 20], fore: [150, -52] }, LA: { upper: [26, 30], fore: [70, -60] } };
function presenter() {
  const J = M.skeleton(M.flatten(MIC_POSE));
  const w = GR.toWorld(J.wristR, PRESENTER.at, PRESENTER.heading);
  const hd = GR.toWorld(J.head, PRESENTER.at, PRESENTER.heading);
  const tip = v3.add(w, v3.unit(v3.sub(hd, w)), 13);
  const a = at(w), b = at(tip);
  const s = G.scaleOf(P);
  const micSvg = `<path class="mic" d="${capsule(a, b, 1.3 * s)}"/><path class="mic-head" d="${circle(b, 2.2 * s)}"/>`;
  return `<path class="iso-halo" d="${k.haloOf({ x: PRESENTER.at[0] - 20, y: PRESENTER.at[1] - 18, w: 40, d: 36, r: 18 }, 0, 3, P)}"/>` + DN.mannequinSvg(J, PRESENTER.at, P, k.iso, k.depthOf, PRESENTER.heading, 0, [{ at: tip, svg: micSvg, bias: 0.5 }]);
}
function capsule(a, b, s) {
  const dx = b[0] - a[0], dy = b[1] - a[1], L2 = Math.hypot(dx, dy) || 1;
  const nx = (-dy / L2) * s, ny = (dx / L2) * s, r = s.toFixed(2), f = (v) => v.toFixed(1);
  return `M${f(a[0] + nx)} ${f(a[1] + ny)}L${f(b[0] + nx)} ${f(b[1] + ny)}A${r} ${r} 0 0 0 ${f(b[0] - nx)} ${f(b[1] - ny)}L${f(a[0] - nx)} ${f(a[1] - ny)}A${r} ${r} 0 0 0 ${f(a[0] + nx)} ${f(a[1] + ny)}Z`;
}
function circle(c, s) {
  const r = s.toFixed(2), f = (v) => v.toFixed(1);
  return `M${f(c[0] - s)} ${f(c[1])}A${r} ${r} 0 1 0 ${f(c[0] + s)} ${f(c[1])}A${r} ${r} 0 1 0 ${f(c[0] - s)} ${f(c[1])}Z`;
}

// ---------- assemble ----------
const units = [
  ["piano", [-110, 190, 0], piano()],
  ["presenter", [...PRESENTER.at, 0], presenter()],
  ...CHAIRS.map((c, i) => [`chair${i}`, [c[0], c[1], 0], chairUnit(c)]),
].map(([name, c, svg]) => [depth(c), `<g data-slot="${name}" data-depth="${depth(c).toFixed(2)}">${svg}</g>`]).sort((a, b) => a[0] - b[0]);

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label: "경험확장 모듈 스튜디오: 큰 투명 LED 벽 앞 낮은 무대 중앙에 360° VR 카메라가 서 있고, 객석 앞에서 한 사람은 HMD와 컨트롤러로, 한 사람은 휴대폰으로 360° 공연장 영상을 보며 제자리에서 돈다. LED 벽 왼쪽 큰 화면에는 HMD 화면이, 오른쪽 작은 화면에는 휴대폰 화면이 미러링되어, 각자 돌아보는 방향을 따라 무대, 스피커, 객석이 지나간다.",
  body: [floor(), wall(), riser(), camera360(), `<g data-layer="free">${units.map((u) => u[1]).join("")}<g data-part="viewer-hmd"></g><g data-part="viewer-phone"></g></g>`],
});

const strip = (file) => readFileSync(join(HERE, file), "utf8").replace(/^import .*$/gm, "").replace(/^export /gm, "");
const live = `
${strip("../01.ballet-mirror/model.mjs")}
${strip("../01.ballet-mirror/dancer.mjs")}
${strip("gear.mjs")}
const P = ${JSON.stringify(P)};
const K = ${K};
const VIEWERS = ${JSON.stringify({ hmd: HMD, phone: PHONE })};
${readFileSync(join(HERE, "live.js"), "utf8")}
`;

const css = `<style>
.iso{--led-glass:#07090d;--pv-ceiling:#0d1018;--pv-floor:#1b1712;--pv-stage:#2a2118;--pv-lip:#4a3a2a;--pv-back:#14111c;--pv-wash:#6d4fa8;--pv-beam:#fff3d6;--pv-lamp:#fff2cc;--pv-fig:#e9d7c2;--pv-fig-edge:#fff4e6;--pv-fig-far:#bda88f;--pv-gear:#c9b79f;--pv-speaker:#0b0b0e;--pv-cone:#2a2a30;--pv-panel:#1d1a22;--pv-door:#120f15;--pv-exit:#30a46c;--pv-seat:#6d2a2e;--ui:#e8ecf3}
.iso[data-theme="light"]{--led-glass:#1b1f27}
.led-glass{fill:var(--led-glass)}
.iso-svg [data-led] path,.iso-svg [data-led] circle,.iso-svg [data-led] ellipse{vector-effect:none}
.led-strips{fill:none;stroke:#000;stroke-opacity:.26;stroke-width:1.3}
.led-gap{fill:none;stroke:#000;stroke-opacity:.5;stroke-width:.9}
.led-veil{fill:none}
.pv-ceiling{fill:var(--pv-ceiling)} .pv-floor{fill:var(--pv-floor)} .pv-stage{fill:var(--pv-stage)} .pv-stage-lip{fill:var(--pv-lip)}
.pv-backwall{fill:var(--pv-back)} .pv-wash{fill:url(#pv-wash-g)}
.pv-truss{fill:#3a3a44} .pv-beam{fill:var(--pv-beam);opacity:.07} .pv-lamp{fill:var(--pv-lamp)}
.pv-speaker{fill:var(--pv-speaker);stroke:#2c2c33;stroke-width:.8} .pv-cone{fill:var(--pv-cone)}
.pv-panel{fill:var(--pv-panel)} .pv-door{fill:var(--pv-door)} .pv-exit{fill:var(--pv-exit)}
.pv-seat{fill:var(--pv-seat)}
.pv-limbs{fill:none;stroke:var(--pv-fig);stroke-linecap:round;stroke-linejoin:round}
path.pv-rim{stroke:var(--pv-fig-edge)} circle.pv-rim{fill:var(--pv-fig-edge)} path.pv-far{stroke:var(--pv-fig-far)}
.pv-head{fill:var(--pv-fig)} .pv-floor{fill:var(--pv-floor)}
ellipse.pv-floor{fill:#000;opacity:.4}
.pv-gear{fill:none;stroke:var(--pv-gear);stroke-width:2.2;stroke-linecap:round} .pv-gear-fill{fill:var(--pv-gear)}
.pv-stand{fill:none;stroke:#8d8d96;stroke-width:1.2}
.ui-dial{fill:#000;fill-opacity:.45;stroke:var(--ui);stroke-width:.9}
.ui-wedge{fill:var(--ui);opacity:.85} .ui-hub{fill:var(--ui)}
.ui-title{fill:var(--ui);font-family:"Pretendard","Malgun Gothic",ui-sans-serif,sans-serif;font-weight:600}
.ui-badge{fill:var(--ui);font-family:var(--anatomy-mono);font-weight:700}
.ui-time{fill:var(--ui);font-family:var(--anatomy-mono)}
.ui-play{fill:var(--ui)}
.ui-track{fill:none;stroke:#fff;stroke-opacity:.3;stroke-width:1.6;stroke-linecap:round}
.ui-done{fill:none;stroke:#ff3b3b;stroke-width:1.6;stroke-linecap:round}
.lens-glass{fill:var(--anatomy-shade-0)}
.tally .iso-dots circle{fill:var(--anatomy-red)}
.gear-face{fill:var(--anatomy-shade-2)} .gear-face[data-shade="top"]{fill:var(--anatomy-lit-top)} .gear-face[data-shade="0"]{fill:var(--anatomy-shade-0)} .gear-face[data-shade="1"]{fill:var(--anatomy-shade-1)} .gear-face[data-shade="3"]{fill:var(--anatomy-shade-3)}
.gear-edge{fill:none;stroke:var(--anatomy-hi);stroke-width:var(--anatomy-weight);vector-effect:non-scaling-stroke;stroke-linejoin:round}
.phone-screen{fill:#6f9dff;opacity:.9}
.visor{fill:#111;opacity:.85}
.strap{fill:none;stroke:var(--anatomy-hi);stroke-width:2.2px;stroke-linecap:round;vector-effect:non-scaling-stroke}
.mic{fill:#2a2a2a;stroke:var(--anatomy-hi);stroke-width:var(--anatomy-weight);vector-effect:non-scaling-stroke}
.mic-head{fill:#555;stroke:var(--anatomy-hi);stroke-width:var(--anatomy-weight);vector-effect:non-scaling-stroke}
.mq-body{fill:var(--anatomy-shade-2)}
.mq-shade{fill:var(--anatomy-shade-0);opacity:.9}
.mq-shine{fill:var(--anatomy-lit-top)}
.mq-edge{fill:none;stroke:var(--anatomy-hi);stroke-width:var(--anatomy-weight);vector-effect:non-scaling-stroke;stroke-linejoin:round}
.iso-plate-corner{font-family:"Pretendard","Malgun Gothic","Apple SD Gothic Neo",ui-sans-serif,system-ui,sans-serif;font-size:11.5px;letter-spacing:0}
.ex-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
.iso-stage{touch-action:pan-y}
.iso-stage:focus{outline:none}
.iso-stage:focus-visible{outline:1px solid var(--anatomy-muted);outline-offset:6px}
</style>`;

const body = css + k.plateHtml({
  fig: "Fig 3",
  title: "경험확장 모듈 · 360° VR 공연장 체험",
  hint: "←→ HMD 체험자 돌리기 · ↑↓ 휴대폰 체험자 돌리기 · 스페이스 정지",
  readout: "",
  keys: [
    { mark: "lit", label: "무대 중앙 360° VR 카메라: 공연 현장을 사방으로 동시에 촬영" },
    { mark: "raised", label: "체험자 두 명: HMD와 컨트롤러, 휴대폰으로 제자리에서 돌며 공연장을 둘러봄" },
    { mark: "flat", label: "LED 다중 레이아웃: 왼쪽 큰 화면은 HMD 미러링, 오른쪽은 휴대폰 미러링" },
  ],
  caption: "실제 공연 현장을 무대 중앙의 360° VR 카메라로 촬영한 영상을, 학습자가 HMD와 휴대폰으로 체험한다. 체험자가 몸을 돌리면 보는 방향이 바뀌어 무대의 밴드, 옆쪽 스피커와 출입구, 뒤쪽 객석이 차례로 보이고, 투명 LED 벽에 두 사람의 화면이 함께 미러링되어 객석의 다른 학습자도 같은 장면을 본다. 화면 왼쪽 위 나침반은 지금 보고 있는 방향이다.",
  body: `<div class="iso-stage" tabindex="0" role="group" aria-label="경험확장 모듈. 좌우 화살표로 HMD 체험자를, 위아래 화살표로 휴대폰 체험자를 돌립니다.">${svg}<span class="ex-sr" role="status" aria-live="polite" data-status></span></div>`,
});

const name = theme === "light" ? "experience-360-light.html" : "experience-360.html";
writeFileSync(join(HERE, name), k.pageHtml({ title: "경험확장 모듈 · 360° VR 공연장 체험", theme, body, script: kitScript() + live, width: 760 }));
console.log("wrote", name, "K", K.toFixed(2), "sideScale", SIDE_S.toFixed(3));
void HORIZON;
