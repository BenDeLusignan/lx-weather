import assert from "node:assert/strict";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import { STANDALONE_BOOT_SCRIPT } from "./standalone";

/** Runs the head script in a stand-in page and reports whether it marked <html>. */
function marked(context: { navigator?: object; window?: object }): boolean {
  let set = false;
  const document = { documentElement: { setAttribute: (name: string) => void (set = name === "data-standalone") } };
  runInNewContext(STANDALONE_BOOT_SCRIPT, { document, ...context });
  return set;
}

const media = (matches: boolean) => ({ matchMedia: () => ({ matches }) });

test("an iPhone Home Screen launch (navigator.standalone) is marked", () => {
  assert.equal(marked({ navigator: { standalone: true }, window: media(false) }), true);
});

test("display-mode: standalone is marked too", () => {
  assert.equal(marked({ navigator: {}, window: media(true) }), true);
});

test("a browser tab is not marked", () => {
  assert.equal(marked({ navigator: { standalone: false }, window: media(false) }), false);
  assert.equal(marked({ navigator: {}, window: media(false) }), false);
});

test("a page with neither API does not throw and is not marked", () => {
  assert.equal(marked({}), false);
});
