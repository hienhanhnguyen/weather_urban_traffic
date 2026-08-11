const { ManagedArea } = require('../../shared/models');
const config = require('../../shared/config');
const {
	BadRequestError,
	ConflictError,
	NotFoundError,
} = require('../../shared/errors');
const { checkPolygon, describePolygon } = require('./area.polygon');

const publicArea = (area) => ({
	id: area.area_id,
	name: area.name,
	areaType: area.area_type,
	address: area.address,
	boundary: area.boundary,
	center: {
		latitude: area.center_latitude,
		longitude: area.center_longitude,
	},
	areaKm2: area.area_km2,
	createdAt: area.createdAt,
	updatedAt: area.updatedAt,
});

async function ownedOrFail(userId, areaId) {
	const area = await ManagedArea.findOne({
		where: { area_id: areaId, user_id: userId },
	});

	if (!area) throw new NotFoundError('Area not found');

	return area;
}

function geometryOrFail(boundary) {
	const problem = checkPolygon(boundary);

	if (problem) {
		throw new BadRequestError('The boundary is not a usable polygon', {
			code: problem,
		});
	}

	return describePolygon(boundary);
}

async function assertNameFree(userId, name, exceptId) {
	const clash = await ManagedArea.findOne({
		where: { user_id: userId, name },
		attributes: ['area_id'],
	});

	if (clash && clash.area_id !== exceptId) {
		throw new ConflictError('You already manage an area with that name', {
			code: 'AREA_NAME_TAKEN',
		});
	}
}

async function list(userId) {
	const areas = await ManagedArea.findAll({
		where: { user_id: userId },
		order: [['name', 'ASC']],
	});

	return { areas: areas.map(publicArea) };
}

async function get(userId, areaId) {
	return publicArea(await ownedOrFail(userId, areaId));
}

async function create(userId, data) {
	const total = await ManagedArea.count({ where: { user_id: userId } });

	if (total >= config.limits.maxManagedAreas) {
		throw new ConflictError(
			`You can manage at most ${config.limits.maxManagedAreas} areas`,
			{ code: 'AREA_LIMIT_REACHED' }
		);
	}

	await assertNameFree(userId, data.name);

	const derived = geometryOrFail(data.boundary);

	const area = await ManagedArea.create({
		user_id: userId,
		name: data.name,
		area_type: data.area_type,
		address: data.address || null,
		boundary: data.boundary,
		center_latitude: derived.centerLatitude,
		center_longitude: derived.centerLongitude,
		area_km2: derived.areaKm2,
	});

	return publicArea(area);
}

async function update(userId, areaId, patch) {
	const area = await ownedOrFail(userId, areaId);

	if (patch.name !== undefined) {
		await assertNameFree(userId, patch.name, areaId);
	}

	const derived = patch.boundary ? geometryOrFail(patch.boundary) : null;

	await area.update({
		...(patch.name === undefined ? {} : { name: patch.name }),
		...(patch.area_type === undefined ? {} : { area_type: patch.area_type }),
		...(patch.address === undefined ? {} : { address: patch.address || null }),
		...(derived
			? {
				boundary: patch.boundary,
				center_latitude: derived.centerLatitude,
				center_longitude: derived.centerLongitude,
				area_km2: derived.areaKm2,
			}
			: {}),
	});

	return publicArea(area);
}

async function remove(userId, areaId) {
	const area = await ownedOrFail(userId, areaId);
	await area.destroy();
}

module.exports = {
	list,
	get,
	create,
	update,
	remove,
	ownedOrFail,
	publicArea,
};
