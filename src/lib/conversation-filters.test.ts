import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { filterConversations } from "./conversation-filters";

describe("unified conversation filters", () => {
  const conversations = [
    { id: "direct-1", isGroup: false },
    { id: "group-1", isGroup: true },
  ];

  it("shows both direct chats and groups in the all view", () => {
    assert.deepEqual(filterConversations(conversations, "all"), conversations);
  });

  it("shows only direct chats in the direct view", () => {
    assert.deepEqual(filterConversations(conversations, "direct"), [conversations[0]]);
  });

  it("shows only groups in the groups view", () => {
    assert.deepEqual(filterConversations(conversations, "groups"), [conversations[1]]);
  });
});