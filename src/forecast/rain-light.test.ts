import assert from "node:assert/strict";
import { test } from "node:test";
import { rainLight } from "./rain-light";

test("light boundaries: 30 and under green, 31 to 70 inclusive yellow, over 70 red", () => {
  assert.equal(rainLight(0), "green");
  assert.equal(rainLight(30), "green");
  assert.equal(rainLight(31), "yellow");
  assert.equal(rainLight(39), "yellow");
  assert.equal(rainLight(55), "yellow");
  assert.equal(rainLight(70), "yellow");
  assert.equal(rainLight(71), "red");
  assert.equal(rainLight(100), "red");
});

test("the light follows the whole-number % shown, so number and colour agree", () => {
  assert.equal(rainLight(30.4), "green"); // shows 30
  assert.equal(rainLight(30.5), "yellow"); // shows 31
  assert.equal(rainLight(70.4), "yellow"); // shows 70
  assert.equal(rainLight(70.5), "red"); // shows 71
});

test("no chance of rain gives no colour, never a guess", () => {
  assert.equal(rainLight(null), null);
});
