import { describe, expect, it } from 'vitest';
import { clampClaw, isOverChute, sumDirections } from './wishlistClaw';

describe('wishlist claw helpers', () => {
  it('maps screen directions onto the field', () => {
    expect(sumDirections(['right'])).toEqual({ x: 1, z: 0 });
    expect(sumDirections(['back'])).toEqual({ x: 0, z: -1 });
    expect(sumDirections(['left', 'right'])).toEqual({ x: 0, z: 0 });
  });

  it('keeps the claw inside the field', () => {
    const bounds = { x: 3, z: 2 };
    expect(clampClaw({ x: 9, z: -9 }, bounds)).toEqual({ x: 3, z: -2 });
    expect(clampClaw({ x: 1, z: 1 }, bounds)).toEqual({ x: 1, z: 1 });
  });

  it('detects the chute', () => {
    const chute = { x: -3, z: 2 };
    expect(isOverChute(chute, chute)).toBe(true);
    expect(isOverChute({ x: 0, z: 0 }, chute)).toBe(false);
  });
});
