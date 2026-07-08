/** Map common aliases / typos to `professions.code` values. */
export function normalizeProfessionCodeInput(raw: string): string {
  const t = raw.trim().toLowerCase().replace(/\s+/g, "_");
  if (t === "nail" || t === "nail_technician" || t === "nailtech") return "nails";
  if (t === "hairdresser" || t === "hair_dresser") return "hair";
  if (t === "brow" || t === "brows" || t === "lashes" || t === "brow_stylist")
    return "brows_lashes";
  if (t === "consumer" || t === "personal") return "client";
  return t;
}
