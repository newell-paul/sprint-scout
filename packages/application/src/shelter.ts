export const shelterPresets = {
  exposed: { label: "Exposed", windFactor: 1 },
  sheltered: { label: "Sheltered", windFactor: 0.65 },
  dense: { label: "Dense", windFactor: 0.35 },
} as const;
export type Shelter = keyof typeof shelterPresets;
export function isShelter(value: unknown): value is Shelter {
  return value === "exposed" || value === "sheltered" || value === "dense";
}
