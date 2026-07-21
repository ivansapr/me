import { describe, expect, it } from 'vitest';
import type { ProjectDefinition } from '$lib/types/projects';
import { projects, validateProjectRegistry } from './registry';

describe('project registry', () => {
  it('contains the initial projects in stable order', () => {
    expect(projects.map((project) => project.slug)).toEqual([
      'fitness-tracker',
      'chord-notes'
    ]);
  });

  it('accepts the production registry', () => {
    expect(() => validateProjectRegistry(projects)).not.toThrow();
  });

  it('rejects duplicate slugs and non-HTTPS links', () => {
    const sample = {
      slug: 'sample',
      title: 'Sample',
      description: 'Sample',
      href: 'https://example.com',
      order: 1,
      theme: { background: '#fff', foreground: '#000', accent: '#000' },
      visual: {} as ProjectDefinition['visual']
    } satisfies ProjectDefinition;
    const duplicate = [sample, sample];
    expect(() => validateProjectRegistry(duplicate)).toThrow(
      'Duplicate project slug'
    );
    expect(() =>
      validateProjectRegistry([
        { ...sample, href: 'http://example.com' as `https://${string}` }
      ])
    ).toThrow('HTTPS');
  });
});
