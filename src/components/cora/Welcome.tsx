import { useMemo } from "react";
import { CoraAvatar } from "./CoraAvatar";

function getGreeting(name: string) {
  const who = name ? `, ${name.toLowerCase()}` : "";
  const h = new Date().getHours();
  if (h < 5) return { ey: `boa madrugada${who}`, q: "fala aí", q2: "como foi a noite" };
  if (h < 12) return { ey: `bom dia${who}`, q: "me conta", q2: "como tá o dia" };
  if (h < 18) return { ey: `boa tarde${who}`, q: "me conta", q2: "como tá o dia" };
  return { ey: `boa noite${who}`, q: "me conta", q2: "como foi o dia" };
}

export function Welcome({ userName = "", onSuggest }: { userName?: string; onSuggest: (t: string) => void }) {
  const g = useMemo(() => getGreeting(userName), [userName]);
  const suggestions = ["registrar gasto de agora", "como foi minha semana", "mandar print da fatura"];
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 24px 12px", textAlign: "center", position: "relative" }}>
      <div style={{ position: "absolute", width: 380, height: 380, borderRadius: "50%", background: "radial-gradient(circle, color-mix(in srgb, var(--accent) 18%, transparent), transparent 62%)", filter: "blur(38px)", top: "8%", pointerEvents: "none" }} />
      <div style={{ position: "absolute", width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle, color-mix(in srgb, var(--accent-warm) 14%, transparent), transparent 60%)", filter: "blur(40px)", top: "38%", right: "8%", pointerEvents: "none" }} />

      <div style={{ animation: "cora-float-y 6s ease-in-out infinite", position: "relative" }}>
        <CoraAvatar size={172} mood="idle" />
      </div>

      <div style={{ marginTop: 28, fontSize: 11, fontWeight: 600, letterSpacing: 1.8, textTransform: "uppercase", color: "var(--ink-3)", display: "inline-flex", alignItems: "center", gap: 8 }}>
        <span style={{ width: 16, height: 1, background: "var(--ink-4)" }} />
        {g.ey}
        <span style={{ width: 16, height: 1, background: "var(--ink-4)" }} />
      </div>

      <h1 style={{ margin: "12px 0 18px", fontFamily: '"Bricolage Grotesque", sans-serif', fontWeight: 400, fontSize: 48, letterSpacing: -1.6, lineHeight: 0.98, color: "var(--ink)", fontVariationSettings: '"opsz" 56', textWrap: "balance" }}>
        <em style={{ color: "var(--accent)", fontStyle: "italic", fontWeight: 500 }}>{g.q},</em>
        <br />
        {g.q2}?
      </h1>

      <p style={{ margin: "0 0 6px", fontSize: 15, color: "var(--ink-3)", lineHeight: 1.5, maxWidth: 300, letterSpacing: -0.1, textWrap: "balance" }}>
        Fala à vontade. Eu escuto, organizo, devolvo tudo no lugar.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 26, alignSelf: "stretch", position: "relative", zIndex: 1 }}>
        {suggestions.map((s, i) => (
          <button
            key={i}
            onClick={() => onSuggest(s)}
            style={{ background: "transparent", border: 0, color: "var(--ink-2)", padding: "12px 14px", fontSize: 14, cursor: "pointer", letterSpacing: -0.15, display: "flex", alignItems: "center", gap: 12, fontFamily: "inherit", textAlign: "left", borderRadius: 14, transition: "background 0.15s, color 0.15s" }}
            onMouseEnter={(ev) => {
              ev.currentTarget.style.background = "var(--surf)";
              ev.currentTarget.style.color = "var(--ink)";
            }}
            onMouseLeave={(ev) => {
              ev.currentTarget.style.background = "transparent";
              ev.currentTarget.style.color = "var(--ink-2)";
            }}
          >
            <span style={{ fontFamily: '"Bricolage Grotesque", sans-serif', fontVariationSettings: '"opsz" 14', fontWeight: 500, fontStyle: "italic", color: "var(--ink-4)", fontSize: 12, width: 18, textAlign: "right" }}>{String(i + 1).padStart(2, "0")}</span>
            <span style={{ flex: 1 }}>{s}</span>
            <span style={{ color: "var(--ink-4)", fontSize: 14, lineHeight: 1, fontWeight: 500 }}>↗</span>
          </button>
        ))}
      </div>
    </div>
  );
}
