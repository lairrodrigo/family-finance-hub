import { useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mic, Paperclip, Send, Loader2, Sparkles, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSmartImport } from "@/hooks/useSmartImport";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { ImportHistoryModal } from "@/components/ImportHistoryModal";
import type { NormalizedExpense } from "@/services/smartImportEngine";

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

const PLACEHOLDER = "Me conte como foi seu mês. Ex.: gastei 900 na moto, recebi 4 mil da PJ, comprei uma câmera parcelada...";

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
      <Card className="animate-in zoom-in-95 rounded-[2rem] border border-white/[0.05] bg-gradient-to-br from-[#0E0E10] via-[#0A0A0C] to-[#080809] p-5 shadow-2xl duration-500 sm:rounded-[2.5rem] sm:p-7">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-black tracking-tight text-white">Descarregue o mês</h3>
            <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-muted-foreground">
              fale, escreva ou anexe — a IA organiza
            </p>
          </div>
        </div>

        <div
          className={cn(
            "rounded-[1.5rem] border bg-white/[0.02] p-3 transition-all sm:rounded-[2rem] sm:p-4",
            isThinking ? "border-primary/30" : "border-white/[0.05]",
          )}
        >
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={PLACEHOLDER}
            rows={4}
            disabled={isThinking || isRecording}
            className="w-full resize-none bg-transparent text-sm font-medium leading-relaxed text-white placeholder:text-white/20 focus:outline-none sm:text-base"
          />

          <div className="mt-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={isRecording ? handleStopRecording : handleStartRecording}
                disabled={isThinking}
                className={cn(
                  "h-10 w-10 rounded-2xl text-muted-foreground transition-all hover:bg-white/5 hover:text-white",
                  isRecording && "bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300",
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
                className="h-10 w-10 rounded-2xl text-muted-foreground transition-all hover:bg-white/5 hover:text-white"
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
                <span className="ml-2 text-[10px] font-black uppercase tracking-widest text-red-400">
                  Ouvindo {formatDuration(duration)}
                </span>
              )}
            </div>

            <Button
              type="button"
              onClick={handleTextSubmit}
              disabled={isThinking || isRecording || text.trim().length === 0}
              className="h-10 rounded-2xl bg-white px-5 text-[10px] font-black uppercase tracking-[0.2em] text-black shadow-xl shadow-white/5 transition-all hover:bg-white/90 active:scale-95 disabled:opacity-20 sm:h-11"
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
