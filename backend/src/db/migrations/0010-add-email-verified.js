const { DataTypes } = require('sequelize');

module.exports = {
	async up({ context: queryInterface }) {
		await queryInterface.addColumn('user_account', 'email_verified', {
			type: DataTypes.BOOLEAN,
			allowNull: false,
			defaultValue: false,
		});
	},

	async down({ context: queryInterface }) {
		await queryInterface.removeColumn('user_account', 'email_verified');
	},
};
