// 다각도 관찰 모듈 · 메이크업 카메라 어레이 — anatomy figure build.
// node build.mjs [--light]
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as M from "../01.ballet-mirror/model.mjs";
import * as DN from "../01.ballet-mirror/dancer.mjs";
import * as V from "./views.mjs";

const SKILL = process.env.ANATOMY_SKILL || "C:/Users/user/.claude/skills/anatomy";
const k = await import(pathToFileURL(join(SKILL, "kit/iso-kit.mjs")).href);
const G = await import(pathToFileURL(join(SKILL, "kit/lathe.mjs")).href);
const { kitScript } = await import(pathToFileURL(join(SKILL, "scripts/inline-kit.mjs")).href);

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--light") ? "light" : "dark";

const WIDTH = 600;
const HEIGHT = 430;
const FLOOR = { x: -80, y: -120, w: 880, d: 600, r: 3 };
const FLOOR_H = 30;
const CYC = { x0: -60, x1: 560, y: -100, h: 320 };
const MONI = { x0: 556, x1: 766, y: 330, z0: 92, z1: 214, depth: 6 };
const DESK = { x: 566, y: 336, w: 190, d: 54, r: 2 };
const LEARNER = { at: [640, 424], heading: 0 };
const MAIN = { x0: MONI.x0 + 5, x1: MONI.x1 - 5, y0: -(MONI.z1 - 5), y1: -(MONI.z0 + 30) };
const THUMBS = { y0: -(MONI.z0 + 27), y1: -(MONI.z0 + 13) };
const SLIDER = { y: -(MONI.z0 + 7), x0: MONI.x0 + 30, x1: MONI.x1 - 30 };

const P = k.fitProjection([...k.boxCorners(FLOOR, -FLOOR_H, 0), [CYC.x0, CYC.y, CYC.h], [CYC.x1, CYC.y, CYC.h]], WIDTH, HEIGHT, { pad: 16, azimuth: 56 });
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

// ---------- the demonstrator's reach: the right-arm pose that puts the brush on the model's face ----------
const RA = (() => {
  const probe = V.scene(0, [40, 10, 90, -20]);
  const tip = V.facePoint(probe.S.head, V.SUBJECT.heading, 8, 6, 1.2).p;
  let best = null;
  for (let e1 = 20; e1 <= 110; e1 += 4) for (let p1 = -40; p1 <= 60; p1 += 5) for (let e2 = 40; e2 <= 160; e2 += 5) for (let p2 = -90; p2 <= 40; p2 += 5) {
    const sc = V.scene(0, [e1, p1, e2, p2]);
    const want = v3.add(tip, v3.unit(v3.sub(sc.A.shoulderR, tip)), 15);
    const d = Math.hypot(...v3.sub(sc.A.wristR, want));
    if (!best || d < best.d) best = { d, ra: [e1, p1, e2, p2] };
  }
  return best;
})();

// ---------- room ----------
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
// The white cyclorama: a back wall and a left wall meeting in a rounded corner, a cove into the floor.
function cyclorama() {
  const out = [];
  out.push(S(k.slabOf({ x: CYC.x0 - 10, y: CYC.y - 10, w: CYC.x1 - CYC.x0 + 10, d: 10, r: 0.5 }, 0, CYC.h, P, 1), { tone: "lo", className: "cyc" }));
  out.push(S(k.slabOf({ x: CYC.x0 - 10, y: CYC.y, w: 10, d: 260 - CYC.y, r: 0.5 }, 0, CYC.h, P, 1), { tone: "lo", className: "cyc" }));
  // The cove: where wall turns into floor, a soft lighter band so no hard corner shows.
  out.push(`<path class="cyc-cove" d="${k.pathOf([at([CYC.x1, CYC.y, 0]), at([CYC.x0, CYC.y, 0]), at([CYC.x0, 260, 0]), at([CYC.x0 + 40, 260, 0]), at([CYC.x0 + 40, CYC.y + 40, 0]), at([CYC.x1, CYC.y + 40, 0])], true)}"/>`);
  return out.join("");
}
function lights() {
  const out = [];
  out.push(S(G.disc(0, 420, 2.4, G.frameAlong([40, 10, 300], [1, 0, 0]), P), { tone: "mid" }));
  out.push(S(G.disc(0, 420, 2.4, G.frameAlong([40, -40, 300], [1, 0, 0]), P), { tone: "mid" }));
  for (const x of [80, 170, 330, 420]) {
    out.push(S(k.cylinder(x, 10, 1.2, 268, 32, P, 10), { tone: "mid" }));
    out.push(S(k.slabOf({ x: x - 26, y: -8, w: 52, d: 36, r: 2 }, 250, 18, P, 2, 0.6), { tone: "mid" }));
    out.push(`<path class="softbox" d="${k.pathOf([at([x - 22, -4, 250]), at([x + 22, -4, 250]), at([x + 22, 24, 250]), at([x - 22, 24, 250])], true)}"/>`);
  }
  return out.join("");
}
function chair() {
  const [x, y] = V.SUBJECT.at;
  const out = [`<path class="iso-halo" d="${k.haloOf({ x: x - 30, y: y - 30, w: 60, d: 60, r: 30 }, 0, 4, P)}"/>`];
  out.push(S(k.cylinder(x, y, 26, 0, 3, P, 40, 0.6), { tone: "mid" }));
  out.push(S(k.cylinder(x, y, 4, 3, 36, P, 18), { tone: "mid" }));
  out.push(S(k.slabOf({ x: x - 26, y: y - 22, w: 52, d: 48, r: 10 }, 39, 9, P, 6, 0.8), { tone: "hi", className: "chair" }));
  out.push(S(k.slabOf({ x: x - 24, y: y - 34, w: 48, d: 12, r: 6 }, 48, 70, P, 6, 0.8), { tone: "hi", className: "chair" }));
  for (const s of [-1, 1]) out.push(S(k.slabOf({ x: x + s * 26 - (s > 0 ? 0 : 8), y: y - 18, w: 8, d: 38, r: 3 }, 48, 16, P, 3, 0.5), { tone: "hi", className: "chair" }));
  return out.join("");
}
// A trolley of brushes and products beside the chair.
function trolley() {
  const out = [];
  const T = { x: 150, y: 20, w: 56, d: 34, r: 1.5 };
  for (const [x, y] of byDepth(k.corners(T, 3))) out.push(S(k.cylinder(x, y, 1.4, 0, 78, P, 10), { tone: "mid" }));
  out.push(S(k.slabOf(T, 32, 2, P, 2), { tone: "mid", className: "wood" }));
  out.push(S(k.slabOf(T, 78, 3, P, 2, 0.5), { tone: "mid", className: "wood" }));
  out.push(S(k.cylinder(T.x + 10, T.y + 10, 4, 81, 10, P, 16), { tone: "mid" }));
  for (const [dx, dy, h] of byDepth([[8, 8, 18], [11, 12, 16], [12, 7, 20]]).map((p) => p)) { out.push(S(k.cylinder(T.x + dx, T.y + dy, 0.7, 88, h, P, 8), { tone: "hi" })); out.push(S(k.cylinder(T.x + dx, T.y + dy, 1.1, 88 + h - 4, 4, P, 8), { tone: "mid", className: "wood" })); }
  for (const [dx, dy, r, h] of [[24, 12, 2.6, 12], [32, 20, 3, 8], [42, 10, 2.2, 14], [46, 24, 3.4, 6]]) out.push(S(k.cylinder(T.x + dx, T.y + dy, r, 81, h, P, 14), { tone: "hi", className: "product" }));
  out.push(S(k.slabOf({ x: T.x + 20, y: T.y + 22, w: 14, d: 8, r: 1 }, 81, 2, P, 2), { tone: "mid" }));
  return out.join("");
}

// ---------- the camera array ----------
const CAM_N = V.RIG.count;
function rig() {
  const [sx, sy] = V.SUBJECT.at;
  const band = (r0, r1, z, h, cls, tone) => {
    const pts = [];
    for (let a = V.RIG.from + 8; a >= V.RIG.to - 8; a -= 3) pts.push([sx + Math.cos((a * Math.PI) / 180) * r1, sy + Math.sin((a * Math.PI) / 180) * r1]);
    for (let a = V.RIG.to - 8; a <= V.RIG.from + 8; a += 3) pts.push([sx + Math.cos((a * Math.PI) / 180) * r0, sy + Math.sin((a * Math.PI) / 180) * r0]);
    return S(k.extrude(pts, z, h, P, { convex: false, bevel: 0.6 }), { tone, className: cls });
  };
  const out = [];
  out.push(`<path class="iso-halo" d="${k.haloOf({ x: sx - 250, y: sy + 100, w: 500, d: 170, r: 60 }, 0, 6, P)}"/>`);
  out.push(band(V.RIG.r - 26, V.RIG.r + 26, 0, 5, "rig", "mid"));
  const cams = [];
  for (let i = 0; i < CAM_N; i++) {
    const c = V.cameraPos(i);
    const unit = [];
    unit.push(S(k.slabOf({ x: c[0] - 9, y: c[1] - 2, w: 18, d: 4, r: 1 }, 5, 3, P, 1), { tone: "mid", className: "rig" }));
    unit.push(S(k.slabOf({ x: c[0] - 2, y: c[1] - 9, w: 4, d: 18, r: 1 }, 5, 3, P, 1), { tone: "mid", className: "rig" }));
    unit.push(S(k.cylinder(c[0], c[1], 2.4, 8, 90, P, 14), { tone: "mid", className: "rig" }));
    cams.push([depth([c[0], c[1], 0]), i, unit.join("")]);
  }
  // Posts first (far to near), then the rail, then the cameras on top of it.
  cams.sort((a, b) => a[0] - b[0]);
  out.push(...cams.map((c) => c[2]));
  out.push(band(V.RIG.r - 7, V.RIG.r + 7, 98, 6, "rig", "mid"));
  const heads = [];
  for (let i = 0; i < CAM_N; i++) {
    const c = V.cameraPos(i);
    const target = [V.SUBJECT.at[0], V.SUBJECT.at[1], 118];
    const a = v3.unit(v3.sub(target, c));
    const u = v3.unit(v3.cross([0, 0, 1], a));
    const CF = G.frameOf(c, a, u, v3.cross(a, u));
    const parts = [
      S(k.cylinder(c[0], c[1], 3.4, 104, 6, P, 14), { tone: "mid" }),
      S(G.sphereOf([c[0], c[1], 113], 3.4, P), { tone: "mid" }),
      S(G.prismOf(CF, [[-4.5, -4], [4.5, -4], [4.5, 5.5], [-4.5, 5.5]], -9, 3, P), { tone: "mid", className: "cam-body" }),
      S(G.prismOf(CF, [[-1.5, 5.5], [1.5, 5.5], [1.5, 7.5], [-1.5, 7.5]], -6, 0, P), { tone: "mid", className: "cam-body" }),
    ];
    const lens = S(G.solidOf([[3, 3.4], [5, 3.6], [5, 4.2], [13, 4.2], [13, 3.8], [15, 3.8]], CF, P), { tone: "mid", className: "cam-lens" });
    const facing = depth(CF.a) - depth([0, 0, 0]);
    heads.push([depth([c[0], c[1], 0]), `<g data-cam="${i}">${facing < 0 ? lens + parts.join("") : parts.join("") + lens}<g class="cam-tally">${Dots([at(v3.add(v3.add(c, CF.v, 8.4), CF.a, -2))], { size: 0.9, tone: "hi" })}</g></g>`]);
  }
  heads.sort((a, b) => a[0] - b[0]);
  out.push(...heads.map((h) => h[1]));
  // The cable loop at the right end, coiled on the floor.
  const end = V.cameraPos(CAM_N - 1);
  out.push(L(Array.from({ length: 3 }, (_, i) => k.ring(end[0] + 40, end[1] + 30, 12 + i * 2.2, 0.8, P, 40)).join(""), { tone: "hi" }));
  return out.join("");
}

// ---------- the viewer: monitor on a desk, the learner with the mouse ----------
const ANGLE_NAMES = ["클로즈업 · 좌측면", "", "", "", "정면", "", "", "", "투샷 · 우측 사면"];
function viewer() {
  const out = [`<path class="iso-halo" d="${k.haloOf({ x: DESK.x, y: DESK.y, w: DESK.w, d: DESK.d + 80, r: 10 }, 0, 4, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(DESK, 5))) out.push(S(k.cylinder(x, y, 2, 0, 69, P, 14), { tone: "mid" }));
  out.push(S(k.slabOf(DESK, 69, 3, P, 2, 0.6), { tone: "mid", className: "wood" }));
  // Monitor on a centre foot.
  const cx = (MONI.x0 + MONI.x1) / 2;
  out.push(S(k.slabOf({ x: cx - 20, y: MONI.y - 2, w: 40, d: 22, r: 3 }, 72, 2, P, 3, 0.4), { tone: "mid" }));
  out.push(S(k.slabOf({ x: cx - 4, y: MONI.y - 4, w: 8, d: 4, r: 1 }, 74, MONI.z0 - 70, P, 2), { tone: "mid" }));
  out.push(S(k.slabOf({ x: MONI.x0, y: MONI.y - MONI.depth, w: MONI.x1 - MONI.x0, d: MONI.depth, r: 1.5 }, MONI.z0, MONI.z1 - MONI.z0, P, 2, 0.5), { tone: "mid" }));
  const n = CAM_N;
  const tw = (MAIN.x1 - MAIN.x0 - (n - 1) * 1.2) / n;
  const thumbs = Array.from({ length: n }, (_, i) => {
    const x0 = MAIN.x0 + i * (tw + 1.2);
    return `<clipPath id="th-${i}"><path d="${rectPath(x0, THUMBS.y0, x0 + tw, THUMBS.y1)}"/></clipPath><g clip-path="url(#th-${i})"><g data-thumb="${i}"></g></g><path class="th-frame" data-thumb-frame="${i}" d="${rectPath(x0, THUMBS.y0, x0 + tw, THUMBS.y1)}"/>`;
  }).join("");
  out.push(
    `<g transform="${planeOf(MONI.y)}" data-monitor>`,
    `<path class="mon-glass" d="${rectPath(MONI.x0 + 3, -(MONI.z1 - 3), MONI.x1 - 3, -(MONI.z0 + 3), 0.8)}"/>`,
    `<clipPath id="main-clip"><path d="${rectPath(MAIN.x0, MAIN.y0, MAIN.x1, MAIN.y1)}"/></clipPath>`,
    `<g clip-path="url(#main-clip)"><g data-view="main"></g></g>`,
    `<path class="mon-band" d="${rectPath(MAIN.x0, MAIN.y0, MAIN.x1, MAIN.y0 + 11)}"/>`,
    `<text class="mon-title" x="${MAIN.x0 + 4}" y="${MAIN.y0 + 8}" font-size="6">다각도 강의 뷰어</text>`,
    `<text class="mon-cam" data-cam-label x="${MAIN.x1 - 4}" y="${MAIN.y0 + 8}" font-size="5.4" text-anchor="end">카메라 1 / 9</text>`,
    thumbs,
    `<path class="sl-track" d="M${SLIDER.x0} ${SLIDER.y}H${SLIDER.x1}"/>`,
    ...Array.from({ length: n }, (_, i) => `<circle class="sl-tick" cx="${(SLIDER.x0 + ((SLIDER.x1 - SLIDER.x0) * i) / (n - 1)).toFixed(2)}" cy="${SLIDER.y}" r="0.9"/>`),
    `<circle class="sl-knob" data-knob cx="${SLIDER.x0}" cy="${SLIDER.y}" r="2.6"/>`,
    `<text class="sl-label" x="${SLIDER.x0 - 3}" y="${SLIDER.y + 2}" font-size="4.6" text-anchor="end">클로즈업</text>`,
    `<text class="sl-label" x="${SLIDER.x1 + 3}" y="${SLIDER.y + 2}" font-size="4.6">투샷</text>`,
    `</g>`,
    `<path class="iso-line" data-tone="lo" transform="${planeOf(MONI.y)}" d="${rectPath(MONI.x0 + 3, -(MONI.z1 - 3), MONI.x1 - 3, -(MONI.z0 + 3), 0.8)}"/>`,
  );
  // Keyboard, and the mouse the learner drags (moved live).
  out.push(S(k.slabOf({ x: 618, y: 348, w: 46, d: 14, r: 1 }, 72, 1.6, P, 2), { tone: "mid" }));
  out.push(`<g data-mouse>${S(k.slabOf({ x: 686, y: 352, w: 7, d: 11, r: 3.4 }, 72, 2.4, P, 3), { tone: "hi" })}</g>`);
  out.push(S(k.slabOf({ x: 676, y: 346, w: 34, d: 24, r: 2 }, 72, 0.4, P, 2), { tone: "lo", crease: "none" }));
  return `<g data-slot="viewer" data-depth="${depth([DESK.x + DESK.w / 2, DESK.y + DESK.d / 2, 0]).toFixed(2)}">${out.join("")}</g>`;
}
const SEATED_L = { tilt: 6, nod: 8, R: { thigh: [88, 6], shin: [8, 180], foot: [68, 6] }, L: { thigh: [88, -6], shin: [8, 180], foot: [68, 6] }, RA: { upper: [40, 14], fore: [86, 8] }, LA: { upper: [34, 4], fore: [86, -20] } };
function learner() {
  const [x, y] = LEARNER.at;
  const out = [];
  for (const [px, py] of byDepth([[x - 18, y - 16], [x + 18, y - 16], [x - 18, y + 16], [x + 18, y + 16]])) out.push(S(k.cylinder(px, py, 1.1, 0, 43, P, 12), { tone: "mid" }));
  out.push(S(k.slabOf({ x: x - 21, y: y - 20, w: 42, d: 40, r: 3 }, 43, 3, P, 3, 0.4), { tone: "mid" }));
  out.push(DN.mannequinSvg(M.skeleton(M.flatten(SEATED_L)), [x, y + 2], P, k.iso, k.depthOf, 0));
  out.push(S(k.slabOf({ x: x - 21, y: y + 18, w: 42, d: 2.6, r: 1 }, 54, 28, P, 2, 0.4), { tone: "mid" }));
  return `<g data-slot="learner" data-depth="${depth([x, y, 0]).toFixed(2)}">${out.join("")}</g>`;
}

// ---------- assemble ----------
const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label: "다각도 관찰 모듈: 흰 호리존 스튜디오에서 반원형 레일 위 카메라 9대가 약 120도에 걸쳐 한 점을 향하고, 그곳에서 시연자가 의자에 앉은 모델에게 브러시로 메이크업을 한다. 앞쪽 모니터의 강의 뷰어에서 학습자가 마우스를 왼쪽으로 옮길수록 모델 얼굴 클로즈업, 오른쪽으로 옮길수록 시연자와 모델이 함께 보이는 각도로 끊김 없이 바뀐다.",
  body: [floor(), cyclorama(), trolley(), chair(), `<g data-part="people"></g>`, lights(), rig(), `<g data-layer="front">${[viewer(), learner()].sort((a, b) => Number(/data-depth="([-\d.]+)"/.exec(a)[1]) - Number(/data-depth="([-\d.]+)"/.exec(b)[1])).join("")}</g>`],
});

const strip = (file) => readFileSync(join(HERE, file), "utf8").replace(/^import .*$/gm, "").replace(/^export /gm, "");
const live = `
${strip("../01.ballet-mirror/model.mjs")}
${strip("../01.ballet-mirror/dancer.mjs")}
${strip("views.mjs")}
const P = ${JSON.stringify(P)};
const ARTIST_RA = ${JSON.stringify(RA.ra)};
const MAIN = ${JSON.stringify(MAIN)};
const THUMBS = ${JSON.stringify(THUMBS)};
const SLIDER = ${JSON.stringify(SLIDER)};
const ANGLE_NAMES = ${JSON.stringify(ANGLE_NAMES)};
${readFileSync(join(HERE, "live.js"), "utf8")}
`;

const css = `<style>
.iso{--skin:#f1d3c0;--skin-edge:#c99a83;--hair:#2a2220;--top:#222;--pants:#3b4252;--shirt:#f7f7f5;--apron:#1d1d1d;--chair:#d9d6d0}
.cyc .iso-fill,.cyc .iso-top,.cyc .iso-shade{fill:var(--anatomy-paper)} .cyc .iso-shade[data-shade="0"]{fill:var(--anatomy-shade-1)}
.cyc-cove{fill:var(--anatomy-paper);opacity:.6}
.softbox{fill:#fffbe8;stroke:var(--anatomy-mid);stroke-width:.5px;vector-effect:non-scaling-stroke}
.iso[data-theme="dark"] .softbox{fill:#5a5644}
.rig .iso-fill,.rig .iso-top{fill:#2a2a2c} .rig .iso-shade{fill:#1f1f21} .rig .iso-shade[data-shade="3"]{fill:#333336}
.iso[data-theme="dark"] .rig .iso-fill,.iso[data-theme="dark"] .rig .iso-top{fill:#202022}
.cam-body .iso-fill,.cam-body .iso-top,.cam-body .iso-shade{fill:#2b2b2e} .cam-lens .iso-fill,.cam-lens .iso-shade,.cam-lens .iso-top{fill:#1c1c1e}
.cam-tally .iso-dots circle{fill:var(--anatomy-shade-1);transition:fill .2s}
[data-cam][data-on] .cam-tally .iso-dots circle{fill:var(--anatomy-red)}
[data-cam][data-on] .iso-edge{stroke:var(--anatomy-lit)}
.wood .iso-fill,.wood .iso-top{fill:#e9d8bd} .wood .iso-shade{fill:#d8c3a2}
.iso[data-theme="dark"] .wood .iso-fill,.iso[data-theme="dark"] .wood .iso-top{fill:#4a3f30} .iso[data-theme="dark"] .wood .iso-shade{fill:#3d3428}
.product .iso-fill,.product .iso-top,.product .iso-shade{fill:#f3c1cc}
.chair .iso-fill,.chair .iso-top{fill:#ecebe8} .chair .iso-shade{fill:#dedcd8}
.iso[data-theme="dark"] .chair .iso-fill,.iso[data-theme="dark"] .chair .iso-top{fill:#3a3936} .iso[data-theme="dark"] .chair .iso-shade{fill:#302f2c}
.iso-svg [data-monitor] path,.iso-svg [data-monitor] circle,.iso-svg [data-monitor] ellipse{vector-effect:none}
.mon-glass{fill:#101215}
.mon-band{fill:#000;opacity:.55}
.mon-title{fill:#fff;font-family:"Pretendard","Malgun Gothic",ui-sans-serif,sans-serif;font-weight:700;paint-order:stroke;stroke:#000;stroke-opacity:.35;stroke-width:.6}
.mon-cam{fill:#ff5a5a;font-family:"Pretendard","Malgun Gothic",ui-sans-serif,sans-serif;font-weight:700;paint-order:stroke;stroke:#000;stroke-opacity:.3;stroke-width:.6}
.th-frame{fill:none;stroke:#555;stroke-width:.4} .th-frame[data-on]{stroke:#ff5a5a;stroke-width:.9}
.sl-track{fill:none;stroke:#555;stroke-width:1;stroke-linecap:round} .sl-tick{fill:#777} .sl-knob{fill:#fff;stroke:#ff5a5a;stroke-width:.8}
.sl-label{fill:#c8ccd2;font-family:"Pretendard","Malgun Gothic",sans-serif;font-weight:600}
.vw-cyc{fill:#f4f3f0} .vw-floor{fill:#e4e2dd}
.vw-chair{fill:none;stroke:var(--chair);stroke-linecap:round} .vw-metal{fill:none;stroke:#b9b9b9;stroke-linecap:round}
.vw-skin{fill:var(--skin)} path.vw-skin{fill:none;stroke:var(--skin);stroke-linecap:round}
.vw-top{fill:none;stroke:var(--top);stroke-linecap:round} .vw-pants{fill:none;stroke:var(--pants);stroke-linecap:round}
.vw-shirt{fill:none;stroke:var(--shirt);stroke-linecap:round} .vw-dark,.vw-apron{fill:none;stroke:var(--apron);stroke-linecap:round} .vw-shoe{fill:none;stroke:#111;stroke-linecap:round}
circle.vw-skin{fill:var(--skin)}
.vw-hair{fill:var(--hair)} .vw-lash,.vw-brow,.vw-nose{fill:none;stroke:#5a3d33;stroke-linecap:round} .vw-nose{stroke:var(--skin-edge)}
.vw-eye{fill:#2a2220} .vw-lip{fill:#c9737a} .vw-blush{fill:#e88f9a;opacity:.45}
.vw-brush{fill:none;stroke:#2d2d2d;stroke-linecap:round} .vw-tuft{fill:none;stroke:#b9865a;stroke-linecap:round}
.room-brush{fill:var(--anatomy-shade-1);stroke:var(--anatomy-hi);stroke-width:var(--anatomy-weight);vector-effect:non-scaling-stroke}
.mq-body{fill:var(--anatomy-shade-2)}
.mq-shade{fill:var(--anatomy-shade-0);opacity:.9}
.mq-shine{fill:var(--anatomy-lit-top)}
.mq-edge{fill:none;stroke:var(--anatomy-hi);stroke-width:var(--anatomy-weight);vector-effect:non-scaling-stroke;stroke-linejoin:round}
.iso-plate-corner{font-family:"Pretendard","Malgun Gothic","Apple SD Gothic Neo",ui-sans-serif,system-ui,sans-serif;font-size:11.5px;letter-spacing:0}
.mk-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
.iso-stage{touch-action:none;cursor:ew-resize;user-select:none;-webkit-user-select:none}
.iso-stage:focus{outline:none}
.iso-stage:focus-visible{outline:1px solid var(--anatomy-muted);outline-offset:6px}
</style>`;

const body = css + k.plateHtml({
  fig: "Fig 6",
  title: "다각도 관찰 모듈 · 메이크업 카메라 어레이",
  hint: "좌우로 드래그·스크롤·←→ 키 · 카메라 각도 전환",
  readout: "",
  keys: [
    { mark: "lit", label: "카메라 9대: 반원형 레일 위 약 120°에 걸쳐 같은 점을 향함 (지금 보는 카메라에 불이 켜짐)" },
    { mark: "raised", label: "시연자: 의자에 앉은 모델에게 브러시로 메이크업 (콧등·볼)" },
    { mark: "flat", label: "강의 뷰어: 왼쪽으로 갈수록 얼굴 클로즈업, 오른쪽으로 갈수록 시연자와 모델 투샷" },
  ],
  caption: "흰 호리존 스튜디오의 반원형 레일에 카메라 9대가 약 15° 간격, 같은 눈높이로 서서 하나의 메이크업 시연을 동시에 찍는다. 학습자는 강의 뷰어에서 좌우로 드래그하거나 스크롤해 각도를 끊김 없이 바꾼다. 왼쪽 끝 카메라는 모델의 얼굴을 가까이 잡아 브러시가 피부에 닿는 결을 보여 주고, 오른쪽으로 갈수록 화면이 넓어져 시연자의 손과 자세까지 함께 보인다. 아래 썸네일 9개가 각 카메라의 화면이다.",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-valuemin="1" aria-valuemax="9" aria-valuenow="1" aria-label="카메라 각도. 좌우로 드래그하거나 화살표 키로 바꿉니다.">${svg}<span class="mk-sr" role="status" aria-live="polite" data-status></span></div>`,
});

const name = theme === "light" ? "makeup-array-light.html" : "makeup-array.html";
writeFileSync(join(HERE, name), k.pageHtml({ title: "다각도 관찰 모듈 · 메이크업 카메라 어레이", theme, body, script: kitScript() + live, width: 760 }));
console.log("wrote", name, "reach", RA.d.toFixed(1), RA.ra);
