// src/services/geocodingService.ts
export async function reverseGeocodeWeb(lat: number, lng: number): Promise<string> {
  try {
    // Using BigDataCloud free geocoding API (up to 10,000 requests/day)
    const response = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
    );

    if (!response.ok) {
      throw new Error('Geocoding request failed');
    }

    const data = await response.json();

    // Build address from available components
    const addressParts = [
      data.localityInfo?.administrative?.[2]?.name, // City
      data.localityInfo?.administrative?.[1]?.name, // Province/State
      data.countryName // Country
    ].filter(Boolean);

    // If no structured address, try to build from raw data
    if (addressParts.length === 0) {
      const fallbackParts = [
        data.city,
        data.locality,
        data.principalSubdivision,
        data.countryName
      ].filter(Boolean);

      return fallbackParts.join(', ') || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }

    return addressParts.join(', ');

  } catch (error) {
    console.warn('Reverse geocoding failed:', error);
    // Fallback to coordinates only
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
}

// Alternative geocoding service using OpenStreetMap Nominatim (free, rate limited)
export async function reverseGeocodeOSM(lat: number, lng: number): Promise<string> {
  try {
    // Nominatim has strict rate limiting (1 request/second)
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
    );

    if (!response.ok) {
      throw new Error('OSM geocoding request failed');
    }

    const data = await response.json();

    if (data && data.display_name) {
      return data.display_name;
    }

    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;

  } catch (error) {
    console.warn('OSM geocoding failed:', error);
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
}

// Combined geocoding with fallback
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  // Try primary service first
  const primaryResult = await reverseGeocodeWeb(lat, lng);

  // If it returned just coordinates, try secondary service
  if (primaryResult === `${lat.toFixed(4)}, ${lng.toFixed(4)}`) {
    // Add small delay to respect rate limits
    await new Promise(resolve => setTimeout(resolve, 100));
    const secondaryResult = await reverseGeocodeOSM(lat, lng);
    return secondaryResult;
  }

  return primaryResult;
}
