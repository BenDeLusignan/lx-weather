import assert from "node:assert/strict";
import { test } from "node:test";
import { CLUBS } from "./clubs";

test("club ids are unique and every club lies inside Northern Ireland's box", () => {
  const ids = CLUBS.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length, "duplicate club id");
  for (const c of CLUBS) {
    // A box around Northern Ireland; catches a wrong place, e.g. Bangor in Wales (53.2 N).
    assert.ok(c.latitude >= 54.0 && c.latitude <= 55.4, `${c.id}: latitude ${c.latitude} outside Northern Ireland`);
    assert.ok(c.longitude >= -8.3 && c.longitude <= -5.3, `${c.id}: longitude ${c.longitude} outside Northern Ireland`);
  }
});
