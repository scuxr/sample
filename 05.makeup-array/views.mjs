// The make-up demonstration in the world, and how each camera of the array sees it.
// Pure: inlined into the page after model.mjs. World cm, z up.
import { skeleton, flatten } from "../01.ballet-mirror/model.mjs";

export const SUBJECT = { at: [250, 60], heading: 180 }; // the model in the chair, facing the cameras (+y)
export const ARTIST = { at: [292, 22], heading: 228, lean: 10 }; // the demonstrator, behind the model's right shoulder, facing her
export const RIG = { r: 215, from: 150, to: 30, count: 9, z: 128 }; // camera angles (deg, from +x), left of the strip first
export const FACE_R = 10.5;

const VA = (a, b, s = 1) => [a[0] + b[0] * s, a[1] + b[1] * s, a[2] + b[2] * s];
const VS = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const VD = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const VU = (a) => { const n = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / n, a[1] / n, a[2] / n]; };
function placeOf(p, at, heading) {
  const h = (heading * Math.PI) / 180;
  const fw = [Math.sin(h), -Math.cos(h)], rt = [-Math.cos(h), -Math.sin(h)];
  return [at[0] + p[0] * rt[0] + p[1] * fw[0], at[1] + p[0] * rt[1] + p[1] * fw[1], p[2]];
}
export const SEATED_POSE = flatten({ tilt: -4, nod: -4, R: { thigh: [86, 4], shin: [10, 180], foot: [70, 4] }, L: { thigh: [86, -4], shin: [10, 180], foot: [70, 4] }, RA: { upper: [18, 10], fore: [80, -20] }, LA: { upper: [18, 10], fore: [80, -20] } });
export function artistPose(ra) {
  return flatten({ tilt: 10, nod: 18, R: { thigh: [3, 80], shin: [3, 80], foot: [66, 35] }, L: { thigh: [3, 100], shin: [3, 100], foot: [66, 35] }, RA: { upper: [ra[0], ra[1]], fore: [ra[2], ra[3]] }, LA: { upper: [30, 20], fore: [80, -40] } });
}
export function cameraPos(i) {
  const n = RIG.count - 1;
  const deg = RIG.from + ((RIG.to - RIG.from) * i) / n;
  const a = (deg * Math.PI) / 180;
  return [SUBJECT.at[0] + Math.cos(a) * RIG.r, SUBJECT.at[1] + Math.sin(a) * RIG.r, RIG.z];
}
// Framing along the strip: a close-up of the face at the left end, both people at the right end.
export function framingAt(u) {
  const e = u * u * (3 - 2 * u);
  return { width: 34 + (175 - 34) * e, lift: e };
}
// Where the brush tip is: strokes over the nose bridge and the near cheek.
export function brushAzEl(t) {
  const w = (Math.PI * 2) / 1.7;
  return [8 + 16 * Math.sin(w * t), 6 + 7 * Math.sin(2 * w * t)];
}
export function facePoint(head, heading, az, el, out = 0) {
  // az measured round the face from her nose, + toward her right; el up.
  const h = (heading * Math.PI) / 180;
  const fw = [Math.sin(h), -Math.cos(h), 0], rt = [-Math.cos(h), -Math.sin(h), 0];
  const a = (az * Math.PI) / 180, e = (el * Math.PI) / 180;
  const n = VU(VA(VA(fw.map((v) => v * Math.cos(a) * Math.cos(e)), rt, Math.sin(a) * Math.cos(e)), [0, 0, 1], Math.sin(e)));
  return { p: VA(head, n, FACE_R + out), n };
}

// The people as drawable parts in the world: capsules [a, b, r, cls], balls [c, r, cls], faces, the brush.
export function scene(t, artistRA, artistShift) {
  const Js = skeleton(SEATED_POSE);
  const S = {};
  for (const k in Js) S[k] = placeOf(Js[k], SUBJECT.at, SUBJECT.heading);
  const lift = 2;
  for (const k in S) S[k] = [S[k][0], S[k][1], S[k][2] + lift];
  const Ja = skeleton(artistPose(artistRA));
  const A = {};
  for (const k in Ja) A[k] = placeOf(Ja[k], ARTIST.at, ARTIST.heading);
  const [az, el] = brushAzEl(t);
  const tip = facePoint(S.head, SUBJECT.heading, az, el, 1.2);
  // The hand follows the tip: shift wrist and elbow with the stroke.
  const base = facePoint(S.head, SUBJECT.heading, 8, 6, 1.2).p;
  const d = VS(tip.p, base);
  A.wristR = VA(A.wristR, d);
  A.elbowR = VA(A.elbowR, d, 0.45);
  void artistShift;
  const caps = [];
  const bone = (J, a, b, r, cls) => caps.push([J[a], J[b], r, cls]);
  // Model: black top, skin, dark trousers.
  bone(S, "hipL", "kneeL", 6.4, "pants"); bone(S, "kneeL", "ankleL", 4.8, "pants"); bone(S, "ankleL", "toeL", 3, "shoe");
  bone(S, "hipR", "kneeR", 6.4, "pants"); bone(S, "kneeR", "ankleR", 4.8, "pants"); bone(S, "ankleR", "toeR", 3, "shoe");
  bone(S, "hipL", "hipR", 9, "pants"); bone(S, "pelvis", "waist", 8.6, "top"); bone(S, "waist", "chest", 12, "top"); bone(S, "chest", "neck", 4, "skin");
  bone(S, "shoulderL", "shoulderR", 5.2, "top");
  bone(S, "shoulderR", "elbowR", 3.6, "skin"); bone(S, "elbowR", "wristR", 3, "skin"); bone(S, "shoulderL", "elbowL", 3.6, "skin"); bone(S, "elbowL", "wristL", 3, "skin");
  // Demonstrator: white shirt, black apron over the front, black trousers.
  bone(A, "hipL", "kneeL", 6.6, "dark"); bone(A, "kneeL", "ankleL", 5, "dark"); bone(A, "ankleL", "toeL", 3, "shoe");
  bone(A, "hipR", "kneeR", 6.6, "dark"); bone(A, "kneeR", "ankleR", 5, "dark"); bone(A, "ankleR", "toeR", 3, "shoe");
  bone(A, "hipL", "hipR", 9.4, "dark"); bone(A, "pelvis", "waist", 9, "shirt"); bone(A, "waist", "chest", 12.4, "shirt"); bone(A, "chest", "neck", 4, "skin");
  bone(A, "shoulderL", "shoulderR", 5.6, "shirt");
  bone(A, "shoulderR", "elbowR", 4.4, "shirt"); bone(A, "elbowR", "wristR", 3.8, "shirt"); bone(A, "shoulderL", "elbowL", 4.4, "shirt"); bone(A, "elbowL", "wristL", 3.8, "shirt");
  const h = (ARTIST.heading * Math.PI) / 180;
  const afw = [Math.sin(h), -Math.cos(h), 0];
  caps.push([VA(A.pelvis, afw, 6), VA(A.chest, afw, 9), 11, "apron"]);
  caps.push([VA(A.hipL, afw, 5), VA(A.kneeL, afw, 4), 8, "apron"]);
  const balls = [[S.wristR, 3.2, "skin"], [S.wristL, 3.2, "skin"], [A.wristR, 3.4, "skin"], [A.wristL, 3.4, "skin"]];
  const brushEnd = VA(tip.p, VU(VS(A.wristR, tip.p)), 15);
  const brush = { tip: tip.p, end: brushEnd, hand: A.wristR };
  const faces = [
    { head: S.head, heading: SUBJECT.heading, hair: "long", eyes: "closed", cls: "model" },
    { head: A.head, heading: ARTIST.heading, nod: 18, hair: "bob", eyes: "open", cls: "artist" },
  ];
  return { S, A, caps, balls, faces, brush };
}

// ---------- a camera's picture ----------
const vf = (v) => (Math.round(v * 10) / 10).toString();
export function cameraView(sc, cam, target, width, region, { detail = true } = {}) {
  const look = VU(VS(target, cam));
  const right = VU([look[1] * 1 - 0, 0 - look[0] * 1, 0]); // look x up, flattened
  const up = [0, 0, 1];
  const s = (region.x1 - region.x0) / width;
  const cx = (region.x0 + region.x1) / 2, cy = (region.y0 + region.y1) / 2;
  const P2 = (p) => { const q = VS(p, target); return [cx + VD(q, right) * s, cy - VD(q, up) * s]; };
  const depthAt = (p) => -VD(VS(p, target), look); // larger is nearer the camera
  const items = [];
  // Backdrop: the white cyclorama and its floor, the chair.
  const floorY = P2([target[0], target[1], 0])[1];
  items.push([-1e9, '<path class="vw-cyc" d="M' + region.x0 + " " + region.y0 + "H" + region.x1 + "V" + vf(Math.min(region.y1, floorY)) + "H" + region.x0 + 'Z"/><path class="vw-floor" d="M' + region.x0 + " " + vf(Math.min(region.y1, floorY)) + "H" + region.x1 + "V" + region.y1 + "H" + region.x0 + 'Z"/>']);
  const seatC = [SUBJECT.at[0], SUBJECT.at[1] + 4, 46];
  const backC = [SUBJECT.at[0], SUBJECT.at[1] - 22, 92];
  const chair = [[[seatC[0] - 22, seatC[1], 46], [seatC[0] + 22, seatC[1], 46], 9, "chair"], [[backC[0] - 18, backC[1], 64], [backC[0] + 18, backC[1], 116], 0, "chair"], [[backC[0], backC[1], 60], [backC[0], backC[1], 118], 20, "chair"], [[seatC[0], seatC[1], 0], [seatC[0], seatC[1], 40], 3.5, "metal"]];
  for (const [a, b, r, cls] of chair) if (r) items.push([Math.min(depthAt(a), depthAt(b)) - 6, line(P2(a), P2(b), r * s, cls)]);
  for (const [a, b, r, cls] of sc.caps) items.push([(depthAt(a) + depthAt(b)) / 2, line(P2(a), P2(b), r * s, cls)]);
  for (const [c, r, cls] of sc.balls) items.push([depthAt(c) + 0.5, '<circle class="vw-' + cls + '" cx="' + vf(P2(c)[0]) + '" cy="' + vf(P2(c)[1]) + '" r="' + vf(r * s) + '"/>']);
  for (const f of sc.faces) items.push([depthAt(f.head), faceSvg(f, P2, look, s, detail)]);
  // Brush: handle from the hand, ferrule, the tuft at the skin.
  const b = sc.brush;
  items.push([depthAt(b.tip) + 3, line(P2(b.end), P2(VA(b.tip, VU(VS(b.end, b.tip)), 4)), 0.9 * s, "brush") + line(P2(VA(b.tip, VU(VS(b.end, b.tip)), 4)), P2(b.tip), 1.6 * s, "tuft")]);
  items.sort((p, q) => p[0] - q[0]);
  return items.map((i) => i[1]).join("");
}
function line(a, b, w, cls) {
  return '<path class="vw-' + cls + '" d="M' + vf(a[0]) + " " + vf(a[1]) + "L" + vf(b[0]) + " " + vf(b[1]) + '" stroke-width="' + vf(Math.max(0.3, w * 2)) + '"/>';
}
// A head seen from the camera: hair behind, the face, the features that face the camera.
function faceSvg(f, P2, look, s, detail) {
  const c = P2(f.head);
  const R = FACE_R * s;
  const h = (f.heading * Math.PI) / 180;
  const fw = [Math.sin(h), -Math.cos(h), 0];
  // Where her nose points on the picture, and how much she faces the camera.
  const facing = -VD(fw, look);
  const n2 = P2(VA(f.head, fw, FACE_R));
  const dx = (n2[0] - c[0]) / (R || 1);
  const out = [];
  const hairBack = [c[0] - dx * R * 0.35, c[1] - R * 0.08];
  if (f.hair === "long") out.push('<path class="vw-hair" d="M' + vf(hairBack[0] - R * 1.05) + " " + vf(c[1] - R * 0.2) + "Q" + vf(hairBack[0] - R * 1.15) + " " + vf(c[1] + R * 2.6) + " " + vf(hairBack[0] - R * 0.6) + " " + vf(c[1] + R * 3.2) + "L" + vf(hairBack[0] + R * 0.6) + " " + vf(c[1] + R * 3.2) + "Q" + vf(hairBack[0] + R * 1.15) + " " + vf(c[1] + R * 2.6) + " " + vf(hairBack[0] + R * 1.05) + " " + vf(c[1] - R * 0.2) + 'Z"/>');
  out.push('<circle class="vw-hair" cx="' + vf(hairBack[0]) + '" cy="' + vf(hairBack[1]) + '" r="' + vf(R * 1.08) + '"/>');
  out.push('<ellipse class="vw-skin" cx="' + vf(c[0]) + '" cy="' + vf(c[1] + R * 0.06) + '" rx="' + vf(R * (0.82 + 0.06 * Math.abs(dx))) + '" ry="' + vf(R * 1.02) + '"/>');
  // A fringe across the top of the face, swept to the back.
  out.push('<path class="vw-hair" d="M' + vf(c[0] - R * 0.95) + " " + vf(c[1] - R * 0.15) + "Q" + vf(c[0] + dx * R * 0.2) + " " + vf(c[1] - R * 1.35) + " " + vf(c[0] + R * 0.95) + " " + vf(c[1] - R * 0.15) + "Q" + vf(c[0]) + " " + vf(c[1] - R * 0.75) + " " + vf(c[0] - R * 0.95) + " " + vf(c[1] - R * 0.15) + 'Z"/>');
  if (!detail || facing < -0.2) return out.join("");
  const nod = (f.nod || 0);
  const feat = (az, el) => {
    const a = (az * Math.PI) / 180, e = ((el - nod) * Math.PI) / 180;
    const rt = [-Math.cos(h), -Math.sin(h), 0];
    const n = VU(VA(VA(fw.map((v) => v * Math.cos(a) * Math.cos(e)), rt, Math.sin(a) * Math.cos(e)), [0, 0, 1], Math.sin(e)));
    return { p: P2(VA(f.head, n, FACE_R)), vis: -VD(n, look) };
  };
  const w = Math.max(0.35, R * 0.07);
  for (const side of [-1, 1]) {
    const e = feat(side * 30, 6);
    if (e.vis > 0.12) {
      const len = R * 0.32 * Math.min(1, e.vis + 0.2);
      out.push(f.eyes === "closed"
        ? '<path class="vw-lash" stroke-width="' + vf(w) + '" d="M' + vf(e.p[0] - len) + " " + vf(e.p[1]) + "Q" + vf(e.p[0]) + " " + vf(e.p[1] + len * 0.5) + " " + vf(e.p[0] + len) + " " + vf(e.p[1]) + '"/>'
        : '<ellipse class="vw-eye" cx="' + vf(e.p[0]) + '" cy="' + vf(e.p[1]) + '" rx="' + vf(len * 0.6) + '" ry="' + vf(len * 0.32) + '"/>');
      const b = feat(side * 30, 22);
      out.push('<path class="vw-brow" stroke-width="' + vf(w * 1.2) + '" d="M' + vf(b.p[0] - len) + " " + vf(b.p[1] + len * 0.15) + "Q" + vf(b.p[0]) + " " + vf(b.p[1] - len * 0.3) + " " + vf(b.p[0] + len) + " " + vf(b.p[1]) + '"/>');
    }
    const ear = feat(side * 92, 2);
    if (ear.vis > 0.05 && f.hair !== "long") out.push('<ellipse class="vw-skin" cx="' + vf(ear.p[0]) + '" cy="' + vf(ear.p[1]) + '" rx="' + vf(R * 0.16) + '" ry="' + vf(R * 0.26) + '"/>');
  }
  const nose = feat(0, -8), nose2 = feat(0, 6);
  if (nose.vis > 0) out.push('<path class="vw-nose" stroke-width="' + vf(w) + '" d="M' + vf(nose2.p[0]) + " " + vf(nose2.p[1]) + "L" + vf(nose.p[0] + dx * R * 0.12) + " " + vf(nose.p[1]) + "L" + vf(nose.p[0] - dx * R * 0.05) + " " + vf(nose.p[1] + R * 0.06) + '"/>');
  const lip = feat(0, -30);
  if (lip.vis > 0.1) out.push('<path class="vw-lip" d="M' + vf(lip.p[0] - R * 0.2 * lip.vis) + " " + vf(lip.p[1]) + "Q" + vf(lip.p[0]) + " " + vf(lip.p[1] + R * 0.12) + " " + vf(lip.p[0] + R * 0.2 * lip.vis) + " " + vf(lip.p[1]) + "Q" + vf(lip.p[0]) + " " + vf(lip.p[1] - R * 0.05) + " " + vf(lip.p[0] - R * 0.2 * lip.vis) + " " + vf(lip.p[1]) + 'Z"/>');
  // Blush where the brush has been: the near cheek.
  if (f.cls === "model") { const ch = feat(26, -12); if (ch.vis > 0.1) out.push('<ellipse class="vw-blush" cx="' + vf(ch.p[0]) + '" cy="' + vf(ch.p[1]) + '" rx="' + vf(R * 0.22 * ch.vis) + '" ry="' + vf(R * 0.14) + '"/>'); }
  return out.join("");
}
