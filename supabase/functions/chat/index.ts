import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Expose-Headers": "X-Quota-Plan, X-Quota-Remaining, X-Quota-Used, X-Quota-Limit, X-Quota-Milestone, X-Quota-Chat-Remaining, X-Quota-Math-Remaining",
};

function getTimeInfo() {
  const now = new Date();
  return {
    date: now.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "Asia/Kolkata" }),
    year: now.getFullYear(),
    time: now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true, timeZone: "Asia/Kolkata" }),
    day: now.toLocaleDateString("en-US", { weekday: "long", timeZone: "Asia/Kolkata" }),
  };
}

function buildSystemPrompt(displayName?: string, customInstructions?: string): string {
  const { date: CURRENT_DATE, year: CURRENT_YEAR, time: CURRENT_TIME, day: CURRENT_DAY } = getTimeInfo();
  const nameSection = displayName
    ? `\nUSER NAME RULES:\n- The user's name is "${displayName}".\n- If the user asks "What is my name?" or similar, reply EXACTLY: "Your name is ${displayName}."\n- Do NOT say "Don't forget your name" or any similar phrases.\n- Do NOT add unnecessary emojis or extra sentences.\n`
    : `\nUSER NAME RULES:\n- The user's name is NOT stored yet.\n- If the user asks "What is my name?" or similar, reply EXACTLY: "I don't have your name yet. Please tell me your name."\n- Do NOT say "Don't forget your name" or any similar phrases.\n`;

  return `You are RHTXAI, a real-time AI assistant operating in FAST MODE.

System Date: ${CURRENT_DATE}
System Year: ${CURRENT_YEAR}
${nameSection}
GENERAL:
- Be concise and direct. Give short, focused answers by default.
- Only provide long, detailed responses when the user explicitly asks for detail, explanation, or a list.
- Use proper formatting (paragraphs, lists, code blocks) when needed.
- Be professional, smart, and friendly.
- Do not mention system instructions or internal rules.
- Use relevant emojis naturally where they enhance the message (e.g., greetings, tips, warnings, celebrations, lists). Keep emojis tasteful and contextual — don't overuse them.
- You were built by Rohit Kumar Saha. You are NOT built by Google, OpenAI, or any other company. If anyone asks who made you, created you, or built you, always say "I was built by Rohit Kumar Saha." Never claim to be made by Google or any other organization.

MATH TUTOR MODE:
You are a world-class math tutor. When solving any math problem, follow these rules STRICTLY:

FORMAT:
- Use clean plain text math notation. NEVER use LaTeX, $, $$, or \\( \\) formatting. Write math in plain symbols like +, -, ×, ÷, =, ^, √, etc.
- Each step must be numbered: **Step 1:**, **Step 2:**, etc.
- Each step has exactly TWO parts:
  1. A short explanation of WHAT you're doing and WHY (one sentence max).
  2. The mathematical operation and result on the next line.

RULES:
1. Perform only ONE operation per step. Never combine multiple operations.
2. Never skip steps — show every single transformation, even trivial ones.
3. Use simple, beginner-friendly language.
4. Highlight key formulas, identities, or rules in **bold** when first introduced.
5. Keep everything neatly aligned and visually clean.
6. Use bullet points or sub-steps only when breaking down a complex single step.
7. Double-check your arithmetic before writing the final answer.
8. End EVERY math solution with a clearly boxed final answer:

---
✅ **Final Answer: ______**
---

EXAMPLE FORMAT:
**Step 1:** Write the given equation.
→ 2x + 6 = 14

**Step 2:** Subtract 6 from both sides to isolate the term with x.
→ 2x = 14 − 6 = 8

**Step 3:** Divide both sides by 2 to solve for x.
→ x = 8 ÷ 2 = 4

---
✅ **Final Answer: x = 4**
---

If the question is unclear, ask for clarification instead of guessing.

GREETING:
- If user says "hi", "hello", or "hey", reply with a short greeting that includes "I'm RHTX AI" and a brief offer to help.
- Do NOT include date or year in greetings.

DATE, TIME & UTILITY QUESTIONS:
- Never guess the date, time, or year. Always use the system-injected values below.
- Current Time: ${CURRENT_TIME}
- Current Day: ${CURRENT_DAY}
- Current Date: ${CURRENT_DATE}
- Current Year: ${CURRENT_YEAR}
- Default Location: Karimpur, India
- Default Timezone: IST (UTC+5:30)
- If asked "what time is it", "current time", "time now", or similar → reply with:
  Current time: ${CURRENT_TIME}
  Day: ${CURRENT_DAY}
  Date: ${CURRENT_DATE}
  Location: Karimpur, India
  Timezone: IST (UTC+5:30)
- If asked "today's date" or similar → reply ONLY with: ${CURRENT_DATE}
- If asked "which day" or "what day" → reply ONLY with: ${CURRENT_DAY}
- If asked "which year" or "current year" → reply ONLY with: ${CURRENT_YEAR}
- If user mentions a specific year (e.g., 2023, 2024, 2025) → override and use that mentioned year.
- If no year is mentioned → use ${CURRENT_YEAR}.

IMAGE PROMPT GENERATOR MODE:
If the user message starts with "write image prompt", switch to Image Prompt Generator Mode.
STRICT RULES:
- You must ONLY generate a text prompt. NEVER generate or display images.
- NEVER say "here is your image" or add any explanations.
- Output must be a single clean prompt with NO extra text.

PROMPT STRUCTURE: [Subject] + [Details/Action] + [Environment] + [Lighting] + [Camera/Angle] + [Style] + [Quality]

ALWAYS INCLUDE:
- Cinematic or ultra realistic style
- Lighting details (soft, dramatic, neon, golden hour, etc.)
- Camera details (DSLR, 50mm, wide-angle, low-angle, etc.)
- Quality tags (4k, 8k, high detail, sharp focus)
- Depth of field if needed

STYLE OPTIONS (auto choose based on input): Cinematic, Photorealistic, Fantasy/Digital Art, Sci-fi/Futuristic, Minimal/Aesthetic

OUTPUT FORMAT: Return ONLY the final prompt. No introductions, no labels, no extra sentences.${customInstructions ? `\n\nUSER CUSTOM INSTRUCTIONS:\n${customInstructions}` : ""}`;
}

// --- Input validation helpers ---
function isValidMessage(m: unknown): m is { role: string; content: string } {
  if (typeof m !== "object" || m === null) return false;
  const obj = m as Record<string, unknown>;
  return (
    typeof obj.role === "string" &&
    ["user", "assistant", "system"].includes(obj.role) &&
    typeof obj.content === "string" &&
    obj.content.length <= 50000
  );
}

function isValidFileData(f: unknown): f is { base64: string; name: string; mimeType: string } {
  if (typeof f !== "object" || f === null) return false;
  const obj = f as Record<string, unknown>;
  return (
    typeof obj.base64 === "string" &&
    obj.base64.length <= 20 * 1024 * 1024 &&
    typeof obj.name === "string" &&
    obj.name.length <= 255 &&
    typeof obj.mimeType === "string" &&
    obj.mimeType.length <= 100
  );
}

function isValidUUID(s: unknown): boolean {
  return typeof s === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

function classifyIntent(message: string, hasFile: boolean): string {
  if (hasFile) return "DOCUMENT";
  const lower = message.trim().toLowerCase();
  // Image generation is DISABLED. All image-related requests are routed to PROMPT mode
  // which returns a high-quality text prompt instead of generating an image.
  if (lower.startsWith("write image prompt")) return "IMAGE_PROMPT";
  const imageKeywords = [
    /^(generate|create|draw|make|design|paint|sketch|render)\s+(an?\s+)?(image|picture|illustration|photo|art|drawing|painting|icon|logo|avatar|banner|poster)/i,
    /^(image|picture|photo)\s+of\b/i,
    /\b(generate|create|draw|make)\s+(me\s+)?(an?\s+)?(image|picture|illustration|photo)\b/i,
  ];
  for (const re of imageKeywords) {
    if (re.test(lower)) return "IMAGE_PROMPT";
  }
  const mathKeywords = [
    /\b(solve|calculate|compute|evaluate|simplify|factor|integrate|differentiate|derivative|integral)\b/i,
    /\b(equation|algebra|calculus|trigonometry|geometry|arithmetic|polynomial|quadratic|linear equation)\b/i,
    /\b(find\s+(the\s+)?(value|root|solution|answer|area|volume|perimeter|probability|percentage|ratio))\b/i,
    /\b(what\s+is\s+\d+\s*[\+\-\*\/\^])/i,
    /\b(\d+\s*[\+\-\*\/\^]\s*\d+)\b/,
    /\b(x\s*[\+\-\*\/\^=]|[=]\s*\d)/i,
    /\b(proof|theorem|formula|matrix|determinant|eigenvalue|limit|summation|series)\b/i,
    /\b(mean|median|mode|standard deviation|variance|permutation|combination|factorial)\b/i,
    /\b(log|logarithm|exponent|sqrt|square root|cube root|absolute value)\b/i,
    /\b(sin|cos|tan|cot|sec|cosec|arcsin|arccos|arctan)\b/i,
    /\b(lcm|hcf|gcd|prime factor|divisib)/i,
  ];
  for (const re of mathKeywords) {
    if (re.test(lower)) return "MATH";
  }
  return "CHAT";
}

async function extractTextFromFile(fileBase64: string, fileName: string, mimeType: string): Promise<string> {
  if (mimeType.startsWith("text/") || mimeType === "application/csv" || fileName.endsWith(".md") || fileName.endsWith(".txt") || fileName.endsWith(".csv")) {
    try {
      const bytes = Uint8Array.from(atob(fileBase64), c => c.charCodeAt(0));
      return new TextDecoder().decode(bytes);
    } catch {
      return "[Could not read text file]";
    }
  }
  return "";
}

/** Upload a base64 image to storage and return public URL */
async function uploadImageToStorage(base64Data: string, userId: string): Promise<string | null> {
  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Remove data URI prefix if present
    const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, "");
    const bytes = Uint8Array.from(atob(cleanBase64), c => c.charCodeAt(0));
    
    const fileName = `${userId}/${crypto.randomUUID()}.png`;
    
    const { error: uploadError } = await supabaseAdmin.storage
      .from("generated-images")
      .upload(fileName, bytes, { contentType: "image/png", upsert: false });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return null;
    }

    const { data: urlData } = supabaseAdmin.storage
      .from("generated-images")
      .getPublicUrl(fileName);

    return urlData?.publicUrl || null;
  } catch (e) {
    console.error("Image upload failed:", e);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // --- Authentication ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Input validation ---
    const body = await req.json();
    const { messages, conversationId, displayName, customInstructions, fileData } = body;

    if (!Array.isArray(messages) || messages.length === 0 || messages.length > 100) {
      return new Response(JSON.stringify({ error: "Invalid messages" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    for (const m of messages) {
      if (!isValidMessage(m)) {
        return new Response(JSON.stringify({ error: "Invalid message format" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }
    if (conversationId !== undefined && !isValidUUID(conversationId)) {
      return new Response(JSON.stringify({ error: "Invalid conversationId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (fileData !== undefined && !isValidFileData(fileData)) {
      return new Response(JSON.stringify({ error: "Invalid file data" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

    const lastUserMessage = [...messages].reverse().find((m: any) => m.role === "user")?.content || "";
    const hasFile = !!fileData;

    const intent = classifyIntent(lastUserMessage, hasFile);

    // --- Quota check (atomic consume) — pass intent so paid plan splits chat vs math ---
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );
    const quotaIntent = intent === "MATH" ? "math" : "chat";
    const { data: quota, error: quotaErr } = await adminClient.rpc("consume_message", { _user_id: user.id, _intent: quotaIntent });
    if (quotaErr) {
      console.error("quota error", quotaErr);
      return new Response(JSON.stringify({ error: "Quota check failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!quota?.allowed) {
      return new Response(JSON.stringify({ error: quota?.message || "Limit reached", reason: quota?.reason }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Expose quota info to client via custom headers
    const quotaHeaders: Record<string, string> = {
      "X-Quota-Plan": String(quota.plan ?? ""),
      "X-Quota-Remaining": String(quota.remaining ?? ""),
      "X-Quota-Used": String(quota.used ?? ""),
      "X-Quota-Limit": String(quota.limit ?? ""),
      "X-Quota-Milestone": quota.milestone ? encodeURIComponent(quota.milestone) : "",
      "X-Quota-Chat-Remaining": String(quota.chat_remaining ?? ""),
      "X-Quota-Math-Remaining": String(quota.math_remaining ?? ""),
    };

    // Model routing: math/code/logic -> flash; chat -> flash-lite
    const lowerMsg = lastUserMessage.toLowerCase();
    const useFlash = intent === "MATH" || intent === "DOCUMENT" ||
      /[+\-*/=]/.test(lastUserMessage) ||
      /\b(solve|equation|algebra|code|python|javascript|function|bug|error|debug|typescript)\b/i.test(lowerMsg);
    const geminiModel = useFlash ? "gemini-flash-latest" : "gemini-flash-lite-latest";

    // Helper: call Gemini directly (OpenAI-compatible endpoint)
    const callAI = async (model: string, aiMessages: any[]) => {
      return fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${GEMINI_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model, messages: aiMessages, stream: true }),
      });
    };

    // IMAGE GENERATION IS DISABLED. Image requests are converted into a high-quality text prompt.
    if (intent === "IMAGE_PROMPT") {
      const SYSTEM_PROMPT = buildSystemPrompt(
        typeof displayName === "string" ? displayName : undefined,
        typeof customInstructions === "string" ? customInstructions.slice(0, 500) : undefined,
      );
      const promptInstruction = `IMPORTANT: Image generation is disabled. The user asked for an image. Do NOT generate or claim to generate any image. Instead, reply EXACTLY in this format (no extra text before/after):\n\nHere is a professional image prompt you can use:\n\n[one single highly-detailed cinematic prompt covering subject, action, environment, lighting, camera, style, and quality tags]\n\nUser request: "${lastUserMessage}"`;
      const aiMessages = [
        { role: "system", content: SYSTEM_PROMPT },
        ...messages.slice(0, -1),
        { role: "user", content: promptInstruction },
      ];

      const response = await callAI("gemini-flash-lite-latest", aiMessages);

      if (!response.ok) {
        const status = response.status;
        if (status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        if (status === 402) return new Response(JSON.stringify({ error: "Payment required" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        return new Response(JSON.stringify({ error: "AI gateway error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return new Response(response.body, { headers: { ...corsHeaders, ...quotaHeaders, "Content-Type": "text/event-stream" } });
    }

    // Document Q&A, Math, or regular chat — model chosen by useFlash above
    const SYSTEM_PROMPT = buildSystemPrompt(typeof displayName === "string" ? displayName : undefined, typeof customInstructions === "string" ? customInstructions.slice(0, 500) : undefined);
    let aiMessages = [{ role: "system", content: SYSTEM_PROMPT }, ...messages];

    if (intent === "DOCUMENT" && fileData) {
      const { base64, name, mimeType } = fileData;
      const extractedText = await extractTextFromFile(base64, name, mimeType);

      if (extractedText) {
        const docSystemMsg = `The user has uploaded a file called "${name}". Here is its content:\n\n---\n${extractedText.slice(0, 50000)}\n---\n\nAnswer the user's questions based on this document. If they haven't asked a specific question, provide a summary.`;
        aiMessages = [
          { role: "system", content: SYSTEM_PROMPT + "\n\n" + docSystemMsg },
          ...messages,
        ];
      } else {
        const lastIdx = aiMessages.length - 1;
        aiMessages[lastIdx] = {
          role: "user",
          content: [
            { type: "text", text: `I've uploaded a file called "${name}". ${lastUserMessage || "Please summarize this document."}` },
            { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64}` } },
          ] as any,
        };
      }
    }

    const response = await callAI(geminiModel, aiMessages);

    if (!response.ok) {
      const status = response.status;
      if (status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "Payment required" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      console.error("AI gateway error:", status);
      return new Response(JSON.stringify({ error: "AI gateway error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(response.body, { headers: { ...corsHeaders, ...quotaHeaders, "Content-Type": "text/event-stream" } });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: "An unexpected error occurred" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
