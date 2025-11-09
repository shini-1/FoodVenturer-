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

    // Build address from available components - prioritize street, city, province
    const addressParts = [];

    // Try to get street information - prioritize structured data
    if (data.street) {
      addressParts.push(data.street);
    } else if (data.localityInfo?.informative?.[0]?.description) {
      const desc = data.localityInfo.informative[0].description;
      // Skip invalid descriptions like "biggest continent in the world"
      if (!desc.includes('continent') && !desc.includes('world') && desc.length < 50) {
        addressParts.push(desc);
      }
    }

    // Get city
    if (data.localityInfo?.administrative?.[2]?.name) {
      addressParts.push(data.localityInfo.administrative[2].name);
    } else if (data.city) {
      addressParts.push(data.city);
    }

    // Get province/state - clean up region information
    let province = null;
    if (data.localityInfo?.administrative?.[1]?.name) {
      province = data.localityInfo.administrative[1].name;
    } else if (data.principalSubdivision) {
      province = data.principalSubdivision;
    }

    // Clean up province name - remove region information for Philippines
    if (province) {
      // Remove patterns like " (Region VI)", " Region", etc.
      province = province.replace(/\s*\([^)]*\)/g, '').replace(/\s*Region\s*\w*/i, '').trim();
      addressParts.push(province);
    }

    // If no structured address, try to build from raw data
    if (addressParts.length === 0) {
      const fallbackParts = [
        data.street || data.locality,
        data.city || data.locality,
        data.principalSubdivision
      ].filter(Boolean);

      if (fallbackParts.length > 0) {
        return fallbackParts.join(', ');
      }

      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
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
  // Add delay to respect rate limits
  await new Promise(resolve => setTimeout(resolve, 1000));

  try {
    // Nominatim has strict rate limiting (1 request/second)
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
    );

    if (!response.ok) {
      throw new Error('OSM geocoding request failed');
    }

    const data = await response.json();

    if (data && data.address) {
      // Extract specific address components from OSM
      const address = data.address;
      const addressParts = [];

      // Priority: house_number + road, then suburb/town, then city, then state
      if (address.house_number && address.road) {
        addressParts.push(`${address.house_number} ${address.road}`);
      } else if (address.road) {
        addressParts.push(address.road);
      }

      // Add city/town/municipality
      if (address.city) {
        addressParts.push(address.city);
      } else if (address.town) {
        addressParts.push(address.town);
      } else if (address.municipality) {
        addressParts.push(address.municipality);
      } else if (address.village) {
        addressParts.push(address.village);
      }

      // Add state/province (clean up region info)
      if (address.state) {
        let state = address.state;
        // Remove region information for Philippines
        state = state.replace(/\s*\([^)]*\)/g, '').replace(/\s*Region\s*\w*/i, '').trim();
        addressParts.push(state);
      }

      if (addressParts.length > 0) {
        return addressParts.join(', ');
      }
    }

    // Fallback to cleaned display_name if structured parsing fails
    if (data && data.display_name) {
      // Try to extract just the local part by splitting on country
      const parts = data.display_name.split(', ');
      if (parts.length >= 3) {
        // Take everything except the last 2 parts (country and continent)
        return parts.slice(0, -2).join(', ');
      }
      return data.display_name;
    }

    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;

  } catch (error) {
    console.warn('OSM geocoding failed:', error);
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
}

// Alternative geocoding using Mapbox (free tier, reliable)
export async function reverseGeocodeMapbox(lat: number, lng: number): Promise<string> {
  const mapboxToken = 'pk.eyJ1Ijoic2hpbmlpaSIsImEiOiJjbWhkZGIwZzYwMXJmMmtxMTZpY294c2V6In0.zuQl6u8BJxOgimXHxMiNqQ';

  try {
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxToken}&types=address,poi&limit=1`
    );

    if (!response.ok) {
      throw new Error('Mapbox geocoding request failed');
    }

    const data = await response.json();

    if (data.features && data.features.length > 0) {
      const feature = data.features[0];
      // Mapbox returns place_name like "Poblacion, Kalibo, Aklan, Philippines"
      const placeName = feature.place_name;
      if (placeName) {
        // Extract up to 3 parts: street, city, province
        const parts = placeName.split(', ');
        if (parts.length >= 3) {
          return parts.slice(0, 3).join(', ');
        }
        return placeName;
      }
    }

    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;

  } catch (error) {
    console.warn('Mapbox geocoding failed:', error);
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
}

// Combined geocoding with fallback
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  // Try Mapbox first (reliable, good limits)
  const mapboxResult = await reverseGeocodeMapbox(lat, lng);

  // If Mapbox returned just coordinates, try OSM as fallback
  if (mapboxResult === `${lat.toFixed(4)}, ${lng.toFixed(4)}`) {
    const osmResult = await reverseGeocodeOSM(lat, lng);
    if (osmResult !== `${lat.toFixed(4)}, ${lng.toFixed(4)}`) {
      return osmResult;
    }
    // Last resort: BigDataCloud
    const webResult = await reverseGeocodeWeb(lat, lng);
    return webResult;
  }

  return mapboxResult;
}
