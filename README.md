# Ivan Saprykin — Web/Mobile Developer

Personal bookshelf for small web and mobile experiments.

## Development

```sh
npm install
npm run dev
```

Copy `.env.example` to `.env` to configure the self-hosted Umami tracker. The page remains fully functional when the Umami variables are omitted.

## Checks

```sh
npm run check
npm run lint
npm test
npm run build
```

## Coolify

Deploy with the included Dockerfile. Coolify should expose container port `3000`, configure `PUBLIC_SITE_URL` and the optional `PUBLIC_UMAMI_*` variables, and use `/healthz` as the health path. Set `ORIGIN` to the public site URL when required by the reverse proxy.
