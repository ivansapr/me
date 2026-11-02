import { describe, expect, it } from 'vitest';
import { isChute, moveClaw } from './wishlistClaw';

describe('wishlist claw movement', () => {
  it('moves one cell at a time', () => {
    expect(moveClaw({ col: 1, row: 1 }, 'right')).toEqual({ col: 2, row: 1 });
    expect(moveClaw({ col: 1, row: 1 }, 'back')).toEqual({ col: 1, row: 0 });
  });

  it('stays inside the cabinet', () => {
    expect(moveClaw({ col: 0, row: 0 }, 'left')).toEqual({ col: 0, row: 0 });
    expect(moveClaw({ col: 2, row: 2 }, 'front')).toEqual({ col: 2, row: 2 });
  });

  it('identifies the chute cell', () => {
    expect(isChute({ col: 0, row: 2 })).toBe(true);
    expect(isChute({ col: 1, row: 1 })).toBe(false);
  });
});
