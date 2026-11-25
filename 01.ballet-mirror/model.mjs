// Pose model for the ballet mirror figure. Pure: no imports, inlined into the page as-is.
// Body-local coordinates are [r, f, z] in cm: r to the dancer's right, f forward, z up, floor at z = 0.

export const BODY = { hipW: 9, thigh: 43, shin: 42, foot: 17, ankle: 7, waist: 17, chest: 31, neck: 8, head: 11, shoulderW: 17, upper: 27, fore: 25 };

// A limb direction: e is the angle from straight down (90 = horizontal), phi the heading on the floor
// (0 = forward, 90 = outward to that side, 180 = back).
const RAD = Math.PI / 180;
function dirOf([e, phi], side) {
  const se = Math.sin(e * RAD);
  return [side * se * Math.sin(phi * RAD), se * Math.cos(phi * RAD), -Math.cos(e * RAD)];
}
const add = (a, b, s = 1) => [a[0] + b[0] * s, a[1] + b[1] * s, a[2] + b[2] * s];

// First position, arms low: where every segment starts and ends.
const PREP = {
  tilt: 0,
  R: { thigh: [3, 90], shin: [3, 90], foot: [66, 55] },
  L: { thigh: [3, 90], shin: [3, 90], foot: [66, 55] },
  RA: { upper: [18, 25], fore: [42, -70] },
  LA: { upper: [18, 25], fore: [42, -70] },
};

// The four demonstration segments the instructor can pick on the laptop. Right leg works.
export const SEGMENTS = [
  {
    name: "플리에",
    pose: {
      tilt: 0,
      R: { thigh: [34, 55], shin: [34, 235], foot: [66, 55] },
      L: { thigh: [34, 55], shin: [34, 235], foot: [66, 55] },
      RA: { upper: [58, 32], fore: [82, -62] },
      LA: { upper: [58, 32], fore: [82, -62] },
    },
  },
  {
    name: "탄듀",
    pose: {
      tilt: 0,
      R: { thigh: [13, 90], shin: [13, 90], foot: [62, 90] },
      L: { thigh: [2, 90], shin: [2, 90], foot: [66, 55] },
      RA: { upper: [76, 78], fore: [82, 96] },
      LA: { upper: [76, 78], fore: [82, 96] },
    },
  },
  {
    name: "데벨로페",
    pose: {
      tilt: -4,
      R: { thigh: [88, 82], shin: [92, 86], foot: [100, 88] },
      L: { thigh: [2, 90], shin: [2, 90], foot: [66, 55] },
      RA: { upper: [80, 80], fore: [86, 96] },
      LA: { upper: [155, 30], fore: [150, -70] },
    },
  },
  {
    name: "아라베스크",
    pose: {
      tilt: 16,
      R: { thigh: [82, 176], shin: [86, 178], foot: [96, 180] },
      L: { thigh: [2, 90], shin: [2, 90], foot: [66, 55] },
      RA: { upper: [84, 118], fore: [86, 128] },
      LA: { upper: [96, 6], fore: [98, 4] },
    },
  },
];

// One segment of the VX clip: 1.0 s in first position, 1.6 s into the pose, 1.6 s held, 1.4 s back.
export const PHASES = [1.0, 1.6, 1.6, 1.4];
export const PERIOD = PHASES.reduce((a, b) => a + b, 0);
export const CLIP = SEGMENTS.length * PERIOD; // the whole VX clip, in seconds

const ease = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
// How far into the pose the professional is, 0..1, at time t inside a segment.
export function weightAt(t) {
  const [a, b, c] = PHASES;
  const u = ((t % PERIOD) + PERIOD) % PERIOD;
  if (u < a) return 0;
  if (u < a + b) return ease((u - a) / b);
  if (u < a + b + c) return 1;
  return 1 - ease((u - a - b - c) / PHASES[3]);
}

// A pose as a flat list of numbers, so poses can be eased and followed component by component.
const LIMBS = [["R", "thigh"], ["R", "shin"], ["R", "foot"], ["L", "thigh"], ["L", "shin"], ["L", "foot"], ["RA", "upper"], ["RA", "fore"], ["LA", "upper"], ["LA", "fore"]];
export function flatten(pose) {
  const out = [pose.tilt];
  for (const [g, k] of LIMBS) out.push(pose[g][k][0], pose[g][k][1]);
  out.push(pose.roll || 0, pose.nod || 0);
  return out;
}
export function unflatten(v) {
  const pose = { tilt: v[0], R: {}, L: {}, RA: {}, LA: {} };
  LIMBS.forEach(([g, k], i) => (pose[g][k] = [v[1 + i * 2], v[2 + i * 2]]));
  pose.roll = v[1 + LIMBS.length * 2] || 0;
  pose.nod = v[2 + LIMBS.length * 2] || 0;
  return pose;
}
export const PREP_FLAT = flatten(PREP);
export const SEG_FLAT = SEGMENTS.map((s) => flatten(s.pose));
export function poseAt(segment, t) {
  const w = weightAt(t);
  const target = SEG_FLAT[segment];
  return PREP_FLAT.map((v, i) => v + (target[i] - v) * w);
}

// Forward kinematics: joints in body-local [r, f, z], lifted so the lower ankle sits at ankle height.
export function skeleton(flat) {
  const pose = unflatten(flat);
  const B = BODY;
  const t = pose.tilt * RAD;
  // Upper body: lean forward by tilt, then drop the right shoulder by roll (both about the pelvis).
  const q = pose.roll * RAD;
  const rot = ([r, f, z]) => {
    const f1 = f * Math.cos(t) + z * Math.sin(t), z1 = -f * Math.sin(t) + z * Math.cos(t);
    return [r * Math.cos(q) + z1 * Math.sin(q), f1, -r * Math.sin(q) + z1 * Math.cos(q)];
  };
  const J = { pelvis: [0, 0, 0] };
  for (const [key, side] of [["R", 1], ["L", -1]]) {
    const hip = [side * B.hipW, 0, 0];
    const knee = add(hip, dirOf(pose[key].thigh, side), B.thigh);
    const ankle = add(knee, dirOf(pose[key].shin, side), B.shin);
    const toe = add(ankle, dirOf(pose[key].foot, side), B.foot);
    Object.assign(J, { ["hip" + key]: hip, ["knee" + key]: knee, ["ankle" + key]: ankle, ["toe" + key]: toe });
  }
  J.waist = rot([0, 0, B.waist]);
  J.chest = rot([0, 0, B.waist + B.chest]);
  J.neck = rot([0, 0, B.waist + B.chest + B.neck]);
  const n = pose.nod * RAD;
  J.head = rot([0, Math.sin(n) * B.head, B.waist + B.chest + B.neck + Math.cos(n) * B.head]);
  for (const [key, side] of [["RA", 1], ["LA", -1]]) {
    const shoulder = rot([side * B.shoulderW, 0, B.waist + B.chest - 4]);
    const elbow = add(shoulder, rot(dirOf(pose[key].upper, side)), B.upper);
    const wrist = add(elbow, rot(dirOf(pose[key].fore, side)), B.fore);
    const s = key[0];
    Object.assign(J, { ["shoulder" + s]: shoulder, ["elbow" + s]: elbow, ["wrist" + s]: wrist });
  }
  const lift = B.ankle - Math.min(J.ankleR[2], J.ankleL[2]);
  for (const name in J) J[name] = [J[name][0], J[name][1], J[name][2] + lift];
  return J;
}

// The limbs drawn, as [from, to, radius in cm].
export const BONES = [
  ["hipR", "kneeR", 6.2], ["kneeR", "ankleR", 4.6], ["ankleR", "toeR", 3],
  ["hipL", "kneeL", 6.2], ["kneeL", "ankleL", 4.6], ["ankleL", "toeL", 3],
  ["hipL", "hipR", 8.5], ["pelvis", "waist", 8], ["waist", "chest", 11.5], ["chest", "neck", 3.6],
  ["shoulderL", "shoulderR", 5], ["shoulderR", "elbowR", 3.6], ["elbowR", "wristR", 3], ["shoulderL", "elbowL", 3.6], ["elbowL", "wristL", 3],
];
export const BALLS = [["kneeR", 5], ["kneeL", 5], ["elbowR", 3.6], ["elbowL", 3.6], ["shoulderR", 5.2], ["shoulderL", 5.2], ["ankleR", 3.8], ["ankleL", 3.8], ["wristR", 3.2], ["wristL", 3.2]];
export const HEAD_R = BODY.head;

// A camera looking at the dancer from heading `yaw` (degrees from straight in front, positive toward her right),
// as a mirror shows it: her right on the viewer's right. Returns [x, y] in cm, y up from the floor.
export function mirrorView([r, f, z], yaw) {
  const a = yaw * RAD;
  return [r * Math.cos(a) - f * Math.sin(a), z];
}

// How the learner follows the projected demonstration: an exponential lag on every joint angle.
export const LAG = 0.38; // seconds

// ---------- model walking (공간확장 모듈) ----------
// A catwalk step cycle. phase 0..1 is one full stride (two steps). style sets how the walk is carried:
// stride (thigh swing, degrees), tilt (hunch forward), roll (right shoulder drop), nod (head down), arms (swing ratio).
export const WALK_STYLES = {
  past: { stride: 15, tilt: 9, roll: 6, nod: 24, arms: 0.25, bend: 22 },
  now: { stride: 23, tilt: -2, roll: 0, nod: -4, arms: 0.55, bend: 14 },
};
const swingOf = (deg) => [Math.abs(deg), deg >= 0 ? 0 : 180];
export function walkPose(phase, style) {
  const a = phase * Math.PI * 2;
  const s = Math.sin(a);
  const legs = {};
  for (const [key, sign, off] of [["R", 1, 0], ["L", -1, Math.PI]]) {
    const th = style.stride * Math.sin(a + off);
    // The knee folds while the leg swings through (the half cycle after it leaves the floor behind).
    const fold = style.bend * Math.max(0, Math.sin(a + off + 1.1));
    legs[key] = { thigh: swingOf(th), shin: swingOf(th - fold), foot: [th > 4 ? 78 : 68, th > 4 ? 0 : 4] };
    void sign;
  }
  const arm = (off) => {
    const al = -style.stride * style.arms * Math.sin(a + off);
    return { upper: swingOf(al + 3), fore: swingOf(al + 12) };
  };
  return flatten({ tilt: style.tilt, roll: style.roll, nod: style.nod, R: legs.R, L: legs.L, RA: arm(0), LA: arm(Math.PI) });
  void s;
}
