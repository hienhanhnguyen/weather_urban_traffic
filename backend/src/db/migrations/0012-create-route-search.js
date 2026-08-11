const { DataTypes, literal } = require('sequelize');

module.exports = {
	async up({ context: queryInterface }) {
		await queryInterface.createTable('route_search', {
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
			start_latitude: {
				type: DataTypes.DECIMAL(10, 6),
				allowNull: false,
			},
			start_longitude: {
				type: DataTypes.DECIMAL(10, 6),
				allowNull: false,
			},
			start_address: {
				type: DataTypes.TEXT,
				allowNull: true,
			},
			end_latitude: {
				type: DataTypes.DECIMAL(10, 6),
				allowNull: false,
			},
			end_longitude: {
				type: DataTypes.DECIMAL(10, 6),
				allowNull: false,
			},
			end_address: {
				type: DataTypes.TEXT,
				allowNull: true,
			},
			profile: {
				type: DataTypes.ENUM('driving', 'cycling', 'walking'),
				allowNull: false,
				defaultValue: 'driving',
			},
			distance_m: {
				type: DataTypes.FLOAT,
				allowNull: true,
			},
			duration_s: {
				type: DataTypes.FLOAT,
				allowNull: true,
			},
			// Owned by the service rather than Sequelize: repeating a search
			// bumps this instead of inserting a near-duplicate row.
			searched_at: {
				type: DataTypes.DATE,
				allowNull: false,
				defaultValue: literal('CURRENT_TIMESTAMP'),
			},
		});

		await queryInterface.addIndex('route_search', ['user_id', 'searched_at'], {
			name: 'route_search_user_id_searched_at_idx',
		});
	},

	async down({ context: queryInterface }) {
		await queryInterface.dropTable('route_search');
	},
};
