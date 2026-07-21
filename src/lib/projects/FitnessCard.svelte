<script lang="ts">
  import type { ProjectCardVisualProps } from '$lib/types/projects';

  let { theme }: ProjectCardVisualProps = $props();
</script>

<div
  class="placeholder"
  style:--card-background={theme.background}
  style:--card-accent={theme.accent}
>
  <div class="dumbbell" aria-hidden="true">
    <span></span><i></i><span></span>
  </div>
  <p>Interactive gym tracker</p>
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
  .dumbbell {
    display: flex;
    align-items: center;
    color: var(--card-accent);
  }
  .dumbbell span {
    width: 1.5rem;
    height: 4rem;
    border: 0.28rem solid currentColor;
    border-radius: 0.35rem;
  }
  .dumbbell i {
    display: block;
    width: 4.25rem;
    height: 0.35rem;
    background: currentColor;
  }
</style>
