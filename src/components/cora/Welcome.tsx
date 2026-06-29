import { useMemo, type ReactNode } from "react";
import { CoraAvatar } from "./CoraAvatar";
import { I } from "./icons";

function getGreeting(name: string) {
  const who = name ? `, ${name.toLowerCase()}` : "";
  const h = new Date().getHours();
  if (h < 5) return { ey: `boa madrugada${who}`, q: "fala aí", q2: "como foi a noite" };
  if (h < 12) return { ey: `bom dia${who}`, q: "me conta", q2: "como tá o dia" };
  if (h < 18) return { ey: `boa tarde${who}`, q: "me conta", q2: "como tá o dia" };
  return { ey: `boa noite${who}`, q: "me conta", q2: "como foi o dia" };
}

const QUICK_ACTIONS = [
  { label: "registrar gasto de agora", icon: I.wallet },
  { label: "como foi minha semana", icon: I.history },
  { label: "mandar print da fatura", icon: I.attach },
];

function QuickActionCard({
  index,
  icon,
  label,
  onClick,
}: {
  index: number;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className="cora-quick-action-card">
      <span className="cora-quick-action-badge">{String(index + 1).padStart(2, "0")}</span>
      <span className="cora-quick-action-icon">{icon}</span>
      <span className="cora-quick-action-label">{label}</span>
      <span className="cora-quick-action-arrow">{I.send}</span>
    </button>
  );
}

export function Welcome({ userName = "", onSuggest }: { userName?: string; onSuggest: (t: string) => void }) {
  const g = useMemo(() => getGreeting(userName), [userName]);

  return (
    <section className="cora-welcome">
      <div className="cora-avatar-stage">
        <CoraAvatar size={128} mood="idle" />
      </div>

      <div className="cora-greeting">
        <span />
        {g.ey}
        <span />
      </div>

      <h1 className="cora-headline">
        <em>{g.q},</em>
        <br />
        {g.q2}?
      </h1>

      <p className="cora-subtitle">Fala à vontade. Eu escuto, organizo, devolvo tudo no lugar.</p>

      <div className="cora-quick-actions" aria-label="Ações rápidas">
        <div className="cora-quick-actions-title">AÇÕES RÁPIDAS</div>
        {QUICK_ACTIONS.map((action, index) => (
          <QuickActionCard
            key={action.label}
            index={index}
            icon={action.icon}
            label={action.label}
            onClick={() => onSuggest(action.label)}
          />
        ))}
      </div>
    </section>
  );
}
