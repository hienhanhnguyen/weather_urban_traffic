const { DataTypes, literal } = require('sequelize');

module.exports = {
	async up({ context: queryInterface }) {
		await queryInterface.createTable('location_alert_rule', {
			rule_id: {
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
			location_id: {
				type: DataTypes.INTEGER,
				allowNull: false,
				references: { model: 'saved_location', key: 'location_id' },
				onDelete: 'CASCADE',
				onUpdate: 'CASCADE',
			},
			metric: {
				type: DataTypes.ENUM('temp', 'feelslike', 'precip', 'precipprob'),
				allowNull: false,
			},
			operator: {
				type: DataTypes.ENUM('>', '>=', '<', '<='),
				allowNull: false,
			},
			threshold: {
				type: DataTypes.FLOAT,
				allowNull: false,
			},
			unit: {
				type: DataTypes.STRING(10),
				allowNull: true,
			},
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

		await queryInterface.addIndex('location_alert_rule', ['user_id'], {
			name: 'alert_rule_user_id_idx',
		});

		await queryInterface.addIndex(
			'location_alert_rule',
			['is_enabled', 'last_triggered_at'],
			{ name: 'alert_rule_scan_idx' }
		);
	},

	async down({ context: queryInterface }) {
		await queryInterface.dropTable('location_alert_rule');
		for (const type of [
			'enum_location_alert_rule_metric',
			'enum_location_alert_rule_operator',
			'enum_location_alert_rule_scope',
			'enum_location_alert_rule_severity',
		]) {
			await queryInterface.sequelize.query(
				`DROP TYPE IF EXISTS "${type}";`
			);
		}
	},
};