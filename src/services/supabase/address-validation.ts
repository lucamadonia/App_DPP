/**
 * Address Validation Service — client-side wrapper for the
 * address-validation Edge Function (Google Places + Address Validation).
 *
 * Designed to fail soft: every call returns a well-defined disabled state
 * when GOOGLE_MAPS_API_KEY isn't configured on the server, so the frontend
 * can render plain inputs without an `if (enabled)` flood at every call site.
 */

import { invokeEdgeFunction } from '@/lib/edge-function';

export interface AutocompleteSuggestion {
  placeId: string;
  text: string;
  mainText: string;
  secondaryText: string;
}

export interface PlaceDetails {
  placeId: string;
  formattedAddress: string;
  street: string;
  city: string;
  postalCode: string;
  country: string;
  lat?: number;
  lng?: number;
}

export interface GoogleValidationResult {
  enabled: boolean;
  valid: boolean;
  granularity?: string;
  addressComplete?: boolean;
  hasUnconfirmedComponents?: boolean;
  hasReplacedComponents?: boolean;
  formattedAddress?: string;
  normalized?: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
    formattedAddress: string;
  };
  messages: string[];
}

/** Cached capability result so we don't hit the function on every keystroke. */
let cachedEnabled: boolean | null = null;

export async function isGoogleAddressEnabled(): Promise<boolean> {
  if (cachedEnabled !== null) return cachedEnabled;
  try {
    const { data } = await invokeEdgeFunction<{ enabled: boolean }>('address-validation', {
      action: 'capability',
    });
    cachedEnabled = !!data?.enabled;
  } catch {
    cachedEnabled = false;
  }
  return cachedEnabled;
}

export async function autocompleteAddress(opts: {
  input: string;
  country?: string;
  language?: string;
  sessionToken?: string;
}): Promise<AutocompleteSuggestion[]> {
  try {
    const { data } = await invokeEdgeFunction<{
      enabled: boolean;
      suggestions?: AutocompleteSuggestion[];
    }>('address-validation', { action: 'autocomplete', params: opts });
    if (!data?.enabled) {
      cachedEnabled = false;
      return [];
    }
    return data?.suggestions || [];
  } catch (err) {
    console.warn('[address-validation] autocomplete failed:', err);
    return [];
  }
}

export async function fetchPlaceDetails(opts: {
  placeId: string;
  sessionToken?: string;
}): Promise<PlaceDetails | null> {
  try {
    const { data } = await invokeEdgeFunction<{
      enabled: boolean;
      place?: PlaceDetails;
    }>('address-validation', { action: 'place_details', params: opts });
    if (!data?.enabled) return null;
    return data?.place || null;
  } catch (err) {
    console.warn('[address-validation] place_details failed:', err);
    return null;
  }
}

export async function validateGoogleAddress(input: {
  street: string;
  postalCode: string;
  city: string;
  country: string;
}): Promise<GoogleValidationResult> {
  try {
    const { data } = await invokeEdgeFunction<GoogleValidationResult>(
      'address-validation',
      { action: 'validate', params: input },
    );
    if (!data?.enabled) return { enabled: false, valid: true, messages: [] };
    return data;
  } catch (err) {
    console.warn('[address-validation] validate failed:', err);
    return { enabled: false, valid: true, messages: [] };
  }
}
