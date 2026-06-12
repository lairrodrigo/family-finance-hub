import { CoraAvatar } from "./CoraAvatar";
import { I } from "./icons";
import type { CoraAccount, CoraEntry, CoraFollowup } from "./types";

export const fmt = (n: number) => "R$ " + n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const iconBtnStyle: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 8,
  border: 0,
  background: "transparent",
  color: "var(--ink-3)",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

function AccountBadge({ account }: { account: CoraAccount }) {
  const isPJ = account === "PJ";
  const color = isPJ ? "var(--accent-warm)" : "var(--accent)";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: 0.8,
        textTransform: "uppercase",
        color,
        background: `color-mix(in srgb, ${color} 14%, transparent)`,
        border: `1px solid color-mix(in srgb, ${color} 32%, transparent)`,
        borderRadius: 6,
        padding: "3px 7px",
        whiteSpace: "nowrap",
      }}
    >
      {account}
    </span>
  );
}

export function EntryCard({
  e,
  confirmed,
  delay,
  onEdit,
  onRemove,
  highlight,
}: {
  e: CoraEntry;
  confirmed?: boolean;
  delay: number;
  onEdit: () => void;
  onRemove: () => void;
  highlight?: boolean;
}) {
  const isIn = e.kind === "income";
  const sign = isIn ? "+" : "−";
  const tone = isIn ? "var(--good)" : "var(--ink)";
  return (
    <div
      style={{
        background: "var(--surf)",
        border: highlight ? "1px solid var(--accent-warm)" : "1px solid var(--hairline)",
        borderRadius: 20,
        padding: "16px 16px 14px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        animation: `cora-card-in 0.45s ease-out ${delay}s both`,
        opacity: confirmed ? 0.55 : 1,
        position: "relative",
        transition: "opacity 0.3s, border-color 0.3s, box-shadow 0.3s",
        boxShadow: highlight ? "0 0 0 4px color-mix(in srgb, var(--accent-warm) 16%, transparent)" : "none",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <AccountBadge account={e.account} />
        {!confirmed ? (
          <div style={{ display: "flex", gap: 2 }}>
            <button onClick={onEdit} title="editar" style={iconBtnStyle}>{I.edit}</button>
            <button onClick={onRemove} title="remover" style={iconBtnStyle}>{I.trash}</button>
          </div>
        ) : (
          <div style={{ color: "var(--accent-warm)", display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>
            {I.check} salvo
          </div>
        )}
      </div>

      <div
        style={{
          fontFamily: '"Bricolage Grotesque", sans-serif',
          fontVariationSettings: '"opsz" 72',
          fontWeight: 400,
          color: tone,
          letterSpacing: -2,
          lineHeight: 0.92,
          display: "flex",
          alignItems: "baseline",
          gap: 4,
        }}
      >
        <span style={{ fontSize: 24, opacity: 0.55, marginRight: -2 }}>R$</span>
        <span style={{ fontSize: 38, opacity: 0.45, marginRight: 1 }}>{sign}</span>
        <span style={{ fontSize: 40, fontFeatureSettings: '"tnum"' }}>{Math.floor(e.amount).toLocaleString("pt-BR")}</span>
        <span style={{ fontSize: 22, opacity: 0.5 }}>,{(e.amount % 1).toFixed(2).slice(2)}</span>
      </div>

      <div>
        <div style={{ fontSize: 15, color: "var(--ink)", letterSpacing: -0.2, fontWeight: 500 }}>{e.label}</div>
        <div style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", fontSize: 11, color: "var(--ink-3)", letterSpacing: 0.6, textTransform: "uppercase", fontWeight: 600 }}>
          <span>{e.category}</span>
          <span style={{ width: 3, height: 3, borderRadius: "50%", background: "var(--ink-4)" }} />
          <span>{e.installments ? `${e.installments.n}× ${fmt(e.installments.of)}` : "à vista"}</span>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "flex-start", gap: 6, paddingTop: 10, borderTop: "1px solid var(--hairline)", fontSize: 12, color: "var(--ink-3)", letterSpacing: -0.05 }}>
        <span style={{ color: "var(--ink-4)", flexShrink: 0 }}>↳</span>
        <span style={{ fontFamily: '"Bricolage Grotesque", sans-serif', fontStyle: "italic", fontVariationSettings: '"opsz" 16' }}>{e.source}</span>
      </div>
    </div>
  );
}

function FollowupQuestion({ fu, onAnswer }: { fu: CoraFollowup; onAnswer: (v: CoraAccount) => void }) {
  return (
    <div
      style={{
        background: "color-mix(in srgb, var(--accent-warm) 8%, var(--surf))",
        border: "1px solid color-mix(in srgb, var(--accent-warm) 24%, transparent)",
        borderRadius: 18,
        padding: 14,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        animation: "cora-card-in 0.5s ease-out 0.5s both",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 10.5, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", color: "var(--accent-warm)" }}>
        <CoraAvatar size={16} mood="thinking" /> uma dúvida rápida
      </div>
      <p style={{ margin: 0, fontSize: 14.5, color: "var(--ink)", letterSpacing: -0.1, lineHeight: 1.45 }}>{fu.question}</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {fu.options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onAnswer(opt.value)}
            style={{ background: "var(--surf-2)", border: "1px solid var(--hairline-strong)", color: "var(--ink)", borderRadius: 999, padding: "8px 14px", fontSize: 12.5, fontWeight: 600, cursor: "pointer", letterSpacing: -0.05, fontFamily: "inherit" }}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function EntryStack({
  entries,
  confirmed,
  followup,
  onConfirmAll,
  onEditEntry,
  onRemoveEntry,
  onAnswer,
}: {
  entries: CoraEntry[];
  confirmed?: boolean;
  followup?: CoraFollowup | null;
  onConfirmAll: () => void;
  onEditEntry: (eid: string) => void;
  onRemoveEntry: (eid: string) => void;
  onAnswer: (v: CoraAccount) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {entries.map((e, i) => (
        <EntryCard
          key={e.id}
          e={e}
          confirmed={confirmed}
          delay={i * 0.08}
          highlight={!!followup && followup.entryId === e.id && !followup.answered}
          onEdit={() => onEditEntry(e.id)}
          onRemove={() => onRemoveEntry(e.id)}
        />
      ))}
      {!confirmed && followup && !followup.answered && <FollowupQuestion fu={followup} onAnswer={onAnswer} />}
      {!confirmed && entries.length > 0 && (!followup || followup.answered) && (
        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
          <button
            onClick={onConfirmAll}
            style={{ flex: 1, background: "var(--ink)", color: "var(--bg)", border: 0, borderRadius: 14, padding: "14px 14px", fontSize: 13.5, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, letterSpacing: -0.1 }}
          >
            {I.check} confirmar tudo
          </button>
        </div>
      )}
    </div>
  );
}
