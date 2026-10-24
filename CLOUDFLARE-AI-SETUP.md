# NOVARA AI — Cloudflare Workers AI setup

This adaptation keeps NOVARA AI's original `index.html`, `style.css`, and `app.js` unchanged. The backend is adapted from the uploaded Azure AI project's Cloudflare Workers AI approach, but its assistant identity is NOVARA AI and it does not require the separate GitHub knowledge repository/token.

## Configuration

- `worker.js` is the Worker entry point.
- `wrangler.jsonc` declares the `AI` Workers AI binding.
- The frontend sends `POST` JSON `{ "message": "..." }` to the Worker root, and the Worker returns `{ "reply": "..." }`.
- The Worker also accepts a `messages` array for compatibility with chat-history clients.

## Deploy

1. Commit `worker.js` and `wrangler.jsonc` to the NOVARA-AI repository.
2. In the Cloudflare dashboard, open the `novara-ai` Worker and confirm its Workers AI binding is named `AI`.
3. Deploy the latest Worker.
4. Test `https://novara-ai.mygame77123.workers.dev/status` and then send a chat message from GitHub Pages.

If a chat request fails, the JSON response includes a `details` field to help diagnose model, binding, or account-limit errors. Do not put secrets in frontend files or commit them to GitHub.
