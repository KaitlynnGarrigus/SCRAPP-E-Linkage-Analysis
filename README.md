# Photo to 3D Print: setup

Adds a "Photo to 3D print" tool to the SCRAPP-E linkage analysis site. Users upload 1 to 4 photos, an AI service builds a detailed 3D model, and the page downloads it as an STL scaled to a chosen height, with its lowest point on the build plate.

## Why there are two parts

GitHub Pages can only host static files, and AI model generation needs a paid API key. A key placed in page code is visible to anyone, so a tiny worker holds it:

```
browser (ai-3d-model.html)  ->  Cloudflare Worker (holds the key)  ->  Meshy image-to-3D API
```

## 1. Get an API key

Create an account at https://www.meshy.ai, open the API settings, and create a key. Check which plan includes API access and how many credits one model costs.

## 2. Deploy the worker (free Cloudflare plan is enough)

```bash
npm install -g wrangler
cd worker
wrangler login
wrangler secret put MESHY_API_KEY     # paste your Meshy key
wrangler secret put ACCESS_CODE       # choose any passphrase
wrangler deploy
```

Wrangler prints an address like `https://scrappe-ai-3d.<you>.workers.dev`.

`wrangler.toml` already allows `https://kaitlynngarrigus.github.io`. To test locally, add `,http://localhost:8000` to `ALLOWED_ORIGIN`.

## 3. Add the page to the site

1. Open `ai-3d-model.html` and replace `WORKER_URL` (near the top of the script) with your worker address.
2. Copy the file into the root of the `SCRAPP-E-Linkage-Analysis` repo, next to the other tool pages.
3. Add a card or link on the home page so it appears with the other tools, for example:

```html
<a class="tool-card" href="ai-3d-model.html">
  <h3>Photo to 3D print</h3>
  <p>Turn photos into a printable STL model.</p>
</a>
```

4. The page's colours are CSS variables at the top of the `<style>` block (`--bg`, `--panel`, `--accent`, and so on). Change them to match the rest of the site. The "Back to all tools" link points to `index.html`; change it if your home page has another name.

Commit and push; GitHub Pages publishes it within a minute or two.

## 4. Using it

1. Enter the access code (saved in that browser).
2. Drop in photos. Best results: subject fully in frame, even lighting, plain background. Extra angles of the same subject improve accuracy.
3. Choose the print height and select Make 3D model. It usually takes a few minutes.
4. Inspect the model in the viewer, then download the STL.

## Printing notes

- AI meshes are often not perfectly watertight. Run your slicer's repair step (PrusaSlicer, Bambu Studio and Cura all have one), or use Meshmixer or Microsoft 3D Builder.
- Fine fur and thin ear locks can be too delicate for FDM at small sizes. Print at 150 mm or taller, or use resin.
- Eyes, tongue and any colour are not separated; the model is one shape. Paint after printing, or split parts in a mesh tool.

## Swapping the AI provider

Only `worker/worker.js` talks to the provider. The page just needs the worker to return `{ id }` from `/api/create`, `{ status, progress, glb }` from `/api/status`, and proxy the GLB through `/api/download`. Other image-to-3D services (Tripo, Rodin, Hunyuan3D through fal.ai) can be wired in the same way.

Model names and endpoints change; check https://docs.meshy.ai/api/image-to-3d if a request starts failing.
