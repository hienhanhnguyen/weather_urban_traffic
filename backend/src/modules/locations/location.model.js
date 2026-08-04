const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../../shared/database');

const asNumber = (field) =>
	function () {
		const raw = this.getDataValue(field);
		return raw === null || raw === undefined ? raw : Number(raw);
	};

class SavedLocation extends Model { }

SavedLocation.init(
	{
		location_id: {
			type: DataTypes.INTEGER,
			primaryKey: true,
			autoIncrement: true,
		},
		user_id: { type: DataTypes.INTEGER, allowNull: false },
		custom_name: { type: DataTypes.STRING(255), allowNull: false },
		address: { type: DataTypes.TEXT, allowNull: true },
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
	},
	{
		sequelize,
		modelName: 'SavedLocation',
		tableName: 'saved_location',
	}
);

module.exports = SavedLocation;