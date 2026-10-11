import assert from "node:assert/strict";
import { test } from "node:test";
import { CLUBS } from "./clubs";
import { awayClubs, clubsByName, findClub, isClubId } from "./lookup";

test("the away list is alphabetical by the name shown and leaves out the home club", () => {
  for (const home of CLUBS) {
    const away = awayClubs(home.id);
    assert.equal(away.length, CLUBS.length - 1);
    assert.ok(!away.some((club) => club.id === home.id), `${home.id} is listed in its own away list`);
    const names = away.map((club) => club.name);
    assert.deepEqual(names, [...names].sort((a, b) => a.localeCompare(b, "en-GB")));
  }
});

test("alphabetical means by name, not by id or by Ben's order", () => {
  const names = clubsByName().map((club) => club.name);
  assert.equal(names[0], "Ballymena");
  assert.ok(names.indexOf("Downshire (Hillsborough)") < names.indexOf("Enniskillen"));
  assert.ok(names.indexOf("Hilden (Lisburn)") < names.indexOf("Irvinestown"));
});

test("a home club that isn't in the list excludes nothing", () => {
  assert.equal(awayClubs("closed-club").length, CLUBS.length);
});

test("only exact club ids are clubs", () => {
  assert.ok(isClubId("belfast"));
  for (const id of ["Belfast", "belfast ", "", "atlantis", null, undefined, 3, {}]) {
    assert.ok(!isClubId(id), String(id));
    assert.equal(findClub(id), undefined);
  }
});
