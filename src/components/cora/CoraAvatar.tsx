import type { CoraMood } from "./types";

/** Orb com gradiente animado. mood ∈ idle | listening | thinking | happy */
export function CoraAvatar({ size = 56, mood = "idle", amp = 0 }: { size?: number; mood?: CoraMood; amp?: number }) {
  const eyeColor = "rgba(255,255,255,0.95)";
  return (
    <div
      style={{
        width: size,
        height: size,
        position: "relative",
        borderRadius: "50%",
        overflow: "hidden",
        flexShrink: 0,
        background: "radial-gradient(120% 110% at 30% 25%, #FFD0B4 0%, #C8B0FF 38%, #6B5BFF 78%, #2E2569 100%)",
        boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.18), 0 8px 24px -8px rgba(107,91,255,0.55)",
      }}
    >
      <div style={{ position: "absolute", inset: "-20%", filter: "blur(14px)", background: "radial-gradient(40% 40% at 70% 30%, #FFB59A 0%, transparent 60%)", animation: "cora-blob-1 6s ease-in-out infinite", mixBlendMode: "screen" }} />
      <div style={{ position: "absolute", inset: "-20%", filter: "blur(16px)", background: "radial-gradient(45% 45% at 25% 75%, #8C7BFF 0%, transparent 60%)", animation: "cora-blob-2 7s ease-in-out infinite", mixBlendMode: "screen" }} />
      <div style={{ position: "absolute", inset: "-15%", filter: "blur(12px)", background: "radial-gradient(35% 35% at 60% 60%, #FFFFFF 0%, transparent 65%)", opacity: 0.5, animation: "cora-blob-3 8s ease-in-out infinite", mixBlendMode: "overlay" }} />

      {mood === "idle" && size >= 80 && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: size * 0.18 }}>
          {[0, 1].map((i) => (
            <span key={i} style={{ width: size * 0.06, height: size * 0.09, background: eyeColor, borderRadius: "50%", display: "block", transformOrigin: "center", animation: "cora-blink 5s ease-in-out infinite" }} />
          ))}
        </div>
      )}
      {mood === "listening" && <ListeningBars size={size} amp={amp} color={eyeColor} />}
      {mood === "thinking" && size >= 80 && <ThinkingDots size={size} color={eyeColor} />}
      {mood === "happy" && size >= 80 && <Smile size={size} color={eyeColor} />}
    </div>
  );
}

function ListeningBars({ size, amp, color }: { size: number; amp: number; color: string }) {
  const bars = 5;
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: size * 0.04 }}>
      {Array.from({ length: bars }).map((_, i) => {
        const phase = i / bars;
        const h = (0.18 + Math.abs(Math.sin(Date.now() / 220 + phase * 6.28 + amp * 0.01)) * 0.42) * size;
        return <span key={i} style={{ width: size * 0.05, height: h, background: color, borderRadius: 999, display: "block", transition: "height 0.08s linear" }} />;
      })}
    </div>
  );
}

function ThinkingDots({ size, color }: { size: number; color: string }) {
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: size * 0.06 }}>
      {[0, 1, 2].map((i) => (
        <span key={i} style={{ width: size * 0.07, height: size * 0.07, background: color, borderRadius: "50%", display: "block", opacity: 0.85, animation: `cora-float-y 1.1s ease-in-out ${i * 0.15}s infinite` }} />
      ))}
    </div>
  );
}

function Smile({ size, color }: { size: number; color: string }) {
  return (
    <svg viewBox="0 0 100 100" style={{ position: "absolute", inset: 0, width: size, height: size }}>
      <circle cx="35" cy="42" r="3.5" fill={color} />
      <circle cx="65" cy="42" r="3.5" fill={color} />
      <path d="M 32 58 Q 50 72, 68 58" stroke={color} strokeWidth="3.5" strokeLinecap="round" fill="none" />
    </svg>
  );
}
