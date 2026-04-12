import { useState, useRef, useCallback } from 'react';

interface AudioRecordResult {
  file: File;
  duration: number;
  transcript?: string;
  audioUrl?: string;
}

export const useAudioRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const mimeTypeRef = useRef<string>('');
  
  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef<string>("");

  const getSupportedMimeType = () => {
    const types = ['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/wav', ''];
    for (const type of types) {
      if (type === '' || MediaRecorder.isTypeSupported(type)) return type;
    }
    return '';
  };

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const supportedType = getSupportedMimeType();
      mimeTypeRef.current = supportedType;

      const options = supportedType ? { mimeType: supportedType } : undefined;
      const mediaRecorder = new MediaRecorder(stream, options);
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      setDuration(0);
      transcriptRef.current = "";

      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.lang = 'pt-BR';
        recognition.continuous = true;
        recognition.interimResults = true;
        
        recognition.onresult = (event: any) => {
          let fullText = "";
          for (let i = 0; i < event.results.length; i++) {
            fullText += event.results[i][0].transcript;
          }
          transcriptRef.current = fullText;
        };

        recognition.onerror = (event: any) => {
          console.error("Erro STT:", event.error);
        };

        recognition.start();
        recognitionRef.current = recognition;
      }

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.start(100);
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);

    } catch (error) {
      console.error("Erro ao acessar microfone:", error);
      throw new Error("Permissão de microfone negada.");
    }
  }, []);

  const stopRecording = useCallback((): Promise<AudioRecordResult | null> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current || mediaRecorderRef.current.state === "inactive") {
        resolve(null);
        return;
      }

      mediaRecorderRef.current.onstop = async () => {
        if (recognitionRef.current) {
          try {
            recognitionRef.current.stop();
            await new Promise(r => setTimeout(r, 400));
          } catch (e) {}
        }

        const type = mimeTypeRef.current || 'audio/webm'; 
        const audioBlob = new Blob(audioChunksRef.current, { type });
        const audioUrl = URL.createObjectURL(audioBlob);

        mediaRecorderRef.current?.stream.getTracks().forEach(track => track.stop());
        
        if (timerRef.current) clearInterval(timerRef.current);
        setIsRecording(false);

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        let ext = 'webm';
        if (type.includes('mp4')) ext = 'm4a';
        if (type.includes('ogg')) ext = 'ogg';

        const file = new File([audioBlob], `Audio-Gasto-${timestamp}.${ext}`, { type });

        resolve({
          file,
          duration,
          transcript: transcriptRef.current.trim(),
          audioUrl
        });
      };

      mediaRecorderRef.current.stop();
    });
  }, [duration]);

  return { isRecording, duration, startRecording, stopRecording };
};
