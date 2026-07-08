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

export function splitDisplayName(full: string | null | undefined): {
  firstName: string | null;
  lastName: string | null;
} {
  const trimmed = full?.trim() ?? "";
  if (!trimmed) return { firstName: null, lastName: null };
  const space = trimmed.indexOf(" ");
  if (space === -1) return { firstName: trimmed, lastName: null };
  return {
    firstName: trimmed.slice(0, space).trim() || null,
    lastName: trimmed.slice(space + 1).trim() || null,
  };
}

/** Pro-facing public name: stored parts, else legacy display_name string. */
export function professionalProfileDisplayName(pro: {
  firstName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
} | null | undefined): string | null {
  if (!pro) return null;
  const fromParts = profileDisplayName(pro);
  if (fromParts) return fromParts;
  const legacy = pro.displayName?.trim();
  return legacy || null;
}
