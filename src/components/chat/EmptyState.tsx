import { Sparkles, Code, Wand2, FileText } from "lucide-react";

interface EmptyStateProps {
  onSuggestion: (text: string) => void;
}

const suggestions = [
  { icon: Code, text: "Write a Python function to sort a list", label: "Code" },
  { icon: Wand2, text: "Write image prompt for a futuristic city at sunset", label: "Image Prompt" },
  { icon: FileText, text: "Explain quantum computing in simple terms", label: "Explain" },
  { icon: Sparkles, text: "Help me brainstorm startup ideas for AI", label: "Brainstorm" },
];

export function EmptyState({ onSuggestion }: EmptyStateProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
        <Sparkles className="h-8 w-8 text-primary" />
      </div>
      <h2 className="mb-2 text-2xl font-bold tracking-tight">How can I help you today?</h2>
      <p className="mb-8 text-muted-foreground text-center max-w-md">
        I can help with coding, writing, analysis, image generation, and much more.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-xl">
        {suggestions.map((s) => (
          <button
            key={s.label}
            onClick={() => onSuggestion(s.text)}
            className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 text-left hover:bg-secondary/50 transition-colors group"
          >
            <s.icon className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-sm mb-0.5">{s.label}</p>
              <p className="text-xs text-muted-foreground line-clamp-2">{s.text}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
