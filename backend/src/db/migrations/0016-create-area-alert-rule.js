const { DataTypes, literal } = require('sequelize');

module.exports = {
	async up({ context: queryInterface }) {
		await queryInterface.createTable('area_alert_rule', {
			rule_id: {
				type: DataTypes.INTEGER,
				primaryKey: true,
				autoIncrement: true,
			},
			area_id: {
				type: DataTypes.INTEGER,
				allowNull: false,
				references: { model: 'managed_area', key: 'area_id' },
				onDelete: 'CASCADE',
				onUpdate: 'CASCADE',
			},
			metric: {
				type: DataTypes.ENUM('temp', 'feelslike', 'precip', 'precipprob'),
				allowNull: false,
			},
			threshold: {
				type: DataTypes.FLOAT,
				allowNull: false,
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
			last_triggered_at: {
				type: DataTypes.DATE,
				allowNull: true,
			},
			last_value: {
				type: DataTypes.FLOAT,
				allowNull: true,
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

		await queryInterface.addIndex('area_alert_rule', ['area_id', 'metric'], {
			name: 'area_alert_rule_area_id_metric_key',
			unique: true,
		});
	},

	async down({ context: queryInterface }) {
		await queryInterface.dropTable('area_alert_rule');
		await queryInterface.sequelize.query(
			'DROP TYPE IF EXISTS "enum_area_alert_rule_metric";'
		);
		await queryInterface.sequelize.query(
			'DROP TYPE IF EXISTS "enum_area_alert_rule_severity";'
		);
	},
};
