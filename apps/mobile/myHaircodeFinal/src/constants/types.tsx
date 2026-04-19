export type HairdresserProfile = {
  id: string;
  created_at: string;
  salon_name: string | null;
  about_me: string | null;
  social_media : string |null
};

export type ClientProfile = {
  id: string;
  created_at: string;
  about_me: string | null;
  hair_structure: string | null;
  hair_thickness: string | null;
  natural_hair_color: string | null;
  grey_hair_percentage: string | null;
};

/** Per-profession salon / bio / social from API (`professions_detail`). */
export type ProfessionDetailApi = {
  profession_code: string | null;
  business_name: string | null;
  business_number: string | null;
  business_address: string | null;
  about_me: string | null;
  social_media: string | null;
  booking_site: string | null;
};

export type Profile = {
  id: string;
  updated_at: string | null;
  email: string | null;
  /** Populated from API `first_name` / `full_name` (derived). */
  first_name?: string | null;
  last_name?: string | null;
  username?: string | null;
  country?: string | null;
  full_name: string | null;
  avatar_url: string | null;
  phone_number: string | null;
  user_type: string | null;
  /** Legacy API mirror of `business_number`. */
  salon_phone_number: string | null;
  salon_name: string | null;
  /** professional_profiles.display_name */
  display_name?: string | null;
  business_name?: string | null;
  business_number?: string | null;
  business_address?: string | null;
  professional_profile_id?: string | null;
  /** From API: profession rows linked to this professional profile, sorted by `sort_order`. */
  profession_codes?: string[];
  /** Per-role business fields; top-level `salon_name` / `about_me` mirror the default profession (hair if present). */
  professions_detail?: ProfessionDetailApi[];
  about_me: string | null;
  social_media: string | null;
  booking_site: string | null;
  color_brand: string | null;
  push_token: string | null;
  hair_structure: string | null;
  hair_thickness: string | null;
  natural_hair_color: string | null;
  grey_hair_percentage: string | null;
  setup_status: boolean;
  signup_date:string | null ;
  is_subscribed: boolean;
};

interface Haircode {
  id: string;
  created_at: string;
  client_id: string;
  hairdresser_id: string;
  service_description: string;
  services: string[];
  hairdresser_name: string;
  price : string | null;
}
interface HaircodeWithProfile extends Haircode {
  hairdresser_profile: HairdresserProfile | null;
}

type PushNotification = {
  id: string;
  message: string;
  createdAt: string;
  read: boolean;
};

export type NotificationType =
  | "FRIEND_REQUEST"
  | "FRIEND_ACCEPTED"
  | "INSPIRATION_SHARED";

export type Notification = {
  id: string;
  created_at: string;
  user_id: string;
  message: string;
  read: boolean;
  body?: string;
  type: NotificationType;
  sender_id: string;
  image_url?: string;
};

export type SubmitHaircodeParams = {
  isEditing: boolean;
  params: { haircodeId?: string };
  newHaircode: string;
  selectedOptions: string[];
  price: string;
  capturedMedia: { type: string }[];
  profile: { id: string; full_name: string };
  clientId: string | string[];
  uploadMedia: (index: number) => Promise<string>;
};

