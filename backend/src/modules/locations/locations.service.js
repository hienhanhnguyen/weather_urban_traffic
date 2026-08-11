const { SavedLocation } = require('../../shared/models');
const config = require('../../shared/config');
const { NotFoundError, ConflictError } = require('../../shared/errors');

const publicLocation = (location) => ({
	id: location.location_id,
	name: location.custom_name,
	address: location.address,
	latitude: location.latitude,
	longitude: location.longitude,
	createdAt: location.createdAt,
});

async function ownedOrFail(userId, locationId) {
	const location = await SavedLocation.findOne({
		where: { location_id: locationId, user_id: userId },
	});
	if (!location) throw new NotFoundError('Location not found');
	return location;
}

async function list(userId, { page, limit }) {
	const { rows, count } = await SavedLocation.findAndCountAll({
		where: { user_id: userId },
		order: [['location_id', 'ASC']],
		limit,
		offset: (page - 1) * limit,
	});

	return {
		locations: rows.map(publicLocation),
		pagination: { page, limit, total: count },
	};
}

async function get(userId, locationId) {
	return publicLocation(await ownedOrFail(userId, locationId));
}

async function create(userId, data) {
	const existing = await SavedLocation.count({ where: { user_id: userId } });

	if (existing >= config.limits.maxSavedLocations) {
		throw new ConflictError(
			`You can save at most ${config.limits.maxSavedLocations} locations`,
			{ code: 'LOCATION_LIMIT_REACHED' }
		);
	}

	const location = await SavedLocation.create({ ...data, user_id: userId });
	return publicLocation(location);
}

async function update(userId, locationId, patch) {
	const location = await ownedOrFail(userId, locationId);
	await location.update(patch);
	return publicLocation(location);
}

async function remove(userId, locationId) {
	const location = await ownedOrFail(userId, locationId);
	await location.destroy();
}

module.exports = { list, get, create, update, remove, ownedOrFail };