// 온실 라이브 강의 · Zoom — anatomy figure build.
// node build.mjs [--light]
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as M from "../01.ballet-mirror/model.mjs";
import * as DN from "../01.ballet-mirror/dancer.mjs";
import * as PE from "./people.mjs";

const SKILL = process.env.ANATOMY_SKILL || "C:/Users/user/.claude/skills/anatomy";
const k = await import(pathToFileURL(join(SKILL, "kit/iso-kit.mjs")).href);
const G = await import(pathToFileURL(join(SKILL, "kit/lathe.mjs")).href);
const { kitScript } = await import(pathToFileURL(join(SKILL, "scripts/inline-kit.mjs")).href);

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--light") ? "light" : "dark";

const WIDTH = 600;
const HEIGHT = 440;
const ISL_H = 18;
const GI = { x: -440, y: -400, w: 420, d: 368, r: 4 }; // greenhouse studio
const HI = { x: 0, y: -400, w: 460, d: 368, r: 4 }; // hall with the big screen
const PI_ = PE.PLACES.map((p) => ({ x: p.x0, y: PE.ISLAND.y0, w: PE.ISLAND.w, d: PE.ISLAND.d, r: 4 }));
const SCREEN = { y: -381, x0: 30, x1: 430, z0: 60, z1: 285 };
const SCR_R = { x0: SCREEN.x0, x1: SCREEN.x1, y0: -SCREEN.z1, y1: -SCREEN.z0 };
const CAM = { at: [-210, -70], z: 140, target: [-210, -168, 128] };

const P = k.fitProjection(
  [...[GI, HI, ...PI_].flatMap((p) => k.boxCorners(p, -ISL_H, 0)), [GI.x, GI.y, 280], [HI.x + HI.w, HI.y, 300]],
  WIDTH, HEIGHT, { pad: 14, azimuth: 56 },
);
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const Dots = (points, style) => k.dotsSvg(points, style);
const depth = (p) => k.depthOf(p, P);
const planeOf = (y) => k.sideMatrix([0, y], 0, P, "left");
const pathOf3 = (pts, closed = false) => k.pathOf(pts.map(at), closed);
const rectPath = (x0, y0, x1, y1, r = 0) => k.pathOf(k.roundedPlan({ x: x0, y: y0, w: x1 - x0, d: y1 - y0, r }, r ? 4 : 1), true);
const byDepth = (points) => [...points].sort((a, b) => depth([a[0], a[1], 0]) - depth([b[0], b[1], 0]));
const v3 = {
  add: (a, b, s = 1) => [a[0] + b[0] * s, a[1] + b[1] * s, a[2] + b[2] * s],
  sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  unit: (a) => { const n = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / n, a[1] / n, a[2] / n]; },
  cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
};

// An island: a slab with a soft shadow and a seam round its skirt; each place stands on its own.
function island(plan, cls = "") {
  return `<path class="iso-halo" d="${k.haloOf(plan, -ISL_H, ISL_H, P)}"/>` + S(k.slabOf(plan, -ISL_H, ISL_H, P, 3, 1), { tone: "lo", className: cls, inner: L(k.sideSeam(plan, -ISL_H + 5, P, 3), { tone: "faint" }) });
}
const tag = (plan, text) => {
  // A small engraved plate on the island's front edge naming the place.
  const x = plan.x + 12, y = plan.y + plan.d - 9;
  return S(k.slabOf({ x, y, w: 64, d: 7, r: 1 }, 0, 0.6, P, 2), { tone: "lo", crease: "none" }) + k.faceTextSvg(k.topMatrix([x + 4, y + 5], 0.6, P), text, { size: 4.2, tone: "mid" });
};

// ---------- 1. the greenhouse studio ----------
function greenhouse() {
  const out = [island(GI)];
  const x0 = GI.x + 10, x1 = GI.x + GI.w - 50, yb = GI.y + 14, yf = -250;
  const roof = (y) => 270 - ((y - yb) / (yf - yb)) * 40;
  // Glass: back wall and the left end, faint panes in their frames.
  const panes = [];
  for (let x = x0; x < x1 - 1; x += 60) panes.push(pathOf3([[x, yb, 0], [Math.min(x + 60, x1), yb, 0], [Math.min(x + 60, x1), yb, 270], [x, yb, 270]], true));
  panes.push(pathOf3([[x0, yb, 0], [x0, yf, 0], [x0, yf, roof(yf)], [x0, yb, 270]], true));
  out.push(`<path class="gh-glass" d="${panes.join("")}"/>`);
  const bars = [];
  for (let x = x0; x <= x1 + 0.1; x += 60) bars.push(pathOf3([[x, yb, 0], [x, yb, 270], [x, yf, roof(yf)]]));
  bars.push(pathOf3([[x0, yb, 270], [x1, yb, 270]]), pathOf3([[x0, yf, roof(yf)], [x1, yf, roof(yf)]]), pathOf3([[x0, yb, 110], [x1, yb, 110]]));
  for (const y of [yb + 60, yf]) bars.push(pathOf3([[x0, y, 0], [x0, y, roof(y)]]));
  bars.push(pathOf3([[x0, yb, 110], [x0, yf, 110]]));
  out.push(`<path class="gh-frame" d="${bars.join("")}"/>`);
  // Benches with plants, a palm, hanging baskets.
  const bench = (b) => {
    const r = [];
    for (const [x, y] of byDepth([[b.x + 6, b.y + 5], [b.x + b.w - 6, b.y + 5], [b.x + 6, b.y + b.d - 5], [b.x + b.w - 6, b.y + b.d - 5]])) r.push(S(k.cylinder(x, y, 1.5, 0, 76, P, 10), { tone: "mid" }));
    r.push(S(k.slabOf(b, 76, 6, P, 2, 0.5), { tone: "mid" }));
    const pts = [];
    for (let x = b.x + 16; x < b.x + b.w - 8; x += 30) pts.push([x, b.y + b.d / 2 + ((x / 30) % 2 ? 6 : -6)]);
    for (const [x, y] of byDepth(pts)) {
      r.push(S(G.solidOf([[0, 4.6], [9, 5.8]], G.frameAlong([x, y, 82], [0, 0, 1]), P), { tone: "mid" }));
      for (const [dx, dz, rr] of [[-4, 6, 7], [4, 6, 7], [0, 12, 8]]) r.push(S(G.sphereOf([x + dx, y, 82 + 6 + dz], rr, P), { tone: "mid", className: "leaf" }));
    }
    return r.join("");
  };
  out.push(bench({ x: x0 + 6, y: yb + 6, w: x1 - x0 - 16, d: 38, r: 1 }));
  out.push(bench({ x: x0 + 50, y: yb + 80, w: x1 - x0 - 110, d: 34, r: 1 }));
  for (const x of [x0 + 60, x0 + 180]) {
    const y = (yb + yf) / 2 + 20;
    out.push(L(pathOf3([[x, y, roof(y)], [x, y, 200]]), { tone: "lo" }) + S(G.solidOf([[0, 5], [8, 9]], G.frameAlong([x, y, 192], [0, 0, 1]), P), { tone: "mid" }) + S(G.sphereOf([x, y, 206], 12, P), { tone: "mid", className: "leaf" }));
  }
  const palm = [x1 - 20, yf + 30];
  out.push(S(G.solidOf([[0, 11], [26, 14]], G.frameAlong([palm[0], palm[1], 0], [0, 0, 1]), P), { tone: "mid" }));
  out.push(S(k.cylinder(palm[0], palm[1], 2.6, 26, 120, P, 14), { tone: "mid" }));
  for (let j = 0; j < 7; j++) {
    const a = (j * 360 / 7) * Math.PI / 180;
    out.push(S(G.solidOf([[0, 0.8], [8, 3.2, 1], [26, 2.6, 1], [40, 0.4]], G.frameAlong([palm[0], palm[1], 146], [Math.cos(a), Math.sin(a), -0.5]), P), { tone: "mid", className: "leaf" }));
  }
  return out.join("");
}
// Camera on a tripod, a ring light, the streaming laptop, and the cable between them.
function studioGear() {
  const out = [];
  const [cx, cy] = CAM.at;
  const a = v3.unit(v3.sub(CAM.target, [cx, cy, CAM.z]));
  const u = v3.unit(v3.cross([0, 0, 1], a));
  const CF = G.frameOf([cx, cy, CAM.z], a, u, v3.cross(a, u));
  out.push(`<path class="iso-halo" d="${k.haloOf({ x: cx - 30, y: cy - 30, w: 60, d: 60, r: 30 }, 0, 4, P)}"/>`);
  for (const deg of [30, 150, 270]) {
    const r = (deg * Math.PI) / 180;
    const top = [cx + 5 * Math.cos(r), cy + 5 * Math.sin(r), CAM.z - 42];
    const foot = [cx + 28 * Math.cos(r), cy + 28 * Math.sin(r), 1.6];
    out.push(S(G.disc(0, Math.hypot(...v3.sub(foot, top)), 1.4, G.frameAlong(top, v3.unit(v3.sub(foot, top))), P), { tone: "mid" }));
  }
  out.push(S(k.cylinder(cx, cy, 2.2, CAM.z - 44, 34, P, 14), { tone: "mid" }));
  out.push(S(G.solidOf([[8, 4.6], [10, 4.6], [10, 5.4], [20, 5.4], [20, 6.4], [24, 6.8]], CF, P), { tone: "mid" }));
  out.push(S(G.prismOf(CF, [[-5, -5], [5, -5], [5, 6], [-5, 6]], -14, 8, P), { tone: "mid" }));
  out.push(`<g class="tally">${Dots([at(v3.add(v3.add(CF.o, CF.v, 7), CF.a, 4))], { size: 0.9, tone: "hi" })}</g>`);
  // Ring light on its stand, facing the professor.
  const [lx, ly] = [-300, -96];
  out.push(S(k.cylinder(lx, ly, 10, 0, 2, P, 20), { tone: "lo" }) + S(k.cylinder(lx, ly, 1.4, 2, 140, P, 10), { tone: "mid" }));
  const RF = G.frameAlong([lx, ly, 160], v3.unit([0.75, -0.66, 0]));
  out.push(S(G.ringBand(-1.5, 1.5, 15, 22, RF, P), { tone: "hi", className: "ring" }));
  // Streaming laptop on a side table; HDMI from the camera.
  const T = { x: -360, y: -110, w: 50, d: 34, r: 1.5 };
  for (const [x, y] of byDepth(k.corners(T, 3))) out.push(S(k.cylinder(x, y, 1.3, 0, 70, P, 10), { tone: "mid" }));
  out.push(S(k.slabOf(T, 70, 2.4, P, 2, 0.4), { tone: "mid", className: "wood" }));
  out.push(S(k.slabOf({ x: T.x + 10, y: T.y + 12, w: 30, d: 20, r: 1 }, 72.4, 1.4, P, 2), { tone: "mid" }));
  const lidO = [T.x + 10, T.y + 12, 73.8];
  out.push(`<path class="lap-screen" d="${pathOf3([lidO, v3.add(lidO, [30, 0, 0]), v3.add(lidO, [30, -4, 19]), v3.add(lidO, [0, -4, 19])], true)}"/>`);
  out.push(L(pathOf3([[cx - 4, cy - 4, 96], [cx - 4, cy - 4, 0.6], [T.x + T.w - 4, cy - 4, 0.6], [T.x + T.w - 4, T.y + T.d - 6, 0.6], [T.x + T.w - 4, T.y + T.d - 6, 70]]), { tone: "mid", className: "cord" }));
  return out.join("");
}

// ---------- 2. the hall with the big screen ----------
const SEATED_A = { tilt: 2, nod: 0, R: { thigh: [88, 6], shin: [8, 180], foot: [68, 6] }, L: { thigh: [88, -6], shin: [8, 180], foot: [68, 6] }, RA: { upper: [20, 10], fore: [80, -20] }, LA: { upper: [20, 10], fore: [80, -20] } };
function hall() {
  const out = [island(HI)];
  out.push(S(k.slabOf({ x: HI.x + 8, y: HI.y + 6, w: HI.w - 16, d: 12, r: 1 }, 0, 300, P, 2, 0.6), { tone: "lo", className: "wall" }));
  out.push(
    `<g transform="${planeOf(SCREEN.y)}" data-bigscreen>`,
    `<path class="scr-frame" d="${rectPath(SCREEN.x0 - 5, -SCREEN.z1 - 5, SCREEN.x1 + 5, -SCREEN.z0 + 5, 1.5)}"/>`,
    `<clipPath id="big-clip"><path d="${rectPath(SCR_R.x0, SCR_R.y0, SCR_R.x1, SCR_R.y1)}"/></clipPath>`,
    `<g clip-path="url(#big-clip)"><g data-view="big"></g></g>`,
    `<path class="iso-line" data-tone="lo" d="${rectPath(SCREEN.x0 - 5, -SCREEN.z1 - 5, SCREEN.x1 + 5, -SCREEN.z0 + 5, 1.5)}"/>`,
    `</g>`,
  );
  for (const x of [HI.x + 14, HI.x + HI.w - 36]) out.push(S(k.slabOf({ x, y: HI.y + 22, w: 22, d: 18, r: 2 }, 0, 70, P, 2, 0.5), { tone: "mid" }) + L(k.ring(x + 11, HI.y + 31, 6, 70, P, 20), { tone: "lo" }));
  // Three seats of people watching the screen.
  const units = [];
  for (const x of [120, 230, 340]) {
    const y = -170;
    const u = [];
    for (const [px, py] of byDepth([[x - 18, y - 16], [x + 18, y - 16], [x - 18, y + 16], [x + 18, y + 16]])) u.push(S(k.cylinder(px, py, 1.1, 0, 43, P, 12), { tone: "mid" }));
    u.push(S(k.slabOf({ x: x - 21, y: y - 20, w: 42, d: 40, r: 3 }, 43, 3, P, 3, 0.4), { tone: "mid", className: "seat" }));
    u.push(DN.mannequinSvg(M.skeleton(M.flatten(SEATED_A)), [x, y + 2], P, k.iso, k.depthOf, 0));
    u.push(S(k.slabOf({ x: x - 21, y: y + 18, w: 42, d: 2.6, r: 1 }, 54, 28, P, 2, 0.4), { tone: "mid", className: "seat" }));
    units.push([depth([x, y, 0]), u.join("")]);
  }
  units.sort((a, b) => a[0] - b[0]);
  out.push(...units.map((u) => u[1]));
  // The hall's PC on a cart, feeding the screen.
  const C = { x: HI.x + HI.w - 70, y: -110, w: 46, d: 36, r: 2 };
  for (const [x, y] of byDepth(k.corners(C, 3))) out.push(S(k.cylinder(x, y, 1.4, 0, 72, P, 10), { tone: "mid" }));
  out.push(S(k.slabOf(C, 72, 2.4, P, 2, 0.4), { tone: "mid" }));
  out.push(S(k.slabOf({ x: C.x + 8, y: C.y + 8, w: 30, d: 20, r: 1 }, 74.4, 1.4, P, 2), { tone: "mid" }));
  out.push(`<path class="lap-screen" d="${pathOf3([[C.x + 8, C.y + 8, 75.8], [C.x + 38, C.y + 8, 75.8], [C.x + 38, C.y + 4, 95], [C.x + 8, C.y + 4, 95]], true)}"/>`);
  out.push(L(pathOf3([[C.x + 23, C.y + 2, 72], [C.x + 23, C.y + 2, 0.6], [C.x + 23, HI.y + 19, 0.6], [C.x + 23, HI.y + 19, 40]]), { tone: "mid", className: "cord" }));
  return out.join("");
}

// ---------- 3. the participants' places ----------
const STATIC_SEAT = (i) => {
  const [x, y] = PE.personAt(i);
  const p = PE.PLACES[i];
  const isl = PI_[i];
  const out = [island(isl), tag(isl, p.where)];
  // A back wall with what that place has on it.
  out.push(S(k.slabOf({ x: isl.x + 8, y: isl.y + 6, w: isl.w - 16, d: 8, r: 1 }, 0, 104, P, 2, 0.5), { tone: "lo", className: "wall-" + p.bg }));
  const face = planeOf(isl.y + 14);
  const X0 = isl.x + 20, X1 = isl.x + isl.w - 20;
  let decor = "";
  if (p.bg === "home") decor = `<path class="dc-frame" d="${rectPath(X0 + 10, -130, X0 + 60, -95, 1)}"/><path class="dc-shelf" d="M${X1 - 70} -80H${X1}M${X1 - 70} -110H${X1}"/>` + Array.from({ length: 8 }, (_, j) => `<path class="dc-book${j % 2}" d="${rectPath(X1 - 68 + j * 8, -80 - 18 + (j % 3) * 2, X1 - 62 + j * 8, -80)}"/>`).join("");
  else if (p.bg === "cafe") decor = `<path class="dc-window" d="${rectPath(X0, -138, X0 + 90, -70, 1)}"/><path class="dc-shelf" d="M${X0 + 45} -138V-70M${X0} -104H${X0 + 90}"/><path class="dc-menu" d="${rectPath(X1 - 50, -130, X1 - 6, -96, 1)}"/>`;
  else if (p.bg === "library") decor = Array.from({ length: 3 }, (_, r) => `<path class="dc-shelf" d="M${X0} ${-40 - r * 36}H${X1}"/>` + Array.from({ length: 18 }, (_, j) => `<path class="dc-book${(j + r) % 2}" d="${rectPath(X0 + 2 + j * 8.6, -40 - r * 36 - 26 + ((j * 7 + r) % 4) * 2, X0 + 8 + j * 8.6, -40 - r * 36)}"/>`).join("")).join("");
  else decor = `<path class="dc-frame" d="${rectPath(X0 + 30, -132, X1 - 30, -88, 1)}"/><path class="dc-art" d="M${X0 + 34} -92L${X0 + 70} -122L${X0 + 94} -102L${X0 + 112} -116L${X1 - 34} -92Z"/>`;
  out.push(`<g transform="${face} scale(1 0.7)" data-decor>${decor}</g>`);
  if (p.bg === "living") {
    out.push(S(G.solidOf([[0, 9], [26, 12]], G.frameAlong([X1 - 4, isl.y + 34, 0], [0, 0, 1]), P), { tone: "mid" }));
    for (const [dx, dz, r] of [[-5, 36, 12], [6, 40, 11], [0, 50, 12]]) out.push(S(G.sphereOf([X1 - 4 + dx, isl.y + 34, dz], r, P), { tone: "mid", className: "leaf" }));
  }
  // Furniture: a desk and a laptop facing the person, or a sofa and a low table.
  if (p.seat === "chair") {
    const D = { x: x - 52, y: isl.y + 40, w: 104, d: 48, r: 2 };
    for (const [px, py] of byDepth(k.corners(D, 4))) out.push(S(k.cylinder(px, py, 1.6, 0, 70, P, 12), { tone: "mid" }));
    out.push(S(k.slabOf(D, 70, 3, P, 2, 0.6), { tone: "mid", className: p.bg === "cafe" ? "wood" : "" }));
    out.push(S(k.slabOf({ x: x - 16, y: D.y + 22, w: 32, d: 21, r: 1 }, 73, 1.4, P, 2), { tone: "mid" }));
    const lid = [x - 16, D.y + 22, 74.4];
    out.push(`<g data-laptop="${i}"><path class="lap-back" d="${pathOf3([lid, v3.add(lid, [32, 0, 0]), v3.add(lid, [32, -4, 21]), v3.add(lid, [0, -4, 21])], true)}"/></g>`);
    if (p.bg === "cafe") out.push(S(k.cylinder(x + 32, D.y + 32, 3.6, 73, 9, P, 16), { tone: "hi" }));
    if (p.bg === "library") out.push(S(k.slabOf({ x: x + 22, y: D.y + 28, w: 22, d: 15, r: 0.6 }, 73, 1.2, P, 2), { tone: "hi" }));
    for (const [px, py] of byDepth([[x - 18, y - 14], [x + 18, y - 14], [x - 18, y + 18], [x + 18, y + 18]])) out.push(S(k.cylinder(px, py, 1.1, 0, 43, P, 12), { tone: "mid" }));
    out.push(S(k.slabOf({ x: x - 21, y: y - 18, w: 42, d: 40, r: 3 }, 43, 3, P, 3, 0.4), { tone: "mid", className: "seat" }));
  } else {
    out.push(S(k.slabOf({ x: x - 40, y: y - 72, w: 16, d: 144, r: 5 }, 0, 84, P, 4, 0.8), { tone: "mid", className: "sofa" }));
    out.push(S(k.slabOf({ x: x - 26, y: y - 72, w: 48, d: 14, r: 5 }, 0, 58, P, 4, 0.6), { tone: "mid", className: "sofa" }));
    out.push(S(k.slabOf({ x: x - 26, y: y - 58, w: 46, d: 116, r: 6 }, 0, 40, P, 4, 0.8), { tone: "mid", className: "sofa" }));
    out.push(S(k.slabOf({ x: x + 46, y: y - 30, w: 40, d: 56, r: 3 }, 0, 34, P, 3, 0.5), { tone: "mid", className: "wood" }));
    out.push(S(k.cylinder(x + 70, y - 14, 3.6, 34, 9, P, 16), { tone: "hi" }));
  }
  return out.join("");
};
const BACKREST = (i) => {
  const [x, y] = PE.personAt(i);
  const p = PE.PLACES[i];
  if (p.seat === "chair") return S(k.cylinder(x - 17, y + 21, 0.9, 46, 8, P, 10), { tone: "mid" }) + S(k.cylinder(x + 17, y + 21, 0.9, 46, 8, P, 10), { tone: "mid" }) + S(k.slabOf({ x: x - 21, y: y + 20, w: 42, d: 2.6, r: 1 }, 54, 28, P, 2, 0.4), { tone: "mid", className: "seat" });
  return S(k.slabOf({ x: x - 26, y: y + 58, w: 48, d: 14, r: 5 }, 0, 58, P, 4, 0.6), { tone: "mid", className: "sofa" });
};

// ---------- assemble ----------
const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label: "온실 라이브 강의: 왼쪽 뒤 온실 스튜디오에서 교수가 화분을 들고 재배를 설명하고, 카메라가 이를 라이브로 송출한다. 앞줄에는 서울 집, 부산 카페, 대전 도서관, 제주 거실에서 접속한 참가자 네 명이 손을 들거나 질문하고 필기한다. 오른쪽 뒤 강의실의 대형 화면에는 Zoom 화면이 떠 교수와 참가자 모두가 함께 보이고, 화살표 키로 교수나 참가자 한 명을 크게 띄울 수 있다.",
  body: [
    greenhouse(), `<g data-part="prof"></g>`, studioGear(),
    hall(),
    ...PE.PLACES.map((_, i) => `<g data-island="${i}">${STATIC_SEAT(i)}<g data-part="part${i}"></g>${BACKREST(i)}</g>`),
  ],
});

const strip = (file) => readFileSync(join(HERE, file), "utf8").replace(/^import .*$/gm, "").replace(/^export /gm, "");
const live = `
${strip("../01.ballet-mirror/model.mjs")}
${strip("../01.ballet-mirror/dancer.mjs")}
${strip("../04.experience-360/gear.mjs")}
${strip("people.mjs")}
const P = ${JSON.stringify(P)};
const SCR_R = ${JSON.stringify(SCR_R)};
${readFileSync(join(HERE, "live.js"), "utf8")}
`;

const css = `<style>
.iso{--leaf-0:#8fbf86;--leaf-1:#acd3a2;--leaf-2:#c8e4bf;--leaf-edge:#4b7f48}
.iso[data-theme="dark"]{--leaf-0:#1d3a22;--leaf-1:#26492b;--leaf-2:#305a35;--leaf-edge:#6fae73}
.leaf .iso-fill,.leaf .iso-shade,.leaf .iso-top{fill:var(--leaf-1);stroke:var(--leaf-1)} .leaf .iso-shade[data-shade="0"]{fill:var(--leaf-0);stroke:var(--leaf-0)} .leaf .iso-top,.leaf .iso-shade[data-shade="3"]{fill:var(--leaf-2);stroke:var(--leaf-2)} .leaf .iso-edge{stroke:var(--leaf-edge)}
.gh-glass{fill:#9fc6d0;fill-opacity:.13;stroke:none}
.gh-frame{fill:none;stroke:var(--anatomy-mid);stroke-width:1px;vector-effect:non-scaling-stroke}
.wood .iso-fill,.wood .iso-top{fill:#e9d8bd} .wood .iso-shade{fill:#d8c3a2}
.iso[data-theme="dark"] .wood .iso-fill,.iso[data-theme="dark"] .wood .iso-top{fill:#4a3f30} .iso[data-theme="dark"] .wood .iso-shade{fill:#3d3428}
.sofa .iso-fill,.sofa .iso-top{fill:#c9cfdc} .sofa .iso-shade{fill:#b3bacb}
.iso[data-theme="dark"] .sofa .iso-fill,.iso[data-theme="dark"] .sofa .iso-top{fill:#343a48} .iso[data-theme="dark"] .sofa .iso-shade{fill:#2b303c}
.ring .iso-fill,.ring .iso-shade,.ring .iso-top{fill:#fffbe8}
.iso[data-theme="dark"] .ring .iso-fill,.iso[data-theme="dark"] .ring .iso-shade,.iso[data-theme="dark"] .ring .iso-top{fill:#6b664f}
.lap-screen,.lap-back{fill:#20242b;stroke:var(--anatomy-hi);stroke-width:var(--anatomy-weight);vector-effect:non-scaling-stroke}
.lap-back{fill:var(--anatomy-shade-2)}
.cord{stroke-width:1.4px}
.tally .iso-dots circle{fill:var(--anatomy-red)}
.iso-svg [data-bigscreen] path,.iso-svg [data-bigscreen] circle,.iso-svg [data-bigscreen] ellipse,.iso-svg [data-decor] path{vector-effect:none}
.scr-frame{fill:#111}
.dc-frame{fill:#f4efe6;stroke:#8a7f70;stroke-width:1} .dc-shelf{fill:none;stroke:#8a7f70;stroke-width:1.6} .dc-book0{fill:#7b8fb3} .dc-book1{fill:#c79a6b}
.dc-window{fill:#cfe6f2;stroke:#7a6a58;stroke-width:1.6} .dc-menu{fill:#2f2a26} .dc-art{fill:#8fb3a0}
.iso[data-theme="dark"] .dc-frame{fill:#3a3631} .iso[data-theme="dark"] .dc-window{fill:#2e4450}
.zm-bg{fill:#1a1a1a} .zm-bar{fill:#111} .zm-bar-t{fill:#cfd3d8;font-family:"Pretendard","Malgun Gothic",sans-serif} .zm-rec{fill:#ff5a5a} .zm-mode{fill:#fff;font-family:"Pretendard","Malgun Gothic",sans-serif;font-weight:700}
.zm-name-bg{fill:#000;opacity:.6} .zm-name{fill:#fff;font-family:"Pretendard","Malgun Gothic",sans-serif;font-weight:600}
.zm-speaking{fill:none;stroke:#3bd16f;stroke-width:1.6}
.zm-hand{fill:#ffd23f} .zm-hand-t{font-family:"Segoe UI Emoji","Apple Color Emoji",sans-serif}
.pt-gh{fill:#dfeee8} .pt-ghbar{fill:none;stroke:#fff;stroke-width:1.2} .pt-leaf{fill:#5f9f58} .pt-leaf2{fill:#7cb86f} .pt-bench{fill:#9a948a}
.pt-home{fill:#efe4d3} .pt-shelf{fill:#d9c6a8} .pt-shelfline{fill:#a8916c}
.pt-cafe{fill:#7a5a45} .pt-window{fill:#d6ecf5} .pt-lamp{fill:#ffe39a}
.pt-lib{fill:#e7e0d2} .pt-book{fill:#7b8fb3} .pt-book2{fill:#c79a6b}
.pt-living{fill:#d6dde6} .pt-pot{fill:#b8693e}
.pt-prof-limbs,.pt-part-limbs{fill:none;stroke-linecap:round;stroke-linejoin:round}
.pt-prof-limbs{stroke:#2f6b45} .pt-part-limbs{stroke:var(--pt-top)}
path.pt-prof-rim,path.pt-part-rim{stroke:rgba(255,255,255,.35)} circle.pt-prof-rim,circle.pt-part-rim{fill:rgba(255,255,255,.35)}
path.pt-prof-far,path.pt-part-far{stroke-opacity:.85}
.pt-prof-head,.pt-part-head{fill:#f1d3c0}
ellipse.pt-prof-floor,ellipse.pt-part-floor{fill:none}
.pt-eye{fill:#2a2220} .pt-mouth{fill:#9b4a4a}
.pt-potbody{fill:#b8693e} .pt-plant{fill:#4f9a52}
.pot-body{fill:#c47a4c;stroke:var(--anatomy-hi);stroke-width:var(--anatomy-weight);vector-effect:non-scaling-stroke}
.pot-leaf{fill:var(--leaf-1);stroke:var(--leaf-edge);stroke-width:var(--anatomy-weight);vector-effect:non-scaling-stroke}
.gear-face{fill:var(--anatomy-shade-2)} .gear-face[data-shade="top"]{fill:var(--anatomy-lit-top)} .gear-face[data-shade="0"]{fill:var(--anatomy-shade-0)} .gear-face[data-shade="1"]{fill:var(--anatomy-shade-1)} .gear-face[data-shade="3"]{fill:var(--anatomy-shade-3)}
.gear-edge{fill:none;stroke:var(--anatomy-hi);stroke-width:var(--anatomy-weight);vector-effect:non-scaling-stroke;stroke-linejoin:round}
.hand-badge{fill:#ffd23f;stroke:var(--anatomy-hi);stroke-width:.5px;vector-effect:non-scaling-stroke}
.talk-ring{fill:none;stroke:#3bd16f;stroke-width:1.2px;vector-effect:non-scaling-stroke}
.mq-body{fill:var(--anatomy-shade-2)}
.mq-shade{fill:var(--anatomy-shade-0);opacity:.9}
.mq-shine{fill:var(--anatomy-lit-top)}
.mq-edge{fill:none;stroke:var(--anatomy-hi);stroke-width:var(--anatomy-weight);vector-effect:non-scaling-stroke;stroke-linejoin:round}
.iso-plate-corner{font-family:"Pretendard","Malgun Gothic","Apple SD Gothic Neo",ui-sans-serif,system-ui,sans-serif;font-size:11.5px;letter-spacing:0}
.zg-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
.iso-stage{touch-action:pan-y}
.iso-stage:focus{outline:none}
.iso-stage:focus-visible{outline:1px solid var(--anatomy-muted);outline-offset:6px}
</style>`;

const body = css + k.plateHtml({
  fig: "Fig 7",
  title: "온실 라이브 강의 · Zoom 원격 참여",
  hint: "←→ 대형 화면 전환 (전체 · 교수 · 참가자 1–4)",
  readout: "",
  keys: [
    { mark: "raised", label: "온실 스튜디오: 교수가 화분을 들고 재배를 설명, 카메라와 링라이트로 라이브 송출" },
    { mark: "flat", label: "참가자 4명: 서울 집 · 부산 카페 · 대전 도서관 · 제주 거실에서 Zoom 접속" },
    { mark: "lit", label: "강의실 대형 화면: 교수와 참가자 모두 (←→로 한 명씩 크게)" },
  ],
  caption: "온실 스튜디오에서 교수가 벤치 앞을 오가며 화분을 들어 보이고 잎을 가리키며 재배를 설명하면, 카메라가 이를 라이브로 송출한다. 서로 다른 곳에 있는 참가자들은 노트북과 태블릿으로 Zoom에 접속해 시청하며, 참가자 1은 손을 들고, 참가자 2는 질문하고, 참가자 3은 필기하고, 참가자 4는 고개를 끄덕인다. 강의실의 대형 화면에는 이 모두가 한 화면에 보이며, 말하는 사람은 초록 테두리, 손 든 사람은 노란 손 표시가 붙는다.",
  body: `<div class="iso-stage" tabindex="0" role="group" aria-label="온실 라이브 강의. 좌우 화살표로 대형 화면을 전체, 교수, 참가자 1부터 4까지 바꿉니다.">${svg}<span class="zg-sr" role="status" aria-live="polite" data-status></span></div>`,
});

const name = theme === "light" ? "zoom-greenhouse-light.html" : "zoom-greenhouse.html";
writeFileSync(join(HERE, name), k.pageHtml({ title: "온실 라이브 강의 · Zoom 원격 참여", theme, body, script: kitScript() + live, width: 760 }));
console.log("wrote", name);
