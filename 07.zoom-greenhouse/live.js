// Live code for the greenhouse Zoom lecture. Inlined after the kit, model, dancer, gear and people modules.
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const readout = document.querySelector("[data-readout]");
const status = document.querySelector("[data-status]");
const profEl = svg.querySelector('[data-part="prof"]');
const partEls = PLACES.map((_, i) => svg.querySelector('[data-part="part' + i + '"]'));
const bigEl = svg.querySelector('[data-view="big"]');
const still = matchMedia("(prefers-reduced-motion: reduce)");

let clock = 0, mode = 0, frame = 0, previous = 0, visible = false, touring = !still.matches, idleTimer = 0, modeT = 0, frameNo = 0;
const scaleS = Math.abs(iso([0, 0, 1], P)[1] - iso([0, 0, 0], P)[1]) / Math.cos(((P.elevation || 30) * Math.PI) / 180);
const TOUR = [[0, 7], [1, 5], [2, 4.5], [3, 4.5], [4, 4], [5, 4]];
let tourIndex = 0;

function potSvg(c) {
  // A terracotta pot with a leafy top, as the professor holds it.
  const a = iso([c[0], c[1], c[2] - 5], P), b = iso([c[0], c[1], c[2] + 5], P);
  const out = ['<path class="pot-body" d="' + dnCapsule(a, b, 6.2 * scaleS) + '"/>'];
  for (const [dx, dy, dz, r] of [[-4, 0, 11, 6], [4, 1, 11, 6], [0, -1, 17, 7], [-7, 2, 16, 4.5], [7, -2, 18, 4.5]]) out.push('<path class="pot-leaf" d="' + dnCircle(iso([c[0] + dx, c[1] + dy, c[2] + dz], P), r * scaleS) + '"/>');
  return out.join("");
}
function draw(st) {
  const J = skeleton(st.prof.flat);
  const wl = toWorld(J.wristL, st.prof.at, PROF.heading);
  const ax = facingAxes(PROF.heading);
  const potC = [wl[0] + ax.fw[0] * 6 - ax.rt[0] * 4, wl[1] + ax.fw[1] * 6 - ax.rt[1] * 4, wl[2] + 4];
  profEl.innerHTML = mannequinSvg(J, st.prof.at, P, iso, depthOf, PROF.heading, 0, [{ at: potC, svg: potSvg(potC), bias: 2 }]);
  st.parts.forEach((p, i) => {
    const Jp = skeleton(p.flat);
    const at = personAt(i);
    const hd = headingOf(i);
    const place = [at[0], at[1] + (hd ? 0 : 2)];
    const extras = [];
    if (PLACES[i].seat === "sofa") {
      // The tablet in both hands, its screen toward her.
      const wr = toWorld(Jp.wristR, place, hd), wlp = toWorld(Jp.wristL, place, hd);
      const tf = facingAxes(hd, -30);
      const c = [(wr[0] + wlp[0]) / 2 + tf.fw[0] * 3, (wr[1] + wlp[1]) / 2 + tf.fw[1] * 3, (wr[2] + wlp[2]) / 2 + 6];
      const t = tf;
      extras.push({ at: c, bias: 1, svg: boxSvg(c, [t.rt, t.fw, t.up], [12, 0.6, 8.5], P, iso) });
    }
    partEls[i].innerHTML = mannequinSvg(Jp, place, P, iso, depthOf, hd, 0, extras);
  });
  if (frameNo++ % 2 === 0) bigEl.innerHTML = zoomScreen(mode, SCR_R, st, clock);
  const events = [];
  if (st.parts[0].hand > 0.3) events.push("참가자 1 손 들기");
  if (st.parts[1].talking > 0.5) events.push("참가자 2 질문 중");
  else events.push("교수 설명 중" + (st.prof.lift > 0.5 ? " · 화분을 들어 보임" : st.prof.point > 0.5 ? " · 잎을 가리킴" : ""));
  const text = "대형 화면: " + MODES[mode] + " · " + events.join(" · ");
  if (readout.textContent !== text) readout.textContent = text;
}
function state() {
  const parts = PLACES.map((_, i) => partState(i, clock));
  return { prof: profState(clock), parts, speaker: speakerOf(clock, parts) };
}
function tick(now) {
  const dt = previous ? Math.min((now - previous) / 1000, 1 / 20) : 1 / 60;
  previous = now;
  clock += dt;
  if (touring) {
    modeT += dt;
    if (modeT > TOUR[tourIndex][1]) { tourIndex = (tourIndex + 1) % TOUR.length; mode = TOUR[tourIndex][0]; modeT = 0; frameNo = 0; }
  }
  draw(state());
  frame = visible && !still.matches ? requestAnimationFrame(tick) : 0;
}
function run() { if (!frame && visible && !still.matches) { previous = 0; frame = requestAnimationFrame(tick); } }
function setMode(m) {
  mode = (m + MODES.length) % MODES.length;
  frameNo = 0;
  status.textContent = "대형 화면 " + MODES[mode];
  touring = false;
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => { if (!still.matches) { touring = true; tourIndex = TOUR.findIndex((x) => x[0] === mode); modeT = 0; run(); } }, 14000);
  draw(state());
  run();
}
stage.addEventListener("keydown", (e) => {
  if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); setMode(mode + 1); }
  else if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); setMode(mode - 1); }
  else if (/^[0-5]$/.test(e.key)) { e.preventDefault(); setMode(Number(e.key)); }
});
svg.addEventListener("click", () => { stage.focus({ preventScroll: true }); setMode(mode + 1); });
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
if (still.matches) clock = 6;
draw(state());
