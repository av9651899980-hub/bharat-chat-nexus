import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { INTRO_DURATION_MS, getIntroDuration } from "./launch-intro";

describe("initial launch intro", () => {
  it("runs for nine seconds within the requested eight-to-ten second range", () => {
    assert.equal(INTRO_DURATION_MS, 9000);
    assert.equal(getIntroDuration(false), 9000);
  });
  it("uses a brief static reveal when reduced motion is preferred", () => {
    assert.equal(getIntroDuration(true), 1200);
  });
});
