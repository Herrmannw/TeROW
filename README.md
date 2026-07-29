# TeROW Land Management Services

One-page Astro website deployed as a static GitHub Pages site.

Preview URL: <https://herrmannw.github.io/TeROW/>

## Update before launch

Replace the demonstration contact, service-area, credential, and social-link
values in `src/data/site.ts`.

## Build

```sh
npm install
npm run build
```

## Deploy

Push to `main` to run `.github/workflows/deploy.yml`.

For the first deployment, open the repository's **Settings → Pages** screen
and select **GitHub Actions** as the source. Future pushes to `main` deploy
automatically.
