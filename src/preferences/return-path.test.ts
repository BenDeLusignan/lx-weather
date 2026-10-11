import assert from "node:assert/strict";
import { test } from "node:test";
import { returnPath } from "./return-path";

const HOSTS = ["lx-weather.vercel.app", null];

test("the switch returns to the page it was used on, without the query", () => {
  assert.equal(returnPath("https://lx-weather.vercel.app/away/omagh", HOSTS), "/away/omagh");
  assert.equal(returnPath("https://lx-weather.vercel.app/account?saved=days", HOSTS), "/account");
  assert.equal(returnPath("https://lx-weather.vercel.app/", HOSTS), "/");
  assert.equal(returnPath("http://localhost:3100/account", ["localhost:3100"]), "/account");
});

test("no referer, an unreadable one or another site's goes to the home screen", () => {
  assert.equal(returnPath(null, HOSTS), "/");
  assert.equal(returnPath("", HOSTS), "/");
  assert.equal(returnPath("not a url", HOSTS), "/");
  assert.equal(returnPath("https://evil.example/account", HOSTS), "/");
  assert.equal(returnPath("https://lx-weather.vercel.app.evil.example/account", HOSTS), "/");
  assert.equal(returnPath("https://lx-weather.vercel.app", [null]), "/");
});

test("a path a browser would read as another site is refused", () => {
  assert.equal(returnPath("https://lx-weather.vercel.app//evil.example", HOSTS), "/");
  assert.equal(returnPath("https://lx-weather.vercel.app/\\evil.example", HOSTS), "/");
});
