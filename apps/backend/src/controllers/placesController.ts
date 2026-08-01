import { Request, Response } from "express";
import {
  fetchAutocomplete,
  fetchPlaceDetails,
  geocodeAddress,
  getGooglePlacesApiKey,
  type PlacesLookupOptions,
} from "../lib/googlePlaces";

function lookupOptions(req: Request): PlacesLookupOptions {
  const countryCode =
    typeof req.query.countryCode === "string"
      ? req.query.countryCode.trim()
      : undefined;
  const preferredCountryCode =
    typeof req.query.preferredCountryCode === "string"
      ? req.query.preferredCountryCode.trim()
      : undefined;
  return { countryCode, preferredCountryCode };
}

function missingKey(res: Response) {
  return res.status(503).json({
    error: "Places search is not configured on the server",
    code: "PLACES_NOT_CONFIGURED",
  });
}

export const placesController = {
  async autocomplete(req: Request, res: Response) {
    const apiKey = getGooglePlacesApiKey();
    if (!apiKey) return missingKey(res);

    const input =
      typeof req.query.input === "string" ? req.query.input.trim() : "";
    if (input.length < 2) {
      return res.json({ predictions: [] });
    }

    try {
      const predictions = await fetchAutocomplete(input, apiKey, lookupOptions(req));
      return res.json({ predictions });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Places autocomplete failed";
      console.error("[places/autocomplete]", message);
      return res.status(502).json({ error: message, code: "PLACES_UPSTREAM_ERROR" });
    }
  },

  async details(req: Request, res: Response) {
    const apiKey = getGooglePlacesApiKey();
    if (!apiKey) return missingKey(res);

    const placeId =
      typeof req.query.placeId === "string" ? req.query.placeId.trim() : "";
    if (!placeId) {
      return res.status(400).json({ error: "placeId is required" });
    }

    try {
      const place = await fetchPlaceDetails(placeId, apiKey, lookupOptions(req));
      if (!place) {
        return res.status(404).json({ error: "Place not found" });
      }
      return res.json({ place });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Place details failed";
      console.error("[places/details]", message);
      return res.status(502).json({ error: message, code: "PLACES_UPSTREAM_ERROR" });
    }
  },

  async geocode(req: Request, res: Response) {
    const apiKey = getGooglePlacesApiKey();
    if (!apiKey) return missingKey(res);

    const address =
      typeof req.query.address === "string" ? req.query.address.trim() : "";
    if (!address) {
      return res.status(400).json({ error: "address is required" });
    }

    try {
      const place = await geocodeAddress(address, apiKey, lookupOptions(req));
      if (!place) {
        return res.status(404).json({ error: "Address not found" });
      }
      return res.json({ place });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Geocoding failed";
      console.error("[places/geocode]", message);
      return res.status(502).json({ error: message, code: "PLACES_UPSTREAM_ERROR" });
    }
  },
};
