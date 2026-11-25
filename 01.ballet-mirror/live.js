// Live code for the ballet mirror. Inlined after the kit, model.mjs and dancer.mjs (constants come from build.mjs).
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const readout = document.querySelector("[data-readout]");
const status = document.querySelector("[data-status]");
const learnerEl = svg.querySelector('[data-part="learner"]');
const screens = [0, 1, 2].map((i) => svg.querySelector('[data-screen="' + i + '"]'));
const preview = svg.querySelector('[data-screen="laptop"]');
const segEls = [...svg.querySelectorAll("[data-seg]")];
const playhead = svg.querySelector('[data-part="playhead"]');
const still = matchMedia("(prefers-reduced-motion: reduce)");

let seg = START.seg, t = START.t;
let follower = poseAt(seg, t - LAG);
let frame = 0, previous = 0, visible = false, touring = !still.matches, idleTimer = 0, sinceSwitch = 0;

function fmt(seconds) {
  const s = Math.max(0, seconds);
  return String(Math.floor(s / 60)).padStart(2, "0") + ":" + (s % 60).toFixed(1).padStart(4, "0");
}
function draw() {
  const pro = poseAt(seg, still.matches ? PHASES[0] + PHASES[1] + 0.5 : t);
  if (still.matches) follower = pro.slice();
  const Jp = skeleton(pro);
  const Jl = skeleton(follower);
  // Panel 1: the VX clip mirrored, life size. Panel 2: the same clip as filmed. Panel 3: the rear camera, mirrored.
  screens[0].innerHTML = screenFigureSvg(Jp, { yaw: PRO_YAW, mirror: true, cx: PANEL_CX[0], shift: 18, floor: IMG_FLOOR, cls: "vx" });
  screens[1].innerHTML = screenFigureSvg(Jp, { yaw: PRO_YAW, mirror: false, cx: PANEL_CX[1], shift: -26, floor: IMG_FLOOR, cls: "vx" });
  screens[2].innerHTML = screenFigureSvg(Jl, { yaw: CAM_YAW, mirror: true, cx: PANEL_CX[2], shift: 30, floor: IMG_FLOOR, cls: "cam" });
  preview.innerHTML = screenFigureSvg(Jp, { yaw: PRO_YAW, mirror: false, cx: 17, shift: -1.2, floor: 7.4, scale: 0.068, cls: "vx" });
  learnerEl.innerHTML = mannequinSvg(Jl, LEARNER, P, iso, depthOf);
  const clock = seg * PERIOD + (((t % PERIOD) + PERIOD) % PERIOD);
  const x = PLAY.x0 + (PLAY.x1 - PLAY.x0) * (clock / CLIP);
  playhead.setAttribute("d", "M" + x.toFixed(2) + " -5.4V-2");
  const text = "구간 " + (seg + 1) + "/4 · " + SEG_NAMES[seg] + " · " + fmt(clock);
  if (readout.textContent !== text) readout.textContent = text;
}
function select(next, announce = true) {
  seg = (next + SEGMENTS.length) % SEGMENTS.length;
  t = 0;
  sinceSwitch = 0;
  segEls.forEach((el, i) => el.toggleAttribute("data-on", i === seg));
  if (announce) status.textContent = "구간 " + (seg + 1) + ", " + SEG_NAMES[seg] + " 재생";
  draw();
  run();
}
function tick(now) {
  const dt = previous ? Math.min((now - previous) / 1000, 1 / 20) : 1 / 60;
  previous = now;
  t += dt;
  sinceSwitch += dt;
  if (touring && sinceSwitch > PERIOD * 2 - 0.05) select(seg + 1, false);
  // The learner follows the projected demonstration with a lag, joint by joint.
  const target = poseAt(seg, t);
  const a = 1 - Math.exp(-dt / LAG);
  follower = follower.map((v, i) => v + (target[i] - v) * a);
  draw();
  frame = visible && !still.matches ? requestAnimationFrame(tick) : 0;
}
function run() {
  if (!frame && visible && !still.matches) { previous = 0; frame = requestAnimationFrame(tick); }
}
function takeOver() {
  touring = false;
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => { if (!still.matches) { touring = true; sinceSwitch = 0; run(); } }, 14000);
}
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
stage.addEventListener("keydown", (event) => {
  if (event.metaKey || event.ctrlKey || event.altKey) return;
  const n = Number(event.key);
  if (n >= 1 && n <= SEGMENTS.length) { event.preventDefault(); takeOver(); select(n - 1); return; }
  if (event.key === "ArrowRight") { event.preventDefault(); takeOver(); select(seg + 1); }
  if (event.key === "ArrowLeft") { event.preventDefault(); takeOver(); select(seg - 1); }
});
svg.addEventListener("click", (event) => {
  const hit = event.target.closest('[data-part="laptop-hit"]');
  if (!hit) return;
  takeOver();
  select(seg + 1);
  stage.focus({ preventScroll: true });
});
still.addEventListener("change", () => { draw(); run(); });
segEls.forEach((el, i) => el.toggleAttribute("data-on", i === seg));
draw();
