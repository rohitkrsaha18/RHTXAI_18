import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  message_type: string;
  image_url: string | null;
  created_at: string;
}

export function useMessages(conversationId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const skipFetchRef = useRef(false);

  const fetchMessages = useCallback(async () => {
    if (!conversationId) { setMessages([]); return; }
    if (skipFetchRef.current) return; // skip fetch during active streaming
    setLoading(true);
    const { data } = await supabase
      .from("messages")
      .select("id, role, content, message_type, image_url, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    // Double-check skip flag in case streaming started while query was in flight
    if (skipFetchRef.current) { setLoading(false); return; }
    if (data) setMessages(data as Message[]);
    setLoading(false);
  }, [conversationId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const addMessage = async (
    role: "user" | "assistant",
    content: string,
    messageType = "text",
    imageUrl?: string,
    conversationIdOverride?: string
  ) => {
    const cid = conversationIdOverride || conversationId;
    if (!cid) return null;
    const { data } = await supabase
      .from("messages")
      .insert({
        conversation_id: cid,
        role,
        content,
        message_type: messageType,
        image_url: imageUrl || null,
      })
      .select("id, role, content, message_type, image_url, created_at")
      .single();
    if (data && role === "user") {
      // Only auto-append user messages; assistant messages get replaced via replaceStreamingMessage
      setMessages((prev) => [...prev, data as Message]);
    }
    return data;
  };

  const replaceStreamingMessage = (saved: Message) => {
    setMessages((prev) => {
      const idx = prev.findIndex((m) => m.id === "streaming");
      if (idx !== -1) {
        return prev.map((m, i) => (i === idx ? saved : m));
      }
      return prev;
    });
  };

  const updateLastAssistant = (content: string, imageUrl?: string | null) => {
    setMessages((prev) => {
      const streamIdx = prev.findIndex((m) => m.id === "streaming");
      if (streamIdx !== -1) {
        return prev.map((m, i) => (i === streamIdx ? { ...m, content, image_url: imageUrl ?? m.image_url } : m));
      }
      const lastIdx = prev.length - 1;
      if (lastIdx >= 0 && prev[lastIdx].role === "assistant") {
        return prev.map((m, i) => (i === lastIdx ? { ...m, content, image_url: imageUrl ?? m.image_url } : m));
      }
      return [...prev, { id: "streaming", role: "assistant" as const, content, message_type: "text", image_url: imageUrl || null, created_at: new Date().toISOString() }];
    });
  };

  const deleteMessage = async (messageId: string) => {
    const { error } = await supabase.from("messages").delete().eq("id", messageId);
    if (!error) {
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    }
    return !error;
  };

  return { messages, loading, addMessage, updateLastAssistant, replaceStreamingMessage, deleteMessage, setMessages, refetch: fetchMessages, skipFetchRef };
}
