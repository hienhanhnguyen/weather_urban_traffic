const { DataTypes, literal } = require('sequelize');

module.exports = {
	async up({ context: queryInterface }) {
		await queryInterface.createTable('saved_route', {
			route_id: {
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
			name: {
				type: DataTypes.STRING(255),
				allowNull: false,
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
			// Cached from the routing engine so the list can show a summary
			// without re-routing every entry on load.
			distance_m: {
				type: DataTypes.FLOAT,
				allowNull: true,
			},
			duration_s: {
				type: DataTypes.FLOAT,
				allowNull: true,
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

		await queryInterface.addIndex('saved_route', ['user_id'], {
			name: 'saved_route_user_id_idx',
		});
	},

	async down({ context: queryInterface }) {
		await queryInterface.dropTable('saved_route');
	},
};
