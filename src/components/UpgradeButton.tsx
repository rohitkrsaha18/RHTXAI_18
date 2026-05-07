import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Sparkles, Loader2 } from "lucide-react";
import { useUsage } from "@/hooks/useUsage";

declare global {
  interface Window { Razorpay: any }
}

function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export function UpgradeButton({ size = "sm", variant = "default" as const }: { size?: "sm" | "default"; variant?: "default" | "outline" | "ghost" }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { status, refresh } = useUsage();

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const ok = await loadRazorpay();
      if (!ok) throw new Error("Failed to load Razorpay");

      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-order`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session?.access_token}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, "Content-Type": "application/json" },
      });
      const order = await resp.json();
      if (!resp.ok) throw new Error(order.error || "Order failed");

      const rzp = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: "RHTX AI",
        description: "Paid plan — 300 messages / month",
        order_id: order.orderId,
        handler: async (response: any) => {
          const v = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-payment`, {
            method: "POST",
            headers: { Authorization: `Bearer ${session?.access_token}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, "Content-Type": "application/json" },
            body: JSON.stringify(response),
          });
          const vr = await v.json();
          if (v.ok) {
            toast({ title: "Payment successful 🎉", description: "Plan activated for 30 days." });
            await refresh();
            setOpen(false);
          } else {
            toast({ title: "Verification failed", description: vr.error || "Try again", variant: "destructive" });
          }
        },
        theme: { color: "#7c3aed" },
      });
      rzp.open();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (status?.plan === "paid" && !status.expired) {
    return (
      <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-medium">
        <Sparkles className="h-3 w-3 text-primary" />
        <span>Chat {status.daily_remaining}/10</span>
        <span className="text-muted-foreground">·</span>
        <span>Math {status.math_remaining}/5</span>
      </div>
    );
  }

  return (
    <>
      {status && (
        <div className={`hidden sm:flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
          status.remaining <= 5 ? "bg-destructive/10 border-destructive/30 text-destructive" :
          status.remaining <= 10 ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-700 dark:text-yellow-400" :
          "bg-muted border-border text-muted-foreground"
        }`}>
          {status.remaining} / 30 free messages left
        </div>
      )}
      <Button size={size} variant={variant} onClick={() => setOpen(true)} className="gap-1.5">
        <Sparkles className="h-3.5 w-3.5" />
        Upgrade ₹9/month
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upgrade to Paid Plan</DialogTitle>
            <DialogDescription>
              ₹9/month · 10 chat + 5 math per day · resets daily (IST) · UPI / Cards / Wallets
            </DialogDescription>
          </DialogHeader>
          <div className="text-sm text-muted-foreground space-y-1">
            <div>• 10 chat messages per day</div>
            <div>• 5 math requests per day</div>
            <div>• Resets daily at midnight IST</div>
            <div>• Powered by Razorpay (PhonePe, GPay, Paytm, cards)</div>
          </div>
          <Button onClick={handleUpgrade} disabled={loading} className="w-full">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Pay ₹9 Now"}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
