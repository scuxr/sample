// Live code for the 360° experience. Inlined after the kit, model, dancer and gear modules.
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const readout = document.querySelector("[data-readout]");
const status = document.querySelector("[data-status]");
const layer = svg.querySelector('[data-layer="free"]');
const slots = [...layer.querySelectorAll("[data-slot]")].map((el) => ({ el, depth: Number(el.dataset.depth) }));
const led = svg.querySelector("[data-led]");
const [bar0, bar1, barY] = led.dataset.bar.split(" ").map(Number);
const doneEl = svg.querySelector('[data-ui="done"]');
const timeEl = svg.querySelector('[data-ui="time"]');
const still = matchMedia("(prefers-reduced-motion: reduce)");
const CLIP_LEN = 189; // 3:09, the recorded concert

// Each viewer turns a quarter at a time and pauses to look: 2.0 s still, 2.6 s turning.
const STEP_HOLD = 2.0, STEP_TURN = 2.6, STEP = STEP_HOLD + STEP_TURN;
const smoothstep = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));
function scheduled(t, base, dir, offset) {
  const s = Math.max(0, t - offset);
  const n = Math.floor(s / STEP), u = (s - n * STEP - STEP_HOLD) / STEP_TURN;
  return base + dir * 90 * (n + smoothstep(u));
}
const POSES_V = {
  hmd: M_flat({ tilt: 0, R: { thigh: [3, 80], shin: [3, 80], foot: [66, 35] }, L: { thigh: [3, 100], shin: [3, 100], foot: [66, 35] }, RA: { upper: [26, 14], fore: [74, 2] }, LA: { upper: [26, 14], fore: [74, 2] } }),
  phone: M_flat({ tilt: 0, nod: 10, R: { thigh: [3, 80], shin: [3, 80], foot: [66, 35] }, L: { thigh: [3, 100], shin: [3, 100], foot: [66, 35] }, RA: { upper: [48, 6], fore: [118, -52] }, LA: { upper: [48, 6], fore: [118, -52] } }),
};
function M_flat(p) { return flatten(p); }
const J_V = { hmd: skeleton(POSES_V.hmd), phone: skeleton(POSES_V.phone) };
const viewers = {
  hmd: { el: svg.querySelector('[data-part="viewer-hmd"]'), strip: svg.querySelector('[data-strip="main"]'), wedge: svg.querySelector('[data-wedge="main"]'), at: VIEWERS.hmd.at, base: VIEWERS.hmd.heading, dir: 1, offset: 0, heading: VIEWERS.hmd.heading, target: VIEWERS.hmd.heading, manual: false },
  phone: { el: svg.querySelector('[data-part="viewer-phone"]'), strip: svg.querySelector('[data-strip="side"]'), wedge: svg.querySelector('[data-wedge="side"]'), at: VIEWERS.phone.at, base: VIEWERS.phone.heading, dir: -1, offset: 2.3, heading: VIEWERS.phone.heading, target: VIEWERS.phone.heading, manual: false },
};
let clock = 0, playing = !still.matches, frame = 0, previous = 0, visible = false, idleTimer = 0;

function gearFor(name, v) {
  const J = J_V[name];
  const W = (p) => toWorld(p, v.at, v.heading);
  const ax = facingAxes(v.heading);
  const extras = [];
  if (name === "hmd") {
    const head = W(J.head);
    const c = [0, 1, 2].map((j) => head[j] + ax.fw[j] * 7 + ax.up[j] * 0.8);
    extras.push(strapOf(head, ax));
    extras.push({ at: c, bias: 0.3, svg: boxSvg(c, [ax.rt, ax.fw, ax.up], [10, 5, 6.2], P, iso, { faceSvg: (face, pts) => (face === "front" ? '<path class="visor" d="M' + pts.map((p) => p[0].toFixed(1) + " " + p[1].toFixed(1)).join("L") + 'Z" transform="" style="opacity:.35"/>' : "") }) });
    for (const side of ["R", "L"]) {
      const w = W(J["wrist" + side]);
      const c2 = [0, 1, 2].map((j) => w[j] + ax.fw[j] * 3 + ax.up[j] * 3);
      extras.push({ at: c2, bias: 0.2, svg: boxSvg(c2, [ax.rt, ax.fw, ax.up], [1.8, 2, 5.2], P, iso) });
    }
  } else {
    const wR = W(J.wristR), wL = W(J.wristL);
    const c = [0, 1, 2].map((j) => (wR[j] + wL[j]) / 2 + ax.fw[j] * 2.5 + ax.up[j] * 6);
    const tilt = facingAxes(v.heading, -14);
    extras.push({ at: c, bias: 0.3, svg: boxSvg(c, [tilt.rt, tilt.fw, tilt.up], [4, 0.5, 8], P, iso, { faceSvg: (face, pts) => (face === "back" ? '<path class="phone-screen" d="M' + pts.map((p) => p[0].toFixed(1) + " " + p[1].toFixed(1)).join("L") + 'Z"/>' : "") }) });
  }
  return extras;
}
function zoneOf(heading) {
  let az = ((-heading % 360) + 540) % 360 - 180; // what she faces in the recording: 0 = the band
  const a = Math.abs(az);
  const name = a < 52 ? "무대" : a < 140 ? (az > 0 ? "오른쪽 스피커·출입구" : "왼쪽 스피커·출입구") : "객석";
  return { az: Math.round(az), name };
}
function draw() {
  for (const [name, v] of Object.entries(viewers)) {
    v.el.innerHTML = mannequinSvg(J_V[name], v.at, P, iso, depthOf, v.heading, 0, gearFor(name, v));
    const d = depthOf([v.at[0], v.at[1], 0], P);
    const before = slots.find((s) => s.depth > d);
    const want = before ? before.el : null;
    if (v.el.nextSibling !== want && v.el !== want) layer.insertBefore(v.el, want);
    const wrapped = ((v.heading % 360) + 360) % 360;
    v.strip.setAttribute("transform", "translate(" + (wrapped * K - (wrapped > 180 ? 360 * K : 0)).toFixed(2) + " 0)");
    v.wedge.setAttribute("transform", "rotate(" + (-v.heading).toFixed(1) + ")");
  }
  const t = clock % CLIP_LEN;
  doneEl.setAttribute("d", "M" + bar0 + " " + barY + "H" + (bar0 + (bar1 - bar0) * (t / CLIP_LEN)).toFixed(1));
  const mmss = (s) => Math.floor(s / 60) + ":" + String(Math.floor(s % 60)).padStart(2, "0");
  timeEl.textContent = mmss(t) + " / " + mmss(CLIP_LEN);
  const zh = zoneOf(viewers.hmd.heading), zp = zoneOf(viewers.phone.heading);
  const text = "HMD ▸ " + zh.name + " " + zh.az + "° · 휴대폰 ▸ " + zp.name + " " + zp.az + "°";
  if (readout.textContent !== text) readout.textContent = text;
}
function tick(now) {
  const dt = previous ? Math.min((now - previous) / 1000, 1 / 20) : 1 / 60;
  previous = now;
  if (playing) clock += dt;
  let busy = playing;
  for (const v of Object.values(viewers)) {
    if (!v.manual && playing) v.target = scheduled(clock, v.base, v.dir, v.offset);
    v.heading += (v.target - v.heading) * (1 - Math.exp(-dt / (v.manual ? 0.35 : 0.08)));
    if (Math.abs(v.target - v.heading) > 0.05) busy = true;
  }
  draw();
  frame = visible && busy && !still.matches ? requestAnimationFrame(tick) : 0;
}
function run() { if (!frame && visible && !still.matches) { previous = 0; frame = requestAnimationFrame(tick); } }
function nudge(name, by) {
  const v = viewers[name];
  v.target = (v.manual ? v.target : v.heading) + by; v.manual = true;
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => { for (const w of Object.values(viewers)) { w.manual = false; w.base = w.heading - (scheduled(clock, 0, w.dir, w.offset)); } run(); }, 12000);
  status.textContent = (name === "hmd" ? "HMD" : "휴대폰") + " 체험자 " + (by > 0 ? "왼쪽" : "오른쪽") + "으로 돌기";
  run();
}
stage.addEventListener("keydown", (event) => {
  if (event.metaKey || event.ctrlKey || event.altKey) return;
  const map = { ArrowLeft: ["hmd", 45], ArrowRight: ["hmd", -45], ArrowUp: ["phone", 45], ArrowDown: ["phone", -45] };
  if (map[event.key]) { event.preventDefault(); nudge(...map[event.key]); return; }
  if (event.key === " ") { event.preventDefault(); playing = !playing; status.textContent = playing ? "재생" : "정지"; run(); }
});
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
still.addEventListener("change", () => { playing = !still.matches; draw(); run(); });
if (still.matches) { viewers.phone.heading = viewers.phone.target = 160; }
draw();

// The headset's strap: a band round the head, drawn where it faces the viewer (the back half when she faces away).
function strapOf(head, ax) {
  const a = (P.azimuth || 45) * Math.PI / 180, e = (P.elevation || 30) * Math.PI / 180;
  const V = [Math.cos(a) * Math.cos(e), Math.sin(a) * Math.cos(e), Math.sin(e)];
  const r = 11.6, pts = [];
  let run = [];
  for (let i = 0; i <= 48; i++) {
    const t = (i / 48) * Math.PI * 2;
    const n = [0, 1, 2].map((j) => ax.fw[j] * Math.cos(t) + ax.rt[j] * Math.sin(t));
    const p = [0, 1, 2].map((j) => head[j] + n[j] * r + ax.up[j] * 1.5);
    if (n[0] * V[0] + n[1] * V[1] + n[2] * V[2] > 0.05) run.push(iso(p, P)); else if (run.length) { pts.push(run); run = []; }
  }
  if (run.length) pts.push(run);
  const d = pts.filter((r2) => r2.length > 1).map((r2) => 'M' + r2.map((p) => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('L')).join('');
  const back = [0, 1, 2].map((j) => head[j] - ax.fw[j] * r);
  return { at: back, bias: 0.6, svg: '<path class="strap" d="' + d + '"/>' };
}
