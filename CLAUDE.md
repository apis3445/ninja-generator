# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # start dev server (also runs svelte-kit sync)
npm run build     # production build
npm run preview   # preview production build
npm run check     # svelte-check + type checking
```

If `.svelte-kit/tsconfig.json` is missing (fresh clone), run `npx svelte-kit sync` before type checking.

## Environment variables

Copy `.env.example` to `.env` and fill in:

- `MESHY_API_KEY` — required; used server-side in `src/lib/meshyApi.ts`
- `PUBLIC_SUPABASE_URL` / `PUBLIC_SUPABASE_ANON_KEY` — Supabase is a dependency but not yet wired up in the app
- `TRIPO_API_KEY` — present in `.env.example`, not yet used

## Architecture

This is a SvelteKit app deployed to Vercel (`@sveltejs/adapter-vercel`). The core flow:

1. **`/` (home)** — renders `QuestionWizard`, a 5-step form collecting dragon attributes (element, personality, size, color, age).
2. On wizard completion, the page POSTs `DragonAnswers` to **`/api/generate`**, which builds a text prompt via `src/lib/dragonPrompt.ts` and submits it to the Meshy AI text-to-3D API. Returns a `taskId`.
3. The user is redirected to **`/dragon/[id]`**, which polls **`/api/status/[id]`** every 3 seconds until the Meshy task reaches `succeeded` or `failed` (generation takes 30–120 seconds).
4. On success, the page renders the GLB model URL in **`DragonScene`** using Threlte (`@threlte/core` + `@threlte/extras`) — a Three.js wrapper for Svelte.

## Key files

| File | Purpose |
|------|---------|
| `src/lib/dragonPrompt.ts` | `DragonAnswers` type, attribute→prompt-text maps, `buildDragonPrompt()`, and the `questions` array driving the wizard |
| `src/lib/meshyApi.ts` | `createDragon(prompt)` and `getDragonStatus(taskId)` — thin wrappers around the Meshy v2 REST API |
| `src/components/QuestionWizard.svelte` | Step-through form; dispatches `complete` event with final `DragonAnswers` |
| `src/components/DragonScene.svelte` | Full-screen Threlte canvas with orbit controls, auto-rotation, and GLTF loader |
| `src/routes/api/generate/+server.ts` | POST handler — builds prompt, calls Meshy, returns `{ taskId, prompt }` |
| `src/routes/api/status/[id]/+server.ts` | GET handler — proxies Meshy task status |

## Deploying to Google Cloud Run (no Docker required)

Cloud Run's source deployment uses Google Cloud Build to build and containerize the app — no local Docker needed. The existing `gcp-build` npm script is the build hook Cloud Build calls automatically.

**One-time setup**

```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
gcloud services enable run.googleapis.com cloudbuild.googleapis.com
```

**Deploy**

```bash
npm run deploy
```

This runs `gcloud run deploy ninja-generator --source . --region us-central1 --allow-unauthenticated --port 3000`. Cloud Build installs dependencies, runs `npm run gcp-build` (which runs `npm run build`), then deploys the resulting Node.js server (`build/index.js`).

**Set environment variables**

After the first deploy, set secrets via the Console or CLI:

```bash
# Set MESHY_API_KEY from your local .env
npm run deploy:env

# Or set manually
gcloud run services update ninja-generator \
  --region us-central1 \
  --update-env-vars MESHY_API_KEY=your_key_here
```

**Redeploy after code changes**

```bash
npm run deploy
```

Source deploys are incremental — only changed source files are re-uploaded.

## Notes

- The codebase uses **Svelte 4 syntax** (`export let`, `createEventDispatcher`, `on:event`) despite Svelte 5 being installed. Avoid migrating to runes unless intentional.
- `MESHY_API_KEY` is accessed via `process.env` in `meshyApi.ts` — this only runs server-side (API routes). Public env vars use SvelteKit's `$env/static/public` convention; private vars use `$env/static/private` (not yet adopted here).
- No test suite exists yet.
