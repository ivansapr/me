<script lang="ts">
  import type { ProjectCardVisualProps } from '$lib/types/projects';

  let { theme }: ProjectCardVisualProps = $props();
</script>

<div
  class="placeholder"
  style:--card-background={theme.background}
  style:--card-accent={theme.accent}
>
  <div class="keys" aria-hidden="true">
    {#each ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as key (key)}
      <span>{key}</span>
    {/each}
  </div>
  <p>Interactive MIDI learner</p>
</div>

<style>
  .placeholder {
    display: grid;
    place-items: center;
    gap: 1rem;
    min-height: 15rem;
    border-radius: 0.65rem;
    background: var(--card-background);
    color: var(--card-accent);
  }

  .placeholder p {
    margin: 0;
    font-size: 0.75rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .keys {
    display: flex;
    gap: 0.18rem;
  }
  .keys span {
    display: grid;
    place-items: end center;
    width: 2.1rem;
    height: 5.5rem;
    padding-bottom: 0.55rem;
    border-radius: 0 0 0.3rem 0.3rem;
    background: var(--card-accent);
    color: var(--card-background);
    font-size: 0.7rem;
  }
</style>
