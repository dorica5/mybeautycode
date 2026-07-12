/** Digits only (e.g. counts, integer amounts). */
export function sanitizeIntegerNumericInput(raw: string): string {
  return raw.replace(/\D/g, "");
}

/** Digits and at most one decimal point (price fields). */
export function sanitizeDecimalNumericInput(raw: string): string {
  const stripped = raw.replace(/[^\d.]/g, "");
  const firstDot = stripped.indexOf(".");
  if (firstDot === -1) return stripped;
  const head = stripped.slice(0, firstDot + 1);
  const tail = stripped
    .slice(firstDot + 1)
    .replace(/\./g, "");
  return head + tail;
}

/**
 * Phone-pad fields: allow typical phone characters only so hardware / iPad
 * keyboards cannot leave letters or symbols in the value.
 */
export function sanitizeTelephonePadInput(raw: string): string {
  return raw.replace(/[^\d+\s\-().#*]/g, "");
}
