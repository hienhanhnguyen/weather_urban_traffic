const { DataTypes, literal } = require('sequelize');

module.exports = {
	async up({ context: queryInterface }) {
		await queryInterface.createTable('user_preference', {
			user_id: {
				type: DataTypes.INTEGER,
				primaryKey: true,
				references: { model: 'user_account', key: 'user_id' },
				onDelete: 'CASCADE',
				onUpdate: 'CASCADE',
			},
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
	},

	async down({ context: queryInterface }) {
		await queryInterface.dropTable('user_preference');
		await queryInterface.sequelize.query(
			'DROP TYPE IF EXISTS "enum_user_preference_min_severity";'
		);
	},
}