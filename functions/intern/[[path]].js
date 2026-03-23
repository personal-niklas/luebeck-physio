// Passwortschutz für /intern/ — Cloudflare Pages Function
// Nutzt HTTP Basic Auth (serverseitig, sicher)

const VALID_PASSWORD = "PhysioOne2026!";
const REALM = "Physio One Team Wiki";

function unauthorized() {
  return new Response("Zugang nur für Mitarbeiter.", {
    status: 401,
    headers: {
      "WWW-Authenticate": `Basic realm="${REALM}"`,
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}

export async function onRequest(context) {
  const auth = context.request.headers.get("Authorization");

  if (!auth || !auth.startsWith("Basic ")) {
    return unauthorized();
  }

  const decoded = atob(auth.slice(6));
  const password = decoded.includes(":") ? decoded.split(":").slice(1).join(":") : decoded;

  if (password !== VALID_PASSWORD) {
    return unauthorized();
  }

  return context.next();
}
