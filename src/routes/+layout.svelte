<script lang="ts">
  import { env } from '$env/dynamic/public';

  let { children } = $props();
  const umamiScriptUrl = env.PUBLIC_UMAMI_SCRIPT_URL;
  const umamiWebsiteId = env.PUBLIC_UMAMI_WEBSITE_ID;
  const umamiDomains = env.PUBLIC_UMAMI_DOMAINS;
</script>

<svelte:head>
  <script
    defer
    src={umamiScriptUrl || undefined}
    data-website-id={umamiWebsiteId || undefined}
    data-domains={umamiDomains || undefined}
  ></script>
</svelte:head>

{@render children()}
