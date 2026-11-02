export type Vec2 = { x: number; z: number };
export type ClawDirection = 'left' | 'right' | 'back' | 'front';

/** Half extents the claw may travel to, centred on the field origin. */
export type ClawBounds = { x: number; z: number };

// The camera faces the field from the front (+z), so screen axes map
// straight onto world x (right) and z (towards the viewer).
const directions: Record<ClawDirection, Vec2> = {
  right: { x: 1, z: 0 },
  left: { x: -1, z: 0 },
  back: { x: 0, z: -1 },
  front: { x: 0, z: 1 }
};

const clamp = (value: number, limit: number) =>
  Math.min(limit, Math.max(-limit, value));

export function sumDirections(active: readonly ClawDirection[]): Vec2 {
  const sum = { x: 0, z: 0 };
  for (const name of active) {
    sum.x += directions[name].x;
    sum.z += directions[name].z;
  }
  return sum;
}

export function clampClaw(position: Vec2, bounds: ClawBounds): Vec2 {
  return { x: clamp(position.x, bounds.x), z: clamp(position.z, bounds.z) };
}

export function isOverChute(
  position: Vec2,
  chute: Vec2,
  tolerance = 0.1
): boolean {
  return Math.hypot(position.x - chute.x, position.z - chute.z) <= tolerance;
}
