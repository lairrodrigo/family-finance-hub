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

export function Welcome({ userName = "" }: { userName?: string }) {
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
    </section>
  );
}
