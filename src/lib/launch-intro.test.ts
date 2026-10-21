import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { INTRO_DURATION_MS, shouldShowIntro } from "./launch-intro";

describe("initial launch intro", () => {
  it("runs for the requested eight seconds", () => {
    assert.equal(INTRO_DURATION_MS, 8000);
  });
  it("only plays on an unseen initial launch", () => {
    assert.equal(shouldShowIntro(false, false), true);
    assert.equal(shouldShowIntro(true, false), false);
  });
  it("bypasses animation when reduced motion is preferred", () => {
    assert.equal(shouldShowIntro(false, true), false);
  });
});
