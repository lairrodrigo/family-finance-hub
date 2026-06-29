const MOJIBAKE_REPLACEMENTS: Array<[string, string]> = [
  ["\u00c3\u00a1", "\u00e1"],
  ["\u00c3\u00a0", "\u00e0"],
  ["\u00c3\u00a2", "\u00e2"],
  ["\u00c3\u00a3", "\u00e3"],
  ["\u00c3\u00a7", "\u00e7"],
  ["\u00c3\u00a9", "\u00e9"],
  ["\u00c3\u00aa", "\u00ea"],
  ["\u00c3\u00ad", "\u00ed"],
  ["\u00c3\u00b3", "\u00f3"],
  ["\u00c3\u00b4", "\u00f4"],
  ["\u00c3\u00b5", "\u00f5"],
  ["\u00c3\u00ba", "\u00fa"],
  ["\u00c3\u00bc", "\u00fc"],
  ["\u00c2", ""],
];

export const fixMojibake = (value?: string | null) => {
  const text = value ?? "";
  if (!text.includes("\u00c3") && !text.includes("\u00c2")) return text;

  return MOJIBAKE_REPLACEMENTS.reduce(
    (current, [from, to]) => current.split(from).join(to),
    text,
  );
};
