import type { WhLocation, ZoneFurniture } from '@/types/warehouse';

/**
 * Parse a bin location string.
 * Format: "{furnitureId}:{sectionId}" or plain text.
 */
export function parseBinLocation(
  binLocation: string | undefined | null,
): { furnitureId: string; sectionId: string } | null {
  if (!binLocation) return null;
  const idx = binLocation.indexOf(':');
  if (idx <= 0) return null;
  const furnitureId = binLocation.slice(0, idx);
  const sectionId = binLocation.slice(idx + 1);
  // Basic UUID check — furniture IDs are UUIDs (36 chars with dashes)
  if (furnitureId.length >= 32 && sectionId.length > 0) {
    return { furnitureId, sectionId };
  }
  return null;
}

/**
 * Resolve a bin location to a human-readable label.
 * Example: "uuid:A2" → "Regal A-01 / A2"
 * Falls back to the raw binLocation string for plain-text entries.
 */
export function formatBinLocation(
  binLocation: string | undefined | null,
  location?: WhLocation | null,
): string {
  if (!binLocation) return '—';
  const parsed = parseBinLocation(binLocation);
  if (!parsed || !location) return binLocation;

  // Search all zones for the furniture piece
  for (const zone of location.zones) {
    for (const furniture of zone.furniture ?? []) {
      if (furniture.id === parsed.furnitureId) {
        const section = furniture.sections.find((s) => s.id === parsed.sectionId);
        const sectionLabel = section?.label ?? parsed.sectionId;
        return `${furniture.name} / ${sectionLabel}`;
      }
    }
  }

  // Furniture not found — return raw string
  return binLocation;
}

/**
 * Find a furniture piece by ID across all zones.
 */
export function findFurnitureById(
  location: WhLocation,
  furnitureId: string,
): { furniture: ZoneFurniture; zoneName: string; zoneCode: string } | null {
  for (const zone of location.zones) {
    for (const furniture of zone.furniture ?? []) {
      if (furniture.id === furnitureId) {
        return { furniture, zoneName: zone.name, zoneCode: zone.code };
      }
    }
  }
  return null;
}
