// Password-protects /private/*. Set PRIVATE_PASSWORD (and optionally PRIVATE_USER)
// in Netlify: Site configuration > Environment variables. Fails closed if unset.
export default async (request, context) => {
  const pass = Netlify.env.get("PRIVATE_PASSWORD");
  const user = Netlify.env.get("PRIVATE_USER") || "hitesh";
  const deny = (status, msg) =>
    new Response(msg, { status, headers: { "WWW-Authenticate": 'Basic realm="Private area", charset="UTF-8"', "Cache-Control": "no-store" } });
  if (!pass) return new Response("Private area is not configured yet.", { status: 503, headers: { "Cache-Control": "no-store" } });
  const h = request.headers.get("authorization") || "";
  if (h.startsWith("Basic ")) {
    try {
      const [u, ...rest] = atob(h.slice(6)).split(":");
      if (u === user && rest.join(":") === pass) {
        const res = await context.next();
        res.headers.set("Cache-Control", "private, no-store");
        res.headers.set("X-Robots-Tag", "noindex, nofollow");
        return res;
      }
    } catch {}
  }
  return deny(401, "Authentication required");
};
export const config = { path: ["/private", "/private/*"] };
