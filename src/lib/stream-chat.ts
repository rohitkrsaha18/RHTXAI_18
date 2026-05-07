import { supabase } from "@/integrations/supabase/client";

export type Msg = { role: "user" | "assistant" | "system"; content: string };

/** Strip large base64 data from message history to avoid exceeding edge function size limits */
function sanitizeMessages(messages: Msg[]): Msg[] {
  return messages.map((m) => ({
    ...m,
    content: m.content.replace(/!\[Generated Image\]\(data:image\/[^)]+\)/g, "[image was generated]"),
  }));
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

export type QuotaInfo = {
  plan?: string;
  remaining?: number;
  used?: number;
  limit?: number;
  milestone?: string;
  chatRemaining?: number;
  mathRemaining?: number;
};

export async function streamChat({
  messages,
  conversationId,
  displayName,
  customInstructions,
  fileData,
  onDelta,
  onImage,
  onDone,
  onError,
  onQuota,
  signal,
}: {
  messages: Msg[];
  conversationId?: string;
  displayName?: string;
  customInstructions?: string;
  fileData?: { base64: string; name: string; mimeType: string };
  onDelta: (text: string) => void;
  onImage?: (url: string) => void;
  onDone: () => void;
  onError: (error: string) => void;
  onQuota?: (q: QuotaInfo) => void;
  signal?: AbortSignal;
}) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) {
      onError("You must be signed in to use chat.");
      return;
    }

    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({ messages: sanitizeMessages(messages), conversationId, displayName, customInstructions, fileData }),
      signal,
    });

    if (resp.status === 429) {
      try {
        const j = await resp.json();
        onError(j.error || "Limit reached. Upgrade or come back tomorrow 🌙");
      } catch {
        onError("Rate limit exceeded. Please wait a moment and try again.");
      }
      return;
    }
    if (resp.status === 402) {
      onError("AI usage limit reached. Please add credits to continue.");
      return;
    }
    if (!resp.ok || !resp.body) {
      onError("Failed to get AI response. Please try again.");
      return;
    }

    if (onQuota) {
      const num = (v: string | null) => (v && v !== "" ? Number(v) : undefined);
      const ms = resp.headers.get("X-Quota-Milestone");
      onQuota({
        plan: resp.headers.get("X-Quota-Plan") || undefined,
        remaining: num(resp.headers.get("X-Quota-Remaining")),
        used: num(resp.headers.get("X-Quota-Used")),
        limit: num(resp.headers.get("X-Quota-Limit")),
        milestone: ms ? decodeURIComponent(ms) : undefined,
        chatRemaining: num(resp.headers.get("X-Quota-Chat-Remaining")),
        mathRemaining: num(resp.headers.get("X-Quota-Math-Remaining")),
      });
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = "";
    let streamDone = false;
    let incompleteData = "";

    while (!streamDone) {
      const { done, value } = await reader.read();
      if (done) break;
      textBuffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);

        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") continue;
        if (!line.startsWith("data: ") && !incompleteData) continue;

        let jsonStr: string;
        if (incompleteData) {
          incompleteData += line;
          jsonStr = incompleteData;
        } else {
          jsonStr = line.slice(6).trim();
        }

        if (jsonStr === "[DONE]") {
          streamDone = true;
          incompleteData = "";
          break;
        }

        try {
          const parsed = JSON.parse(jsonStr);
          incompleteData = "";

          // Check for image URL (uploaded to storage)
          const imageUrl = parsed.choices?.[0]?.message?.image_url;
          if (imageUrl && onImage) {
            onImage(imageUrl);
            continue;
          }

          // Legacy: check for inline base64 images
          const legacyImage = parsed.choices?.[0]?.message?.images?.[0]?.image_url?.url;
          if (legacyImage && onImage) {
            onImage(legacyImage);
            continue;
          }

          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) onDelta(content);
        } catch {
          if (!incompleteData) {
            incompleteData = jsonStr;
          }
        }
      }
    }

    // Final flush
    if (textBuffer.trim()) {
      for (let raw of textBuffer.split("\n")) {
        if (!raw) continue;
        if (raw.endsWith("\r")) raw = raw.slice(0, -1);
        if (raw.startsWith(":") || raw.trim() === "") continue;
        if (!raw.startsWith("data: ")) continue;
        const jsonStr = raw.slice(6).trim();
        if (jsonStr === "[DONE]") continue;
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) onDelta(content);
        } catch { /* ignore */ }
      }
    }

    onDone();
  } catch (e: any) {
    if (e.name === "AbortError") return;
    onError(e.message || "Unknown error");
  }
}
