# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # start dev server
npm run build     # production build (adapter-vercel → .vercel/output/)
npm run preview   # preview production build
npm run check     # svelte-kit sync + svelte-check type checking
```

If `.svelte-kit/tsconfig.json` is missing (fresh clone), run `npx svelte-kit sync` before type checking.

## Environment variables

Copy `.env.example` to `.env` and fill in. All are private, server-side only, and read via SvelteKit's `$env/dynamic/private`.

| Variable | Used in | Notes |
|----------|---------|-------|
| `TRIPO_API_KEY` | `src/lib/tripoApi.ts`, `src/routes/api/rig-fbx/[id]/+server.ts` | Required. Tripo3D is the only 3D engine (model generation and rigging) |
| `OPENAI_API_KEY` | `src/lib/openaiImage.ts` | 2D preview image engine; at least one of OpenAI/Gemini is required |
| `GEMINI_API_KEY` | `src/lib/geminiImage.ts` | 2D preview image engine; at least one of OpenAI/Gemini is required |
| `IMAGE_ENGINE` | `src/routes/api/generate-2d/+server.ts` | Optional, `openai` (default) or `gemini`. Falls back to whichever engine has a key |

## Architecture

SvelteKit 2 app built with `@sveltejs/adapter-vercel` and deployed to Vercel. It generates a "testing ninja" character: a 2D preview image first, then a rigged 3D model.

1. **`/` (home, `src/routes/+page.svelte`)**: renders `QuestionWizard`, which collects `NinjaAnswers` (gender, specialty, weapon, rank, style, clan).
2. On completion the page POSTs to **`/api/generate-2d`**, which builds a prompt with `buildNinjaPrompt()` and generates a preview image with OpenAI or Gemini.
3. The user picks an animation (`idle` / `jump` / `kick`), and the page POSTs the answers plus the preview `imageUrl` to **`/api/generate`**. That route starts a Tripo image-to-3D task (or text-to-3D when there is no image) and returns `{ taskId, ... }`.
4. The user is redirected to **`/ninja/[id]`**, which polls **`/api/status/[id]`**, then calls **`/api/rig/[id]`** (Tripo `animate_rig`, `spec: 'mixamo'`) and polls the rig task.
5. The rigged GLB is loaded through **`/api/proxy`**, which only allows the Tripo asset host, and rendered in `NinjaScene` → `AnimatedNinja` with Threlte (`@threlte/core` + `@threlte/extras`). Animations are hand-coded (no paid animation API), so keep the Mixamo rig spec: `AnimatedNinja` finds limbs by Mixamo bone names.

## Key files

| File | Purpose |
|------|---------|
| `src/lib/ninjaPrompt.ts` | `NinjaAnswers` / `NinjaAnimation` types, attribute→prompt maps, `buildNinjaPrompt()`, `questions` (wizard), `animationOptions` |
| `src/lib/tripoApi.ts` | Tripo v2 API: text-to-3D, image upload, image-to-3D, rigging, status |
| `src/lib/openaiImage.ts` / `src/lib/geminiImage.ts` | 2D preview image generation |
| `src/components/QuestionWizard.svelte` | Step-through form; dispatches `complete` with `NinjaAnswers` |
| `src/components/NinjaScene.svelte` (+ `NinjaScene.css`) | Threlte canvas that renders the GLB model |
| `src/components/AnimatedNinja.svelte` | Used by `NinjaScene`: loads the GLTF and animates its limb bones in code for the selected `animation` |
| `src/components/SmokeAnimation.svelte` | Smoke reveal effect used on home and ninja pages |
| `src/routes/api/generate-2d/+server.ts` | POST: 2D preview image |
| `src/routes/api/generate/+server.ts` | POST: start Tripo 3D task (image or text) |
| `src/routes/api/status/[id]/+server.ts` | GET: Tripo task status (model or rig) |
| `src/routes/api/rig/[id]/+server.ts` | POST: start Tripo rigging |
| `src/routes/api/rig-fbx/[id]/+server.ts` | POST: Tripo FBX (Mixamo) rig; not currently called from the UI |
| `src/routes/api/proxy/+server.ts` | GET: allow-listed proxy for model files (optional `download` filename) |

## Deploying to Vercel

- `svelte.config.js` uses `@sveltejs/adapter-vercel` **v6**. v7+ requires SvelteKit 3, so don't upgrade it without upgrading Kit.
- In the Vercel project settings, the Framework Preset should be **SvelteKit**. Leave the Output Directory empty: the adapter writes `.vercel/output`.
- Add `TRIPO_API_KEY`, `OPENAI_API_KEY` and/or `GEMINI_API_KEY`, and optionally `IMAGE_ENGINE`, under Project Settings → Environment Variables.
- Vercel Functions cap request bodies at 4.5 MB. The 2D preview POSTed to `/api/generate` (about 1.5 MB) fits. `/api/proxy` streams its response, and streamed responses aren't subject to the 4.5 MB response limit, so the ~44 MB GLB still loads.

## Notes

- The codebase uses **Svelte 4 syntax** (`export let`, `createEventDispatcher`, `on:event`) even though Svelte 5 is installed. Don't migrate to runes unless that's the goal.
- `hooks/read_hook.js` blocks Claude from reading `.env` files.
- No test suite exists yet.
