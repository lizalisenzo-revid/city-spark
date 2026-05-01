import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Sparkles, Mail, Lock, ArrowRight, ArrowLeft, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — today." },
      { name: "description", content: "Sign in to save your day plans and personal calendar." },
    ],
  }),
  component: AuthPage,
});

type Mode = "signin" | "signup" | "reset" | "reset-sent";

function AuthPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/calendar" });
  }, [loading, user, navigate]);

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/calendar`,
            data: { full_name: name || email.split("@")[0] },
          },
        });
        if (error) throw error;
        // If session exists, email confirmation is disabled — user is logged in immediately
        if (data.session) {
          toast.success("Welcome! You're signed in.");
        } else {
          toast.success("Almost there! Check your email to confirm your account.");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back.");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth`,
      });
      if (error) throw error;
      setMode("reset-sent");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}/calendar`,
    });
    if (result.error) {
      toast.error(result.error.message ?? "Google sign-in failed");
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper text-ink grid place-items-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="inline-flex items-center gap-2 font-display text-3xl mb-8">
          <span className="inline-block h-7 w-7 bg-coral border-2 border-ink rounded-full" />
          today<span className="text-coral">.</span>
        </Link>

        <div className="bg-cream border-2 border-ink shadow-poster rounded-2xl p-7">

          {/* ── Reset sent confirmation ── */}
          {mode === "reset-sent" ? (
            <div className="text-center py-4">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-mint" strokeWidth={2} />
              <h1 className="font-display text-4xl mb-2">Check your inbox</h1>
              <p className="text-ink/70 text-sm mb-6">
                We've sent a password reset link to <strong>{email}</strong>. Click the link in the email to set a new password.
              </p>
              <button
                onClick={() => { setMode("signin"); setEmail(""); }}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-ink text-paper font-bold border-2 border-ink rounded-full shadow-[3px_3px_0_0_var(--coral)] hover:translate-y-0.5 transition-transform"
              >
                <ArrowLeft className="h-4 w-4" /> Back to sign in
              </button>
            </div>

          /* ── Forgot password form ── */
          ) : mode === "reset" ? (
            <>
              <button
                onClick={() => setMode("signin")}
                className="inline-flex items-center gap-1.5 text-sm font-bold text-ink/60 hover:text-ink mb-4"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
              <h1 className="font-display text-4xl mb-1">Reset password</h1>
              <p className="text-ink/70 mb-6 text-sm">
                Enter your email and we'll send you a link to set a new password.
              </p>
              <form onSubmit={handleReset} className="space-y-3">
                <Field icon={<Mail className="h-4 w-4" />}>
                  <input
                    type="email"
                    required
                    className="w-full bg-transparent outline-none text-sm"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </Field>
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-coral text-paper border-2 border-ink rounded-full font-bold text-sm shadow-[3px_3px_0_0_var(--ink)] hover:translate-y-0.5 transition-transform disabled:opacity-50"
                >
                  Send reset link <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            </>

          /* ── Sign in / Sign up ── */
          ) : (
            <>
              <h1 className="font-display text-4xl mb-1">
                {mode === "signin" ? "Welcome back" : "Make it yours"}
              </h1>
              <p className="text-ink/70 mb-6 text-sm">
                {mode === "signin"
                  ? "Sign in to your personal day planner."
                  : "Create an account to save events and plan your week."}
              </p>

              <button
                onClick={handleGoogle}
                disabled={busy}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-paper border-2 border-ink rounded-full font-bold text-sm shadow-[2px_2px_0_0_var(--ink)] hover:translate-y-0.5 transition-transform disabled:opacity-50"
              >
                <GoogleIcon /> Continue with Google
              </button>

              <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-widest text-ink/50">
                <span className="h-px flex-1 bg-ink/20" /> or email <span className="h-px flex-1 bg-ink/20" />
              </div>

              <form onSubmit={handleEmail} className="space-y-3">
                {mode === "signup" && (
                  <Field icon={<Sparkles className="h-4 w-4" />}>
                    <input
                      className="w-full bg-transparent outline-none text-sm"
                      placeholder="Your name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </Field>
                )}
                <Field icon={<Mail className="h-4 w-4" />}>
                  <input
                    type="email"
                    required
                    className="w-full bg-transparent outline-none text-sm"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </Field>
                <Field icon={<Lock className="h-4 w-4" />}>
                  <input
                    type="password"
                    required
                    minLength={6}
                    className="w-full bg-transparent outline-none text-sm"
                    placeholder="Password (min 6 characters)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </Field>

                <button
                  type="submit"
                  disabled={busy}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-coral text-paper border-2 border-ink rounded-full font-bold text-sm shadow-[3px_3px_0_0_var(--ink)] hover:translate-y-0.5 transition-transform disabled:opacity-50"
                >
                  {mode === "signin" ? "Sign in" : "Create account"} <ArrowRight className="h-4 w-4" />
                </button>
              </form>

              {mode === "signin" && (
                <button
                  onClick={() => setMode("reset")}
                  className="block w-full text-center text-sm text-ink/60 hover:text-coral mt-3 font-bold"
                >
                  Forgot your password?
                </button>
              )}

              <p className="text-center text-sm text-ink/70 mt-4">
                {mode === "signin" ? "New here?" : "Already have an account?"}{" "}
                <button
                  onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
                  className="font-bold underline underline-offset-2 hover:text-coral"
                >
                  {mode === "signin" ? "Create an account" : "Sign in"}
                </button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className={cn("flex items-center gap-2 px-3.5 py-2.5 bg-paper border-2 border-ink rounded-lg")}>
      <span className="text-ink/60">{icon}</span>
      {children}
    </label>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.7 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.6 8.4 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.6l6.2 5.2C41.2 35.6 44 30.2 44 24c0-1.3-.1-2.3-.4-3.5z"/>
    </svg>
  );
}
