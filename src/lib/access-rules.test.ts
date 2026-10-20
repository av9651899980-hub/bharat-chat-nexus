import { describe, expect, test } from "bun:test";
import { assertGroupOwnerProtected, canSummarizeConversation } from "./access-rules";

describe("conversation access", () => {
  test("summaries require the requesting user's membership", () => {
    expect(canSummarizeConversation("member", ["member", "other"])).toBe(true);
    expect(canSummarizeConversation("outsider", ["member", "other"])).toBe(false);
    expect(canSummarizeConversation("owner", ["member"])).toBe(false);
  });
  test("group owners cannot be removed", () => {
    expect(() => assertGroupOwnerProtected("creator", "creator", "remove_member")).toThrow();
    expect(() => assertGroupOwnerProtected("creator", "member", "remove_member")).not.toThrow();
  });
  test("group owners cannot be demoted", () => {
    expect(() => assertGroupOwnerProtected("creator", "creator", "demote")).toThrow();
    expect(() => assertGroupOwnerProtected("creator", "admin", "demote")).not.toThrow();
  });
});