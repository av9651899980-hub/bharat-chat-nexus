import { describe, test } from "node:test";
import { strict as assert } from "node:assert";
import { assertGroupOwnerProtected, canSummarizeConversation } from "./access-rules";

describe("conversation access", () => {
  test("summaries require the requesting user's membership", () => {
    assert.equal(canSummarizeConversation("member", ["member", "other"]), true);
    assert.equal(canSummarizeConversation("outsider", ["member", "other"]), false);
    assert.equal(canSummarizeConversation("owner", ["member"]), false);
  });
  test("group owners cannot be removed", () => {
    assert.throws(() => assertGroupOwnerProtected("creator", "creator", "remove_member"));
    assert.doesNotThrow(() => assertGroupOwnerProtected("creator", "member", "remove_member"));
  });
  test("group owners cannot be demoted", () => {
    assert.throws(() => assertGroupOwnerProtected("creator", "creator", "demote"));
    assert.doesNotThrow(() => assertGroupOwnerProtected("creator", "admin", "demote"));
  });
});