import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Layers, ArrowLeft } from "lucide-react";
import { Logo } from "@/components/logo";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
  head: () => ({ meta: [{ title: "Sign in — RewardArchitect" }, { name: "description", content: "Sign in or create your RewardArchitect account." }] }),
});

function AuthPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/app" });
    });
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("confirmed") === "1") {
      toast.success(t("email_confirmed_signin"));
    }
  }, [navigate, t]);

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
    toast.success(t("welcome_back"));
    navigate({ to: "/app" });
  };

  const resendVerification = async () => {
    const targetEmail = (unverifiedEmail || email).trim();
    if (!targetEmail) return toast.error("أدخل بريدك الإلكتروني أولاً.");

    setLoading(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: targetEmail,
      options: {
        emailRedirectTo: `${window.location.origin}/auth?confirmed=1`,
      },
    });
    setLoading(false);

    if (error) return toast.error(error.message);
    toast.success("تمت إعادة إرسال رسالة التحقق إلى بريدك الإلكتروني.", { duration: 8000 });
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth?confirmed=1`,
        data: { full_name: fullName, org_name: `${fullName || email}'s Organization` },
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    // If no session returned, email confirmation is required
    if (!data.session) {
      toast.success(t("check_email_to_verify"), { duration: 8000 });
      setTab("signin");
      return;
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
                  <div className="space-y-1.5"><Label>{t("email")}</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                  <div className="space-y-1.5"><Label>{t("password")}</Label><Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} /></div>
                  <Button type="submit" className="w-full" disabled={loading}>{loading ? "…" : t("sign_in")}</Button>
                  {unverifiedEmail ? (
                    <Button type="button" variant="outline" className="w-full" onClick={resendVerification} disabled={loading}>
                      إعادة إرسال رسالة التحقق
                    </Button>
                  ) : null}
                </form>
              </TabsContent>
              <TabsContent value="signup" className="mt-4">
                <form onSubmit={handleSignUp} className="space-y-3">
                  <div className="space-y-1.5"><Label>{t("full_name")}</Label><Input required value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>
                  <div className="space-y-1.5"><Label>{t("email")}</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                  <div className="space-y-1.5"><Label>{t("password")}</Label><Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
                  <Button type="submit" className="w-full" disabled={loading}>{loading ? "…" : t("sign_up")}</Button>
                </form>
              </TabsContent>
            </Tabs>
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">{t("or")}</span></div>
            </div>
            <Button variant="outline" className="w-full" onClick={handleGoogle} disabled={loading}>
              <svg className="w-4 h-4 me-2" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.1A6.5 6.5 0 0 1 5.5 12c0-.73.13-1.43.34-2.1V7.07H2.18A11 11 0 0 0 1 12c0 1.78.43 3.46 1.18 4.93l3.66-2.83z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z"/></svg>
              {t("continue_google")}
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-4">{t("terms_agree")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
