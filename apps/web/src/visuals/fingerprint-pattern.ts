export type RidgePoint = { x: number; y: number };

// Same aperture for the extruded sculpture and its SVG fallback.
export const keyhole = { centerY: 0.28, radius: 0.28, shoulderX: 0.14, shoulderY: 0.28 - Math.sqrt(0.28 ** 2 - 0.14 ** 2), bottomY: -0.73, footX: 0.25 };

/** Clearance includes the rounded ridge radius; no stroke crosses the opening. */
export function inKeyholeClearance({ x, y }: RidgePoint) {
  return keyholeDistance(x, y) < 0.045;
}

export const keyholeSvgPath = (() => {
  const { centerY, radius, shoulderX, shoulderY, bottomY, footX } = keyhole;
  const px = (x: number) => 150 + x * 82, py = (y: number) => 190 - y * 82;
  return `M${px(-shoulderX)},${py(shoulderY)} A${radius * 82},${radius * 82} 0 1 1 ${px(shoulderX)},${py(shoulderY)} L${px(footX)},${py(bottomY + 0.045)} Q${px(footX + 0.006)},${py(bottomY)} ${px(footX - 0.04)},${py(bottomY)} L${px(-footX + 0.04)},${py(bottomY)} Q${px(-footX - 0.006)},${py(bottomY)} ${px(-footX)},${py(bottomY + 0.045)} Z`;
})();

export const keySvgPath = 'M150 184 L76 184 A23 23 0 1 0 76 196 L94 196 L94 208 L104 208 L104 196 L121 196 L121 208 L132 208 L132 196 L150 196 Z M70 190 A14 14 0 1 0 42 190 A14 14 0 1 0 70 190 Z';

/** Plate-space rectangle covered by the ridge artwork (centred on the plate). */
export const ridgeArea = { width: 2.18, height: 2.90 };

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smoothstep = (e0: number, e1: number, v: number) => { const t = clamp01((v - e0) / (e1 - e0)); return t * t * (3 - 2 * t); };

function hash(i: number, j: number) {
  let h = (Math.imul(i, 374761393) + Math.imul(j, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function noise(x: number, y: number) {
  const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = hash(i, j), b = hash(i + 1, j), c = hash(i, j + 1), d = hash(i + 1, j + 1);
  const top = a + (b - a) * u;
  return top + (c + (d - c) * u - top) * v;
}
/** Smooth, zero-centred two-octave noise. */
const field = (x: number, y: number) => noise(x, y) * 0.65 + noise(x * 2.1 + 11.3, y * 2.1 + 5.7) * 0.35 - 0.5;

/** Approximate distance from a point to the keyhole outline (negative inside). */
function keyholeDistance(x: number, y: number) {
  const { centerY, radius, shoulderX, shoulderY, bottomY, footX } = keyhole;
  const circle = Math.hypot(x, y - centerY) - radius;
  const t = clamp01((shoulderY - y) / (shoulderY - bottomY));
  const qx = Math.abs(x) - (shoulderX + t * (footX - shoulderX));
  const qy = Math.max(bottomY - y, y - centerY);
  const slot = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0);
  return Math.min(circle, slot);
}

const SPACING = 0.05;

/**
 * Stylised whorl whose core *is* the keyhole: ridges spiral around the opening,
 * relax into soft arches below it and taper out towards the rim. Pure maths –
 * no biometric sample or photograph is involved. Returns a 0..1 ridge profile.
 */
export function ridgeValue(x: number, y: number) {
  const wx = x + 0.07 * field(x * 1.3 + 2.0, y * 1.3);
  const wy = y + 0.07 * field(x * 1.3, y * 1.3 + 9.0);
  const dx = wx, dy = wy - keyhole.centerY;
  const sy = 1.14 + 0.12 * Math.tanh(dy * 2.2);
  const whorl = Math.hypot(dx * 0.98, dy / sy);
  const below = smoothstep(0.55, 1.45, -dy);
  const arch = -dy / 1.02 + 0.16 * dx * dx + 0.02;
  const radial = whorl + (arch - whorl) * below;
  // A single continuous spiral arm (the atan2 seam lies where `below` is 0).
  const phase = (radial + SPACING * (Math.atan2(dy, dx) / (2 * Math.PI)) * (1 - below)) / SPACING;
  let v = 0.5 + 0.5 * Math.cos(phase * 2 * Math.PI);
  v += 0.10 * field(x * 5.3 + 1.7, y * 5.3 + 3.1);
  v -= smoothstep(0.80, 0.92, noise(x * 7.5 + 4.4, y * 7.5 + 8.8)) * 0.55;
  const rim = Math.hypot(x / 1.06, y / 1.42) + 0.04 * field(x * 2.6, y * 2.6 + 4.0);
  const mask = smoothstep(1.0, 0.8, rim) * smoothstep(0.045, 0.13, keyholeDistance(x, y));
  return clamp01(v * mask);
}

export type FingerprintField = { width: number; height: number; data: Float32Array };

export function renderFingerprint(width: number): FingerprintField {
  const height = Math.round(width * ridgeArea.height / ridgeArea.width);
  const data = new Float32Array(width * height);
  for (let row = 0; row < height; row++) {
    const y = (0.5 - row / (height - 1)) * ridgeArea.height;
    for (let col = 0; col < width; col++) {
      data[row * width + col] = ridgeValue((col / (width - 1) - 0.5) * ridgeArea.width, y);
    }
  }
  return { width, height, data };
}

/** `crisp` gives clean ridge edges (alpha/ink); `soft` keeps a rounded height profile (bump). */
export function fingerprintCanvas({ width, height, data }: FingerprintField, mode: 'crisp' | 'soft' | 'ink') {
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  const context = canvas.getContext('2d')!;
  const image = context.createImageData(width, height);
  for (let i = 0; i < data.length; i++) {
    const o = i * 4, v = data[i];
    if (mode === 'ink') {
      image.data[o] = 219; image.data[o + 1] = 181; image.data[o + 2] = 142;
      image.data[o + 3] = Math.round(smoothstep(0.44, 0.56, v) * 255);
    } else {
      const g = Math.round((mode === 'crisp' ? smoothstep(0.44, 0.56, v) : smoothstep(0.3, 0.95, v)) * 255);
      image.data[o] = image.data[o + 1] = image.data[o + 2] = g; image.data[o + 3] = 255;
    }
  }
  context.putImageData(image, 0, 0);
  return canvas;
}
