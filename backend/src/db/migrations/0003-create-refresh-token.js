// Destructures 2 things from Sequelize: DataTypes and literal (a way to insert raw SQL)
const { DataTypes, literal } = require('sequelize');

module.exports = {
	// destructuring the argument to get queryInterface from the context
	async up({ context: queryInterface }) {
		await queryInterface.createTable('refresh_token', {
			id: {
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
			token_hash: {
				type: DataTypes.STRING(64),
				allowNull: false,
				unique: true,
			},
			expires_at: {
				type: DataTypes.DATE,
				allowNull: false,
			},
			revoked_at: {
				type: DataTypes.DATE,
				allowNull: true,
			},
			replaced_by: {
				type: DataTypes.INTEGER,
				allowNull: true,
				references: { model: 'refresh_token', key: 'id' },
				onDelete: 'SET NULL',
				onUpdate: 'CASCADE',
			},
			created_at: {
				type: DataTypes.DATE,
				allowNull: false,
				defaultValue: literal('CURRENT_TIMESTAMP'),
			},
		});

		await queryInterface.addIndex('refresh_token', ['user_id'], {
			name: 'refresh_token_user_id_idx',
		});
	},

	async down({ context: queryInterface }) {
		await queryInterface.dropTable('refresh_token');
	},
};