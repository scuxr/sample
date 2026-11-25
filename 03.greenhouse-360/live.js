// Live code for the greenhouse 360° module. Inlined after the kit, model, dancer, gear and scene modules.
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const readout = document.querySelector("[data-readout]");
const status = document.querySelector("[data-status]");
const ghLayer = svg.querySelector('[data-layer="gh"]');
const roomLayer = svg.querySelector('[data-layer="room"]');
const ghSlots = [...ghLayer.querySelectorAll("[data-slot]")].map((el) => ({ el, depth: Number(el.dataset.depth) }));
const roomSlots = [...roomLayer.querySelectorAll("[data-slot]")].map((el) => ({ el, depth: Number(el.dataset.depth) }));
const operatorEl = svg.querySelector('[data-part="operator"]');
const hmdEl = svg.querySelector('[data-part="hmd-learner"]');
const viewMain = svg.querySelector('[data-view="main"]');
const viewInset = svg.querySelector('[data-view="inset"]');
const standby = svg.querySelector("[data-standby]");
const insetBox = svg.querySelector("[data-insetbox]");
const uiEls = [...svg.querySelectorAll("[data-ui]")];
const wedge = svg.querySelector("[data-wedge]");
const doneEl = svg.querySelector("[data-done]");
const timeEl = svg.querySelector("[data-time]");
const mem = svg.querySelector("[data-mem]");
const memPath = svg.querySelector("[data-mem-path]");
const memCam = svg.querySelector("[data-mem-cam]");
const memPlants = [...svg.querySelectorAll("[data-mem-plant]")];
const memPalms = [...svg.querySelectorAll("[data-mem-palm]")];
const memBenches = [...svg.querySelectorAll("[data-mem-bench]")];
const threadsEl = svg.querySelector('[data-part="threads"]');
const still = matchMedia("(prefers-reduced-motion: reduce)");

const TOTAL = pathLength() / WALK_SPEED;
const PHASES_G = [["rec", TOTAL], ["handoff", 1.8], ["play", TOTAL], ["full", 4.5]];
const SEEN = firstSeen(85);
const SEEN_PALM = PALMS.map(([x, y]) => { for (let s = 0; s <= pathLength(); s += 5) { const p = pathAt(s).pos; if (Math.hypot(p[0] - x, p[1] - y) < 110) return s / WALK_SPEED; } return TOTAL; });
const SEEN_BENCH = BENCHES.map((b) => Math.min(...PLANTS.map((p, i) => (p[0] >= b.x0 && p[0] <= b.x1 && p[1] >= b.y0 && p[1] <= b.y1 ? SEEN[i] : Infinity))));
let phase = 0, phaseT = 0, playing = !still.matches, userYaw = 0, userYawTarget = 0, walked = 0;
let frame = 0, previous = 0, visible = false;
const smooth01 = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));
const mapAt = ([x, y], z = MAP.z) => [MAP.c[0] + (x - GHC[0]) * MAP.s, MAP.c[1] + (y - GHC[1]) * MAP.s, z];
const P2 = (p) => { const q = iso(p, P); return q[0].toFixed(1) + " " + q[1].toFixed(1); };
const mmss = (s) => Math.floor(s / 60) + ":" + String(Math.floor(s % 60)).padStart(2, "0");

// The operator: a catwalk-free, ordinary walk with the right arm raised, holding the camera pole.
function operatorFlat(dist, amp) {
  const f = walkPose(dist / 120, { stride: 20 * amp, tilt: 2, roll: 0, nod: 0, arms: 0.5, bend: 16 * amp });
  f[13] = 166; f[14] = 18; f[15] = 174; f[16] = 6;
  return f;
}
function operatorSvg(pos, heading, flat, rec) {
  const J = skeleton(flat);
  const W = (p) => toWorld(p, pos, heading);
  const ax = facingAxes(heading);
  const wrist = W(J.wristR);
  const bottom = [wrist[0], wrist[1], wrist[2] - 18], top = [wrist[0], wrist[1], CAM_Z - 7];
  const a = iso(bottom, P), b = iso(top, P);
  const s = Math.abs(iso([0, 0, 1], P)[1] - iso([0, 0, 0], P)[1]) / Math.cos(((P.elevation || 30) * Math.PI) / 180);
  const pole = '<path class="pole" d="' + dnCapsule(a, b, 0.9 * s) + '"/>';
  const camC = [wrist[0], wrist[1], CAM_Z];
  const lensDot = (pts) => { const cx = pts.reduce((t, p) => t + p[0], 0) / 4, cy = pts.reduce((t, p) => t + p[1], 0) / 4; return '<circle class="cam-lens" cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="' + (1.6 * s).toFixed(2) + '"/>'; };
  const cam = boxSvg(camC, [ax.rt, ax.fw, ax.up], [2.6, 1.6, 6.5], P, iso, { faceSvg: (face, pts) => (face === "front" || face === "back" ? lensDot(pts) : face === "top" ? '<circle class="cam-tally" cx="' + ((pts[0][0] + pts[2][0]) / 2).toFixed(1) + '" cy="' + ((pts[0][1] + pts[2][1]) / 2).toFixed(1) + '" r="' + (0.9 * s).toFixed(2) + '"/>' : "") });
  return '<path class="iso-halo" d="' + dnCircle(iso([pos[0], pos[1], 0], P), 16 * s) + '"/><g class="' + (rec ? "rec" : "") + '">' + mannequinSvg(J, pos, P, iso, depthOf, heading, 0, [{ at: [wrist[0], wrist[1], (wrist[2] + CAM_Z) / 2], svg: pole, bias: 2 }, { at: camC, svg: cam, bias: 2 }]) + "</g>";
}
function place(el, layer, slots, d) {
  const before = slots.find((q) => q.depth > d);
  const want = before ? before.el : null;
  if (el.parentNode !== layer || el.nextSibling !== want) layer.insertBefore(el, want);
}

const HMD_POSE = flatten({ tilt: 0, R: { thigh: [3, 80], shin: [3, 80], foot: [66, 35] }, L: { thigh: [3, 100], shin: [3, 100], foot: [66, 35] }, RA: { upper: [26, 14], fore: [74, 2] }, LA: { upper: [26, 14], fore: [74, 2] } });
const J_HMD = skeleton(HMD_POSE);
function hmdSvg(heading) {
  const W = (p) => toWorld(p, HMD_AT.at, heading);
  const ax = facingAxes(heading);
  const head = W(J_HMD.head);
  const c = [0, 1, 2].map((j) => head[j] + ax.fw[j] * 7 + ax.up[j] * 0.8);
  const extras = [{ at: c, bias: 0.3, svg: boxSvg(c, [ax.rt, ax.fw, ax.up], [10, 5, 6.2], P, iso) }];
  for (const side of ["R", "L"]) {
    const w = W(J_HMD["wrist" + side]);
    const c2 = [0, 1, 2].map((j) => w[j] + ax.fw[j] * 3 + ax.up[j] * 3);
    extras.push({ at: c2, bias: 0.2, svg: boxSvg(c2, [ax.rt, ax.fw, ax.up], [1.8, 2, 5.2], P, iso) });
  }
  return mannequinSvg(J_HMD, HMD_AT.at, P, iso, depthOf, heading, 0, extras);
}

function draw() {
  const name = PHASES_G[phase][0];
  const t = name === "rec" ? phaseT : name === "play" ? phaseT : name === "full" ? TOTAL : 0;
  // The operator: walking the path while recording, then waiting at the door.
  let opPos, opHeading, opFlat;
  if (name === "rec") {
    const p = pathAt(phaseT * WALK_SPEED);
    opPos = p.pos; opHeading = p.heading;
    const amp = Math.min(1, phaseT / 0.5, (TOTAL - phaseT) / 0.5);
    opFlat = operatorFlat(walked, Math.max(0, amp));
  } else {
    const end = pathAt(pathLength());
    opPos = end.pos; opHeading = 270; opFlat = operatorFlat(0, 0);
  }
  operatorEl.innerHTML = operatorSvg(opPos, opHeading, opFlat, name === "rec");
  if (opPos[0] > GH.x1 + 6) place(operatorEl, roomLayer, roomSlots, depthOf([opPos[0], opPos[1], 0], P));
  else place(operatorEl, ghLayer, ghSlots, depthOf([opPos[0], opPos[1], 0], P));
  // Playback: where the camera was at this moment of the video, and where each viewer is looking.
  const viewing = name === "play" || name === "full";
  const cam = pathAt(Math.min(t, TOTAL) * WALK_SPEED);
  const c = [cam.pos[0], cam.pos[1], CAM_Z];
  const sweep = 55 * Math.sin(phaseT * 0.45);
  const deskYaw = cam.heading + sweep + userYaw;
  const hmdTurn = 70 * Math.sin(phaseT * 0.33 + 1.2);
  const hmdYaw = cam.heading + hmdTurn;
  standby.style.display = viewing ? "none" : "";
  insetBox.style.display = viewing ? "" : "none";
  uiEls.forEach((el) => (el.style.display = viewing ? "" : "none"));
  doneEl.style.display = timeEl.style.display = viewing ? "" : "none";
  if (viewing) {
    viewMain.innerHTML = greenhouseView(c, deskYaw, MAIN_R, 100);
    viewInset.innerHTML = greenhouseView(c, hmdYaw, INSET_R, 90);
    wedge.setAttribute("transform", "rotate(" + (-(deskYaw - cam.heading)).toFixed(1) + ")");
    const x0 = MAIN_R.x0 + 10, x1 = MAIN_R.x1 - 34, y = MAIN_R.y1 - 7;
    doneEl.setAttribute("d", "M" + x0 + " " + y + "H" + (x0 + (x1 - x0) * (t / TOTAL)).toFixed(1));
    timeEl.textContent = mmss(t) + " / " + mmss(TOTAL);
  }
  hmdEl.innerHTML = hmdSvg(HMD_AT.heading + (viewing ? hmdTurn * 0.6 : 0));
  place(hmdEl, roomLayer, roomSlots, depthOf([HMD_AT.at[0], HMD_AT.at[1], 0], P));
  // The remembered plan: the path so far, what has been seen, the camera on it now.
  mem.style.opacity = viewing ? "1" : "0.18";
  const pts = [];
  if (viewing) for (let s = 0; s <= t * WALK_SPEED; s += 8) pts.push(mapAt(pathAt(s).pos));
  if (viewing) pts.push(mapAt(cam.pos));
  memPath.setAttribute("d", pts.length > 1 ? "M" + pts.map(P2).join("L") : "");
  const fade = (seen) => (viewing ? smooth01((t - seen) / 1.2) : 0);
  memPlants.forEach((el, i) => (el.style.opacity = fade(SEEN[i]).toFixed(2)));
  memPalms.forEach((el, i) => (el.style.opacity = fade(SEEN_PALM[i]).toFixed(2)));
  memBenches.forEach((el, i) => { const f = fade(SEEN_BENCH[i]); el.style.fillOpacity = (0.28 * f).toFixed(2); el.style.strokeOpacity = (0.35 + 0.65 * f).toFixed(2); el.style.strokeDasharray = f > 0.5 ? "none" : ""; });
  if (viewing) {
    const m = mapAt(cam.pos);
    const a = ((deskYaw) * Math.PI) / 180;
    const dir = (ang) => [Math.sin(ang), -Math.cos(ang)];
    const [l, r] = [dir(a - 0.6), dir(a + 0.6)];
    const cone = [m, [m[0] + l[0] * 22, m[1] + l[1] * 22, m[2]], [m[0] + r[0] * 22, m[1] + r[1] * 22, m[2]]];
    memCam.innerHTML = '<path class="mem-cone" d="M' + cone.map(P2).join("L") + 'Z"/><circle class="mem-cam" cx="' + P2(m).split(" ")[0] + '" cy="' + P2(m).split(" ")[1] + '" r="2.4"/>';
  } else memCam.innerHTML = "";
  // Threads from the learners' heads up to the plan.
  if (viewing) {
    const heads = [SEAT_HEAD, (() => { const h = toWorld(J_HMD.head, HMD_AT.at, HMD_AT.heading); return [h[0], h[1], h[2] + 14]; })()];
    const targets = [mapAt([GHC[0] - 60, GH.y1]), mapAt([GHC[0] + 90, GH.y1])];
    threadsEl.innerHTML = heads.map((h, i) => '<path class="thread" d="M' + P2(h) + "L" + P2(targets[i]) + '"/><circle class="thread-dot" cx="' + P2(h).split(" ")[0] + '" cy="' + P2(h).split(" ")[1] + '" r="1.4"/><circle class="thread-dot" cx="' + P2(targets[i]).split(" ")[0] + '" cy="' + P2(targets[i]).split(" ")[1] + '" r="1.4"/>').join("");
  } else threadsEl.innerHTML = "";
  // Readout.
  const seenCount = SEEN.filter((s) => viewing && s <= t).length;
  let text;
  if (name === "rec") text = "① 촬영 · 360 카메라를 들고 온실을 걷는 중 " + mmss(phaseT) + " / " + mmss(TOTAL);
  else if (name === "handoff") text = "촬영 완료 · 영상을 교실로";
  else text = "② 탐색 " + mmss(t) + " · ③ 떠올린 식물 " + seenCount + " / " + PLANTS.length;
  if (readout.textContent !== text) readout.textContent = text;
}
function tick(now) {
  const dt = previous ? Math.min((now - previous) / 1000, 1 / 20) : 1 / 60;
  previous = now;
  if (playing) {
    phaseT += dt;
    if (PHASES_G[phase][0] === "rec") walked += dt * WALK_SPEED;
    if (phaseT >= PHASES_G[phase][1]) { phase = (phase + 1) % PHASES_G.length; phaseT = 0; if (phase === 0) walked = 0; }
  }
  userYaw += (userYawTarget - userYaw) * (1 - Math.exp(-dt / 0.3));
  draw();
  frame = visible && !still.matches && (playing || Math.abs(userYawTarget - userYaw) > 0.1) ? requestAnimationFrame(tick) : 0;
}
function run() { if (!frame && visible && !still.matches) { previous = 0; frame = requestAnimationFrame(tick); } }
stage.addEventListener("keydown", (event) => {
  if (event.metaKey || event.ctrlKey || event.altKey) return;
  if (event.key === "ArrowLeft" || event.key === "ArrowRight") { event.preventDefault(); userYawTarget += event.key === "ArrowLeft" ? 40 : -40; status.textContent = "모니터 시점 돌리기"; run(); }
  if (event.key === " ") { event.preventDefault(); playing = !playing; status.textContent = playing ? "재생" : "정지"; run(); }
});
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
still.addEventListener("change", () => { if (still.matches) showStill(); else { playing = true; run(); } });
function showStill() { phase = 2; phaseT = TOTAL * 0.6; playing = false; draw(); }
if (still.matches) showStill(); else draw();
