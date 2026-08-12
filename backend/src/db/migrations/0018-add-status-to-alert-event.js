const { DataTypes } = require('sequelize');

module.exports = {
	async up({ context: queryInterface }) {
		await queryInterface.addColumn('alert_event', 'status', {
			type: DataTypes.ENUM('pending', 'acknowledged', 'resolved'),
			allowNull: false,
			defaultValue: 'pending',
		});

		await queryInterface.addColumn('alert_event', 'handled_at', {
			type: DataTypes.DATE,
			allowNull: true,
		});

		await queryInterface.addColumn('alert_event', 'handled_note', {
			type: DataTypes.TEXT,
			allowNull: true,
		});

		await queryInterface.addIndex('alert_event', ['user_id', 'area_id'], {
			name: 'alert_event_user_area_idx',
		});
	},

	async down({ context: queryInterface }) {
		await queryInterface.removeIndex(
			'alert_event',
			'alert_event_user_area_idx'
		);
		await queryInterface.removeColumn('alert_event', 'handled_note');
		await queryInterface.removeColumn('alert_event', 'handled_at');
		await queryInterface.removeColumn('alert_event', 'status');
		await queryInterface.sequelize.query(
			'DROP TYPE IF EXISTS "enum_alert_event_status";'
		);
	},
};
