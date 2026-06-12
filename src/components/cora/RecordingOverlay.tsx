import { useEffect, useState } from "react";
import { CoraAvatar } from "./CoraAvatar";
import { I } from "./icons";

function Waveform({ amps }: { amps: number[] }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 3, height: 56, width: "100%", maxWidth: 320 }}>
      {amps.map((a, i) => (
        <span key={i} style={{ width: 3, height: `${a * 100}%`, minHeight: 4, background: "var(--accent)", opacity: 0.3 + (i / amps.length) * 0.7, borderRadius: 2, transition: "height 0.08s linear" }} />
      ))}
    </div>
  );
}

/** Overlay fullscreen de gravacao. `seconds` vem do useAudioRecorder (duracao real). */
export function RecordingOverlay({ seconds, onCancel, onStop }: { seconds: number; onCancel: () => void; onStop: () => void }) {
  const [amps, setAmps] = useState<number[]>(() => Array.from({ length: 42 }, () => 0.3));
  useEffect(() => {
    let raf: ReturnType<typeof setTimeout>;
    function tick() {
      setAmps((prev) => {
        const next = prev.slice(1);
        next.push(0.25 + Math.random() * 0.75);
        return next;
      });
      raf = setTimeout(tick, 90);
    }
    tick();
    return () => clearTimeout(raf);
  }, []);

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  return (
    <div style={{ position: "absolute", inset: 0, background: "var(--bg)", zIndex: 20, display: "flex", flexDirection: "column", animation: "cora-fade-up 0.4s cubic-bezier(.2,.7,.3,1) both", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(60% 50% at 50% 30%, color-mix(in srgb, var(--accent) 18%, transparent), transparent 70%)", animation: "cora-float-y 6s ease-in-out infinite" }} />

      <div style={{ padding: "60px 24px 0", display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative", zIndex: 2 }}>
        <button onClick={onCancel} style={{ background: "transparent", border: 0, color: "var(--ink-3)", fontSize: 13.5, cursor: "pointer", letterSpacing: -0.1, padding: "6px 4px" }}>cancelar</button>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 10.5, fontWeight: 600, letterSpacing: 1.4, textTransform: "uppercase", color: "var(--ink-3)" }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent-warm)", boxShadow: "0 0 12px var(--accent-warm)", animation: "cora-float-y 1.4s ease-in-out infinite" }} />
          ouvindo
        </div>
        <div style={{ width: 60 }} />
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 32, padding: "0 28px", position: "relative", zIndex: 2 }}>
        <CoraAvatar size={170} mood="listening" amp={amps[amps.length - 1] * 100} />
        <div style={{ fontFamily: '"Bricolage Grotesque", sans-serif', fontVariationSettings: '"opsz" 72', fontSize: 56, fontWeight: 300, letterSpacing: -2, color: "var(--ink)", lineHeight: 1, fontFeatureSettings: '"tnum"' }}>
          {mm}<span style={{ color: "var(--accent-warm)" }}>:</span>{ss}
        </div>
        <Waveform amps={amps} />
      </div>

      <div style={{ padding: "0 24px 44px", display: "flex", flexDirection: "column", alignItems: "center", gap: 14, position: "relative", zIndex: 2 }}>
        <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: 1.4, textTransform: "uppercase", color: "var(--ink-3)" }}>toque pra parar quando terminar</div>
        <button onClick={onStop} style={{ width: 80, height: 80, borderRadius: "50%", border: 0, cursor: "pointer", background: "var(--ink)", color: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 18px 50px -10px color-mix(in srgb, var(--ink) 50%, transparent)" }}>
          {I.stop}
        </button>
      </div>
    </div>
  );
}
