import ChordNotesCard from './ChordNotesCard.svelte';
import FitnessCard from './FitnessCard.svelte';
import TickspotApiCard from './TickspotApiCard.svelte';
import type { ProjectDefinition } from '$lib/types/projects';

export const projects = [
  {
    slug: 'fitness-tracker',
    title: 'Fitness Tracker',
    description: 'A small PWA for keeping strength training honest.',
    href: 'https://gym.ivansapr.me',
    order: 1,
    theme: { background: '#d9f26b', foreground: '#101010', accent: '#101010' },
    visual: FitnessCard
  },
  {
    slug: 'chord-notes',
    title: 'Chord / Notes Learner',
    description:
      'A tactile way to learn notes and chords with a MIDI keyboard.',
    href: 'https://chord.ivansapr.me',
    order: 2,
    theme: { background: '#f5a8d0', foreground: '#101010', accent: '#101010' },
    visual: ChordNotesCard
  },
  {
    slug: 'tickspot-api',
    title: 'TickSpot API Wrapper',
    description: 'An API wrapper for the TickSpot time tracker.',
    href: 'https://tick.ivansapr.me',
    order: 3,
    theme: { background: '#a9d5ff', foreground: '#172554', accent: '#172554' },
    visual: TickspotApiCard
  }
] satisfies readonly ProjectDefinition[];

export function validateProjectRegistry(
  entries: readonly ProjectDefinition[]
): void {
  const slugs = new Set<string>();

  for (const entry of entries) {
    if (slugs.has(entry.slug))
      throw new Error(`Duplicate project slug: ${entry.slug}`);
    if (!/^https:\/\//.test(entry.href))
      throw new Error(`Project URL must use HTTPS: ${entry.slug}`);
    slugs.add(entry.slug);
  }
}

validateProjectRegistry(projects);
