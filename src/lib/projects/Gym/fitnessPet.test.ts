import { describe, expect, it } from 'vitest';
import {
  applyPetAction,
  decayStats,
  getNeedState,
  INITIAL_STATS,
  OFFLINE_DECAY_CAP_MS,
  restorePet,
  serializePet
} from './fitnessPet';

describe('fitness pet rules', () => {
  it('decays each need at its configured rate', () => {
    expect(decayStats(INITIAL_STATS, 10_000)).toEqual({
      fullness: 69,
      energy: 70,
      strength: 71
    });
  });

  it('caps elapsed decay and clamps stats at zero', () => {
    expect(
      decayStats({ fullness: 10, energy: 10, strength: 10 }, 600_000)
    ).toEqual({ fullness: 0, energy: 0, strength: 0 });
    expect(OFFLINE_DECAY_CAP_MS).toBe(120_000);
  });

  it('applies action benefits, tradeoffs, and upper bounds', () => {
    expect(
      applyPetAction({ fullness: 80, energy: 50, strength: 50 }, 'eat')
    ).toEqual({ fullness: 100, energy: 45, strength: 50 });
    expect(
      applyPetAction({ fullness: 50, energy: 80, strength: 40 }, 'sleep')
    ).toEqual({ fullness: 38, energy: 100, strength: 35 });
    expect(
      applyPetAction({ fullness: 8, energy: 10, strength: 80 }, 'workout')
    ).toEqual({ fullness: 0, energy: 0, strength: 100 });
  });

  it('chooses the lowest need and uses hungry, sleepy, weak tie priority', () => {
    expect(getNeedState({ fullness: 31, energy: 31, strength: 31 })).toBeNull();
    expect(getNeedState({ fullness: 25, energy: 12, strength: 20 })).toBe(
      'sleepy'
    );
    expect(getNeedState({ fullness: 20, energy: 20, strength: 20 })).toBe(
      'hungry'
    );
    expect(getNeedState({ fullness: 40, energy: 20, strength: 20 })).toBe(
      'sleepy'
    );
  });

  it('restores saved stats with capped offline decay', () => {
    const now = 1_000_000;
    const saved = serializePet(
      { fullness: 90, energy: 90, strength: 90 },
      now - 600_000
    );

    expect(restorePet(saved, now)).toEqual({
      fullness: 18,
      energy: 30,
      strength: 42
    });
  });

  it('rejects malformed saves and clamps otherwise valid saved values', () => {
    expect(restorePet('{bad json', 10)).toEqual(INITIAL_STATS);
    expect(
      restorePet(
        JSON.stringify({
          version: 2,
          stats: INITIAL_STATS,
          lastUpdated: 10
        }),
        10
      )
    ).toEqual(INITIAL_STATS);
    expect(
      restorePet(
        JSON.stringify({
          version: 1,
          stats: { fullness: 140, energy: -5, strength: 50 },
          lastUpdated: 10
        }),
        10
      )
    ).toEqual({ fullness: 100, energy: 0, strength: 50 });
  });
});
