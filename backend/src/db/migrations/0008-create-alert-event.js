const { DataTypes, literal } = require('sequelize');

module.exports = {
	async up({ context: queryInterface }) {
		await queryInterface.createTable('alert_event', {
			event_id: {
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
			rule_id: {
				type: DataTypes.INTEGER,
				allowNull: true,
				references: { model: 'location_alert_rule', key: 'rule_id' },
				onDelete: 'SET NULL',
				onUpdate: 'CASCADE',
			},
			title: {
				type: DataTypes.STRING(255),
				allowNull: false,
			},
			body: {
				type: DataTypes.TEXT,
				allowNull: true,
			},
			severity: {
				type: DataTypes.ENUM('info', 'warning', 'critical'),
				allowNull: false,
				defaultValue: 'warning',
			},
			metric: {
				type: DataTypes.STRING(32),
				allowNull: true,
			},
			value: {
				type: DataTypes.FLOAT,
				allowNull: true,
			},
			is_read: {
				type: DataTypes.BOOLEAN,
				allowNull: false,
				defaultValue: false,
			},
			created_at: {
				type: DataTypes.DATE,
				allowNull: false,
				defaultValue: literal('CURRENT_TIMESTAMP'),
			},
		});

		await queryInterface.addIndex('alert_event', ['user_id', 'is_read'], {
			name: 'alert_event_user_read_idx',
		});
	},

	async down({ context: queryInterface }) {
		await queryInterface.dropTable('alert_event');
		await queryInterface.sequelize.query(
			'DROP TYPE IF EXISTS "enum_alert_event_severity";'
		);
	},
};