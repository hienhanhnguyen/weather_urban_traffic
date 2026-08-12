const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../../shared/database');

class AlertRule extends Model { }
class AlertEvent extends Model { }

AlertRule.init(
	{
		rule_id: {
			type: DataTypes.INTEGER,
			primaryKey: true,
			autoIncrement: true,
		},
		user_id: { type: DataTypes.INTEGER, allowNull: false },
		location_id: { type: DataTypes.INTEGER, allowNull: false },
		metric: {
			type: DataTypes.ENUM('temp', 'feelslike', 'precip', 'precipprob'),
			allowNull: false,
		},
		operator: {
			type: DataTypes.ENUM('>', '>=', '<', '<='),
			allowNull: false,
		},
		threshold: { type: DataTypes.FLOAT, allowNull: false },
		unit: { type: DataTypes.STRING(10), allowNull: true },
		scope: {
			type: DataTypes.ENUM('current', 'forecast_24h'),
			allowNull: false,
			defaultValue: 'current',
		},
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
		modelName: 'AlertRule',
		tableName: 'location_alert_rule',
	}
);

AlertEvent.init(
	{
		event_id: {
			type: DataTypes.INTEGER,
			primaryKey: true,
			autoIncrement: true,
		},
		user_id: { type: DataTypes.INTEGER, allowNull: false },
		rule_id: { type: DataTypes.INTEGER, allowNull: true },
		area_id: { type: DataTypes.INTEGER, allowNull: true },
		scenario_id: { type: DataTypes.INTEGER, allowNull: true },
		activated_at: { type: DataTypes.DATE, allowNull: true },
		title: { type: DataTypes.STRING(255), allowNull: false },
		body: { type: DataTypes.TEXT, allowNull: true },
		severity: {
			type: DataTypes.ENUM('info', 'warning', 'critical'),
			allowNull: false,
			defaultValue: 'warning',
		},
		metric: { type: DataTypes.STRING(32), allowNull: true },
		value: { type: DataTypes.FLOAT, allowNull: true },
		is_read: {
			type: DataTypes.BOOLEAN,
			allowNull: false,
			defaultValue: false,
		},
		status: {
			type: DataTypes.ENUM('pending', 'acknowledged', 'resolved'),
			allowNull: false,
			defaultValue: 'pending',
		},
		handled_at: { type: DataTypes.DATE, allowNull: true },
		handled_note: { type: DataTypes.TEXT, allowNull: true },
	},
	{
		sequelize,
		modelName: 'AlertEvent',
		tableName: 'alert_event',
		updatedAt: false,
	}
);

module.exports = { AlertRule, AlertEvent };