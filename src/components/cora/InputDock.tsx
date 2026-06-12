import { useEffect, useRef, type ReactNode } from "react";
import { I } from "./icons";

function DockIcon({ children, onClick, title }: { children: ReactNode; onClick?: () => void; title?: string }) {
  return (
    <button onClick={onClick} title={title} style={{ width: 34, height: 34, borderRadius: 10, border: 0, background: "transparent", color: "var(--ink-3)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
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
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }, [value]);
  const hasText = value.trim().length > 0;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (hasText && !disabled) onSend();
    }
  };

  return (
    <div style={{ padding: "12px 14px 10px", background: "var(--bg)", borderTop: "1px solid var(--hairline)" }}>
      <div style={{ background: "var(--surf)", borderRadius: 22, border: "1px solid var(--hairline)", padding: "12px 14px 10px", display: "flex", flexDirection: "column", gap: 8, transition: "border-color 0.2s, background 0.2s" }}>
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="diz aí. texto, áudio, ou anexa um print"
          rows={1}
          disabled={disabled}
          style={{ background: "transparent", border: 0, outline: "none", resize: "none", color: "var(--ink)", fontSize: 15, lineHeight: 1.4, letterSpacing: -0.1, padding: "2px 2px", fontFamily: "inherit", minHeight: 22 }}
        />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 2 }}>
            <DockIcon onClick={onAttach} title="anexar">{I.attach}</DockIcon>
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {hasText ? (
              <button onClick={onSend} disabled={disabled} style={{ background: "var(--ink)", color: "var(--bg)", border: 0, borderRadius: 999, padding: "9px 16px", fontSize: 12.5, fontWeight: 600, cursor: "pointer", letterSpacing: -0.1, display: "flex", alignItems: "center", gap: 6, animation: "cora-fade-up 0.2s ease-out both" }}>
                enviar {I.send}
              </button>
            ) : (
              <button onClick={onMic} disabled={disabled} style={{ background: "var(--accent)", color: "var(--bg)", border: 0, borderRadius: 999, padding: "9px 14px 9px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer", letterSpacing: 1, textTransform: "uppercase", display: "flex", alignItems: "center", gap: 7, boxShadow: "0 8px 24px -10px var(--accent)" }}>
                {I.mic} <span>falar</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
