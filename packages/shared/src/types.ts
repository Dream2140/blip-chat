export interface User {
  id: string;
  email: string;
  nickname: string;
  avatarUrl: string | null;
  bio: string | null;
  lastSeenAt: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  type: "DIRECT" | "GROUP";
  name: string | null;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
  participants: ConversationParticipant[];
  lastMessage: Message | null;
  unreadCount: number;
}

export interface ConversationParticipant {
  id: string;
  userId: string;
  user: User;
  role: "ADMIN" | "MEMBER";
  joinedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  sender: User;
  text: string;
  replyToId: string | null;
  replyTo: Message | null;
  editedAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  status: MessageStatus;
}

export type MessageStatus = "sent" | "delivered" | "read";

export interface MessageReadReceipt {
  id: string;
  messageId: string;
  userId: string;
  readAt: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface AuthResponse {
  user: User;
}
