/** Scroll choreography shared by the WebGL sculpture and the DOM layer (labels, CSS, fallback). */
export const timeline = {
  reveal: [0.14, 0.06], approach: [0.18, 0.24], insert: [0.42, 0.12], turn: [0.54, 0.10],
  release: [0.64, 0.06], swing: [0.68, 0.10], identity: [0.78, 0.11], portable: [0.90, 0.085],
} as const;

export type Stage = keyof typeof timeline;
export const stage = (progress: number, name: Stage) => (progress - timeline[name][0]) / timeline[name][1];
