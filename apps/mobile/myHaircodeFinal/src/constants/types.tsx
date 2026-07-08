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
  /** Lane-specific pro given name (independent per profession account). */
  pro_first_name?: string | null;
  /** Lane-specific pro family name. */
  pro_last_name?: string | null;
  /** Lane-specific combined pro display name. */
  display_name?: string | null;
  business_name: string | null;
  business_number: string | null;
  business_address: string | null;
  about_me: string | null;
  social_media: string | null;
  booking_site: string | null;
  /** Lane-specific profile photo override; null = use client `avatar_url`. */
  avatar_url?: string | null;
  /** Discovery specialization codes for this lane (hair / brows / nails). */
  discovery_categories?: string[] | null;
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
  /** Combined legacy pro name (derived from pro_first_name + pro_last_name). */
  display_name?: string | null;
  /** Client personal bio (`profiles.about_me`). Separate from pro superpower. */
  client_about_me?: string | null;
  /** Professional account given name (independent of client first_name). */
  pro_first_name?: string | null;
  /** Professional account family name (independent of client last_name). */
  pro_last_name?: string | null;
  business_name?: string | null;
  business_number?: string | null;
  business_address?: string | null;
  professional_profile_id?: string | null;
  /** From API: profession rows linked to this professional profile, sorted by `sort_order`. */
  profession_codes?: string[];
  /** Per-role business fields; top-level `salon_name` / `about_me` mirror the active/default profession lane. */
  professions_detail?: ProfessionDetailApi[];
  /** Pro Get discovered superpower for the default/active lane — not the client bio. */
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

