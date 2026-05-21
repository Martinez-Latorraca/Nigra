// Reverse geocoding via Nominatim (OpenStreetMap) — free, no API key.
// Usage policy: <=1 req/sec and a valid User-Agent identifying the app.
// We only call this once per pet (on report, or lazily on first detail view).

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
