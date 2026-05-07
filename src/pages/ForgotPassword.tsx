import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "@/hooks/use-toast";
import { KeyRound, Mail, ShieldCheck, Lock, CheckCircle2 } from "lucide-react";

type Step = "email" | "otp" | "password" | "success";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const sendOtp = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast({ title: "Invalid email", description: "Please enter a valid email.", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });
    setLoading(false);
    if (error) {
      toast({ title: "Could not send code", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Code sent", description: `We sent a 6-digit code to ${email}.` });
    setStep("otp");
  };

  const verifyOtp = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (otp.length !== 6) {
      toast({ title: "Invalid code", description: "Enter the 6-digit code.", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: "email",
    });
    setLoading(false);
    if (error) {
      toast({ title: "Verification failed", description: "Incorrect or expired code. Please try again.", variant: "destructive" });
      return;
    }
    setStep("password");
  };

  const updatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({ title: "Weak password", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: "Passwords don't match", description: "Please retype your new password.", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      return;
    }
    await supabase.auth.signOut();
    setStep("success");
  };

  const icons: Record<Step, JSX.Element> = {
    email: <Mail className="h-7 w-7 text-primary" />,
    otp: <ShieldCheck className="h-7 w-7 text-primary" />,
    password: <Lock className="h-7 w-7 text-primary" />,
    success: <CheckCircle2 className="h-7 w-7 text-primary" />,
  };

  const titles: Record<Step, string> = {
    email: "Reset password",
    otp: "Enter verification code",
    password: "Create new password",
    success: "Password updated",
  };

  const descriptions: Record<Step, string> = {
    email: "Enter your email and we'll send you a 6-digit code.",
    otp: `We sent a code to ${email}. It expires in 10 minutes.`,
    password: "Choose a strong new password for your account.",
    success: "Your password has been successfully updated.",
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
            {icons[step] ?? <KeyRound className="h-7 w-7 text-primary" />}
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">{titles[step]}</CardTitle>
          <CardDescription>{descriptions[step]}</CardDescription>
        </CardHeader>
        <CardContent>
          {step === "email" && (
            <form onSubmit={sendOtp} className="space-y-4">
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Sending..." : "Send Code"}
              </Button>
            </form>
          )}

          {step === "otp" && (
            <form onSubmit={verifyOtp} className="space-y-4">
              <div className="flex justify-center">
                <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <Button type="submit" className="w-full" disabled={loading || otp.length !== 6}>
                {loading ? "Verifying..." : "Verify Code"}
              </Button>
              <button
                type="button"
                onClick={() => sendOtp()}
                disabled={loading}
                className="w-full text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                Didn't get it? Resend code
              </button>
            </form>
          )}

          {step === "password" && (
            <form onSubmit={updatePassword} className="space-y-4">
              <Input
                type="password"
                placeholder="New password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
              />
              <Input
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
              />
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Updating..." : "Update Password"}
              </Button>
            </form>
          )}

          {step === "success" && (
            <div className="space-y-4">
              <p className="text-center text-sm text-muted-foreground">
                Password successfully updated. You can now sign in with your new password.
              </p>
              <Button className="w-full" onClick={() => navigate("/auth")}>
                Go to Login
              </Button>
            </div>
          )}

          {step !== "success" && (
            <div className="mt-4 text-center text-sm text-muted-foreground">
              <Link to="/auth" className="text-primary hover:underline font-medium">
                Back to sign in
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
