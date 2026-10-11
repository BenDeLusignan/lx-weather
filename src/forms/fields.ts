import { EMAIL_MAX_LENGTH } from "@/data/limits";

/**
 * Parsing for Server Action form fields. Server Actions are public POST
 * endpoints, so every field is `unknown` until checked here: it may be
 * missing, a File, or anything a hand-made request sends.
 */

/**
 * An email address: one `@` with something on either side, a dot in the
 * domain, no spaces, at most `EMAIL_MAX_LENGTH`. Trimmed and lowercased,
 * the form the `user` table stores. Deliberately not a full RFC 5322 check:
 * it only needs to be an address a person can read back. Null if any check
 * fails.
 */
export function parseEmail(value: unknown): string | null {
  // The length cap bounds the string work before it starts.
  if (typeof value !== "string" || value.length > EMAIL_MAX_LENGTH) return null;
  const email = value.trim().toLowerCase();
  if (email.length < 3 || /\s/.test(email)) return null;
  const at = email.indexOf("@");
  if (at < 1 || email.indexOf("@", at + 1) !== -1) return null;
  // "a@b" and "a@.com" are out; "ben+tag@example.co.uk" is in.
  const domain = email.slice(at + 1);
  const dot = domain.indexOf(".");
  if (dot < 1 || dot === domain.length - 1) return null;
  return email;
}
