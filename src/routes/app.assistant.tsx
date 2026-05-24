import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { Sparkles, Send, FileText, MessageSquare, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { askAssistant, analyzeCv } from "@/lib/assistant.functions";
import { getServerFnAuthHeaders, assertServerFnResult } from "@/lib/server-fn-auth";

export const Route = createFileRoute("/app/assistant")({
  component: AssistantPage,
  head: () => ({ meta: [{ title: "AI Assistant — TotalReward" }] }),
});

type Msg = { role: "user" | "assistant"; content: string };

function AssistantPage() {
  const { t, locale } = useI18n();
  const { organizationId } = useAuth();
  const askFn = useServerFn(askAssistant);
  const cvFn = useServerFn(analyzeCv);

  // Chat state
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // CV state
  const [cvText, setCvText] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [cvAnalysis, setCvAnalysis] = useState("");
  const [cvLoading, setCvLoading] = useState(false);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const suggestions = [
    t("ai_sugg_1") || "What's the gender pay gap across departments?",
    t("ai_sugg_2") || "Which department has the highest average salary?",
    t("ai_sugg_3") || "Summarize workforce distribution by location.",
    t("ai_sugg_4") || "How many employees are rated above 'Meets'?",
  ];

  const send = async (text?: string) => {
    const q = (text ?? input).trim();
    if (!q || !organizationId || loading) return;
    setInput("");
    const next: Msg[] = [...messages, { role: "user", content: q }];
    setMessages(next);
    setLoading(true);
    try {
      const headers = await getServerFnAuthHeaders();
      const result = await assertServerFnResult(
        await askFn({
          data: { question: q, history: messages, organizationId, locale },
          headers,
        }),
      );
      setMessages([...next, { role: "assistant", content: result.answer || "—" }]);
    } catch (e: any) {
      toast.error(e?.message || "AI request failed");
      setMessages(next);
    } finally {
      setLoading(false);
    }
  };

  const runCv = async () => {
    if (cvText.trim().length < 50) {
      toast.error(t("ai_cv_min") || "Paste at least 50 characters of CV text.");
      return;
    }
    setCvLoading(true);
    setCvAnalysis("");
    try {
      const headers = await getServerFnAuthHeaders();
      const result = await assertServerFnResult(
        await cvFn({
          data: { cvText, jobTitle: jobTitle || undefined, locale },
          headers,
        }),
      );
      setCvAnalysis(result.analysis || "");
    } catch (e: any) {
      toast.error(e?.message || "AI request failed");
    } finally {
      setCvLoading(false);
    }
  };

  return (
    <div className="space-y-4 p-4 md:p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">{t("ai_assistant") || "AI Assistant"}</h1>
          <p className="text-sm text-muted-foreground">{t("ai_assistant_sub") || "Ask compensation questions or analyze CVs."}</p>
        </div>
      </div>

      <Tabs defaultValue="chat" className="space-y-4">
        <TabsList>
          <TabsTrigger value="chat" className="gap-2"><MessageSquare className="w-4 h-4" />{t("ai_tab_chat") || "Data Q&A"}</TabsTrigger>
          <TabsTrigger value="cv" className="gap-2"><FileText className="w-4 h-4" />{t("ai_tab_cv") || "CV Analysis"}</TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="space-y-3">
          <Card className="flex flex-col h-[60vh] min-h-[400px]">
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center gap-4 text-muted-foreground">
                  <Sparkles className="w-8 h-8 opacity-50" />
                  <p className="text-sm">{t("ai_start_hint") || "Ask anything about your compensation data."}</p>
                  <div className="grid sm:grid-cols-2 gap-2 w-full max-w-xl">
                    {suggestions.map((s) => (
                      <button key={s} onClick={() => send(s)}
                        className="text-start text-xs border rounded-md p-2.5 hover:bg-muted/50 transition">
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                      m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                    }`}>
                      {m.role === "assistant" ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none break-words">
                          <ReactMarkdown>{m.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <div className="whitespace-pre-wrap break-words">{m.content}</div>
                      )}
                    </div>
                  </div>
                ))
              )}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg px-3 py-2 text-sm flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> {t("thinking") || "Thinking…"}
                  </div>
                </div>
              )}
            </div>
            <div className="border-t p-3 flex gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder={t("ai_placeholder") || "Ask a question…"}
                className="min-h-[44px] max-h-32 resize-none"
                disabled={loading}
              />
              <Button onClick={() => send()} disabled={loading || !input.trim()} size="icon" className="shrink-0">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="cv" className="space-y-3">
          <Card className="p-4 space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">{t("ai_cv_role") || "Target role (optional)"}</label>
              <Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)}
                placeholder={t("ai_cv_role_ph") || "e.g. Senior Engineer"} className="mt-1" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">{t("ai_cv_text") || "CV text"}</label>
              <Textarea value={cvText} onChange={(e) => setCvText(e.target.value)}
                placeholder={t("ai_cv_text_ph") || "Paste the candidate's CV here…"}
                className="mt-1 min-h-[220px] font-mono text-xs" />
              <p className="text-xs text-muted-foreground mt-1">{cvText.length} / 20000</p>
            </div>
            <Button onClick={runCv} disabled={cvLoading || cvText.trim().length < 50}>
              {cvLoading ? <><Loader2 className="w-4 h-4 me-2 animate-spin" />{t("analyzing") || "Analyzing…"}</> : <><Sparkles className="w-4 h-4 me-2" />{t("ai_cv_run") || "Analyze CV"}</>}
            </Button>
          </Card>
          {cvAnalysis && (
            <Card className="p-4">
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown>{cvAnalysis}</ReactMarkdown>
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
