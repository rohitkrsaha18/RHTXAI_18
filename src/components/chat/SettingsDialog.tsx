import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useProfile } from "@/hooks/useProfile";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Sun, Moon, Trash2, AlertTriangle, Type, ArrowDownToLine } from "lucide-react";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { profile, updateProfile } = useProfile();
  const { theme, setTheme, fontSize, setFontSize, autoScroll, setAutoScroll } = useTheme();
  const { user, signOut } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || "");
      setAvatarUrl(profile.avatar_url || "");
    }
  }, [profile]);

  useEffect(() => {
    if (!open) setDeleteConfirm(false);
  }, [open]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile({
        display_name: displayName.trim() || null,
        avatar_url: avatarUrl.trim() || null,
      });
      toast({ title: "Settings saved" });
      onOpenChange(false);
    } catch {
      toast({ title: "Failed to save", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      return;
    }
    setDeleting(true);
    try {
      await supabase.from("conversations").delete().eq("user_id", user!.id);
      await supabase.from("profiles").delete().eq("user_id", user!.id);
      await signOut();
      toast({ title: "Account data deleted. You have been signed out." });
    } catch {
      toast({ title: "Failed to delete account data", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  const initials = (displayName || "U").slice(0, 2).toUpperCase();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="appearance">Appearance</TabsTrigger>
            <TabsTrigger value="account">Account</TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6 py-4">
            <div className="flex flex-col items-center gap-3">
              <Avatar className="h-20 w-20">
                {avatarUrl ? <AvatarImage src={avatarUrl} alt="Avatar" /> : null}
                <AvatarFallback className="bg-primary/10 text-primary text-lg">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </div>

            <div className="space-y-2">
              <Label htmlFor="display-name">Display Name</Label>
              <Input
                id="display-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                maxLength={50}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="avatar-url">Avatar URL</Label>
              <Input
                id="avatar-url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://example.com/avatar.png"
              />
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={user?.email || ""} disabled className="opacity-60" />
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </TabsContent>

          {/* Appearance Tab */}
          <TabsContent value="appearance" className="space-y-6 py-4">
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Sun className="h-4 w-4" /> Theme
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: "light" as const, icon: Sun, label: "Light" },
                  { value: "dark" as const, icon: Moon, label: "Dark" },
                ].map((opt) => (
                  <Button
                    key={opt.value}
                    variant={theme === opt.value ? "default" : "outline"}
                    size="sm"
                    className="flex items-center gap-2"
                    onClick={() => setTheme(opt.value)}
                  >
                    <opt.icon className="h-4 w-4" />
                    {opt.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Type className="h-4 w-4" /> Chat Font Size
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {(["small", "medium", "large"] as const).map((opt) => (
                  <Button
                    key={opt}
                    variant={fontSize === opt ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFontSize(opt)}
                    className="capitalize"
                  >
                    {opt}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Preview: <span className={
                  fontSize === "small" ? "text-xs" : fontSize === "large" ? "text-base" : "text-sm"
                }>This is how your chat text will look.</span>
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <ArrowDownToLine className="h-4 w-4" /> Auto-scroll
                </Label>
                <Switch checked={autoScroll} onCheckedChange={setAutoScroll} />
              </div>
              <p className="text-xs text-muted-foreground">
                Automatically scroll to bottom when new messages arrive.
              </p>
            </div>
          </TabsContent>

          {/* Account Tab */}
          <TabsContent value="account" className="space-y-6 py-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>

            <div className="space-y-2">
              <Label>Member since</Label>
              <p className="text-sm text-muted-foreground">
                {user?.created_at
                  ? new Date(user.created_at).toLocaleDateString()
                  : "Unknown"}
              </p>
            </div>

            <div className="border-t border-border pt-4 space-y-3">
              <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-4 w-4" />
                <Label className="text-destructive">Danger Zone</Label>
              </div>
              {deleteConfirm && (
                <p className="text-xs text-destructive">
                  This will delete all your conversations and data. This action cannot be undone. Click again to confirm.
                </p>
              )}
              <Button
                variant="destructive"
                className="w-full flex items-center gap-2"
                onClick={handleDeleteAccount}
                disabled={deleting}
              >
                <Trash2 className="h-4 w-4" />
                {deleting
                  ? "Deleting..."
                  : deleteConfirm
                    ? "Confirm Delete"
                    : "Delete Account Data"}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
