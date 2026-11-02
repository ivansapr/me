<script lang="ts">
  import { onDestroy } from 'svelte';
  import type { ProjectCardVisualProps } from '$lib/types/projects';
  import {
    chute,
    gridSize,
    isChute,
    moveClaw,
    type ClawDirection,
    type ClawPosition
  } from './wishlistClaw';

  type Prize = 'gift' | 'heart' | 'star' | 'book' | 'camera' | 'headphones';
  type Ball = { id: number; col: number; row: number; prize: Prize };
  type Phase =
    'idle' | 'dropping' | 'grabbing' | 'rising' | 'carrying' | 'opening';

  const prizes: Prize[] = [
    'gift',
    'heart',
    'star',
    'book',
    'camera',
    'headphones'
  ];
  const prizeLabels: Record<Prize, string> = {
    gift: 'a gift',
    heart: 'a heart',
    star: 'a star',
    book: 'a book',
    camera: 'a camera',
    headphones: 'headphones'
  };
  const ballColors = ['#ff6b4a', '#ffc247', '#4fb6a8', '#7b6cf6'];
  const cell = 16;
  const restRod = 6;
  const hitRod = 40;
  const missRod = 47;

  let { theme }: ProjectCardVisualProps = $props();
  let claw = $state<ClawPosition>({ col: 1, row: 1 });
  let balls = $state<Ball[]>(createBalls());
  let phase = $state<Phase>('idle');
  let rod = $state(restRod);
  let clawOpen = $state(true);
  let carried = $state<Ball | null>(null);
  let opened = $state<Ball | null>(null);
  let collected = $state<Prize[]>([]);
  let status = $state('Line up the claw over a ball.');
  let destroyed = false;

  let busy = $derived(phase !== 'idle');
  let soldOut = $derived(balls.length === 0 && !carried && !opened);

  function createBalls(): Ball[] {
    const list: Ball[] = [];
    for (let row = 0; row < gridSize; row += 1) {
      for (let col = 0; col < gridSize; col += 1) {
        if (isChute({ col, row })) continue;
        const id = list.length;
        list.push({ id, col, row, prize: prizes[id % prizes.length] });
      }
    }
    return list;
  }

  const sleep = (ms: number) =>
    new Promise<void>((resolve) => setTimeout(resolve, ms));

  onDestroy(() => {
    destroyed = true;
  });

  function move(direction: ClawDirection) {
    if (busy) return;
    opened = null;
    claw = moveClaw(claw, direction);
    status = isChute(claw) ? 'That is the prize chute.' : 'Press drop to grab.';
  }

  async function drop() {
    if (busy || soldOut) return;
    opened = null;
    const target = balls.find(
      (ball) => ball.col === claw.col && ball.row === claw.row
    );

    phase = 'dropping';
    status = 'Dropping…';
    rod = target ? hitRod : missRod;
    await sleep(750);
    if (destroyed) return;

    phase = 'grabbing';
    clawOpen = false;
    await sleep(350);
    if (destroyed) return;

    if (target) {
      balls = balls.filter((ball) => ball.id !== target.id);
      carried = target;
    }
    phase = 'rising';
    rod = restRod;
    await sleep(700);
    if (destroyed) return;

    if (!target) {
      clawOpen = true;
      phase = 'idle';
      status = 'Nothing there. Try another spot.';
      return;
    }

    phase = 'carrying';
    status = 'Got one!';
    claw = { ...chute };
    await sleep(900);
    if (destroyed) return;

    clawOpen = true;
    opened = target;
    carried = null;
    phase = 'opening';
    status = `The ball opens. It is ${prizeLabels[target.prize]}!`;
    collected = [...collected, target.prize];
    await sleep(1400);
    if (destroyed) return;

    phase = 'idle';
    if (balls.length === 0) status = 'Machine empty. Play again!';
  }

  function reset() {
    if (phase === 'carrying' || phase === 'opening') return;
    balls = createBalls();
    collected = [];
    opened = null;
    claw = { col: 1, row: 1 };
    status = 'Line up the claw over a ball.';
  }

  const pos = (index: number) => (index - 1) * cell;
</script>

{#snippet icon(kind: Prize)}
  <svg viewBox="0 0 24 24" aria-hidden="true" class="icon">
    {#if kind === 'gift'}
      <rect x="4" y="10" width="16" height="10" rx="1.5" fill="#ff6b4a" />
      <rect x="3" y="7" width="18" height="4" rx="1" fill="#ffc247" />
      <rect x="11" y="7" width="2" height="13" fill="#fff4e0" />
      <path
        d="M12 7C9 7 8 3.5 10.5 3.5S12 6 12 7zM12 7c3 0 4-3.5 1.5-3.5S12 6 12 7z"
        fill="#fff4e0"
      />
    {:else if kind === 'heart'}
      <path
        d="M12 21C4 15 3 11 3 8.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 9 1.5C21 11 20 15 12 21z"
        fill="#ff4f6d"
      />
    {:else if kind === 'star'}
      <path
        d="m12 2.5 2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.3l-5.9 3.2 1.2-6.5-4.8-4.6 6.6-.9z"
        fill="#ffc247"
      />
    {:else if kind === 'book'}
      <rect x="5" y="3" width="14" height="18" rx="1.5" fill="#4fb6a8" />
      <rect x="5" y="3" width="3" height="18" fill="#2f8579" />
      <rect x="10" y="7" width="6" height="2" fill="#fff4e0" />
      <rect x="10" y="11" width="4" height="2" fill="#fff4e0" />
    {:else if kind === 'camera'}
      <rect x="2.5" y="7" width="19" height="13" rx="2.5" fill="#7b6cf6" />
      <rect x="8" y="4" width="8" height="4" rx="1" fill="#7b6cf6" />
      <circle cx="12" cy="13.5" r="4" fill="#fff4e0" />
      <circle cx="12" cy="13.5" r="2" fill="#3b1d0f" />
    {:else}
      <path
        d="M4 15v-3a8 8 0 0 1 16 0v3"
        fill="none"
        stroke="#3b1d0f"
        stroke-width="2"
        stroke-linecap="round"
      />
      <rect x="2.5" y="14" width="5" height="7" rx="2" fill="#ff6b4a" />
      <rect x="16.5" y="14" width="5" height="7" rx="2" fill="#ff6b4a" />
    {/if}
  </svg>
{/snippet}

{#snippet sphere(ball: Ball, split: boolean)}
  <span class="ball" style:--ball={ballColors[ball.id % ballColors.length]}>
    <span class="half top" class:is-split={split}></span>
    <span class="half bottom"></span>
    {#if split}
      <span class="prize">{@render icon(ball.prize)}</span>
    {/if}
  </span>
{/snippet}

<div
  class="wishlist-game"
  style:--card-background={theme.background}
  style:--card-foreground={theme.foreground}
  style:--card-accent={theme.accent}
>
  <div class="field">
    <div class="cabinet" aria-hidden="true">
      <span class="face back"></span>
      <span class="face left"></span>
      <span class="face floor"></span>
      <span class="face right"></span>
      <span class="face front"></span>
      <span
        class="chute"
        style:transform="translate3d({pos(chute.col)}cqw, 30cqw, {pos(
          chute.row
        )}cqw) rotateX(90deg)"
      ></span>

      {#each balls as ball (ball.id)}
        <span
          class="billboard"
          style:transform="translate3d({pos(ball.col)}cqw, 23cqw, {pos(
            ball.row
          )}cqw) rotateY(28deg) rotateX(18deg)"
        >
          {@render sphere(ball, false)}
        </span>
      {/each}

      {#if opened}
        <span
          class="billboard"
          style:transform="translate3d({pos(chute.col)}cqw, 23cqw, {pos(
            chute.row
          )}cqw) rotateY(28deg) rotateX(18deg)"
        >
          {@render sphere(opened, true)}
        </span>
      {/if}

      <span
        class="billboard claw"
        style:--rod="{rod}cqw"
        style:transform="translate3d({pos(claw.col)}cqw, -30cqw, {pos(
          claw.row
        )}cqw) rotateY(28deg) rotateX(18deg)"
      >
        <span class="rod"></span>
        <span class="head" class:is-closed={!clawOpen}>
          <span class="prong left"></span>
          <span class="prong right"></span>
        </span>
        {#if carried}
          <span class="carried">{@render sphere(carried, false)}</span>
        {/if}
      </span>
    </div>
  </div>

  <div class="console">
    <p class="status" role="status" aria-live="polite">
      {#if opened}<span class="reveal">{@render icon(opened.prize)}</span>{/if}
      {status}
    </p>

    <div class="pad" role="group" aria-label="Move claw">
      <button
        type="button"
        class="pad-back"
        aria-label="Move claw back"
        disabled={busy}
        onclick={() => move('back')}>↑</button
      >
      <button
        type="button"
        class="pad-left"
        aria-label="Move claw left"
        disabled={busy}
        onclick={() => move('left')}>←</button
      >
      <button
        type="button"
        class="pad-right"
        aria-label="Move claw right"
        disabled={busy}
        onclick={() => move('right')}>→</button
      >
      <button
        type="button"
        class="pad-front"
        aria-label="Move claw forward"
        disabled={busy}
        onclick={() => move('front')}>↓</button
      >
    </div>

    {#if soldOut}
      <button type="button" class="drop" onclick={reset}>Play again</button>
    {:else}
      <button type="button" class="drop" disabled={busy} onclick={drop}
        >Drop</button
      >
    {/if}

    <ul class="shelf" aria-label="Collected prizes">
      {#each collected as prize, index (index)}
        <li title={prizeLabels[prize]}>{@render icon(prize)}</li>
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
    border-radius: 0.5rem;
    background: linear-gradient(160deg, #fff0dc, #ffc89a);
    box-shadow: inset 0 0 0 2px var(--ink);
  }

  .cabinet {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0;
    height: 0;
    transform: rotateX(-18deg) rotateY(-28deg);
    transform-style: preserve-3d;
  }

  .face,
  .chute,
  .billboard {
    position: absolute;
    top: 0;
    left: 0;
    transform-style: preserve-3d;
  }

  .face {
    width: 60cqw;
    height: 60cqw;
    margin: -30cqw 0 0 -30cqw;
    border: 0.5cqw solid var(--ink);
    box-sizing: border-box;
  }

  .back {
    transform: translateZ(-30cqw);
    background: #ffe3c4;
  }

  .left {
    transform: rotateY(90deg) translateZ(-30cqw);
    background: #f7c99c;
  }

  .floor {
    transform: rotateX(90deg) translateZ(-30cqw);
    background: #e59a62;
  }

  .right {
    transform: rotateY(90deg) translateZ(30cqw);
    background: var(--glass);
  }

  .front {
    transform: translateZ(30cqw);
    background: var(--glass);
  }

  .chute {
    width: 16cqw;
    height: 16cqw;
    margin: -8cqw 0 0 -8cqw;
    border: 0.5cqw dashed var(--ink);
    background: #8a3a1c;
  }

  .billboard {
    width: 0;
    height: 0;
    transition: transform 0.45s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .ball {
    position: absolute;
    top: -7cqw;
    left: -7cqw;
    width: 14cqw;
    height: 14cqw;
    display: block;
  }

  .half {
    position: absolute;
    inset: 0;
    border: 0.5cqw solid var(--ink);
    border-radius: 50%;
    box-sizing: border-box;
    background: radial-gradient(
      circle at 32% 28%,
      #fff8 0 12%,
      var(--ball) 40%,
      color-mix(in srgb, var(--ball) 60%, #000) 100%
    );
    transition:
      transform 0.6s cubic-bezier(0.3, 1.4, 0.5, 1),
      opacity 0.6s;
  }

  .half.top {
    clip-path: inset(0 0 50% 0);
  }

  .half.bottom {
    clip-path: inset(50% 0 0 0);
  }

  .half.top.is-split {
    transform: translate(-3cqw, -7cqw) rotate(-35deg);
    opacity: 0.85;
  }

  .prize {
    position: absolute;
    top: -10cqw;
    left: 1cqw;
    width: 12cqw;
    height: 12cqw;
    animation: pop 0.8s 0.15s cubic-bezier(0.3, 1.5, 0.5, 1) both;
  }

  .icon {
    display: block;
    width: 100%;
    height: 100%;
  }

  .rod {
    position: absolute;
    top: 0;
    left: -0.5cqw;
    width: 1cqw;
    height: var(--rod);
    background: var(--ink);
    transition: height 0.7s ease-in-out;
  }

  .head {
    position: absolute;
    top: var(--rod);
    left: -4cqw;
    width: 8cqw;
    height: 9cqw;
    transition: top 0.7s ease-in-out;
  }

  .head::before {
    content: '';
    position: absolute;
    top: 0;
    left: 1cqw;
    width: 6cqw;
    height: 3cqw;
    border: 0.5cqw solid var(--ink);
    border-radius: 1cqw;
    background: #ffc247;
    box-sizing: border-box;
  }

  .prong {
    position: absolute;
    top: 3cqw;
    width: 1.2cqw;
    height: 6cqw;
    background: var(--ink);
    transition: transform 0.3s;
    transform-origin: top center;
  }

  .prong.left {
    left: 1cqw;
    transform: rotate(28deg);
  }

  .prong.right {
    right: 1cqw;
    transform: rotate(-28deg);
  }

  .head.is-closed .prong.left {
    transform: rotate(-6deg);
  }

  .head.is-closed .prong.right {
    transform: rotate(6deg);
  }

  .carried {
    position: absolute;
    top: calc(var(--rod) + 5cqw);
    left: 0;
    transition: top 0.7s ease-in-out;
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
    transform: none;
  }

  button.drop {
    background: #ff6b4a;
    font-size: 0.7rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
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

  @media (prefers-reduced-motion: reduce) {
    .billboard,
    .rod,
    .head,
    .carried,
    .half,
    .prong,
    .prize,
    .reveal {
      animation: none;
      transition: none;
    }
  }
</style>
