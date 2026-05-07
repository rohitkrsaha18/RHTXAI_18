import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { format } from "date-fns";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Copy, Check, Download, User, Sparkles, Trash2 } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  imageUrl?: string | null;
  isStreaming?: boolean;
  createdAt?: string;
  onDelete?: () => void;
}

export function MessageBubble({ role, content, imageUrl, isStreaming, createdAt, onDelete }: MessageBubbleProps) {
  const [copiedBlock, setCopiedBlock] = useState<number | null>(null);

  const copyCode = (code: string, idx: number) => {
    navigator.clipboard.writeText(code);
    setCopiedBlock(idx);
    setTimeout(() => setCopiedBlock(null), 2000);
  };

  let codeBlockIndex = 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn("group/msg flex gap-3 px-4 py-4 md:px-6 relative", role === "user" ? "bg-transparent" : "bg-secondary/30")}
    >
      {onDelete && !isStreaming && (
        <button
          onClick={onDelete}
          className="absolute top-2 right-2 opacity-0 group-hover/msg:opacity-100 transition-opacity text-muted-foreground hover:text-destructive p-1 rounded-md hover:bg-destructive/10"
          title="Delete message"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
      <div className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
        role === "user" ? "bg-primary/10 text-primary" : "bg-primary text-primary-foreground"
      )}>
        {role === "user" ? <User className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
      </div>
      <div className="min-w-0 flex-1 prose-chat text-foreground text-[15px]">
        {/* Render image if present */}
        {imageUrl && (
          <div className="my-3 relative group inline-block">
            <img
              src={imageUrl}
              alt="Generated image"
              className="max-w-full md:max-w-md rounded-xl border border-border shadow-sm"
              loading="lazy"
            />
            <a
              href={imageUrl}
              download="rhtx-ai-image.png"
              target="_blank"
              rel="noopener noreferrer"
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 backdrop-blur rounded-md p-1.5 hover:bg-background"
            >
              <Download className="h-4 w-4" />
            </a>
          </div>
        )}

        {/* Render text content */}
        {content && (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code({ className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || "");
                const codeStr = String(children).replace(/\n$/, "");
                if (match) {
                  const idx = codeBlockIndex++;
                  return (
                    <div className="relative group my-3">
                      <div className="flex items-center justify-between bg-secondary rounded-t-lg px-4 py-1.5 text-xs text-muted-foreground">
                        <span>{match[1]}</span>
                        <button
                          onClick={() => copyCode(codeStr, idx)}
                          className="flex items-center gap-1 hover:text-foreground transition-colors"
                        >
                          {copiedBlock === idx ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          {copiedBlock === idx ? "Copied" : "Copy"}
                        </button>
                      </div>
                      <SyntaxHighlighter
                        style={oneDark}
                        language={match[1]}
                        PreTag="div"
                        customStyle={{ margin: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0, fontSize: "13px" }}
                      >
                        {codeStr}
                      </SyntaxHighlighter>
                    </div>
                  );
                }
                return <code className={className} {...props}>{children}</code>;
              },
              img({ src, alt }) {
                return (
                  <div className="my-3 relative group inline-block">
                    <img src={src} alt={alt || "Generated image"} className="max-w-full md:max-w-md rounded-xl border border-border shadow-sm" loading="lazy" />
                    <a
                      href={src}
                      download="rhtx-ai-image.png"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 backdrop-blur rounded-md p-1.5 hover:bg-background"
                    >
                      <Download className="h-4 w-4" />
                    </a>
                  </div>
                );
              },
            }}
          >
            {content}
          </ReactMarkdown>
        )}

        {isStreaming && !imageUrl && (
          <span className="inline-block w-2 h-5 bg-primary animate-pulse rounded-sm ml-0.5" />
        )}

        {createdAt && !isStreaming && (
          <div className="mt-1.5 text-[11px] text-muted-foreground/60 select-none">
            {format(new Date(createdAt), "hh:mm:ss a")}
          </div>
        )}
      </div>
    </motion.div>
  );
}
