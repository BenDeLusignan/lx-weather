import "server-only";
import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { secretHmac } from "@/auth/secret";

/**
 * Stateless session: an HMAC-signed cookie holding the user id, an expiry and
 * a fingerprint of their password hash. Signed, not encrypted: the contents
 * aren't secret, they just can't be altered without SESSION_SECRET.
 *
 * The fingerprint ties the cookie to the password it was issued under: once a
 * user's hash changes, old cookies stop matching. Rotating SESSION_SECRET logs
 * everyone out.
 */

const COOKIE_NAME = "lx_weather_session";
const SESSION_DAYS = 30;
export const SESSION_SECONDS = SESSION_DAYS * 24 * 60 * 60;

export interface SessionPayload {
  /** User id. */
  sub: number;
  /** Expiry, Unix seconds. Checked on every read; the cookie's Max-Age is only a hint to the browser. */
  exp: number;
  /** `passwordFingerprint` of the user's hash when the session started. */
  pwd: string;
}

// The purpose prefix keeps the HMAC uses apart, so a signature can never be
// passed off as a fingerprint or an attempt key, or the other way round.
export function passwordFingerprint(passwordHash: string): string {
  return secretHmac("password", passwordHash);
}

export function signSession(payload: SessionPayload): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${secretHmac("session", body)}`;
}

/** The payload if the token is authentic and unexpired, otherwise null. */
export function verifySession(token: string, nowSeconds = Date.now() / 1000): SessionPayload | null {
  const [body, signature, ...rest] = token.split(".");
  if (!body || !signature || rest.length > 0) return null;

  const expected = Buffer.from(secretHmac("session", body));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;

  // The signature proves we wrote this body, so a parse failure or a wrong
  // shape means a SESSION_SECRET mix-up or an old format: treat as logged out.
  let payload: unknown;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (typeof payload !== "object" || payload === null) return null;
  const { sub, exp, pwd } = payload as Record<string, unknown>;
  if (typeof sub !== "number" || !Number.isSafeInteger(sub)) return null;
  if (typeof exp !== "number" || typeof pwd !== "string") return null;
  return exp > nowSeconds ? { sub, exp, pwd } : null;
}

/** Only from a Server Action or Route Handler: cookies can't be set while rendering. */
export async function startSession(user: { id: number; passwordHash: string }): Promise<void> {
  const token = signSession({
    sub: user.id,
    exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS,
    pwd: passwordFingerprint(user.passwordHash),
  });
  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    // Browsers accept Secure cookies on http://localhost, so this only
    // matters for a hosted production site, where it keeps the cookie off
    // plain HTTP.
    secure: process.env.NODE_ENV === "production",
    // Lax: sent when following a link to the site, not on cross-site POSTs.
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_SECONDS,
  });
}

/** Only from a Server Action or Route Handler. */
export async function endSession(): Promise<void> {
  (await cookies()).delete(COOKIE_NAME);
}

/** The current request's verified session, or null. Reading it makes the caller request-time. */
export async function readSession(): Promise<SessionPayload | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  return token ? verifySession(token) : null;
}
