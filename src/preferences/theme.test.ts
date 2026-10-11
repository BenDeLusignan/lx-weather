import assert from "node:assert/strict";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import { THEME_BOOT_SCRIPT, THEME_COOKIE, applyTheme, type ThemeDocument } from "./theme";

/** A stand-in page: records <html data-theme> and runs the head script against a given cookie header. */
function page(cookie: string) {
  const attributes = new Map<string, string>();
  const documentElement = {
    setAttribute: (name: string, value: string) => void attributes.set(name, value),
    removeAttribute: (name: string) => void attributes.delete(name),
  };
  const doc = { cookie, documentElement };
  return { doc, attributes };
}

function themeAfterBoot(cookie: string): string | undefined {
  const { doc, attributes } = page(cookie);
  runInNewContext(THEME_BOOT_SCRIPT, { document: doc });
  return attributes.get("data-theme");
}

test("the head script sets data-theme from the cookie, for light and dark", () => {
  assert.equal(themeAfterBoot(`${THEME_COOKIE}=dark`), "dark");
  assert.equal(themeAfterBoot(`${THEME_COOKIE}=light`), "light");
  assert.equal(themeAfterBoot(`a=1; ${THEME_COOKIE}=dark; b=2`), "dark", "among other cookies");
  assert.equal(themeAfterBoot(`${THEME_COOKIE}=light; b=2`), "light", "first of several");
});

test("no cookie, or anything but light and dark, leaves the attribute off so the device decides", () => {
  for (const cookie of ["", "a=1", `${THEME_COOKIE}=`, `${THEME_COOKIE}=system`, `${THEME_COOKIE}=Dark`, `${THEME_COOKIE}=darker`, `x${THEME_COOKIE}=dark`, `${THEME_COOKIE}=dark"><script>`]) {
    assert.equal(themeAfterBoot(cookie), undefined, cookie);
  }
});

test("the head script never throws, even with no cookie access", () => {
  runInNewContext(THEME_BOOT_SCRIPT, { document: {} });
  runInNewContext(THEME_BOOT_SCRIPT, {
    document: {
      get cookie(): string {
        throw new Error("blocked");
      },
    },
  });
});

test("applyTheme sets the attribute and cookie for light and dark, and clears both for system", () => {
  const { doc, attributes } = page("");
  applyTheme(doc as ThemeDocument, "dark", false);
  assert.equal(attributes.get("data-theme"), "dark");
  assert.match(doc.cookie, new RegExp(`^${THEME_COOKIE}=dark; Max-Age=31536000; Path=/; SameSite=Lax$`));

  applyTheme(doc as ThemeDocument, "light", true);
  assert.equal(attributes.get("data-theme"), "light");
  assert.match(doc.cookie, /; Secure$/, "Secure on https");

  applyTheme(doc as ThemeDocument, "system", false);
  assert.equal(attributes.has("data-theme"), false);
  assert.match(doc.cookie, new RegExp(`^${THEME_COOKIE}=; Max-Age=0`));
});
