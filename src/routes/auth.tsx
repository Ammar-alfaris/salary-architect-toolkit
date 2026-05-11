import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, KeyRound, Loader2 } from "lucide-react";
import { Logo } from "@/components/logo";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { useServerFn } from "@tanstack/react-start";
import { acceptInvitation } from "@/lib/invitations.functions";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
  head: () => ({
    meta: [
      { title: "Sign in — TotalReward" },
      { name: "description", content: "Sign in or create your TotalReward account." },
    ],
  }),
});

type Mode = "auth" | "processing" | "set_password";

function AuthPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const acceptInviteFn = useServerFn(acceptInvitation);

  const getInviteState = () => {
    if (typeof window === "undefined") return { invited: false, emailParam: "" };
    const sp = new URLSearchParams(window.location.search);
    return {
      invited: sp.get("invited") === "1",
      emailParam: sp.get("email") || "",
    };
  };

  const [mode, setMode] = useState<Mode>("auth");
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const handled = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const sp = new URLSearchParams(window.location.search);
    const { invited, emailParam } = getInviteState();

    if (emailParam) {
      setEmail(emailParam);
      setInviteEmail(emailParam);
    }

    if (!invited) {
      if (sp.get("confirmed") === "1") toast.success(t("email_confirmed_signin"));
      supabase.auth.getSession().then(({ data }) => {
        if (data.session) navigate({ to: "/app" });
      });
      return;
    }
    setMode("auth");
    setTab("signin");

    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session?.user || handled.current) return;
      handled.current = true;
      setMode("processing");
      try {
        await acceptInviteFn({ data: { email: data.session.user.email || emailParam } });
      } catch (_) {
        // Ignore if already accepted
      }
      navigate({ to: "/app" });
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Set password for newly invited user ──
  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) return toast.error(t("passwords_no_match"));
    if (password.length < 6) return toast.error("Password must be at least 6 characters");
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password,
        data: fullName ? { full_name: fullName } : undefined,
      });
      if (error) { toast.error(error.message); return; }

      // Sync profile
      const { data: { user } } = await supabase.auth.getUser();
      if (user && fullName) {
        await supabase.from("profiles").upsert({ id: user.id, full_name: fullName, email: user.email }, { onConflict: "id" });
      }

      toast.success(t("account_created"));
      navigate({ to: "/app" });
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      if (error.message.toLowerCase().includes("email not confirmed")) {
        setUnverifiedEmail(email);
        return toast.error("البريد الإلكتروني غير مؤكّد بعد. أعد إرسال رسالة التحقق من الأسفل.");
      }
      return toast.error(error.message);
    }
    setUnverifiedEmail("");
    const { invited } = getInviteState();
    if (invited) {
      setMode("processing");
      try {
        await acceptInviteFn({ data: { email } });
      } catch (_) {
        // Ignore if already accepted
      }
    }
    toast.success(t("welcome_back"));
    navigate({ to: "/app" });
  };

  const resendVerification = async () => {
    const target = (unverifiedEmail || email).trim();
    if (!target) return toast.error("أدخل بريدك الإلكتروني أولاً.");
    setLoading(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: target,
      options: { emailRedirectTo: `${window.location.origin}/auth?confirmed=1` },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("تمت إعادة إرسال رسالة التحقق إلى بريدك الإلكتروني.", { duration: 8000 });
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { invited } = getInviteState();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth?confirmed=1${invited ? "&invited=1" : ""}`,
        data: {
          full_name: fullName,
          // Don't auto-create org if user is signing up via an invitation —
          // they will be attached to the inviting org by the trigger.
          ...(invited ? {} : { org_name: `${fullName || email}'s Organization` }),
        },
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    if (!data.session) {
      toast.success(t("check_email_to_verify"), { duration: 8000 });
      setTab("signin");
      return;
    }
    if (invited) {
      setMode("processing");
      try {
        await acceptInviteFn({ data: { email } });
      } catch (_) {
        // Trigger will already attach the role; ignore failures
      }
    }
    toast.success(t("account_created"));
    navigate({ to: "/app" });
  };

  const handleGoogle = async () => {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/app" });
    if (result.error) {
      setLoading(false);
      return toast.error(result.error.message ?? t("google_signin_failed"));
    }
    if (result.redirected) return;
    navigate({ to: "/app" });
  };

  // ── Processing mode ──
  if (mode === "processing") {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="h-14 border-b flex items-center px-4">
          <div className="ms-auto"><Logo size={24} textClassName="text-sm" /></div>
        </header>
        <div className="flex-1 grid place-items-center px-4">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
            <h2 className="text-xl font-semibold">{t("accepting_invitation")}</h2>
            <p className="text-sm text-muted-foreground">{t("please_wait")}</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Set password mode (new invited user) ──
  if (mode === "set_password") {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="h-14 border-b flex items-center px-4">
          <div className="ms-auto"><Logo size={24} textClassName="text-sm" /></div>
        </header>
        <div className="flex-1 grid place-items-center px-4 py-10">
          <div className="w-full max-w-md">
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <KeyRound className="w-7 h-7 text-primary" />
              </div>
              <h1 className="text-2xl font-semibold">{t("set_password_title")}</h1>
              <p className="text-sm text-muted-foreground mt-1">{t("set_password_subtitle")}</p>
              {inviteEmail && (
                <p className="text-xs text-muted-foreground mt-1 font-medium">{inviteEmail}</p>
              )}
            </div>
            <div className="border rounded-xl bg-card p-6 shadow-[var(--shadow-elegant)]">
              <form onSubmit={handleSetPassword} className="space-y-3">
                <div className="space-y-1.5">
                  <Label>{t("full_name")}</Label>
                  <Input
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={t("full_name")}
                    autoFocus
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("password")}</Label>
                  <Input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("confirm_password")}</Label>
                  <Input
                    type="password"
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading
                    ? <><Loader2 className="w-4 h-4 me-2 animate-spin" />{t("loading")}</>
                    : t("complete_setup")
                  }
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Normal auth mode ──
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="h-14 border-b flex items-center px-4">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> {t("back_home")}
        </Link>
        <div className="ms-auto"><Logo size={24} textClassName="text-sm" /></div>
      </header>
      <div className="flex-1 grid place-items-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-semibold tracking-tight">{t("welcome_to")} {t("app_name")}</h1>
            <p className="text-sm text-muted-foreground mt-1">{t("tagline")}</p>
          </div>
          <div className="border rounded-xl bg-card p-6 shadow-[var(--shadow-elegant)]">
            <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="signin">{t("sign_in")}</TabsTrigger>
                <TabsTrigger value="signup">{t("sign_up")}</TabsTrigger>
              </TabsList>
              <TabsContent value="signin" className="mt-4">
                <form onSubmit={handleSignIn} className="space-y-3">
                  <div className="space-y-1.5">
                    <Label>{t("email")}</Label>
                    <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("password")}</Label>
                    <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>{loading ? "…" : t("sign_in")}</Button>
                  {unverifiedEmail && (
                    <Button type="button" variant="outline" className="w-full" onClick={resendVerification} disabled={loading}>
                      إعادة إرسال رسالة التحقق
                    </Button>
                  )}
                </form>
              </TabsContent>
              <TabsContent value="signup" className="mt-4">
                <form onSubmit={handleSignUp} className="space-y-3">
                  <div className="space-y-1.5">
                    <Label>{t("full_name")}</Label>
                    <Input required value={fullName} onChange={(e) => setFullName(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("email")}</Label>
                    <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("password")}</Label>
                    <Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>{loading ? "…" : t("sign_up")}</Button>
                </form>
              </TabsContent>
            </Tabs>
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">{t("or")}</span>
              </div>
            </div>
            <Button variant="outline" className="w-full" onClick={handleGoogle} disabled={loading}>
              <svg className="w-4 h-4 me-2" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.1A6.5 6.5 0 0 1 5.5 12c0-.73.13-1.43.34-2.1V7.07H2.18A11 11 0 0 0 1 12c0 1.78.43 3.46 1.18 4.93l3.66-2.83z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z"/>
              </svg>
              {t("continue_google")}
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-4">{t("terms_agree")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
