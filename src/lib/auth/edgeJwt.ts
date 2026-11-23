// HS256 JWT verification with Web Crypto so middleware (Edge runtime) can check the signature, not just the token shape.

const b64urlToBytes = (value: string): Uint8Array => {
  const b64 = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const bin = atob(b64);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
};

export async function verifyJwtHs256(token: string, secret: string, nowSec = Math.floor(Date.now() / 1000)): Promise<boolean> {
  const parts = token.split(".");
  if (parts.length !== 3 || !secret) return false;
  try {
    const header = JSON.parse(new TextDecoder().decode(b64urlToBytes(parts[0])));
    if (header?.alg !== "HS256") return false;
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
    const valid = await crypto.subtle.verify("HMAC", key, b64urlToBytes(parts[2]) as BufferSource, new TextEncoder().encode(`${parts[0]}.${parts[1]}`));
    if (!valid) return false;
    const payload = JSON.parse(new TextDecoder().decode(b64urlToBytes(parts[1])));
    return typeof payload?.exp === "number" && payload.exp > nowSec;
  } catch {
    return false;
  }
}
