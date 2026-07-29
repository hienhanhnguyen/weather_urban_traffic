const { DataTypes, literal } = require('sequelize');

const ROLES = ['user', 'moderator', 'admin'];

module.exports = {
	async up({ context: queryInterface }) {
		await queryInterface.createTable('role', {
			id: {
				type: DataTypes.INTEGER,
				primaryKey: true,
				autoIncrement: true,
			},
			name: {
				type: DataTypes.STRING(32),
				allowNull: false,
				unique: true,
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

		await queryInterface.bulkInsert('role', ROLES.map((name) => ({
			name,
			created_at: new Date(),
			updated_at: new Date(),
		})));
	},

	async down({ context: queryInterface }) { await queryInterface.dropTable('role'); },
};