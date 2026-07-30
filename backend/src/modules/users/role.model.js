const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../../shared/database');

class Role extends Model { }

Role.init(
	{
		id: {
			type: DataTypes.INTEGER,
			primaryKey: true,
			autoIncrement: true,
		},
		name: {
			type: DataTypes.STRING(32),
			allowNull: false,
			unique: true,
		},
	},
	{
		sequelize,
		modelName: 'Role',
		tableName: 'role',
	}
);

module.exports = Role;