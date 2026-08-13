const AREA_TAGS = ['district', 'city', 'state', 'country'];

function toAddress(properties) {
	const parts = [];

	const street = [properties.housenumber, properties.street]
		.filter(Boolean)
		.join(' ');
	if (street) parts.push(street);

	for (const tag of AREA_TAGS) {
		const value = properties[tag];
		if (value && !parts.includes(value)) parts.push(value);
	}

	return parts.join(', ');
}

function toPlace(feature) {
	const properties = feature?.properties ?? {};
	const coordinates = feature?.geometry?.coordinates;

	if (!Array.isArray(coordinates) || coordinates.length < 2) return null;

	const [longitude, latitude] = coordinates;
	if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return null;

	const address = toAddress(properties);

	return {
		id: properties.osm_type && properties.osm_id
			? `${properties.osm_type}${properties.osm_id}`
			: `${latitude},${longitude}`,
		name: properties.name || address || `${latitude}, ${longitude}`,
		address,
		latitude,
		longitude,
		category: properties.osm_key || null,
	};
}

function toPlaces(payload) {
	const features = Array.isArray(payload?.features) ? payload.features : [];
	const seen = new Set();

	return features.reduce((places, feature) => {
		const place = toPlace(feature);
		if (place && !seen.has(place.id)) {
			seen.add(place.id);
			places.push(place);
		}
		return places;
	}, []);
}

function toRoute(payload) {
	const route = payload?.routes?.[0];
	const coordinates = route?.geometry?.coordinates;

	if (!route || !Array.isArray(coordinates) || coordinates.length === 0) {
		return null;
	}

	return {
		distanceMeters: Math.round(route.distance),
		durationSeconds: Math.round(route.duration),
		geometry: { type: 'LineString', coordinates },
	};
}

module.exports = { toPlace, toPlaces, toRoute };
