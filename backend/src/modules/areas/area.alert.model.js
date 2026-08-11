const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../../shared/database');

class AreaAlertRule extends Model { }

AreaAlertRule.init(
	{
		rule_id: {
			type: DataTypes.INTEGER,
			primaryKey: true,
			autoIncrement: true,
		},
		area_id: { type: DataTypes.INTEGER, allowNull: false },
		metric: {
			type: DataTypes.ENUM('temp', 'feelslike', 'precip', 'precipprob'),
			allowNull: false,
		},
		threshold: { type: DataTypes.FLOAT, allowNull: false },
		severity: {
			type: DataTypes.ENUM('info', 'warning', 'critical'),
			allowNull: false,
			defaultValue: 'warning',
		},
		cooldown_minutes: {
			type: DataTypes.INTEGER,
			allowNull: false,
			defaultValue: 60,
		},
		is_enabled: {
			type: DataTypes.BOOLEAN,
			allowNull: false,
			defaultValue: true,
		},
		last_triggered_at: { type: DataTypes.DATE, allowNull: true },
		last_value: { type: DataTypes.FLOAT, allowNull: true },
	},
	{
		sequelize,
		modelName: 'AreaAlertRule',
		tableName: 'area_alert_rule',
		indexes: [{ unique: true, fields: ['area_id', 'metric'] }],
	}
);

module.exports = { AreaAlertRule };
