<script lang="ts">
  import { onMount } from 'svelte';
  import type { ProjectCardVisualProps } from '$lib/types/projects';
  import eatSprite from './eat-alpha.png';
  import hungrySprite from './hungry-alpha.png';
  import idleSprite from './idle-alpha.png';
  import sleepSprite from './sleep-alpha.png';
  import sleepySprite from './sleepy-alpha.png';
  import weakSprite from './weak-alpha.png';
  import workoutSprite from './workout-alpha.png';
  import {
    applyPetAction,
    decayStats,
    getNeedState,
    INITIAL_STATS,
    PET_STORAGE_KEY,
    restorePet,
    serializePet,
    type PetAction,
    type PetDisplayState,
    type PetStats
  } from './fitnessPet';

  const actionDurationMs = 1_200;
  const decayIntervalMs = 5_000;
  const spriteSheets: Record<PetDisplayState, string> = {
    idle: idleSprite,
    eat: eatSprite,
    sleep: sleepSprite,
    workout: workoutSprite,
    hungry: hungrySprite,
    sleepy: sleepySprite,
    weak: weakSprite
  };
  const statusLabels: Record<PetDisplayState, string> = {
    idle: 'Ready to train',
    eat: 'Eating',
    sleep: 'Sleeping',
    workout: 'Working out',
    hungry: 'Hungry',
    sleepy: 'Sleepy',
    weak: 'Feeling weak'
  };

  let { theme }: ProjectCardVisualProps = $props();
  let stats = $state<PetStats>({ ...INITIAL_STATS });
  let activeAction = $state<PetAction | null>(null);
  let lastUpdated = 0;
  let actionTimer: ReturnType<typeof setTimeout> | undefined;

  const needState = $derived(getNeedState(stats));
  const displayState = $derived<PetDisplayState>(
    activeAction ?? needState ?? 'idle'
  );
  const status = $derived(statusLabels[displayState]);
  const spriteSheet = $derived(spriteSheets[displayState]);

  onMount(() => {
    const now = Date.now();
    stats = restorePet(readStoredPet(), now);
    lastUpdated = now;
    persist(now);

    const decayTimer = window.setInterval(updateDecay, decayIntervalMs);
    return () => {
      window.clearInterval(decayTimer);
      clearTimeout(actionTimer);
      updateDecay();
    };
  });

  function readStoredPet(): string | null {
    try {
      return localStorage.getItem(PET_STORAGE_KEY);
    } catch {
      return null;
    }
  }

  function persist(now = Date.now()) {
    try {
      localStorage.setItem(PET_STORAGE_KEY, serializePet(stats, now));
    } catch {
      // The game remains session-only when browser storage is unavailable.
    }
  }

  function updateDecay() {
    if (!lastUpdated) return;
    const now = Date.now();
    stats = decayStats(stats, now - lastUpdated);
    lastUpdated = now;
    persist(now);
  }

  function handleVisibilityChange() {
    updateDecay();
  }

  function performAction(action: PetAction) {
    if (activeAction) return;

    updateDecay();
    stats = applyPetAction(stats, action);
    activeAction = action;
    persist(lastUpdated);
    actionTimer = setTimeout(() => {
      activeAction = null;
      actionTimer = undefined;
    }, actionDurationMs);
  }

  function rounded(value: number) {
    return Math.round(value);
  }
</script>

<svelte:window onpagehide={updateDecay} />
<svelte:document onvisibilitychange={handleVisibilityChange} />

<div
  class="tamagotchi"
  style:--card-background={theme.background}
  style:--card-accent={theme.accent}
  aria-label="Bodybuilder Tamagotchi"
>
  <div class="screen">
    <div class="screen__header">
      <span>GYM BUDDY</span>
      <span
        class="status"
        role="status"
        aria-label="Bodybuilder status"
        aria-live="polite">{status}</span
      >
    </div>

    <div class="screen__content">
      <div class="stage" aria-hidden="true">
        <div class="floor"></div>
        <div
          class={['sprite', { 'sprite--action': activeAction }]}
          style:--sprite-sheet={`url("${spriteSheet}")`}
        ></div>
      </div>

      <div class="stats" aria-label="Bodybuilder needs">
        <div class="stat">
          <div class="stat__label">
            <span id="fullness-label">Fullness</span>
            <output>{rounded(stats.fullness)}</output>
          </div>
          <progress
            aria-labelledby="fullness-label"
            max="100"
            value={stats.fullness}
          ></progress>
        </div>
        <div class="stat">
          <div class="stat__label">
            <span id="energy-label">Energy</span>
            <output>{rounded(stats.energy)}</output>
          </div>
          <progress
            aria-labelledby="energy-label"
            max="100"
            value={stats.energy}
          ></progress>
        </div>
        <div class="stat">
          <div class="stat__label">
            <span id="strength-label">Strength</span>
            <output>{rounded(stats.strength)}</output>
          </div>
          <progress
            aria-labelledby="strength-label"
            max="100"
            value={stats.strength}
          ></progress>
        </div>
      </div>
    </div>
  </div>

  <div class="actions" aria-label="Care actions">
    <button
      type="button"
      onclick={() => performAction('eat')}
      disabled={activeAction !== null}
    >
      <span aria-hidden="true">🍗</span>
      Eat
    </button>
    <button
      type="button"
      onclick={() => performAction('workout')}
      disabled={activeAction !== null}
    >
      <span aria-hidden="true">🏋</span>
      Exercise
    </button>
    <button
      type="button"
      onclick={() => performAction('sleep')}
      disabled={activeAction !== null}
    >
      <span aria-hidden="true">☾</span>
      Sleep
    </button>
  </div>
</div>

<style>
  .tamagotchi {
    display: grid;
    min-height: 15rem;
    grid-template-rows: minmax(0, 1fr) auto;
    gap: 0.55rem;
    overflow: hidden;
    padding: 0.65rem;
    border: 1px solid color-mix(in srgb, var(--card-accent) 45%, transparent);
    border-radius: 0.65rem;
    background:
      radial-gradient(circle at 12% 4%, rgb(255 255 255 / 42%), transparent 28%),
      repeating-linear-gradient(135deg, rgb(24 50 25 / 10%) 0 1px, transparent 1px 9px),
      var(--card-background);
    color: var(--card-accent);
  }

  .screen {
    min-height: 0;
    overflow: hidden;
    border: 0.18rem solid #2a1b2e;
    border-radius: 0.5rem;
    background: linear-gradient(145deg, #fff1c8, #f4bd70);
    box-shadow:
      inset 0 0 0 0.16rem #8e4d37,
      0 0.22rem 0 #2a1b2e;
  }

  .screen__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.6rem;
    padding: 0.45rem 0.65rem 0.35rem;
    border-bottom: 2px solid #8e4d37;
    background: #6040a8;
    color: #fff8df;
    font-size: 0.58rem;
    font-weight: 850;
    letter-spacing: 0.09em;
  }

  .status {
    overflow: hidden;
    color: #f5b83b;
    text-align: right;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .screen__content {
    display: grid;
    min-height: 0;
    grid-template-columns: minmax(7rem, 1.1fr) minmax(6.5rem, 0.9fr);
    align-items: center;
  }

  .stage {
    position: relative;
    display: grid;
    min-height: 8.3rem;
    place-items: center;
    overflow: hidden;
    background:
      linear-gradient(90deg, transparent 48%, rgb(255 255 255 / 25%) 49% 51%, transparent 52%),
      linear-gradient(#ffc06a 0 67%, #e83d89 67% 70%, #6040a8 70%);
  }

  .floor {
    position: absolute;
    right: 8%;
    bottom: 1rem;
    left: 8%;
    height: 0.35rem;
    border-radius: 50%;
    background: rgb(42 27 46 / 22%);
  }

  .sprite {
    z-index: 1;
    width: 96px;
    height: 128px;
    background-image: var(--sprite-sheet);
    background-position: 0 0;
    background-size: 192px 128px;
    image-rendering: pixelated;
    animation: sprite-loop 700ms steps(1, end) infinite;
  }

  .sprite--action {
    animation-duration: 600ms;
  }

  .stats {
    display: grid;
    gap: 0.65rem;
    padding: 0.75rem 0.7rem 0.75rem 0.25rem;
  }

  .stat__label {
    display: flex;
    justify-content: space-between;
    gap: 0.5rem;
    margin-bottom: 0.18rem;
    color: #2a1b2e;
    font-size: 0.58rem;
    font-weight: 800;
    letter-spacing: 0.035em;
    text-transform: uppercase;
  }

  output {
    color: #6040a8;
    font-variant-numeric: tabular-nums;
  }

  progress {
    display: block;
    width: 100%;
    height: 0.55rem;
    overflow: hidden;
    border: 1px solid #2a1b2e;
    border-radius: 0.15rem;
    background: #fff8df;
    accent-color: #2f6bff;
  }

  progress::-webkit-progress-bar {
    background: #fff8df;
  }

  progress::-webkit-progress-value {
    background: linear-gradient(90deg, #2f6bff, #e83d89);
  }

  progress::-moz-progress-bar {
    background: linear-gradient(90deg, #2f6bff, #e83d89);
  }

  .actions {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.4rem;
  }

  button {
    display: flex;
    min-width: 0;
    min-height: 2.65rem;
    align-items: center;
    justify-content: center;
    gap: 0.3rem;
    padding: 0.4rem 0.25rem;
    border: 2px solid #2a1b2e;
    border-radius: 0.32rem;
    background: linear-gradient(#fff8df, #f5b83b);
    box-shadow: 0 0.16rem 0 #2a1b2e;
    color: #2a1b2e;
    font: inherit;
    font-size: 0.68rem;
    font-weight: 800;
    cursor: pointer;
    touch-action: manipulation;
  }

  button:hover:not(:disabled) {
    background: linear-gradient(#fff8df, #ff9f1c);
  }

  button:active:not(:disabled) {
    transform: translateY(0.12rem);
    box-shadow: none;
  }

  button:focus-visible {
    outline: 3px solid #2f6bff;
    outline-offset: 0.14rem;
  }

  button:disabled {
    cursor: wait;
    opacity: 0.55;
  }

  @keyframes sprite-loop {
    0%,
    49.99% {
      background-position: 0 0;
    }
    50%,
    100% {
      background-position: -96px 0;
    }
  }

  @media (max-width: 390px) {
    .tamagotchi {
      padding: 0.5rem;
    }

    .screen__content {
      grid-template-columns: minmax(6.5rem, 1fr) minmax(6rem, 0.85fr);
    }

    .sprite {
      transform: scale(0.88);
    }

    .stats {
      padding-right: 0.5rem;
    }

    button {
      font-size: 0.62rem;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .sprite {
      animation: none;
    }

    button:active:not(:disabled) {
      transform: none;
    }
  }
</style>
