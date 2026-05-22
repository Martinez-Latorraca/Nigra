// Reverse geocoding via Nominatim (OpenStreetMap) — free, no API key.
// Usage policy: <=1 req/sec and a valid User-Agent identifying the app.
// We only call this once per pet (on report, or lazily on first detail view).

// Forward geocoding (address text -> coordinates) via Google Geocoding API.
// Key lives in GOOGLE_GEOCODING_API_KEY (server env), never in the app.
export async function searchAddress(query) {
  if (!query || query.trim().length < 3) return [];
  const key = process.env.GOOGLE_GEOCODING_API_KEY;
  if (!key) {
    console.error('searchAddress: GOOGLE_GEOCODING_API_KEY no configurada');
    return [];
  }
  try {
    const url =
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}` +
      `&language=es&region=uy&components=country:UY&key=${key}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.status !== 'OK') return [];
    return data.results.slice(0, 5).map((r) => ({
      place_id: r.place_id,
      display_name: r.formatted_address,
      lat: String(r.geometry.location.lat),
      lon: String(r.geometry.location.lng),
    }));
  } catch (error) {
    console.error('searchAddress error:', error.message);
    return [];
  }
}

export async function reverseGeocode(lat, lng) {
  if (lat == null || lng == null) return null;

  try {
    const url =
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}` +
      `&format=json&zoom=16&addressdetails=1&accept-language=es`;

    const res = await fetch(url, {
      headers: { 'User-Agent': 'Nigra/1.0 (https://nigra-server.onrender.com)' },
    });
    if (!res.ok) return null;

    const data = await res.json();
    const a = data.address || {};

    const area = a.neighbourhood || a.suburb || a.quarter || a.village || a.hamlet;
    const city = a.city || a.town || a.municipality || a.county || a.state;

    const parts = [area, city].filter(Boolean);
    if (parts.length === 0) return data.display_name || null;
    return parts.join(', ');
  } catch (error) {
    console.error('reverseGeocode error:', error.message);
    return null;
  }
}
