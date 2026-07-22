export type PetStats = {
  fullness: number;
  energy: number;
  strength: number;
};

export type PetAction = 'eat' | 'sleep' | 'workout';
export type PetNeedState = 'hungry' | 'sleepy' | 'weak';
export type PetDisplayState = 'idle' | PetAction | PetNeedState;

type SavedPet = {
  version: 1;
  stats: PetStats;
  lastUpdated: number;
};

export const PET_STORAGE_KEY = 'fitness-tamagotchi:v1';
export const INITIAL_STATS: PetStats = {
  fullness: 75,
  energy: 75,
  strength: 75
};
export const NEED_THRESHOLD = 30;
export const OFFLINE_DECAY_CAP_MS = 120_000;

const decayPerSecond: PetStats = {
  fullness: 0.6,
  energy: 0.5,
  strength: 0.4
};

const needPriority: Array<{ stat: keyof PetStats; state: PetNeedState }> = [
  { stat: 'fullness', state: 'hungry' },
  { stat: 'energy', state: 'sleepy' },
  { stat: 'strength', state: 'weak' }
];

export function clampStat(value: number): number {
  return Math.min(100, Math.max(0, value));
}

export function decayStats(
  stats: PetStats,
  elapsedMs: number,
  maximumElapsedMs = OFFLINE_DECAY_CAP_MS
): PetStats {
  const elapsedSeconds =
    Math.min(Math.max(0, elapsedMs), maximumElapsedMs) / 1_000;

  return {
    fullness: clampStat(
      stats.fullness - decayPerSecond.fullness * elapsedSeconds
    ),
    energy: clampStat(stats.energy - decayPerSecond.energy * elapsedSeconds),
    strength: clampStat(
      stats.strength - decayPerSecond.strength * elapsedSeconds
    )
  };
}

export function applyPetAction(stats: PetStats, action: PetAction): PetStats {
  const next = { ...stats };

  if (action === 'eat') {
    next.fullness += 45;
    next.energy -= 5;
  } else if (action === 'sleep') {
    next.energy += 50;
    next.fullness -= 12;
    next.strength -= 5;
  } else {
    next.strength += 45;
    next.energy -= 18;
    next.fullness -= 12;
  }

  return {
    fullness: clampStat(next.fullness),
    energy: clampStat(next.energy),
    strength: clampStat(next.strength)
  };
}

export function getNeedState(stats: PetStats): PetNeedState | null {
  let lowest: (typeof needPriority)[number] | null = null;

  for (const candidate of needPriority) {
    if (stats[candidate.stat] > NEED_THRESHOLD) continue;
    if (!lowest || stats[candidate.stat] < stats[lowest.stat]) {
      lowest = candidate;
    }
  }

  return lowest?.state ?? null;
}

export function serializePet(stats: PetStats, lastUpdated: number): string {
  return JSON.stringify({ version: 1, stats, lastUpdated } satisfies SavedPet);
}

export function restorePet(serialized: string | null, now: number): PetStats {
  if (!serialized) return { ...INITIAL_STATS };

  try {
    const saved: unknown = JSON.parse(serialized);
    if (!isSavedPet(saved)) return { ...INITIAL_STATS };

    const stats = {
      fullness: clampStat(saved.stats.fullness),
      energy: clampStat(saved.stats.energy),
      strength: clampStat(saved.stats.strength)
    };
    return decayStats(stats, now - saved.lastUpdated);
  } catch {
    return { ...INITIAL_STATS };
  }
}

function isSavedPet(value: unknown): value is SavedPet {
  if (!value || typeof value !== 'object') return false;

  const candidate = value as Partial<SavedPet>;
  return (
    candidate.version === 1 &&
    typeof candidate.lastUpdated === 'number' &&
    Number.isFinite(candidate.lastUpdated) &&
    isStats(candidate.stats)
  );
}

function isStats(value: unknown): value is PetStats {
  if (!value || typeof value !== 'object') return false;

  const candidate = value as Partial<PetStats>;
  return (
    typeof candidate.fullness === 'number' &&
    Number.isFinite(candidate.fullness) &&
    typeof candidate.energy === 'number' &&
    Number.isFinite(candidate.energy) &&
    typeof candidate.strength === 'number' &&
    Number.isFinite(candidate.strength)
  );
}
