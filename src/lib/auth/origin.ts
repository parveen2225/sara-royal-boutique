/**
 * CSRF defence in depth (the session cookie is already SameSite=Lax): a state-changing request that carries an Origin
 * header must come from this same site. Requests without an Origin header (curl, server-to-server, same-site form posts
 * in old browsers) are left to the cookie rules.
 */
export function isSameOriginRequest(method: string, originHeader: string | null, hostHeader: string | null, forwardedHost?: string | null): boolean {
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return true;
  if (!originHeader) return true;
  try {
    const originHost = new URL(originHeader).host;
    return originHost === (forwardedHost || hostHeader);
  } catch {
    return false;
  }
}
