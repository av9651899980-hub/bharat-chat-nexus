/** Explicit membership is required even when staff can review a chat. */
export function canSummarizeConversation(userId: string, memberIds: string[]) {
  return memberIds.includes(userId);
}

export function assertGroupOwnerProtected(ownerId: string | null, targetId: string, action: string) {
  if (ownerId === targetId && (action === "remove_member" || action === "demote")) {
    throw new Error("The group owner cannot be removed or demoted.");
  }
}