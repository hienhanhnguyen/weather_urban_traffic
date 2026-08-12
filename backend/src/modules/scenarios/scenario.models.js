const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../../shared/database');

class ResponseScenario extends Model { }
class ResponseScenarioStep extends Model { }

ResponseScenario.init(
	{
		scenario_id: {
			type: DataTypes.INTEGER,
			primaryKey: true,
			autoIncrement: true,
		},
		user_id: { type: DataTypes.INTEGER, allowNull: false },
		name: { type: DataTypes.STRING(120), allowNull: false },
		description: { type: DataTypes.TEXT, allowNull: true },
		metric: {
			type: DataTypes.ENUM('temp', 'feelslike', 'precip', 'precipprob'),
			allowNull: true,
		},
		min_severity: {
			type: DataTypes.ENUM('info', 'warning', 'critical'),
			allowNull: false,
			defaultValue: 'info',
		},
		status: {
			type: DataTypes.ENUM('draft', 'active', 'archived'),
			allowNull: false,
			defaultValue: 'active',
		},
	},
	{
		sequelize,
		modelName: 'ResponseScenario',
		tableName: 'response_scenario',
	}
);

ResponseScenarioStep.init(
	{
		step_id: {
			type: DataTypes.INTEGER,
			primaryKey: true,
			autoIncrement: true,
		},
		scenario_id: { type: DataTypes.INTEGER, allowNull: false },
		position: { type: DataTypes.INTEGER, allowNull: false },
		content: { type: DataTypes.TEXT, allowNull: false },
		priority: {
			type: DataTypes.ENUM('high', 'medium', 'low'),
			allowNull: false,
			defaultValue: 'medium',
		},
	},
	{
		sequelize,
		modelName: 'ResponseScenarioStep',
		tableName: 'response_scenario_step',
	}
);

module.exports = { ResponseScenario, ResponseScenarioStep };
