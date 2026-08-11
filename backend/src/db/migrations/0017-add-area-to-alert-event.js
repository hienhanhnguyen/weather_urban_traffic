const { DataTypes } = require('sequelize');

module.exports = {
	async up({ context: queryInterface }) {
		await queryInterface.addColumn('alert_event', 'area_id', {
			type: DataTypes.INTEGER,
			allowNull: true,
			references: { model: 'managed_area', key: 'area_id' },
			onDelete: 'SET NULL',
			onUpdate: 'CASCADE',
		});
	},

	async down({ context: queryInterface }) {
		await queryInterface.removeColumn('alert_event', 'area_id');
	},
};
