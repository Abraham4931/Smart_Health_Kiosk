const { Hospital } = require('../models');

async function findNearbyHospitals(lat, lng, conditionCategory, radiusMeters = 50000) {
  const registeredHospitals = await findRegisteredHospitals(lat, lng, conditionCategory, radiusMeters);
  let googleHospitals = [];

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (apiKey && apiKey !== 'your_google_maps_api_key') {
    googleHospitals = await searchGoogleMaps(lat, lng, conditionCategory, radiusMeters, apiKey);
  }

  const registeredPlaceIds = new Set(
    registeredHospitals.filter(h => h.googlePlaceId).map(h => h.googlePlaceId)
  );
  const externalHospitals = googleHospitals
    .filter(g => !registeredPlaceIds.has(g.placeId))
    .map(g => ({
      source: 'google_maps',
      name: g.name,
      address: g.address,
      distance: g.distance,
      placeId: g.placeId,
      location: g.location,
      bookingFee: null,
      specializations: [],
    }));

  return {
    registered: registeredHospitals,
    external: externalHospitals,
  };
}

async function findRegisteredHospitals(lat, lng, conditionCategory, radiusMeters) {
  const query = {
    isActive: true,
    location: {
      $near: {
        $geometry: { type: 'Point', coordinates: [lng, lat] },
        $maxDistance: radiusMeters,
      },
    },
  };

  let hospitals = await Hospital.find(query).limit(20).lean();

  if (conditionCategory && conditionCategory !== 'normal') {
    const matching = hospitals.filter(h =>
      h.specializations.some(s =>
        s.toLowerCase().includes(conditionCategory.toLowerCase()) ||
        conditionCategory.toLowerCase().includes(s.toLowerCase())
      )
    );
    const others = hospitals.filter(h => !matching.includes(h));
    hospitals = [...matching, ...others];
  }

  return hospitals.map(h => ({
    source: 'registered',
    _id: h._id,
    name: h.name,
    address: h.address,
    specializations: h.specializations,
    bookingFee: h.bookingFee,
    location: h.location,
    imageUrl: h.imageUrl || null,
    distance: calculateDistance(lat, lng, h.location.coordinates[1], h.location.coordinates[0]),
  }));
}

async function searchGoogleMaps(lat, lng, keyword, radiusMeters, apiKey) {
  const url = new URL('https://maps.googleapis.com/maps/api/place/nearbysearch/json');
  url.searchParams.set('location', `${lat},${lng}`);
  url.searchParams.set('radius', String(radiusMeters));
  url.searchParams.set('type', 'hospital');
  if (keyword && keyword !== 'normal') {
    url.searchParams.set('keyword', keyword);
  }
  url.searchParams.set('key', apiKey);

  try {
    const res = await fetch(url.toString());
    const data = await res.json();
    if (data.status !== 'OK') return [];

    return data.results.map(place => ({
      name: place.name,
      address: place.vicinity || '',
      placeId: place.place_id,
      location: {
        type: 'Point',
        coordinates: [place.geometry.location.lng, place.geometry.location.lat],
      },
      distance: calculateDistance(lat, lng, place.geometry.location.lat, place.geometry.location.lng),
    }));
  } catch (err) {
    console.error('Google Maps API error:', err.message);
    return [];
  }
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 100) / 100;
}

module.exports = { findNearbyHospitals };
