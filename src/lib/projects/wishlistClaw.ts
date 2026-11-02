export type Vec2 = { x: number; z: number };
export type ClawDirection = 'left' | 'right' | 'back' | 'front';

export const clawLimit = 2.55;
export const chutePosition: Vec2 = { x: -2.25, z: 2.25 };

const s = Math.SQRT1_2;

// Directions are relative to the isometric camera looking from (+x, +z).
const directions: Record<ClawDirection, Vec2> = {
  right: { x: s, z: -s },
  left: { x: -s, z: s },
  back: { x: -s, z: -s },
  front: { x: s, z: s }
};

const clamp = (value: number) =>
  Math.min(clawLimit, Math.max(-clawLimit, value));

export function sumDirections(active: readonly ClawDirection[]): Vec2 {
  const sum = { x: 0, z: 0 };
  for (const name of active) {
    sum.x += directions[name].x;
    sum.z += directions[name].z;
  }
  return sum;
}

export function clampClaw(position: Vec2): Vec2 {
  return { x: clamp(position.x), z: clamp(position.z) };
}

export function isOverChute(position: Vec2, tolerance = 0.1): boolean {
  return (
    Math.hypot(position.x - chutePosition.x, position.z - chutePosition.z) <=
    tolerance
  );
}
