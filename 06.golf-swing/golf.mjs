// The golf swing, the ball and the four screens. Pure: no imports; inlined into the page after model/dancer.
// Body-local coordinates as model.mjs: [r, f, z] cm, r to the golfer's right, f toward the ball, z up.
// Needs mirrorView, screenFigureSvg (dancer.mjs) in scope.
import { mirrorView } from "../01.ballet-mirror/model.mjs";
import { screenFigureSvg } from "../01.ballet-mirror/dancer.mjs";

const GD = Math.PI / 180;
const gAdd = (a, b, s = 1) => [a[0] + b[0] * s, a[1] + b[1] * s, a[2] + b[2] * s];
const gSub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const gLen = (a) => Math.hypot(a[0], a[1], a[2]);
const gUnit = (a) => { const n = gLen(a) || 1; return [a[0] / n, a[1] / n, a[2] / n]; };
const gLerp = (a, b, t) => a + (b - a) * t;
const gEase = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

export const BALL_LOCAL = [-3, 62, 2.2];
export const CLUB_LEN = 108;
// Swing keys: hand angle on the arc (deg, + toward the right side and up), wrist hinge, shoulder turn, hip turn, weight shift.
export const KEYS = {
  address: { a: 0, hinge: 0, turn: 0, hip: 0, shift: 0, heel: 0 },
  top: { a: 150, hinge: 110, turn: 88, hip: 40, shift: 4, heel: 0 },
  impact: { a: 0, hinge: 0, turn: -18, hip: -38, shift: -7, heel: 0.3 },
  finish: { a: -176, hinge: -78, turn: -96, hip: -82, shift: -13, heel: 1 },
};
export function mixKeys(a, b, t) {
  const o = {};
  for (const k in a) o[k] = gLerp(a[k], b[k], t);
  return o;
}
// Where the swing is at a moment: phase in "address" | "back" (u 0..1 of the backswing reached) | "down" | "follow" | "finish" | "return".
export function swingKey(phase, u, topU = 1) {
  const top = mixKeys(KEYS.address, KEYS.top, topU);
  if (phase === "address") return KEYS.address;
  if (phase === "back") return mixKeys(KEYS.address, KEYS.top, gEase(u) * topU);
  if (phase === "down") return mixKeys(top, KEYS.impact, u * u);
  if (phase === "follow") return mixKeys(KEYS.impact, KEYS.finish, gEase(u));
  if (phase === "finish") return KEYS.finish;
  return mixKeys(KEYS.finish, KEYS.address, gEase(u));
}

// The golfer's joints and club for a swing key.
export function golferJoints(K) {
  const tilt = 34 * GD;
  // Spine: lean toward the ball; turn rotates the upper body about the leaning spine.
  const lean = (p) => [p[0], p[1] * Math.cos(tilt) + p[2] * Math.sin(tilt), -p[1] * Math.sin(tilt) + p[2] * Math.cos(tilt)];
  const turnAbout = (p, deg) => { const c = Math.cos(deg * GD), s = Math.sin(deg * GD); return [p[0] * c - p[1] * s, p[0] * s + p[1] * c, p[2]]; };
  const pelvis = [K.shift, -8, 84];
  const J = { pelvis };
  const hipDir = turnAbout([9, 0, 0], K.hip);
  J.hipR = gAdd(pelvis, hipDir); J.hipL = gAdd(pelvis, hipDir, -1);
  J.ankleR = [24, 0, 7]; J.ankleL = [-24, 0, 7];
  // The right heel lifts in the finish; the foot pivots on its toe.
  J.ankleR = [24 - K.heel * 6, 2 - K.heel * 2, 7 + K.heel * 7];
  J.toeR = gAdd(J.ankleR, [5, 14, -7 * (1 - K.heel) - 5 * K.heel]);
  J.toeL = gAdd(J.ankleL, [-6, 15, -5]);
  for (const s of ["R", "L"]) {
    const h = J["hip" + s], a = J["ankle" + s];
    J["knee" + s] = gAdd([(h[0] + a[0]) / 2, (h[1] + a[1]) / 2, (h[2] + a[2]) / 2], [s === "R" ? -K.heel * 8 : 2, 9, 0]);
  }
  const up = (z, r = 0, f = 0, turn = K.turn) => gAdd(pelvis, lean(turnAbout([r, f, z], turn)));
  J.waist = up(17, 0, 0, K.turn * 0.5);
  J.chest = up(46);
  J.neck = up(54);
  // The head stays over the ball through the strike, then comes up in the finish.
  const headLift = Math.max(0, -K.turn - 40) / 60;
  J.head = gAdd(up(65, 0, 0, K.turn * 0.15), [0, -headLift * 6, headLift * 6]);
  J.shoulderR = up(44, 17); J.shoulderL = up(44, -17);
  // Hands on an arc round the middle of the shoulders, in the plane through the ball and the target line.
  const S = [(J.shoulderR[0] + J.shoulderL[0]) / 2, (J.shoulderR[1] + J.shoulderL[1]) / 2, (J.shoulderR[2] + J.shoulderL[2]) / 2];
  const S0 = gAdd(pelvis, lean([0, 0, 44]));
  const D = gUnit(gSub(BALL_LOCAL, S0));
  const side = gUnit([1, 0, 0].map((v, i) => v - D[i] * D[0]));
  const arc = (deg) => gAdd(D.map((v) => v * Math.cos(deg * GD)), side.map((v) => v * Math.sin(deg * GD)));
  const armLen = 56;
  const H = gAdd(S, arc(K.a), armLen);
  // Club: at address it runs from the hands to the ball; it turns with the arms, plus the wrist hinge.
  const H0 = gAdd(S0, D, armLen);
  const toBall = gSub(BALL_LOCAL, H0);
  const clubLen = gLen(toBall) + 2;
  const c0 = gUnit(toBall);
  // Turn the address shaft about the swing plane's axis (D x side) by the arm angle plus the hinge.
  const n = [D[1] * side[2] - D[2] * side[1], D[2] * side[0] - D[0] * side[2], D[0] * side[1] - D[1] * side[0]];
  const th = (K.a + K.hinge) * GD;
  const nxc = [n[1] * c0[2] - n[2] * c0[1], n[2] * c0[0] - n[0] * c0[2], n[0] * c0[1] - n[1] * c0[0]];
  const ndc = n[0] * c0[0] + n[1] * c0[1] + n[2] * c0[2];
  const shaft = gUnit([0, 1, 2].map((i) => c0[i] * Math.cos(th) + nxc[i] * Math.sin(th) + n[i] * ndc * (1 - Math.cos(th))));
  J.wristL = gAdd(H, shaft, -2.5);
  J.wristR = gAdd(H, shaft, 4.5);
  for (const s of ["R", "L"]) {
    const sh = J["shoulder" + s], w = J["wrist" + s];
    J["elbow" + s] = gAdd([(sh[0] + w[0]) / 2, (sh[1] + w[1]) / 2, (sh[2] + w[2]) / 2], [s === "R" ? 3 : -2, 0, -3]);
  }
  const grip = gAdd(H, shaft, -6);
  const headC = gAdd(H, shaft, clubLen);
  return { J, club: { grip, head: headC, shaft } };
}

// ---------- the shot ----------
// power 0..1 (how far back), late 0..1 (held past the top), early 0..1 (released short); seed 0..1 for a little variety.
export function shotOf(power, late, early, seed) {
  const r1 = Math.sin(seed * 91.7) * 0.5 + 0.5, r2 = Math.sin(seed * 37.3 + 1) * 0.5 + 0.5;
  const club = 58 + 46 * power - 6 * early; // mph
  const smash = Math.max(1.05, 1.47 - 0.22 * late - 0.12 * early - 0.06 * r1);
  const ball = club * smash;
  const face = (r1 - 0.5) * 4 + 11 * late - 5 * early; // deg, + open
  const path = -1.5 + (r2 - 0.5) * 3 - 3 * early;
  const launch = 11.5 + (r2 - 0.5) * 3 - 2 * late;
  const carry = ball * 1.38 * (0.9 + 0.1 * Math.cos((launch - 12) * GD)) * 0.9144 / 0.9144; // m
  const start = 0.75 * face + 0.25 * path;
  const curve = (face - path) * carry * 0.011; // m, + right
  const side = Math.sin(start * GD) * carry + curve;
  const total = carry * (1.06 + 0.04 * r2);
  const apex = carry * 0.125;
  const spin = Math.round(2400 + 900 * late + 600 * (r1 - 0.5));
  return { club, smash, ball, face, path, launch, carry, total, start, curve, side, apex, spin };
}
// Ball position in the virtual range at share s (0 tee .. 1 carry), then rolling on to total.
export function flightAt(shot, s) {
  if (s <= 1) return [Math.sin(shot.start * GD) * shot.carry * s + shot.curve * s * s, shot.carry * s, 4 * shot.apex * s * (1 - s)];
  const r = Math.min(1, s - 1);
  const end = [Math.sin(shot.start * GD) * shot.carry + shot.curve, shot.carry];
  const dir = [shot.side / shot.total, 1];
  return [end[0] + dir[0] * (shot.total - shot.carry) * r, end[1] + (shot.total - shot.carry) * r, 0];
}
export function feedbackOf(shot, late, early) {
  if (late > 0.35) return "페이스가 열렸어요. 탑에서 오래 멈추지 말고 바로 내려오세요.";
  if (early > 0.4) return "백스윙이 짧아요. 어깨를 끝까지 돌린 뒤 내려오세요.";
  if (shot.face > 3.5) return "공이 오른쪽으로 휘어요. 왼발을 조금 열고 그립을 살짝 닫아 주세요.";
  if (shot.face < -3) return "왼쪽으로 감겨요. 손목을 덜 쓰고 몸통으로 돌려 주세요.";
  if (shot.smash > 1.42) return "좋아요! 정타입니다. 이 템포를 그대로 유지하세요.";
  return "괜찮아요. 임팩트 때 머리를 공 뒤에 남겨 두세요.";
}

const gf = (v) => (Math.round(v * 10) / 10).toString();
// ---------- screen 1 & 2: the camera views ----------
// The golfer as a camera at yaw (deg round her, 0 = face-on, 90 = from her right, down the target line) films her.
export function cameraView(J, club, ballLocal, ballVisible, { yaw, cx, floor, scale, cls = "cv" }) {
  const at = (p) => { const [mx, my] = mirrorView(p, yaw); return [cx + mx * scale, -(floor + my * scale)]; };
  const body = screenFigureSvg(J, { yaw, mirror: false, cx, floor, scale, cls });
  const g = at(club.grip), h = at(club.head);
  const out = [body, '<path class="' + cls + '-shaft" d="M' + gf(g[0]) + " " + gf(g[1]) + "L" + gf(h[0]) + " " + gf(h[1]) + '" stroke-width="' + gf(1.2 * scale) + '"/>', '<circle class="' + cls + '-clubhead" cx="' + gf(h[0]) + '" cy="' + gf(h[1]) + '" r="' + gf(5 * scale) + '"/>'];
  if (ballVisible) { const b = at(ballLocal); out.push('<circle class="' + cls + '-ball" cx="' + gf(b[0]) + '" cy="' + gf(b[1]) + '" r="' + gf(2.4 * scale) + '"/>'); }
  return out.join("");
}

// ---------- screen 3 and the impact screen: the virtual range ----------
// region { x0, x1, y0, y1 } in the screen's own coordinates (y down); ball [x lateral m, y downrange m, z m] or null.
export function rangeView(region, ball, trail, { markers = true } = {}) {
  const w = region.x1 - region.x0, h = region.y1 - region.y0;
  const cx = (region.x0 + region.x1) / 2, hy = region.y0 + h * 0.4;
  const F = w * 0.9;
  const proj = ([x, y, z]) => { const d = y + 4; return [cx + (F * x) / d, hy - (F * (z - 1.7)) / d]; };
  const out = [];
  out.push('<path class="rv-sky" d="M' + region.x0 + " " + region.y0 + "H" + region.x1 + "V" + gf(hy) + "H" + region.x0 + 'Z"/>');
  // Hills on the horizon.
  const hills = [];
  for (let i = 0; i <= 12; i++) hills.push(gf(region.x0 + (w * i) / 12) + " " + gf(hy - h * (0.05 + 0.06 * Math.abs(Math.sin(i * 1.7)))));
  out.push('<path class="rv-hill" d="M' + region.x0 + " " + gf(hy) + "L" + hills.join("L") + "L" + region.x1 + " " + gf(hy) + 'Z"/>');
  out.push('<path class="rv-grass" d="M' + region.x0 + " " + gf(hy) + "H" + region.x1 + "V" + region.y1 + "H" + region.x0 + 'Z"/>');
  // Fairway: a lighter band narrowing to the horizon, with mown stripes.
  const fw = (y, x) => proj([x, y, 0]);
  const a = fw(0, -22), b = fw(0, 22), c = fw(320, 18), d = fw(320, -18);
  out.push('<path class="rv-fairway" d="M' + [a, b, c, d].map((p) => gf(p[0]) + " " + gf(Math.min(region.y1, p[1]))).join("L") + 'Z"/>');
  for (let y = 25; y < 320; y += 50) {
    const p = [fw(y, -20), fw(y, 20), fw(y + 25, 19), fw(y + 25, -19)];
    out.push('<path class="rv-stripe" d="M' + p.map((q) => gf(q[0]) + " " + gf(q[1])).join("L") + 'Z"/>');
  }
  // Billboards and stands either side, distance boards on the fairway.
  for (const s of [-1, 1]) {
    const p = [proj([s * 60, 160, 0]), proj([s * 60, 160, 24]), proj([s * 85, 220, 24]), proj([s * 85, 220, 0])];
    out.push('<path class="rv-board" d="M' + p.map((q) => gf(q[0]) + " " + gf(q[1])).join("L") + 'Z"/>');
  }
  if (markers) for (const m of [50, 100, 150, 200, 250]) {
    const p = proj([-24, m, 0]), q = proj([-24, m, 2.2]);
    out.push('<path class="rv-marker" d="M' + gf(p[0]) + " " + gf(p[1]) + "V" + gf(q[1]) + '" stroke-width="' + gf(Math.max(0.5, F / (m + 4)) * 0.5) + '"/>');
  }
  // The ball, its trace, and its shadow on the grass.
  if (trail && trail.length > 1) out.push('<path class="rv-trace" d="M' + trail.map((t) => { const p = proj(t); return gf(p[0]) + " " + gf(p[1]); }).join("L") + '"/>');
  if (ball) {
    const p = proj(ball), sh = proj([ball[0], ball[1], 0]);
    const r = Math.max(0.7, (F * 0.25) / (ball[1] + 4));
    out.push('<ellipse class="rv-shadow" cx="' + gf(sh[0]) + '" cy="' + gf(sh[1]) + '" rx="' + gf(r * 1.4) + '" ry="' + gf(r * 0.5) + '"/>');
    out.push('<circle class="rv-ball" cx="' + gf(p[0]) + '" cy="' + gf(p[1]) + '" r="' + gf(r) + '"/>');
  }
  return out.join("");
}

// ---------- screen 4: dispersion and numbers ----------
export function statsView(region, shots, current, s, labels) {
  const out = [];
  const mapW = (region.x1 - region.x0) * 0.42;
  const m = { x0: region.x0 + 2, x1: region.x0 + mapW, y0: region.y0 + 2, y1: region.y1 - 2 };
  const scale = (m.y1 - m.y0 - 4) / 260;
  const ox = (m.x0 + m.x1) / 2, oy = m.y1 - 2;
  const pt = ([x, y]) => [ox + x * scale, oy - y * scale];
  out.push('<path class="sv-map" d="M' + m.x0 + " " + m.y0 + "H" + m.x1 + "V" + m.y1 + "H" + m.x0 + 'Z"/>');
  for (const r of [50, 100, 150, 200, 250]) {
    const pts = [];
    for (let a = -24; a <= 24; a += 4) pts.push(pt([Math.sin(a * GD) * r, Math.cos(a * GD) * r]));
    out.push('<path class="sv-ring" d="M' + pts.map((p) => gf(p[0]) + " " + gf(p[1])).join("L") + '"/>');
  }
  out.push('<path class="sv-ring" d="M' + gf(ox) + " " + gf(oy) + "V" + gf(m.y0 + 2) + '"/>');
  // Earlier shots, and the ellipse they make.
  const done = shots.filter(Boolean);
  if (done.length > 2) {
    const xs = done.map((q) => q.side), ys = done.map((q) => q.carry);
    const mx = xs.reduce((a, b) => a + b, 0) / xs.length, my = ys.reduce((a, b) => a + b, 0) / ys.length;
    const sx = Math.sqrt(xs.reduce((a, b) => a + (b - mx) ** 2, 0) / xs.length) * 2 + 4, sy = Math.sqrt(ys.reduce((a, b) => a + (b - my) ** 2, 0) / ys.length) * 2 + 6;
    const c = pt([mx, my]);
    out.push('<ellipse class="sv-ellipse" cx="' + gf(c[0]) + '" cy="' + gf(c[1]) + '" rx="' + gf(sx * scale) + '" ry="' + gf(sy * scale) + '"/>');
  }
  for (const q of done) { const p = pt([q.side, q.carry]); out.push('<circle class="sv-dot" cx="' + gf(p[0]) + '" cy="' + gf(p[1]) + '" r="1.6"/>'); }
  if (current) {
    const pts = [];
    for (let t = 0; t <= Math.min(1, s) + 1e-6; t += 0.05) { const b = flightAt(current, t); pts.push(pt([b[0], b[1]])); }
    if (pts.length > 1) out.push('<path class="sv-path" d="M' + pts.map((p) => gf(p[0]) + " " + gf(p[1])).join("L") + '"/>');
    if (s >= 1) { const p = pt([current.side, current.carry]); out.push('<circle class="sv-now" cx="' + gf(p[0]) + '" cy="' + gf(p[1]) + '" r="2.2"/>'); }
  }
  // Number tiles.
  const tx0 = m.x1 + 3, tw = (region.x1 - tx0 - 2) / 2, th = (region.y1 - region.y0 - 4) / 4;
  labels.forEach(([label, value, unit], i) => {
    const x = tx0 + (i % 2) * tw, y = region.y0 + 2 + Math.floor(i / 2) * th;
    out.push('<path class="sv-tile" d="M' + gf(x + 0.6) + " " + gf(y + 0.6) + "H" + gf(x + tw - 0.6) + "V" + gf(y + th - 0.6) + "H" + gf(x + 0.6) + 'Z"/>');
    out.push('<text class="sv-label" x="' + gf(x + tw / 2) + '" y="' + gf(y + th * 0.3) + '" font-size="' + gf(th * 0.22) + '" text-anchor="middle">' + label + "</text>");
    out.push('<text class="sv-value" x="' + gf(x + tw / 2) + '" y="' + gf(y + th * 0.78) + '" font-size="' + gf(th * 0.42) + '" text-anchor="middle">' + value + '<tspan class="sv-unit" font-size="' + gf(th * 0.2) + '"> ' + unit + "</tspan></text>");
  });
  return out.join("");
}
