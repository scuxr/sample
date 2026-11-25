// Live code for the screen-golf figure. Inlined after the kit, model, dancer and golf modules.
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const readout = document.querySelector("[data-readout]");
const status = document.querySelector("[data-status]");
const layer = svg.querySelector('[data-layer="free"]');
const slots = [...layer.querySelectorAll("[data-slot]")].map((el) => ({ el, depth: Number(el.dataset.depth) }));
const golferEl = svg.querySelector('[data-part="golfer"]');
const expertEl = svg.querySelector('[data-part="expert"]');
const roomBallEl = svg.querySelector('[data-part="roomball"]');
const impactEl = svg.querySelector('[data-view="impact"]');
const monEls = [0, 1, 2, 3].map((i) => svg.querySelector('[data-view="m' + i + '"]'));
const subBg = svg.querySelector("[data-sub-bg]");
const subText = svg.querySelector("[data-sub-text]");
const still = matchMedia("(prefers-reduced-motion: reduce)");

const DUR = { down: 0.24, follow: 0.55, finish: 2.6, ret: 0.9 };
const TOP_T = 0.95; // seconds of backswing to reach the top
const FLIGHT = 2.4, ROLL = 0.7;
const AUTO = [0.98, 1.38, 0.9, 0.6, 1.02, 1.2];
let phase = "address", phaseT = 0, hold = 0, topU = 1, userHolding = false, autoHold = 0, autoIndex = 0;
let shot = null, late = 0, early = 0, flightT = -1, roomT = -1, history = [], feedback = "", feedbackT = -1, shotCount = 0;
let touring = !still.matches, idleTimer = 0, frame = 0, previous = 0, visible = false;

const smoothE = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
function toWorldG(p, place, heading) {
  const h = (heading * Math.PI) / 180;
  const fw = [Math.sin(h), -Math.cos(h)], rt = [-Math.cos(h), -Math.sin(h)];
  return [place[0] + p[0] * rt[0] + p[1] * fw[0], place[1] + p[0] * rt[1] + p[1] * fw[1], p[2]];
}
const scaleS = Math.abs(iso([0, 0, 1], P)[1] - iso([0, 0, 0], P)[1]) / Math.cos(((P.elevation || 30) * Math.PI) / 180);
const pt = (p) => { const q = iso(p, P); return q[0].toFixed(1) + " " + q[1].toFixed(1); };

function currentKey() {
  if (phase === "back") return swingKey("back", Math.min(1, hold / TOP_T), 1);
  if (phase === "down") return swingKey("down", Math.min(1, phaseT / DUR.down), topU);
  if (phase === "follow") return swingKey("follow", Math.min(1, phaseT / DUR.follow));
  if (phase === "finish") return swingKey("finish", 0);
  if (phase === "return") return swingKey("return", Math.min(1, phaseT / DUR.ret));
  return swingKey("address", 0);
}
const ballOnTee = () => phase === "address" || phase === "back" || phase === "down" || (phase === "return" && phaseT > DUR.ret * 0.6);

function golferSvg(J, club) {
  const grip = toWorldG(club.grip, GOLFER.at, GOLFER.heading), head = toWorldG(club.head, GOLFER.at, GOLFER.heading);
  const a = iso(grip, P), b = iso(head, P);
  const shaft = '<path class="club-shaft" d="' + dnCapsule(a, b, 0.7 * scaleS) + '"/>';
  const hd = '<path class="club-shaft" d="' + dnCircle(b, 3.6 * scaleS) + '"/>';
  const extras = [{ at: [(grip[0] + head[0]) / 2, (grip[1] + head[1]) / 2, (grip[2] + head[2]) / 2], svg: shaft, bias: 1 }, { at: head, svg: hd, bias: 1.2 }];
  if (ballOnTee()) extras.push({ at: BALL_W, svg: '<path class="room-ball" d="' + dnCircle(iso(BALL_W, P), 2.2 * scaleS) + '"/>', bias: 0 });
  return mannequinSvg(J, GOLFER.at, P, iso, depthOf, GOLFER.heading, 0, extras);
}
const EXPERT_POSES = {
  watch: flatten({ tilt: 2, nod: 6, R: { thigh: [3, 70], shin: [3, 70], foot: [66, 30] }, L: { thigh: [3, 110], shin: [3, 110], foot: [66, 40] }, RA: { upper: [26, 20], fore: [96, -82] }, LA: { upper: [26, 20], fore: [94, -84] } }),
  point: flatten({ tilt: 2, nod: 2, R: { thigh: [3, 70], shin: [3, 70], foot: [66, 30] }, L: { thigh: [3, 110], shin: [3, 110], foot: [66, 40] }, RA: { upper: [82, 22], fore: [88, 8] }, LA: { upper: [26, 20], fore: [94, -84] } }),
};
let expertMix = 0;

function roomBall() {
  if (roomT < 0 || !shot) return "";
  // From the tee to the screen in a blink, then down the screen to the floor.
  const hitT = 0.12;
  const dist = BALL_W[1] - SCREEN_Y;
  const hit = [BALL_W[0] + Math.tan((shot.start * Math.PI) / 180) * dist, SCREEN_Y + 2, BALL_W[2] + Math.tan((shot.launch * Math.PI) / 180) * dist];
  let p, trace = "";
  if (roomT < hitT) {
    const u = roomT / hitT;
    p = [BALL_W[0] + (hit[0] - BALL_W[0]) * u, BALL_W[1] + (hit[1] - BALL_W[1]) * u, BALL_W[2] + (hit[2] - BALL_W[2]) * u];
    trace = '<path class="room-trace" d="M' + pt(BALL_W) + "L" + pt(p) + '"/>';
  } else {
    const t = roomT - hitT;
    const z = Math.max(2.4, hit[2] - 490 * t * t);
    const y = hit[1] + Math.min(26, t * 30);
    p = [hit[0], y, z];
  }
  return trace + '<path class="room-ball" d="' + dnCircle(iso(p, P), 2.2 * scaleS) + '"/>';
}
function flightState() {
  if (!shot || flightT < 0) return { ball: null, trail: null, s: 0 };
  const s = flightT <= FLIGHT ? flightT / FLIGHT : 1 + Math.min(1, (flightT - FLIGHT) / ROLL);
  const trail = [];
  for (let t = 0; t <= Math.min(1, s) + 1e-6; t += 0.04) { const b = flightAt(shot, t); trail.push([b[0], b[1], b[2]]); }
  const b = flightAt(shot, s);
  return { ball: [b[0], b[1], b[2]], trail, s };
}
const fmt1 = (v) => (Math.round(v * 10) / 10).toFixed(1);
function statLabels() {
  const q = shot && flightT >= FLIGHT ? shot : history.length ? history[history.length - 1] : null;
  if (!q) return [["캐리", "-", "m"], ["총거리", "-", "m"], ["볼 스피드", "-", "mph"], ["클럽 스피드", "-", "mph"], ["스매시", "-", ""], ["발사각", "-", "°"], ["방향각", "-", "°"], ["좌우", "-", "m"]];
  const lr = (v) => (v >= 0 ? "R " : "L ") + fmt1(Math.abs(v));
  return [["캐리", fmt1(q.carry), "m"], ["총거리", fmt1(q.total), "m"], ["볼 스피드", fmt1(q.ball), "mph"], ["클럽 스피드", fmt1(q.club), "mph"], ["스매시", q.smash.toFixed(2), ""], ["발사각", fmt1(q.launch), "°"], ["방향각", lr(q.start), "°"], ["좌우", lr(q.side), "m"]];
}
function cameraScreen(J, club, i) {
  const r = MON_R[i];
  const cx = (r.x0 + r.x1) / 2;
  const floorY = r.y1 - 4;
  const bg = '<path class="cv-wall" d="M' + r.x0 + " " + r.y0 + "H" + r.x1 + "V" + floorY.toFixed(1) + "H" + r.x0 + 'Z"/><path class="cv-mat" d="M' + r.x0 + " " + floorY.toFixed(1) + "H" + r.x1 + "V" + r.y1 + "H" + r.x0 + 'Z"/>';
  // i 0: face-on, from in front of the golfer (yaw 0); i 1: down the line, from behind him on the target line (yaw 90).
  return bg + cameraView(J, club, BALL_LOCAL, ballOnTee(), { yaw: i === 0 ? 0 : 90, cx: i === 0 ? cx : cx + 4, floor: -floorY, scale: (r.y1 - r.y0 - 8) / 235, cls: "cv" });
}
function draw() {
  const key = currentKey();
  const { J, club } = golferJoints(key);
  golferEl.innerHTML = golferSvg(J, club);
  const d = depthOf([GOLFER.at[0], GOLFER.at[1], 0], P);
  const before = slots.find((s) => s.depth > d);
  if (golferEl.nextSibling !== (before ? before.el : null)) layer.insertBefore(golferEl, before ? before.el : null);
  const showFeedback = feedbackT >= 0 && feedbackT < 5.5;
  const flat = EXPERT_POSES.watch.map((v, i) => v + (EXPERT_POSES.point[i] - v) * smoothE(expertMix));
  expertEl.innerHTML = mannequinSvg(skeleton(flat), EXPERT.at, P, iso, depthOf, EXPERT.heading);
  const de = depthOf([EXPERT.at[0], EXPERT.at[1], 0], P);
  const be = slots.find((s) => s.depth > de);
  if (expertEl.nextSibling !== (be ? be.el : null)) layer.insertBefore(expertEl, be ? be.el : null);
  roomBallEl.innerHTML = roomBall();
  // Screens.
  const f = flightState();
  impactEl.innerHTML = rangeView(SCREEN_R, f.ball, f.trail);
  monEls[0].innerHTML = cameraScreen(J, club, 0);
  monEls[1].innerHTML = cameraScreen(J, club, 1);
  monEls[2].innerHTML = rangeView(MON_R[2], f.ball, f.trail, { markers: false });
  monEls[3].innerHTML = statsView({ ...MON_R[3], y0: MON_R[3].y0 + 8 }, history.slice(-14), shot && flightT >= 0 ? shot : null, f.s, statLabels());
  // Subtitle: the expert's words on the face-on video.
  if (showFeedback) {
    subText.textContent = feedback;
    const w = Math.min(MON_R[0].x1 - MON_R[0].x0 - 4, subText.getComputedTextLength() + 4);
    const cx = (MON_R[0].x0 + MON_R[0].x1) / 2, y = MON_R[0].y1 - 8;
    subBg.setAttribute("d", "M" + (cx - w / 2).toFixed(1) + " " + y + "h" + w.toFixed(1) + "v5h" + (-w).toFixed(1) + "Z");
  } else { subText.textContent = ""; subBg.setAttribute("d", ""); }
  // Readout.
  let text;
  if (phase === "back") text = "백스윙 " + Math.round(Math.min(1, hold / TOP_T) * 100) + "%" + (hold > TOP_T + 0.12 ? " · 탑에서 너무 오래 멈춤" : "");
  else if (showFeedback && shot) text = "전문가: " + feedback;
  else if (shot && flightT >= 0) text = "캐리 " + Math.round(shot.carry) + " m · 볼 스피드 " + Math.round(shot.ball) + " mph · " + (shot.side >= 0 ? "오른쪽 " : "왼쪽 ") + Math.abs(Math.round(shot.side)) + " m";
  else text = "어드레스 · 스페이스나 마우스를 누르고 있다가 떼면 스윙";
  if (readout.textContent !== text) readout.textContent = text;
}
function release() {
  if (phase !== "back") return;
  topU = smoothE(Math.min(1, hold / TOP_T));
  late = Math.max(0, Math.min(1, (hold - (TOP_T + 0.1)) / 0.5));
  early = Math.max(0, Math.min(1, (TOP_T * 0.8 - hold) / (TOP_T * 0.6)));
  phase = "down"; phaseT = 0;
}
function step(dt) {
  phaseT += dt;
  if (phase === "address" && touring && phaseT > 1.6) { phase = "back"; phaseT = 0; hold = 0; autoHold = AUTO[autoIndex++ % AUTO.length]; }
  if (phase === "back") {
    hold += dt;
    if (!userHolding && autoHold && hold >= autoHold) { autoHold = 0; release(); }
    if (!userHolding && !autoHold && !touring && hold > 0.05 && phase === "back") release();
  } else if (phase === "down" && phaseT >= DUR.down) {
    phase = "follow"; phaseT = 0;
    shot = shotOf(topU, late, early, ++shotCount * 0.37 + 0.11);
    flightT = 0; roomT = 0; feedbackT = -1;
  } else if (phase === "follow" && phaseT >= DUR.follow) { phase = "finish"; phaseT = 0; }
  else if (phase === "finish" && phaseT >= DUR.finish) { phase = "return"; phaseT = 0; }
  else if (phase === "return" && phaseT >= DUR.ret) { phase = "address"; phaseT = 0; roomT = -1; }
  if (flightT >= 0) {
    const was = flightT;
    flightT += dt;
    if (was < FLIGHT + ROLL && flightT >= FLIGHT + ROLL) { history.push(shot); feedback = feedbackOf(shot, late, early); feedbackT = 0; status.textContent = "캐리 " + Math.round(shot.carry) + "미터. " + feedback; }
  }
  if (roomT >= 0) roomT += dt;
  if (feedbackT >= 0) feedbackT += dt;
  const want = feedbackT >= 0 && feedbackT < 5.5 ? 1 : 0;
  expertMix += (want - expertMix) * (1 - Math.exp(-dt / 0.25));
}
function tick(now) {
  const dt = previous ? Math.min((now - previous) / 1000, 1 / 20) : 1 / 60;
  previous = now;
  step(dt);
  draw();
  frame = visible && !still.matches ? requestAnimationFrame(tick) : 0;
}
function run() { if (!frame && visible && !still.matches) { previous = 0; frame = requestAnimationFrame(tick); } }
function takeOver() {
  touring = false;
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => { if (!still.matches) { touring = true; run(); } }, 15000);
}
function press() {
  takeOver();
  if (phase === "address" || (phase === "return" && phaseT > DUR.ret * 0.6)) { phase = "back"; phaseT = 0; hold = 0; autoHold = 0; userHolding = true; run(); }
  else if (phase === "back") { autoHold = 0; userHolding = true; run(); }
}
function lift() { if (userHolding) { userHolding = false; release(); run(); } }
stage.addEventListener("keydown", (e) => { if (e.key === " " && !e.repeat) { e.preventDefault(); press(); } });
stage.addEventListener("keyup", (e) => { if (e.key === " ") { e.preventDefault(); lift(); } });
stage.addEventListener("pointerdown", (e) => { stage.focus({ preventScroll: true }); stage.setPointerCapture?.(e.pointerId); press(); });
stage.addEventListener("pointerup", lift);
stage.addEventListener("pointercancel", lift);
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
if (still.matches) { shot = shotOf(1, 0, 0, 0.4); history = [shot]; flightT = FLIGHT + ROLL; phase = "finish"; }
draw();
