const test = require('node:test');
const assert = require('node:assert/strict');

const {
	isClosed,
	ringAreaKm2,
	centroidOf,
	boundsOf,
	selfIntersects,
	containsPoint,
	checkPolygon,
	describePolygon,
	MAX_POSITIONS,
} = require('../src/modules/areas/area.polygon');

const EQUATOR_BOX = [
	[0, 0],
	[1, 0],
	[1, 1],
	[0, 1],
	[0, 0],
];

const HANOI_BOX = [
	[105.8, 21.0],
	[105.9, 21.0],
	[105.9, 21.1],
	[105.8, 21.1],
	[105.8, 21.0],
];

const BOWTIE = [
	[0, 0],
	[1, 1],
	[1, 0],
	[0, 1],
	[0, 0],
];

const polygon = (ring) => ({ type: 'Polygon', coordinates: [ring] });

test('a ring is closed only when it comes back to where it started', () => {
	assert.equal(isClosed(EQUATOR_BOX), true);
	assert.equal(isClosed(EQUATOR_BOX.slice(0, -1)), false);
});

test('the area of a one-degree box on the equator is about 12,300 km2', () => {
	const area = ringAreaKm2(EQUATOR_BOX);

	assert.ok(area > 12_200 && area < 12_400, `got ${area}`);
});

test('winding order does not change the area', () => {
	const reversed = [...EQUATOR_BOX].reverse();

	assert.ok(
		Math.abs(ringAreaKm2(EQUATOR_BOX) - ringAreaKm2(reversed)) < 1e-6
	);
});

test('the centroid of a box is its middle', () => {
	const [longitude, latitude] = centroidOf(HANOI_BOX);

	assert.ok(Math.abs(longitude - 105.85) < 1e-9, `longitude ${longitude}`);
	assert.ok(Math.abs(latitude - 21.05) < 1e-9, `latitude ${latitude}`);
});

test('a collinear ring still yields a point instead of NaN', () => {
	const line = [
		[0, 0],
		[1, 1],
		[2, 2],
		[0, 0],
	];

	const [longitude, latitude] = centroidOf(line);

	assert.equal(Number.isFinite(longitude), true);
	assert.equal(Number.isFinite(latitude), true);
});

test('bounds are the south-west and north-east corners', () => {
	assert.deepEqual(boundsOf(HANOI_BOX), [
		[105.8, 21.0],
		[105.9, 21.1],
	]);
});

test('a bowtie is self-intersecting, a box is not', () => {
	assert.equal(selfIntersects(BOWTIE), true);
	assert.equal(selfIntersects(HANOI_BOX), false);
});

test('a point inside the box is inside, a point outside is not', () => {
	assert.equal(containsPoint(HANOI_BOX, [105.85, 21.05]), true);
	assert.equal(containsPoint(HANOI_BOX, [106.5, 21.05]), false);
	assert.equal(containsPoint(HANOI_BOX, [105.85, 20.0]), false);
});

test('a usable polygon has no problem to report', () => {
	assert.equal(checkPolygon(polygon(HANOI_BOX)), null);
});

test('checkPolygon names what is wrong with the geometry', () => {
	const cases = [
		[null, 'GEOMETRY_NOT_POLYGON'],
		[{ type: 'Point', coordinates: [0, 0] }, 'GEOMETRY_NOT_POLYGON'],
		[{ type: 'Polygon', coordinates: [] }, 'RING_MISSING'],
		[
			{ type: 'Polygon', coordinates: [HANOI_BOX, HANOI_BOX] },
			'HOLES_NOT_SUPPORTED',
		],
		[polygon(HANOI_BOX.slice(0, 3)), 'RING_TOO_SHORT'],
		[polygon(HANOI_BOX.slice(0, -1)), 'RING_NOT_CLOSED'],
		[polygon(BOWTIE), 'RING_SELF_INTERSECTS'],
	];

	for (const [geometry, expected] of cases) {
		assert.equal(checkPolygon(geometry), expected, JSON.stringify(geometry));
	}
});

test('checkPolygon rejects a ring with too many positions', () => {
	const ring = Array.from({ length: MAX_POSITIONS + 1 }, (_, index) => [
		105.8 + index * 1e-5,
		21.0,
	]);
	ring.push(ring[0]);

	assert.equal(checkPolygon(polygon(ring)), 'RING_TOO_LONG');
});

test('checkPolygon rejects boundaries that are too small or too large', () => {
	const speck = [
		[105.8, 21.0],
		[105.8001, 21.0],
		[105.8001, 21.0001],
		[105.8, 21.0],
	];

	const continent = [
		[-40, -30],
		[40, -30],
		[40, 30],
		[-40, 30],
		[-40, -30],
	];

	assert.equal(checkPolygon(polygon(speck)), 'AREA_TOO_SMALL');
	assert.equal(checkPolygon(polygon(continent)), 'AREA_TOO_LARGE');
});

test('describePolygon returns the centre and the size the row stores', () => {
	const described = describePolygon(polygon(HANOI_BOX));

	assert.ok(Math.abs(described.centerLatitude - 21.05) < 1e-9);
	assert.ok(Math.abs(described.centerLongitude - 105.85) < 1e-9);
	assert.ok(described.areaKm2 > 110 && described.areaKm2 < 120);
});
