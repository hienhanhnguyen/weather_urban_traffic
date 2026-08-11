const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../../shared/database');

const asNumber = (field) =>
	function () {
		const raw = this.getDataValue(field);
		return raw === null || raw === undefined ? raw : Number(raw);
	};

class SavedRoute extends Model { }
class RouteSearch extends Model { }
class WeatherSearch extends Model { }

const endpoints = {
	start_latitude: {
		type: DataTypes.DECIMAL(10, 6),
		allowNull: false,
		get: asNumber('start_latitude'),
	},
	start_longitude: {
		type: DataTypes.DECIMAL(10, 6),
		allowNull: false,
		get: asNumber('start_longitude'),
	},
	start_address: { type: DataTypes.TEXT, allowNull: true },
	end_latitude: {
		type: DataTypes.DECIMAL(10, 6),
		allowNull: false,
		get: asNumber('end_latitude'),
	},
	end_longitude: {
		type: DataTypes.DECIMAL(10, 6),
		allowNull: false,
		get: asNumber('end_longitude'),
	},
	end_address: { type: DataTypes.TEXT, allowNull: true },
	profile: {
		type: DataTypes.ENUM('driving', 'cycling', 'walking'),
		allowNull: false,
		defaultValue: 'driving',
	},
	distance_m: { type: DataTypes.FLOAT, allowNull: true },
	duration_s: { type: DataTypes.FLOAT, allowNull: true },
};

SavedRoute.init(
	{
		route_id: {
			type: DataTypes.INTEGER,
			primaryKey: true,
			autoIncrement: true,
		},
		user_id: { type: DataTypes.INTEGER, allowNull: false },
		name: { type: DataTypes.STRING(255), allowNull: false },
		...endpoints,
	},
	{
		sequelize,
		modelName: 'SavedRoute',
		tableName: 'saved_route',
	}
);

RouteSearch.init(
	{
		search_id: {
			type: DataTypes.INTEGER,
			primaryKey: true,
			autoIncrement: true,
		},
		user_id: { type: DataTypes.INTEGER, allowNull: false },
		...endpoints,
		searched_at: { type: DataTypes.DATE, allowNull: false },
	},
	{
		sequelize,
		modelName: 'RouteSearch',
		tableName: 'route_search',
		timestamps: false,
	}
);

WeatherSearch.init(
	{
		search_id: {
			type: DataTypes.INTEGER,
			primaryKey: true,
			autoIncrement: true,
		},
		user_id: { type: DataTypes.INTEGER, allowNull: false },
		location_id: { type: DataTypes.INTEGER, allowNull: true },
		label: { type: DataTypes.STRING(255), allowNull: false },
		latitude: {
			type: DataTypes.DECIMAL(10, 6),
			allowNull: false,
			get: asNumber('latitude'),
		},
		longitude: {
			type: DataTypes.DECIMAL(10, 6),
			allowNull: false,
			get: asNumber('longitude'),
		},
		temperature_c: { type: DataTypes.FLOAT, allowNull: true },
		condition: { type: DataTypes.STRING(64), allowNull: true },
		searched_at: { type: DataTypes.DATE, allowNull: false },
	},
	{
		sequelize,
		modelName: 'WeatherSearch',
		tableName: 'weather_search',
		timestamps: false,
	}
);

module.exports = { SavedRoute, RouteSearch, WeatherSearch };
