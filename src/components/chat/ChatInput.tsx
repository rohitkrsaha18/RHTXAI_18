import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Send, Paperclip, StopCircle, X, FileText, Mic, MicOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

interface ISpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

declare global {
  interface Window {
    SpeechRecognition: new () => ISpeechRecognition;
    webkitSpeechRecognition: new () => ISpeechRecognition;
  }
}

interface ChatInputProps {
  onSend: (message: string, file?: File, isVoice?: boolean) => void;
  isLoading: boolean;
  onStop?: () => void;
}

export function ChatInput({ onSend, isLoading, onStop }: ChatInputProps) {
  const [input, setInput] = useState("");
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [isListening, setIsListening] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<ISpeechRecognition | null>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + "px";
    }
  }, [input]);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in your browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false; // Stop after one utterance
    recognition.interimResults = true;
    recognition.lang = navigator.language || "en-US";

    let finalTranscript = "";
    let submitted = false;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      setInput(finalTranscript + interim);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      // Auto-submit the final transcript once
      if (finalTranscript.trim() && !submitted) {
        submitted = true;
        setTimeout(() => {
          onSend(finalTranscript.trim(), undefined, true);
          setInput("");
          if (textareaRef.current) textareaRef.current.style.height = "auto";
        }, 100);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
    toast({ title: "🎙️ Mic on… Listening…", duration: 1500 });
  };

  const handleSubmit = () => {
    const trimmed = input.trim();
    if ((!trimmed && !attachedFile) || isLoading) return;
    recognitionRef.current?.stop();
    setIsListening(false);
    onSend(trimmed || "Summarize this document", attachedFile ?? undefined);
    setInput("");
    setAttachedFile(null);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="border-t border-border bg-background p-3 md:p-4">
      <div className="mx-auto max-w-3xl">
        {/* Attached file preview */}
        {attachedFile && (
          <div className="mb-2 flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm">
            <FileText className="h-4 w-4 text-primary shrink-0" />
            <span className="truncate flex-1 text-foreground">{attachedFile.name}</span>
            <span className="text-muted-foreground text-xs">{formatSize(attachedFile.size)}</span>
            <button onClick={() => setAttachedFile(null)} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <div className="flex items-end gap-2 rounded-xl border border-border bg-card p-2 shadow-sm focus-within:border-primary/50 transition-colors">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground"
            onClick={() => fileRef.current?.click()}
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            accept=".pdf,.docx,.txt,.csv,.md"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                if (file.size > 20 * 1024 * 1024) {
                  alert("File must be under 20MB");
                  return;
                }
                setAttachedFile(file);
              }
              e.target.value = "";
            }}
          />
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-9 w-9 shrink-0", isListening ? "text-destructive animate-pulse" : "text-muted-foreground hover:text-foreground")}
            onClick={toggleListening}
            title={isListening ? "Stop listening" : "Voice input"}
          >
            {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isListening ? "Listening..." : attachedFile ? "Ask about this file..." : "Message RHTX AI..."}
            rows={1}
            className="flex-1 resize-none bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none text-[15px] py-1.5 max-h-[200px]"
          />
          {isLoading ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0 text-destructive hover:text-destructive"
              onClick={onStop}
            >
              <StopCircle className="h-5 w-5" />
            </Button>
          ) : (
            <Button
              size="icon"
              className={cn("h-9 w-9 shrink-0 rounded-lg", !input.trim() && !attachedFile && "opacity-50")}
              onClick={handleSubmit}
              disabled={!input.trim() && !attachedFile}
            >
              <Send className="h-4 w-4" />
            </Button>
          )}
        </div>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          RHTX AI can make mistakes. Consider checking important information.
        </p>
      </div>
    </div>
  );
}
