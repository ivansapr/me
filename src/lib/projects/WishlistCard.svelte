<script lang="ts">
  import { onMount } from 'svelte';
  import { SvelteSet } from 'svelte/reactivity';
  import type { ProjectCardVisualProps } from '$lib/types/projects';
  import { sumDirections, type ClawDirection } from './wishlistClaw';
  import { prizeLabels, prizeSrc, type Prize } from './wishlistPrizes';
  import type { ClawScene } from './wishlistScene';

  const idleStatus = 'Move the claw, then press drop.';

  let { theme }: ProjectCardVisualProps = $props();
  let canvas = $state<HTMLCanvasElement>();
  let scene: ClawScene | undefined;
  let ready = $state(false);
  let busy = $state(false);
  let remaining = $state(1);
  let status = $state('Loading the machine…');
  let opened = $state<Prize | null>(null);
  let collected = $state<Prize[]>([]);
  let magnet = $state(false);
  let magnetPercent = $state(5);

  $effect(() => {
    scene?.setMagnet(magnet, magnetPercent);
  });

  const pressed = new SvelteSet<ClawDirection>();
  let soldOut = $derived(ready && remaining === 0);

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
        status = '3D view is not supported on this device.';
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
    if (busy || !ready) return;
    opened = null;
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    pressed.add(direction);
    applyDirection();
  }

  function release(direction: ClawDirection) {
    pressed.delete(direction);
    applyDirection();
  }

  // Keyboard and assistive-technology activation arrives as a click without pointer detail.
  function nudge(direction: ClawDirection, event: MouseEvent) {
    if (event.detail !== 0 || busy || !ready) return;
    opened = null;
    scene?.nudge(sumDirections([direction]));
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
    if (result.kind === 'slip') status = 'It slipped! Try again.';
    else if (result.kind === 'miss')
      status = 'Nothing there. Try another spot.';
    remaining = scene.remaining;
    if (remaining === 0 && result.kind !== 'prize') status = 'Machine empty.';
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
      { direction: 'back', label: 'Move claw back', arrow: '↑' },
      { direction: 'left', label: 'Move claw left', arrow: '←' },
      { direction: 'front', label: 'Move claw forward', arrow: '↓' },
      { direction: 'right', label: 'Move claw right', arrow: '→' }
    ];
</script>

<div
  class="wishlist-game"
  style:--card-background={theme.background}
  style:--card-foreground={theme.foreground}
  style:--card-accent={theme.accent}
>
  <div class="field">
    <canvas bind:this={canvas} aria-label="3D claw machine"></canvas>
  </div>

  <div class="console">
    <p class="status" role="status" aria-live="polite">
      {#if opened}
        <img class="reveal" src={prizeSrc(opened)} alt="" />
      {/if}
      {status}
    </p>

    <div class="pad" role="group" aria-label="Move claw">
      {#each controls as { direction, label, arrow } (direction)}
        <button
          type="button"
          class="pad-{direction}"
          aria-label={label}
          disabled={busy || !ready}
          onpointerdown={(event) => press(direction, event)}
          onpointerup={() => release(direction)}
          onpointercancel={() => release(direction)}
          onclick={(event) => nudge(direction, event)}>{arrow}</button
        >
      {/each}
    </div>

    {#if soldOut}
      <button type="button" class="drop" onclick={reset}>Play again</button>
    {:else}
      <button
        type="button"
        class="drop"
        disabled={busy || !ready}
        onclick={drop}>Drop</button
      >
    {/if}

    <div class="debug">
      <button
        type="button"
        class="magnet"
        aria-pressed={magnet}
        onclick={() => (magnet = !magnet)}
        >Magnet {magnet ? 'on' : 'off'}</button
      >
      {#if magnet}
        <label>
          <span class="sr-only">Magnet strength percent</span>
          <input
            type="range"
            min="1"
            max="10"
            step="1"
            bind:value={magnetPercent}
          />
          <output>{magnetPercent}%</output>
        </label>
      {/if}
    </div>

    <ul class="shelf" aria-label="Collected prizes">
      {#each collected as prize, index (index)}
        <li title={prizeLabels[prize]}>
          <img src={prizeSrc(prize)} alt={prizeLabels[prize]} />
        </li>
      {/each}
    </ul>
  </div>
</div>

<style>
  .wishlist-game {
    --ink: #3b1d0f;
    --glass: rgb(255 255 255 / 28%);
    display: grid;
    min-height: 15rem;
    grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
    gap: 0.6rem;
    padding: 0.55rem;
    overflow: hidden;
    border: 1px solid color-mix(in srgb, var(--card-accent) 40%, transparent);
    border-radius: 0.65rem;
    background:
      radial-gradient(circle at 0 0, rgb(255 255 255 / 60%), transparent 35%),
      var(--card-background);
    color: var(--ink);
  }

  .field {
    position: relative;
    width: 100%;
    aspect-ratio: 1;
    align-self: center;
    container-type: inline-size;
    overflow: hidden;
    border-radius: 0.5rem;
    background: linear-gradient(160deg, #fff0dc, #ffc89a);
    box-shadow: inset 0 0 0 2px var(--ink);
  }

  .console {
    display: flex;
    min-width: 0;
    flex-direction: column;
    justify-content: space-between;
    gap: 0.4rem;
  }

  .status {
    min-height: 2.1em;
    margin: 0;
    padding: 0.3rem 0.4rem;
    border: 2px solid var(--ink);
    border-radius: 0.35rem;
    background: #fff0dc;
    font-size: 0.6rem;
    font-weight: 800;
    line-height: 1.25;
  }

  canvas {
    display: block;
    width: 100%;
    height: 100%;
  }

  .reveal {
    display: inline-block;
    width: 1.3rem;
    height: 1.3rem;
    margin-right: 0.25rem;
    vertical-align: middle;
    animation: pop 0.8s cubic-bezier(0.3, 1.5, 0.5, 1) both;
  }

  .pad {
    display: grid;
    grid-template-columns: repeat(3, 2.1rem);
    grid-template-rows: repeat(2, 2.1rem);
    gap: 0.25rem;
    justify-content: center;
  }

  .pad .pad-back {
    grid-column: 2;
  }

  .pad .pad-left {
    grid-row: 2;
    grid-column: 1;
  }

  .pad .pad-front {
    grid-row: 2;
    grid-column: 2;
  }

  .pad .pad-right {
    grid-row: 2;
    grid-column: 3;
  }

  button {
    display: grid;
    min-width: 2.1rem;
    min-height: 2.1rem;
    place-items: center;
    border: 2px solid var(--ink);
    border-radius: 0.4rem;
    background: #fff0dc;
    box-shadow: 0 0.18rem var(--ink);
    color: var(--ink);
    cursor: pointer;
    font: inherit;
    font-size: 0.9rem;
    font-weight: 900;
    touch-action: manipulation;
  }

  button:active:not(:disabled) {
    box-shadow: 0 0 var(--ink);
    transform: translateY(0.18rem);
  }

  button:focus-visible {
    outline: 3px solid #4f46e5;
    outline-offset: 2px;
  }

  button:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  .pad button {
    position: static;
    width: auto;
    height: auto;
    margin: 0;
    touch-action: none;
    transform: none;
  }

  button.drop {
    background: #ff6b4a;
    font-size: 0.7rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .debug {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.55rem;
    font-weight: 800;
  }

  .debug label {
    display: flex;
    min-width: 0;
    flex: 1;
    align-items: center;
    gap: 0.2rem;
  }

  .debug input {
    min-width: 0;
    flex: 1;
    accent-color: #4f46e5;
  }

  button.magnet {
    min-height: 1.5rem;
    padding: 0 0.4rem;
    font-size: 0.55rem;
  }

  button.magnet[aria-pressed='true'] {
    background: #c7c3ff;
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
  }

  .shelf {
    display: flex;
    min-height: 1.1rem;
    flex-wrap: wrap;
    gap: 0.15rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .shelf img {
    display: block;
    width: 100%;
    height: 100%;
  }

  .shelf li {
    width: 1.05rem;
    height: 1.05rem;
  }

  @keyframes pop {
    from {
      opacity: 0;
      transform: translateY(8cqw) scale(0.2);
    }

    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }
</style>
