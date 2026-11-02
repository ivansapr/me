<script lang="ts">
  import type { ProjectCardVisualProps } from '$lib/types/projects';

  type Key = {
    note: string;
    frequency: number;
    blackKey?: Key;
  };

  const keys: Key[] = [
    {
      note: 'C4',
      frequency: 261.63,
      blackKey: { note: 'C♯4', frequency: 277.18 }
    },
    {
      note: 'D4',
      frequency: 293.66,
      blackKey: { note: 'D♯4', frequency: 311.13 }
    },
    { note: 'E4', frequency: 329.63 },
    {
      note: 'F4',
      frequency: 349.23,
      blackKey: { note: 'F♯4', frequency: 369.99 }
    },
    {
      note: 'G4',
      frequency: 392,
      blackKey: { note: 'G♯4', frequency: 415.3 }
    },
    {
      note: 'A4',
      frequency: 440,
      blackKey: { note: 'A♯4', frequency: 466.16 }
    },
    { note: 'B4', frequency: 493.88 }
  ];
  const keyByNote = new Map(
    keys
      .flatMap((key) => [key, ...(key.blackKey ? [key.blackKey] : [])])
      .map((key) => [key.note, key])
  );

  let { theme }: ProjectCardVisualProps = $props();
  let audioContext: AudioContext | null = null;
  let activePointerId: number | null = null;
  let lastPlayedNote: string | null = null;
  let pressedNote = $state<string | null>(null);
  let keyboardReleaseTimer: ReturnType<typeof setTimeout> | undefined;

  function playNote(key: Key) {
    audioContext ??= new window.AudioContext();

    const now = audioContext.currentTime;
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(key.frequency, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.16, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);

    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.82);
  }

  function playOnKeyboardClick(event: MouseEvent, key: Key) {
    if (event.detail !== 0) return;

    playNote(key);
    pressedNote = key.note;
    clearTimeout(keyboardReleaseTimer);
    keyboardReleaseTimer = setTimeout(() => (pressedNote = null), 120);
  }

  function startPointer(event: PointerEvent, key: Key) {
    clearTimeout(keyboardReleaseTimer);
    activePointerId = event.pointerId;
    lastPlayedNote = key.note;
    pressedNote = key.note;
    (event.currentTarget as HTMLButtonElement).setPointerCapture(
      event.pointerId
    );
    playNote(key);
  }

  function playHoveredKey(event: PointerEvent) {
    if (event.pointerId !== activePointerId) return;

    const note = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest<HTMLButtonElement>('button[data-note]')?.dataset.note;
    if (!note || note === lastPlayedNote) return;

    const key = keyByNote.get(note);
    if (!key) return;

    lastPlayedNote = note;
    pressedNote = note;
    playNote(key);
  }

  function endPointer(event: PointerEvent) {
    if (event.pointerId !== activePointerId) return;
    activePointerId = null;
    lastPlayedNote = null;
    pressedNote = null;
  }
</script>

<div
  class="instrument"
  style:--card-background={theme.background}
  style:--card-accent={theme.accent}
>
  <div
    class="piano"
    role="group"
    aria-label="Playable piano keyboard"
    onpointermove={playHoveredKey}
    onpointerup={endPointer}
    onpointercancel={endPointer}
  >
    {#each keys as key (key.note)}
      <div class="key-slot">
        <button
          class={['white-key', { 'is-pressed': pressedNote === key.note }]}
          type="button"
          aria-label={`Play ${key.note}`}
          data-note={key.note}
          onpointerdown={(event) => startPointer(event, key)}
          onclick={(event) => playOnKeyboardClick(event, key)}
        >
          <span>{key.note.replace('4', '')}</span>
        </button>
        {#if key.blackKey}
          <button
            class={[
              'black-key',
              { 'is-pressed': pressedNote === key.blackKey.note }
            ]}
            type="button"
            aria-label={`Play ${key.blackKey.note}`}
            data-note={key.blackKey.note}
            onpointerdown={(event) => startPointer(event, key.blackKey!)}
            onclick={(event) => playOnKeyboardClick(event, key.blackKey!)}
          >
            <span>{key.blackKey.note.replace('4', '')}</span>
          </button>
        {/if}
      </div>
    {/each}
  </div>
</div>

<style>
  .instrument {
    display: grid;
    align-content: center;
    gap: 0.85rem;
    min-height: 15rem;
    padding: 1rem;
    overflow: hidden;
    border: 1px solid color-mix(in srgb, var(--card-accent) 45%, transparent);
    border-radius: 0.65rem;
    background:
      linear-gradient(110deg, rgb(255 255 255 / 30%), transparent 24%),
      repeating-linear-gradient(
        92deg,
        rgb(255 255 255 / 8%) 0 1px,
        transparent 1px 5px
      ),
      var(--card-background);
    box-shadow:
      inset 0 1px rgb(255 255 255 / 65%),
      inset 0 -0.35rem 0 rgb(0 0 0 / 12%);
    color: var(--card-accent);
  }

  .piano {
    display: flex;
    padding: 0.42rem 0.42rem 0.55rem;
    border: 0.3rem solid #252525;
    border-radius: 0.42rem;
    background: linear-gradient(135deg, #454545, #161616 38%, #2e2e2e);
    box-shadow:
      inset 0 1px rgb(255 255 255 / 22%),
      0 0.34rem 0 rgb(0 0 0 / 20%);
  }

  .key-slot {
    position: relative;
    flex: 1;
    min-width: 0;
  }

  button {
    font: inherit;
    cursor: pointer;
  }

  .white-key {
    display: grid;
    width: 100%;
    height: 6rem;
    align-items: end;
    justify-items: center;
    padding: 0 0 0.48rem;
    border: 1px solid #a69e8f;
    border-radius: 0 0 0.24rem 0.24rem;
    background: linear-gradient(100deg, #d9d1be, #fffdf3 12% 72%, #d7ceba);
    box-shadow:
      inset 0 -0.22rem 0 #c5bba6,
      inset 0 1px #fff;
    color: #514b42;
    font-size: 0.62rem;
    font-weight: 700;
  }

  .white-key.is-pressed {
    transform: translateY(0.16rem);
    box-shadow: inset 0 0.18rem 0 #c5bba6;
  }

  .black-key {
    position: absolute;
    z-index: 1;
    top: 0;
    right: -0.32rem;
    display: grid;
    width: 0.72rem;
    height: 3.75rem;
    align-items: end;
    justify-items: center;
    padding: 0 0 0.26rem;
    border: 1px solid #050505;
    border-radius: 0 0 0.18rem 0.18rem;
    background: linear-gradient(105deg, #0b0b0b, #4b4b4b 42%, #070707 60%);
    box-shadow:
      inset 0 1px rgb(255 255 255 / 20%),
      0 0.16rem 0 #050505;
    color: #eee7d4;
    font-size: 0.42rem;
    font-weight: 700;
  }

  .black-key.is-pressed {
    transform: translateY(0.13rem);
    box-shadow: inset 0 0.14rem 0 #050505;
  }

  button:focus-visible {
    z-index: 2;
    outline: 2px solid #d9ff63;
    outline-offset: -3px;
  }

  @media (max-width: 390px) {
    .instrument {
      padding: 0.65rem;
    }

    .black-key {
      right: -0.27rem;
      width: 0.62rem;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .white-key.is-pressed,
    .black-key.is-pressed {
      transform: none;
    }
  }
</style>
