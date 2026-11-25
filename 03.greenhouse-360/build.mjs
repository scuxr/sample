// 공간탐색 모듈 · 온실 360° 촬영과 탐색 — anatomy figure build.
// node build.mjs [--light]
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as M from "../01.ballet-mirror/model.mjs";
import * as DN from "../01.ballet-mirror/dancer.mjs";
import * as GS from "./scene.mjs";

const SKILL = process.env.ANATOMY_SKILL || "C:/Users/user/.claude/skills/anatomy";
const k = await import(pathToFileURL(join(SKILL, "kit/iso-kit.mjs")).href);
const G = await import(pathToFileURL(join(SKILL, "kit/lathe.mjs")).href);
const { kitScript } = await import(pathToFileURL(join(SKILL, "scripts/inline-kit.mjs")).href);

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--light") ? "light" : "dark";
const { GH, BENCHES, PLANTS, PALMS, BASKETS, GH_DOOR } = GS;

// ---------- world (cm) ----------
const WIDTH = 600;
const HEIGHT = 420;
const FLOOR = { x: -300, y: -310, w: 1000, d: 600, r: 3 };
const FLOOR_H = 30;
const TV = { x0: 300, x1: 500, y: 40, z0: 92, z1: 206, depth: 7 };
const DESK = { x: 314, y: 150, w: 86, d: 46, r: 2 };
const DESK_Z = 72;
const SEAT_AT = [357, 214];
const HMD_AT = { at: [470, 196], heading: -12 };
const MAP = { c: [640, 140], z: 380, s: 0.5 };
const GHC = [(GH.x0 + GH.x1) / 2, (GH.y0 + GH.y1) / 2];
const MAIN_R = { x0: TV.x0 + 6, x1: TV.x1 - 6, y0: -(TV.z1 - 6), y1: -(TV.z0 + 6) };
const INSET_R = { x0: TV.x1 - 70, x1: TV.x1 - 12, y0: -(TV.z1 - 12), y1: -(TV.z1 - 50) };

const P = k.fitProjection([...k.boxCorners(FLOOR, -FLOOR_H, 0), [GH.x0, GH.y0, GH.ridge], [GH.x1, GH.y1, GH.ridge], ...[[GH.x0, GH.y0], [GH.x1, GH.y0], [GH.x1, GH.y1], [GH.x0, GH.y1]].map(([x, y]) => [MAP.c[0] + (x - (GH.x0 + GH.x1) / 2) * MAP.s, MAP.c[1] + (y - (GH.y0 + GH.y1) / 2) * MAP.s, MAP.z])], WIDTH, HEIGHT, { pad: 16, azimuth: 58 });

const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const Dots = (points, style) => k.dotsSvg(points, style);
const depth = (p) => k.depthOf(p, P);
const pathOf3 = (pts, closed = false) => k.pathOf(pts.map(at), closed);
const byDepth = (points) => [...points].sort((a, b) => depth([a[0], a[1], 0]) - depth([b[0], b[1], 0]));
const rectPath = (x0, y0, x1, y1, r = 0) => k.pathOf(k.roundedPlan({ x: x0, y: y0, w: x1 - x0, d: y1 - y0, r }, r ? 4 : 1), true);
const planeOf = (y) => k.sideMatrix([0, y], 0, P, "left");
const MIDY = (GH.y0 + GH.y1) / 2;

// ---------- floor ----------
function floor() {
  const out = [`<path class="iso-halo" d="${k.haloOf(FLOOR, -FLOOR_H, FLOOR_H, P)}"/>`];
  const seamsX = [];
  for (let x = FLOOR.x + 120; x < FLOOR.x + FLOOR.w - 20; x += 120) seamsX.push(x);
  const front = FLOOR.y + FLOOR.d, right = FLOOR.x + FLOOR.w;
  const seamYs = [FLOOR.y + 160, FLOOR.y + 320, FLOOR.y + 480];
  const inner = [...seamsX.map((x) => k.segment([x, front, 0], [x, front, -FLOOR_H], P)), ...seamYs.map((y) => k.segment([right, y, 0], [right, y, -FLOOR_H], P))].join("");
  out.push(S(k.slabOf(FLOOR, -FLOOR_H, FLOOR_H, P, 3, 1.2), { tone: "lo", inner: L(inner, { tone: "faint" }) + L(k.sideSeam(FLOOR, -FLOOR_H + 6, P, 3), { tone: "faint" }) }));
  out.push(L(seamsX.map((x) => k.lineOnTop([x, FLOOR.y], [x, front], 0, P)).join("") + seamYs.map((y) => k.lineOnTop([FLOOR.x, y], [right, y], 0, P)).join(""), { tone: "faint" }));
  return out.join("");
}

// ---------- the greenhouse ----------
const roofZ = (y) => GH.eave + (GH.ridge - GH.eave) * (1 - Math.abs(y - MIDY) / ((GH.y1 - GH.y0) / 2));
const bays = [];
for (let x = GH.x0; x <= GH.x1 + 0.1; x += GH.bay) bays.push(x);
function ghBack() {
  const out = [`<path class="iso-halo" d="${k.haloOf({ x: GH.x0, y: GH.y0, w: GH.x1 - GH.x0, d: GH.y1 - GH.y0, r: 4 }, 0, 10, P)}"/>`];
  // Gravel floor inside and a concrete curb round the house.
  out.push(S(k.slabOf({ x: GH.x0, y: GH.y0, w: GH.x1 - GH.x0, d: GH.y1 - GH.y0, r: 2 }, 0, 1, P, 2), { tone: "lo", flat: true, className: "gh-gravel" }));
  out.push(S(k.slabOf({ x: GH.x0 - 4, y: GH.y0 - 4, w: GH.x1 - GH.x0 + 8, d: 8, r: 1 }, 0, 18, P, 2, 0.4), { tone: "mid" }));
  out.push(S(k.slabOf({ x: GH.x0 - 4, y: GH.y0, w: 8, d: GH.y1 - GH.y0, r: 1 }, 0, 18, P, 2, 0.4), { tone: "mid" }));
  // Far glass: the back wall, the back roof slope and the far gable, as faint panes in their frames.
  const panes = [];
  for (let i = 0; i < bays.length - 1; i++) {
    const [xa, xb] = [bays[i], bays[i + 1]];
    panes.push(pathOf3([[xa, GH.y0, 18], [xb, GH.y0, 18], [xb, GH.y0, GH.eave], [xa, GH.y0, GH.eave]], true));
    panes.push(pathOf3([[xa, GH.y0, GH.eave], [xb, GH.y0, GH.eave], [xb, MIDY, GH.ridge], [xa, MIDY, GH.ridge]], true));
  }
  panes.push(pathOf3([[GH.x0, GH.y0, 18], [GH.x0, GH.y1, 18], [GH.x0, GH.y1, GH.eave], [GH.x0, MIDY, GH.ridge], [GH.x0, GH.y0, GH.eave]], true));
  out.push(`<path class="gh-glass" d="${panes.join("")}"/>`);
  // Far frame: back posts, the far gable's posts, back rafters, glazing bars.
  const bars = [];
  for (const x of bays) {
    bars.push(pathOf3([[x, GH.y0, 18], [x, GH.y0, GH.eave], [x, MIDY, GH.ridge]]));
  }
  bars.push(pathOf3([[GH.x0, GH.y0, GH.eave], [GH.x1, GH.y0, GH.eave]]));
  bars.push(pathOf3([[GH.x0, GH.y0, 96], [GH.x1, GH.y0, 96]]));
  for (const y of [GH.y0 + 70, MIDY, GH.y1 - 70]) bars.push(pathOf3([[GH.x0, y, 18], [GH.x0, y, roofZ(y)]]));
  bars.push(pathOf3([[GH.x0, GH.y0, GH.eave], [GH.x0, MIDY, GH.ridge], [GH.x0, GH.y1, GH.eave]]));
  bars.push(pathOf3([[GH.x0, GH.y0, 96], [GH.x0, GH.y1, 96]]));
  out.push(`<path class="gh-frame" d="${bars.join("")}"/>`);
  return out.join("");
}
function ghFront() {
  const out = [];
  out.push(S(k.slabOf({ x: GH.x0 - 4, y: GH.y1 - 4, w: GH.x1 - GH.x0 + 8, d: 8, r: 1 }, 0, 18, P, 2, 0.4), { tone: "mid" }));
  out.push(S(k.slabOf({ x: GH.x1 - 4, y: GH.y0, w: 8, d: GH_DOOR.y0 - GH.y0, r: 1 }, 0, 18, P, 2, 0.4), { tone: "mid" }));
  out.push(S(k.slabOf({ x: GH.x1 - 4, y: GH_DOOR.y1, w: 8, d: GH.y1 - GH_DOOR.y1, r: 1 }, 0, 18, P, 2, 0.4), { tone: "mid" }));
  // Near frame: front posts, front rafter halves, the ridge, eave, sill rail; the near gable with its door.
  const bars = [];
  for (const x of bays) bars.push(pathOf3([[x, MIDY, GH.ridge], [x, GH.y1, GH.eave], [x, GH.y1, 18]]));
  bars.push(pathOf3([[GH.x0, MIDY, GH.ridge], [GH.x1, MIDY, GH.ridge]]));
  bars.push(pathOf3([[GH.x0, GH.y1, GH.eave], [GH.x1, GH.y1, GH.eave]]));
  bars.push(pathOf3([[GH.x0, GH.y1, 96], [GH.x1, GH.y1, 96]]));
  for (const y of [GH.y0 + 70, GH_DOOR.y0, GH_DOOR.y1, GH.y1 - 30]) bars.push(pathOf3([[GH.x1, y, 18], [GH.x1, y, roofZ(y)]]));
  bars.push(pathOf3([[GH.x1, GH.y0, GH.eave], [GH.x1, MIDY, GH.ridge], [GH.x1, GH.y1, GH.eave]]));
  bars.push(pathOf3([[GH.x1, GH.y0, 96], [GH.x1, GH_DOOR.y0, 96]]) + pathOf3([[GH.x1, GH_DOOR.y1, 96], [GH.x1, GH.y1, 96]]));
  bars.push(pathOf3([[GH.x1, GH_DOOR.y0, 200], [GH.x1, GH_DOOR.y1, 200]]));
  out.push(`<path class="gh-frame gh-near" d="${bars.join("")}"/>`);
  // Roof vents along the ridge and an irrigation pipe under it, with drip lines over the benches.
  for (let x = GH.x0 + 40; x < GH.x1 - 30; x += 110) out.push(`<path class="gh-vent" d="${pathOf3([[x, MIDY, GH.ridge], [x + 40, MIDY, GH.ridge], [x + 40, MIDY + 22, GH.ridge - 3], [x, MIDY + 22, GH.ridge - 3]], true)}"/>`);
  // Glass on the near faces, very faint so the inside reads.
  const panes = [];
  for (let i = 0; i < bays.length - 1; i++) panes.push(pathOf3([[bays[i], MIDY, GH.ridge], [bays[i + 1], MIDY, GH.ridge], [bays[i + 1], GH.y1, GH.eave], [bays[i], GH.y1, GH.eave]], true));
  out.push(`<path class="gh-glass gh-glass-near" d="${panes.join("")}"/>`);
  return out.join("");
}
function irrigation() {
  const F = G.frameAlong([GH.x0 + 10, MIDY - 40, GH.ridge - 34], [1, 0, 0]);
  return S(G.disc(0, GH.x1 - GH.x0 - 20, 1.4, F, P), { tone: "mid" }) +
    L(BENCHES.flatMap((b) => [b.x0 + 40, (b.x0 + b.x1) / 2, b.x1 - 40].map((x) => pathOf3([[x, MIDY - 40, GH.ridge - 34], [x, (b.y0 + b.y1) / 2, b.z + 34]]))).join(""), { tone: "faint" }) +
    Dots(BENCHES.flatMap((b) => [b.x0 + 40, (b.x0 + b.x1) / 2, b.x1 - 40].map((x) => at([x, (b.y0 + b.y1) / 2, b.z + 34]))), { size: 0.5, tone: "mid" });
}
function bench(b, i) {
  const out = [];
  const legs = [[b.x0 + 6, b.y0 + 5], [b.x1 - 6, b.y0 + 5], [b.x0 + 6, b.y1 - 5], [b.x1 - 6, b.y1 - 5], [(b.x0 + b.x1) / 2, b.y0 + 5], [(b.x0 + b.x1) / 2, b.y1 - 5]];
  for (const [x, y] of byDepth(legs)) out.push(S(k.cylinder(x, y, 1.6, 0, b.z - 6, P, 12), { tone: "mid" }));
  out.push(S(k.slabOf({ x: b.x0, y: b.y0, w: b.x1 - b.x0, d: b.y1 - b.y0, r: 1.5 }, 26, 3, P, 2), { tone: "lo" }));
  out.push(S(k.slabOf({ x: b.x0, y: b.y0, w: b.x1 - b.x0, d: b.y1 - b.y0, r: 1.5 }, b.z - 6, 6, P, 2, 0.5), { tone: "mid", inner: L(k.sideSeam({ x: b.x0, y: b.y0, w: b.x1 - b.x0, d: b.y1 - b.y0, r: 1.5 }, b.z - 3, P, 2), { tone: "faint" }) }));
  // Plants on this bench, far to near: a pot and the foliage above it.
  const mine = PLANTS.map((p, j) => [p, j]).filter(([[x, y]]) => x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1);
  for (const [[x, y, r, kind]] of byDepth(mine.map(([p, j]) => [p[0], p[1], [p, j]])).map((q) => q[2])) {
    out.push(S(G.solidOf([[0, 4.6], [9, 5.8]], G.frameAlong([x, y, b.z], [0, 0, 1]), P), { tone: "mid" }));
    const cls = kind === 1 ? "gh-leaf gh-bloom" : kind === 2 ? "gh-leaf gh-leaf2" : "gh-leaf";
    for (const [dx, dz, rr] of [[-0.4, 0.6, 0.7], [0.4, 0.6, 0.7], [0, 1.0, 0.75]]) out.push(S(G.sphereOf([x + dx * r, y, b.z + 8 + dz * r], r * rr, P), { tone: "mid", className: cls }));
    if (kind === 1) out.push(S(G.sphereOf([x + r * 0.3, y + 2, b.z + 9 + r * 1.55], r * 0.28, P), { tone: "mid", className: "gh-flower" }));
  }
  return `<g data-slot="bench${i}" data-depth="${depth([(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, 0]).toFixed(2)}">${out.join("")}</g>`;
}
function palm([x, y, h], i) {
  const out = [`<path class="iso-halo" d="${k.haloOf({ x: x - 16, y: y - 16, w: 32, d: 32, r: 16 }, 0, 3, P)}"/>`];
  out.push(S(G.solidOf([[0, 11], [26, 14]], G.frameAlong([x, y, 0], [0, 0, 1]), P), { tone: "mid" }));
  out.push(S(k.cylinder(x, y, 2.6, 26, h - 26, P, 14), { tone: "mid", inner: L([60, 90, 120].filter((z) => z < h).map((z) => k.sideArc(x, y, 2.6, z, P, 12)).join(""), { tone: "faint" }) }));
  const fronds = [];
  for (let j = 0; j < 7; j++) {
    const a = ((j * 360) / 7 + i * 20) * (Math.PI / 180);
    const tip = [x + Math.cos(a) * 38, y + Math.sin(a) * 38, h - 20];
    fronds.push([depth(tip), S(G.solidOf([[0, 0.8], [8, 3.2, 1], [26, 2.6, 1], [40, 0.4]], G.frameAlong([x, y, h], [Math.cos(a), Math.sin(a), -0.5]), P), { tone: "mid", className: "gh-leaf" })]);
  }
  fronds.sort((p, q) => p[0] - q[0]);
  out.push(...fronds.map((f) => f[1]));
  return `<g data-slot="palm${i}" data-depth="${depth([x, y, 0]).toFixed(2)}">${out.join("")}</g>`;
}
function basket([x, y, z], i) {
  const svg = L(pathOf3([[x, y, roofZ(y)], [x, y, z + 8]]), { tone: "lo" }) + S(G.solidOf([[0, 5], [8, 9]], G.frameAlong([x, y, z], [0, 0, 1]), P), { tone: "mid" }) + S(G.sphereOf([x, y, z + 14], 12, P), { tone: "mid", className: "gh-leaf" });
  return `<g data-slot="basket${i}" data-depth="${(depth([x, y, 0]) + 0.5).toFixed(2)}">${svg}</g>`;
}

// ---------- the viewing corner ----------
function tv() {
  const out = [];
  // Rolling stand: a base bar on casters, two uprights, the screen in its bezel.
  const base = { x: TV.x0 + 30, y: TV.y - 26, w: TV.x1 - TV.x0 - 60, d: 12, r: 2 };
  out.push(`<path class="iso-halo" d="${k.haloOf({ x: base.x, y: base.y - 10, w: base.w, d: 32, r: 6 }, 0, 4, P)}"/>`);
  for (const x of [base.x + 8, base.x + base.w - 8]) for (const y of [base.y - 8, base.y + base.d + 8]) out.push(S(k.cylinder(x, y, 2.6, 0, 4, P, 14), { tone: "lo" }));
  for (const x of [base.x + 8, base.x + base.w - 8]) out.push(S(k.slabOf({ x: x - 4, y: base.y - 10, w: 8, d: base.d + 20, r: 2 }, 4, 4, P, 2, 0.4), { tone: "mid" }));
  out.push(S(k.slabOf(base, 8, 4, P, 2, 0.4), { tone: "mid" }));
  for (const x of [base.x + 30, base.x + base.w - 30]) out.push(S(k.slabOf({ x: x - 3, y: base.y + 2, w: 6, d: 6, r: 1 }, 12, TV.z0 - 2, P, 2), { tone: "mid" }));
  out.push(S(k.slabOf({ x: TV.x0, y: TV.y - TV.depth, w: TV.x1 - TV.x0, d: TV.depth, r: 1.5 }, TV.z0, TV.z1 - TV.z0, P, 2, 0.5), { tone: "mid" }));
  const face = planeOf(TV.y);
  const glass = rectPath(TV.x0 + 4, -(TV.z1 - 4), TV.x1 - 4, -(TV.z0 + 4), 0.8);
  out.push(
    `<g transform="${face}" data-tv>`,
    `<clipPath id="tv-main"><path d="${rectPath(MAIN_R.x0, MAIN_R.y0, MAIN_R.x1, MAIN_R.y1, 0.6)}"/></clipPath>`,
    `<clipPath id="tv-inset"><path d="${rectPath(INSET_R.x0, INSET_R.y0, INSET_R.x1, INSET_R.y1, 0.6)}"/></clipPath>`,
    `<path class="tv-glass" d="${glass}"/>`,
    `<g clip-path="url(#tv-main)"><g data-view="main"></g></g>`,
    `<g data-standby><path class="tv-standby" d="${rectPath(MAIN_R.x0, MAIN_R.y0, MAIN_R.x1, MAIN_R.y1, 0.6)}"/><text class="ui-title" x="${(TV.x0 + TV.x1) / 2}" y="${-(TV.z0 + TV.z1) / 2}" font-size="7" text-anchor="middle">360° 영상 촬영 중 · 업로드 대기</text></g>`,
    `<g data-insetbox><path class="tv-inset-frame" d="${rectPath(INSET_R.x0 - 1.2, INSET_R.y0 - 1.2, INSET_R.x1 + 1.2, INSET_R.y1 + 1.2, 1)}"/><g clip-path="url(#tv-inset)"><g data-view="inset"></g></g>`,
    `<text class="ui-small" x="${INSET_R.x0 + 2}" y="${INSET_R.y0 + 6}" font-size="4.2">HMD 시점</text></g>`,
    `<g transform="translate(${MAIN_R.x0 + 12} ${MAIN_R.y0 + 12})" data-ui><circle class="ui-dial" r="8"/><path class="ui-wedge" data-wedge d="M0 0L-4.2 -6.4A7.6 7.6 0 0 1 4.2 -6.4Z"/><circle class="ui-hub" r="1.2"/></g>`,
    `<text class="ui-title" data-ui x="${MAIN_R.x0 + 24}" y="${MAIN_R.y0 + 14.5}" font-size="5.6">온실 360° 영상 · 마우스로 둘러보기</text>`,
    `<path class="ui-track" data-ui d="M${MAIN_R.x0 + 10} ${MAIN_R.y1 - 7}H${MAIN_R.x1 - 34}"/><path class="ui-done" data-done d="M${MAIN_R.x0 + 10} ${MAIN_R.y1 - 7}H${MAIN_R.x0 + 10}"/>`,
    `<text class="ui-time" data-time x="${MAIN_R.x1 - 4}" y="${MAIN_R.y1 - 5}" font-size="4.6" text-anchor="end">0:00</text>`,
    `</g>`,
    `<path class="iso-line" data-tone="lo" transform="${face}" d="${glass}"/>`,
  );
  out.push(`<g class="tv-led">${Dots([at([TV.x1 - 8, TV.y, TV.z0 + 2])], { size: 0.6, tone: "hi" })}</g>`);
  return `<g data-slot="tv" data-depth="${depth([(TV.x0 + TV.x1) / 2, TV.y - 20, 0]).toFixed(2)}">${out.join("")}</g>`;
}
const SEATED = { tilt: 4, nod: 6, R: { thigh: [88, 6], shin: [8, 180], foot: [68, 6] }, L: { thigh: [88, -6], shin: [8, 180], foot: [68, 6] }, RA: { upper: [40, 12], fore: [88, 4] }, LA: { upper: [34, 4], fore: [86, -18] } };
function deskUnit() {
  const out = [`<path class="iso-halo" d="${k.haloOf({ x: DESK.x - 6, y: DESK.y - 4, w: DESK.w + 12, d: DESK.d + 64, r: 10 }, 0, 4, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(DESK, 4))) out.push(S(k.cylinder(x, y, 1.8, 0, DESK_Z - 3, P, 14), { tone: "mid" }));
  out.push(S(k.slabOf(DESK, DESK_Z - 3, 3, P, 2, 0.6), { tone: "mid" }));
  // Keyboard and mouse.
  out.push(S(k.slabOf({ x: DESK.x + 22, y: DESK.y + 24, w: 34, d: 11, r: 1 }, DESK_Z, 1.4, P, 2), { tone: "mid" }));
  const keys = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 11; c++) keys.push(k.planOutline({ x: DESK.x + 24 + c * 2.8, y: DESK.y + 25.6 + r * 2.9, w: 2.2, d: 2.2, r: 0.3 }, DESK_Z + 1.4, P, 1));
  out.push(L(keys.join(""), { tone: "faint" }));
  out.push(S(k.slabOf({ x: DESK.x + 64, y: DESK.y + 28, w: 6, d: 9, r: 3 }, DESK_Z, 2, P, 3), { tone: "hi", lit: false }));
  // Chair, learner, chair back.
  const [sx, sy] = SEAT_AT;
  for (const [x, y] of byDepth([[sx - 18, sy - 16], [sx + 18, sy - 16], [sx - 18, sy + 16], [sx + 18, sy + 16]])) out.push(S(k.cylinder(x, y, 1.1, 0, 43, P, 12), { tone: "mid" }));
  out.push(S(k.slabOf({ x: sx - 21, y: sy - 20, w: 42, d: 40, r: 3 }, 43, 3, P, 3, 0.4), { tone: "mid" }));
  out.push(`<g data-part="desk-learner">${DN.mannequinSvg(M.skeleton(M.flatten(SEATED)), [sx, sy + 2], P, k.iso, k.depthOf, 0)}</g>`);
  out.push(S(k.cylinder(sx - 17, sy + 19, 0.9, 46, 8, P, 10), { tone: "mid" }) + S(k.cylinder(sx + 17, sy + 19, 0.9, 46, 8, P, 10), { tone: "mid" }));
  out.push(S(k.slabOf({ x: sx - 21, y: sy + 18, w: 42, d: 2.6, r: 1 }, 54, 28, P, 2, 0.4), { tone: "mid" }));
  return `<g data-slot="desk" data-depth="${depth([DESK.x + DESK.w / 2, DESK.y + DESK.d / 2, 0]).toFixed(2)}">${out.join("")}</g>`;
}

// ---------- the space as remembered: a floating plan above the learners ----------
const mapAt = ([x, y], z = MAP.z) => [MAP.c[0] + (x - GHC[0]) * MAP.s, MAP.c[1] + (y - GHC[1]) * MAP.s, z];
function memoryMap() {
  const out = [];
  const outline = [[GH.x0, GH.y0], [GH.x1, GH.y0], [GH.x1, GH.y1], [GH.x0, GH.y1]].map((p) => mapAt(p));
  // A soft glow under the plan, and the plan's own faint floor.
  out.push(`<path class="mem-glow" d="${pathOf3(outline, true)}"/>`);
  out.push(`<path class="mem-floor" d="${pathOf3(outline, true)}"/>`);
  out.push(`<path class="mem-line" d="${pathOf3(outline, true)}"/>`);
  out.push(BENCHES.map((b, i) => `<path class="mem-bench" data-mem-bench="${i}" d="${pathOf3([[b.x0, b.y0], [b.x1, b.y0], [b.x1, b.y1], [b.x0, b.y1]].map((p) => mapAt(p)), true)}"/>`).join(""));
  out.push(PLANTS.map(([x, y, r], i) => { const c = at(mapAt([x, y], MAP.z + 0.5)); return `<circle class="mem-plant" data-mem-plant="${i}" cx="${c[0].toFixed(1)}" cy="${c[1].toFixed(1)}" r="${Math.max(0.9, r * MAP.s * 0.55).toFixed(2)}"/>`; }).join(""));
  out.push(PALMS.map(([x, y], i) => { const c = at(mapAt([x, y], MAP.z + 0.5)); return `<circle class="mem-palm" data-mem-palm="${i}" cx="${c[0].toFixed(1)}" cy="${c[1].toFixed(1)}" r="2.6"/>`; }).join(""));
  out.push(`<path class="mem-path" data-mem-path d=""/>`);
  out.push(`<g data-mem-cam></g>`);
  // Threads from each learner's head up to the plan: the space they are rebuilding in their mind.
  return `<g class="mem" data-mem>${out.join("")}</g>`;
}

// ---------- assemble ----------
const ghSlots = [...BENCHES.map(bench), ...PALMS.map(palm), ...BASKETS.map(basket)].map((svg) => [Number(/data-depth="([-\d.]+)"/.exec(svg)[1]), svg]).sort((a, b) => a[0] - b[0]);
const roomSlots = [[0, tv()], [0, deskUnit()]].map(([, svg]) => [Number(/data-depth="([-\d.]+)"/.exec(svg)[1]), svg]).sort((a, b) => a[0] - b[0]);

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label: "공간탐색 모듈: 왼쪽 뒤 유리 온실 안을 촬영자가 360 카메라를 머리 위로 들고 통로를 따라 걸으며 촬영한다. 오른쪽 앞에서는 학습자 두 명이 그 영상을 큰 모니터와 HMD로 돌려 보며 온실을 탐색하고, 머리 위에 떠오른 '기억 속 온실' 평면도에 지나온 경로와 본 식물들이 하나씩 채워진다.",
  body: [
    floor(),
    ghBack(),
    `<g data-layer="gh">${ghSlots.map((s) => s[1]).join("")}<g data-part="operator"></g></g>`,
    irrigation(),
    ghFront(),
    `<g data-layer="room">${roomSlots.map((s) => s[1]).join("")}<g data-part="hmd-learner"></g></g>`,
    memoryMap(),
    `<g data-part="threads"></g>`,
  ],
});

const strip = (file) => readFileSync(join(HERE, file), "utf8").replace(/^import .*$/gm, "").replace(/^export /gm, "");
const live = `
${strip("../01.ballet-mirror/model.mjs")}
${strip("../01.ballet-mirror/dancer.mjs")}
${strip("../04.experience-360/gear.mjs")}
${strip("scene.mjs")}
const P = ${JSON.stringify(P)};
const MAIN_R = ${JSON.stringify(MAIN_R)};
const INSET_R = ${JSON.stringify(INSET_R)};
const MAP = ${JSON.stringify(MAP)};
const GHC = ${JSON.stringify(GHC)};
const HMD_AT = ${JSON.stringify(HMD_AT)};
const SEAT_HEAD = ${JSON.stringify((() => { const J = M.skeleton(M.flatten(SEATED)); return [SEAT_AT[0] - J.head[0], SEAT_AT[1] + 2 - J.head[1], J.head[2] + 14]; })())};
${readFileSync(join(HERE, "live.js"), "utf8")}
`;

const css = `<style>
.iso{--gv-sky:#cfe3e8;--gv-sky2:#eaf3f2;--gv-ground:#8c7b66;--gv-frame:#f4f6f7;--gv-bench:#6f6a63;--gv-bench-side:#4f4b46;--gv-pot:#b8693e;--gv-leaf:#3f8f4e;--gv-leaf2:#6aa84f;--gv-flower:#4f9a52;--gv-bloom:#e86a8a;--gv-trunk:#7a5c3c;--gv-frond:#2f7a43;--mem:#4f7ee0;--mem-soft:#6f9dff;--leaf-0:#8fbf86;--leaf-1:#acd3a2;--leaf-2:#c8e4bf;--leaf-edge:#4b7f48;--bloom:#f1a9b9}
.iso[data-theme="dark"]{--leaf-0:#1d3a22;--leaf-1:#26492b;--leaf-2:#305a35;--leaf-edge:#6fae73;--bloom:#8a3d52}
.iso[data-theme="dark"]{--mem:#7aa6ff;--mem-soft:#9cc0ff}
.gh-glass{fill:#9fc6d0;fill-opacity:.12;stroke:none}
.gh-glass-near{fill-opacity:.05}
.gh-frame{fill:none;stroke:var(--anatomy-lo);stroke-width:1px;vector-effect:non-scaling-stroke;stroke-linejoin:round}
.gh-near{stroke:var(--anatomy-mid)}
.gh-leaf .iso-fill,.gh-leaf .iso-shade,.gh-leaf .iso-top{fill:var(--leaf-1);stroke:var(--leaf-1)} .gh-leaf .iso-shade[data-shade="0"]{fill:var(--leaf-0);stroke:var(--leaf-0)} .gh-leaf .iso-shade[data-shade="3"],.gh-leaf .iso-top{fill:var(--leaf-2);stroke:var(--leaf-2)} .gh-leaf .iso-edge{stroke:var(--leaf-edge)}
.gh-leaf2 .iso-fill,.gh-leaf2 .iso-shade,.gh-leaf2 .iso-top{fill:var(--leaf-2);stroke:var(--leaf-2)}
.gh-flower .iso-fill,.gh-flower .iso-shade,.gh-flower .iso-top{fill:var(--bloom);stroke:var(--bloom)} .gh-flower .iso-edge{stroke:var(--leaf-edge)}
.gh-vent{fill:var(--anatomy-shade-1);stroke:var(--anatomy-mid);stroke-width:.6px;vector-effect:non-scaling-stroke}
.gh-gravel .iso-fill{fill:var(--anatomy-shade-1)}
.tv-glass{fill:#0b0e13}
.tv-standby{fill:#141a22}
.tv-inset-frame{fill:#0b0e13;stroke:#fff;stroke-opacity:.6;stroke-width:.5}
.iso-svg [data-tv] path,.iso-svg [data-tv] circle,.iso-svg .mem path,.iso-svg .mem circle{vector-effect:none}
.gv-sky{fill:var(--gv-sky)} .gv-ground{fill:var(--gv-ground)}
.gv-frame{fill:none;stroke:var(--gv-frame);stroke-linecap:round} .gv-rail{fill:none;stroke:#d6dde0;stroke-linecap:round}
.gv-bench{fill:var(--gv-bench)} .gv-bench-side{fill:var(--gv-bench-side)}
.gv-pot{fill:var(--gv-pot)} .gv-leaf{fill:var(--gv-leaf)} .gv-leaf2{fill:var(--gv-leaf2)} .gv-flower{fill:var(--gv-flower)} .gv-bloom{fill:var(--gv-bloom)}
.gv-trunk{fill:none;stroke:var(--gv-trunk);stroke-linecap:round} .gv-frond{fill:none;stroke:var(--gv-frond);stroke-linecap:round}
.gv-wire{fill:none;stroke:#555}
.ui-dial{fill:#000;fill-opacity:.4;stroke:#fff;stroke-width:.6}
.ui-wedge{fill:#fff;opacity:.85} .ui-hub{fill:#fff}
.ui-title{fill:#fff;font-family:"Pretendard","Malgun Gothic",ui-sans-serif,sans-serif;font-weight:600;paint-order:stroke;stroke:#000;stroke-opacity:.35;stroke-width:.8}
.ui-small{fill:#fff;font-family:"Pretendard","Malgun Gothic",sans-serif;font-weight:600}
.ui-time{fill:#fff;font-family:var(--anatomy-mono)}
.ui-track{fill:none;stroke:#fff;stroke-opacity:.4;stroke-width:1.2;stroke-linecap:round}
.ui-done{fill:none;stroke:#ff3b3b;stroke-width:1.2;stroke-linecap:round}
.tv-led .iso-dots circle{fill:var(--anatomy-green)}
.mem-glow{fill:var(--mem-soft);opacity:.16;filter:blur(6px)}
.mem-floor{fill:var(--mem-soft);fill-opacity:.07}
.mem-line{fill:none;stroke:var(--mem);stroke-width:.8;stroke-dasharray:3 2.4}
.mem-bench{fill:var(--mem-soft);fill-opacity:0;stroke:var(--mem);stroke-opacity:.35;stroke-width:.6;stroke-dasharray:2 2}
.mem-plant,.mem-palm{fill:var(--mem);opacity:0}
.mem-path{fill:none;stroke:var(--mem);stroke-width:1.4;stroke-linecap:round;stroke-linejoin:round}
.mem-cam{fill:var(--mem);stroke:#fff;stroke-width:.5}
.mem-cone{fill:var(--mem-soft);opacity:.35}
.thread{fill:none;stroke:var(--mem);stroke-width:.9px;stroke-dasharray:1.5 3;vector-effect:non-scaling-stroke;stroke-linecap:round}
.thread-dot{fill:var(--mem)}
.pole{fill:var(--anatomy-shade-2);stroke:var(--anatomy-hi);stroke-width:var(--anatomy-weight);vector-effect:non-scaling-stroke}
.cam-lens{fill:#111}
.rec .cam-tally{fill:var(--anatomy-red)} .cam-tally{fill:var(--anatomy-shade-1)}
.gear-face{fill:var(--anatomy-shade-2)} .gear-face[data-shade="top"]{fill:var(--anatomy-lit-top)} .gear-face[data-shade="0"]{fill:var(--anatomy-shade-0)} .gear-face[data-shade="1"]{fill:var(--anatomy-shade-1)} .gear-face[data-shade="3"]{fill:var(--anatomy-shade-3)}
.gear-edge{fill:none;stroke:var(--anatomy-hi);stroke-width:var(--anatomy-weight);vector-effect:non-scaling-stroke;stroke-linejoin:round}
.strap{fill:none;stroke:var(--anatomy-hi);stroke-width:2.2px;stroke-linecap:round;vector-effect:non-scaling-stroke}
.mq-body{fill:var(--anatomy-shade-2)}
.mq-shade{fill:var(--anatomy-shade-0);opacity:.9}
.mq-shine{fill:var(--anatomy-lit-top)}
.mq-edge{fill:none;stroke:var(--anatomy-hi);stroke-width:var(--anatomy-weight);vector-effect:non-scaling-stroke;stroke-linejoin:round}
.iso-plate-corner{font-family:"Pretendard","Malgun Gothic","Apple SD Gothic Neo",ui-sans-serif,system-ui,sans-serif;font-size:11.5px;letter-spacing:0}
.gh-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
.iso-stage{touch-action:pan-y}
.iso-stage:focus{outline:none}
.iso-stage:focus-visible{outline:1px solid var(--anatomy-muted);outline-offset:6px}
</style>`;

const body = css + k.plateHtml({
  fig: "Fig 4",
  title: "공간탐색 모듈 · 온실 360° 촬영과 탐색",
  hint: "←→ 모니터 시점 돌리기 · 스페이스 정지",
  readout: "",
  keys: [
    { mark: "raised", label: "① 촬영: 촬영자가 360 카메라를 머리 위로 들고 온실 통로를 직접 걸으며 촬영" },
    { mark: "flat", label: "② 탐색: 큰 모니터(마우스로 둘러보기)와 HMD로 같은 영상을 돌려 보며 공간을 살핌" },
    { mark: "blue", label: "③ 떠올리기: 영상에서 본 순서대로 머릿속 온실 평면도에 경로와 식물이 채워짐" },
  ],
  caption: "복잡하고 직접 들어가 보기 어려운 공간(온실)을 360 카메라로 걸으며 촬영해 두고, 나중에 교실에서 큰 모니터와 HMD로 돌려 보며 탐색한다. 모니터의 화면은 카메라가 그 순간 지나던 자리에서 본 실제 시점이고, 학습자는 화면을 돌려 벤치와 화초, 야자, 매달린 화분의 배치를 확인한다. 영상이 진행될수록 학습자의 머릿속에 온실의 평면과 지나온 경로가 그려지고, 본 식물이 하나씩 자리를 잡는다.",
  body: `<div class="iso-stage" tabindex="0" role="group" aria-label="공간탐색 모듈. 좌우 화살표로 모니터 시점을 돌리고 스페이스로 정지합니다.">${svg}<span class="gh-sr" role="status" aria-live="polite" data-status></span></div>`,
});

const name = theme === "light" ? "greenhouse-360-light.html" : "greenhouse-360.html";
writeFileSync(join(HERE, name), k.pageHtml({ title: "공간탐색 모듈 · 온실 360° 촬영과 탐색", theme, body, script: kitScript() + live, width: 760 }));
console.log("wrote", name, "path", GS.pathLength().toFixed(0), "cm");
