<script lang="ts">
  import { env } from '$env/dynamic/public';
  import ProjectCard from '$lib/components/ProjectCard.svelte';
  import { projects } from '$lib/projects/registry';

  const siteUrl = env.PUBLIC_SITE_URL;
</script>

<svelte:head>
  <title>Ivan Saprykin — Web/Mobile Developer</title>
  <meta
    name="description"
    content="A bookshelf of small web and mobile experiments by Ivan Saprykin."
  />
  <meta property="og:title" content="Ivan Saprykin — Web/Mobile Developer" />
  <meta
    property="og:description"
    content="A bookshelf of small web and mobile experiments."
  />
  <meta property="og:type" content="website" />
  <link rel="canonical" href={siteUrl || undefined} />
  <meta property="og:url" content={siteUrl || undefined} />
</svelte:head>

<main>
  <header class="intro">
    <p class="eyebrow">Selected experiments</p>
    <h1>Ivan Saprykin <em>—</em><br />Web/Mobile Developer</h1>
    <p class="lede">
      Small tools, tactile interfaces, and useful things made one idea at a
      time.
    </p>
  </header>

  <section class="project-grid" aria-label="Projects">
    {#each projects.toSorted((a, b) => a.order - b.order) as project (project.slug)}
      <ProjectCard {project} />
    {/each}
  </section>
</main>

<style>
  :global(:root) {
    --ink: #111;
    --paper: #f7f6f2;
    --font-serif: 'Iowan Old Style', 'Baskerville', 'Times New Roman', serif;
    --font-sans:
      Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,
      'Segoe UI', sans-serif;
  }
  :global(body) {
    margin: 0;
    background: var(--paper);
    color: var(--ink);
    font-family: var(--font-sans);
  }
  :global(*) {
    box-sizing: border-box;
  }
  main {
    width: min(100% - 2.5rem, 1160px);
    margin: 0 auto;
    padding: clamp(3rem, 8vw, 8rem) 0 5rem;
  }
  .intro {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(15rem, 0.6fr);
    align-items: end;
    gap: 2rem;
    margin-bottom: clamp(3rem, 8vw, 7rem);
  }
  .eyebrow {
    grid-column: 1 / -1;
    margin: 0;
    font-size: 0.7rem;
    font-weight: 650;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }
  h1 {
    margin: 0;
    font-family: var(--font-serif);
    font-size: clamp(3.5rem, 9vw, 8.5rem);
    font-weight: 400;
    letter-spacing: -0.075em;
    line-height: 0.84;
  }
  h1 em {
    font-style: normal;
  }
  .lede {
    max-width: 22rem;
    margin: 0 0 0.25rem;
    color: #5c5c5c;
    font-size: 1rem;
    line-height: 1.5;
  }
  .project-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1rem;
  }
  @media (min-width: 980px) {
    .project-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }
  @media (max-width: 700px) {
    .intro {
      display: block;
    }
    .lede {
      margin-top: 1.5rem;
    }
  }
  @media (max-width: 560px) {
    main {
      width: min(100% - 1.5rem, 1160px);
    }
    .project-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
