<script lang="ts">
  import type { ProjectCardVisualProps } from '$lib/types/projects';

  type Screen = 'overview' | 'details';

  type SampleFlight = {
    callsign: string;
    from: string;
    to: string;
    aircraft: string;
    altitude: string;
    speed: string;
    distance: string;
    time: string;
  };

  // Fictional sample data, like the preview board in the Airways repo.
  const flights: SampleFlight[] = [
    {
      callsign: 'TAP123',
      from: 'LISBON',
      to: 'LONDON',
      aircraft: 'A320NEO',
      altitude: '11 280 M',
      speed: '842 KM/H',
      distance: '4.2 KM',
      time: '08:00'
    },
    {
      callsign: 'KLM88',
      from: 'AMSTERDAM',
      to: 'MADRID',
      aircraft: 'B737-800',
      altitude: '10 360 M',
      speed: '815 KM/H',
      distance: '12.7 KM',
      time: '08:01'
    },
    {
      callsign: 'EZY41',
      from: 'PORTO',
      to: 'GENEVA',
      aircraft: 'A319',
      altitude: '3 050 M',
      speed: '512 KM/H',
      distance: '27.9 KM',
      time: '08:03'
    }
  ];

  let { theme }: ProjectCardVisualProps = $props();
  let screen = $state<Screen>('overview');
  let flightIndex = $state(0);

  let flight = $derived(flights[flightIndex]);
  let rows = $derived(
    screen === 'overview'
      ? [
          { label: 'Flight', value: flight.callsign },
          { label: 'From', value: flight.from },
          { label: 'To', value: flight.to },
          { label: 'Near you', value: `${flight.distance} AWAY` }
        ]
      : [
          { label: 'Aircraft', value: flight.aircraft },
          { label: 'Altitude', value: flight.altitude },
          { label: 'Speed', value: flight.speed },
          { label: 'Distance', value: flight.distance }
        ]
  );

  function nextFlight() {
    flightIndex = (flightIndex + 1) % flights.length;
    screen = 'overview';
  }
</script>

<div
  class="airways"
  style:--card-background={theme.background}
  style:--card-accent={theme.accent}
  style:--card-foreground={theme.foreground}
>
  <div class="board-header">
    <span>Airways / Nearby flights</span>
    <span class="snapshot">{flight.time} UTC</span>
  </div>

  {#key `${flightIndex}-${screen}`}
    <dl
      class="board"
      aria-live="polite"
      aria-label={screen === 'overview'
        ? 'Flight overview'
        : 'Aircraft details'}
    >
      {#each rows as row, rowIndex (row.label)}
        <div class="row">
          <dt>{row.label}</dt>
          <dd class="led" aria-label={row.value}>
            {#each row.value.split('') as char, charIndex (charIndex)}
              <span
                aria-hidden="true"
                style:animation-delay="{rowIndex * 70 + charIndex * 28}ms"
                >{char === ' ' ? ' ' : char}</span
              >
            {/each}
          </dd>
        </div>
      {/each}
    </dl>
  {/key}

  <div class="board-footer">
    <div class="tabs" role="group" aria-label="Board screen">
      <button
        type="button"
        aria-pressed={screen === 'overview'}
        onclick={() => (screen = 'overview')}>Flight</button
      >
      <button
        type="button"
        aria-pressed={screen === 'details'}
        onclick={() => (screen = 'details')}>Aircraft</button
      >
    </div>
    <button
      class="next"
      type="button"
      onclick={nextFlight}
      aria-label="Next flight">Next <span aria-hidden="true">→</span></button
    >
  </div>
</div>

<style>
  .airways {
    display: flex;
    height: 100%;
    min-height: 15rem;
    flex-direction: column;
    padding: 0.7rem 0.85rem 0.6rem;
    overflow: hidden;
    border: 2px solid #6b7079;
    border-radius: 0.65rem;
    background: var(--card-background);
    color: var(--card-foreground);
    font-family:
      ui-monospace, 'SFMono-Regular', Menlo, Consolas, 'Liberation Mono',
      monospace;
  }

  .board-header,
  .board-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .board-header {
    padding-bottom: 0.35rem;
    border-bottom: 1px solid rgb(255 255 255 / 12%);
    font-size: 0.68rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .snapshot {
    color: #9097a3;
    font-size: 0.58rem;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .board {
    display: flex;
    overflow: hidden;
    min-height: 0;
    flex: 1;
    flex-direction: column;
    justify-content: space-evenly;
    margin: 0;
  }

  .row {
    padding: 0.15rem 0;
    border-bottom: 1px solid rgb(255 255 255 / 7%);
  }

  dt {
    margin-bottom: 0.05rem;
    font-size: 0.55rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .led {
    display: flex;
    margin: 0;
    overflow: hidden;
    font-size: 1.05rem;
    font-weight: 800;
    line-height: 1.05;
    white-space: nowrap;
  }

  /* Each character becomes a cell of amber dots on a dim dot-matrix grid. */
  .led span {
    position: relative;
    display: inline-block;
    width: 0.78em;
    text-align: center;
    background: radial-gradient(
        circle,
        rgb(255 255 255 / 9%) 0 45%,
        transparent 50%
      )
      0 0 / 0.14em 0.14em;
    color: var(--card-foreground);
    mask-image: radial-gradient(circle, #000 0 52%, transparent 58%);
    mask-size: 0.14em 0.14em;
    text-shadow: 0 0 0.25em var(--card-foreground);
    animation: led-refresh 260ms steps(3, end) both;
  }

  @keyframes led-refresh {
    0% {
      color: transparent;
      text-shadow: none;
    }

    60% {
      color: color-mix(in srgb, var(--card-foreground) 45%, transparent);
    }

    100% {
      color: var(--card-foreground);
    }
  }

  .board-footer {
    padding-top: 0.45rem;
  }

  .tabs {
    display: flex;
    gap: 0.25rem;
  }

  button {
    min-height: 1.75rem;
    padding: 0.25rem 0.55rem;
    border: 1px solid color-mix(in srgb, var(--card-accent) 45%, transparent);
    border-radius: 0.35rem;
    background: transparent;
    color: var(--card-accent);
    cursor: pointer;
    font: inherit;
    font-size: 0.6rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    touch-action: manipulation;
  }

  button[aria-pressed='true'] {
    background: var(--card-accent);
    color: var(--card-background);
  }

  button:hover {
    border-color: var(--card-accent);
  }

  button:focus-visible {
    outline: 2px solid #fff;
    outline-offset: 2px;
  }

  @media (max-width: 380px) {
    .airways {
      padding: 0.7rem;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .led span {
      animation: none;
    }
  }
</style>
