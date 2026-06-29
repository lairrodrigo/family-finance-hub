import { useEffect, useRef, type KeyboardEvent, type ReactNode } from "react";
import { I } from "./icons";

function DockIcon({ children, onClick, title, disabled }: { children: ReactNode; onClick?: () => void; title?: string; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} title={title} disabled={disabled} className="cora-input-icon-button">
      {children}
    </button>
  );
}

export function InputDock({
  value,
  onChange,
  onSend,
  onMic,
  onAttach,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onMic: () => void;
  onAttach: () => void;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 96) + "px";
  }, [value]);

  const hasText = value.trim().length > 0;

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (hasText && !disabled) onSend();
    }
  };

  return (
    <div className="cora-input-dock">
      <div className="cora-assistant-input-card">
        <DockIcon onClick={onAttach} title="anexar print, PDF ou arquivo bancário" disabled={disabled}>{I.attach}</DockIcon>
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="diz aí. texto, áudio, print, PDF ou arquivo bancário"
          rows={1}
          disabled={disabled}
          className="cora-input-textarea"
        />
        {hasText ? (
          <button type="button" onClick={onSend} disabled={disabled} className="cora-input-action">
            <span>enviar</span>
            {I.send}
          </button>
        ) : (
          <button type="button" onClick={onMic} disabled={disabled} className="cora-input-action">
            {I.mic}
            <span>falar</span>
          </button>
        )}
      </div>
    </div>
  );
}
