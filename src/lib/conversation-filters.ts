export type ConversationTypeFilter = "all" | "direct" | "groups";

export function filterConversations<T extends { isGroup: boolean }>(
  conversations: T[],
  filter: ConversationTypeFilter,
): T[] {
  if (filter === "direct") return conversations.filter((conversation) => !conversation.isGroup);
  if (filter === "groups") return conversations.filter((conversation) => conversation.isGroup);
  return conversations;
}