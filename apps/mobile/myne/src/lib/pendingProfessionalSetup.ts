import type { ProfessionChoiceCode } from "@/src/constants/professionCodes";

/** PUT /api/profiles/:id body for completing professional onboarding (in-memory until paywall succeeds). */
export type PendingProfessionalSetupPayload = {
  userId: string;
  professionCode: ProfessionChoiceCode;
  updateBody: {
    id: string;
    business_name: string;
    business_number: string;
    business_address: string;
    business_place_id: string | null;
    business_latitude: number | null;
    business_longitude: number | null;
    social_media: string | null;
    booking_site: string | null;
    about_me: string;
    setup_status: boolean;
    profession_code: ProfessionChoiceCode;
  };
};

let pending: PendingProfessionalSetupPayload | null = null;

export function setPendingProfessionalSetup(
  payload: PendingProfessionalSetupPayload
) {
  pending = payload;
}

export function getPendingProfessionalSetup(): PendingProfessionalSetupPayload | null {
  return pending;
}

export function clearPendingProfessionalSetup() {
  pending = null;
}
