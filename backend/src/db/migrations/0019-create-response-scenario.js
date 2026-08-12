const { DataTypes, literal } = require('sequelize');

module.exports = {
	async up({ context: queryInterface }) {
		await queryInterface.createTable('response_scenario', {
			scenario_id: {
				type: DataTypes.INTEGER,
				primaryKey: true,
				autoIncrement: true,
			},
			user_id: {
				type: DataTypes.INTEGER,
				allowNull: false,
				references: { model: 'user_account', key: 'user_id' },
				onDelete: 'CASCADE',
				onUpdate: 'CASCADE',
			},
			name: {
				type: DataTypes.STRING(120),
				allowNull: false,
			},
			description: {
				type: DataTypes.TEXT,
				allowNull: true,
			},
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
			created_at: {
				type: DataTypes.DATE,
				allowNull: false,
				defaultValue: literal('CURRENT_TIMESTAMP'),
			},
			updated_at: {
				type: DataTypes.DATE,
				allowNull: false,
				defaultValue: literal('CURRENT_TIMESTAMP'),
			},
		});

		await queryInterface.addIndex('response_scenario', ['user_id', 'name'], {
			name: 'response_scenario_user_id_name_key',
			unique: true,
		});

		await queryInterface.createTable('response_scenario_step', {
			step_id: {
				type: DataTypes.INTEGER,
				primaryKey: true,
				autoIncrement: true,
			},
			scenario_id: {
				type: DataTypes.INTEGER,
				allowNull: false,
				references: { model: 'response_scenario', key: 'scenario_id' },
				onDelete: 'CASCADE',
				onUpdate: 'CASCADE',
			},
			position: {
				type: DataTypes.INTEGER,
				allowNull: false,
			},
			content: {
				type: DataTypes.TEXT,
				allowNull: false,
			},
			priority: {
				type: DataTypes.ENUM('high', 'medium', 'low'),
				allowNull: false,
				defaultValue: 'medium',
			},
			created_at: {
				type: DataTypes.DATE,
				allowNull: false,
				defaultValue: literal('CURRENT_TIMESTAMP'),
			},
			updated_at: {
				type: DataTypes.DATE,
				allowNull: false,
				defaultValue: literal('CURRENT_TIMESTAMP'),
			},
		});

		await queryInterface.addIndex(
			'response_scenario_step',
			['scenario_id', 'position'],
			{
				name: 'response_scenario_step_scenario_id_position_key',
				unique: true,
			}
		);
	},

	async down({ context: queryInterface }) {
		await queryInterface.dropTable('response_scenario_step');
		await queryInterface.dropTable('response_scenario');

		for (const type of [
			'enum_response_scenario_step_priority',
			'enum_response_scenario_status',
			'enum_response_scenario_min_severity',
			'enum_response_scenario_metric',
		]) {
			await queryInterface.sequelize.query(
				`DROP TYPE IF EXISTS "${type}";`
			);
		}
	},
};
