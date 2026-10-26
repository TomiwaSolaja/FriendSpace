export function serializeMessage(
  message: {
    id: string;
    body: string;
    senderId: string;
    createdAt: Date;
    sender: { name: string };
  },
  viewerId: string,
) {
  return {
    id: message.id,
    body: message.body,
    senderId: message.senderId,
    senderName: message.sender.name,
    createdAt: message.createdAt.toISOString(),
    mine: message.senderId === viewerId,
  };
}
