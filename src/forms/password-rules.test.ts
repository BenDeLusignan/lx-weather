import assert from "node:assert/strict";
import { test } from "node:test";
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "@/data/limits";
import { PASSWORD_REQUIREMENT, PASSWORD_RULES, passwordMeetsRules } from "./password-rules";

function rule(id: string) {
  const found = PASSWORD_RULES.find((candidate) => candidate.id === id);
  assert.ok(found, id);
  return found;
}

test("the rules come in display order", () => {
  assert.deepEqual(
    PASSWORD_RULES.map((r) => r.id),
    ["length", "number", "capital", "symbol"],
  );
});

test("the floor is 12 characters, Ben's decision of 11 Oct 2026", () => {
  assert.equal(PASSWORD_MIN_LENGTH, 12);
});

test("the requirement sentence for the server pages names every rule", () => {
  const sentence = PASSWORD_REQUIREMENT.toLowerCase();
  assert.ok(sentence.includes(String(PASSWORD_MIN_LENGTH)), "the minimum length");
  for (const noun of ["number", "capital", "symbol"]) assert.ok(sentence.includes(noun), noun);
});

test("length: 11 characters fail, 12 pass", () => {
  assert.equal(rule("length").met("x".repeat(PASSWORD_MIN_LENGTH - 1)), false);
  assert.equal(rule("length").met("x".repeat(PASSWORD_MIN_LENGTH)), true);
  assert.equal(rule("length").met(""), false);
});

test("number: a decimal digit counts, nothing else does", () => {
  assert.equal(rule("number").met("abc5def"), true);
  assert.equal(rule("number").met("0"), true);
  assert.equal(rule("number").met("Abc!def"), false);
  assert.equal(rule("number").met("abc٣def"), false, "a non-ASCII digit isn't 0-9");
});

test("capital: any uppercase letter counts, including accented ones", () => {
  assert.equal(rule("capital").met("abcDef"), true);
  assert.equal(rule("capital").met("abcÉf"), true);
  assert.equal(rule("capital").met("abcdef1!"), false);
  assert.equal(rule("capital").met("éàü"), false);
});

test("symbol: anything that isn't a letter, digit or whitespace counts", () => {
  for (const symbol of ["#", "!", "_", "-", "@", "£", "€", "😀"]) {
    assert.equal(rule("symbol").met(`abc${symbol}def`), true, symbol);
  }
  assert.equal(rule("symbol").met("abc def"), false, "a space is not a symbol");
  assert.equal(rule("symbol").met("abc\tdef\n"), false, "nor is other whitespace");
  assert.equal(rule("symbol").met("abcDEF123é"), false);
  assert.equal(rule("symbol").met("abcde\u0301f"), false, "a combining accent is part of a letter");
  assert.equal(passwordMeetsRules("Abcdefgh1e\u0301x"), false, "no real symbol, only a combining accent");
});

test("each rule judges only its own requirement", () => {
  // Only the named rule is unmet in each of these.
  const cases: [string, string][] = [
    ["length", "Ab1!"],
    ["number", "Abcdefghijk!"],
    ["capital", "abcdefghijk1!"],
    ["symbol", "Abcdefghijk1"],
  ];
  for (const [unmet, password] of cases) {
    const failing = PASSWORD_RULES.filter((r) => !r.met(password)).map((r) => r.id);
    assert.deepEqual(failing, [unmet], password);
    assert.equal(passwordMeetsRules(password), false, password);
  }
});

test("a password meeting only three of the four is refused; all four is accepted", () => {
  assert.equal(passwordMeetsRules("abcdefghijk1!"), false, "no capital");
  assert.equal(passwordMeetsRules("Abcdefghijkl!"), false, "no number");
  assert.equal(passwordMeetsRules("Abcdefghijk1"), false, "no symbol");
  assert.equal(passwordMeetsRules("Abcdefghi1!"), false, "11 characters");
  assert.equal(passwordMeetsRules("Abcdefghij1!"), true, "12 characters, all four");
});

test("the cap: exactly 1024 allowed, 1025 refused", () => {
  assert.equal(passwordMeetsRules("Ab1!".padEnd(PASSWORD_MAX_LENGTH, "x")), true);
  assert.equal(passwordMeetsRules("Ab1!".padEnd(PASSWORD_MAX_LENGTH + 1, "x")), false);
});

test("a space-only 'symbol' does not satisfy the rule; an emoji does", () => {
  assert.equal(passwordMeetsRules("Correct horse 7 battery"), false);
  assert.equal(passwordMeetsRules("Correct horse 7 battery😀"), true);
});

test("a Unicode capital and a non-ASCII symbol can satisfy the rules", () => {
  assert.equal(passwordMeetsRules("élan-vital-É-7"), true);
  assert.equal(passwordMeetsRules("élan vital É 7"), false, "only spaces for a symbol");
});
