// The walk on the runway, as the cameras record it. Pure: no imports; inlined into the page after model.mjs.
// Needs walkPose, WALK_STYLES (model.mjs) in scope when inlined; the build strips this import line.
import { walkPose, WALK_STYLES } from "../01.ballet-mirror/model.mjs";

export const RUN = { x: 225, y0: 66, y1: 214, z: 10 }; // start mark by the wall, turn point at the front
export const SPEED = 46; // cm/s: a slowed catwalk, so the step can be followed
export const TURN_T = 1.4; // seconds to turn at the front mark
export const OUT_T = (RUN.y1 - RUN.y0) / SPEED;
export const CLIP_T = OUT_T * 2 + TURN_T; // one recorded take: out, turn, back
export const STRIDE = { past: 76, now: 112 }; // cm per full stride (two steps)

const wkSmooth = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
export function scaledStyle(name, amp) {
  const s = WALK_STYLES[name];
  return { ...s, stride: s.stride * amp, arms: s.arms, bend: s.bend * amp };
}
// Where the walker is in a take at time tau, and how she is carrying herself.
// heading: 180 faces the front camera (+y), 0 or 360 faces the wall.
export function takeAt(tau, name) {
  const t = Math.min(Math.max(tau, 0), CLIP_T);
  let y, heading, dist, amp;
  if (t < OUT_T) {
    y = RUN.y0 + SPEED * t; heading = 180; dist = SPEED * t;
    amp = wkSmooth(t / 0.45);
  } else if (t < OUT_T + TURN_T) {
    const u = (t - OUT_T) / TURN_T;
    y = RUN.y1; heading = 180 + 180 * wkSmooth(u); dist = SPEED * OUT_T;
    amp = 0.25 + 0.75 * Math.abs(Math.cos(Math.PI * u));
  } else {
    const b = t - OUT_T - TURN_T;
    y = RUN.y1 - SPEED * b; heading = 360; dist = SPEED * (OUT_T + b);
    amp = wkSmooth((OUT_T - b) / 0.45);
  }
  return { pos: [RUN.x, y], z: RUN.z, heading, flat: walkPose(dist / STRIDE[name], scaledStyle(name, amp)), amp };
}
// The camera's view of a walker: the heading round her from which the camera sees her (degrees, toward her right).
export function yawFrom(camera, pos, heading) {
  const h = (heading * Math.PI) / 180;
  const fw = [Math.sin(h), -Math.cos(h)], rt = [-Math.cos(h), -Math.sin(h)];
  const d = [camera[0] - pos[0], camera[1] - pos[1]];
  return (Math.atan2(d[0] * rt[0] + d[1] * rt[1], d[0] * fw[0] + d[1] * fw[1]) * 180) / Math.PI;
}
export function fmtClock(s) {
  const v = Math.max(0, s);
  return String(Math.floor(v / 60)).padStart(2, "0") + ":" + (v % 60).toFixed(1).padStart(4, "0");
}
