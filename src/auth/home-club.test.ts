import { usersWithEmail } from "@/data/test-database";
import assert from "node:assert/strict";
import { test } from "node:test";
import { CLUBS } from "@/clubs/clubs";
import { hashPassword } from "@/auth/password";
import { submitHomeClubChange, submitLogin } from "@/auth/submit";
import { awayClubs, findClub } from "@/clubs/lookup";
import { createUser, setHomeClub, type User } from "@/data/users";
import { getDb } from "@/db/client";
import { user } from "@/db/schema";
import { eq } from "drizzle-orm";

const NOW = 1_700_000_000;

async function newUser(email: string, homeClubId = "omagh"): Promise<User> {
  const created = await createUser({ email, passwordHash: await hashPassword("correct-horse-battery"), homeClubId });
  assert.equal(created.result, "created");
  if (created.result !== "created") throw new Error("not created");
  return { id: created.user.id, email, homeClubId, preferences: created.user.preferences };
}

const club = (id: string) => {
  const formData = new FormData();
  formData.set("homeClub", id);
  return formData;
};

async function storedClub(email: string) {
  return (await usersWithEmail(email))[0]?.homeClubId;
}

test("changing the home club saves a club from the list", async () => {
  const me = await newUser("change@example.com");
  assert.deepEqual(await submitHomeClubChange(me, club("bangor")), { redirect: "/account?saved=1" });
  assert.equal(await storedClub("change@example.com"), "bangor");
});

test("a club that isn't in the list is refused and nothing changes", async () => {
  const me = await newUser("refuse@example.com", "larne");
  for (const id of ["atlantis", "", "LARNE", "larne ", "belfast; drop table user"]) {
    assert.deepEqual(await submitHomeClubChange(me, club(id)), { redirect: "/account?error=club" }, id);
  }
  assert.deepEqual(await submitHomeClubChange(me, new FormData()), { redirect: "/account?error=club" });
  assert.equal(await storedClub("refuse@example.com"), "larne");
});

test("the write itself refuses an unknown club, whatever the caller checked", async () => {
  const me = await newUser("write@example.com");
  assert.equal(await setHomeClub(me.id, "atlantis"), "unknown-club");
  assert.equal(await storedClub("write@example.com"), "omagh");
  assert.equal(await setHomeClub(999_999, "bangor"), "not-found");

  const created = await createUser({ email: "nowhere@example.com", passwordHash: "x", homeClubId: "atlantis" });
  assert.equal(created.result, "unknown-club");
  assert.equal((await usersWithEmail("nowhere@example.com")).length, 0);
});

test("a visitor can't change a home club", async () => {
  await newUser("visitor@example.com");
  assert.deepEqual(await submitHomeClubChange(null, club("bangor")), { redirect: "/" });
  assert.equal(await storedClub("visitor@example.com"), "omagh");
});

test("a user whose stored club has left the list is sent to Account to choose, can still log in, and can fix it", async () => {
  const me = await newUser("stale@example.com");
  // A club removed from the list since sign-up: only a raw write can store one.
  await getDb().update(user).set({ homeClubId: "closed-club" }).where(eq(user.id, me.id));
  const stale: User = { ...me, homeClubId: "closed-club" };

  // What every screen branches on (`homeClubOrChoose` sends the user to /account): no club, not a crash.
  assert.equal(findClub(stale.homeClubId), undefined);
  // Nothing else breaks: with no home club to leave out, every club is on offer.
  assert.equal(awayClubs(stale.homeClubId).length, CLUBS.length);

  const formData = new FormData();
  formData.set("email", "stale@example.com");
  formData.set("password", "correct-horse-battery");
  assert.equal((await submitLogin(formData, { now: NOW, ip: "198.51.100.5" })).redirect, "/");

  assert.deepEqual(await submitHomeClubChange(stale, club("enniskillen")), { redirect: "/account?saved=1" });
  assert.equal(await storedClub("stale@example.com"), "enniskillen");
  assert.ok(findClub("enniskillen"));
});
