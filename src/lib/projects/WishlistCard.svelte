<script lang="ts">
  import { onMount } from 'svelte';
  import type { ProjectCardVisualProps } from '$lib/types/projects';
  import { sumDirections, type ClawDirection } from './wishlistClaw';
  import { prizeLabels, prizeSrc, type Prize } from './wishlistPrizes';
  import type { ClawScene } from './wishlistScene';

  let { theme }: ProjectCardVisualProps = $props();
  let canvas = $state<HTMLCanvasElement>();
  let scene: ClawScene | undefined;
  let ready = $state(false);
  let failed = $state(false);
  let busy = $state(false);
  let remaining = $state(0);
  let status = $state('');
  let opened = $state<Prize | null>(null);
  let collected = $state<Prize[]>([]);
  let toastTimer: ReturnType<typeof setTimeout> | undefined;

  let soldOut = $derived(ready && remaining === 0);
  // The play surface keeps focus while busy, so it is never `disabled`.
  let locked = $derived(!ready || busy || soldOut);

  function say(message: string) {
    status = message;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      status = '';
      opened = null;
    }, 3200);
  }

  onMount(() => {
    let disposed = false;
    const element = canvas;
    if (!element) return;
    const touch = matchMedia('(hover: none)').matches;

    import('./wishlistScene')
      .then(({ createClawScene }) => {
        if (disposed) return;
        scene = createClawScene(element, {
          onPrize: (prize) => win(prize),
          wall: {
            title: 'Every ball hides a wish',
            lines: touch
              ? ['Tap a ball to grab it']
              : ['Move to aim', 'Click to drop']
          }
        });
        remaining = scene.remaining;
        ready = true;
      })
      .catch(() => {
        failed = true;
      });

    return () => {
      disposed = true;
      clearTimeout(toastTimer);
      scene?.dispose();
    };
  });

  function win(prize: Prize) {
    opened = prize;
    collected = [...collected, prize];
    remaining = scene?.remaining ?? 0;
    say(`It is ${prizeLabels[prize]}!`);
  }

  function aim(event: PointerEvent) {
    if (locked) return;
    scene?.aimAt(event.clientX, event.clientY);
  }

  async function drop(event: MouseEvent) {
    if (!scene || locked) return;
    // Pointer clicks drop where they land; keyboard activation drops in place.
    if (event.detail !== 0) scene.aimAt(event.clientX, event.clientY);
    opened = null;
    busy = true;
    status = 'Dropping…';
    clearTimeout(toastTimer);
    const result = await scene.drop();
    busy = false;
    remaining = scene.remaining;
    if (result.kind === 'slip') say('So close — it slipped!');
    else if (result.kind === 'miss') say('Nothing there. Try again.');
    else if (result.kind === 'busy') status = '';
    if (remaining === 0 && result.kind !== 'prize')
      say('The machine is empty.');
  }

  const keyDirections: Record<string, ClawDirection> = {
    ArrowUp: 'back',
    ArrowLeft: 'left',
    ArrowDown: 'front',
    ArrowRight: 'right'
  };

  function onKey(event: KeyboardEvent) {
    const direction = keyDirections[event.key];
    if (!direction) return;
    event.preventDefault();
    if (!locked) scene?.nudge(sumDirections([direction]));
  }

  function reset() {
    if (!scene || busy) return;
    scene.reset();
    remaining = scene.remaining;
    collected = [];
    opened = null;
    status = '';
    clearTimeout(toastTimer);
  }
</script>

<div
  class="wishlist-game"
  style:--card-background={theme.background}
  style:--ink={theme.foreground}
  style:--card-accent={theme.accent}
>
  <canvas bind:this={canvas} class:hidden={failed} aria-hidden="true"></canvas>

  <button
    type="button"
    class="play"
    aria-label={soldOut ? 'Claw machine, empty' : 'Drop the claw'}
    aria-describedby="wishlist-help"
    aria-disabled={locked}
    onpointermove={aim}
    onpointerdown={aim}
    onclick={drop}
    onkeydown={onKey}
  ></button>
  <span id="wishlist-help" class="sr-only">
    Claw machine with {remaining} prize balls. Point to aim or use the arrow keys,
    then click or press Enter to drop the claw.
  </span>

  <button
    type="button"
    class="restart"
    class:wide={soldOut}
    aria-label="Refill the machine"
    disabled={!ready || busy}
    onclick={reset}
  >
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M20 12a8 8 0 1 1-2.34-5.66M20 4v5h-5"
        fill="none"
        stroke="currentColor"
        stroke-width="2.6"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
    {#if soldOut}<span aria-hidden="true">Play again</span>{/if}
  </button>

  <p class="toast" class:shown={status || !ready} role="status">
    {#if opened}
      <img class="reveal" src={prizeSrc(opened)} alt="" />
    {/if}
    {#if failed}
      The 3D machine is not supported on this device.
    {:else if !ready}
      Loading the machine…
    {:else}
      {status}
    {/if}
  </p>

  {#if collected.length}
    <ul class="shelf" aria-label="Collected prizes">
      {#each collected as prize, index (index)}
        <li title={prizeLabels[prize]}>
          <img src={prizeSrc(prize)} alt={prizeLabels[prize]} />
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  /* The field bleeds over ProjectCard's 0.65rem visual padding so the whole
     card area is the play field; the card's own rounded corners clip it. */
  .wishlist-game {
    --paper: #fff4e6;
    --bleed: 0.65rem;
    position: relative;
    height: calc(100% + 2 * var(--bleed));
    min-height: 15rem;
    box-sizing: border-box;
    margin: calc(-1 * var(--bleed));
    overflow: hidden;
    border-bottom: 1px solid var(--ink);
    background: #f6b787;
    color: var(--ink);
  }

  canvas {
    position: absolute;
    inset: 0;
    display: block;
    width: 100%;
    height: 100%;
  }

  canvas.hidden {
    visibility: hidden;
  }

  /* Transparent hit area over the canvas: the pointer aims, a click drops. */
  .play {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    margin: 0;
    padding: 0;
    border: 0;
    background: transparent;
    cursor: crosshair;
    /* Vertical swipes still scroll the page on touch screens. */
    touch-action: pan-y;
    -webkit-tap-highlight-color: transparent;
  }

  .play[aria-disabled='true'] {
    cursor: progress;
  }

  .play:focus-visible {
    outline: 3px solid var(--card-accent);
    outline-offset: -3px;
  }

  .restart {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    display: inline-flex;
    height: 2.4rem;
    min-width: 2.4rem;
    box-sizing: border-box;
    align-items: center;
    justify-content: center;
    gap: 0.35rem;
    padding: 0 0.55rem;
    border: 2px solid var(--ink);
    border-radius: 999px;
    background: var(--paper);
    box-shadow: 0 0.18rem 0 var(--ink);
    color: var(--ink);
    cursor: pointer;
    font: inherit;
    font-size: 0.75rem;
    font-weight: 850;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    transition:
      transform 80ms ease,
      box-shadow 80ms ease,
      background-color 120ms ease;
  }

  .restart svg {
    width: 1.05rem;
    height: 1.05rem;
  }

  .restart.wide {
    background: #ff6b4a;
  }

  .restart:hover:not(:disabled) {
    background: #fff;
  }

  .restart:active:not(:disabled) {
    box-shadow: 0 0 0 var(--ink);
    transform: translateY(0.18rem);
  }

  .restart:focus-visible {
    outline: 3px solid var(--card-accent);
    outline-offset: 2px;
  }

  .restart:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }

  .toast {
    position: absolute;
    bottom: 0.6rem;
    left: 50%;
    display: flex;
    max-width: calc(100% - 1.2rem);
    box-sizing: border-box;
    align-items: center;
    gap: 0.35rem;
    margin: 0;
    padding: 0.35rem 0.75rem;
    border: 2px solid var(--ink);
    border-radius: 999px;
    background: var(--paper);
    font-size: 0.78rem;
    font-weight: 800;
    line-height: 1.25;
    opacity: 0;
    pointer-events: none;
    transform: translate(-50%, 0.4rem);
    transition:
      opacity 180ms ease,
      transform 180ms ease;
    white-space: nowrap;
  }

  .toast.shown {
    opacity: 1;
    transform: translate(-50%, 0);
  }

  .reveal {
    width: 1.5rem;
    height: 1.5rem;
    flex-shrink: 0;
    animation: pop 0.8s cubic-bezier(0.3, 1.5, 0.5, 1) both;
  }

  .shelf {
    position: absolute;
    top: 0.6rem;
    left: 0.6rem;
    display: flex;
    max-width: calc(100% - 4rem);
    flex-wrap: wrap;
    gap: 0.2rem;
    margin: 0;
    padding: 0.2rem 0.35rem;
    border: 2px solid var(--ink);
    border-radius: 999px;
    background: var(--paper);
    list-style: none;
    pointer-events: none;
  }

  .shelf li {
    width: 1.3rem;
    height: 1.3rem;
  }

  .shelf img {
    display: block;
    width: 100%;
    height: 100%;
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
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

    .restart,
    .toast {
      transition: none;
    }
  }
</style>
