import type { Component } from 'svelte';

export type ProjectCardTheme = {
  background: string;
  foreground: string;
  accent: string;
};

export type ProjectCardVisualProps = {
  theme: ProjectCardTheme;
};

export type ProjectDefinition = {
  slug: string;
  title: string;
  description: string;
  href: `https://${string}`;
  order: number;
  theme: ProjectCardTheme;
  visual: Component<ProjectCardVisualProps>;
};
