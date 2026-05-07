import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Code, FileText, Lightbulb, PenLine, BarChart3, Globe, GraduationCap, Briefcase } from "lucide-react";

interface PromptLibraryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (prompt: string) => void;
}

const categories = [
  {
    name: "Writing",
    icon: PenLine,
    prompts: [
      { title: "Blog Post", prompt: "Write a compelling blog post about the future of remote work, including tips for productivity and maintaining work-life balance." },
      { title: "Email Draft", prompt: "Draft a professional email to a client explaining a project delay and proposing a new timeline." },
      { title: "Creative Story", prompt: "Write a short sci-fi story about a programmer who discovers their code has become sentient." },
      { title: "Product Description", prompt: "Write an engaging product description for a smart water bottle that tracks hydration levels." },
    ],
  },
  {
    name: "Coding",
    icon: Code,
    prompts: [
      { title: "React Component", prompt: "Create a React component for an animated countdown timer with start, pause, and reset functionality using TypeScript." },
      { title: "API Endpoint", prompt: "Write a REST API endpoint in Node.js/Express that handles user authentication with JWT tokens, including signup and login." },
      { title: "Algorithm", prompt: "Implement a binary search tree in Python with insert, delete, search, and in-order traversal methods." },
      { title: "Debug Help", prompt: "Help me debug this issue: my React useEffect is causing an infinite re-render loop. What are the common causes and how do I fix it?" },
    ],
  },
  {
    name: "Analysis",
    icon: BarChart3,
    prompts: [
      { title: "Data Analysis", prompt: "Explain how to perform sentiment analysis on customer reviews using Python and NLP libraries." },
      { title: "Business Strategy", prompt: "Analyze the pros and cons of a freemium vs subscription pricing model for a SaaS product." },
      { title: "Market Research", prompt: "Create a competitive analysis framework for evaluating AI chatbot platforms in 2026." },
      { title: "SWOT Analysis", prompt: "Perform a SWOT analysis for a startup entering the electric vehicle charging market." },
    ],
  },
  {
    name: "Learning",
    icon: GraduationCap,
    prompts: [
      { title: "Explain Concept", prompt: "Explain machine learning to me like I'm a high school student. Include real-world examples and analogies." },
      { title: "Study Guide", prompt: "Create a comprehensive study guide for learning TypeScript, from beginner to advanced, with key topics and exercises." },
      { title: "Compare Technologies", prompt: "Compare React, Vue, and Svelte frameworks. Include performance, learning curve, ecosystem, and use cases." },
      { title: "Best Practices", prompt: "What are the best practices for database design in 2026? Cover normalization, indexing, and security." },
    ],
  },
  {
    name: "Business",
    icon: Briefcase,
    prompts: [
      { title: "Pitch Deck", prompt: "Help me create an outline for a startup pitch deck for an AI-powered personal finance app." },
      { title: "Project Plan", prompt: "Create a project plan for building and launching a mobile app in 3 months, including milestones and team roles." },
      { title: "Meeting Agenda", prompt: "Draft a meeting agenda for a quarterly business review, including key metrics to discuss and action items." },
      { title: "Job Description", prompt: "Write a job description for a Senior Full-Stack Developer role at a fast-growing AI startup." },
    ],
  },
  {
    name: "Creative",
    icon: Lightbulb,
    prompts: [
      { title: "Brainstorm Ideas", prompt: "Brainstorm 10 innovative app ideas that solve everyday problems using AI technology." },
      { title: "Social Media", prompt: "Create a week-long social media content calendar for a tech startup launching a new product." },
      { title: "Name Generator", prompt: "Help me come up with creative brand names for a sustainable fashion company. Include reasoning for each." },
      { title: "Image Prompt", prompt: "Generate an image of a cozy cyberpunk coffee shop at night, with neon signs and rain-soaked streets visible through the window." },
    ],
  },
];

export function PromptLibrary({ open, onOpenChange, onSelect }: PromptLibraryProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] bg-card border-border p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="text-xl">Prompt Library</DialogTitle>
          <p className="text-sm text-muted-foreground">Pick a template to start a conversation</p>
        </DialogHeader>
        <ScrollArea className="px-6 pb-6 max-h-[60vh]">
          <div className="space-y-6">
            {categories.map((cat) => (
              <div key={cat.name}>
                <div className="flex items-center gap-2 mb-3">
                  <cat.icon className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">{cat.name}</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {cat.prompts.map((p) => (
                    <button
                      key={p.title}
                      onClick={() => onSelect(p.prompt)}
                      className="text-left rounded-lg border border-border bg-background p-3 hover:bg-secondary/50 transition-colors group"
                    >
                      <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{p.title}</p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{p.prompt}</p>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
