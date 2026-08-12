const { DataTypes } = require('sequelize');

module.exports = {
	async up({ context: queryInterface }) {
		await queryInterface.addColumn('alert_event', 'scenario_id', {
			type: DataTypes.INTEGER,
			allowNull: true,
			references: { model: 'response_scenario', key: 'scenario_id' },
			onDelete: 'SET NULL',
			onUpdate: 'CASCADE',
		});

		await queryInterface.addColumn('alert_event', 'activated_at', {
			type: DataTypes.DATE,
			allowNull: true,
		});

		await queryInterface.addIndex('alert_event', ['scenario_id'], {
			name: 'alert_event_scenario_idx',
		});
	},

	async down({ context: queryInterface }) {
		await queryInterface.removeIndex('alert_event', 'alert_event_scenario_idx');
		await queryInterface.removeColumn('alert_event', 'activated_at');
		await queryInterface.removeColumn('alert_event', 'scenario_id');
	},
};
