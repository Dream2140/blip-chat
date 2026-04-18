// Socket.IO event names shared between client and server

export const SocketEvents = {
  // Server -> Client
  MESSAGE_NEW: "message:new",
  MESSAGE_UPDATED: "message:updated",
  MESSAGE_DELETED: "message:deleted",
  MESSAGE_READ: "message:read",
  USER_TYPING: "user:typing",
  USER_STOP_TYPING: "user:stop_typing",
  USER_ONLINE: "user:online",
  USER_OFFLINE: "user:offline",
  CONVERSATION_CREATED: "conversation:created",

  // Client -> Server
  TYPING_START: "typing:start",
  TYPING_STOP: "typing:stop",
  MESSAGES_READ: "messages:read",
  JOIN_CONVERSATIONS: "join:conversations",
} as const;

// Redis pub/sub channels
export const RedisChannels = {
  MESSAGE_EVENTS: "chat:message_events",
  PRESENCE_EVENTS: "chat:presence_events",
  READ_RECEIPT_EVENTS: "chat:read_receipt_events",
} as const;

// Payload types for socket events
export interface ServerToClientEvents {
  [SocketEvents.MESSAGE_NEW]: (data: {
    id: string;
    conversationId: string;
    senderId: string;
    text: string;
    replyToId: string | null;
    createdAt: string;
  }) => void;
  [SocketEvents.MESSAGE_UPDATED]: (data: {
    id: string;
    conversationId: string;
    text: string;
    editedAt: string;
  }) => void;
  [SocketEvents.MESSAGE_DELETED]: (data: {
    id: string;
    conversationId: string;
  }) => void;
  [SocketEvents.MESSAGE_READ]: (data: {
    conversationId: string;
    userId: string;
    lastReadMessageId: string;
  }) => void;
  [SocketEvents.USER_TYPING]: (data: {
    conversationId: string;
    userId: string;
  }) => void;
  [SocketEvents.USER_STOP_TYPING]: (data: {
    conversationId: string;
    userId: string;
  }) => void;
  [SocketEvents.USER_ONLINE]: (data: { userId: string }) => void;
  [SocketEvents.USER_OFFLINE]: (data: {
    userId: string;
    lastSeenAt: string;
  }) => void;
  [SocketEvents.CONVERSATION_CREATED]: (data: {
    id: string;
    type: "DIRECT" | "GROUP";
    name: string | null;
    participants: Array<{ userId: string; role: "ADMIN" | "MEMBER" }>;
  }) => void;
}

export interface ClientToServerEvents {
  [SocketEvents.TYPING_START]: (data: { conversationId: string }) => void;
  [SocketEvents.TYPING_STOP]: (data: { conversationId: string }) => void;
  [SocketEvents.MESSAGES_READ]: (data: {
    conversationId: string;
    lastMessageId: string;
  }) => void;
  [SocketEvents.JOIN_CONVERSATIONS]: (data: {
    conversationIds: string[];
  }) => void;
}
