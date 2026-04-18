"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useChatStore } from "@/stores/chat-store";
import { MessageList } from "@/components/chat/MessageList";
import { MessageInput } from "@/components/chat/MessageInput";
import { ConversationHeader } from "@/components/chat/ConversationHeader";

export default function ConversationPage() {
  const params = useParams();
  const conversationId = params.conversationId as string;

  const setActiveConversationId = useChatStore((s) => s.setActiveConversationId);
  const setMessages = useChatStore((s) => s.setMessages);
  const messages = useChatStore(
    (s) => s.messagesByConversation[conversationId] || []
  );

  useEffect(() => {
    setActiveConversationId(conversationId);

    // Fetch messages
    fetch(`/api/conversations/${conversationId}/messages?limit=50`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.items) {
          setMessages(conversationId, data.items);
        }
      });

    return () => {
      setActiveConversationId(null);
    };
  }, [conversationId, setActiveConversationId, setMessages]);

  return (
    <>
      <ConversationHeader conversationId={conversationId} />
      <MessageList conversationId={conversationId} messages={messages} />
      <MessageInput conversationId={conversationId} />
    </>
  );
}
