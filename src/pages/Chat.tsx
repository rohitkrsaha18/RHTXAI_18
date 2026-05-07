import { useState, useRef, useEffect, useCallback } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { useConversations } from "@/hooks/useConversations";
import { useMessages, Message } from "@/hooks/useMessages";
import { useProfile } from "@/hooks/useProfile";
import { streamChat, Msg } from "@/lib/stream-chat";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { ChatInput } from "@/components/chat/ChatInput";
import { EmptyState } from "@/components/chat/EmptyState";
import { PromptLibrary } from "@/components/chat/PromptLibrary";
import { SettingsDialog } from "@/components/chat/SettingsDialog";
import { Button } from "@/components/ui/button";
import { Menu, BookOpen } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { UpgradeButton } from "@/components/UpgradeButton";
import { useUsage } from "@/hooks/useUsage";

export default function Chat() {
  const { signOut } = useAuth();
  const { profile } = useProfile();
  const { conversations, createConversation, deleteConversation, deleteAllConversations, updateTitle } = useConversations();
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const { messages, addMessage, updateLastAssistant, replaceStreamingMessage, setMessages, skipFetchRef, deleteMessage } = useMessages(activeConversationId);
  const [isStreaming, setIsStreaming] = useState(false);
  
  const sendingRef = useRef(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [promptLibraryOpen, setPromptLibraryOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastSentRef = useRef<{ text: string; time: number }>({ text: "", time: 0 });

  const { autoScroll } = useTheme();
  const { refresh: refreshUsage } = useUsage();

  // Auto-scroll to bottom
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, autoScroll]);

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });


  const handleSend = useCallback(async (input: string, file?: File, isVoice?: boolean) => {
    // Prevent duplicate sends from rapid-fire calls (e.g. speech interim updates)
    if (sendingRef.current || isStreaming) return;

    // Deduplicate: reject same/similar message sent within 2 seconds
    const now = Date.now();
    const trimmed = input.trim().toLowerCase();
    if (trimmed && trimmed === lastSentRef.current.text && now - lastSentRef.current.time < 2000) return;
    lastSentRef.current = { text: trimmed, time: now };

    sendingRef.current = true;
    let convId = activeConversationId;

    // Prevent fetchMessages from running during the send flow
    skipFetchRef.current = true;

    if (!convId) {
      const conv = await createConversation(input.slice(0, 60) || (file ? file.name : "New Chat"));
      if (!conv) { skipFetchRef.current = false; return; }
      convId = conv.id;
      setActiveConversationId(convId);
    }

    const displayContent = file ? `📎 ${file.name}\n\n${input}` : input;
    await addMessage("user", displayContent, "text", undefined, convId);

    const history: Msg[] = [
      ...messages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      { role: "user" as const, content: input || "Summarize this document" },
    ];

    let fileData: { base64: string; name: string; mimeType: string } | undefined;
    if (file) {
      const base64 = await fileToBase64(file);
      fileData = { base64, name: file.name, mimeType: file.type || "application/octet-stream" };
    }

    setIsStreaming(true);
    const controller = new AbortController();
    abortRef.current = controller;

    let assistantContent = "";
    let generatedImageUrl: string | null = null;
    let doneCalled = false;

    await streamChat({
      messages: history,
      conversationId: convId,
      displayName: profile?.display_name || undefined,
      fileData,
      onDelta: (chunk) => {
        assistantContent += chunk;
        updateLastAssistant(assistantContent, generatedImageUrl);
      },
      onImage: (url) => {
        generatedImageUrl = url;
        updateLastAssistant(assistantContent, generatedImageUrl);
      },
      onQuota: (q) => {
        if (q.milestone) {
          toast({ title: q.milestone, description: q.remaining != null ? `You have ${q.remaining} / 30 free messages left` : undefined });
        }
      },
      onDone: async () => {
        if (doneCalled) return;
        doneCalled = true;
        setIsStreaming(false);
        if ((assistantContent || generatedImageUrl) && convId) {
          const saved = await addMessage(
            "assistant",
            assistantContent || "",
            generatedImageUrl ? "image" : "text",
            generatedImageUrl || undefined,
            convId
          );
          if (saved) {
            replaceStreamingMessage(saved as Message);
          }
          if (messages.length === 0) {
            updateTitle(convId, (input || file?.name || "").slice(0, 60));
          }
        }
        skipFetchRef.current = false;
        sendingRef.current = false;
        refreshUsage();
      },
      onError: (err) => {
        if (doneCalled) return;
        doneCalled = true;
        setIsStreaming(false);
        skipFetchRef.current = false;
        sendingRef.current = false;
        setMessages((prev) => prev.filter((m) => m.id !== "streaming"));
        toast({ title: "Error", description: err, variant: "destructive" });
      },
      signal: controller.signal,
    });
  }, [activeConversationId, messages, addMessage, updateLastAssistant, replaceStreamingMessage, createConversation, updateTitle, setMessages, skipFetchRef, profile]);

  const handleStop = () => {
    abortRef.current?.abort();
    setIsStreaming(false);
  };

  const handleNewChat = () => {
    setActiveConversationId(null);
    setMessages([]);
  };

  const handleDeleteConversation = async (id: string) => {
    await deleteConversation(id);
    if (activeConversationId === id) {
      setActiveConversationId(null);
      setMessages([]);
    }
  };

  const handleDeleteAll = async () => {
    await deleteAllConversations();
    setActiveConversationId(null);
    setMessages([]);
  };

  return (
    <div className="flex h-screen bg-background">
      <ChatSidebar
        conversations={conversations}
        activeId={activeConversationId}
        onSelect={setActiveConversationId}
        onNew={handleNewChat}
        onDelete={handleDeleteConversation}
        onDeleteAll={handleDeleteAll}
        onSignOut={signOut}
        onOpenSettings={() => setSettingsOpen(true)}
        displayName={profile?.display_name || null}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="flex flex-1 flex-col min-w-0">
        {/* Top bar */}
        <header className="flex items-center gap-3 border-b border-border px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden h-8 w-8"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <h2 className="text-sm font-medium truncate text-muted-foreground flex-1">
            {activeConversationId
              ? conversations.find((c) => c.id === activeConversationId)?.title || "Chat"
              : "New Chat"}
          </h2>
          <UpgradeButton size="sm" variant="outline" />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => setPromptLibraryOpen(true)}
            title="Prompt Library"
          >
            <BookOpen className="h-4 w-4" />
          </Button>
        </header>

        {/* Messages area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          {!activeConversationId && messages.length === 0 ? (
            <EmptyState onSuggestion={handleSend} />
          ) : (
            <div className="mx-auto max-w-3xl">
              {messages.map((m, i) => (
                <MessageBubble
                  key={m.id}
                  role={m.role}
                  content={m.content}
                  imageUrl={m.image_url}
                  isStreaming={isStreaming && i === messages.length - 1 && m.role === "assistant"}
                  createdAt={m.created_at}
                  onDelete={m.id !== "streaming" ? () => deleteMessage(m.id) : undefined}
                />
              ))}
            </div>
          )}
        </div>

        {/* Input */}
        <ChatInput
          onSend={handleSend}
          isLoading={isStreaming}
          onStop={handleStop}
        />
      </main>
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      <PromptLibrary
        open={promptLibraryOpen}
        onOpenChange={setPromptLibraryOpen}
        onSelect={(prompt) => {
          setPromptLibraryOpen(false);
          handleSend(prompt);
        }}
      />
    </div>
  );
}
