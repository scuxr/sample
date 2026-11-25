// Who does what, when; and how each of them looks on a webcam and on the Zoom screen.
// Pure: inlined into the page after model.mjs and dancer.mjs.
import { flatten, walkPose, skeleton } from "../01.ballet-mirror/model.mjs";
import { screenFigureSvg } from "../01.ballet-mirror/dancer.mjs";

export const PROF = { at: [-210, -168], heading: 180, walk: 46 };
export const PLACES = [
  { name: "참가자 1", where: "서울 · 집", x0: -430, seat: "chair", bg: "home", top: "#5b7db1" },
  { name: "참가자 2", where: "부산 · 카페", x0: -210, seat: "chair", bg: "cafe", top: "#b4694a" },
  { name: "참가자 3", where: "대전 · 도서관", x0: 10, seat: "chair", bg: "library", top: "#4f8a6a" },
  { name: "참가자 4", where: "제주 · 거실", x0: 230, seat: "sofa", bg: "living", top: "#8a5fa8", heading: 90 },
];
export const ISLAND = { y0: 70, d: 196, w: 200 };
export const personAt = (i) => (PLACES[i].seat === "sofa" ? [PLACES[i].x0 + 78, ISLAND.y0 + 110] : [PLACES[i].x0 + 100, ISLAND.y0 + 120]);
export const headingOf = (i) => PLACES[i].heading || 0;

const set = (f, i, v) => { f[i] = v; };
// Flat indices (model.mjs): RA upper 13,14  RA fore 15,16  LA upper 17,18  LA fore 19,20  roll 21  nod 22.
function arms(f, ra, la) { set(f, 13, ra[0]); set(f, 14, ra[1]); set(f, 15, ra[2]); set(f, 16, ra[3]); set(f, 17, la[0]); set(f, 18, la[1]); set(f, 19, la[2]); set(f, 20, la[3]); }
const mixA = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const sm = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));
const pulse = (t, start, len, fade = 0.5) => sm((t - start) / fade) * (1 - sm((t - start - len) / fade));

// ---------- the professor: walks along the bench, holds the pot, shows it, points at the leaves ----------
export const PROF_CYCLE = 16;
export function profState(t) {
  const u = t % PROF_CYCLE;
  // Walk left, stop, explain; walk right, stop, lift the pot up to the camera.
  const walkX = -Math.cos((u / PROF_CYCLE) * Math.PI * 2) * PROF.walk;
  const speed = Math.abs(Math.sin((u / PROF_CYCLE) * Math.PI * 2));
  const lift = pulse(u, 9.5, 3.2, 0.7);
  const point = pulse(u, 3.2, 3, 0.5);
  const open = pulse(u, 12.8, 2.6, 0.5);
  const f = walkPose((t * 0.9) % 1000, { stride: 12 * speed, tilt: 1, roll: 0, nod: 4 - lift * 10, arms: 0.2, bend: 10 * speed });
  const hold = [28, 8, 96, -48];
  const holdUp = [68, 8, 128, -36];
  const rest = [12, 30, 30, 10];
  const pointing = [58, 2, 84, -40];
  const opening = [42, 60, 62, 40];
  // Her left hand carries the pot; her right hand points, opens toward the camera, or rests.
  let ra = rest;
  ra = mixA(ra, pointing, point);
  ra = mixA(ra, opening, open);
  ra = mixA(ra, [40, -6, 110, -60], lift);
  arms(f, ra, mixA(hold, holdUp, lift));
  return { flat: f, at: [PROF.at[0] + walkX, PROF.at[1]], lift, point, open, talking: true };
}
// ---------- the participants ----------
export function partState(i, t) {
  const base = flatten({ tilt: 4, nod: 4, R: { thigh: [86, 6], shin: [8, 180], foot: [68, 6] }, L: { thigh: [86, -6], shin: [8, 180], foot: [68, 6] }, RA: { upper: [36, 10], fore: [86, 4] }, LA: { upper: [34, 6], fore: [84, -16] } });
  const f = base.slice();
  let hand = 0, talking = 0, nod = 0;
  if (i === 0) {
    // Raises a hand to ask, every so often.
    hand = pulse(t % 18, 5, 4.2, 0.6);
    arms(f, mixA([36, 10, 86, 4], [168, 14, 176, 4], hand), [34, 6, 84, -16]);
  } else if (i === 1) {
    // Asks a question: talks, gestures with one hand.
    talking = pulse(t % 18, 11, 4.5, 0.4);
    const g = talking * (0.5 + 0.5 * Math.sin(t * 5));
    arms(f, mixA([36, 10, 86, 4], [44, 40, 70, 40], g), [34, 6, 84, -16]);
    nod = talking * 4 * Math.sin(t * 3.1);
  } else if (i === 2) {
    // Takes notes: the writing hand moves on the desk.
    arms(f, [38, 12, 88, 4 + 10 * Math.sin(t * 6)], [30, 4, 82, -24]);
    nod = 10;
  } else {
    // On the sofa with a tablet, nodding along.
    arms(f, [30, 12, 104, -40], [30, 12, 104, -40]);
    nod = 8 + 6 * Math.sin(t * 1.6);
  }
  f[22] += nod;
  return { flat: f, hand, talking };
}
export function speakerOf(t, parts) {
  const p2 = parts[1].talking > 0.5;
  return p2 ? 2 : 0; // 0 professor, 2 participant 2
}

// ---------- webcam portraits ----------
const pf = (v) => (Math.round(v * 10) / 10).toString();
const rr = (x0, y0, x1, y1, r) => "M" + pf(x0 + r) + " " + pf(y0) + "H" + pf(x1 - r) + "Q" + pf(x1) + " " + pf(y0) + " " + pf(x1) + " " + pf(y0 + r) + "V" + pf(y1 - r) + "Q" + pf(x1) + " " + pf(y1) + " " + pf(x1 - r) + " " + pf(y1) + "H" + pf(x0 + r) + "Q" + pf(x0) + " " + pf(y1) + " " + pf(x0) + " " + pf(y1 - r) + "V" + pf(y0 + r) + "Q" + pf(x0) + " " + pf(y0) + " " + pf(x0 + r) + " " + pf(y0) + "Z";
function backdrop(kind, r) {
  const w = r.x1 - r.x0, h = r.y1 - r.y0;
  const out = [];
  const rect = (x0, y0, x1, y1, cls) => out.push('<path class="' + cls + '" d="M' + pf(x0) + " " + pf(y0) + "H" + pf(x1) + "V" + pf(y1) + "H" + pf(x0) + 'Z"/>');
  if (kind === "greenhouse") {
    rect(r.x0, r.y0, r.x1, r.y1, "pt-gh");
    for (let i = 1; i < 6; i++) out.push('<path class="pt-ghbar" d="M' + pf(r.x0 + (w * i) / 6) + " " + pf(r.y0) + "V" + pf(r.y1) + '"/>');
    out.push('<path class="pt-ghbar" d="M' + pf(r.x0) + " " + pf(r.y0 + h * 0.3) + "H" + pf(r.x1) + '"/>');
    for (let i = 0; i < 9; i++) out.push('<circle class="' + (i % 3 ? "pt-leaf" : "pt-leaf2") + '" cx="' + pf(r.x0 + w * (0.05 + i * 0.115)) + '" cy="' + pf(r.y0 + h * (0.62 + 0.06 * Math.sin(i * 2.1))) + '" r="' + pf(h * (0.11 + 0.03 * Math.cos(i))) + '"/>');
    rect(r.x0, r.y0 + h * 0.72, r.x1, r.y0 + h * 0.78, "pt-bench");
  } else if (kind === "home") {
    rect(r.x0, r.y0, r.x1, r.y1, "pt-home");
    rect(r.x0 + w * 0.62, r.y0 + h * 0.12, r.x0 + w * 0.95, r.y0 + h * 0.6, "pt-shelf");
    for (let i = 0; i < 3; i++) rect(r.x0 + w * 0.62, r.y0 + h * (0.25 + i * 0.13), r.x0 + w * 0.95, r.y0 + h * (0.26 + i * 0.13), "pt-shelfline");
  } else if (kind === "cafe") {
    rect(r.x0, r.y0, r.x1, r.y1, "pt-cafe");
    rect(r.x0 + w * 0.05, r.y0 + h * 0.08, r.x0 + w * 0.4, r.y0 + h * 0.55, "pt-window");
    out.push('<circle class="pt-lamp" cx="' + pf(r.x0 + w * 0.78) + '" cy="' + pf(r.y0 + h * 0.16) + '" r="' + pf(h * 0.06) + '"/>');
  } else if (kind === "library") {
    rect(r.x0, r.y0, r.x1, r.y1, "pt-lib");
    for (let i = 0; i < 14; i++) rect(r.x0 + (w * i) / 14 + 0.3, r.y0 + h * (0.08 + (i % 3) * 0.02), r.x0 + (w * (i + 1)) / 14 - 0.3, r.y0 + h * 0.4, i % 2 ? "pt-book" : "pt-book2");
    for (let i = 0; i < 14; i++) rect(r.x0 + (w * i) / 14 + 0.3, r.y0 + h * (0.46 + (i % 2) * 0.03), r.x0 + (w * (i + 1)) / 14 - 0.3, r.y0 + h * 0.78, i % 3 ? "pt-book2" : "pt-book");
  } else {
    rect(r.x0, r.y0, r.x1, r.y1, "pt-living");
    out.push('<circle class="pt-leaf" cx="' + pf(r.x0 + w * 0.85) + '" cy="' + pf(r.y0 + h * 0.45) + '" r="' + pf(h * 0.16) + '"/>');
    rect(r.x0 + w * 0.82, r.y0 + h * 0.55, r.x0 + w * 0.88, r.y1, "pt-pot");
  }
  return out.join("");
}
// A person on their webcam: chest up, face toward the camera, a few features.
export function portrait(J, r, { kind, cls, talking = 0, t = 0, pot = null, top = "#666", hair = "#2a2220" }) {
  const w = r.x1 - r.x0, h = r.y1 - r.y0;
  const s = h / 78;
  const cx = (r.x0 + r.x1) / 2;
  const headY = r.y0 + h * 0.36;
  const floor = -(headY) - J.head[2] * s;
  const out = [backdrop(kind, r)];
  out.push('<g style="--pt-top:' + top + '">' + screenFigureSvg(J, { yaw: 0, mirror: true, cx, floor, scale: s, cls }) + "</g>");
  const at = (p) => [cx + p[0] * s * -1 * -1, -(floor + p[2] * s)];
  const hc = at([J.head[0], 0, J.head[2]]);
  // screenFigureSvg puts her right on the viewer's left when not mirrored: x = cx - r... so mirror the face too.
  const hx = cx - (J.head[0]) * s;
  const R = 10.5 * s;
  out.push('<path class="pt-hair" style="fill:' + hair + '" d="M' + pf(hx - R * 1.02) + " " + pf(hc[1] + R * 0.1) + "Q" + pf(hx) + " " + pf(hc[1] - R * 1.55) + " " + pf(hx + R * 1.02) + " " + pf(hc[1] + R * 0.1) + "Q" + pf(hx) + " " + pf(hc[1] - R * 0.7) + " " + pf(hx - R * 1.02) + " " + pf(hc[1] + R * 0.1) + 'Z"/>');
  for (const sx of [-0.36, 0.36]) out.push('<circle class="pt-eye" cx="' + pf(hx + sx * R) + '" cy="' + pf(hc[1] + R * 0.05) + '" r="' + pf(R * 0.1) + '"/>');
  const open = talking ? 0.08 + 0.12 * Math.abs(Math.sin(t * 9)) : 0.03;
  out.push('<ellipse class="pt-mouth" cx="' + pf(hx) + '" cy="' + pf(hc[1] + R * 0.5) + '" rx="' + pf(R * 0.22) + '" ry="' + pf(R * open + 0.2) + '"/>');
  if (pot) {
    const p = [cx - pot[0] * s, -(floor + pot[2] * s)];
    out.push('<path class="pt-potbody" d="M' + pf(p[0] - 7 * s) + " " + pf(p[1]) + "L" + pf(p[0] + 7 * s) + " " + pf(p[1]) + "L" + pf(p[0] + 5.4 * s) + " " + pf(p[1] + 11 * s) + "L" + pf(p[0] - 5.4 * s) + " " + pf(p[1] + 11 * s) + 'Z"/>');
    for (const [dx, dy, rr2] of [[-5, -6, 6], [5, -7, 6], [0, -12, 7], [-8, -13, 4.5], [8, -14, 4.5]]) out.push('<circle class="pt-plant" cx="' + pf(p[0] + dx * s) + '" cy="' + pf(p[1] + dy * s) + '" r="' + pf(rr2 * s) + '"/>');
  }
  void at; void w;
  return out.join("");
}

// ---------- the Zoom screen ----------
export const MODES = ["전체 보기", "교수", "참가자 1", "참가자 2", "참가자 3", "참가자 4"];
// tiles: [{ who: -1 professor | 0..3, r }]
export function galleryTiles(r) {
  const gap = (r.x1 - r.x0) * 0.012;
  const w = (r.x1 - r.x0 - gap * 4) / 3, h = (r.y1 - r.y0 - gap * 3) / 2;
  const cell = (c, row, span = 1) => ({ x0: r.x0 + gap + c * (w + gap), y0: r.y0 + gap + row * (h + gap), x1: r.x0 + gap + c * (w + gap) + w * span + gap * (span - 1), y1: r.y0 + gap + row * (h + gap) + h });
  return [{ who: -1, r: cell(0, 0, 2) }, { who: 0, r: cell(2, 0) }, { who: 1, r: cell(0, 1) }, { who: 2, r: cell(1, 1) }, { who: 3, r: cell(2, 1) }];
}
export function tileSvg(who, r, st, t, { big = false } = {}) {
  const out = [];
  const inner = { x0: r.x0, y0: r.y0, x1: r.x1, y1: r.y1 };
  const id = "c" + Math.round(r.x0 * 10) + "_" + Math.round(r.y0 * 10);
  out.push('<clipPath id="' + id + '"><path d="' + rr(inner.x0, inner.y0, inner.x1, inner.y1, Math.min(3, (r.x1 - r.x0) * 0.03)) + '"/></clipPath><g clip-path="url(#' + id + ')">');
  if (who < 0) {
    // Professor: a wider frame of the greenhouse, chest up, the pot in her hands.
    const J = skeleton(st.prof.flat);
    const wr = J.wristL;
    out.push(portrait(J, inner, { kind: "greenhouse", cls: "pt-prof", talking: !st.parts[1].talking || st.parts[1].talking < 0.5 ? 1 : 0, t, pot: [wr[0], 0, wr[2] + 6], top: "#2f6b45", hair: "#3a2a22" }));
  } else {
    const p = PLACES[who];
    out.push(portrait(skeleton(st.parts[who].flat), inner, { kind: p.bg, cls: "pt-part", talking: st.parts[who].talking > 0.5 ? 1 : 0, t, top: p.top, hair: who === 2 ? "#6b4a2e" : "#241d1a" }));
  }
  out.push("</g>");
  const fs = Math.max(2.2, (r.y1 - r.y0) * (big ? 0.05 : 0.085));
  const label = who < 0 ? "교수 · 온실 스튜디오" : PLACES[who].name + " · " + PLACES[who].where;
  out.push('<path class="zm-name-bg" d="M' + pf(r.x0 + fs * 0.4) + " " + pf(r.y1 - fs * 1.7) + "h" + pf(label.length * fs * 0.78 + fs) + "v" + pf(fs * 1.4) + "h" + pf(-(label.length * fs * 0.78 + fs)) + 'Z"/>');
  out.push('<text class="zm-name" x="' + pf(r.x0 + fs * 0.9) + '" y="' + pf(r.y1 - fs * 0.65) + '" font-size="' + pf(fs) + '">' + label + "</text>");
  const speaking = who < 0 ? st.speaker === 0 : who === 1 && st.speaker === 2;
  if (speaking) out.push('<path class="zm-speaking" d="' + rr(r.x0, r.y0, r.x1, r.y1, Math.min(3, (r.x1 - r.x0) * 0.03)) + '"/>');
  if (who === 0 && st.parts[0].hand > 0.3) {
    const bx = r.x1 - fs * 1.6, by = r.y0 + fs * 1.6;
    out.push('<circle class="zm-hand" cx="' + pf(bx) + '" cy="' + pf(by) + '" r="' + pf(fs * 1.1) + '"/><text class="zm-hand-t" x="' + pf(bx) + '" y="' + pf(by + fs * 0.4) + '" font-size="' + pf(fs * 1.1) + '" text-anchor="middle">✋</text>');
  }
  return out.join("");
}
export function zoomScreen(mode, r, st, t) {
  const out = ['<path class="zm-bg" d="M' + r.x0 + " " + r.y0 + "H" + r.x1 + "V" + r.y1 + "H" + r.x0 + 'Z"/>'];
  const bar = (r.y1 - r.y0) * 0.08;
  const body = { x0: r.x0, y0: r.y0, x1: r.x1, y1: r.y1 - bar };
  if (mode === 0) for (const tile of galleryTiles(body)) out.push(tileSvg(tile.who, tile.r, st, t));
  else {
    const pad = (body.x1 - body.x0) * 0.02;
    out.push(tileSvg(mode === 1 ? -1 : mode - 2, { x0: body.x0 + pad, y0: body.y0 + pad, x1: body.x1 - pad, y1: body.y1 - pad * 0.5 }, st, t, { big: true }));
  }
  // The meeting bar: mute, video, participants, chat, and which view is up.
  const fs = bar * 0.42;
  const y = r.y1 - bar * 0.35;
  out.push('<path class="zm-bar" d="M' + r.x0 + " " + pf(r.y1 - bar) + "H" + r.x1 + "V" + r.y1 + "H" + r.x0 + 'Z"/>');
  const items = ["음소거", "비디오", "참가자 6", "채팅", "손 들기", "기록 ●"];
  items.forEach((s, i) => out.push('<text class="zm-bar-t' + (i === 5 ? " zm-rec" : "") + '" x="' + pf(r.x0 + (r.x1 - r.x0) * (0.06 + i * 0.12)) + '" y="' + pf(y) + '" font-size="' + pf(fs) + '">' + s + "</text>"));
  out.push('<text class="zm-mode" x="' + pf(r.x1 - fs) + '" y="' + pf(y) + '" font-size="' + pf(fs) + '" text-anchor="end">' + MODES[mode] + "</text>");
  return out.join("");
}
