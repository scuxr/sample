// The recorded 360° concert, unrolled: azimuth (degrees, 0 = the band, + to the right as the camera saw it)
// maps to x = az * K, height above the floor z maps to y = -z. Built once; the page only slides it.
import * as M from "../01.ballet-mirror/model.mjs";
import * as DN from "../01.ballet-mirror/dancer.mjs";

const pf = (n) => (Math.round(n * 10) / 10).toString();
const rect = (x0, z0, x1, z1, r = 0) => {
  const [y0, y1] = [-z1, -z0];
  if (!r) return `M${pf(x0)} ${pf(y0)}H${pf(x1)}V${pf(y1)}H${pf(x0)}Z`;
  return `M${pf(x0 + r)} ${pf(y0)}H${pf(x1 - r)}A${r} ${r} 0 0 1 ${pf(x1)} ${pf(y0 + r)}V${pf(y1 - r)}A${r} ${r} 0 0 1 ${pf(x1 - r)} ${pf(y1)}H${pf(x0 + r)}A${r} ${r} 0 0 1 ${pf(x0)} ${pf(y1 - r)}V${pf(y0 + r)}A${r} ${r} 0 0 1 ${pf(x0 + r)} ${pf(y0)}Z`;
};

// Performer poses: a singer with a hand mic, a guitarist, a sax player, a keyboard player.
const STANDING = { tilt: 0, R: { thigh: [6, 90], shin: [6, 90], foot: [66, 40] }, L: { thigh: [6, 90], shin: [6, 90], foot: [66, 40] } };
const POSES = {
  mic: { ...STANDING, RA: { upper: [40, 20], fore: [150, -40] }, LA: { upper: [12, 60], fore: [20, 40] } },
  guitar: { ...STANDING, RA: { upper: [30, 30], fore: [80, -70] }, LA: { upper: [50, 10], fore: [95, -60] } },
  sax: { ...STANDING, tilt: 4, RA: { upper: [30, 10], fore: [100, -60] }, LA: { upper: [40, 10], fore: [120, -50] } },
  keys: { ...STANDING, RA: { upper: [30, 10], fore: [80, -10] }, LA: { upper: [30, 10], fore: [80, -10] } },
};
const BAND = [
  [-44, "mic"], [-29, "keys"], [-14, "mic"], [0, "guitar"], [15, "mic"], [30, "sax"], [44, "mic"],
];
export const HORIZON = 96; // z of the venue floor line in the video

export function panoSvg(K, { z0 = 16, z1 = 258 } = {}) {
  const X = (az) => az * K;
  const out = [];
  out.push(`<path class="pv-ceiling" d="${rect(X(-180), HORIZON, X(180), z1 + 2)}"/>`);
  out.push(`<path class="pv-floor" d="${rect(X(-180), z0 - 2, X(180), HORIZON)}"/>`);
  // Stage deck in the video, in front of the band, and its lip.
  out.push(`<path class="pv-stage" d="${rect(X(-62), HORIZON - 4, X(62), HORIZON + 18)}"/>`);
  out.push(`<path class="pv-stage-lip" d="${rect(X(-62), HORIZON - 4, X(62), HORIZON - 1)}"/>`);
  // Back wall of the stage with a soft wash of light.
  out.push(`<path class="pv-backwall" d="${rect(X(-62), HORIZON + 18, X(62), 232)}"/>`);
  out.push(`<ellipse class="pv-wash" cx="0" cy="${-(HORIZON + 70)}" rx="${pf(X(56))}" ry="80"/>`);
  // Lighting truss with lamps and their beams.
  out.push(`<path class="pv-truss" d="${rect(X(-66), 228, X(66), 236)}"/>`);
  const lamps = [];
  for (let az = -56; az <= 56; az += 14) {
    lamps.push(`<path class="pv-beam" d="M${pf(X(az) - 2)} ${-228}L${pf(X(az) - 16)} ${-(HORIZON + 22)}L${pf(X(az) + 16)} ${-(HORIZON + 22)}L${pf(X(az) + 2)} ${-228}Z"/>`);
    lamps.push(`<circle class="pv-lamp" cx="${pf(X(az))}" cy="-226" r="3"/>`);
  }
  out.push(lamps.join(""));
  // Speaker stacks either side of the stage.
  for (const s of [-1, 1]) {
    const x = X(s * 70);
    out.push(`<path class="pv-speaker" d="${rect(x - 12, HORIZON - 2, x + 12, HORIZON + 40, 1.5)}${rect(x - 10, HORIZON + 42, x + 10, HORIZON + 74, 1.5)}"/>`);
    out.push(`<path class="pv-cone" d="${[HORIZON + 12, HORIZON + 28, HORIZON + 58].map((z) => `M${pf(x - 5)} ${-z}a5 5 0 1 0 10 0a5 5 0 1 0 -10 0Z`).join("")}"/>`);
  }
  // Side walls: panels, a door with an exit light.
  for (const s of [-1, 1]) {
    for (let az = 84; az <= 128; az += 11) out.push(`<path class="pv-panel" d="${rect(X(s * az) - 18, HORIZON + 6, X(s * az) + 18, 220, 1)}"/>`);
    const dx = X(s * 104);
    out.push(`<path class="pv-door" d="${rect(dx - 13, HORIZON - 1, dx + 13, HORIZON + 66)}"/>`);
    out.push(`<path class="pv-exit" d="${rect(dx - 7, HORIZON + 72, dx + 7, HORIZON + 79, 1)}"/>`);
  }
  // Audience seating behind the camera: curved rows rising away, a centre aisle.
  const seats = [];
  for (let row = 0; row < 7; row++) {
    const z = HORIZON - 46 + row * 15;
    const size = 9 - row * 0.7;
    for (let az = 136; az <= 224; az += 5.2 - row * 0.25) {
      if (Math.abs(az - 180) < 4) continue;
      const a = az > 180 ? az - 360 : az;
      const sag = 6 * Math.cos(((az - 180) * Math.PI) / 90);
      seats.push(rect(X(a) - size / 2, z + sag, X(a) + size / 2, z + sag + size * 1.1, 1.2));
    }
  }
  out.push(`<path class="pv-seat" d="${seats.join("")}"/>`);
  // The band, on the stage in the video.
  for (const [az, pose] of BAND) {
    const J = M.skeleton(M.flatten(POSES[pose]));
    out.push(DN.screenFigureSvg(J, { yaw: 0, mirror: false, cx: X(az), floor: HORIZON + 4, scale: 0.62, cls: "pv" }));
    if (pose === "keys") out.push(`<path class="pv-gear" d="${rect(X(az) - 22, HORIZON + 46, X(az) + 22, HORIZON + 52, 1)}M${pf(X(az) - 18)} ${-(HORIZON + 46)}V${-(HORIZON + 4)}M${pf(X(az) + 18)} ${-(HORIZON + 46)}V${-(HORIZON + 4)}"/>`);
    if (pose === "guitar") out.push(`<path class="pv-gear" d="M${pf(X(az) + 12)} ${-(HORIZON + 58)}L${pf(X(az) - 16)} ${-(HORIZON + 74)}"/><ellipse class="pv-gear-fill" cx="${pf(X(az) + 6)}" cy="${-(HORIZON + 56)}" rx="9" ry="6"/>`);
    if (pose === "mic") out.push(`<path class="pv-stand" d="M${pf(X(az) - 9)} ${-(HORIZON + 4)}V${-(HORIZON + 92)}"/>`);
  }
  return out.join("");
}
