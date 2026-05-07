import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download, CheckCircle, Smartphone } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function Install() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    window.addEventListener("appinstalled", () => setInstalled(true));

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setInstalled(true);
    setDeferredPrompt(null);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-6 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
        <Smartphone className="h-10 w-10 text-primary" />
      </div>

      <h1 className="text-3xl font-bold text-foreground">Install RHTX AI</h1>
      <p className="max-w-md text-muted-foreground">
        Add RHTX AI to your home screen for instant access, offline support, and a native app experience.
      </p>

      {installed ? (
        <div className="flex items-center gap-2 text-green-500">
          <CheckCircle className="h-5 w-5" />
          <span className="font-medium">App installed!</span>
        </div>
      ) : deferredPrompt ? (
        <Button size="lg" onClick={handleInstall} className="gap-2">
          <Download className="h-5 w-5" />
          Install App
        </Button>
      ) : (
        <div className="max-w-sm space-y-4 rounded-xl border border-border bg-card p-6 text-left">
          <p className="text-sm font-medium text-foreground">To install manually:</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><strong>iPhone:</strong> Tap Share → "Add to Home Screen"</li>
            <li><strong>Android:</strong> Tap ⋮ menu → "Add to Home Screen"</li>
            <li><strong>Desktop:</strong> Click the install icon in the address bar</li>
          </ul>
        </div>
      )}

      <a href="/" className="text-sm text-muted-foreground underline hover:text-foreground">
        Back to chat
      </a>
    </div>
  );
}
