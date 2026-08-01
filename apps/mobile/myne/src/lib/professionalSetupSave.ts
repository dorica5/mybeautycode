import type { PlaceDetails } from "@/src/components/BrandAddressAutocompleteField";
import type { ProfessionChoiceCode } from "@/src/constants/professionCodes";
import { parseProfilePhone } from "@/src/lib/profileFieldValidation";
import { validateExternalUrl } from "@/src/lib/safeExternalUrl";
import { sanitizeDiscoveryCategoriesForProfession } from "@/src/constants/profDiscoveryCategories";

export type ProfessionalSetupFormFields = {
  businessName: string;
  businessPhone: string;
  businessAddress: string;
  socialMedia: string;
  bookingSite: string;
};

export function buildProfessionalSetupProfilePutBody(args: {
  userId: string;
  professionCode: ProfessionChoiceCode;
  profileCountry: string;
  fields: ProfessionalSetupFormFields;
  placeDetails: PlaceDetails | null;
  discoveryCategories?: string[];
}) {
  const {
    userId,
    professionCode,
    profileCountry,
    fields,
    placeDetails,
    discoveryCategories,
  } = args;
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

  let socialMedia: string | null = null;
  if (social.length > 0) {
    const socialResult = validateExternalUrl(social);
    if (!socialResult.ok) {
      throw new Error("Social link must be a safe http or https URL.");
    }
    socialMedia = socialResult.normalized;
  }

  let bookingSite: string | null = null;
  if (booking.length > 0) {
    const bookingResult = validateExternalUrl(booking);
    if (!bookingResult.ok) {
      throw new Error("Booking site must be a safe http or https URL.");
    }
    bookingSite = bookingResult.normalized;
  }

  const placeStillMatches =
    placeDetails && placeDetails.formattedAddress.trim() === bizAddr;

  const sanitizedDiscovery =
    discoveryCategories != null
      ? sanitizeDiscoveryCategoriesForProfession(
          discoveryCategories,
          professionCode
        )
      : null;

  return {
    id: userId,
    business_name: fields.businessName.trim(),
    business_number: r.e164,
    business_address: bizAddr,
    business_place_id: placeStillMatches ? placeDetails!.placeId : null,
    business_latitude: placeStillMatches ? placeDetails!.latitude : null,
    business_longitude: placeStillMatches ? placeDetails!.longitude : null,
    social_media: socialMedia,
    booking_site: bookingSite,
    about_me: null,
    setup_status: true,
    profession_code: professionCode,
    ...(sanitizedDiscovery != null
      ? { discovery_categories: sanitizedDiscovery }
      : {}),
  };
}
