import { describe, expect, it } from 'vitest';
import {
  chutePosition,
  clampClaw,
  clawLimit,
  isOverChute,
  sumDirections
} from './wishlistClaw';

describe('wishlist claw helpers', () => {
  it('maps screen directions to the camera plane', () => {
    const right = sumDirections(['right']);
    expect(right.x).toBeGreaterThan(0);
    expect(right.z).toBeLessThan(0);
    expect(sumDirections(['left', 'right'])).toEqual({ x: 0, z: 0 });
  });

  it('keeps the claw inside the cabinet', () => {
    expect(clampClaw({ x: 9, z: -9 })).toEqual({ x: clawLimit, z: -clawLimit });
    expect(clampClaw({ x: 1, z: 1 })).toEqual({ x: 1, z: 1 });
  });

  it('detects the chute', () => {
    expect(isOverChute(chutePosition)).toBe(true);
    expect(isOverChute({ x: 0, z: 0 })).toBe(false);
  });
});
