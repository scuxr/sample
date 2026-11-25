// 스크린골프 스윙 분석 — anatomy figure build.
// node build.mjs [--light]
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as M from "../01.ballet-mirror/model.mjs";
import * as DN from "../01.ballet-mirror/dancer.mjs";
import * as GF from "./golf.mjs";

const SKILL = process.env.ANATOMY_SKILL || "C:/Users/user/.claude/skills/anatomy";
const k = await import(pathToFileURL(join(SKILL, "kit/iso-kit.mjs")).href);
const G = await import(pathToFileURL(join(SKILL, "kit/lathe.mjs")).href);
const { kitScript } = await import(pathToFileURL(join(SKILL, "scripts/inline-kit.mjs")).href);

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--light") ? "light" : "dark";

// ---------- world (cm) ----------
const WIDTH = 600;
const HEIGHT = 420;
const FLOOR = { x: -60, y: -120, w: 780, d: 520, r: 3 };
const FLOOR_H = 30;
const TURF = { x: 10, y: -40, w: 350, d: 330, r: 2 };
const SCREEN_Y = -38;
const SCREEN_R = { x0: 26, x1: 334, y0: -236, y1: -34 }; // in the screen plane: u = world x, v = -z
const ENC_H = 270;
const GOLFER = { at: [242, 203], heading: 270 };
const BALL_W = [GOLFER.at[0] - GF.BALL_LOCAL[1], GOLFER.at[1] + GF.BALL_LOCAL[0], GF.BALL_LOCAL[2]];
const MAT = { x: 138, y: 150, w: 156, d: 104, r: 2 };
const RADAR = { at: [180, 304] };
const CAMS = {
  front: { at: [56, 203], z: 118, target: [242, 203, 100] },
  side: { at: [206, 362], z: 140, target: [214, 200, 92] },
};
const MON = { y: 90, depth: 6, cols: [[396, 516], [524, 644]], rows: [[152, 222], [76, 146]] };
const PC = { x: 600, y: 104, w: 24, d: 44, r: 1.5 };
const EXPERT = { at: [404, 262], heading: -68 };

const P = k.fitProjection([...k.boxCorners(FLOOR, -FLOOR_H, 0), [0, -50, ENC_H], [360, -50, ENC_H], [644, 90, 222]], WIDTH, HEIGHT, { pad: 16, azimuth: 60 });

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
  cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
};

// ---------- floor and the bay ----------
function floor() {
  const out = [`<path class="iso-halo" d="${k.haloOf(FLOOR, -FLOOR_H, FLOOR_H, P)}"/>`];
  const seamsX = [];
  for (let x = FLOOR.x + 120; x < FLOOR.x + FLOOR.w - 20; x += 120) seamsX.push(x);
  const front = FLOOR.y + FLOOR.d, right = FLOOR.x + FLOOR.w;
  const seamYs = [FLOOR.y + 130, FLOOR.y + 260, FLOOR.y + 390];
  const inner = [...seamsX.map((x) => k.segment([x, front, 0], [x, front, -FLOOR_H], P)), ...seamYs.map((y) => k.segment([right, y, 0], [right, y, -FLOOR_H], P))].join("");
  out.push(S(k.slabOf(FLOOR, -FLOOR_H, FLOOR_H, P, 3, 1.2), { tone: "lo", inner: L(inner, { tone: "faint" }) + L(k.sideSeam(FLOOR, -FLOOR_H + 6, P, 3), { tone: "faint" }) }));
  out.push(L(seamsX.map((x) => k.lineOnTop([x, FLOOR.y], [x, front], 0, P)).join("") + seamYs.map((y) => k.lineOnTop([FLOOR.x, y], [right, y], 0, P)).join(""), { tone: "faint" }));
  return out.join("");
}
function bay() {
  const out = [];
  // Turf carpet, with the seams of its rolls.
  out.push(S(k.slabOf(TURF, 0, 1.6, P, 2, 0.4), { tone: "mid", className: "turf" }));
  out.push(L([TURF.x + 120, TURF.x + 240].map((x) => k.lineOnTop([x, TURF.y], [x, TURF.y + TURF.d], 1.6, P)).join(""), { tone: "faint" }));
  // Enclosure: the back panel the screen hangs in, a padded left wall, a short right return, a canopy.
  out.push(S(k.slabOf({ x: 0, y: -52, w: 360, d: 12, r: 1 }, 0, ENC_H, P, 2, 0.6), { tone: "lo", className: "enc" }));
  out.push(S(k.slabOf({ x: 0, y: -40, w: 10, d: 230, r: 1 }, 0, ENC_H, P, 2, 0.6), { tone: "lo", className: "enc", inner: L([40, 100, 160].map((y) => k.segment([10, y, 0], [10, y, ENC_H], P)).join(""), { tone: "faint" }) }));
  out.push(S(k.slabOf({ x: 350, y: -40, w: 10, d: 60, r: 1 }, 0, ENC_H, P, 2, 0.6), { tone: "lo", className: "enc" }));
  // The impact screen in the back panel: the virtual range is projected on it.
  out.push(
    `<g transform="${planeOf(SCREEN_Y)}" data-screenwall>`,
    `<clipPath id="impact-clip"><path d="${rectPath(SCREEN_R.x0, SCREEN_R.y0, SCREEN_R.x1, SCREEN_R.y1)}"/></clipPath>`,
    `<path class="impact-cloth" d="${rectPath(SCREEN_R.x0 - 4, SCREEN_R.y0 - 4, SCREEN_R.x1 + 4, SCREEN_R.y1 + 4)}"/>`,
    `<g clip-path="url(#impact-clip)"><g data-view="impact"></g><path class="impact-weave" d="${Array.from({ length: 30 }, (_, i) => `M${SCREEN_R.x0} ${(SCREEN_R.y0 + 7 * (i + 0.5)).toFixed(1)}H${SCREEN_R.x1}`).join("")}"/></g>`,
    `<path class="iso-line" data-tone="lo" d="${rectPath(SCREEN_R.x0 - 4, SCREEN_R.y0 - 4, SCREEN_R.x1 + 4, SCREEN_R.y1 + 4)}"/>`,
    `</g>`,
  );
  // Grommets round the screen.
  const grom = [];
  for (let x = SCREEN_R.x0; x <= SCREEN_R.x1 + 0.1; x += 22) grom.push(at([x, SCREEN_Y, -SCREEN_R.y0 + 2]), at([x, SCREEN_Y, -SCREEN_R.y1 - 2]));
  out.push(Dots(grom, { size: 0.4, tone: "lo" }));
  out.push(S(k.slabOf({ x: 0, y: -52, w: 360, d: 92, r: 1 }, ENC_H - 8, 8, P, 2, 0.6), { tone: "mid", className: "enc" }));
  return out.join("");
}
// Projector on a ceiling bar across the bay.
function projector() {
  const out = [];
  out.push(S(k.slabOf({ x: 176, y: 14, w: 8, d: 8, r: 1 }, ENC_H - 16, 8, P, 2), { tone: "mid" }));
  out.push(S(k.slabOf({ x: 160, y: 2, w: 40, d: 32, r: 3 }, ENC_H - 28, 13, P, 3, 0.6), { tone: "mid" }));
  const F = G.frameAlong([180, 2, ENC_H - 21.5], [0, -1, 0]);
  out.push(S(G.solidOf([[0, 6], [3, 6], [3, 5], [5, 5]], F, P), { tone: "lo" }));
  out.push(`<path class="cam-glass" d="${G.circleOf(F, 5, 4.2, P)}"/>`);
  return out.join("");
}
function mat() {
  const out = [];
  out.push(S(k.slabOf(MAT, 1.6, 1.8, P, 2, 0.4), { tone: "mid", className: "mat" }));
  // Hitting strip with its stripes, a stance strip.
  const strip = { x: MAT.x + 14, y: MAT.y + 26, w: 60, d: 50, r: 1 };
  out.push(S(k.slabOf(strip, 3.4, 0.8, P, 2), { tone: "mid", className: "mat-strip" }));
  out.push(L([1, 2, 3, 4, 5].map((i) => k.lineOnTop([strip.x + i * 10, strip.y], [strip.x + i * 10, strip.y + strip.d], 4.2, P)).join(""), { tone: "faint" }));
  out.push(S(k.cylinder(BALL_W[0], BALL_W[1], 0.8, 4.2, 1.2, P, 10), { tone: "mid" }));
  return out.join("");
}
// The launch monitor that measures the ball: a radar unit on a low stand behind the golfer.
function radar() {
  const [x, y] = RADAR.at;
  const out = [`<path class="iso-halo" d="${k.haloOf({ x: x - 14, y: y - 14, w: 28, d: 28, r: 14 }, 0, 3, P)}"/>`];
  for (const a of [0, 120, 240]) { const r = (a * Math.PI) / 180; out.push(S(G.disc(0, 30, 0.8, G.frameAlong([x, y, 30], v3.unit([Math.cos(r) * 12, Math.sin(r) * 12, -30])), P), { tone: "mid" })); }
  out.push(S(k.cylinder(x, y, 2.4, 28, 4, P, 14), { tone: "mid" }));
  const F = G.frameOf([x, y, 38], [0, -1, 0], [1, 0, 0], [0, 0, 1]);
  out.push(S(G.prismOf(F, [[-10, -6], [10, -6], [10, 6], [-10, 6]], -3, 3, P), { tone: "hi" }));
  out.push(`<g class="radar-led">${Dots([at([x + 7, y + 3, 42])], { size: 0.7, tone: "hi" })}</g>`);
  return `<g data-slot="radar" data-depth="${depth([x, y, 0]).toFixed(2)}">${out.join("")}</g>`;
}

// ---------- cameras on tripods ----------
function tripodCamera({ at: [cx, cy], z, target }, legAngles, name) {
  const a = v3.unit(v3.sub(target, [cx, cy, z]));
  const u = v3.unit(v3.cross([0, 0, 1], a));
  const CF = G.frameOf([cx, cy, z], a, u, v3.cross(a, u));
  const camPoint = (s, uu, vv) => v3.add(v3.add(v3.add(CF.o, CF.a, s), CF.u, uu), CF.v, vv);
  const out = [`<path class="iso-halo" d="${k.haloOf({ x: cx - 30, y: cy - 30, w: 60, d: 60, r: 30 }, 0, 4, P)}"/>`];
  const legs = legAngles.map((deg) => {
    const ang = (deg * Math.PI) / 180;
    const top = [cx + 5.5 * Math.cos(ang), cy + 5.5 * Math.sin(ang), z - 42];
    const foot = [cx + 30 * Math.cos(ang), cy + 30 * Math.sin(ang), 1.6];
    const dir = v3.unit(v3.sub(foot, top));
    const len = Math.hypot(...v3.sub(foot, top));
    const F = G.frameAlong(top, dir);
    return [depth(v3.add(top, dir, len / 2)), S(G.disc(0, len * 0.55, 1.6, F, P), { tone: "mid" }) + S(G.disc(len * 0.55 + 2.6, len - 1.6, 1.15, F, P), { tone: "mid" }) + S(G.disc(len * 0.55, len * 0.55 + 2.6, 2.3, F, P), { tone: "lo" }) + S(k.cylinder(foot[0], foot[1], 2.4, 0, 1.6, P, 16), { tone: "lo" })];
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
    S(G.prismOf(CF, [[-1.6, 6.5], [1.6, 6.5], [1.6, 9.5], [-1.6, 9.5]], -11, 7, P), { tone: "mid" }),
    S(G.prismOf(CF, [[5.5, -3.5], [6.6, -3.5], [6.6, 4], [5.5, 4]], -9, 2, P), { tone: "lo" }),
    S(G.solidOf([[10, 4.6], [12, 4.6], [12, 5.4], [22, 5.4], [22, 4.9], [25, 4.9], [25, 6.2], [30, 6.9]], CF, P), { tone: "mid" }),
    k.fadedSvg(G.ribsOf(CF, 13, 21, 5.4, 40, P, { fade: [0.1, 0.55], seams: true }), { tone: "lo" }),
  ];
  if (depth(CF.a) - depth([0, 0, 0]) < 0) parts.unshift(parts.splice(4, 2).join(""));
  out.push(...parts);
  out.push(`<g class="tally">${Dots([at(camPoint(-6, 0, 6.6))], { size: 0.9, tone: "hi" })}</g>`);
  return `<g data-slot="${name}" data-depth="${depth([cx, cy, 0]).toFixed(2)}">${out.join("")}</g>`;
}

// ---------- the four monitors on their stand, and the PC under them ----------
const MON_NAMES = ["정면 카메라", "측면 카메라", "가상 필드", "탄도 · 거리 데이터"];
const monRegion = (i) => { const [x0, x1] = MON.cols[i % 2], [z0, z1] = MON.rows[Math.floor(i / 2)]; return { x0: x0 + 3, x1: x1 - 3, y0: -(z1 - 3), y1: -(z0 + 3) }; };
function monitors() {
  const out = [];
  const base = { x: 410, y: MON.y - 30, w: 220, d: 12, r: 2 };
  out.push(`<path class="iso-halo" d="${k.haloOf({ x: 392, y: MON.y - 40, w: 256, d: 40, r: 6 }, 0, 4, P)}"/>`);
  for (const x of [420, 620]) { out.push(S(k.slabOf({ x: x - 5, y: base.y - 12, w: 10, d: 36, r: 2 }, 0, 4, P, 2, 0.4), { tone: "mid" })); out.push(S(k.slabOf({ x: x - 3, y: MON.y - 26, w: 6, d: 6, r: 1 }, 4, 222, P, 2), { tone: "mid" })); }
  out.push(S(k.slabOf({ x: 418, y: MON.y - 26, w: 204, d: 6, r: 1 }, 147, 4, P, 2), { tone: "mid" }));
  for (let i = 0; i < 4; i++) {
    const [x0, x1] = MON.cols[i % 2], [z0, z1] = MON.rows[Math.floor(i / 2)];
    out.push(S(k.slabOf({ x: x0, y: MON.y - MON.depth, w: x1 - x0, d: MON.depth, r: 1 }, z0, z1 - z0, P, 2, 0.4), { tone: "mid" }));
  }
  const face = planeOf(MON.y);
  const screens = [0, 1, 2, 3].map((i) => {
    const r = monRegion(i);
    return `<clipPath id="mon-${i}"><path d="${rectPath(r.x0, r.y0, r.x1, r.y1, 0.6)}"/></clipPath><path class="mon-glass" d="${rectPath(r.x0, r.y0, r.x1, r.y1, 0.6)}"/><g clip-path="url(#mon-${i})"><g data-view="m${i}"></g><text class="mon-title" x="${r.x0 + 3}" y="${r.y0 + 6}" font-size="4.6">${MON_NAMES[i]}</text></g><path class="iso-line" data-tone="lo" d="${rectPath(r.x0, r.y0, r.x1, r.y1, 0.6)}"/>`;
  });
  const sub = monRegion(0);
  out.push(`<g transform="${face}" data-monitors>${screens.join("")}<g data-sub><path class="sub-bg" data-sub-bg d=""/><text class="sub-text" data-sub-text x="${(sub.x0 + sub.x1) / 2}" y="${sub.y1 - 4.5}" font-size="3.6" text-anchor="middle"></text></g></g>`);
  out.push(`<g class="mon-led">${Dots([0, 1, 2, 3].map((i) => at([MON.cols[i % 2][1] - 4, MON.y, MON.rows[Math.floor(i / 2)][0] + 1.5])), { size: 0.5, tone: "hi" })}</g>`);
  // PC tower.
  out.push(S(k.slabOf(PC, 0, 46, P, 2, 0.5), { tone: "mid" }));
  out.push(L([30, 36].map((z) => k.segment([PC.x + 4, PC.y + PC.d, z], [PC.x + PC.w - 4, PC.y + PC.d, z], P)).join(""), { tone: "faint", free: true }));
  out.push(`<g class="mon-led">${Dots([at([PC.x + PC.w - 5, PC.y + PC.d, 40])], { size: 0.6, tone: "hi" })}</g>`);
  return `<g data-slot="monitors" data-depth="${depth([500, MON.y - 20, 0]).toFixed(2)}">${out.join("")}</g>`;
}

// ---------- cables: cameras and the radar into the PC ----------
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
const pcIn = (y) => [[PC.x - 6, y, 0.6], [PC.x - 0.3, y, 8]];
const CABLES = {
  front: { tone: "red", route: [[66, 203, 96], [66, 203, 0.6], [66, 276, 0.6], [370, 276, 0.6], [370, 112, 0.6], ...pcIn(112)] },
  radar: { tone: "blue", route: [[184, 304, 3], [184, 304, 0.6], [380, 304, 0.6], [380, 124, 0.6], ...pcIn(124)] },
  side: { tone: "red", route: [[216, 362, 96], [216, 362, 0.6], [390, 362, 0.6], [390, 136, 0.6], ...pcIn(136)] },
};
function cables() {
  return Object.entries(CABLES).map(([name, { tone, route }]) => {
    const d = k.pathOf(rounded(route).map(at));
    return `<g data-cable="${name}">${L(d, { tone: "mid", className: "cord" })}${L(d, { tone, flow: true, className: "pulse" })}</g>`;
  }).join("");
}

// ---------- assemble ----------
const slots = [radar(), tripodCamera(CAMS.front, [100, 220, 340], "front"), tripodCamera(CAMS.side, [30, 150, 270], "side"), monitors()]
  .map((svg) => [Number(/data-depth="([-\d.]+)"/.exec(svg)[1]), svg]).sort((a, b) => a[0] - b[0]);

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label: "스크린골프 타석: 골퍼가 매트 위에서 스윙하면 정면과 측면 카메라가 동시에 찍고, 론치 모니터가 공을 계측한다. 2x2 모니터에는 정면 영상, 측면 영상, 가상 필드로 날아가는 공, 탄도 분포와 거리 수치가 함께 나오고, 뒤에 선 전문가가 화면과 스윙을 보며 피드백을 준다.",
  body: [floor(), bay(), cables(), mat(), `<g data-layer="free">${slots.map((s) => s[1]).join("")}<g data-part="golfer"></g><g data-part="expert"></g></g>`, projector(), `<g data-part="roomball"></g>`],
});

const strip = (file) => readFileSync(join(HERE, file), "utf8").replace(/^import .*$/gm, "").replace(/^export /gm, "");
const live = `
${strip("../01.ballet-mirror/model.mjs")}
${strip("../01.ballet-mirror/dancer.mjs")}
${strip("golf.mjs")}
const P = ${JSON.stringify(P)};
const GOLFER = ${JSON.stringify(GOLFER)};
const EXPERT = ${JSON.stringify(EXPERT)};
const BALL_W = ${JSON.stringify(BALL_W)};
const SCREEN_Y = ${SCREEN_Y};
const SCREEN_R = ${JSON.stringify(SCREEN_R)};
const MON_R = ${JSON.stringify([0, 1, 2, 3].map(monRegion))};
${readFileSync(join(HERE, "live.js"), "utf8")}
`;

const css = `<style>
.iso{--turf-0:#6e9a62;--turf-1:#7da870;--turf-2:#8cb57e;--turf-top:#9cc28d;--mat:#4f7f49;--mat-top:#5d8f55;--rv-sky:#9cc9ec;--rv-hill:#8fb3a0;--rv-grass:#5f9d4c;--rv-fair:#79b85f;--rv-stripe:#86c46b;--rv-board:#2b3440}
.iso[data-theme="dark"]{--turf-0:#1c2e1c;--turf-1:#213622;--turf-2:#263d27;--turf-top:#2c462d;--mat:#1e3a20;--mat-top:#244526}
.turf .iso-fill,.turf .iso-top{fill:var(--turf-top)} .turf .iso-shade{fill:var(--turf-1)} .turf .iso-shade[data-shade="0"]{fill:var(--turf-0)}
.mat .iso-fill,.mat .iso-top,.mat-strip .iso-fill,.mat-strip .iso-top{fill:var(--mat-top)} .mat .iso-shade,.mat-strip .iso-shade{fill:var(--mat)}
.enc .iso-fill,.enc .iso-top{fill:var(--anatomy-shade-1)} .enc .iso-shade{fill:var(--anatomy-shade-0)}
.impact-cloth{fill:#e9ecef}
.iso[data-theme="dark"] .impact-cloth{fill:#2a2e33}
.impact-weave{fill:none;stroke:#fff;stroke-opacity:.08;stroke-width:.8}
.iso-svg [data-screenwall] path,.iso-svg [data-screenwall] circle,.iso-svg [data-screenwall] ellipse,.iso-svg [data-monitors] path,.iso-svg [data-monitors] circle,.iso-svg [data-monitors] ellipse{vector-effect:none}
.mon-glass{fill:#0c0f14}
.mon-title{fill:#fff;font-family:"Pretendard","Malgun Gothic",ui-sans-serif,sans-serif;font-weight:700;paint-order:stroke;stroke:#000;stroke-opacity:.4;stroke-width:.6}
.sub-bg{fill:#000;opacity:.72}
.sub-text{fill:#fff;font-family:"Pretendard","Malgun Gothic",ui-sans-serif,sans-serif;font-weight:600}
.cv-bg{fill:#2d3a2f} .cv-wall{fill:#3a4048} .cv-mat{fill:#3f7a3d}
.cv-limbs{fill:none;stroke:#dfe6ee;stroke-linecap:round;stroke-linejoin:round}
path.cv-rim{stroke:#ffffff} circle.cv-rim{fill:#ffffff} path.cv-far{stroke:#aab4c0} .cv-head{fill:#dfe6ee}
ellipse.cv-floor{fill:#000;opacity:.35}
.cv-shaft{fill:none;stroke:#c8ccd2;stroke-linecap:round} .cv-clubhead{fill:#3b3f46;stroke:#c8ccd2;stroke-width:.4} .cv-ball{fill:#fff}
.rv-sky{fill:var(--rv-sky)} .rv-hill{fill:var(--rv-hill)} .rv-grass{fill:var(--rv-grass)} .rv-fairway{fill:var(--rv-fair)} .rv-stripe{fill:var(--rv-stripe)} .rv-board{fill:var(--rv-board)}
.rv-marker{fill:none;stroke:#fff} .rv-trace{fill:none;stroke:#fff;stroke-width:.8;stroke-opacity:.9} .rv-ball{fill:#fff;stroke:#333;stroke-width:.2} .rv-shadow{fill:#000;opacity:.3}
.sv-map{fill:#f4f6f8} .sv-ring{fill:none;stroke:#c3cad3;stroke-width:.35} .sv-ellipse{fill:#5a8de6;fill-opacity:.25;stroke:#3a6fd8;stroke-width:.4}
.sv-dot{fill:#1f4fb8} .sv-path{fill:none;stroke:#d6334a;stroke-width:.7} .sv-now{fill:#d6334a;stroke:#fff;stroke-width:.4}
.sv-tile{fill:#fff;stroke:#e2e6eb;stroke-width:.3} .sv-label{fill:#e0683a;font-family:"Pretendard","Malgun Gothic",sans-serif;font-weight:700} .sv-value{fill:#333;font-family:var(--anatomy-mono);font-weight:600} .sv-unit{fill:#888}
.room-ball{fill:#fff;stroke:var(--anatomy-hi);stroke-width:.5px;vector-effect:non-scaling-stroke} .room-trace{fill:none;stroke:var(--anatomy-hi);stroke-width:.8px;stroke-dasharray:2 2;vector-effect:non-scaling-stroke}
.club-shaft{fill:var(--anatomy-shade-1);stroke:var(--anatomy-hi);stroke-width:var(--anatomy-weight);vector-effect:non-scaling-stroke}
.cam-glass{fill:var(--anatomy-shade-0)}
.cord{stroke-width:1.5px} .pulse{stroke-width:1px}
.tally .iso-dots circle{fill:var(--anatomy-red)} .radar-led .iso-dots circle,.mon-led .iso-dots circle{fill:var(--anatomy-green)}
.gear-face{fill:var(--anatomy-shade-2)} .gear-face[data-shade="top"]{fill:var(--anatomy-lit-top)} .gear-face[data-shade="0"]{fill:var(--anatomy-shade-0)} .gear-face[data-shade="1"]{fill:var(--anatomy-shade-1)} .gear-face[data-shade="3"]{fill:var(--anatomy-shade-3)}
.gear-edge{fill:none;stroke:var(--anatomy-hi);stroke-width:var(--anatomy-weight);vector-effect:non-scaling-stroke;stroke-linejoin:round}
.mq-body{fill:var(--anatomy-shade-2)}
.mq-shade{fill:var(--anatomy-shade-0);opacity:.9}
.mq-shine{fill:var(--anatomy-lit-top)}
.mq-edge{fill:none;stroke:var(--anatomy-hi);stroke-width:var(--anatomy-weight);vector-effect:non-scaling-stroke;stroke-linejoin:round}
.iso-plate-corner{font-family:"Pretendard","Malgun Gothic","Apple SD Gothic Neo",ui-sans-serif,system-ui,sans-serif;font-size:11.5px;letter-spacing:0}
.gs-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
.iso-stage{touch-action:none;cursor:pointer;user-select:none;-webkit-user-select:none}
.iso-stage:focus{outline:none}
.iso-stage:focus-visible{outline:1px solid var(--anatomy-muted);outline-offset:6px}
</style>`;

const body = css + k.plateHtml({
  fig: "Fig 5",
  title: "스크린골프 · 정면·측면 동시 촬영과 스윙 분석",
  hint: "스페이스·마우스를 누르고 있다가 떼면 스윙 (길게 누를수록 백스윙)",
  readout: "",
  keys: [
    { mark: "red", label: "카메라 2대: 정면(얼굴 쪽) · 측면(타깃 라인 뒤)에서 동시에 촬영" },
    { mark: "blue", label: "론치 모니터: 공의 속도 · 발사각 · 방향을 계측해 PC로" },
    { mark: "flat", label: "모니터 4대: 정면 영상 · 측면 영상 · 가상 필드 · 탄도와 거리 데이터가 함께 움직임" },
    { mark: "raised", label: "전문가: 뒤에서 스윙과 화면을 보고 피드백 (정면 영상 자막)" },
  ],
  caption: "골퍼가 어드레스에서 백스윙, 다운스윙, 임팩트, 피니시로 스윙하면 정면과 측면 카메라 영상이 같은 순간의 자세를 보여 주고, 공은 스크린과 가상 필드로 날아간다. 론치 모니터가 잰 클럽 스피드, 볼 스피드, 발사각, 방향각으로 캐리와 좌우 편차가 계산되어 분포도에 점이 쌓이고, 뒤에서 지켜보던 전문가가 결과를 짚어 피드백한다. 스페이스나 마우스를 누르고 있으면 백스윙이 올라가고, 떼면 스윙한다. 탑에서 너무 오래 끌면 페이스가 열려 공이 오른쪽으로 휜다.",
  body: `<div class="iso-stage" tabindex="0" role="group" aria-label="스크린골프 스윙 분석. 스페이스나 마우스를 누르고 있다가 떼면 스윙합니다.">${svg}<span class="gs-sr" role="status" aria-live="polite" data-status></span></div>`,
});

const name = theme === "light" ? "golf-swing-light.html" : "golf-swing.html";
writeFileSync(join(HERE, name), k.pageHtml({ title: "스크린골프 · 스윙 분석", theme, body, script: kitScript() + live, width: 760 }));
console.log("wrote", name);
