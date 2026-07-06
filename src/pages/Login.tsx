import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, ChevronLeft, MailCheck } from "lucide-react";
import { toast } from "sonner";
import SEO from "@/components/SEO";

export default function Login() {
  const [params] = useSearchParams();
  const redirect = params.get("redirect") || "/";
  const initialMode = params.get("mode") === "signup" ? "signup" : "signin";
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">(initialMode);
  const [signedUpEmail, setSignedUpEmail] = useState<string | null>(null);
  const [refCode, setRefCode] = useState<string | null>(null);

  // Detect referral code from localStorage (set by /ref/:code)
  if (typeof window !== "undefined" && refCode === null) {
    try {
      const code = localStorage.getItem("ntr_ref_code");
      if (code) setRefCode(code);
    } catch {
      /* ignore */
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "signup") {
      if (password.length < 6) {
        toast.error("Password must be at least 6 characters.");
        return;
      }
      if (password !== confirm) {
        toast.error("Passwords don't match.");
        return;
      }
    }
    setLoading(true);
    const { error } =
      mode === "signin" ? await signIn(email, password) : await signUp(email, password);
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (mode === "signup") {
      setSignedUpEmail(email);
      toast.success("Account created — check your email to verify.");
    } else {
      toast.success("Welcome back!");
      navigate(redirect, { replace: true });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      <SEO
        title={mode === "signin" ? "Sign in — Noob to Root" : "Create account — Noob to Root"}
        description="Access your courses, certificates, and learning progress on Noob to Root."
        noindex
      />
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-secondary/10 pointer-events-none" />
      <Link
        to="/"
        className="absolute top-6 left-6 text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
      >
        <ChevronLeft className="w-4 h-4" /> Back to site
      </Link>

      <Card className="w-full max-w-md glass-card border-border/50 relative z-10">
        <CardHeader className="text-center space-y-2">
          <div className="flex items-center justify-center gap-1">
            <span className="text-2xl font-heading font-bold neon-text">Noob</span>
            <span className="text-2xl font-heading font-bold text-muted-foreground">2</span>
            <span className="text-2xl font-heading font-bold">Root</span>
          </div>
          <CardTitle className="text-xl">
            {signedUpEmail ? "Check your inbox" : "Welcome"}
          </CardTitle>
          <CardDescription>
            {signedUpEmail
              ? "We sent a verification link to confirm your email."
              : "Sign in or create an account to start learning."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {signedUpEmail ? (
            <div className="text-center space-y-4 py-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center">
                <MailCheck className="w-8 h-8 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">
                We sent a verification link to{" "}
                <span className="text-foreground font-medium">{signedUpEmail}</span>.
                Click it to activate your account, then complete your profile.
              </p>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setSignedUpEmail(null);
                  setMode("signin");
                  setPassword("");
                  setConfirm("");
                }}
              >
                Back to sign in
              </Button>
            </div>
          ) : (
            <Tabs value={mode} onValueChange={(v) => setMode(v as "signin" | "signup")}>
              <TabsList className="grid grid-cols-2 w-full mb-5">
                <TabsTrigger value="signin">Sign in</TabsTrigger>
                <TabsTrigger value="signup">Create account</TabsTrigger>
              </TabsList>
              {refCode && mode === "signup" && (
                <div className="mb-4 rounded-lg border border-primary/30 bg-primary/10 p-3 text-xs text-primary flex items-center gap-2">
                  <span className="text-base">🎁</span>
                  <span>
                    You were invited! Code{" "}
                    <span className="font-mono font-semibold">{refCode}</span> will be applied after you complete your profile.
                  </span>
                </div>
              )}
              <TabsContent value={mode}>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      autoComplete={mode === "signin" ? "current-password" : "new-password"}
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                    />
                  </div>
                  {mode === "signup" && (
                    <div className="space-y-2">
                      <Label htmlFor="confirm">Confirm password</Label>
                      <Input
                        id="confirm"
                        type="password"
                        autoComplete="new-password"
                        required
                        minLength={6}
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        placeholder="••••••••"
                      />
                    </div>
                  )}
                  <Button type="submit" className="w-full font-semibold" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {mode === "signin" ? "Sign in" : "Create account"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          )}
          <p className="text-center text-xs text-muted-foreground mt-5">
            By continuing you agree to our terms and privacy policy.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
