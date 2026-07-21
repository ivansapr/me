<script lang="ts">
  import type { ProjectCardVisualProps } from '$lib/types/projects';

  type Equipment = 'dumbbell' | 'barbell' | 'kettlebell';
  type Item = {
    id: number;
    kind: Equipment;
    x: number;
    y: number;
    vy: number;
    rotate: number;
    width: number;
    height: number;
  };

  const dimensions: Record<Equipment, { width: number; height: number }> = {
    dumbbell: { width: 46, height: 18 },
    barbell: { width: 62, height: 15 },
    kettlebell: { width: 25, height: 27 }
  };

  let { theme }: ProjectCardVisualProps = $props();
  let items = $state<Item[]>([]);
  let dropZone: HTMLDivElement | undefined;
  let physicsFrame: number | undefined;
  const activeItemIds = new Set<number>();
  let nextId = 1;

  function captureDropZone(node: HTMLDivElement) {
    dropZone = node;
    return () => {
      if (dropZone === node) dropZone = undefined;
    };
  }

  function addItem(kind: Equipment) {
    if (!dropZone) return;
    const bounds = dropZone.getBoundingClientRect();
    const size = dimensions[kind];
    const id = nextId++;
    items = [
      ...items,
      {
        id,
        kind,
        ...size,
        x: Math.min(
          Math.max(0, bounds.width * (0.16 + ((id * 31) % 58) / 100)),
          Math.max(0, bounds.width - size.width)
        ),
        y: -size.height,
        vy: 0.6,
        rotate: ((id * 13) % 17) - 8
      }
    ];
    activeItemIds.add(id);
    if (physicsFrame === undefined)
      physicsFrame = requestAnimationFrame(simulate);
  }

  function simulate() {
    if (!dropZone) {
      physicsFrame = undefined;
      return;
    }

    const bounds = dropZone.getBoundingClientRect();
    for (const item of items) {
      if (!activeItemIds.has(item.id)) continue;
      const floor = Math.max(0, bounds.height - item.height);
      item.vy = Math.min(item.vy + 0.34, 5.5);
      item.y = Math.min(item.y + item.vy, floor);
      let stable = item.y === floor;

      for (const fixedItem of items) {
        if (fixedItem.id === item.id || activeItemIds.has(fixedItem.id))
          continue;
        const horizontalOverlap =
          Math.min(item.x + item.width, fixedItem.x + fixedItem.width) -
          Math.max(item.x, fixedItem.x);
        const reachesTop =
          item.y + item.height >= fixedItem.y && item.y <= fixedItem.y;

        if (horizontalOverlap > 4 && reachesTop) {
          item.y = Math.max(0, fixedItem.y - item.height);
          stable = true;
          break;
        }
      }

      if (stable) {
        item.vy = 0;
        activeItemIds.delete(item.id);
      }
    }

    items = [...items];
    physicsFrame = activeItemIds.size
      ? requestAnimationFrame(simulate)
      : undefined;
  }
</script>

<div class="gym-tracker" style:--card-accent={theme.accent}>
  <div class="equipment-row" aria-label="Gym equipment">
    <button
      class="equipment-button"
      type="button"
      onclick={() => addItem('dumbbell')}
      aria-label="Add dumbbell"
      ><span class="dumbbell-icon" aria-hidden="true"
        ><i></i><b></b><i></i></span
      ></button
    >
    <button
      class="equipment-button"
      type="button"
      onclick={() => addItem('barbell')}
      aria-label="Add barbell"
      ><span class="barbell-icon" aria-hidden="true"
        ><i></i><i></i><b></b><i></i><i></i></span
      ></button
    >
    <button
      class="equipment-button"
      type="button"
      onclick={() => addItem('kettlebell')}
      aria-label="Add kettlebell"
      ><span class="kettlebell-icon" aria-hidden="true"><i></i></span></button
    >
  </div>

  <div
    class="drop-zone"
    {@attach captureDropZone}
    aria-label={`${items.length} items added`}
  >
    {#each items as item (item.id)}
      <div
        class={`item item--${item.kind}`}
        style:transform={`translate(${item.x}px, ${item.y}px) rotate(${item.rotate}deg)`}
        aria-label={`${item.kind} added`}
      >
        {#if item.kind === 'dumbbell'}
          <span></span><i></i><span></span>
        {:else if item.kind === 'barbell'}
          <span></span><span></span><i></i><span></span><span></span>
        {:else}
          <i></i>
        {/if}
      </div>
    {/each}
  </div>
</div>

<style>
  .gym-tracker {
    position: relative;
    min-height: 15rem;
    overflow: hidden;
    border: 1px solid color-mix(in srgb, var(--card-accent) 45%, transparent);
    border-radius: 0.65rem;
    background:
      radial-gradient(
        circle at 12% 4%,
        rgb(255 255 255 / 38%),
        transparent 26%
      ),
      repeating-linear-gradient(
        135deg,
        rgb(24 50 25 / 11%) 0 1px,
        transparent 1px 9px
      ),
      linear-gradient(145deg, #c5dc79, #9cbd62 62%, #80a952);
    color: var(--card-accent);
  }
  .equipment-row {
    position: relative;
    z-index: 1;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.4rem;
    margin: 0.65rem;
    padding: 0.45rem;
    border: 1px solid rgb(0 0 0 / 43%);
    border-radius: 0.42rem;
    background: #e5e0d1;
    box-shadow:
      0 0.18rem 0 rgb(0 0 0 / 42%),
      inset 0 0.1rem 0 #fffdf4,
      inset 0 -0.15rem 0 #bcb5a2;
  }
  .equipment-button {
    display: grid;
    min-width: 0;
    height: 3.1rem;
    place-items: center;
    border: 1px solid #a79f8e;
    border-radius: 0.26rem;
    background: linear-gradient(#f8f4e6, #d5cfbd);
    box-shadow:
      inset 0 0.1rem #fff,
      0 0.08rem #8a816e;
    cursor: pointer;
  }
  .equipment-button:active {
    transform: translateY(0.1rem);
    box-shadow: inset 0 0.15rem #b5ad9c;
  }
  .equipment-button:focus-visible {
    outline: 2px solid #111;
    outline-offset: 0.14rem;
  }
  .dumbbell-icon,
  .barbell-icon {
    display: flex;
    align-items: center;
    height: 1.55rem;
    filter: drop-shadow(0 0.12rem 0.06rem rgb(0 0 0 / 30%));
  }
  .dumbbell-icon i {
    width: 0.46rem;
    height: 1.45rem;
    border: 1px solid #171716;
    border-radius: 0.12rem;
    background: linear-gradient(90deg, #111, #595950, #151514);
  }
  .dumbbell-icon b {
    width: 1.25rem;
    height: 0.3rem;
    background: repeating-linear-gradient(
      90deg,
      #858378 0 0.1rem,
      #34342f 0.1rem 0.2rem
    );
  }
  .barbell-icon i {
    width: 0.28rem;
    height: 0.85rem;
    border: 1px solid #171716;
    border-radius: 0.08rem;
    background: #292926;
  }
  .barbell-icon i:nth-child(2),
  .barbell-icon i:nth-child(4) {
    height: 1.2rem;
  }
  .barbell-icon b {
    width: 1.75rem;
    height: 0.2rem;
    background: #252522;
  }
  .kettlebell-icon {
    position: relative;
    display: block;
    width: 1.55rem;
    height: 1.35rem;
    margin-top: 0.28rem;
    border: 1px solid #171716;
    border-radius: 48% 48% 42% 42%;
    background: radial-gradient(circle at 36% 28%, #6a6a61, #1a1a18 65%);
  }
  .kettlebell-icon i {
    position: absolute;
    top: -0.62rem;
    left: 0.38rem;
    width: 0.72rem;
    height: 0.78rem;
    border: 0.22rem solid #262624;
    border-bottom: 0;
    border-radius: 0.55rem 0.55rem 0 0;
  }
  .drop-zone {
    position: absolute;
    inset: 4.9rem 0 0;
    overflow: hidden;
  }
  .item {
    position: absolute;
    display: flex;
    align-items: center;
  }
  .item--dumbbell span {
    width: 0.45rem;
    height: 1.1rem;
    border: 1px solid #161616;
    border-radius: 0.1rem;
    background: #232321;
  }
  .item--dumbbell i {
    width: 1.45rem;
    height: 0.22rem;
    background: #181817;
  }
  .item--barbell span {
    width: 0.35rem;
    height: 0.72rem;
    border: 1px solid #161616;
    border-radius: 0.08rem;
    background: #242422;
  }
  .item--barbell span:nth-child(2),
  .item--barbell span:nth-child(4) {
    height: 0.95rem;
  }
  .item--barbell i {
    width: 2.35rem;
    height: 0.18rem;
    background: #181817;
  }
  .item--kettlebell {
    width: 1.55rem;
    height: 1.45rem;
    margin-bottom: 0.45rem;
    border: 1px solid #161616;
    border-radius: 48% 48% 42% 42%;
    background: radial-gradient(circle at 36% 28%, #64645c, #1a1a18 65%);
  }
  .item--kettlebell i {
    position: absolute;
    top: -0.62rem;
    left: 0.38rem;
    width: 0.72rem;
    height: 0.78rem;
    border: 0.22rem solid #262624;
    border-bottom: 0;
    border-radius: 0.55rem 0.55rem 0 0;
  }
</style>
