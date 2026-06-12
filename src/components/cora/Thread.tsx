import type { RefObject } from "react";
import { CoraAvatar } from "./CoraAvatar";
import { EntryStack, fmt } from "./EntryCard";
import { I } from "./icons";
import type { CoraAccount, CoraMessage } from "./types";

function MiniWave() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
      {[5, 9, 12, 7, 14, 8, 10, 4, 11, 6].map((h, i) => (
        <span key={i} style={{ width: 2, height: h, background: "currentColor", borderRadius: 2, opacity: 0.7 }} />
      ))}
    </div>
  );
}

export function ThinkingBubble({ label = "tô interpretando…" }: { label?: string }) {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "center", animation: "cora-fade-up 0.3s ease-out both" }}>
      <CoraAvatar size={28} mood="thinking" />
      <div
        style={{
          background: "var(--surf)",
          border: "1px solid var(--hairline)",
          borderRadius: "4px 16px 16px 16px",
          padding: "10px 14px",
          fontSize: 13.5,
          letterSpacing: -0.1,
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontFamily: '"Bricolage Grotesque", sans-serif',
          fontStyle: "italic",
          fontVariationSettings: '"opsz" 18',
        }}
      >
        <span
          style={{
            background: "linear-gradient(90deg, var(--ink-4) 30%, var(--ink) 50%, var(--ink-4) 70%)",
            backgroundSize: "200% 100%",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            animation: "cora-shimmer 1.8s linear infinite",
          }}
        >
          {label}
        </span>
      </div>
    </div>
  );
}

function MessageRow({
  m,
  onConfirmAll,
  onEditEntry,
  onRemoveEntry,
  onAnswerFollowup,
}: {
  m: CoraMessage;
  onConfirmAll: (mid: string) => void;
  onEditEntry: (mid: string, eid: string) => void;
  onRemoveEntry: (mid: string, eid: string) => void;
  onAnswerFollowup: (mid: string, v: CoraAccount) => void;
}) {
  if (m.from === "user") {
    return (
      <div
        style={{
          alignSelf: "flex-end",
          maxWidth: "82%",
          padding: "12px 16px",
          borderRadius: "20px 20px 4px 20px",
          background: "var(--accent)",
          color: "#1A0E3F",
          fontSize: 14.5,
          lineHeight: 1.45,
          fontWeight: 500,
          letterSpacing: -0.1,
          animation: "cora-card-in 0.35s ease-out both",
          boxShadow: "0 8px 24px -10px rgba(107,91,255,0.4)",
        }}
      >
        {m.kind === "voice" && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: m.text ? 6 : 0, opacity: 0.85 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor" }} />
            <span style={{ fontSize: 11, letterSpacing: 0.4, textTransform: "uppercase", fontWeight: 600 }}>áudio · {m.duration}s</span>
            <MiniWave />
          </div>
        )}
        {m.text}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start", animation: "cora-card-in 0.4s ease-out both" }}>
      <div style={{ paddingTop: 2 }}>
        <CoraAvatar size={28} mood={m.mood || "idle"} />
      </div>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 10 }}>
        {m.text && (
          <div style={{ background: "var(--surf)", border: "1px solid var(--hairline)", borderRadius: "4px 20px 20px 20px", padding: "12px 16px", fontSize: 14.5, lineHeight: 1.5, color: "var(--ink)", letterSpacing: -0.1 }}>
            {m.text}
          </div>
        )}
        {m.entries && (
          <EntryStack
            entries={m.entries}
            confirmed={m.confirmed}
            followup={m.followup}
            onConfirmAll={() => onConfirmAll(m.id)}
            onEditEntry={(eid) => onEditEntry(m.id, eid)}
            onRemoveEntry={(eid) => onRemoveEntry(m.id, eid)}
            onAnswer={(v) => onAnswerFollowup(m.id, v)}
          />
        )}
        {m.toast && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              background: "color-mix(in srgb, var(--accent-warm) 12%, transparent)",
              border: "1px solid color-mix(in srgb, var(--accent-warm) 32%, transparent)",
              borderRadius: "4px 18px 18px 18px",
              padding: "14px 16px",
              animation: "cora-fade-up 0.4s ease-out both",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", color: "var(--accent-warm)" }}>
              <span style={{ display: "inline-flex", width: 16, height: 16, borderRadius: "50%", background: "var(--accent-warm)", color: "var(--bg)", alignItems: "center", justifyContent: "center" }}>{I.check}</span>
              tudo guardado
            </div>
            <div style={{ fontSize: 14.5, lineHeight: 1.5, color: "var(--ink)", letterSpacing: -0.1 }}>{m.toast}</div>
            {m.summary && (m.summary.pfOut > 0 || m.summary.pjIn > 0) && (
              <div style={{ display: "flex", gap: 14, marginTop: 4, paddingTop: 10, borderTop: "1px solid color-mix(in srgb, var(--accent-warm) 22%, transparent)", fontSize: 11.5, letterSpacing: 0.4, textTransform: "uppercase", fontWeight: 600 }}>
                <span style={{ color: "var(--ink-2)" }}>PF · <span style={{ color: "var(--bad)" }}>−{fmt(m.summary.pfOut).replace("R$ ", "R$")}</span></span>
                <span style={{ color: "var(--ink-4)" }}>·</span>
                <span style={{ color: "var(--ink-2)" }}>PJ · <span style={{ color: "var(--good)" }}>+{fmt(m.summary.pjIn).replace("R$ ", "R$")}</span></span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function Thread({
  messages,
  onConfirmAll,
  onEditEntry,
  onRemoveEntry,
  onAnswerFollowup,
  scrollRef,
}: {
  messages: CoraMessage[];
  onConfirmAll: (mid: string) => void;
  onEditEntry: (mid: string, eid: string) => void;
  onRemoveEntry: (mid: string, eid: string) => void;
  onAnswerFollowup: (mid: string, v: CoraAccount) => void;
  scrollRef: RefObject<HTMLDivElement>;
}) {
  return (
    <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "8px 16px 16px", display: "flex", flexDirection: "column", gap: 18 }}>
      {messages.map((m) => (
        <MessageRow key={m.id} m={m} onConfirmAll={onConfirmAll} onEditEntry={onEditEntry} onRemoveEntry={onRemoveEntry} onAnswerFollowup={onAnswerFollowup} />
      ))}
    </div>
  );
}
