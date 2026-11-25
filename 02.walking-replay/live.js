// Live code for the walking replay. Inlined after the kit, model, dancer, walk and padui modules.
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const readout = document.querySelector("[data-readout]");
const status = document.querySelector("[data-status]");
const layer = svg.querySelector('[data-layer="free"]');
const slots = [...layer.querySelectorAll("[data-slot]")].map((el) => ({ el, depth: Number(el.dataset.depth) }));
const learnerEl = svg.querySelector('[data-part="learner"]');
const teacherEl = svg.querySelector('[data-part="teacher"]');
const padEl = svg.querySelector('[data-part="pad-ui"]');
const fingerEl = svg.querySelector('[data-part="finger"]');
const insetEl = svg.querySelector('[data-part="inset-ui"]');
const panels = [0, 1].map((i) => {
  const g = svg.querySelector('[data-panel="' + i + '"]');
  const [b0, b1] = g.dataset.bar.split(" ").map(Number);
  const q = (name) => g.querySelector('[data-osd="' + name + '"]');
  return { screen: g.querySelector("[data-screen]"), title: q("title"), angle: q("angle"), done: q("done"), knob: q("knob"), time: q("time"), b0, b1 };
});
const still = matchMedia("(prefers-reduced-motion: reduce)");
const ANGLE_NAMES = ["정면 카메라", "측면 카메라", "후면 카메라"];

// ---- paths on and off the runway ----
const pathA = [STAND_SPOT.at, [150, 100], [STEP.x0 - 6, 87], [RUN.x, RUN.y0]];
const pathB = [...pathA].reverse();
const lenOf = (pts) => pts.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]), 0);
function along(pts, s) {
  let left = s;
  for (let i = 1; i < pts.length; i++) {
    const [a, b] = [pts[i - 1], pts[i]];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (left <= l || i === pts.length - 1) {
      const u = Math.min(1, Math.max(0, left / l));
      return { pos: [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u], heading: (Math.atan2(b[0] - a[0], -(b[1] - a[1])) * 180) / Math.PI };
    }
    left -= l;
  }
}
const ramp = (x, a, b) => Math.min(1, Math.max(0, (x - a) / (b - a)));
// Floor height under a point: the step and the runway deck, eased over a short stride so the foot does not pop.
const floorAt = ([x, y]) => (y < 46 || y > 242 ? 0 : 5 * ramp(x, STEP.x0 - 3, STEP.x0 + 3) + 5 * ramp(x, STEP.x1 - 3, STEP.x1 + 3));

// ---- the scene timeline ----
const LEN_A = lenOf(pathA), LEN_B = lenOf(pathB);
const PHASES_W = [
  ["toStart", LEN_A / SPEED], ["ready", 1.3], ["record", CLIP_T], ["back", LEN_B / SPEED], ["settle", 1.0], ["operate", 2.6], ["replay", CLIP_T * 2],
];
let phase = 0, phaseT = 0, loop = 0;
let angle = 1, playing = false, replayT = 0;
let touring = !still.matches, idleTimer = 0;
const learner = { pos: [...STAND_SPOT.at], z: 0, heading: STAND_SPOT.heading, dist: 0, amp: 0, flat: null };
let tap = null; // { name, share, t }
let frame = 0, previous = 0, visible = false;

const wrapTo = (a, b) => { let d = ((b - a) % 360 + 540) % 360 - 180; return a + d; };
function follow(target, dt, tau) { learner.heading = wrapTo(learner.heading, target); learner.heading += (target - learner.heading) * (1 - Math.exp(-dt / tau)); }
function startTap(name, share = 0) { tap = { name, share, t: 0 }; }
function tapAmount() {
  if (!tap) return 0;
  const u = tap.t / 0.7;
  return u >= 1 ? 0 : Math.sin(Math.PI * Math.min(1, u * 1.6)) * (u < 0.62 ? 1 : 1 - (u - 0.62) / 0.38);
}

function stepScene(dt) {
  const [name, dur] = PHASES_W[phase];
  phaseT += dt;
  if (name === "toStart" || name === "back") {
    const path = name === "toStart" ? pathA : pathB;
    const len = name === "toStart" ? LEN_A : LEN_B;
    const s = Math.min(len, phaseT * SPEED);
    const p = along(path, s);
    learner.pos = p.pos; learner.z = floorAt(p.pos);
    follow(p.heading, dt, 0.16);
    learner.dist += dt * SPEED * (s < len ? 1 : 0);
    learner.amp = Math.min(ramp(s, 0, 18), ramp(len - s, 0, 18));
    learner.flat = walkPose(learner.dist / STRIDE.now, scaledStyle("now", learner.amp));
  } else if (name === "ready" || name === "settle" || name === "operate" || name === "replay") {
    const target = name === "ready" ? 180 : STAND_SPOT.heading;
    follow(target, dt, 0.28);
    learner.amp = 0;
    learner.flat = walkPose(0, scaledStyle("now", 0));
  } else if (name === "record") {
    const take = takeAt(phaseT, "now");
    learner.pos = take.pos; learner.z = take.z; learner.heading = take.heading; learner.flat = take.flat;
  }
  if (name === "operate") {
    if (phaseT - dt < 0.3 && phaseT >= 0.3) { angle = loop % 3 === 0 ? 1 : loop % 3 === 1 ? 0 : 2; startTap("angle" + angle); }
    if (phaseT - dt < 1.5 && phaseT >= 1.5) { startTap("play"); playing = true; replayT = 0; }
  }
  if (name === "replay" && playing) replayT += dt;
  if (touring && phaseT >= dur) {
    phase = (phase + 1) % PHASES_W.length;
    phaseT = 0;
    if (PHASES_W[phase][0] === "toStart") { loop++; playing = false; learner.dist = 0; }
    if (PHASES_W[phase][0] === "back") learner.dist = 0;
  }
  if (!touring && name === "replay" && playing) replayT %= CLIP_T * 4;
}

// ---- drawing ----
function camYaw(pos, heading) { return yawFrom(CAM_POS[angle], pos, heading); }
function setBar(p, share, text) {
  const x = p.b0 + (p.b1 - p.b0) * Math.min(1, Math.max(0, share));
  p.done.setAttribute("d", "M" + p.b0 + " " + BAR_Y + "H" + x.toFixed(1));
  p.knob.setAttribute("cx", x.toFixed(1));
  p.time.textContent = text;
}
function padPoint([x, y], lift = 0) {
  return [0, 1, 2].map((j) => PADF.o[j] + PADF.right[j] * x - PADF.along[j] * y + PADF.normal[j] * lift);
}
let teacherDrawn = false;
function draw() {
  const name = PHASES_W[phase][0];
  const recording = name === "record" || (name === "ready" && phaseT > 0.7);
  svg.toggleAttribute("data-rec", recording);
  const replaying = name === "replay";
  const tau = replaying ? replayT % CLIP_T : 0;
  // Learner in the room.
  learnerEl.innerHTML = mannequinSvg(skeleton(learner.flat || walkPose(0, scaledStyle("now", 0))), learner.pos, P, iso, depthOf, learner.heading, learner.z);
  const d = depthOf([learner.pos[0], learner.pos[1], 0], P);
  const before = slots.find((s) => s.depth > d);
  const want = before ? before.el : null;
  if (learnerEl.nextSibling !== want) layer.insertBefore(learnerEl, want);
  // The two panels.
  const past = takeAt(tau, "past");
  let nowTake;
  if (replaying) nowTake = takeAt(tau, "now");
  else if (name === "record") nowTake = { pos: learner.pos, heading: learner.heading, flat: learner.flat };
  else if (name === "back" || name === "settle" || name === "operate") nowTake = takeAt(CLIP_T, "now");
  else nowTake = { pos: learner.pos, heading: learner.heading, flat: learner.flat || walkPose(0, scaledStyle("now", 0)) };
  const Jpast = skeleton(past.flat), Jnow = skeleton(nowTake.flat);
  const yawPast = camYaw(past.pos, past.heading), yawNow = camYaw(nowTake.pos, nowTake.heading);
  panels[0].screen.innerHTML = screenFigureSvg(Jpast, { yaw: yawPast, mirror: false, cx: PANEL_CX[0], floor: IMG_FLOOR, cls: "old" });
  panels[1].screen.innerHTML = screenFigureSvg(Jnow, { yaw: yawNow, mirror: false, cx: PANEL_CX[1], floor: IMG_FLOOR, cls: "new" });
  panels[0].screen.classList.toggle("dim", !replaying);
  panels[1].screen.classList.toggle("dim", !replaying && name !== "record" && name !== "toStart" && name !== "ready");
  for (const p of panels) p.angle.textContent = ANGLE_NAMES[angle];
  const liveTitle = name === "record" ? "● 녹화 중" : name === "toStart" || name === "ready" ? "실시간 카메라" : "방금 촬영한 영상";
  panels[1].title.textContent = liveTitle;
  panels[1].title.toggleAttribute("data-rec", name === "record");
  setBar(panels[0], tau / CLIP_T, fmtClock(tau));
  setBar(panels[1], name === "record" ? phaseT / CLIP_T : tau / CLIP_T, fmtClock(name === "record" ? phaseT : tau));
  // The pad, the finger and the enlarged pad.
  const amount = tapAmount();
  const target = tap ? padTarget(tap.name, tap.share) : padTarget("bar", tau / CLIP_T);
  const state = { past: Jpast, now: Jnow, yawPast, yawNow, angle, playing: replaying && playing, t: name === "record" ? phaseT : tau, total: CLIP_T, tap: { at: target, amount }, mode: name === "record" ? "rec" : "" };
  padEl.innerHTML = padUiSvg(state, { id: "pp" });
  insetEl.innerHTML = padUiSvg(state, { id: "pi", text: true }) + (tap ? insetFinger(target, amount) : "");
  if (!teacherDrawn) { teacherEl.innerHTML = mannequinSvg(skeleton(TEACHER_FLAT), TEACHER.at, P, iso, depthOf, TEACHER.heading, 0); teacherDrawn = true; }
  const J = skeleton(TEACHER_FLAT);
  const h = (TEACHER.heading * Math.PI) / 180;
  const fw = [Math.sin(h), -Math.cos(h)], rt = [-Math.cos(h), -Math.sin(h)];
  const w = J.wristR;
  const wrist = [TEACHER.at[0] + w[0] * rt[0] + w[1] * fw[0], TEACHER.at[1] + w[0] * rt[1] + w[1] * fw[1], w[2]];
  const tip = padPoint(target, 0.4 + 4.5 * (1 - amount));
  const a = iso(wrist, P), b = iso(tip, P);
  const s = Math.abs(iso([0, 0, 1], P)[1] - iso([0, 0, 0], P)[1]) / Math.cos(((P.elevation || 30) * Math.PI) / 180);
  fingerEl.innerHTML = '<path class="finger" d="' + dnCapsule(a, b, 1.05 * s) + '"/><path class="finger" d="' + dnCircle(a, 2.6 * s) + '"/>';
  // Readout.
  let text;
  if (name === "toStart") text = "준비 · 런웨이 출발점으로";
  else if (name === "ready") text = "준비 · 카메라 3대 녹화 시작";
  else if (name === "record") text = "● 녹화 중 · " + fmtClock(phaseT) + " / " + fmtClock(CLIP_T);
  else if (name === "back") text = "녹화 완료 · 교수자 옆으로";
  else if (name === "settle" || name === "operate") text = "교수자 패드 조작 · " + ANGLES[angle] + (playing ? " · 재생" : " 선택");
  else text = (playing ? "리플레이 " : "일시정지 ") + fmtClock(tau) + " · " + ANGLES[angle] + " · 좌 기초 연습 / 우 방금 촬영";
  if (readout.textContent !== text) readout.textContent = text;
}
// A finger on the enlarged pad: it comes in from the lower right and presses the control.
function insetFinger([x, y], amount) {
  const lift = 1 - amount;
  const tx = x + 0.6 + lift * 1.2, ty = y + 0.4 + lift * 1.6;
  const ang = -2.2, len = 9;
  const bx = tx - Math.cos(ang) * len, by = ty - Math.sin(ang) * len;
  const r = 1.05;
  return '<path class="inset-finger" d="' + dnCapsule([tx, ty], [bx, by], r) + '"/>';
}

function tick(now) {
  const dt = previous ? Math.min((now - previous) / 1000, 1 / 20) : 1 / 60;
  previous = now;
  if (tap) { tap.t += dt; if (tap.t > 0.7) tap = null; }
  stepScene(dt);
  draw();
  frame = visible && !still.matches ? requestAnimationFrame(tick) : 0;
}
function run() { if (!frame && visible && !still.matches) { previous = 0; frame = requestAnimationFrame(tick); } }
function toReplay() {
  if (PHASES_W[phase][0] !== "replay") {
    phase = PHASES_W.findIndex((p) => p[0] === "replay"); phaseT = 0;
    learner.pos = [...STAND_SPOT.at]; learner.z = 0; learner.heading = STAND_SPOT.heading; learner.flat = walkPose(0, scaledStyle("now", 0));
    replayT = 0; playing = true;
  }
}
function takeOver() {
  touring = false;
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => { if (!still.matches) { touring = true; run(); } }, 15000);
}
function say(text) { status.textContent = text; }
stage.addEventListener("keydown", (event) => {
  if (event.metaKey || event.ctrlKey || event.altKey) return;
  const n = Number(event.key);
  if (n >= 1 && n <= 3) { event.preventDefault(); takeOver(); toReplay(); angle = n - 1; startTap("angle" + angle); say(ANGLES[angle] + " 카메라"); run(); return; }
  if (event.key === " ") { event.preventDefault(); takeOver(); const was = PHASES_W[phase][0] === "replay"; toReplay(); if (was) playing = !playing; startTap("play"); say(playing ? "재생" : "일시정지"); run(); return; }
  if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
    event.preventDefault(); takeOver(); toReplay(); playing = false;
    const tau = ((replayT % CLIP_T) + (event.key === "ArrowRight" ? 0.5 : -0.5) + CLIP_T) % CLIP_T;
    replayT = tau; startTap("bar", tau / CLIP_T); say(fmtClock(tau)); run();
  }
});
svg.addEventListener("click", (event) => {
  if (!event.target.closest('[data-slot="teacher"], .inset')) return;
  takeOver(); const was = PHASES_W[phase][0] === "replay"; toReplay(); if (was) playing = !playing; startTap("play"); run();
  stage.focus({ preventScroll: true });
});
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
still.addEventListener("change", () => { if (still.matches) showStill(); else run(); });
function showStill() { toReplay(); playing = false; replayT = OUT_T * 0.5; draw(); }
if (still.matches) showStill(); else { learner.flat = walkPose(0, scaledStyle("now", 0)); draw(); }
