import type { MapStyleElement } from "react-native-maps";

/**
 * Dark teal / navy Google Maps style — close to salon mockup (Bergen-style night map).
 * Applies when using Google provider (Android; iOS if Maps SDK + API key configured).
 */
export const SALON_MAP_DARK_STYLE: MapStyleElement[] = [
  { elementType: "geometry", stylers: [{ color: "#1b2836" }] },
  { elementType: "geometry.fill", stylers: [{ color: "#1e3240" }] },
  {
    featureType: "landscape.natural",
    elementType: "geometry.fill",
    stylers: [{ color: "#243d48" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#0d2430" }],
  },
  {
    featureType: "water",
    elementType: "geometry.fill",
    stylers: [{ color: "#0f2d3d" }],
  },
  {
    featureType: "road",
    elementType: "geometry.fill",
    stylers: [{ color: "#2a3f4d" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#1a252e" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry.fill",
    stylers: [{ color: "#3a5568" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: "#243542" }],
  },
  {
    featureType: "road.highway",
    elementType: "labels.text.fill",
    stylers: [{ color: "#c8e8e0" }],
  },
  {
    featureType: "road.arterial",
    elementType: "geometry.fill",
    stylers: [{ color: "#2d4452" }],
  },
  {
    featureType: "road.local",
    elementType: "geometry.fill",
    stylers: [{ color: "#263845" }],
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#9ec9c0" }],
  },
  {
    featureType: "road",
    elementType: "labels.text.stroke",
    stylers: [{ color: "#1a252e" }],
  },
  {
    featureType: "administrative",
    elementType: "geometry",
    stylers: [{ color: "#2d3a48" }],
  },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [{ color: "#ffffff" }],
  },
  {
    featureType: "administrative.neighborhood",
    elementType: "labels.text.fill",
    stylers: [{ color: "#d4e8e4" }],
  },
  {
    featureType: "poi",
    elementType: "geometry",
    stylers: [{ color: "#2a3545" }],
  },
  {
    featureType: "poi",
    elementType: "labels.text.fill",
    stylers: [{ color: "#e8a8c8" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry.fill",
    stylers: [{ color: "#1a3d38" }],
  },
  {
    featureType: "poi.business",
    stylers: [{ visibility: "simplified" }],
  },
  {
    featureType: "transit",
    elementType: "geometry",
    stylers: [{ color: "#243038" }],
  },
  {
    featureType: "transit.station",
    elementType: "labels.text.fill",
    stylers: [{ color: "#b8d4ce" }],
  },
  {
    elementType: "labels.text.fill",
    stylers: [{ color: "#e8f4f0" }],
  },
  {
    elementType: "labels.text.stroke",
    stylers: [{ color: "#0f1820" }],
  },
];
