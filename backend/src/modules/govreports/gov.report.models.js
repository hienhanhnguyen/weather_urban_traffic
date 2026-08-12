const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../../shared/database');

class GovReportSchedule extends Model { }

GovReportSchedule.init(
	{
		schedule_id: {
			type: DataTypes.INTEGER,
			primaryKey: true,
			autoIncrement: true,
		},
		user_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },
		time_range: {
			type: DataTypes.ENUM('24h', '7d', '30d'),
			allowNull: false,
			defaultValue: '7d',
		},
		topics: {
			type: DataTypes.ARRAY(DataTypes.TEXT),
			allowNull: false,
			defaultValue: ['areas', 'incidents', 'scenarios'],
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
		modelName: 'GovReportSchedule',
		tableName: 'gov_report_schedule',
	}
);

module.exports = { GovReportSchedule };
