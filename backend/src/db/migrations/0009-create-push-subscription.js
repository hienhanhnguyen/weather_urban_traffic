const { DataTypes, literal } = require('sequelize');

module.exports = {
	async up({ context: queryInterface }) {
		await queryInterface.createTable('push_subscription', {
			subscription_id: {
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
			endpoint: {
				type: DataTypes.TEXT,
				allowNull: false,
				unique: true,
			},
			p256dh: { type: DataTypes.STRING(255), allowNull: false },
			auth: { type: DataTypes.STRING(255), allowNull: false },
			user_agent: { type: DataTypes.STRING(255), allowNull: true },
			last_used_at: { type: DataTypes.DATE, allowNull: true },
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

		await queryInterface.addIndex('push_subscription', ['user_id'], {
			name: 'push_subscription_user_id_idx',
		});
	},

	async down({ context: queryInterface }) {
		await queryInterface.dropTable('push_subscription');
	},
};