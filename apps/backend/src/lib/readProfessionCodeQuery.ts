/**
 * Reads `professionCode` / `profession_code` from Express query (handles string or string[]).
 */
export function readProfessionCodeQuery(
  q: Record<string, unknown>
): string | undefined {
  const raw = q.professionCode ?? q.profession_code;
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  if (Array.isArray(raw) && typeof raw[0] === "string" && raw[0].trim()) {
    return raw[0].trim();
  }
  return undefined;
}
