// Cloudflare Worker: keeps your Meshy API key off the website and relays requests.
//
// Secrets (set with `wrangler secret put NAME`):
//   MESHY_API_KEY  your Meshy API key
//   ACCESS_CODE    any passphrase; the web page sends it so strangers can't spend your credits
// Variable (wrangler.toml):
//   ALLOWED_ORIGIN comma-separated site origins allowed to call this worker

const MESHY = "https://api.meshy.ai/openapi/v1";
const MODELS = new Set(["latest", "meshy-6"]);

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";
    const allowed = (env.ALLOWED_ORIGIN || "").split(",").map(s => s.trim()).filter(Boolean);
    const originOk = allowed.includes(origin);
    const cors = {
      "Access-Control-Allow-Origin": originOk ? origin : (allowed[0] || ""),
      "Access-Control-Allow-Headers": "Content-Type, X-Access-Code",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Vary": "Origin",
    };
    const json = (obj, status = 200) =>
      new Response(JSON.stringify(obj), { status, headers: { ...cors, "Content-Type": "application/json" } });

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (!originOk) return json({ error: "Origin not allowed." }, 403);
    if (env.ACCESS_CODE && request.headers.get("X-Access-Code") !== env.ACCESS_CODE) {
      return json({ error: "Bad access code." }, 401);
    }
    if (!env.MESHY_API_KEY) return json({ error: "Worker is missing MESHY_API_KEY." }, 500);
    const auth = { Authorization: `Bearer ${env.MESHY_API_KEY}` };

    try {
      /* ---- start a job ---- */
      if (url.pathname === "/api/create" && request.method === "POST") {
        const body = await request.json();
        const imgs = Array.isArray(body.images) ? body.images : [];
        if (imgs.length < 1 || imgs.length > 4) return json({ error: "Send 1 to 4 images." }, 400);
        if (!imgs.every(s => typeof s === "string" && s.startsWith("data:image/"))) {
          return json({ error: "Images must be data URIs." }, 400);
        }
        if (imgs.reduce((n, s) => n + s.length, 0) > 14_000_000) return json({ error: "Images are too large." }, 413);

        const multi = imgs.length > 1;
        const payload = {
          ai_model: MODELS.has(body.ai_model) ? body.ai_model : "latest",
          should_texture: false,     // shape only: best for printing, spends everything on geometry
          should_remesh: false,      // keep the highest-detail triangle mesh
          target_formats: ["glb"],
        };
        if (multi) payload.image_urls = imgs; else payload.image_url = imgs[0];

        const r = await fetch(`${MESHY}/${multi ? "multi-image-to-3d" : "image-to-3d"}`, {
          method: "POST",
          headers: { ...auth, "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await r.json().catch(() => ({}));
        if (!r.ok) return json({ error: data.message || "Model service rejected the request." }, r.status);
        return json({ id: data.result, multi });
      }

      /* ---- check a job ---- */
      if (url.pathname === "/api/status" && request.method === "GET") {
        const id = url.searchParams.get("id") || "";
        if (!/^[A-Za-z0-9_-]{8,64}$/.test(id)) return json({ error: "Bad id." }, 400);
        const multi = url.searchParams.get("multi") === "1";
        const r = await fetch(`${MESHY}/${multi ? "multi-image-to-3d" : "image-to-3d"}/${id}`, { headers: auth });
        const d = await r.json().catch(() => ({}));
        if (!r.ok) return json({ error: d.message || "Could not read job status." }, r.status);
        return json({
          status: d.status,
          progress: d.progress || 0,
          glb: d.model_urls && d.model_urls.glb ? d.model_urls.glb : null,
          error: d.task_error && d.task_error.message ? d.task_error.message : null,
        });
      }

      /* ---- fetch the finished file (browsers can't read the service's files directly) ---- */
      if (url.pathname === "/api/download" && request.method === "GET") {
        const target = new URL(url.searchParams.get("url") || "");
        if (target.protocol !== "https:" || !(target.hostname === "assets.meshy.ai" || target.hostname.endsWith(".meshy.ai"))) {
          return json({ error: "Download host not allowed." }, 400);
        }
        const r = await fetch(target.toString());
        if (!r.ok) return json({ error: "Could not download the model file." }, 502);
        return new Response(r.body, { status: 200, headers: { ...cors, "Content-Type": "application/octet-stream" } });
      }

      return json({ error: "Not found." }, 404);
    } catch (e) {
      return json({ error: "Worker error: " + (e && e.message ? e.message : e) }, 500);
    }
  },
};
