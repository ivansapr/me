<script lang="ts">
  import { onMount } from 'svelte';
  import { SvelteSet } from 'svelte/reactivity';
  import type { ProjectCardVisualProps } from '$lib/types/projects';
  import { sumDirections, type ClawDirection } from './wishlistClaw';
  import { prizeLabels, prizeSrc, type Prize } from './wishlistPrizes';
  import type { ClawScene } from './wishlistScene';

  const idleStatus = 'Hold the arrows to aim, then drop.';

  let { theme }: ProjectCardVisualProps = $props();
  let canvas = $state<HTMLCanvasElement>();
  let scene: ClawScene | undefined;
  let ready = $state(false);
  let failed = $state(false);
  let busy = $state(false);
  let remaining = $state(0);
  let status = $state('Loading the machine…');
  let opened = $state<Prize | null>(null);
  let collected = $state<Prize[]>([]);

  const pressed = new SvelteSet<ClawDirection>();
  let soldOut = $derived(ready && remaining === 0);
  let locked = $derived(busy || !ready);

  onMount(() => {
    let disposed = false;
    const element = canvas;
    if (!element) return;

    import('./wishlistScene')
      .then(({ createClawScene }) => {
        if (disposed) return;
        scene = createClawScene(element, {
          onPrize: (prize) => win(prize)
        });
        remaining = scene.remaining;
        ready = true;
        status = idleStatus;
      })
      .catch(() => {
        failed = true;
        status = 'The 3D machine is not supported on this device.';
      });

    return () => {
      disposed = true;
      scene?.dispose();
    };
  });

  function win(prize: Prize) {
    opened = prize;
    collected = [...collected, prize];
    remaining = scene?.remaining ?? 0;
    status = `The ball opens. It is ${prizeLabels[prize]}!`;
  }

  function applyDirection() {
    scene?.setDirection(sumDirections([...pressed]));
  }

  function press(direction: ClawDirection, event: PointerEvent) {
    if (locked || event.button !== 0) return;
    opened = null;
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    pressed.add(direction);
    applyDirection();
  }

  function release(direction: ClawDirection) {
    if (!pressed.delete(direction)) return;
    applyDirection();
  }

  function step(direction: ClawDirection) {
    if (locked) return;
    opened = null;
    scene?.nudge(sumDirections([direction]));
  }

  // Keyboard and assistive-technology activation arrives as a click without pointer detail.
  function nudge(direction: ClawDirection, event: MouseEvent) {
    if (event.detail === 0) step(direction);
  }

  const keyDirections: Record<string, ClawDirection> = {
    ArrowUp: 'back',
    ArrowLeft: 'left',
    ArrowDown: 'front',
    ArrowRight: 'right'
  };

  // Arrow keys steer while any pad button has focus.
  function onPadKey(event: KeyboardEvent) {
    const direction = keyDirections[event.key];
    if (!direction) return;
    event.preventDefault();
    step(direction);
  }

  async function drop() {
    if (!scene || busy) return;
    pressed.clear();
    applyDirection();
    opened = null;
    busy = true;
    status = 'Dropping…';
    const result = await scene.drop();
    busy = false;
    if (result.kind === 'slip') status = 'So close — it slipped! Try again.';
    else if (result.kind === 'miss')
      status = 'Nothing there. Try another spot.';
    remaining = scene.remaining;
    if (remaining === 0 && result.kind !== 'prize')
      status = 'The machine is empty.';
  }

  function reset() {
    if (!scene || busy) return;
    scene.reset();
    remaining = scene.remaining;
    collected = [];
    opened = null;
    status = idleStatus;
  }

  const controls: { direction: ClawDirection; label: string; arrow: string }[] =
    [
      { direction: 'back', label: 'Move claw back', arrow: '▲' },
      { direction: 'left', label: 'Move claw left', arrow: '◀' },
      { direction: 'front', label: 'Move claw forward', arrow: '▼' },
      { direction: 'right', label: 'Move claw right', arrow: '▶' }
    ];
</script>

<div
  class="wishlist-game"
  style:--card-background={theme.background}
  style:--ink={theme.foreground}
  style:--card-accent={theme.accent}
>
  <div
    class="field"
    class:failed
    role="img"
    aria-label="3D claw machine filled with prize balls"
  >
    <canvas bind:this={canvas} aria-hidden="true"></canvas>
    {#if ready}
      <span class="counter" aria-hidden="true">{remaining} left</span>
    {/if}
  </div>

  <div class="console">
    <p class="status" role="status" aria-live="polite">
      {#if opened}
        <img class="reveal" src={prizeSrc(opened)} alt="" />
      {/if}
      <span>{status}</span>
    </p>

    <div class="pad" role="group" aria-label="Move claw">
      {#each controls as { direction, label, arrow } (direction)}
        <button
          type="button"
          class="pad-{direction}"
          class:held={pressed.has(direction)}
          aria-label={label}
          disabled={locked}
          onpointerdown={(event) => press(direction, event)}
          onpointerup={() => release(direction)}
          onpointercancel={() => release(direction)}
          onlostpointercapture={() => release(direction)}
          onclick={(event) => nudge(direction, event)}
          onkeydown={onPadKey}><span aria-hidden="true">{arrow}</span></button
        >
      {/each}
    </div>

    {#if soldOut}
      <button type="button" class="drop" disabled={busy} onclick={reset}
        >Play again</button
      >
    {:else}
      <button type="button" class="drop" disabled={locked} onclick={drop}
        >{busy ? 'Grabbing…' : 'Drop'}</button
      >
    {/if}

    <ul class="shelf" aria-label="Collected prizes">
      {#each collected as prize, index (index)}
        <li title={prizeLabels[prize]}>
          <img src={prizeSrc(prize)} alt={prizeLabels[prize]} />
        </li>
      {:else}
        <li class="empty">Prizes land here</li>
      {/each}
    </ul>
  </div>
</div>

<style>
  .wishlist-game {
    --paper: #fff4e6;
    --press: 0.2rem;
    display: grid;
    height: 100%;
    min-height: 15rem;
    box-sizing: border-box;
    grid-template-columns: minmax(0, 1.15fr) minmax(8.5rem, 0.85fr);
    gap: 0.7rem;
    padding: 0.7rem;
    overflow: hidden;
    border: 1px solid color-mix(in srgb, var(--card-accent) 40%, transparent);
    border-radius: 0.65rem;
    background:
      radial-gradient(circle at 0 0, rgb(255 255 255 / 60%), transparent 40%),
      var(--card-background);
    color: var(--ink);
    container-type: inline-size;
  }

  .field {
    position: relative;
    width: 100%;
    max-height: 100%;
    aspect-ratio: 1;
    align-self: center;
    justify-self: center;
    overflow: hidden;
    border-radius: 0.55rem;
    background: linear-gradient(160deg, #fff0dc, #ffc89a);
    box-shadow:
      inset 0 0 0 2px var(--ink),
      0 0.25rem 0 var(--ink);
  }

  .field.failed canvas {
    visibility: hidden;
  }

  canvas {
    display: block;
    width: 100%;
    height: 100%;
  }

  .counter {
    position: absolute;
    top: 0.45rem;
    left: 0.45rem;
    padding: 0.15rem 0.45rem;
    border: 2px solid var(--ink);
    border-radius: 999px;
    background: var(--paper);
    font-size: 0.68rem;
    font-variant-numeric: tabular-nums;
    font-weight: 800;
    line-height: 1.2;
  }

  .console {
    display: flex;
    min-width: 0;
    flex-direction: column;
    justify-content: space-between;
    gap: 0.55rem;
  }

  .status {
    display: flex;
    min-height: 3.2em;
    align-items: center;
    gap: 0.35rem;
    margin: 0;
    padding: 0.4rem 0.5rem;
    border: 2px solid var(--ink);
    border-radius: 0.45rem;
    background: var(--paper);
    font-size: 0.74rem;
    font-weight: 750;
    line-height: 1.3;
    text-wrap: pretty;
  }

  .reveal {
    width: 1.6rem;
    height: 1.6rem;
    flex-shrink: 0;
    animation: pop 0.8s cubic-bezier(0.3, 1.5, 0.5, 1) both;
  }

  .pad {
    display: grid;
    grid-template-columns: repeat(3, 2.5rem);
    grid-template-rows: repeat(2, 2.5rem);
    gap: 0.3rem;
    justify-content: center;
  }

  .pad-back {
    grid-column: 2;
  }

  .pad-left {
    grid-row: 2;
    grid-column: 1;
  }

  .pad-front {
    grid-row: 2;
    grid-column: 2;
  }

  .pad-right {
    grid-row: 2;
    grid-column: 3;
  }

  button {
    display: grid;
    min-width: 2.5rem;
    min-height: 2.5rem;
    margin: 0;
    place-items: center;
    border: 2px solid var(--ink);
    border-radius: 0.5rem;
    background: var(--paper);
    box-shadow: 0 var(--press) 0 var(--ink);
    color: var(--ink);
    cursor: pointer;
    font: inherit;
    font-size: 0.85rem;
    font-weight: 900;
    touch-action: manipulation;
    transition:
      transform 80ms ease,
      box-shadow 80ms ease,
      background-color 120ms ease;
    -webkit-tap-highlight-color: transparent;
  }

  button:hover:not(:disabled) {
    background: #fff;
  }

  button:active:not(:disabled),
  button.held {
    box-shadow: 0 0 0 var(--ink);
    transform: translateY(var(--press));
  }

  button:focus-visible {
    outline: 3px solid var(--card-accent);
    outline-offset: 2px;
  }

  button:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }

  .pad button {
    touch-action: none;
    user-select: none;
  }

  button.drop {
    width: 100%;
    min-height: 2.6rem;
    background: #ff6b4a;
    font-size: 0.8rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  button.drop:hover:not(:disabled) {
    background: #ff8466;
  }

  .shelf {
    display: flex;
    min-height: 1.75rem;
    box-sizing: border-box;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.2rem;
    margin: 0;
    padding: 0.2rem 0.3rem;
    border: 2px dashed color-mix(in srgb, var(--ink) 45%, transparent);
    border-radius: 0.45rem;
    list-style: none;
  }

  .shelf li {
    width: 1.25rem;
    height: 1.25rem;
  }

  .shelf li.empty {
    width: auto;
    height: auto;
    opacity: 0.7;
    font-size: 0.66rem;
    font-weight: 700;
  }

  .shelf img {
    display: block;
    width: 100%;
    height: 100%;
  }

  /* Narrow cards: shrink the pad so the machine keeps most of the width. */
  @container (max-width: 22rem) {
    .wishlist-game {
      grid-template-columns: minmax(0, 1fr) minmax(7.25rem, auto);
      gap: 0.5rem;
      padding: 0.5rem;
    }

    .pad {
      grid-template-columns: repeat(3, 2.2rem);
      grid-template-rows: repeat(2, 2.2rem);
      gap: 0.2rem;
    }

    button {
      min-width: 2.2rem;
      min-height: 2.2rem;
    }

    .status {
      font-size: 0.68rem;
    }
  }

  @keyframes pop {
    from {
      opacity: 0;
      transform: translateY(0.5rem) scale(0.2);
    }

    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .reveal {
      animation: none;
    }

    button {
      transition: none;
    }
  }
</style>
