import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ImportHistoryModal } from "@/components/ImportHistoryModal";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { useSmartImport } from "@/hooks/useSmartImport";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import type { NormalizedExpense } from "@/services/smartImportEngine";
import { Loader2, Mic, Paperclip, Send, Sparkles, Square } from "lucide-react";
import { toast } from "sonner";

interface ConversationalInputProps {
  onSuccess?: () => void;
}

type AIRawTransaction = {
  date?: string;
  amount?: number;
  description?: string;
  type?: "income" | "expense";
  categorySuggestion?: string;
  origin?: "PF" | "PJ";
};

const PLACEHOLDER =
  "Me conte como foi seu mês. Ex.: gastei 900 na moto, recebi 4 mil da PJ, comprei uma câmera parcelada...";

export const ConversationalInput = ({ onSuccess }: ConversationalInputProps) => {
  const smartImport = useSmartImport();
  const { isRecording, duration, startRecording, stopRecording } = useAudioRecorder();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [text, setText] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const formatDuration = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  const handleTextSubmit = async () => {
    const payload = text.trim();
    if (!payload) {
      toast.error("Escreve alguma coisa antes de mandar.");
      return;
    }

    setIsThinking(true);
    try {
      const { data, error } = await supabase.functions.invoke("process-financial-text", {
        body: { text: payload },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const transactions = (data?.transactions ?? []) as AIRawTransaction[];

      if (!Array.isArray(transactions) || transactions.length === 0) {
        toast.error("Não encontrei movimentações no texto. Tente reescrever com valores.");
        return;
      }

      const today = new Date().toISOString().split("T")[0];
      const mapped: NormalizedExpense[] = transactions
        .filter((t) => typeof t.amount === "number" && !isNaN(t.amount))
        .map((t) => ({
          valor: Math.abs(t.amount as number),
          data: t.date && /^\d{4}-\d{2}-\d{2}$/.test(t.date) ? t.date : today,
          descricao: (t.description || "Sem descrição").trim(),
          categoria: t.categorySuggestion || "Outros",
          origem: "texto",
          tipo: t.type || "expense",
          accountOrigin: t.origin || "PF",
        }));

      if (mapped.length === 0) {
        toast.error("Os itens extraídos vieram sem valor. Reescreva com números.");
        return;
      }

      smartImport.loadExpensesForReview(mapped);
      setText("");
      setModalOpen(true);
    } catch (err: any) {
      console.error("ConversationalInput: erro ao interpretar texto", err);
      toast.error(err?.message || "Falha ao interpretar o texto.");
    } finally {
      setIsThinking(false);
    }
  };

  const handleStartRecording = async () => {
    try {
      await startRecording();
    } catch (err: any) {
      toast.error(err.message || "Erro ao iniciar microfone. Verifique as permissões.");
    }
  };

  const handleStopRecording = async () => {
    const result = await stopRecording();
    if (result?.file) {
      smartImport.addFiles([result.file], result.transcript);
      setModalOpen(true);
    }
  };

  const handleFiles = (selected: FileList | null) => {
    if (!selected || selected.length === 0) return;
    smartImport.addFiles(Array.from(selected));
    setModalOpen(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      void handleTextSubmit();
    }
  };

  return (
    <>
      <Card className="premium-light-card animate-in zoom-in-95 rounded-[1.5rem] p-5 text-[#0F172A] duration-500 sm:p-7">
        <div className="mb-5 flex items-center gap-4">
          <div className="primary-action flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="font-display text-xl font-extrabold tracking-tight text-[#0F172A]">Descarregue o mês</h3>
            <p className="mt-1 text-[10px] font-extrabold uppercase tracking-[0.24em] text-[#7B8798]">
              fale, escreva ou anexe - a IA organiza
            </p>
          </div>
        </div>

        <div
          className={cn(
            "rounded-[1.35rem] border bg-[#EEF3FF]/70 p-4 shadow-inner transition-all sm:rounded-[1.5rem] sm:p-5",
            isThinking ? "border-[#5B8CFF]/60 shadow-[#5B8CFF]/10" : "border-white/80",
          )}
        >
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={PLACEHOLDER}
            rows={4}
            disabled={isThinking || isRecording}
            className="w-full resize-none bg-transparent text-base font-semibold leading-relaxed text-[#243047] placeholder:text-[#65738A] focus:outline-none"
          />

          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={isRecording ? handleStopRecording : handleStartRecording}
                disabled={isThinking}
                className={cn(
                  "h-11 w-11 rounded-2xl text-[#243047] hover:bg-white/80 hover:text-[#0F172A]",
                  isRecording && "bg-red-500/10 text-red-500 hover:bg-red-500/20 hover:text-red-500",
                )}
              >
                {isRecording ? <Square className="h-4 w-4 fill-current" /> : <Mic className="h-4 w-4" />}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                disabled={isThinking || isRecording}
                className="h-11 w-11 rounded-2xl text-[#243047] hover:bg-white/80 hover:text-[#0F172A]"
              >
                <Paperclip className="h-4 w-4" />
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="sr-only"
                accept=".xlsx,.xls,.csv,.pdf,.jpg,.jpeg,.png,.mp3,.wav,.m4a"
                onChange={(e) => {
                  handleFiles(e.target.files);
                  e.target.value = "";
                }}
              />

              {isRecording && (
                <span className="ml-2 text-[10px] font-black uppercase tracking-widest text-red-500">
                  Ouvindo {formatDuration(duration)}
                </span>
              )}
            </div>

            <Button
              type="button"
              onClick={handleTextSubmit}
              disabled={isThinking || isRecording || text.trim().length === 0}
              className="h-11 rounded-2xl px-5 text-[10px] font-black uppercase tracking-[0.22em] sm:px-7"
            >
              {isThinking ? (
                <>
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> Pensando
                </>
              ) : (
                <>
                  Analisar <Send className="ml-2 h-3.5 w-3.5" />
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>

      <ImportHistoryModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => {
          setModalOpen(false);
          if (onSuccess) onSuccess();
        }}
        smartImport={smartImport}
      />
    </>
  );
};
