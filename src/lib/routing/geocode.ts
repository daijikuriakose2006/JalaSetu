export interface GeocodeResult {
  lat: number;
  lng: number;
  displayName: string;
  district?: string;
}

let lastRequestTimestamp = 0;

// Rate-limiting helper for Nominatim (1 request per second max)
async function throttleNominatim(): Promise<void> {
  const now = Date.now();
  const timeSinceLast = now - lastRequestTimestamp;
  if (timeSinceLast < 1100) {
    await new Promise((resolve) => setTimeout(resolve, 1100 - timeSinceLast));
  }
  lastRequestTimestamp = Date.now();
}

/**
 * Geocode an address/place name using Nominatim with Photon fallback.
 * Emphasizes Kerala locations.
 */
export async function geocodeAddress(query: string): Promise<GeocodeResult | null> {
  if (!query || query.trim().length === 0) return null;

  // Well-known Kerala locations lookup for instant offline / fast response
  const normalized = query.toLowerCase().trim();
  const knownPlaces: Record<string, { lat: number; lng: number; displayName: string; district?: string }> = {
    kochi: { lat: 9.9312, lng: 76.2673, displayName: 'Kochi, Ernakulam, Kerala', district: 'Ernakulam' },
    cochin: { lat: 9.9312, lng: 76.2673, displayName: 'Kochi, Ernakulam, Kerala', district: 'Ernakulam' },
    ernakulam: { lat: 9.9816, lng: 76.2999, displayName: 'Ernakulam, Kochi, Kerala', district: 'Ernakulam' },
    alappuzha: { lat: 9.4981, lng: 76.3388, displayName: 'Alappuzha, Kerala', district: 'Alappuzha' },
    alleppey: { lat: 9.4981, lng: 76.3388, displayName: 'Alappuzha, Kerala', district: 'Alappuzha' },
    kottayam: { lat: 9.5916, lng: 76.5222, displayName: 'Kottayam, Kerala', district: 'Kottayam' },
    kollam: { lat: 8.8932, lng: 76.6141, displayName: 'Kollam, Kerala', district: 'Kollam' },
    quilon: { lat: 8.8932, lng: 76.6141, displayName: 'Kollam, Kerala', district: 'Kollam' },
    kumarakom: { lat: 9.5894, lng: 76.4274, displayName: 'Kumarakom, Kottayam, Kerala', district: 'Kottayam' },
    vaikom: { lat: 9.748, lng: 76.394, displayName: 'Vaikom, Kottayam, Kerala', district: 'Kottayam' },
    changanassery: { lat: 9.4441, lng: 76.5361, displayName: 'Changanassery, Kottayam, Kerala', district: 'Kottayam' },
    muhamma: { lat: 9.4752, lng: 76.3682, displayName: 'Muhamma, Alappuzha, Kerala', district: 'Alappuzha' },
    bolgatty: { lat: 9.9833, lng: 76.2583, displayName: 'Bolgatty, Ernakulam, Kerala', district: 'Ernakulam' },
    'fort kochi': { lat: 9.9639, lng: 76.2432, displayName: 'Fort Kochi, Ernakulam, Kerala', district: 'Ernakulam' },
    vypin: { lat: 10.0014, lng: 76.2331, displayName: 'Vypin, Ernakulam, Kerala', district: 'Ernakulam' },
    'willingdon island': { lat: 9.9498, lng: 76.2714, displayName: 'Willingdon Island, Kochi, Kerala', district: 'Ernakulam' },
    // Additional towns on Kerala's NW-3 & NW-141 waterway corridors
    cherthala: { lat: 9.6832, lng: 76.3388, displayName: 'Cherthala, Alappuzha, Kerala', district: 'Alappuzha' },
    cherthalla: { lat: 9.6832, lng: 76.3388, displayName: 'Cherthala, Alappuzha, Kerala', district: 'Alappuzha' },
    kayamkulam: { lat: 9.1712, lng: 76.5009, displayName: 'Kayamkulam, Alappuzha, Kerala', district: 'Alappuzha' },
    'munroe island': { lat: 8.9982, lng: 76.6148, displayName: 'Munroe Island, Kollam, Kerala', district: 'Kollam' },
    munroturuttu: { lat: 8.9982, lng: 76.6148, displayName: 'Munroe Island, Kollam, Kerala', district: 'Kollam' },
    champakulam: { lat: 9.4551, lng: 76.4265, displayName: 'Champakulam, Alappuzha, Kerala', district: 'Alappuzha' },
    nedumudi: { lat: 9.4751, lng: 76.4399, displayName: 'Nedumudi, Alappuzha, Kerala', district: 'Alappuzha' },
    mannar: { lat: 9.3873, lng: 76.4982, displayName: 'Mannar, Alappuzha, Kerala', district: 'Alappuzha' },
    pathanamthitta: { lat: 9.2648, lng: 76.787, displayName: 'Pathanamthitta, Kerala', district: 'Pathanamthitta' },
    thrissur: { lat: 10.5276, lng: 76.2144, displayName: 'Thrissur, Kerala', district: 'Thrissur' },
    trichur: { lat: 10.5276, lng: 76.2144, displayName: 'Thrissur, Kerala', district: 'Thrissur' },
    palakkad: { lat: 10.7867, lng: 76.6548, displayName: 'Palakkad, Kerala', district: 'Palakkad' },
    kozhikode: { lat: 11.2588, lng: 75.7804, displayName: 'Kozhikode, Kerala', district: 'Kozhikode' },
    calicut: { lat: 11.2588, lng: 75.7804, displayName: 'Kozhikode, Kerala', district: 'Kozhikode' },
    thiruvananthapuram: { lat: 8.5241, lng: 76.9366, displayName: 'Thiruvananthapuram, Kerala', district: 'Thiruvananthapuram' },
    trivandrum: { lat: 8.5241, lng: 76.9366, displayName: 'Thiruvananthapuram, Kerala', district: 'Thiruvananthapuram' },
    malappuram: { lat: 11.0732, lng: 76.0740, displayName: 'Malappuram, Kerala', district: 'Malappuram' },
    kannur: { lat: 11.8745, lng: 75.3704, displayName: 'Kannur, Kerala', district: 'Kannur' },
  };

  for (const [key, val] of Object.entries(knownPlaces)) {
    if (normalized.includes(key)) {
      return val;
    }
  }

  // 1. Try Nominatim
  try {
    await throttleNominatim();
    const baseUrl = process.env.NOMINATIM_BASE_URL || 'https://nominatim.openstreetmap.org';
    const userAgent = process.env.NOMINATIM_USER_AGENT || 'JalaSetu/1.0 (contact@jalasetu.in)';

    // Append Kerala, India if not already present
    const searchQuery = normalized.includes('kerala') ? query : `${query}, Kerala, India`;
    const url = `${baseUrl}/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1&addressdetails=1`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': userAgent,
        Accept: 'application/json',
      },
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const item = data[0];
        return {
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
          displayName: item.display_name,
          district: item.address?.state_district || item.address?.county,
        };
      }
    }
  } catch (err) {
    console.warn('Nominatim geocode failed:', err);
  }

  // 2. Try Photon fallback
  try {
    const photonUrl = `${process.env.PHOTON_BASE_URL || 'https://photon.komoot.io'}/api/?q=${encodeURIComponent(
      query + ' Kerala'
    )}&limit=1`;
    const res = await fetch(photonUrl);
    if (res.ok) {
      const data = await res.json();
      if (data.features && data.features.length > 0) {
        const feat = data.features[0];
        const [lng, lat] = feat.geometry.coordinates;
        return {
          lat,
          lng,
          displayName: feat.properties?.name || query,
          district: feat.properties?.district || feat.properties?.city,
        };
      }
    }
  } catch (err) {
    console.warn('Photon fallback failed:', err);
  }

  return null;
}

/**
 * Reverse geocode coordinate to address name
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    await throttleNominatim();
    const baseUrl = process.env.NOMINATIM_BASE_URL || 'https://nominatim.openstreetmap.org';
    const userAgent = process.env.NOMINATIM_USER_AGENT || 'JalaSetu/1.0 (contact@jalasetu.in)';
    const url = `${baseUrl}/reverse?format=json&lat=${lat}&lon=${lng}`;

    const res = await fetch(url, {
      headers: { 'User-Agent': userAgent },
    });
    if (res.ok) {
      const data = await res.json();
      return data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
  } catch {
    // fallback
  }
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}
