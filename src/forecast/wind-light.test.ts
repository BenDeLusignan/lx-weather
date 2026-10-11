import assert from "node:assert/strict";
import { test } from "node:test";
import { windLight } from "./wind-light";

test("light boundaries: under 10 green, 10 to 15 inclusive yellow, over 15 red", () => {
  assert.equal(windLight(0), "green");
  assert.equal(windLight(9), "green");
  assert.equal(windLight(10), "yellow");
  assert.equal(windLight(15), "yellow");
  assert.equal(windLight(16), "red");
  assert.equal(windLight(40), "red");
});

test("the light follows the whole-number mph shown, so number and colour agree", () => {
  assert.equal(windLight(9.4), "green"); // shows 9
  assert.equal(windLight(9.5), "yellow"); // shows 10
  assert.equal(windLight(15.4), "yellow"); // shows 15
  assert.equal(windLight(15.5), "red"); // shows 16
});

test("no wind figure gives no colour, never a guess", () => {
  assert.equal(windLight(null), null);
});
