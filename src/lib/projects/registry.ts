import type { ProjectDefinition } from '$lib/types/projects';

export const projects: readonly ProjectDefinition[] = [];

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
