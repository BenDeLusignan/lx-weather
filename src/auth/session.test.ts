import "@/data/test-database";
import assert from "node:assert/strict";
import { test } from "node:test";
import { passwordFingerprint, signSession, verifySession } from "@/auth/session";

const NOW = 1_700_000_000;
const payload = { sub: 7, exp: NOW + 1000, pwd: passwordFingerprint("scrypt$hash-of-user-7") };

test("a signed session verifies, and carries what was signed", () => {
  assert.deepEqual(verifySession(signSession(payload), NOW), payload);
});

test("a session past its expiry is refused", () => {
  assert.equal(verifySession(signSession(payload), NOW + 1000), null);
});

test("a cookie whose contents were changed is refused: someone else's id, a later expiry", () => {
  const [, signature] = signSession(payload).split(".");
  for (const forged of [{ ...payload, sub: 1 }, { ...payload, exp: NOW + 10_000_000 }]) {
    const body = Buffer.from(JSON.stringify(forged)).toString("base64url");
    assert.equal(verifySession(`${body}.${signature}`, NOW), null);
  }
});

test("a cookie with a damaged or missing signature is refused", () => {
  const token = signSession(payload);
  const [body] = token.split(".");
  assert.equal(verifySession(`${token.slice(0, -2)}xx`, NOW), null);
  assert.equal(verifySession(`${body}.`, NOW), null);
  assert.equal(verifySession(body ?? "", NOW), null);
  assert.equal(verifySession(`${token}.extra`, NOW), null);
  assert.equal(verifySession("", NOW), null);
  assert.equal(verifySession("garbage", NOW), null);
});

test("a cookie signed with another secret is refused", () => {
  const token = signSession(payload);
  const original = process.env.SESSION_SECRET;
  process.env.SESSION_SECRET = "another-secret-that-is-at-least-32-characters";
  try {
    assert.equal(verifySession(token, NOW), null);
  } finally {
    process.env.SESSION_SECRET = original;
  }
});

test("the password fingerprint differs per hash, so a changed password ends old sessions", () => {
  assert.notEqual(passwordFingerprint("hash-one"), passwordFingerprint("hash-two"));
});
