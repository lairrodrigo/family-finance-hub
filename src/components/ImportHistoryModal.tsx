import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useSmartImport } from "@/hooks/useSmartImport";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { Upload, FileText, X, Mic, Square, Loader2, ArrowRight } from "lucide-react";
import { useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface ImportHistoryModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ImportHistoryModal = ({ open, onClose, onSuccess }: ImportHistoryModalProps) => {
  const { 
    files, 
    addFiles,
    removeFile,
    isProcessing,
    progressMessage,
    isReviewing,
    extractedExpenses,
    updateExpense,
    removeExpense,
    extractData,
    confirmAndSave,
    resetFull
  } = useSmartImport();
  
  const { isRecording, duration, startRecording, stopRecording } = useAudioRecorder();
  const [isDragging, setIsDragging] = useState(false);
  const isSpeechSupported = !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleStopRecording = async () => {
    const result = await stopRecording();
    if (result && result.file) {
      addFiles([result.file], result.transcript);
    }
  };

  const handleStartRecording = async () => {
    try {
      await startRecording();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao iniciar microfone. Verifique suas permissões.');
    }
  };

  const handleFinalConfirm = async () => {
    const success = await confirmAndSave();
    if (success) {
      onSuccess();
      onClose();
    }
  };

  const handleClose = () => {
    resetFull();
    onClose();
  };

  const formatDuration = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (    <Dialog open={open} onOpenChange={(val) => !val && handleClose()}>
      <DialogContent className="sm:max-w-lg max-h-[95dvh] overflow-y-auto p-6 sm:p-10 border border-white/[0.05] bg-[#0C0C0E] text-white">
        <DialogHeader className="mb-6">
          <DialogTitle className="text-2xl sm:text-3xl font-black tracking-tighter text-white">
            {isReviewing ? "Revisar" : "Importar"}
          </DialogTitle>
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            {isReviewing ? `${extractedExpenses.length} transações encontradas` : "Fale, envie fotos ou planilhas"}
          </p>
        </DialogHeader>

        <div className="space-y-6">
          
          {/* FASE 1: UPLOAD */}
          {!isReviewing ? (
            <>
              {/* Gravador de Voz Rápido */}
              {!isProcessing && (
                <div className={cn(
                  "p-5 sm:p-6 border rounded-[1.5rem] sm:rounded-[2rem] flex items-center justify-between transition-all duration-500",
                  isRecording ? "bg-primary/10 border-primary/50 shadow-[0_0_30px_rgba(59,130,246,0.15)] scale-[1.02]" : "bg-white/[0.02] border-white/[0.05]"
                )}>
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "h-12 w-12 rounded-2xl flex items-center justify-center transition-all",
                      isRecording ? "bg-primary text-white" : "bg-white/[0.03] text-muted-foreground"
                    )}>
                      <Mic className={cn("h-6 w-6", isRecording && "animate-pulse")} />
                    </div>
                    <div>
                      <p className="text-sm font-black text-white">{isRecording ? "Ouvindo você..." : "Gravar Gasto"}</p>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                        {isRecording ? formatDuration(duration) : (isSpeechSupported ? "Fale naturalmente" : "Anexar áudio")}
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={isRecording ? handleStopRecording : handleStartRecording}
                    variant="ghost"
                    className={cn(
                      "h-12 w-12 rounded-2xl p-0 transition-all active:scale-90",
                      isRecording ? "bg-red-500/10 text-red-500 hover:bg-red-500/20" : "bg-white/5 text-muted-foreground hover:bg-white/10"
                    )}
                  >
                    {isRecording ? <Square className="h-5 w-5 fill-current" /> : <Mic className="h-5 w-5" />}
                  </Button>
                </div>
              )}

              {/* Área de Dropzone Simples */}
              {!isProcessing && (
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    if (e.dataTransfer.files) addFiles(Array.from(e.dataTransfer.files));
                  }}
                >
                  <label
                    htmlFor="file-upload-input"
                    className={cn(
                      "relative border-2 border-dashed rounded-[2rem] p-10 text-center transition-all cursor-pointer block group",
                      isDragging ? "border-primary bg-primary/5 scale-[1.01]" : "border-white/5 bg-white/[0.01] hover:border-white/20 hover:bg-white/[0.03]"
                    )}
                  >
                    <input
                      id="file-upload-input"
                      type="file"
                      multiple
                      className="sr-only"
                      onChange={(e) => { if (e.target.files) addFiles(Array.from(e.target.files)); }}
                      accept=".xlsx,.xls,.cvs,.pdf,.jpg,.jpeg,.png,.mp3,.wav,.m4a"
                    />
                    <div className="h-16 w-16 bg-white/[0.03] rounded-3xl flex items-center justify-center mx-auto mb-4 border border-white/[0.05] group-hover:scale-110 transition-transform">
                      <Upload className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <p className="text-sm font-black text-white">Planilha ou Comprovante</p>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1.5">Arraste aqui ou toque para buscar</p>
                  </label>
                </div>
              )}

              {/* Arquivos Selecionados */}
              {files.length > 0 && !isProcessing && (
                <div className="space-y-3 pt-2">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Arquivos prontos ({files.length})</p>
                  {files.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 bg-white/[0.03] border border-white/[0.05] rounded-2xl group animate-in slide-in-from-left-2 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 bg-white/5 rounded-lg flex items-center justify-center">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-white/90 truncate max-w-[180px]">{item.file.name}</span>
                          {item.transcript && <span className="text-[8px] text-primary font-black uppercase tracking-widest mt-0.5">Captura de Voz</span>}
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-red-500/10 hover:text-red-500 text-muted-foreground" onClick={() => removeFile(idx)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Estado de Processamento */}
              {isProcessing && (
                <div className="space-y-6 py-12 text-center animate-in fade-in duration-500">
                  <div className="relative inline-block">
                    <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full animate-pulse" />
                    <Loader2 className="h-14 w-14 text-primary animate-spin relative" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-xl font-black tracking-tight text-white">{progressMessage || "Analisando..."}</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Isso pode levar alguns segundos</p>
                  </div>
                </div>
              )}

              {/* Ações Upload */}
              {!isProcessing && (
                <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-white/5">
                  <Button variant="ghost" className="flex-1 h-14 rounded-2xl font-black text-[10px] uppercase tracking-widest text-muted-foreground hover:text-white" onClick={handleClose}>
                    Cancelar
                  </Button>
                  <Button 
                    className="flex-1 h-14 rounded-2xl bg-white text-black font-black text-[10px] uppercase tracking-widest hover:bg-white/90 shadow-xl shadow-white/5 disabled:opacity-20 active:scale-95 transition-all" 
                    onClick={extractData} 
                    disabled={files.length === 0}
                  >
                    Analisar <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              )}
            </>
          ) : (
            /* FASE 2: REVISÃO DE DADOS */
            <div className="space-y-6">
              <div className="space-y-4 max-h-[60dvh] overflow-y-auto pr-2 custom-scrollbar">
                {extractedExpenses.map((expense, idx) => (
                  <div key={idx} className="p-5 sm:p-6 border border-white/5 rounded-[1.75rem] sm:rounded-[2rem] bg-white/[0.01] space-y-5 relative group animate-in slide-in-from-bottom-4 duration-300" style={{ animationDelay: `${idx * 100}ms` }}>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="absolute top-4 right-4 h-8 w-8 rounded-xl text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                      onClick={() => removeExpense(idx)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    
                    <div className="flex items-center justify-between">
                      <Badge className="bg-white/5 text-muted-foreground font-black text-[8px] uppercase tracking-widest border-none">
                        Origem: {expense.origem}
                      </Badge>
                      
                      {expense.origem === 'audio' && expense.audioUrl && (
                        <audio 
                          src={expense.audioUrl} 
                          controls 
                          className="h-6 w-32 scale-90 opacity-40 hover:opacity-100 transition-opacity"
                        />
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Data</Label>
                        <Input 
                          type="date"
                          value={expense.data}
                          onChange={(e) => updateExpense(idx, 'data', e.target.value)}
                          className="h-12 bg-white/[0.02] border-white/5 rounded-xl font-black text-sm transition-all focus:border-primary/50"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Valor (R$)</Label>
                        <Input 
                          type="number"
                          value={expense.valor}
                          onChange={(e) => updateExpense(idx, 'valor', parseFloat(e.target.value))}
                          className="h-12 bg-white/[0.02] border-white/5 rounded-xl font-black text-sm transition-all focus:border-primary/50"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Descrição</Label>
                      <Input 
                        value={expense.descricao}
                        onChange={(e) => updateExpense(idx, 'descricao', e.target.value)}
                        className="h-12 bg-white/[0.02] border-white/5 rounded-xl font-black text-sm transition-all focus:border-primary/50"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Sugestão de Categoria</Label>
                      <Input 
                        value={expense.categoria}
                        onChange={(e) => updateExpense(idx, 'categoria', e.target.value)}
                        className="h-12 bg-white/5 border-primary/20 text-primary rounded-xl font-black text-sm transition-all"
                      />
                    </div>
                  </div>
                ))}

                {extractedExpenses.length === 0 && (
                  <div className="py-20 text-center space-y-4 bg-white/[0.01] border-2 border-dashed border-white/5 rounded-[2rem]">
                    <div className="h-16 w-16 bg-white/5 rounded-full flex items-center justify-center mx-auto">
                      <FileText className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-black text-muted-foreground uppercase tracking-widest">Nenhum dado extraído</p>
                  </div>
                )}
              </div>
              
              {/* Processando salvamento */}
              {isProcessing && (
                <div className="text-center py-4 animate-pulse">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary flex items-center justify-center gap-3">
                    <Loader2 className="h-4 w-4 animate-spin" /> {progressMessage}
                  </p>
                </div>
              )}

              {/* Ações Revisão */}
              {!isProcessing && (
                <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-white/5">
                  <Button variant="ghost" className="flex-1 h-14 rounded-2xl font-black text-[10px] uppercase tracking-widest text-muted-foreground hover:text-white" onClick={handleClose}>
                    Descartar Tudo
                  </Button>
                  <Button 
                    className="flex-1 h-14 rounded-2xl bg-white text-black font-black text-[10px] uppercase tracking-widest hover:bg-white/90 shadow-xl shadow-white/5 disabled:opacity-20 active:scale-95 transition-all" 
                    onClick={handleFinalConfirm} 
                    disabled={extractedExpenses.length === 0}
                  >
                    Salvar no Histórico
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};


