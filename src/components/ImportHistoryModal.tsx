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

  return (
    <Dialog open={open} onOpenChange={(val) => !val && handleClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isReviewing ? "Revisar Dados Extraídos" : "Importação Inteligente"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          
          {/* FASE 1: UPLOAD */}
          {!isReviewing ? (
            <>
              {/* Gravador de Voz Rápido */}
              {!isProcessing && (
                <div className={cn(
                  "p-4 border rounded-lg flex items-center justify-between transition-colors",
                  isRecording ? "bg-primary/5 border-primary" : "bg-muted/30"
                )}>
                  <div className="flex items-center gap-3">
                    <Mic className={cn("h-5 w-5", isRecording && "text-primary animate-pulse")} />
                    <div>
                      <p className="text-sm font-medium">{isRecording ? "Gravando áudio..." : "Gravar Gasto"}</p>
                      <p className="text-xs text-muted-foreground">
                        {isRecording ? formatDuration(duration) : (isSpeechSupported ? "Fale: 'Gastei 50 no pão'" : "O áudio será anexado")}
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={isRecording ? handleStopRecording : handleStartRecording}
                    variant={isRecording ? "destructive" : "secondary"}
                    size="sm"
                  >
                    {isRecording ? <Square className="h-4 w-4" /> : "Gravar"}
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
                      "relative border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer block",
                      isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/20 hover:border-primary/50"
                    )}
                  >
                    <input
                      id="file-upload-input"
                      type="file"
                      multiple
                      className="sr-only"
                      onChange={(e) => { if (e.target.files) addFiles(Array.from(e.target.files)); }}
                      accept=".xlsx,.xls,.csv,.pdf,.jpg,.jpeg,.png,.mp3,.wav,.m4a"
                    />
                    <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm">Arraste a <span className="text-primary font-medium">Planilha</span>, Imagem ou PDF</p>
                    <p className="text-xs text-muted-foreground mt-1">Ou clique para buscar no dispositivo</p>
                  </label>
                </div>
              )}

              {/* Arquivos Selecionados */}
              {files.length > 0 && !isProcessing && (
                <div className="space-y-2 pt-2">
                  {files.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-muted rounded-md text-xs">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="truncate max-w-[250px]">{item.file.name}</span>
                        {item.transcript && <span className="text-[10px] text-primary italic bg-primary/10 px-1 rounded">Voz Capturada</span>}
                      </div>
                      <X className="h-4 w-4 cursor-pointer text-muted-foreground hover:text-red-500" onClick={() => removeFile(idx)} />
                    </div>
                  ))}
                </div>
              )}

              {/* Estado de Processamento */}
              {isProcessing && (
                <div className="space-y-4 py-8 text-center animate-in fade-in duration-300">
                  <Loader2 className="h-10 w-10 text-primary animate-spin mx-auto" />
                  <p className="text-sm font-bold">{progressMessage || "Analisando..."}</p>
                </div>
              )}

              {/* Ações Upload */}
              {!isProcessing && (
                <div className="flex gap-2 pt-4">
                  <Button variant="outline" className="flex-1" onClick={handleClose}>
                    Cancelar
                  </Button>
                  <Button className="flex-1" onClick={extractData} disabled={files.length === 0}>
                    Extrair Dados <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              )}
            </>
          ) : (
            /* FASE 2: REVISÃO DE DADOS */
            <div className="space-y-6">
              <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
                {extractedExpenses.map((expense, idx) => (
                  <div key={idx} className="p-4 border rounded-lg bg-card space-y-3 relative">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="absolute top-2 right-2 h-6 w-6 text-muted-foreground hover:text-red-500"
                      onClick={() => removeExpense(idx)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold text-muted-foreground opacity-50 uppercase">
                        Origem: {expense.origem}
                      </div>
                      
                      {/* Player de Áudio p/ Apoio Visual se for áudio */}
                      {expense.origem === 'audio' && expense.audioUrl && (
                        <audio 
                          src={expense.audioUrl} 
                          controls 
                          className="h-6 w-32 scale-90"
                        />
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase">Data</Label>
                        <Input 
                          type="date"
                          value={expense.data}
                          onChange={(e) => updateExpense(idx, 'data', e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase">Valor (R$)</Label>
                        <Input 
                          type="number"
                          value={expense.valor}
                          onChange={(e) => updateExpense(idx, 'valor', parseFloat(e.target.value))}
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase">Descrição</Label>
                      <Input 
                        value={expense.descricao}
                        onChange={(e) => updateExpense(idx, 'descricao', e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase">Categoria Associada</Label>
                      <Input 
                        value={expense.categoria}
                        onChange={(e) => updateExpense(idx, 'categoria', e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {extractedExpenses.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-4">Nenhum gasto na lista.</p>
              )}
              
              {/* Processando salvamento */}
              {isProcessing && (
                <div className="text-center">
                  <p className="text-sm font-bold flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> {progressMessage}
                  </p>
                </div>
              )}

              {/* Ações Revisão */}
              {!isProcessing && (
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" className="flex-1" onClick={handleClose}>
                    Descartar Tudo
                  </Button>
                  <Button className="flex-1" onClick={handleFinalConfirm} disabled={extractedExpenses.length === 0}>
                    Confirmar e Salvar
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
