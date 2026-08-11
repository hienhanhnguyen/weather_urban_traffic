const { DataTypes, literal } = require('sequelize');

module.exports = {
	async up({ context: queryInterface }) {
		await queryInterface.createTable('weather_search', {
			search_id: {
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
			// Kept when the saved location goes away: the lookup still happened,
			// and the coordinates below are enough to describe it.
			location_id: {
				type: DataTypes.INTEGER,
				allowNull: true,
				references: { model: 'saved_location', key: 'location_id' },
				onDelete: 'SET NULL',
				onUpdate: 'CASCADE',
			},
			label: {
				type: DataTypes.STRING(255),
				allowNull: false,
			},
			latitude: {
				type: DataTypes.DECIMAL(10, 6),
				allowNull: false,
			},
			longitude: {
				type: DataTypes.DECIMAL(10, 6),
				allowNull: false,
			},
			// Snapshot of what was on screen, so the row still reads correctly
			// long after the forecast it came from expired.
			temperature_c: {
				type: DataTypes.FLOAT,
				allowNull: true,
			},
			condition: {
				type: DataTypes.STRING(64),
				allowNull: true,
			},
			searched_at: {
				type: DataTypes.DATE,
				allowNull: false,
				defaultValue: literal('CURRENT_TIMESTAMP'),
			},
		});

		await queryInterface.addIndex(
			'weather_search',
			['user_id', 'searched_at'],
			{ name: 'weather_search_user_id_searched_at_idx' }
		);
	},

	async down({ context: queryInterface }) {
		await queryInterface.dropTable('weather_search');
	},
};
