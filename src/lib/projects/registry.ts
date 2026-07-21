import ChordNotesCard from './ChordNotesCard.svelte';
import FitnessCard from './FitnessCard.svelte';
import type { ProjectDefinition } from '$lib/types/projects';

export const projects = [
  {
    slug: 'fitness-tracker',
    title: 'Fitness Tracker',
    description: 'A small PWA for keeping strength training honest.',
    href: 'https://fitness.example.com',
    order: 1,
    theme: { background: '#d9f26b', foreground: '#101010', accent: '#101010' },
    visual: FitnessCard
  },
  {
    slug: 'chord-notes',
    title: 'Chord / Notes Learner',
    description:
      'A tactile way to learn notes and chords with a MIDI keyboard.',
    href: 'https://chords.example.com',
    order: 2,
    theme: { background: '#f5a8d0', foreground: '#101010', accent: '#101010' },
    visual: ChordNotesCard
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
