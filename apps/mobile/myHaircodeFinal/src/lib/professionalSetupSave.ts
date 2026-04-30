import type { PlaceDetails } from "@/src/components/BrandAddressAutocompleteField";
import type { ProfessionChoiceCode } from "@/src/constants/professionCodes";
import { parseProfilePhone } from "@/src/lib/profileFieldValidation";

export type ProfessionalSetupFormFields = {
  businessName: string;
  businessPhone: string;
  businessAddress: string;
  socialMedia: string;
  bookingSite: string;
  aboutMe: string;
};

export function buildProfessionalSetupProfilePutBody(args: {
  userId: string;
  professionCode: ProfessionChoiceCode;
  profileCountry: string;
  fields: ProfessionalSetupFormFields;
  placeDetails: PlaceDetails | null;
}) {
  const { userId, professionCode, profileCountry, fields, placeDetails } = args;
  if (!profileCountry.trim()) {
    throw new Error("Missing profile country");
  }

  const r = parseProfilePhone(fields.businessPhone, profileCountry);
  if (!r.ok) {
    throw new Error(r.message);
  }

  const bizAddr = fields.businessAddress.trim();
  const social = fields.socialMedia.trim();
  const booking = fields.bookingSite.trim();

  const placeStillMatches =
    placeDetails && placeDetails.formattedAddress.trim() === bizAddr;

  return {
    id: userId,
    business_name: fields.businessName.trim(),
    business_number: r.e164,
    business_address: bizAddr,
    business_place_id: placeStillMatches ? placeDetails!.placeId : null,
    business_latitude: placeStillMatches ? placeDetails!.latitude : null,
    business_longitude: placeStillMatches ? placeDetails!.longitude : null,
    social_media: social.length > 0 ? social : null,
    booking_site: booking.length > 0 ? booking : null,
    about_me: fields.aboutMe.trim(),
    setup_status: true,
    profession_code: professionCode,
  };
}
