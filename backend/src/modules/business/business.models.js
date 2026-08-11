const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../../shared/database');

class ReportSchedule extends Model { }

ReportSchedule.init(
	{
		schedule_id: {
			type: DataTypes.INTEGER,
			primaryKey: true,
			autoIncrement: true,
		},
		user_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },
		route_id: { type: DataTypes.INTEGER, allowNull: false },
		time_range: {
			type: DataTypes.ENUM('24h', '7d'),
			allowNull: false,
			defaultValue: '24h',
		},
		frequency: {
			type: DataTypes.ENUM('weekly', 'monthly'),
			allowNull: false,
		},
		weekday: { type: DataTypes.SMALLINT, allowNull: true },
		day_of_month: { type: DataTypes.SMALLINT, allowNull: true },
		hour: { type: DataTypes.SMALLINT, allowNull: false, defaultValue: 7 },
		next_run_at: { type: DataTypes.DATE, allowNull: false },
		last_sent_at: { type: DataTypes.DATE, allowNull: true },
	},
	{
		sequelize,
		modelName: 'ReportSchedule',
		tableName: 'report_schedule',
	}
);

module.exports = { ReportSchedule };
