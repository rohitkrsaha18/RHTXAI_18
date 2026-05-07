import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { createHmac } from "node:crypto";

serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  try {
    const raw = await req.text();
    const sig = req.headers.get("x-razorpay-signature");
    const SECRET = Deno.env.get("RAZORPAY_WEBHOOK_SECRET")!;
    const expected = createHmac("sha256", SECRET).update(raw).digest("hex");
    if (sig !== expected) return new Response("Invalid signature", { status: 400 });

    const event = JSON.parse(raw);
    if (event.event === "payment.captured") {
      const payment = event.payload.payment.entity;
      const userId = payment.notes?.user_id;
      if (userId) {
        const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
        const expiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        // Backup confirmation: only set if not already paid for this order
        const { data: existing } = await admin.from("user_plans").select("razorpay_payment_id").eq("user_id", userId).maybeSingle();
        if (existing?.razorpay_payment_id !== payment.id) {
          await admin.from("user_plans").update({
            plan: "paid",
            messages_used: 0,
            daily_messages_used: 0,
            monthly_limit: 300,
            plan_expiry: expiry,
            razorpay_payment_id: payment.id,
            razorpay_order_id: payment.order_id,
          }).eq("user_id", userId);
        }
        await admin.from("payment_orders").update({ status: "paid", razorpay_payment_id: payment.id }).eq("razorpay_order_id", payment.order_id);
      }
    }
    return new Response("ok", { status: 200 });
  } catch (e) {
    console.error("webhook error", e);
    return new Response("error", { status: 500 });
  }
});
