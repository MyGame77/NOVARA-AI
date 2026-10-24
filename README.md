# NOVARA AI

## Deployment
- GitHub Pages serves `index.html`, `style.css`, and `app.js`.
- Cloudflare Workers runs `worker.js` using `wrangler.jsonc`.
- Set `GEMINI_API_KEY` as a Cloudflare Worker **secret**. Never commit the key.
- The Worker currently allows `https://mygame77.github.io` and local development origins.
- Frontend API endpoint is configured in `app.js`.

Deploy the Worker from this repository using `npx wrangler deploy`. Confirm the Cloudflare build uses `wrangler.jsonc` and deploys the `worker.js` entry point, not a static-only deployment.
