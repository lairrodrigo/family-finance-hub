import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { useCoraPersist } from "@/hooks/useCoraPersist";
import { Welcome } from "@/components/cora/Welcome";
import { Thread, ThinkingBubble } from "@/components/cora/Thread";
import { InputDock } from "@/components/cora/InputDock";
import { RecordingOverlay } from "@/components/cora/RecordingOverlay";
import type { CoraAccount, CoraEntry, CoraMessage } from "@/components/cora/types";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { SmartImportEngine, type NormalizedExpense } from "@/services/smartImportEngine";
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
const getErrorMessage = (err: unknown) => {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null && "message" in err) {
    return String((err as { message?: unknown }).message);
  }
  return undefined;
};

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

function mapImportedExpensesToEntries(expenses: NormalizedExpense[], fileName: string): CoraEntry[] {
  const today = new Date().toISOString().split("T")[0];

  return expenses
    .filter((expense) => Number.isFinite(expense.valor) && Math.abs(expense.valor) > 0)
    .map((expense) => ({
      id: uid("e"),
      kind: expense.tipo === "income" ? "income" : "expense",
      amount: Math.abs(expense.valor),
      label: (expense.descricao || fileName).trim(),
      category: expense.categoria || "Outros",
      account: expense.accountOrigin === "PJ" ? "PJ" : "PF",
      installments: null,
      source: `Arquivo: ${fileName}`,
      date: expense.data && /^\d{4}-\d{2}-\d{2}$/.test(expense.data) ? expense.data : today,
    }));
}

export default function Cora() {
  const { profile } = useAuth();
  const { duration, startRecording, stopRecording } = useAudioRecorder();
  const { saveEntries } = useCoraPersist();

  const [phase, setPhase] = useState<Phase>("idle");
  const [thinkingLabel, setThinkingLabel] = useState("");
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<CoraMessage[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      } catch (err: unknown) {
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
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || "Não consegui acessar o microfone.");
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
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || "Não consegui salvar agora.");
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

  const handleAttachFiles = async (selected: FileList | null) => {
    if (!selected || selected.length === 0) return;

    const selectedFiles = Array.from(selected);
    const validFiles = selectedFiles.filter((file) => file.size <= 10 * 1024 * 1024);
    const ignoredCount = selectedFiles.length - validFiles.length;

    if (ignoredCount > 0) {
      toast.error("Arquivos > 10MB foram ignorados.");
    }

    if (validFiles.length === 0) return;

    const fileNames = validFiles.map((file) => file.name).join(", ");
    setMessages((prev) => [...prev, { id: uid("u"), from: "user", kind: "text", text: `Anexei: ${fileNames}` }]);
    setPhase("thinking");
    setThinkingLabel("lendo arquivo...");

    const entries: CoraEntry[] = [];
    const errors: string[] = [];

    for (const file of validFiles) {
      try {
        const result = await SmartImportEngine.processFile(
          file,
          (message) => setThinkingLabel(message),
        );

        if (result.error) {
          errors.push(result.error);
          continue;
        }

        entries.push(...mapImportedExpensesToEntries(result.expenses, file.name));
      } catch (err: unknown) {
        errors.push(getErrorMessage(err) || `Falha lendo ${file.name}.`);
      }
    }

    if (entries.length > 0) {
      setMessages((prev) => [
        ...prev,
        {
          id: uid("c"),
          from: "cora",
          mood: "idle",
          text: `Li o arquivo${validFiles.length > 1 ? "s" : ""} e separei isso aqui:`,
          entries,
          confirmed: false,
          followup: null,
        },
      ]);
    } else {
      const reason = errors[0] ? ` ${errors[0]}` : "";
      setMessages((prev) => [
        ...prev,
        {
          id: uid("c"),
          from: "cora",
          text: `Recebi o arquivo, mas não achei lançamentos com valor pra salvar.${reason}`,
        },
      ]);
    }

    setPhase("thread");
    setThinkingLabel("");
  };

  const showWelcome = messages.length === 0 && phase !== "recording";

  return (
    <div className="cora-root" data-cora-theme="dark">
      <main className={showWelcome ? "cora-shell cora-shell--welcome" : "cora-shell"}>
        {showWelcome ? (
          <Welcome userName={firstName} />
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
          <div className="cora-thinking-slot">
            <ThinkingBubble label={thinkingLabel} />
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="sr-only"
          accept=".ofx,.qif,.qfx,.csv,.xlsx,.xls,.pdf,.jpg,.jpeg,.png,.webp,application/pdf,text/csv,image/jpeg,image/png,image/webp"
          onChange={(event) => {
            handleAttachFiles(event.target.files);
            event.target.value = "";
          }}
        />

        <InputDock
          value={draft}
          onChange={setDraft}
          onSend={handleSendText}
          onMic={handleMic}
          onAttach={() => fileInputRef.current?.click()}
          disabled={phase === "thinking"}
        />
        <MobileBottomNav embedded className="md:hidden" />

        {phase === "recording" && <RecordingOverlay seconds={duration} onCancel={handleCancelRecording} onStop={handleStopRecording} />}
      </main>
    </div>
  );
}
