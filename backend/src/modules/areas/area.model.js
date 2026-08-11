const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../../shared/database');

class ManagedArea extends Model { }

ManagedArea.init(
	{
		area_id: {
			type: DataTypes.INTEGER,
			primaryKey: true,
			autoIncrement: true,
		},
		user_id: { type: DataTypes.INTEGER, allowNull: false },
		name: { type: DataTypes.STRING(120), allowNull: false },
		area_type: {
			type: DataTypes.ENUM('district', 'ward'),
			allowNull: false,
			defaultValue: 'ward',
		},
		address: { type: DataTypes.STRING(255), allowNull: true },
		boundary: { type: DataTypes.JSONB, allowNull: false },
		center_latitude: { type: DataTypes.DOUBLE, allowNull: false },
		center_longitude: { type: DataTypes.DOUBLE, allowNull: false },
		area_km2: { type: DataTypes.DOUBLE, allowNull: false },
	},
	{
		sequelize,
		modelName: 'ManagedArea',
		tableName: 'managed_area',
		indexes: [{ unique: true, fields: ['user_id', 'name'] }],
	}
);

module.exports = { ManagedArea };
