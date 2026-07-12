/**
 * Demo map pins — replace with professionals from your API (lat/lng per user/salon).
 * react-native-maps: render each as <Marker coordinate={{ latitude, longitude }} />.
 */
export type MapProfessionalPin = {
  id: string;
  displayName: string;
  /** Street or area line for the bottom sheet (API later). */
  address: string;
  latitude: number;
  longitude: number;
};

/** Example coordinates near Bergen centre (visible with default map region). */
export const DEMO_MAP_PROFESSIONALS: MapProfessionalPin[] = [
  {
    id: "demo-1",
    displayName: "Dada Hair",
    address: "Nygårdsgaten, Bergen",
    latitude: 60.3952,
    longitude: 5.3218,
  },
  {
    id: "demo-2",
    displayName: "Demo Nails",
    address: "Strandgaten, Bergen",
    latitude: 60.3895,
    longitude: 5.3325,
  },
  {
    id: "demo-3",
    displayName: "Demo Brows",
    address: "Torgallmenningen, Bergen",
    latitude: 60.401,
    longitude: 5.318,
  },
  /** Same salon / address — cluster shows count; tap opens list (demo). */
  {
    id: "demo-studio-a",
    displayName: "Julie Riise",
    address: "Shared Studio, Vågsallmenningen, Bergen",
    latitude: 60.3924,
    longitude: 5.3242,
  },
  {
    id: "demo-studio-b",
    displayName: "Mia Hansen",
    address: "Shared Studio, Vågsallmenningen, Bergen",
    latitude: 60.3924,
    longitude: 5.3242,
  },
];
