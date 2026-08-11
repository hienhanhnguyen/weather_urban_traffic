const EARTH_RADIUS_M = 6_371_008.8;

const MIN_POSITIONS = 4;

const MAX_POSITIONS = 500;

const MIN_AREA_KM2 = 0.01;
const MAX_AREA_KM2 = 50_000;

const toRadians = (degrees) => (degrees * Math.PI) / 180;

const isFinitePosition = (position) =>
	Array.isArray(position) &&
	position.length === 2 &&
	position.every(Number.isFinite);

const inRange = ([longitude, latitude]) =>
	longitude >= -180 &&
	longitude <= 180 &&
	latitude >= -90 &&
	latitude <= 90;

const samePosition = (a, b) => a[0] === b[0] && a[1] === b[1];

const isClosed = (ring) =>
	ring.length > 1 && samePosition(ring[0], ring[ring.length - 1]);

function ringAreaM2(ring) {
	if (ring.length < MIN_POSITIONS) return 0;

	let total = 0;

	for (let index = 0; index < ring.length - 1; index += 1) {
		const [lngA, latA] = ring[index];
		const [lngB, latB] = ring[index + 1];

		total +=
			toRadians(lngB - lngA) *
			(2 + Math.sin(toRadians(latA)) + Math.sin(toRadians(latB)));
	}

	return Math.abs((total * EARTH_RADIUS_M * EARTH_RADIUS_M) / 2);
}

const ringAreaKm2 = (ring) => ringAreaM2(ring) / 1e6;

function centroidOf(ring) {
	let twiceArea = 0;
	let longitude = 0;
	let latitude = 0;

	for (let index = 0; index < ring.length - 1; index += 1) {
		const [lngA, latA] = ring[index];
		const [lngB, latB] = ring[index + 1];
		const cross = lngA * latB - lngB * latA;

		twiceArea += cross;
		longitude += (lngA + lngB) * cross;
		latitude += (latA + latB) * cross;
	}

	if (twiceArea === 0) {
		const corners = ring.slice(0, -1);
		const sum = corners.reduce(
			(carry, [lng, lat]) => [carry[0] + lng, carry[1] + lat],
			[0, 0]
		);

		return [sum[0] / corners.length, sum[1] / corners.length];
	}

	return [longitude / (3 * twiceArea), latitude / (3 * twiceArea)];
}

function boundsOf(ring) {
	const longitudes = ring.map(([longitude]) => longitude);
	const latitudes = ring.map(([, latitude]) => latitude);

	return [
		[Math.min(...longitudes), Math.min(...latitudes)],
		[Math.max(...longitudes), Math.max(...latitudes)],
	];
}

const orientation = (a, b, c) =>
	Math.sign((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]));

const onSegment = (a, b, point) =>
	orientation(a, b, point) === 0 &&
	point[0] >= Math.min(a[0], b[0]) &&
	point[0] <= Math.max(a[0], b[0]) &&
	point[1] >= Math.min(a[1], b[1]) &&
	point[1] <= Math.max(a[1], b[1]);

function segmentsCross(a, b, c, d) {
	const first = orientation(a, b, c);
	const second = orientation(a, b, d);
	const third = orientation(c, d, a);
	const fourth = orientation(c, d, b);

	if (first !== second && third !== fourth) return true;

	return (
		onSegment(a, b, c) ||
		onSegment(a, b, d) ||
		onSegment(c, d, a) ||
		onSegment(c, d, b)
	);
}

function selfIntersects(ring) {
	const segments = ring.length - 1;

	for (let i = 0; i < segments; i += 1) {
		for (let j = i + 1; j < segments; j += 1) {
			const adjacent = j === i + 1 || (i === 0 && j === segments - 1);
			if (adjacent) continue;

			if (segmentsCross(ring[i], ring[i + 1], ring[j], ring[j + 1])) {
				return true;
			}
		}
	}

	return false;
}

function containsPoint(ring, [longitude, latitude]) {
	let inside = false;

	for (let index = 0; index < ring.length - 1; index += 1) {
		const [lngA, latA] = ring[index];
		const [lngB, latB] = ring[index + 1];

		const straddles = latA > latitude !== latB > latitude;
		if (!straddles) continue;

		const crossing =
			lngA + ((latitude - latA) / (latB - latA)) * (lngB - lngA);

		if (longitude < crossing) inside = !inside;
	}

	return inside;
}

function checkPolygon(geometry) {
	if (!geometry || geometry.type !== 'Polygon') return 'GEOMETRY_NOT_POLYGON';

	const rings = geometry.coordinates;
	if (!Array.isArray(rings) || rings.length === 0) return 'RING_MISSING';

	if (rings.length > 1) return 'HOLES_NOT_SUPPORTED';

	const ring = rings[0];
	if (!Array.isArray(ring)) return 'RING_MISSING';
	if (ring.length < MIN_POSITIONS) return 'RING_TOO_SHORT';
	if (ring.length > MAX_POSITIONS) return 'RING_TOO_LONG';
	if (!ring.every(isFinitePosition)) return 'POSITION_MALFORMED';
	if (!ring.every(inRange)) return 'POSITION_OUT_OF_RANGE';
	if (!isClosed(ring)) return 'RING_NOT_CLOSED';
	if (selfIntersects(ring)) return 'RING_SELF_INTERSECTS';

	const area = ringAreaKm2(ring);
	if (area < MIN_AREA_KM2) return 'AREA_TOO_SMALL';
	if (area > MAX_AREA_KM2) return 'AREA_TOO_LARGE';

	return null;
}

function describePolygon(geometry) {
	const ring = geometry.coordinates[0];
	const [longitude, latitude] = centroidOf(ring);

	return {
		centerLongitude: longitude,
		centerLatitude: latitude,
		areaKm2: ringAreaKm2(ring),
	};
}

module.exports = {
	MIN_POSITIONS,
	MAX_POSITIONS,
	MIN_AREA_KM2,
	MAX_AREA_KM2,
	isClosed,
	ringAreaM2,
	ringAreaKm2,
	centroidOf,
	boundsOf,
	segmentsCross,
	selfIntersects,
	containsPoint,
	checkPolygon,
	describePolygon,
};
