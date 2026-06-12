import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { useCoraPersist } from "@/hooks/useCoraPersist";
import { CoraAvatar } from "@/components/cora/CoraAvatar";
import { Welcome } from "@/components/cora/Welcome";
import { Thread, ThinkingBubble } from "@/components/cora/Thread";
import { InputDock } from "@/components/cora/InputDock";
import { RecordingOverlay } from "@/components/cora/RecordingOverlay";
import { I } from "@/components/cora/icons";
import type { CoraAccount, CoraEntry, CoraMessage } from "@/components/cora/types";
import "@/components/cora/cora.css";

type AIRawTransaction = {
  date?: string;
  amount?: number;
  description?: string;
  type?: "income" | "expense";
  categorySuggestion?: string;
  origin?: "PF" | "PJ";
};

type Phase = "idle" | "thread" | "recording" | "thinking";

const uid = (p: string) => `${p}${Date.now()}${Math.floor(Math.random() * 1000)}`;

function mapToEntries(transactions: AIRawTransaction[]): CoraEntry[] {
  const today = new Date().toISOString().split("T")[0];
  return transactions
    .filter((t) => typeof t.amount === "number" && !isNaN(t.amount as number))
    .map((t) => ({
      id: uid("e"),
      kind: t.type === "income" ? "income" : "expense",
      amount: Math.abs(t.amount as number),
      label: (t.description || "Sem descrição").trim(),
      category: t.categorySuggestion || "Outros",
      account: t.origin === "PJ" ? "PJ" : "PF",
      installments: null,
      source: `"${(t.description || "").trim()}"`,
      date: t.date && /^\d{4}-\d{2}-\d{2}$/.test(t.date) ? t.date : today,
    }));
}

function IconButton({ children, onClick, title }: { children: React.ReactNode; onClick?: () => void; title?: string }) {
  return (
    <button onClick={onClick} title={title} style={{ width: 36, height: 36, borderRadius: "50%", border: "1px solid var(--hairline)", background: "var(--surf)", color: "var(--ink-2)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
      {children}
    </button>
  );
}

function Header({ listening, onWallet }: { listening: boolean; onWallet: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px 6px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <CoraAvatar size={26} />
        <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: -0.1, color: "var(--ink)" }}>Cora</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 10, fontWeight: 500, letterSpacing: 1, textTransform: "uppercase", color: "var(--ink-3)", paddingLeft: 2 }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--accent-warm)", boxShadow: "0 0 8px var(--accent-warm)" }} />
          {listening ? "ouvindo" : "pronta"}
        </span>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <IconButton onClick={onWallet} title="ver carteira">{I.wallet}</IconButton>
        <IconButton title="notificações">{I.bell}</IconButton>
      </div>
    </div>
  );
}

function BottomNav({ onNavigate }: { onNavigate: (to: string) => void }) {
  const items = [
    { id: "home", label: "Início", icon: I.home, to: "/", active: true },
    { id: "wallet", label: "Carteira", icon: I.wallet, to: "/carteira" },
    { id: "hist", label: "Histórico", icon: I.history, to: "/history" },
    { id: "goals", label: "Metas", icon: I.target, to: "/metas" },
    { id: "more", label: "Mais", icon: I.more, to: "/more" },
  ];
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "12px 22px calc(24px + env(safe-area-inset-bottom, 0px))", borderTop: "1px solid var(--hairline)", background: "var(--bg)", position: "relative", zIndex: 4 }}>
      {items.map((it) => (
        <button
          key={it.id}
          onClick={() => !it.active && onNavigate(it.to)}
          style={{ background: "transparent", border: 0, padding: 0, cursor: "pointer", color: it.active ? "var(--ink)" : "var(--ink-3)", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, fontSize: 10, letterSpacing: 0.2, textTransform: "uppercase", fontWeight: it.active ? 600 : 500 }}
        >
          {it.icon}
          <span>{it.label}</span>
        </button>
      ))}
    </div>
  );
}

export default function Cora() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { isRecording, duration, startRecording, stopRecording } = useAudioRecorder();
  const { saveEntries } = useCoraPersist();

  const [phase, setPhase] = useState<Phase>("idle");
  const [thinkingLabel, setThinkingLabel] = useState("");
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<CoraMessage[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const firstName = useMemo(() => (profile?.full_name || "").trim().split(" ")[0] || "", [profile]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, phase]);

  // ── pipeline real: texto/transcrição → edge function → entries ──
  const interpret = useCallback(
    async (payload: string) => {
      setPhase("thinking");
      setThinkingLabel("ouvindo de novo…");
      const t = setTimeout(() => setThinkingLabel("separando PF, PJ e categoria…"), 1100);
      try {
        const { data, error } = await supabase.functions.invoke("process-financial-text", { body: { text: payload } });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        const entries = mapToEntries((data?.transactions ?? []) as AIRawTransaction[]);
        clearTimeout(t);

        if (entries.length === 0) {
          setMessages((prev) => [...prev, { id: uid("c"), from: "cora", text: "Não achei valores nessa fala. Tenta de novo me dizendo quanto foi, tipo \"gastei 90 no mercado\"." }]);
        } else {
          const accounts = [...new Set(entries.map((e) => e.account))];
          const mix = accounts.length > 1 ? "Tem PF e PJ aí. " : "";
          setMessages((prev) => [
            ...prev,
            { id: uid("c"), from: "cora", mood: "idle", text: `Captei${firstName ? ", " + firstName : ""}. ${mix}Olha o que eu separei:`, entries, confirmed: false, followup: null },
          ]);
        }
      } catch (err: any) {
        clearTimeout(t);
        console.error("Cora.interpret", err);
        setMessages((prev) => [...prev, { id: uid("c"), from: "cora", text: "Deu um problema pra interpretar agora. Tenta de novo num instante." }]);
      } finally {
        setPhase("thread");
        setThinkingLabel("");
      }
    },
    [firstName],
  );

  const handleSendText = () => {
    const text = draft.trim();
    if (!text) return;
    setMessages((prev) => [...prev, { id: uid("u"), from: "user", kind: "text", text }]);
    setDraft("");
    void interpret(text);
  };

  const handleMic = async () => {
    try {
      await startRecording();
      setPhase("recording");
    } catch (err: any) {
      toast.error(err?.message || "Não consegui acessar o microfone.");
    }
  };

  const handleCancelRecording = async () => {
    await stopRecording();
    setPhase(messages.length ? "thread" : "idle");
  };

  const handleStopRecording = async () => {
    const result = await stopRecording();
    const transcript = (result?.transcript || "").trim();
    if (!transcript) {
      setPhase(messages.length ? "thread" : "idle");
      toast.error("Não captei o áudio. Pode digitar ou tentar de novo?");
      return;
    }
    setMessages((prev) => [...prev, { id: uid("u"), from: "user", kind: "voice", duration: result?.duration ?? 0, text: transcript }]);
    void interpret(transcript);
  };

  const handleConfirmAll = async (mid: string) => {
    const msg = messages.find((m) => m.id === mid);
    if (!msg?.entries) return;
    try {
      await saveEntries(msg.entries);
      setMessages((prev) => prev.map((m) => (m.id === mid ? { ...m, confirmed: true } : m)));
      const entries = msg.entries;
      const pfOut = entries.filter((e) => e.account === "PF" && e.kind === "expense").reduce((s, e) => s + e.amount, 0);
      const pjIn = entries.filter((e) => e.account === "PJ" && e.kind === "income").reduce((s, e) => s + e.amount, 0);
      setMessages((prev) => [
        ...prev,
        { id: uid("t"), from: "cora", mood: "happy", toast: `Show${firstName ? ", " + firstName : ""}. Joguei tudo no seu sistema. Saldo já bateu lá na Carteira.`, summary: { pfOut, pjIn } },
      ]);
    } catch (err: any) {
      toast.error(err?.message || "Não consegui salvar agora.");
    }
  };

  const handleAnswerFollowup = (mid: string, value: CoraAccount) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== mid || !m.followup || !m.entries) return m;
        const updated = m.entries.map((e) => (e.id === m.followup!.entryId ? { ...e, account: value } : e));
        return { ...m, entries: updated, followup: { ...m.followup, answered: true, value } };
      }),
    );
  };

  const handleRemoveEntry = (mid: string, eid: string) => {
    setMessages((prev) => prev.map((m) => (m.id === mid ? { ...m, entries: m.entries?.filter((e) => e.id !== eid) } : m)));
  };

  const handleEditEntry = () => {
    toast.info("Edição inline chega em breve. Por ora dá pra remover ou ajustar a fala.");
  };

  const showWelcome = messages.length === 0 && phase !== "recording";

  return (
    <div className="cora-root" data-cora-theme="dark" style={{ minHeight: "100dvh", display: "flex", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 480, minHeight: "100dvh", display: "flex", flexDirection: "column", position: "relative", background: "var(--bg)" }}>
        <Header listening={isRecording} onWallet={() => navigate("/carteira")} />

        {showWelcome ? (
          <Welcome userName={firstName} onSuggest={(t) => setDraft(t)} />
        ) : (
          <Thread
            scrollRef={scrollRef}
            messages={messages}
            onConfirmAll={handleConfirmAll}
            onEditEntry={handleEditEntry}
            onRemoveEntry={handleRemoveEntry}
            onAnswerFollowup={handleAnswerFollowup}
          />
        )}

        {phase === "thinking" && !showWelcome && (
          <div style={{ padding: "0 16px 8px" }}>
            <ThinkingBubble label={thinkingLabel} />
          </div>
        )}

        <InputDock value={draft} onChange={setDraft} onSend={handleSendText} onMic={handleMic} onAttach={() => toast.info("Anexar print chega em breve.")} disabled={phase === "thinking"} />
        <BottomNav onNavigate={(to) => navigate(to)} />

        {phase === "recording" && <RecordingOverlay seconds={duration} onCancel={handleCancelRecording} onStop={handleStopRecording} />}
      </div>
    </div>
  );
}
