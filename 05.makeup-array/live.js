// Live code for the make-up camera array. Inlined after the kit, model, dancer and views modules.
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const readout = document.querySelector("[data-readout]");
const status = document.querySelector("[data-status]");
const peopleEl = svg.querySelector('[data-part="people"]');
const mainEl = svg.querySelector('[data-view="main"]');
const thumbEls = [...svg.querySelectorAll("[data-thumb]")];
const thumbFrames = [...svg.querySelectorAll("[data-thumb-frame]")];
const camEls = [...svg.querySelectorAll("[data-cam]")];
const knob = svg.querySelector("[data-knob]");
const camLabel = svg.querySelector("[data-cam-label]");
const mouseEl = svg.querySelector("[data-mouse]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const N = RIG.count;

let a = 0, aTarget = 0, clock = 0, frame = 0, previous = 0, visible = false, touring = !still.matches, idleTimer = 0, tourT = 0, frameNo = 0;
const lerp3 = (p, q, t) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, p[2] + (q[2] - p[2]) * t];
const scaleS = Math.abs(iso([0, 0, 1], P)[1] - iso([0, 0, 0], P)[1]) / Math.cos(((P.elevation || 30) * Math.PI) / 180);
const J_MODEL = skeleton(SEATED_POSE);
const J_ARTIST0 = skeleton(artistPose(ARTIST_RA));

// Camera i (or a share between cameras) and what it frames.
function camAt(x) {
  const n = N - 1;
  const deg = RIG.from + ((RIG.to - RIG.from) * x) / n;
  const r = (deg * Math.PI) / 180;
  return [SUBJECT.at[0] + Math.cos(r) * RIG.r, SUBJECT.at[1] + Math.sin(r) * RIG.r, RIG.z];
}
function framing(sc, x) {
  const f = framingAt(x / (N - 1));
  const two = [(sc.S.chest[0] + sc.A.chest[0]) / 2, (sc.S.chest[1] + sc.A.chest[1]) / 2, (sc.S.head[2] + sc.A.chest[2]) / 2 + 4];
  return { target: lerp3(sc.S.head, two, f.lift), width: f.width };
}
function drawPeople(sc) {
  // The demonstrator's hand follows the brush: move her wrist and elbow in her own frame.
  const h = (ARTIST.heading * Math.PI) / 180;
  const fw = [Math.sin(h), -Math.cos(h)], rt = [-Math.cos(h), -Math.sin(h)];
  const d = [sc.A.wristR[0] - (ARTIST.at[0] + J_ARTIST0.wristR[0] * rt[0] + J_ARTIST0.wristR[1] * fw[0]), sc.A.wristR[1] - (ARTIST.at[1] + J_ARTIST0.wristR[0] * rt[1] + J_ARTIST0.wristR[1] * fw[1]), sc.A.wristR[2] - J_ARTIST0.wristR[2]];
  const local = (v, s) => [v[0] + (d[0] * rt[0] + d[1] * rt[1]) * s, v[1] + (d[0] * fw[0] + d[1] * fw[1]) * s, v[2] + d[2] * s];
  const JA = { ...J_ARTIST0, wristR: local(J_ARTIST0.wristR, 1), elbowR: local(J_ARTIST0.elbowR, 0.45) };
  const b = sc.brush;
  const brush = '<path class="room-brush" d="' + dnCapsule(iso(b.hand, P), iso(b.tip, P), 0.8 * scaleS) + '"/>';
  const model = mannequinSvg(J_MODEL, SUBJECT.at, P, iso, depthOf, SUBJECT.heading, 2);
  const artist = mannequinSvg(JA, ARTIST.at, P, iso, depthOf, ARTIST.heading, 0, [{ at: b.tip, svg: brush, bias: 2 }]);
  // The model sits further from us than the demonstrator.
  peopleEl.innerHTML = depthOf([SUBJECT.at[0], SUBJECT.at[1], 0], P) < depthOf([ARTIST.at[0], ARTIST.at[1], 0], P) ? model + artist : artist + model;
}
function draw() {
  const sc = scene(clock, ARTIST_RA);
  drawPeople(sc);
  const f = framing(sc, a);
  mainEl.innerHTML = cameraView(sc, camAt(a), f.target, f.width, MAIN);
  if (frameNo++ % 3 === 0) {
    const tw = (MAIN.x1 - MAIN.x0 - (N - 1) * 1.2) / N;
    thumbEls.forEach((el, i) => {
      const x0 = MAIN.x0 + i * (tw + 1.2);
      const fi = framing(sc, i);
      el.innerHTML = cameraView(sc, camAt(i), fi.target, fi.width, { x0, x1: x0 + tw, y0: THUMBS.y0, y1: THUMBS.y1 }, { detail: false });
    });
  }
  const near = Math.round(a);
  camEls.forEach((el, i) => el.toggleAttribute("data-on", i === near));
  thumbFrames.forEach((el, i) => el.toggleAttribute("data-on", i === near));
  knob.setAttribute("cx", (SLIDER.x0 + ((SLIDER.x1 - SLIDER.x0) * a) / (N - 1)).toFixed(2));
  const deg = Math.round(RIG.from + ((RIG.to - RIG.from) * a) / (N - 1) - 90);
  camLabel.textContent = "카메라 " + (near + 1) + " / " + N + " · " + (deg > 0 ? "좌 " : deg < 0 ? "우 " : "") + Math.abs(deg) + "°";
  const shift = (a / (N - 1) - 0.5) * 18;
  const v = axisVector(P, [1, 0, 0]);
  mouseEl.setAttribute("transform", "translate(" + (v[0] * shift).toFixed(2) + " " + (v[1] * shift).toFixed(2) + ")");
  stage.setAttribute("aria-valuenow", String(near + 1));
  const kind = a < 2.5 ? "얼굴 클로즈업" : a > 5.5 ? "시연자와 모델 투샷" : "중간 샷";
  const text = "카메라 " + (near + 1) + "/9 · " + kind + " · 브러시 시연 중";
  if (readout.textContent !== text) readout.textContent = text;
}
function tick(now) {
  const dt = previous ? Math.min((now - previous) / 1000, 1 / 20) : 1 / 60;
  previous = now;
  clock += dt;
  if (touring) {
    // Sweep slowly from the close-up to the two-shot and back, with a pause at each end.
    tourT += dt;
    const period = 22, u = (tourT % period) / period;
    const ramp = u < 0.1 ? 0 : u < 0.45 ? (u - 0.1) / 0.35 : u < 0.6 ? 1 : u < 0.95 ? 1 - (u - 0.6) / 0.35 : 0;
    aTarget = (N - 1) * ramp;
  }
  a += (aTarget - a) * (1 - Math.exp(-dt / 0.18));
  draw();
  frame = visible && !still.matches ? requestAnimationFrame(tick) : 0;
}
function run() { if (!frame && visible && !still.matches) { previous = 0; frame = requestAnimationFrame(tick); } }
function takeOver() {
  touring = false;
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => { if (!still.matches) { touring = true; tourT = (a / (N - 1)) * 0.35 * 22 + 0.1 * 22; run(); } }, 12000);
}
const clampA = (x) => Math.max(0, Math.min(N - 1, x));
let dragX = null;
stage.addEventListener("pointerdown", (e) => { dragX = e.clientX; stage.setPointerCapture?.(e.pointerId); stage.focus({ preventScroll: true }); takeOver(); });
stage.addEventListener("pointermove", (e) => { if (dragX === null) return; aTarget = clampA(aTarget + (e.clientX - dragX) / 45); dragX = e.clientX; run(); });
stage.addEventListener("pointerup", () => { dragX = null; });
stage.addEventListener("pointercancel", () => { dragX = null; });
stage.addEventListener("wheel", (e) => { e.preventDefault(); takeOver(); aTarget = clampA(aTarget + (e.deltaY || e.deltaX) / 120); run(); }, { passive: false });
stage.addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft" || e.key === "ArrowRight") { e.preventDefault(); takeOver(); aTarget = clampA(Math.round(aTarget) + (e.key === "ArrowRight" ? 1 : -1)); status.textContent = "카메라 " + (Math.round(aTarget) + 1); run(); }
});
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
if (still.matches) { a = aTarget = 4; }
draw();
