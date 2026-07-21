<script lang="ts">
  import { SvelteDate } from 'svelte/reactivity';
  import type { ProjectCardVisualProps } from '$lib/types/projects';

  type MeetingPlatform = 'meet' | 'teams' | 'zoom';

  type CalendarMine = {
    date: Date;
    meeting: MeetingPlatform | null;
    revealed: boolean;
    flagged: boolean;
    adjacent: number;
  };

  const weekdays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const daysPerWeek = 7;
  const initialWeeks = 4;

  let { theme }: ProjectCardVisualProps = $props();
  let board = $state<CalendarMine[]>(createBoard(initialWeeks));
  let flagMode = $state(false);
  let lastResult = $state<'lost' | 'won' | null>(null);

  let meetingTotal = $derived(board.filter((cell) => cell.meeting).length);
  let flaggedCount = $derived(board.filter((cell) => cell.flagged).length);
  let safeCells = $derived(board.length - meetingTotal);
  let revealedCount = $derived(
    board.filter((cell) => cell.revealed && !cell.meeting).length
  );
  let boardComplete = $derived(revealedCount === safeCells);

  function startOfCurrentWeek(today = new SvelteDate()) {
    const start = new SvelteDate(today);
    const weekday = (start.getDay() + 6) % 7;
    start.setDate(start.getDate() - weekday);
    start.setHours(0, 0, 0, 0);
    return start;
  }

  function addDays(date: Date, days: number) {
    const next = new SvelteDate(date);
    next.setDate(next.getDate() + days);
    return next;
  }

  function createBoard(weeks: number) {
    const start = startOfCurrentWeek();

    return withAdjacentCounts(
      Array.from({ length: weeks * daysPerWeek }, (_, index) => ({
        date: addDays(start, index),
        meeting:
          index % daysPerWeek ===
          meetingPosition(start, Math.floor(index / daysPerWeek))
            ? meetingPlatform(index)
            : null,
        revealed: false,
        flagged: false,
        adjacent: 0
      }))
    );
  }

  function meetingPosition(weekStart: Date, weekOffset: number) {
    return (
      (weekStart.getDate() + weekStart.getMonth() * 3 + weekOffset * 5) %
      daysPerWeek
    );
  }

  function meetingPlatform(index: number): MeetingPlatform {
    return ['meet', 'teams', 'zoom'][index % 3] as MeetingPlatform;
  }

  function withAdjacentCounts(cells: CalendarMine[]) {
    return cells.map((cell, index) => ({
      ...cell,
      adjacent: cell.meeting ? 0 : adjacentMeetings(index, cells)
    }));
  }

  function adjacentMeetings(index: number, cells: CalendarMine[]) {
    const row = Math.floor(index / daysPerWeek);
    const column = index % daysPerWeek;
    let total = 0;

    for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
      for (let columnOffset = -1; columnOffset <= 1; columnOffset += 1) {
        if (rowOffset === 0 && columnOffset === 0) continue;
        const nearbyRow = row + rowOffset;
        const nearbyColumn = column + columnOffset;
        const nearbyIndex = nearbyRow * daysPerWeek + nearbyColumn;
        if (
          nearbyRow >= 0 &&
          nearbyColumn >= 0 &&
          nearbyColumn < daysPerWeek &&
          nearbyIndex < cells.length &&
          cells[nearbyIndex].meeting
        )
          total += 1;
      }
    }

    return total;
  }

  function restart() {
    board = createBoard(initialWeeks);
    flagMode = false;
    lastResult = null;
  }

  function toggleFlag(index: number) {
    const cell = board[index];
    if (cell.revealed || lastResult || boardComplete) return;
    cell.flagged = !cell.flagged;
  }

  function reveal(index: number) {
    const cell = board[index];
    if (cell.revealed || cell.flagged || lastResult || boardComplete) return;
    if (flagMode) {
      toggleFlag(index);
      return;
    }
    if (cell.meeting) {
      board.forEach((item) => {
        if (item.meeting) item.revealed = true;
      });
      lastResult = 'lost';
      return;
    }

    revealSafeArea(index);
    if (board.every((item) => item.meeting || item.revealed))
      lastResult = 'won';
  }

  function revealSafeArea(index: number) {
    const cell = board[index];
    if (cell.revealed || cell.flagged || cell.meeting) return;
    cell.revealed = true;
    if (cell.adjacent !== 0) return;

    const row = Math.floor(index / daysPerWeek);
    const column = index % daysPerWeek;
    for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
      for (let columnOffset = -1; columnOffset <= 1; columnOffset += 1) {
        const nearbyRow = row + rowOffset;
        const nearbyColumn = column + columnOffset;
        if (nearbyRow >= 0 && nearbyColumn >= 0 && nearbyColumn < daysPerWeek) {
          const nearbyIndex = nearbyRow * daysPerWeek + nearbyColumn;
          if (nearbyIndex >= 0 && nearbyIndex < board.length)
            revealSafeArea(nearbyIndex);
        }
      }
    }
  }

  function isToday(date: Date) {
    const today = new SvelteDate();
    return date.toDateString() === today.toDateString();
  }

  function dateDescription(date: Date) {
    return new Intl.DateTimeFormat(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    }).format(date);
  }

  function cellLabel(cell: CalendarMine) {
    const date = dateDescription(cell.date);
    if (cell.revealed && cell.meeting)
      return `${meetingName(cell.meeting)} meeting on ${date}`;
    if (cell.revealed) return `${cell.adjacent} adjacent meetings on ${date}`;
    if (cell.flagged) return `Marked meeting on ${date}`;
    return `${flagMode ? 'Mark' : 'Reveal'} ${date}`;
  }

  function meetingName(platform: MeetingPlatform) {
    return {
      meet: 'Google Meet',
      teams: 'Microsoft Teams',
      zoom: 'Zoom'
    }[platform];
  }
</script>

<div
  class="tickspot-game"
  style:--card-background={theme.background}
  style:--card-accent={theme.accent}
>
  <div class={['game-header', { 'is-failed': lastResult === 'lost' }]}>
    <div>
      <strong aria-live="polite"
        >{lastResult === 'lost'
          ? "What's your status?"
          : 'Find Meetings'}</strong
      >
    </div>
    <div class="game-actions">
      <span class="counter">{flaggedCount}/{meetingTotal}</span>
      <button
        class={['flag-toggle', { 'is-active': flagMode }]}
        type="button"
        aria-pressed={flagMode}
        aria-label="Toggle mark mode"
        onclick={() => (flagMode = !flagMode)}>⚑</button
      >
      {#if lastResult === 'lost'}
        <button class="play-again" type="button" onclick={restart}
          >Play again</button
        >
      {/if}
    </div>
  </div>

  <div class="calendar-shell">
    <div class="weekdays" aria-hidden="true">
      {#each weekdays as weekday, index (`${weekday}-${index}`)}
        <span>{weekday}</span>
      {/each}
    </div>
    <div class="calendar-scroll">
      <div
        class="calendar"
        role="group"
        aria-label="Continuous calendar Minesweeper field"
      >
        {#each board as cell, index (cell.date.toISOString())}
          <button
            class={[
              'calendar-cell',
              {
                'is-revealed': cell.revealed,
                'is-flagged': cell.flagged,
                'is-meeting': cell.revealed && cell.meeting,
                'meeting--meet': cell.revealed && cell.meeting === 'meet',
                'meeting--teams': cell.revealed && cell.meeting === 'teams',
                'meeting--zoom': cell.revealed && cell.meeting === 'zoom',
                'is-today': isToday(cell.date)
              }
            ]}
            type="button"
            aria-label={cellLabel(cell)}
            onclick={() => reveal(index)}
            oncontextmenu={(event) => {
              event.preventDefault();
              toggleFlag(index);
            }}
          >
            <time datetime={cell.date.toISOString().slice(0, 10)}
              >{cell.date.getDate()}</time
            >
            {#if cell.revealed && cell.meeting}
              <span class="cell-value" aria-hidden="true">
                {#if cell.meeting === 'meet'}
                  <svg class="meeting-icon" viewBox="0 0 24 24">
                    <path
                      fill="#00ac47"
                      d="M3 7.2A2.2 2.2 0 0 1 5.2 5h8.6A2.2 2.2 0 0 1 16 7.2v9.6a2.2 2.2 0 0 1-2.2 2.2H5.2A2.2 2.2 0 0 1 3 16.8z"
                    />
                    <path fill="#00832d" d="m16 9 5-3v12l-5-3z" />
                    <path fill="#ffba00" d="M3 10h6l3 3-3 3H3z" />
                  </svg>
                {:else if cell.meeting === 'teams'}
                  <svg class="meeting-icon" viewBox="0 0 24 24">
                    <circle cx="17.4" cy="7" r="3" fill="#7b83eb" />
                    <circle cx="19" cy="15.5" r="3.5" fill="#8b91f5" />
                    <rect
                      x="3"
                      y="6"
                      width="12"
                      height="12"
                      rx="2.4"
                      fill="#6264a7"
                    />
                    <path fill="#fff" d="M5.5 9h7v2H10v5H8V11H5.5z" />
                  </svg>
                {:else}
                  <svg class="meeting-icon" viewBox="0 0 24 24">
                    <rect
                      x="3"
                      y="6"
                      width="13"
                      height="12"
                      rx="3.3"
                      fill="#2d8cff"
                    />
                    <path
                      fill="#fff"
                      d="M7 9.2h4.6A1.4 1.4 0 0 1 13 10.6v2.8a1.4 1.4 0 0 1-1.4 1.4H7zM14 10l4-2v8l-4-2z"
                    />
                  </svg>
                {/if}
              </span>
            {:else if cell.flagged}
              <span class="cell-value" aria-hidden="true">⚑</span>
            {:else if cell.revealed && cell.adjacent > 0}
              <span class="cell-value">{cell.adjacent}</span>
            {/if}
          </button>
        {/each}
      </div>
    </div>
  </div>
</div>

<style>
  .tickspot-game {
    display: flex;
    min-height: 15rem;
    flex-direction: column;
    padding: 0.65rem;
    overflow: hidden;
    border: 1px solid color-mix(in srgb, var(--card-accent) 42%, transparent);
    border-radius: 0.65rem;
    background:
      radial-gradient(circle at 2% 0%, rgb(255 255 255 / 72%), transparent 28%),
      linear-gradient(135deg, #d5ebff, var(--card-background));
    box-shadow:
      inset 0 1px rgb(255 255 255 / 85%),
      inset 0 -0.28rem rgb(15 58 121 / 10%);
    color: var(--card-accent);
  }

  .game-header,
  .game-actions {
    display: flex;
    align-items: center;
  }

  .game-header {
    justify-content: space-between;
    gap: 0.75rem;
    margin: 0.05rem 0 0.5rem;
    padding: 0 0.15rem;
  }

  strong {
    display: block;
    color: #1d3158;
    font-size: 0.75rem;
    line-height: 1;
  }

  .game-header.is-failed strong {
    color: #c63330;
    animation: status-alert 480ms cubic-bezier(0.22, 1, 0.36, 1) both;
  }

  .game-actions {
    gap: 0.25rem;
  }

  .counter {
    min-width: 1.65rem;
    color: #53719e;
    font-size: 0.56rem;
    font-weight: 800;
    text-align: right;
  }

  .flag-toggle,
  .play-again {
    display: grid;
    height: 1.42rem;
    place-items: center;
    padding: 0;
    border: 1px solid #b8bfd0;
    border-radius: 0.25rem;
    background: rgb(255 255 255 / 85%);
    color: #355387;
    cursor: pointer;
    font: inherit;
    line-height: 1;
  }

  .flag-toggle {
    width: 1.42rem;
    font-size: 0.76rem;
  }

  .play-again {
    padding: 0 0.36rem;
    color: #285cae;
    font-size: 0.48rem;
    font-weight: 800;
    white-space: nowrap;
  }

  .game-header.is-failed .play-again {
    border-color: #e17870;
    background: #fff0ed;
    color: #c63330;
    animation: status-alert 480ms 80ms cubic-bezier(0.22, 1, 0.36, 1) both;
  }

  .flag-toggle.is-active {
    border-color: #e0463f;
    background: #ffebe6;
    color: #d33430;
  }

  @keyframes status-alert {
    0% {
      opacity: 0;
      transform: translateX(-0.3rem) scale(0.96);
    }

    65% {
      transform: translateX(0.08rem) scale(1.03);
    }

    100% {
      opacity: 1;
      transform: translateX(0) scale(1);
    }
  }

  .calendar-shell {
    display: flex;
    min-height: 0;
    flex: 1;
    flex-direction: column;
    overflow: hidden;
    border: 1px solid rgb(16 32 65 / 28%);
    border-radius: 0.42rem;
    background: rgb(255 255 255 / 76%);
    box-shadow: 0 0.16rem 0 rgb(18 47 93 / 14%);
  }

  .weekdays,
  .calendar {
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
  }

  .weekdays {
    flex: 0 0 auto;
    padding: 0.36rem 0.26rem 0.24rem;
    border-bottom: 1px solid rgb(49 92 160 / 14%);
    color: #587098;
    font-size: 0.46rem;
    font-weight: 800;
    text-align: center;
  }

  .calendar-scroll {
    min-height: 0;
    flex: 1;
    overflow-y: auto;
  }

  .calendar {
    gap: 1px;
    min-height: 100%;
    background: rgb(49 92 160 / 13%);
  }

  .calendar-cell {
    position: relative;
    display: grid;
    aspect-ratio: 1.24;
    min-width: 0;
    place-items: center;
    padding: 0;
    border: 0;
    background: linear-gradient(135deg, #e8f2ff, #d9e8fa);
    box-shadow: inset 0 1px rgb(255 255 255 / 88%);
    color: #2458ae;
    cursor: pointer;
    font: inherit;
    font-size: 0.76rem;
    font-weight: 900;
  }

  time {
    position: absolute;
    top: 0.19rem;
    left: 0.24rem;
    color: #55719d;
    font-size: 0.44rem;
    font-weight: 800;
    line-height: 1;
  }

  .calendar-cell.is-today time {
    display: grid;
    width: 0.73rem;
    height: 0.73rem;
    place-items: center;
    border-radius: 50%;
    background: #2864cd;
    color: white;
  }

  .calendar-cell.is-revealed {
    background: #f6f3e9;
    box-shadow: inset 0 1px #dfdcd1;
  }

  .calendar-cell.is-flagged {
    color: #df3e39;
  }

  .calendar-cell.is-meeting {
    background: #f3f1e8;
  }

  .calendar-cell.meeting--meet {
    background: #e7f6eb;
  }

  .calendar-cell.meeting--teams {
    background: #eeedff;
  }

  .calendar-cell.meeting--zoom {
    background: #e6f2ff;
  }

  .cell-value {
    display: grid;
    margin-top: 0.28rem;
    place-items: center;
  }

  .meeting-icon {
    width: 1rem;
    height: 1rem;
  }

  .calendar-cell:focus-visible,
  .flag-toggle:focus-visible,
  .play-again:focus-visible {
    z-index: 1;
    outline: 2px solid #ff5e51;
    outline-offset: -2px;
  }

  @media (max-width: 380px) {
    .tickspot-game {
      padding: 0.48rem;
    }

    .calendar-cell {
      aspect-ratio: 1.08;
    }

    time {
      top: 0.13rem;
      left: 0.16rem;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .game-header.is-failed strong,
    .game-header.is-failed .play-again {
      animation: none;
    }
  }
</style>
