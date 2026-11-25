// The instructor's pad screen, in its own flat coordinates (x right, y up negative), 30 x 20 cm.
// Pure: inlined into the page. Needs screenFigureSvg (dancer.mjs) and fmtClock (walk.mjs) in scope.
import { screenFigureSvg } from "../01.ballet-mirror/dancer.mjs";
import { fmtClock } from "./walk.mjs";

export const PAD = {
  w: 30, h: 20,
  tiles: [{ x0: 2, x1: 14.6 }, { x0: 15.4, x1: 28 }], ty0: -18.6, ty1: -8.6,
  pills: [2, 8.8, 15.6], pillW: 6.2, py0: -7.3, py1: -5.1,
  play: [25.2, -6.2], playR: 1.5,
  bar: { x0: 2.4, x1: 27.6, y: -2.7 },
};
export const ANGLES = ["정면", "측면", "후면"];

const pu = (n) => (Math.round(n * 100) / 100).toString();
const puRect = (x0, y0, x1, y1, r) => "M" + pu(x0 + r) + " " + pu(y0) + "H" + pu(x1 - r) + "A" + r + " " + r + " 0 0 1 " + pu(x1) + " " + pu(y0 + r) + "V" + pu(y1 - r) + "A" + r + " " + r + " 0 0 1 " + pu(x1 - r) + " " + pu(y1) + "H" + pu(x0 + r) + "A" + r + " " + r + " 0 0 1 " + pu(x0) + " " + pu(y1 - r) + "V" + pu(y0 + r) + "A" + r + " " + r + " 0 0 1 " + pu(x0 + r) + " " + pu(y0) + "Z";

// Where a control sits on the pad, for the finger: "angle0..2", "play", or "bar" at a share of the clip.
export function padTarget(name, share = 0) {
  if (name === "play") return PAD.play;
  if (name === "bar") return [PAD.bar.x0 + (PAD.bar.x1 - PAD.bar.x0) * share, PAD.bar.y];
  const i = Number(name.slice(5));
  return [PAD.pills[i] + PAD.pillW / 2, (PAD.py0 + PAD.py1) / 2];
}

// state: { past, now (skeletons or null), yawPast, yawNow, angle, playing, t, total, tap: { at: [x, y], amount }, mode }
export function padUiSvg(state, { id = "pad", text = false } = {}) {
  const out = [];
  out.push('<path class="pad-screen" d="' + puRect(1, -PAD.h + 1, PAD.w - 1, -1, 1) + '"/>');
  PAD.tiles.forEach((tile, i) => {
    const clip = id + "-tile" + i;
    const J = i === 0 ? state.past : state.now;
    const yaw = i === 0 ? state.yawPast : state.yawNow;
    out.push('<clipPath id="' + clip + '"><path d="' + puRect(tile.x0, PAD.ty0, tile.x1, PAD.ty1, 0.6) + '"/></clipPath>');
    out.push('<path class="led-studio" d="' + puRect(tile.x0, PAD.ty0, tile.x1, PAD.ty1, 0.6) + '"/>');
    if (J) out.push('<g clip-path="url(#' + clip + ')">' + screenFigureSvg(J, { yaw, mirror: false, cx: (tile.x0 + tile.x1) / 2, floor: -PAD.ty1 + 0.6, scale: 0.043, cls: i === 0 ? "old" : "new" }) + "</g>");
    if (text) out.push('<text class="pad-label" x="' + pu(tile.x0 + 0.7) + '" y="' + pu(PAD.ty0 + 1.6) + '" font-size="1.15">' + (i === 0 ? "기초 연습" : state.mode === "rec" ? "● 녹화 중" : "오늘") + "</text>");
  });
  PAD.pills.forEach((x, i) => {
    const on = state.angle === i;
    out.push('<path class="pad-pill' + (on ? " on" : "") + '" d="' + puRect(x, PAD.py0, x + PAD.pillW, PAD.py1, 1.1) + '"/>');
    if (text) out.push('<text class="pad-pill-text' + (on ? " on" : "") + '" x="' + pu(x + PAD.pillW / 2) + '" y="' + pu(PAD.py1 - 0.68) + '" font-size="1.25" text-anchor="middle">' + ANGLES[i] + "</text>");
  });
  const [px, py] = PAD.play;
  out.push('<circle class="pad-play' + (state.playing ? " on" : "") + '" cx="' + px + '" cy="' + py + '" r="' + PAD.playR + '"/>');
  out.push(state.playing
    ? '<path class="pad-glyph" d="M' + pu(px - 0.5) + " " + pu(py - 0.6) + "V" + pu(py + 0.6) + "M" + pu(px + 0.5) + " " + pu(py - 0.6) + "V" + pu(py + 0.6) + '"/>'
    : '<path class="pad-glyph-fill" d="M' + pu(px - 0.45) + " " + pu(py - 0.7) + "L" + pu(px + 0.75) + " " + pu(py) + "L" + pu(px - 0.45) + " " + pu(py + 0.7) + 'Z"/>');
  const share = state.total ? Math.min(1, Math.max(0, state.t / state.total)) : 0;
  const bx = PAD.bar.x0 + (PAD.bar.x1 - PAD.bar.x0) * share;
  out.push('<path class="pad-track" d="M' + PAD.bar.x0 + " " + PAD.bar.y + "H" + PAD.bar.x1 + '"/>');
  out.push('<path class="pad-done" d="M' + PAD.bar.x0 + " " + PAD.bar.y + "H" + pu(bx) + '"/>');
  out.push('<circle class="pad-knob" cx="' + pu(bx) + '" cy="' + PAD.bar.y + '" r="0.55"/>');
  if (text) out.push('<text class="pad-time" x="' + pu(PAD.bar.x1) + '" y="' + pu(PAD.bar.y - 0.9) + '" font-size="1.05" text-anchor="end">' + fmtClock(state.t) + " / " + fmtClock(state.total) + "</text>");
  // The touch: a ring that opens as the finger lands.
  if (state.tap && state.tap.amount > 0.02) {
    const [tx, ty] = state.tap.at;
    out.push('<circle class="pad-touch" cx="' + pu(tx) + '" cy="' + pu(ty) + '" r="' + pu(0.9 + 1.6 * state.tap.amount) + '" style="opacity:' + pu(0.9 * state.tap.amount) + '"/>');
  }
  return out.join("");
}
