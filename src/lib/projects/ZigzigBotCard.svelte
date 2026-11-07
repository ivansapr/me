<script lang="ts">
  import type { ProjectCardVisualProps } from '$lib/types/projects';

  let { theme }: ProjectCardVisualProps = $props();
  let zigs = $state(0);

  const replies = ['zig!', 'zag!', 'zig-zig!', 'beep', 'zzz…'];
  let reply = $derived(
    zigs === 0 ? 'hi!' : replies[(zigs - 1) % replies.length]
  );
</script>

<div
  class="zigzig"
  style:--card-background={theme.background}
  style:--card-accent={theme.accent}
  style:--card-foreground={theme.foreground}
>
  <svg
    class="trail"
    viewBox="0 0 200 40"
    preserveAspectRatio="none"
    aria-hidden="true"
  >
    <polyline
      points="0,30 20,10 40,30 60,10 80,30 100,10 120,30 140,10 160,30 180,10 200,30"
    />
  </svg>

  <p class="bubble" aria-live="polite">{reply}</p>

  <button
    class={['bot', { 'is-zig': zigs % 2 === 1 }]}
    type="button"
    aria-label="Poke the bot"
    onclick={() => (zigs += 1)}
  >
    <svg viewBox="0 0 120 130" aria-hidden="true">
      <polyline class="antenna" points="60,30 52,20 66,13 56,4" />
      <circle class="antenna-tip" cx="56" cy="4" r="4" />
      <rect class="head" x="18" y="30" width="84" height="62" rx="18" />
      <rect class="face" x="30" y="44" width="60" height="32" rx="10" />
      <circle class="eye" cx="47" cy="60" r="5" />
      <circle class="eye" cx="73" cy="60" r="5" />
      <polyline class="mouth" points="48,70 54,66 60,70 66,66 72,70" />
      <rect class="body" x="38" y="96" width="44" height="26" rx="8" />
    </svg>
  </button>
</div>

<style>
  .zigzig {
    position: relative;
    display: grid;
    height: 100%;
    min-height: 15rem;
    place-items: center;
    align-content: center;
    gap: 0.5rem;
    overflow: hidden;
    border-radius: 0.65rem;
    background: var(--card-background);
    color: var(--card-foreground);
  }

  .trail {
    position: absolute;
    inset: auto 0 18% 0;
    width: 100%;
    height: 2.5rem;
    opacity: 0.35;
  }

  .trail polyline {
    fill: none;
    stroke: var(--card-accent);
    stroke-width: 3;
    stroke-linejoin: round;
    vector-effect: non-scaling-stroke;
  }

  .bubble {
    position: relative;
    margin: 0;
    padding: 0.3rem 0.7rem;
    border: 1px solid var(--card-foreground);
    border-radius: 999px;
    background: #fff;
    font-size: 0.75rem;
    font-weight: 700;
  }

  .bot {
    position: relative;
    width: 7.5rem;
    padding: 0;
    border: 0;
    border-radius: 1rem;
    background: none;
    cursor: pointer;
    touch-action: manipulation;
    transition: transform 180ms ease;
  }

  .bot.is-zig {
    transform: rotate(-8deg) translateX(-0.3rem);
  }

  .bot:not(.is-zig):active {
    transform: rotate(8deg);
  }

  .bot:focus-visible {
    outline: 2px solid var(--card-foreground);
    outline-offset: 0.3rem;
  }

  .bot svg {
    display: block;
    width: 100%;
  }

  .head,
  .body {
    fill: var(--card-accent);
  }

  .face {
    fill: #fff;
  }

  .eye {
    fill: var(--card-foreground);
  }

  .antenna,
  .mouth {
    fill: none;
    stroke: var(--card-foreground);
    stroke-width: 3.5;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .antenna-tip {
    fill: #ffd84d;
    stroke: var(--card-foreground);
    stroke-width: 2;
  }

  @media (prefers-reduced-motion: reduce) {
    .bot {
      transition: none;
    }
  }
</style>
