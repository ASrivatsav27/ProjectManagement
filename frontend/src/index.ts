import { serve } from "bun";
import index from "./index.html";

// The backend authenticates with an httpOnly cookie (SameSite=Lax). Serving the UI and
// proxying /api from the same origin means the cookie "just works" and no CORS setup is needed.
const BACKEND_URL = (process.env.BACKEND_URL ?? "http://localhost:8000").replace(/\/$/, "");

async function proxyToBackend(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const headers = new Headers(req.headers);
  headers.delete("host");

  try {
    const upstream = await fetch(`${BACKEND_URL}${url.pathname}${url.search}`, {
      method: req.method,
      headers,
      body: req.method === "GET" || req.method === "HEAD" ? undefined : await req.arrayBuffer(),
      redirect: "manual",
    });

    // Bun already decoded the body, so the original encoding/length headers no longer apply.
    const responseHeaders = new Headers(upstream.headers);
    responseHeaders.delete("content-encoding");
    responseHeaders.delete("content-length");

    return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
  } catch {
    return Response.json({ message: `Cannot reach the API at ${BACKEND_URL}. Is the backend running?` }, { status: 502 });
  }
}

const server = serve({
  port: Number(process.env.PORT) || 3000,
  routes: {
    "/api/*": proxyToBackend,
    // Serve index.html for every other path so client-side routing works on refresh.
    "/*": index,
  },
  development: process.env.NODE_ENV !== "production" && {
    hmr: true,
    console: true,
  },
});

console.log(`Frontend running at ${server.url} (API proxied to ${BACKEND_URL})`);
