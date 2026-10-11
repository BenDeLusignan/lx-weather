import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "@/data/limits";

/**
 * The rule for a password being set (sign-up, and the new password when
 * changing it). One source of truth: the server enforces it with
 * `passwordMeetsRules` and the browser's live checklist reads the same list,
 * so the two can't disagree. Pure (no `server-only`) so a client component
 * can import it. Never applied to log in or to the "current password" field:
 * accounts made under an older rule keep working.
 *
 * The definitions are the team's reading of Ben's request (11 Oct 2026):
 * a number is a decimal digit (0-9); a capital is any uppercase letter
 * (Unicode `Lu`, so "É" counts); a symbol is any character that is not a
 * letter, a combining mark, a digit or whitespace (so `#`, `_` and emoji
 * count, a space or a decomposed accent doesn't).
 */
export interface PasswordRule {
  id: "length" | "number" | "capital" | "symbol";
  label: string;
  met(password: string): boolean;
}

/** In display order. */
export const PASSWORD_RULES: readonly PasswordRule[] = [
  {
    id: "length",
    label: `At least ${PASSWORD_MIN_LENGTH} characters`,
    met: (password) => password.length >= PASSWORD_MIN_LENGTH,
  },
  { id: "number", label: "At least one number", met: (password) => /[0-9]/.test(password) },
  { id: "capital", label: "At least one capital letter", met: (password) => /\p{Lu}/u.test(password) },
  // \p{M}: a combining accent ("e" + U+0301) is part of a letter, not a symbol.
  { id: "symbol", label: "At least one symbol", met: (password) => /[^\p{L}\p{M}\p{N}\s]/u.test(password) },
];

/**
 * The whole rule in one phrase, for the error messages of the two server
 * pages ("Use a password of ..."). Beside `PASSWORD_RULES`; a test checks it
 * still names every rule.
 */
export const PASSWORD_REQUIREMENT = `at least ${PASSWORD_MIN_LENGTH} characters with a number, a capital letter and a symbol`;

/**
 * Every rule met, and not longer than the cap (which bounds what scrypt has
 * to chew on; the checklist doesn't show it, the forms' `maxLength` stops it).
 */
export function passwordMeetsRules(password: string): boolean {
  return password.length <= PASSWORD_MAX_LENGTH && PASSWORD_RULES.every((rule) => rule.met(password));
}
