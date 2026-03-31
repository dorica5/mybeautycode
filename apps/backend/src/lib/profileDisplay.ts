/** Join first + last for lists and legacy `full_name` API fields. */
export function profileDisplayName(parts: {
  firstName?: string | null;
  lastName?: string | null;
}): string | null {
  const a = parts.firstName?.trim() ?? "";
  const b = parts.lastName?.trim() ?? "";
  const s = [a, b].filter(Boolean).join(" ").trim();
  return s.length > 0 ? s : null;
}
