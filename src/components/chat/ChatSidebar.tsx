import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, MessageSquare, Trash2, LogOut, Settings, X, Trash } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, isToday, isYesterday, isThisWeek, isThisMonth } from "date-fns";

interface Conversation {
  id: string;
  title: string;
  updated_at: string;
}

interface ChatSidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onDeleteAll: () => void;
  onSignOut: () => void;
  onOpenSettings: () => void;
  displayName: string | null;
  open: boolean;
  onClose: () => void;
}

function groupConversations(conversations: Conversation[]) {
  const groups: { label: string; items: Conversation[] }[] = [];
  const today: Conversation[] = [];
  const yesterday: Conversation[] = [];
  const thisWeek: Conversation[] = [];
  const thisMonth: Conversation[] = [];
  const older: Conversation[] = [];

  conversations.forEach((c) => {
    const d = new Date(c.updated_at);
    if (isToday(d)) today.push(c);
    else if (isYesterday(d)) yesterday.push(c);
    else if (isThisWeek(d)) thisWeek.push(c);
    else if (isThisMonth(d)) thisMonth.push(c);
    else older.push(c);
  });

  if (today.length) groups.push({ label: "Today", items: today });
  if (yesterday.length) groups.push({ label: "Yesterday", items: yesterday });
  if (thisWeek.length) groups.push({ label: "This Week", items: thisWeek });
  if (thisMonth.length) groups.push({ label: "This Month", items: thisMonth });
  if (older.length) groups.push({ label: "Older", items: older });

  return groups;
}

export function ChatSidebar({
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
  onDeleteAll,
  onSignOut,
  onOpenSettings,
  displayName,
  open,
  onClose,
}: ChatSidebarProps) {
  const [search, setSearch] = useState("");

  const filtered = conversations.filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase())
  );
  const groups = groupConversations(filtered);

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={onClose} />
      )}
      <aside
        style={{ width: "260px" }}
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex shrink-0 flex-col bg-sidebar border-r border-sidebar-border transition-transform duration-300 md:relative md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header (fixed) */}
        <div className="flex shrink-0 items-center justify-between px-4 h-14 border-b border-sidebar-border">
          <h1 className="text-base font-semibold text-sidebar-foreground tracking-tight truncate">RHTX AI</h1>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={onNew} title="New chat" className="h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent">
              <Plus className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent md:hidden">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Search (fixed) */}
        <div className="shrink-0 px-3 py-3 border-b border-sidebar-border/50">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search chats..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9 bg-sidebar-accent border-0 text-sm focus-visible:ring-1"
            />
          </div>
        </div>

        {/* Conversations (scrollable) */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden scroll-smooth px-2 py-2 [scrollbar-width:thin]">
          {groups.map((group) => (
            <div key={group.label} className="mb-4">
              <p className="px-2 mb-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                {group.label}
              </p>
              <div className="flex flex-col gap-0.5">
                {group.items.map((c) => (
                  <div
                    key={c.id}
                    title={c.title}
                    className={cn(
                      "group flex items-center gap-2 rounded-md px-2.5 h-9 cursor-pointer transition-colors text-sm min-w-0",
                      activeId === c.id
                        ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                        : "text-sidebar-foreground hover:bg-sidebar-accent/60"
                    )}
                    onClick={() => { onSelect(c.id); onClose(); }}
                  >
                    <MessageSquare className="h-4 w-4 shrink-0 opacity-60" />
                    <span className="truncate flex-1 min-w-0">{c.title}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); onDelete(c.id); }}
                      className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive p-0.5"
                      aria-label="Delete chat"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {conversations.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              No conversations yet.<br />Start a new chat!
            </p>
          )}
        </div>

        {/* Footer (fixed) */}
        <div className="shrink-0 border-t border-sidebar-border p-2 space-y-0.5">
          {conversations.length > 0 && (
            <Button variant="ghost" size="sm" onClick={onDeleteAll} className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10 gap-2 h-9">
              <Trash className="h-4 w-4 shrink-0" />
              <span className="truncate">Clear all chats</span>
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onOpenSettings} className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent gap-2 h-9">
            <Settings className="h-4 w-4 shrink-0" />
            <span className="truncate">{displayName || "Settings"}</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={onSignOut} className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent gap-2 h-9">
            <LogOut className="h-4 w-4 shrink-0" />
            <span className="truncate">Sign out</span>
          </Button>
        </div>
      </aside>
    </>
  );
}
