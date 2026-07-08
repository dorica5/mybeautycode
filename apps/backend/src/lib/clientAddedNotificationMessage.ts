import { normalizeProfessionCodeInput } from "./normalizeProfessionCode";

/** English fallback body; mobile localizes via type + `data.isClient` + `profession_code`. */
export function clientAddedNotificationMessage(
  clientName: string,
  professionCode: string
): string {
  const name = clientName.trim() || "A client";
  const code = normalizeProfessionCodeInput(professionCode);
  switch (code) {
    case "nails":
      return `${name} has added you as their nail technician.`;
    case "brows_lashes":
      return `${name} has added you as their brow stylist.`;
    case "barber":
      return `${name} has added you as their barber.`;
    case "esthetician":
      return `${name} has added you as their esthetician.`;
    case "hair":
      return `${name} has added you as their hairdresser.`;
    default:
      return `${name} has added you as their professional.`;
  }
}
