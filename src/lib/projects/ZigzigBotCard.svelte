<script lang="ts">
  import type { ProjectCardVisualProps } from '$lib/types/projects';

  type CareState = 'due' | 'watered' | 'snoozed';

  let { theme }: ProjectCardVisualProps = $props();
  let care = $state<CareState>('due');

  const messages: Record<CareState, string> = {
    due: 'Monstera: time to check the soil. Dry two fingers deep?',
    watered: 'Watering logged. Next soil check in 7 days.',
    snoozed: 'Got it. I’ll ask again tomorrow.'
  };
</script>

<div
  class="zigzig"
  style:--card-background={theme.background}
  style:--card-accent={theme.accent}
  style:--card-foreground={theme.foreground}
>
  <div class="chat">
    <p class="sender">ZigZig</p>
    <p class="message" aria-live="polite">{messages[care]}</p>
    {#if care === 'due'}
      <div class="actions">
        <button type="button" onclick={() => (care = 'watered')}>
          Watered
        </button>
        <button type="button" onclick={() => (care = 'snoozed')}>
          Tomorrow
        </button>
      </div>
    {:else}
      <div class="actions">
        <button type="button" onclick={() => (care = 'due')}>
          Show reminder again
        </button>
      </div>
    {/if}
  </div>

  <svg
    class={['plant', { 'is-watered': care === 'watered' }]}
    viewBox="0 0 120 120"
    aria-hidden="true"
  >
    <g class="drops">
      <path d="M30 18c-3 5-4 7-4 9a4 4 0 0 0 8 0c0-2-1-4-4-9z" />
      <path d="M92 10c-3 5-4 7-4 9a4 4 0 0 0 8 0c0-2-1-4-4-9z" />
      <path d="M78 30c-2 4-3 5-3 7a3 3 0 0 0 6 0c0-2-1-3-3-7z" />
    </g>
    <g class="leaves">
      <path class="stem" d="M60 84V46" />
      <path class="leaf" d="M60 60C44 58 32 46 30 30c16 2 28 14 30 30z" />
      <path class="leaf" d="M60 52c4-16 18-26 34-24-2 16-16 26-34 24z" />
      <path class="leaf" d="M60 72c-12 0-24-8-26-20 12 0 24 8 26 20z" />
    </g>
    <path class="pot" d="M36 82h48l-6 32H42z" />
    <rect class="rim" x="32" y="78" width="56" height="9" rx="3" />
  </svg>
</div>

<style>
  .zigzig {
    display: grid;
    height: 100%;
    min-height: 15rem;
    grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr);
    align-items: center;
    gap: 0.5rem;
    padding: 1rem;
    overflow: hidden;
    border-radius: 0.65rem;
    background:
      radial-gradient(
        circle at 85% 20%,
        rgb(255 255 255 / 60%),
        transparent 40%
      ),
      var(--card-background);
    color: var(--card-foreground);
  }

  .chat {
    padding: 0.7rem 0.75rem;
    border-radius: 0.9rem 0.9rem 0.9rem 0.2rem;
    background: #fff;
    box-shadow: 0 0.2rem 0 rgb(15 46 39 / 12%);
  }

  .sender {
    margin: 0 0 0.25rem;
    color: var(--card-accent);
    font-size: 0.68rem;
    font-weight: 800;
  }

  .message {
    margin: 0;
    font-size: 0.78rem;
    line-height: 1.35;
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
    margin-top: 0.6rem;
  }

  button {
    min-height: 2rem;
    flex: 1;
    padding: 0.3rem 0.55rem;
    border: 1px solid color-mix(in srgb, var(--card-accent) 40%, transparent);
    border-radius: 0.45rem;
    background: color-mix(in srgb, var(--card-background) 55%, #fff);
    color: var(--card-accent);
    cursor: pointer;
    font: inherit;
    font-size: 0.72rem;
    font-weight: 700;
    touch-action: manipulation;
  }

  button:hover {
    background: var(--card-background);
  }

  button:focus-visible {
    outline: 2px solid var(--card-foreground);
    outline-offset: 2px;
  }

  .plant {
    width: 100%;
    max-width: 9rem;
    justify-self: center;
  }

  .leaves {
    transform-box: view-box;
    transform-origin: 60px 84px;
    transform: rotate(-6deg) scaleY(0.9);
    transition: transform 400ms cubic-bezier(0.22, 1, 0.36, 1);
  }

  .is-watered .leaves {
    transform: none;
  }

  .stem {
    fill: none;
    stroke: var(--card-accent);
    stroke-width: 4;
    stroke-linecap: round;
  }

  .leaf {
    fill: #2f9e6e;
    stroke: var(--card-accent);
    stroke-width: 2.5;
    stroke-linejoin: round;
  }

  .pot {
    fill: #d9774b;
    stroke: var(--card-foreground);
    stroke-width: 2.5;
    stroke-linejoin: round;
  }

  .rim {
    fill: #e8895c;
    stroke: var(--card-foreground);
    stroke-width: 2.5;
  }

  .drops path {
    fill: #4aa8e8;
    opacity: 0;
    transform: translateY(-6px);
    transition:
      opacity 300ms ease,
      transform 300ms ease;
  }

  .is-watered .drops path {
    opacity: 1;
    transform: none;
  }

  @media (max-width: 380px) {
    .zigzig {
      padding: 0.7rem;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .leaves,
    .drops path {
      transition: none;
    }
  }
</style>
