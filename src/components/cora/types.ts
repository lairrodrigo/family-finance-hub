export type CoraMood = "idle" | "listening" | "thinking" | "happy";

export type CoraAccount = "PF" | "PJ";

export interface CoraEntry {
  id: string;
  kind: "income" | "expense";
  amount: number;
  label: string;
  category: string;
  account: CoraAccount;
  installments: { n: number; of: number } | null;
  source: string;
  /** data ISO (yyyy-mm-dd) usada na persistencia */
  date: string;
}

export interface CoraFollowup {
  entryId: string;
  question: string;
  options: { value: CoraAccount; label: string }[];
  answered: boolean;
  value?: CoraAccount;
}

export interface CoraMessage {
  id: string;
  from: "user" | "cora";
  kind?: "text" | "voice";
  /** duracao do audio em segundos (mensagens de voz) */
  duration?: number;
  text?: string;
  mood?: CoraMood;
  entries?: CoraEntry[];
  confirmed?: boolean;
  followup?: CoraFollowup | null;
  toast?: string;
  summary?: { pfOut: number; pjIn: number };
}
