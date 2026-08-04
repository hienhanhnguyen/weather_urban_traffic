const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../../shared/database');

class UserPreference extends Model { }

UserPreference.init(
	{
		user_id: { type: DataTypes.INTEGER, primaryKey: true },
		language: {
			type: DataTypes.STRING(8),
			allowNull: false,
			defaultValue: 'en',
		},
		timezone: {
			type: DataTypes.STRING(64),
			allowNull: false,
			defaultValue: 'UTC',
		},
		email_alerts_enabled: {
			type: DataTypes.BOOLEAN,
			allowNull: false,
			defaultValue: true,
		},
		push_alerts_enabled: {
			type: DataTypes.BOOLEAN,
			allowNull: false,
			defaultValue: true,
		},
		min_severity: {
			type: DataTypes.ENUM('info', 'warning', 'critical'),
			allowNull: false,
			defaultValue: 'info',
		},
	},
	{
		sequelize,
		modelName: 'UserPreference',
		tableName: 'user_preference',
	}
);

module.exports = UserPreference;