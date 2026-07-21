import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const values = process.argv.slice(2);
const args = {};
for (let index = 0; index < values.length; index += 1) {
  if (values[index].startsWith('--'))
    args[values[index].slice(2)] = values[index + 1];
}

const { slug, title, description, url } = args;
if (!slug || !title || !description || !url) {
  console.error(
    'Usage: npm run project:new -- --slug <slug> --title <title> --description <description> --url <https-url>'
  );
  process.exit(1);
}
if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))
  throw new Error('Slug must be kebab-case');
if (!url.startsWith('https://')) throw new Error('Project URL must use HTTPS');

const escape = (value) => value.replaceAll("'", "\\'");
const root = new URL('..', import.meta.url).pathname;
const projectsDir = join(root, 'src/lib/projects');
const registryPath = join(projectsDir, 'registry.ts');
const registry = await readFile(registryPath, 'utf8');
if (registry.includes(`slug: '${slug}'`))
  throw new Error(`Project already exists: ${slug}`);

const componentName = `${slug
  .split('-')
  .map((part) => part[0].toUpperCase() + part.slice(1))
  .join('')}Card`;
const componentPath = join(projectsDir, `${componentName}.svelte`);
await mkdir(projectsDir, { recursive: true });
await writeFile(
  componentPath,
  `<script lang="ts">
	import type { ProjectCardVisualProps } from '$lib/types/projects';

	let { theme }: ProjectCardVisualProps = $props();
</script>

<div class="placeholder" style:--card-background={theme.background} style:--card-accent={theme.accent}>
	<p>${escape(title)}</p>
</div>

<style>
	.placeholder { min-height: 15rem; display: grid; place-items: center; border-radius: 0.65rem; background: var(--card-background); color: var(--card-accent); }
	p { margin: 0; font-size: 0.75rem; letter-spacing: 0.08em; text-transform: uppercase; }
</style>
`
);

const importMarker = "import FitnessCard from './FitnessCard.svelte';";
const entryMarker = "\t{\n\t\tslug: 'fitness-tracker',";
const entry = `\t{\n\t\tslug: '${escape(slug)}',\n\t\ttitle: '${escape(title)}',\n\t\tdescription: '${escape(description)}',\n\t\thref: '${escape(url)}',\n\t\torder: 99,\n\t\ttheme: { background: '#e8e8e8', foreground: '#101010', accent: '#101010' },\n\t\tvisual: ${componentName}\n\t},\n`;
const updated = registry
  .replace(
    importMarker,
    `${importMarker}\nimport ${componentName} from './${componentName}.svelte';`
  )
  .replace(entryMarker, `${entry}${entryMarker}`);
await writeFile(registryPath, updated);
console.log(
  `Created ${componentPath} and registered ${slug}. Review order, theme, and visual before committing.`
);
