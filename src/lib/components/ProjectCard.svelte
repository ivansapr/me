<script lang="ts">
  import type { ProjectDefinition } from '$lib/types/projects';

  let { project }: { project: ProjectDefinition } = $props();
  const Visual = $derived(project.visual);
</script>

<article class="project-card">
  <div
    class="project-card__visual"
    style:--card-foreground={project.theme.foreground}
  >
    <Visual theme={project.theme} />
  </div>
  <div class="project-card__details">
    <div>
      <h2>{project.title}</h2>
      <p>{project.description}</p>
    </div>
    <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
    <a
      class="open-link"
      href={project.href}
      target="_blank"
      rel="noreferrer"
      data-umami-event="project-open"
      data-umami-event-project={project.slug}
    >
      <span>Open</span><span aria-hidden="true">↗</span>
    </a>
  </div>
</article>

<style>
  .project-card {
    display: flex;
    min-height: 26rem;
    flex-direction: column;
    overflow: hidden;
    border: 1px solid var(--ink);
    border-radius: 0.9rem;
    background: var(--paper);
  }
  .project-card__visual {
    flex: 1;
    padding: 0.65rem;
  }
  .project-card__details {
    display: flex;
    align-items: end;
    justify-content: space-between;
    gap: 1rem;
    padding: 1.25rem;
  }
  h2 {
    margin: 0;
    font-family: var(--font-serif);
    font-size: clamp(1.25rem, 2vw, 1.65rem);
    font-weight: 500;
    letter-spacing: -0.04em;
  }
  p {
    max-width: 28rem;
    margin: 0.45rem 0 0;
    color: #5c5c5c;
    font-size: 0.86rem;
    line-height: 1.4;
  }
  .open-link {
    display: inline-flex;
    flex-shrink: 0;
    align-items: center;
    gap: 0.5rem;
    color: var(--ink);
    font-size: 0.78rem;
    font-weight: 650;
    text-decoration: none;
  }
  .open-link span:last-child {
    font-size: 1.1rem;
    transition: transform 160ms ease;
  }
  .open-link:hover span:last-child {
    transform: translate(0.12rem, -0.12rem);
  }
  .open-link:focus-visible {
    outline: 2px solid var(--ink);
    outline-offset: 0.35rem;
  }
  @media (prefers-reduced-motion: reduce) {
    .open-link span:last-child {
      transition: none;
    }
  }
  @media (max-width: 500px) {
    .project-card__details {
      align-items: start;
      flex-direction: column;
    }
  }
</style>
